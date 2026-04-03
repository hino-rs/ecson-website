# Quick Start

5分でEcsonサーバーを動かしましょう。

## プロジェクトを作成する

```bash
cargo new my-ecson-server
cd my-ecson-server
cargo add ecson
```

## echoサーバーを書く

`src/main.rs` を以下のように編集します。

```rust
use ecson::prelude::*;

fn main() {
    EcsonApp::new()
        .add_plugin(WebSocketPlugin::new("127.0.0.1:8080"))
        .add_system(Update, echo_system)
        .run();
}

fn echo_system(
    mut reader: EventReader<MessageReceived>,
    mut writer: EventWriter<MessageSend>,
) {
    for event in reader.read() {
        // 受信したメッセージをそのまま送り返す
        writer.send(MessageSend {
            target: event.sender,
            content: event.content.clone(),
        });
    }
}
```

## 起動する

```bash
cargo run
```

```
[INFO] Ecson server listening on ws://127.0.0.1:8080
```

## 動作確認

ブラウザのコンソールで試せます。

```javascript
const ws = new WebSocket("ws://127.0.0.1:8080");
ws.onmessage = (e) => console.log("Received:", e.data);
ws.onopen = () => ws.send("Hello, Ecson!");
// → Received: Hello, Ecson!
```

## 次のステップ

- [Tutorial](/tutorial) — より実践的なサーバーを構築する
- [ECS Primer](/ecs-primer) — ECSの仕組みを理解する
- [Events](/events) — EventReaderとEventWriterの詳細
