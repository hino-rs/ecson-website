# Examples

## エコーサーバー

```Rust
use ecson::prelude::*;

// Define System
fn echo_system(
    mut messages: MessageReader<MessageReceived>,
    mut outbound: MessageWriter<SendMessage>,
) {
    for message in messages.read() {
        outbound.write(SendMessage {
            target: message.entity,
            payload: message.payload.clone(),
        });
    }
}

fn main() {
    tracing_subscriber::fmt::init();

    EcsonApp::new()
        .add_plugins((
            EcsonWebSocketPlugin::new("127.0.0.1:8080"),
            EcsonWebTransportDevPlugin::new("127.0.0.1:4433"),
        ))
        .add_systems(Update, echo_system)
        .run();
}
```

## ブロードキャスト

```Rust
use ecson::prelude::*;

fn broadcast_system(
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
    client_query: Query<Entity, With<ClientId>>,
) {
    for msg in ev_received.read() {
        // テキストメッセージのみを処理対象とする
        let NetworkPayload::Text(text) = &msg.payload else {
            continue;
        };

        // 「誰が発言したか」を分かりやすくフォーマット
        let broadcast_text = format!("User {}: {}", msg.client_id, text);
        let payload = NetworkPayload::Text(broadcast_text);

        // クエリで取得した全クライアント（エンティティ）に対してSendMessageイベントを発行
        for target_entity in client_query.iter() {
            ev_send.write(SendMessage {
                target: target_entity,
                payload: payload.clone(),
            });
        }
    }
}

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_systems(Update, broadcast_system)
        .run();
}
```

## ルーム付きチャットサーバー

プラグイン実装

```Rust
use ecson::plugins::chat::ChatFullPlugin;
use ecson::plugins::heartbeat::HeartbeatPlugin;
use ecson::prelude::*;

fn main() {
    EcsonApp::new()
        .add_plugins(HeartbeatPlugin::default().interval(30.0).timeout(60.0))
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_plugins(ChatFullPlugin)
        .run()
}
```

## 2Dトップダウンゲームサーバー

```Rust
use ecson::plugins::spatial::Spatial2DPlugin;
/// クライアントが "/move x y" を送ると、
/// interest_radius 内の近隣プレイヤー全員に座標がブロードキャストされる。
///
/// クライアント受信フォーマット: "pos {client_id} {x} {y}"
use ecson::prelude::*;

// 接続直後のクライアントに自分の ID を通知する
fn send_hello_system(
    query: Query<(Entity, &ClientId), Added<ClientId>>,
    mut ev_send: MessageWriter<SendMessage>,
) {
    for (entity, client_id) in query.iter() {
        ev_send.write(SendMessage {
            target: entity,
            payload: NetworkPayload::Text(format!("hello {}", client_id.0)),
        });
    }
}

fn main() {
    EcsonApp::new()
        .add_plugins((
            EcsonWebSocketPlugin::new("127.0.0.1:8080"),
            EcsonWebTransportDevPlugin::new("127.0.0.1:4433"),
        ))
        .add_plugins(
            Spatial2DPlugin::new()
                .interest_radius(200.0)
                .zone_size(100.0),
        )
        .add_systems(Update, send_hello_system)
        .run();
}
```