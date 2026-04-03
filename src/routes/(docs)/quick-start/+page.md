# クイックスタート

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

fn echo_system(
    mut ev_recv: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
) {
    for msg in ev_recv.read() {
        ev_send.write(SendMessage {
            target: msg.entity,
            payload: msg.payload.clone(),
        });
    }
}

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_systems(Update, echo_system)
        .run();
}
```

## 起動する

```bash
cargo run
```

```
EcsonApp Started🚀
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
