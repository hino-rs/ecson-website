# リソース

リソースはECSの「グローバルな共有データ」です。エンティティに紐付くコンポーネントとは異なり、ワールドに1つだけ存在します。接続中の全クライアントの一覧や、サーバー全体の設定など、特定のエンティティに属さないデータの管理に使います。

システムからはリソースを `Res<T>`（読み取り専用）または `ResMut<T>`（読み書き）として受け取ります。

```rust
fn my_system(
    map: Res<ConnectionMap>,      // 読み取り専用
    mut map: ResMut<ConnectionMap>, // 読み書き
) {
    // ...
}
```

---

## カスタムリソースを定義する

### 定義

構造体に `#[derive(Resource)]` を付けるだけです。

```rust
use ecson::prelude::*;

#[derive(Resource)]
pub struct GameConfig {
    pub max_players: u32,
    pub map_name: String,
}

// Default を実装しておくと insert_resource の初期化が楽になる
#[derive(Resource, Default)]
pub struct ScoreBoard {
    pub scores: std::collections::HashMap<u64, u32>,
}
```

### 登録

`app.insert_resource()` で初期値と一緒に登録します。登録しないままシステムで `Res<T>` を受け取るとパニックします。

```rust
fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .insert_resource(GameConfig {
            max_players: 16,
            map_name: "forest".to_string(),
        })
        .insert_resource(ScoreBoard::default())
        .add_systems(FixedUpdate, update_score_system)
        .run();
}
```

### 読み取る

`Res<T>` をシステムの引数に追加します。

```rust
fn check_capacity_system(
    config: Res<GameConfig>,
    connection_map: Res<ConnectionMap>,
) {
    let count = connection_map.0.len() as u32;
    if count >= config.max_players {
        println!("サーバーが満員です ({}/{})", count, config.max_players);
    }
}
```

### 書き込む

`ResMut<T>` を受け取り、`*` で中身を書き換えます。

```rust
fn update_score_system(
    mut ev_received: MessageReader<MessageReceived>,
    mut scoreboard: ResMut<ScoreBoard>,
) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        if text.trim() == "/score" {
            *scoreboard.scores.entry(msg.client_id).or_insert(0) += 1;
        }
    }
}
```

### よくあるパターンと注意点

**設定リソースと状態リソースは分ける**

起動時に固定される設定と、実行中に変化する状態は別のリソースにするのがおすすめです。設定側は `Res<T>` のみで使えて、書き換えミスを防げます。

```rust
#[derive(Resource)]
pub struct GameConfig { pub max_players: u32 } // 設定（変化しない）

#[derive(Resource, Default)]
pub struct GameState { pub round: u32 }        // 状態（変化する）
```

**同一フレームで `Res` と `ResMut` を混在させない**

同じリソースを `Res<T>` と `ResMut<T>` で同時に受け取ると借用競合でパニックします。書き込む必要があるシステムは `ResMut<T>` に統一してください。

```rust
// ❌ 同じフレームで動く2つのシステムが同じリソースをRes/ResMutで取ると競合する
fn system_a(map: Res<ScoreBoard>) { ... }
fn system_b(mut map: ResMut<ScoreBoard>) { ... }

// ✅ どちらかに統一するか、システムの実行順を明示的に制御する
```

**プラグインが有効かどうかで分岐する（`Option<Res<T>>`）**

特定のプラグインが追加されているかどうか不確かな場合は `Option<Res<T>>` を使うと安全です。

```rust
fn my_system(room_map: Option<Res<RoomMap>>) {
    let Some(room_map) = room_map else {
        return; // ChatプラグインなしならRoomMapは存在しない
    };
    // ...
}
```

---

## 組み込みリソース

### `ConnectionMap`

接続中の全クライアントを管理します。`ecson::prelude::*` から使用できます。

```rust
pub struct ConnectionMap(pub HashMap<u64, Entity>);
```

`client_id` からエンティティをO(1)で引けます。特定のクライアントIDを持つエンティティを直接取得したいときに使います。

```rust
fn find_by_id_system(
    connection_map: Res<ConnectionMap>,
    mut ev_send: MessageWriter<SendMessage>,
) {
    let target_id: u64 = 42;
    if let Some(&entity) = connection_map.0.get(&target_id) {
        ev_send.write(SendMessage {
            target: entity,
            payload: NetworkPayload::Text("あなただけに送ります".to_string()),
        });
    }
}
```

---

### `RoomMap`

ルーム名からそのルームのメンバーエンティティ一覧を管理します。`ChatCorePlugin` / `ChatFullPlugin` が追加された場合に自動で登録されます。`ecson::prelude::*` から使用できます。

```rust
pub struct RoomMap(pub HashMap<String, HashSet<Entity>>);
```

```rust
fn broadcast_to_room_system(
    room_map: Res<RoomMap>,
    mut ev_send: MessageWriter<SendMessage>,
) {
    let room_name = "lobby";
    let Some(members) = room_map.0.get(room_name) else { return };

    for &target in members {
        ev_send.write(SendMessage {
            target,
            payload: NetworkPayload::Text("[System] ルームへのお知らせ".to_string()),
        });
    }
}
```

---

### `ServerTimeConfig`

サーバーのTickレートなどを設定します。`ecson::prelude::*` から使用できます。デフォルトは60Hzです。

```rust
pub struct ServerTimeConfig {
    pub tick_rate: f64,          // 目標Tickレート（Hz）。デフォルト: 60.0
    pub max_ticks_per_frame: u32, // 1フレームの最大Tick数。デフォルト: 5
    pub warn_on_lag: bool,        // 処理落ち時に警告ログを出すか。デフォルト: false
}
```

```rust
fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .insert_resource(ServerTimeConfig {
            tick_rate: 30.0,
            max_ticks_per_frame: 3,
            warn_on_lag: true,
        })
        .run();
}
```

---

## プラグイン別の組み込みリソース

### `HeartbeatConfig`

`HeartbeatPlugin` が追加された場合に登録されます。Ping間隔とタイムアウト秒数を設定できます。

```rust
pub struct HeartbeatConfig {
    pub interval_secs: f32,  // Ping送信間隔（秒）。デフォルト: 10.0
    pub timeout_secs: f32,   // タイムアウト秒数。デフォルト: 30.0
    pub ping_payload: String, // デフォルト: "__ping__"
    pub pong_payload: String, // デフォルト: "__pong__"
}
```

設定を変えたい場合は `HeartbeatPlugin` のビルダーメソッドで指定します。

```rust
app.add_plugins(
    HeartbeatPlugin::new()
        .interval(5.0)
        .timeout(15.0)
);
```

---

### `PresenceMap`

`PresencePlugin` が追加された場合に登録されます。オンライン中の全クライアントの在席状態を管理します。

```rust
pub struct PresenceMap {
    pub map: HashMap<u64, PresenceStatus>, // client_id → PresenceStatus
}
```

```rust
fn show_online_users_system(presence_map: Res<PresenceMap>) {
    for (client_id, status) in &presence_map.map {
        println!("{}: {}", client_id, status);
    }
}
```

---

### `SnapshotConfig`

`SnapshotPlugin` が追加された場合に登録されます。スナップショットの送信間隔と差分送信の設定です。

```rust
pub struct SnapshotConfig {
    pub interval_secs: f32, // 送信間隔（秒）。デフォルト: 0.1（10Hz）
    pub delta_only: bool,   // 差分のみ送信するか。デフォルト: true
}
```

---

### `LobbyMap`

`LobbyPlugin` が追加された場合に登録されます。全ロビーの情報を管理します。

```rust
pub struct LobbyMap {
    pub lobbies: HashMap<String, LobbyInfo>,
}

pub struct LobbyInfo {
    pub name: String,
    pub owner: u64,
    pub members: Vec<u64>,
    pub max_members: u32,
    pub is_public: bool,
}
```

```rust
fn check_lobby_system(lobby_map: Res<LobbyMap>) {
    for (name, info) in &lobby_map.lobbies {
        println!("ロビー '{}': {}/{}", name, info.members.len(), info.max_members);
    }
}
```

---

### `SpatialConfig`

`Spatial2DPlugin` / `Spatial3DFlatPlugin` / `Spatial3DPlugin` が追加された場合に登録されます。AOI半径とゾーンサイズの設定です。

```rust
pub struct SpatialConfig {
    pub interest_radius: f32, // AOI最大距離。デフォルト: 100.0
    pub zone_size: f32,       // ゾーンのセルサイズ。デフォルト: 50.0
}
```

> **Note:** `zone_size >= interest_radius / 2` を満たす必要があります。これより小さい値にするとAOI漏れが発生します。

設定はプラグインのビルダーメソッドで指定します。

```rust
app.add_plugins(
    Spatial2DPlugin::new()
        .interest_radius(200.0)
        .zone_size(100.0)
);
```

## 次のステップ

- [Plugins](/plugins)
