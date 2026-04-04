# イベント

Ecsonのイベントシステムは `bevy_ecs` の `Message` をベースにしています。
そのため、イベントと言う名称ですが、型としては`Message`を扱います。
システム間のやり取りはすべてイベントを通じて行われ、直接関数を呼んだり状態を共有したりする必要はありません。

イベントの読み取りには `MessageReader<T>`、書き込みには `MessageWriter<T>` をシステムの引数として受け取ります。

```rust
fn my_system(
    mut ev_received: MessageReader<MessageReceived>, // 読む
    mut ev_send: MessageWriter<SendMessage>,         // 書く
) {
    for msg in ev_received.read() {
        // ...
    }
}
```

---

## カスタムイベントを定義する

組み込みイベントだけでなく、独自のイベントを定義してシステム間の通信に使うことができます。

### 定義

構造体または列挙型に `#[derive(Message)]` を付けるだけです。

```rust
use ecson::prelude::*;

// 構造体で定義
#[derive(Message)]
pub struct PlayerScoredEvent {
    pub client_id: u64,
    pub score: u32,
}

// 列挙型でも定義できる
#[derive(Message)]
pub enum GameCommand {
    Start { room_name: String },
    End   { room_name: String },
}
```

### 登録

定義したイベントは `app.add_event::<T>()` でアプリに登録してから使います。登録しないと `MessageReader` / `MessageWriter` がパニックします。

```rust
fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_event::<PlayerScoredEvent>() // 登録
        .add_systems(Update, detect_score_system)
        .add_systems(FixedUpdate, handle_score_system)
        .run();
}
```

### 書き込む（発行する）

`MessageWriter<T>` をシステムの引数に追加し、`.write()` で発行します。

```rust
fn detect_score_system(
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_scored: MessageWriter<PlayerScoredEvent>,
) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        if let Some(score_str) = text.strip_prefix("/score ") {
            if let Ok(score) = score_str.trim().parse::<u32>() {
                ev_scored.write(PlayerScoredEvent {
                    client_id: msg.client_id,
                    score,
                });
            }
        }
    }
}
```

### 読み取る（購読する）

`MessageReader<T>` をシステムの引数に追加し、`.read()` でイテレートします。

```rust
fn handle_score_system(
    mut ev_scored: MessageReader<PlayerScoredEvent>,
    mut ev_send: MessageWriter<SendMessage>,
    all_clients: Query<Entity, With<ClientId>>,
) {
    for ev in ev_scored.read() {
        let msg = format!("Player {} がスコア {} を獲得！", ev.client_id, ev.score);
        let payload = NetworkPayload::Text(msg);

        for target in all_clients.iter() {
            ev_send.write(SendMessage { target, payload: payload.clone() });
        }
    }
}
```

### よくあるパターンと注意点

**パース → ロジックの2段階に分ける**

受信メッセージのパースと、ビジネスロジックの処理を別システムに分けるのが推奨のパターンです。カスタムイベントをその橋渡しに使います。`Update` でパースして、`FixedUpdate` でロジックを処理するのが典型的な構成です。

```
MessageReceived  →  (Update) パースシステム  →  MyEvent  →  (FixedUpdate) ロジックシステム
```

**`MessageReader` は `mut` が必要**

内部でカーソルを進めるため、読み取り専用に見えても `mut` が必要です。

```rust
// ✅ 正しい
mut ev: MessageReader<MyEvent>

// ❌ コンパイルエラー
ev: MessageReader<MyEvent>
```

**同じイベントを複数のシステムが読める**

1つのイベントを複数のシステムが独立して読み取れます。ただし、各 `MessageReader` は自分のカーソルを持つため、別々に全件処理されることに注意してください。

```rust
// system_a と system_b は両方とも MyEvent の全件を処理する
fn system_a(mut ev: MessageReader<MyEvent>) { ... }
fn system_b(mut ev: MessageReader<MyEvent>) { ... }
```

**イベントは1フレームで消費される**

`Message` イベントはフレームをまたいで保持されません。発行されたイベントはそのフレームのうちに読み取らないと失われます。特に `Update` で発行して `FixedUpdate` で読む場合、タイミングによっては取りこぼすことがあります。確実に処理したい場合は同じスケジュール内でシステムの順序を制御するか、両方 `FixedUpdate` にまとめましょう。

---

## コアイベント

`ecson::prelude::*` に含まれており、追加の設定なしで使用できます。

### `MessageReceived`

クライアントからメッセージを受信したときに発行されます。ほぼすべてのシステムの起点となるイベントです。

```rust
pub struct MessageReceived {
    pub entity: Entity,      // 送信元クライアントのエンティティ
    pub client_id: u64,      // 送信元クライアントのID
    pub payload: NetworkPayload, // 受信したデータ本体
}
```

`payload` は `NetworkPayload::Text(String)` または `NetworkPayload::Binary(Vec<u8>)` のいずれかです。テキストのみ扱う場合はパターンマッチでフィルタできます。

```rust
fn my_system(mut ev_received: MessageReader<MessageReceived>) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        println!("Client {}: {}", msg.client_id, text);
    }
}
```

---

### `SendMessage`

特定のクライアントへメッセージを送信するためのイベントです。このイベントを書き込むと、エンジンがネットワーク層へ届けます。

```rust
pub struct SendMessage {
    pub target: Entity,          // 送信先クライアントのエンティティ
    pub payload: NetworkPayload, // 送信するデータ本体
}
```

```rust
fn my_system(
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
) {
    for msg in ev_received.read() {
        // 送ってきた相手にそのまま返す（エコー）
        ev_send.write(SendMessage {
            target: msg.entity,
            payload: msg.payload.clone(),
        });
    }
}
```

全クライアントにブロードキャストする場合は、`Query<Entity, With<ClientId>>` で全エンティティを取得してループします。

```rust
fn broadcast_system(
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
    all_clients: Query<Entity, With<ClientId>>,
) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        let payload = NetworkPayload::Text(format!("User {}: {}", msg.client_id, text));

        for target in all_clients.iter() {
            ev_send.write(SendMessage { target, payload: payload.clone() });
        }
    }
}
```

---

### `UserDisconnected`

クライアントの接続が切断されたときに発行されます。エンティティのクリーンアップや、退出通知などに使います。

```rust
pub struct UserDisconnected {
    pub entity: Entity,   // 切断されたクライアントのエンティティ
    pub client_id: u64,   // 切断されたクライアントのID
}
```

> **Note:** エンティティの `despawn` は `despawn_disconnected_system` が自動で行います。自分で `commands.entity(...).despawn()` を呼ぶ必要はありません。ただし、コンポーネントの取り外しや他クライアントへの通知など、追加のクリーンアップロジックが必要な場合はこのイベントを購読してください。

```rust
fn on_disconnect(mut ev_disconnect: MessageReader<UserDisconnected>) {
    for ev in ev_disconnect.read() {
        println!("Client {} が切断しました", ev.client_id);
    }
}
```

---

## Heartbeatイベント

`HeartbeatPlugin` を追加すると使用できます。

### `ClientTimedOutEvent`

クライアントがPingに応答せずタイムアウトにより切断されたときに発行されます。`UserDisconnected` も同時に発行されるため、通常のクリーンアップは `UserDisconnected` 側で処理できます。このイベントは「タイムアウトが原因の切断」であることを区別したい場合に使います。

```rust
pub struct ClientTimedOutEvent {
    pub entity: Entity,
}
```

```rust
fn on_timeout(mut ev_timeout: MessageReader<ClientTimedOutEvent>) {
    for ev in ev_timeout.read() {
        println!("Entity {:?} がタイムアウトしました", ev.entity);
    }
}
```

---

## Presenceイベント

`PresencePlugin` を追加すると使用できます。

### `PresenceChangedEvent`

クライアントの在席状態が変化したときに発行されます。クライアントが `/status online` / `/status away` / `/status busy` を送信すると発火します。

```rust
pub struct PresenceChangedEvent {
    pub client_id: u64,
    pub entity: Entity,
    pub status: PresenceStatus, // Online | Away | Busy
}
```

```rust
fn on_presence_changed(mut ev: MessageReader<PresenceChangedEvent>) {
    for ev in ev.read() {
        println!("Client {} のステータス: {}", ev.client_id, ev.status);
    }
}
```

---

## Snapshotイベント

`SnapshotPlugin` を追加すると使用できます。

### `SnapshotSentEvent`

スナップショットが生成・送信されるたびに発行されます。送信頻度の監視やデバッグログの出力などに使います。

```rust
pub struct SnapshotSentEvent {
    pub sequence: u64,   // スナップショットのシーケンス番号
    pub delta: bool,     // 差分送信かどうか
    pub byte_size: usize, // 送信バイト数
}
```

```rust
fn on_snapshot_sent(mut ev: MessageReader<SnapshotSentEvent>) {
    for ev in ev.read() {
        println!("Snapshot #{}: {} bytes (delta: {})", ev.sequence, ev.byte_size, ev.delta);
    }
}
```

---

## Chatイベント

`ChatCorePlugin` / `ChatRoomPlugin` / `ChatFullPlugin` のいずれかを追加すると使用できます。

### `UserJoinedRoomEvent`

ユーザーがルームに参加したときに発行されます（`ChatRoomPlugin` / `ChatFullPlugin`）。

```rust
pub struct UserJoinedRoomEvent {
    pub client_id: u64,
    pub room_name: String,
}
```

### `ChatMessageBroadcastedEvent`

メッセージがブロードキャストされたときに発行されます（`ChatCorePlugin` / `ChatFullPlugin`）。ロギングや外部サービスへの連携フックとして使えます。

```rust
pub struct ChatMessageBroadcastedEvent {
    pub client_id: u64,
    pub room_name: Option<String>, // ルームなしの場合は None
    pub text: String,
}
```

---

## Lobbyイベント

`LobbyPlugin` を追加すると使用できます。

### `PlayerJoinedLobbyEvent`

プレイヤーがロビーに参加したときに発行されます。

```rust
pub struct PlayerJoinedLobbyEvent {
    pub client_id: u64,
    pub lobby_name: String,
}
```

### `PlayerLeftLobbyEvent`

プレイヤーがロビーを退出したとき（コマンドまたは切断）に発行されます。

```rust
pub struct PlayerLeftLobbyEvent {
    pub client_id: u64,
    pub lobby_name: String,
}
```

### `LobbyReadyEvent`

ロビーが満員になり、ゲーム開始が可能な状態になったときに発行されます。メンバー一覧が含まれるため、ゲームセッションの初期化トリガーとして使えます。

```rust
pub struct LobbyReadyEvent {
    pub lobby_name: String,
    pub members: Vec<u64>, // 参加中の全クライアントID
}
```

```rust
fn on_lobby_ready(mut ev: MessageReader<LobbyReadyEvent>) {
    for ev in ev.read() {
        println!("ロビー '{}' が満員になりました！ メンバー: {:?}", ev.lobby_name, ev.members);
        // ゲームセッションの初期化など...
    }
}
```

---

## Spatialイベント

`Spatial2DPlugin` / `Spatial3DFlatPlugin` / `Spatial3DPlugin` のいずれかを追加すると使用できます。

### `ClientMovedEvent`

クライアントが `/move x y` または `/move x y z` を送信したときに発行されます。

```rust
pub struct ClientMovedEvent {
    pub entity: Entity,
    pub client_id: u64,
    pub payload: MovePayload, // MovePayload::Move2D { x, y } または Move3D { x, y, z }
}
```

### `ClientZoneChangedEvent`

クライアントが別のAOIゾーンへ移動したときに発行されます。ゾーン遷移に応じたマップロードなど、ゾーン境界をトリガーにしたロジックに使えます。

```rust
pub struct ClientZoneChangedEvent {
    pub entity: Entity,
    pub client_id: u64,
}
```

## 次のステップ

- [Resources](/resources)
- [Plugins](/plugins)
