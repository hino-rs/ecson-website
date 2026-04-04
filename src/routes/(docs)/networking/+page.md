# ネットワーキング

Ecsonはネットワーク処理をTokioの非同期ランタイムで行い、その結果をECSのイベントとしてゲームループへ橋渡しします。開発者がネットワーク層を直接触る必要はなく、`MessageReceived` / `SendMessage` / `UserDisconnected` の3つのイベントを通じてすべてのやり取りができます。

## プロトコルの選択

Ecsonは**WebSocket**と**WebTransport**に対応しています。どちらもECS側のAPIは同じなので、プラグインを差し替えるだけでプロトコルを切り替えられます。

| プロトコル | 特徴 | 用途 |
|---|---|---|
| WebSocket (WS) | 広くサポートされており安定している | 汎用・チャット・コラボツール |
| WebSocket TLS (WSS) | WS の暗号化版 | 本番環境 |
| WebTransport | 低レイテンシ・UDP系のデータグラム通信 | ゲーム・リアルタイム位置同期 |

> **Note:** ネットワークプラグインは必ず1つだけ追加してください。複数を同時に追加することはできません。

## WebSocket

### 開発用（WS）

TLSなしのシンプルなWebSocketサーバーです。ローカル開発に使います。

```rust
use ecson::prelude::*;

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .run();
}
```

クライアント側（ブラウザ）からは標準の WebSocket API で接続できます。

```javascript
const ws = new WebSocket('ws://127.0.0.1:8080');

ws.onopen    = () => console.log('接続成功');
ws.onmessage = (e) => console.log('受信:', e.data);
ws.onclose   = () => console.log('切断');

ws.send('hello');
```

### 本番用（WSS）

PEM形式の証明書ファイルを指定してTLS付きのWSSサーバーを起動します。Let's Encryptなど正式な認証局の証明書を使います。

```rust
use ecson::plugins::network::EcsonWebSocketTlsPlugin;

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketTlsPlugin::new(
            "0.0.0.0:8443",
            "/etc/letsencrypt/live/example.com/fullchain.pem",
            "/etc/letsencrypt/live/example.com/privkey.pem",
        ))
        .run();
}
```

クライアント側は `wss://` スキームで接続します。

```javascript
const ws = new WebSocket('wss://example.com:8443');
```

### 開発用 WSS（自己署名証明書）

証明書ファイルなしでWSSを試したい場合は `EcsonWebSocketTlsDevPlugin` が使えます。自己署名証明書をメモリ上に自動生成します。

```rust
use ecson::plugins::network::EcsonWebSocketTlsDevPlugin;

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketTlsDevPlugin::new("127.0.0.1:8443"))
        .run();
}
```

> ⚠️ **開発・テスト専用です。** ブラウザは自己署名証明書を信頼しないため、そのままでは接続できません。開発時は証明書の警告を無視する設定を使うか、後述のWebTransportの証明書ハッシュ方式を検討してください。

## WebTransport

WebTransportはHTTP/3（QUIC）上に構築されたプロトコルです。Ecsonの実装ではデータグラム通信を使用しており、WebSocketよりも低レイテンシな通信が可能です。ゲームの位置同期など、多少のパケットロスが許容できるユースケースに適しています。

### 開発用（自己署名証明書を自動生成）

`EcsonWebTransportDevPlugin` はサーバー起動時に自己署名証明書を自動生成します。ファイルには保存されず、メモリ上にのみ存在します。

```rust
use ecson::plugins::network::EcsonWebTransportDevPlugin;

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebTransportDevPlugin::new("127.0.0.1:4433"))
        .run();
}
```

起動するとコンソールに証明書ハッシュが出力されます。

```
Certificate Hash: [12, 34, 56, 78, ...]
```

この値はブラウザ側で自己署名証明書を許可するために使います。

### クライアント側（ブラウザ）の接続

WebTransport API はWebSocketとは異なります。また、自己署名証明書を使う場合は `serverCertificateHashes` にサーバーから出力されたハッシュを渡す必要があります。

```javascript
// サーバーが出力した "[12, 34, 56, ...]" 形式の文字列を Uint8Array に変換
function parseHashArray(hashStr) {
    const nums = hashStr.replace(/\[|\]/g, '').split(',').map(s => parseInt(s.trim(), 10));
    return new Uint8Array(nums);
}

const hashBytes = parseHashArray('[12, 34, 56, 78, ...]'); // サーバーの出力をここに貼る

const transport = new WebTransport('https://127.0.0.1:4433', {
    serverCertificateHashes: [{ algorithm: 'sha-256', value: hashBytes }],
});

await transport.ready;
console.log('WebTransport 接続成功');

// 送信
async function send(text) {
    const writer = transport.datagrams.writable.getWriter();
    await writer.write(new TextEncoder().encode(text));
    writer.releaseLock();
}

// 受信ループ
async function startReceiving() {
    const reader = transport.datagrams.readable.getReader();
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        console.log('受信:', new TextDecoder().decode(value));
    }
}

startReceiving();
```

> **Note:** WebTransport はブラウザのサポート状況が限られています（2026年現在、Chrome / Edge で対応）。Firefoxなど非対応ブラウザを考慮する場合はWebSocketを選んでください。

## NetworkPayload

受信・送信のどちらでも、データの本体は `NetworkPayload` として扱われます。

```rust
pub enum NetworkPayload {
    Text(String),       // テキストデータ（JSONなど）
    Binary(Vec<u8>),    // バイナリデータ
}
```

### テキストを受け取る

受信した `MessageReceived` のペイロードをパターンマッチで取り出します。

```rust
fn my_system(mut ev: MessageReader<MessageReceived>) {
    for msg in ev.read() {
        match &msg.payload {
            NetworkPayload::Text(text) => {
                println!("テキスト受信: {}", text);
            }
            NetworkPayload::Binary(bytes) => {
                println!("バイナリ受信: {} bytes", bytes.len());
            }
        }
    }
}
```

テキストだけ処理する場合はよりシンプルに書けます。

```rust
fn my_system(mut ev: MessageReader<MessageReceived>) {
    for msg in ev.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        println!("{}", text);
    }
}
```

### テキストを送る

```rust
ev_send.write(SendMessage {
    target: msg.entity,
    payload: NetworkPayload::Text("hello".to_string()),
});
```

### JSONを扱う

Ecsonはシリアライズライブラリを内包していませんが、`serde_json` などと組み合わせることができます。

```rust
// Cargo.toml に serde_json を追加してから

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct GameEvent {
    kind: String,
    data: String,
}

fn send_json_system(mut ev_send: MessageWriter<SendMessage>, target: Entity) {
    let event = GameEvent {
        kind: "spawn".to_string(),
        data: "player_1".to_string(),
    };
    let json = serde_json::to_string(&event).unwrap();

    ev_send.write(SendMessage {
        target,
        payload: NetworkPayload::Text(json),
    });
}
```

## バッファのチューニング

`EcsonWebSocketPlugin` および `EcsonWebTransportDevPlugin` にはバッファサイズを調整するオプションがあります。

```rust
EcsonWebSocketPlugin::new("0.0.0.0:8080")
    .ecs_buffer(4096)    // 全クライアントからの受信キュー。接続数・メッセージ頻度が高い場合は増やす（デフォルト: 1024）
    .client_buffer(200)  // 1クライアントへの送信キュー。送信が詰まる場合は増やす（デフォルト: 100）
```

バッファが溢れるとメッセージが欠落するため、高負荷が想定される場合は余裕を持たせてください。