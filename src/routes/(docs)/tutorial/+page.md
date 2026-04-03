# Tutorial

ステップバイステップでEcsonを学びましょう。

## チャットサーバーを作る

このチュートリアルでは、複数クライアント間でリアルタイムにメッセージを配信する
チャットサーバーを構築します。

### 完成イメージ

```
Client A → "Hello!"  →  Server  →  Client A, B, C へブロードキャスト
Client B → "Hi!"     →  Server  →  Client A, B, C へブロードキャスト
```

### 1. プロジェクト作成

```bash
cargo new chat-server
cd chat-server
cargo add ecson
```

### 2. Componentを定義する

接続中のクライアントを表すComponentを作ります。

```rust
use ecson::prelude::*;

#[derive(Component)]
struct ChatUser {
    name: String,
}
```

### 3. 接続時にEntityをスポーン

クライアントが接続したとき、Entityを生成してComponentをアタッチします。

```rust
fn on_connect_system(
    mut commands: Commands,
    mut events: EventReader<ClientConnected>,
) {
    for event in events.read() {
        commands.spawn((
            event.client,
            ChatUser { name: format!("user_{}", event.client.index()) },
        ));
    }
}
```

### 4. メッセージをブロードキャスト

受信したメッセージをすべての接続中クライアントに送信します。

```rust
fn broadcast_system(
    users: Query<(Entity, &ChatUser)>,
    mut reader: EventReader<MessageReceived>,
    mut writer: EventWriter<MessageSend>,
) {
    for event in reader.read() {
        // 送信者の名前を取得
        let sender_name = users
            .get(event.sender)
            .map(|(_, u)| u.name.as_str())
            .unwrap_or("unknown");

        let content = format!("[{}] {}", sender_name, event.content);

        // 全員に送信
        for (entity, _) in &users {
            writer.send(MessageSend { target: entity, content: content.clone() });
        }
    }
}
```

### 5. まとめて組み立てる

```rust
fn main() {
    EcsonApp::new()
        .add_plugin(WebSocketPlugin::new("127.0.0.1:8080"))
        .add_systems(Update, (
            on_connect_system,
            broadcast_system,
        ))
        .run();
}
```

### 6. 動作確認

```bash
cargo run
```

ブラウザで2つのタブを開いて試してみましょう。

```javascript
// Tab 1
const ws = new WebSocket("ws://127.0.0.1:8080");
ws.onmessage = (e) => console.log(e.data);
ws.onopen = () => ws.send("Hello from Tab 1!");
```

## 次のステップ

- [Core Concepts](/concept) — Ecsonの設計思想を深く理解する
- [Plugins](/plugins) — 機能をPluginとして分割する
- [Examples](/examples) — より高度なサンプル
