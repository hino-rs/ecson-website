# プラグイン

プラグインはリソース・イベント・システムの登録をひとまとめにした再利用可能なモジュールです。`app.add_plugins()` で追加するだけで、定型的なセットアップを一行に凝縮できます。

```rust
fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_plugins(HeartbeatPlugin::new())
        .add_plugins(ChatFullPlugin)
        .run();
}
```

## カスタムプラグインを定義する

### 定義

`Plugin` トレイトを実装した構造体を作ります。`build` メソッドの中でリソース・イベント・システムを登録します。

```rust
use ecson::prelude::*;

pub struct MyPlugin;

impl Plugin for MyPlugin {
    fn build(self, app: &mut EcsonApp) {
        app.insert_resource(MyConfig::default());
        app.add_event::<MyEvent>();
        app.add_systems(Update, my_system);
        app.add_systems(FixedUpdate, my_fixed_system);
    }
}
```

### 設定を持たせる

ビルダーパターンを使うと呼び出し側で設定を変えられます。組み込みプラグインも同じパターンを採用しています。

```rust
pub struct MyPlugin {
    pub max_count: u32,
}

impl Default for MyPlugin {
    fn default() -> Self {
        Self { max_count: 100 }
    }
}

impl MyPlugin {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn max_count(mut self, n: u32) -> Self {
        self.max_count = n;
        self
    }
}

impl Plugin for MyPlugin {
    fn build(self, app: &mut EcsonApp) {
        app.insert_resource(MyConfig { max_count: self.max_count });
        // ...
    }
}
```

呼び出し側ではメソッドチェーンで設定できます。

```rust
app.add_plugins(MyPlugin::new().max_count(50));
```

### 複数のプラグインをまとめる

タプルで最大6つのプラグインを一度に渡せます。関連するプラグインをセットにして提供したい場合に使えます。

```rust
app.add_plugins((
    MyPlugin::new(),
    AnotherPlugin::new(),
    ThirdPlugin,
));
```

### 二重登録を防ぐ

同じプラグインが複数回 `add_plugins` される可能性がある場合、リソースの存在チェックでガードできます。

```rust
impl Plugin for MyPlugin {
    fn build(self, app: &mut EcsonApp) {
        // すでに登録済みならスキップ
        if app.world.contains_resource::<MyConfig>() {
            return;
        }
        app.insert_resource(MyConfig::default());
        // ...
    }
}
```

## 組み込みプラグイン

### ネットワーク系

ネットワークプラグインは必ず1つ追加する必要があります。複数を同時に使うことはできません。

#### `EcsonWebSocketPlugin`

WebSocketサーバーを起動します。開発・本番ともに使えるスタンダードな選択肢です。

```rust
use ecson::plugins::network::EcsonWebSocketPlugin;

app.add_plugins(
    EcsonWebSocketPlugin::new("127.0.0.1:8080")
        .ecs_buffer(2048)    // ECS受信チャンネルのバッファサイズ（デフォルト: 1024）
        .client_buffer(200), // クライアントごとの送信バッファ（デフォルト: 100）
);
```

#### `EcsonWebSocketTlsPlugin`

TLS付きのWSSサーバーを起動します。Let's EncryptなどのPEM証明書を指定します。

```rust
use ecson::plugins::network::EcsonWebSocketTlsPlugin;

app.add_plugins(
    EcsonWebSocketTlsPlugin::new(
        "0.0.0.0:8443",
        "/etc/letsencrypt/live/example.com/fullchain.pem",
        "/etc/letsencrypt/live/example.com/privkey.pem",
    )
);
```

#### `EcsonWebTransportDevPlugin`

WebTransportサーバーを起動します。自己署名証明書を使う開発用です。

```rust
use ecson::plugins::network::EcsonWebTransportDevPlugin;

app.add_plugins(EcsonWebTransportDevPlugin::new("127.0.0.1:4433"));
```

---

### `HeartbeatPlugin`

定期的にPingを送り、応答のないクライアントを自動切断します。

```rust
use ecson::plugins::heartbeat::HeartbeatPlugin;

app.add_plugins(
    HeartbeatPlugin::new()
        .interval(10.0)  // Ping送信間隔（秒）。デフォルト: 10.0
        .timeout(30.0),  // タイムアウト秒数。デフォルト: 30.0
);
```

クライアント側は `ping` を受信したら `pong` を返す必要があります。タイムアウトすると `ClientTimedOutEvent` と `UserDisconnected` が発行されます。

---

### `RateLimitPlugin`

クライアントの送信頻度を制限します。スパムや意図しない大量送信の対策に使います。

```rust
use ecson::plugins::rate_limit::{RateLimitPlugin, RateLimitAction};

app.add_plugins(
    RateLimitPlugin::new()
        .window(1.0)          // 計測ウィンドウ（秒）。デフォルト: 1.0
        .max_messages(30)     // ウィンドウ内の最大メッセージ数。デフォルト: 30
        .on_exceed(RateLimitAction::Throttle { duration_secs: 5.0 }),
        // 超過時の動作:
        //   RateLimitAction::Drop        — メッセージを無視する（デフォルト）
        //   RateLimitAction::Throttle    — 指定秒数だけ受付停止
        //   RateLimitAction::Disconnect  — 切断する
);
```

制限超過時には `RateLimitExceededEvent` が発行されます。

---

### `PresencePlugin`

クライアントの在席状態（Online / Away / Busy）を管理します。クライアントが `/status online` などを送ると状態が更新され、全クライアントへブロードキャストされます。

```rust
use ecson::plugins::presence::PresencePlugin;

app.add_plugins(PresencePlugin);
```

| クライアントコマンド | 効果 |
|---|---|
| `/status online` | 在席状態を Online に変更 |
| `/status away` | 在席状態を Away に変更 |
| `/status busy` | 在席状態を Busy に変更 |

---

### `SnapshotPlugin`

`Snapshotable` コンポーネントを持つエンティティの状態を定期的に収集し、`SnapshotSubscriber` を持つクライアントへ送信します。

```rust
use ecson::plugins::snapshot::SnapshotPlugin;

app.add_plugins(
    SnapshotPlugin::new()
        .interval(0.05)      // 送信間隔（秒）。デフォルト: 0.1（10Hz）
        .delta_only(true),   // 差分のみ送信するか。デフォルト: true
);
```

---

### Chat系プラグイン

チャット機能は3段階から選べます。必要な機能に合わせて1つを選んでください。

| プラグイン | 機能 |
|---|---|
| `ChatCorePlugin` | `/nick`、全体ブロードキャスト |
| `ChatRoomPlugin` | `/join`、`/list`、ルーム管理（`ChatCorePlugin` との併用が必要） |
| `ChatFullPlugin` | 上記すべてをまとめたもの |

通常は `ChatFullPlugin` を使うのが最も手軽です。

```rust
use ecson::plugins::chat::ChatFullPlugin;

app.add_plugins(ChatFullPlugin);
```

`ChatCorePlugin` と `ChatRoomPlugin` を個別に使う場合は両方追加します。

```rust
use ecson::plugins::chat::{ChatCorePlugin, ChatRoomPlugin};

app.add_plugins(ChatCorePlugin);
app.add_plugins(ChatRoomPlugin);
```

| クライアントコマンド | 効果 |
|---|---|
| `/nick <name>` | ニックネームを設定 |
| `/join <room>` | ルームに参加 |
| `/list` | ルーム一覧を取得 |
| その他のテキスト | 現在のルーム（またはグローバル）へブロードキャスト |

---

### `LobbyPlugin`

マッチメイキング向けのロビー機能を提供します。満員になると `LobbyReadyEvent` が発行されます。

```rust
use ecson::plugins::lobby::LobbyPlugin;

app.add_plugins(
    LobbyPlugin::new()
        .default_max_members(4), // ロビー作成時のデフォルト最大人数。デフォルト: 4
);
```

| クライアントコマンド | 効果 |
|---|---|
| `/lobby create <name> [max] [private]` | ロビーを作成して参加 |
| `/lobby join <name>` | ロビーに参加 |
| `/lobby leave` | ロビーを退出 |
| `/lobby list` | 公開ロビー一覧を取得 |
| `/lobby info <name>` | ロビーの詳細情報を取得 |

---

### Spatial系プラグイン

空間上の位置管理とAOI（Area of Interest）通知を提供します。ユースケースに合わせて1つ選んでください。

| プラグイン | 用途 | コスト |
|---|---|---|
| `Spatial2DPlugin` | 2Dゲーム・トップダウン | 低（最大9ゾーン） |
| `Spatial3DFlatPlugin` | 地上系3Dゲーム（RPG・MOBAなど） | 低（最大9ゾーン） |
| `Spatial3DPlugin` | 完全3D（宇宙・飛行シムなど） | 中（最大27ゾーン） |

```rust
use ecson::plugins::spatial::Spatial2DPlugin;

app.add_plugins(
    Spatial2DPlugin::new()
        .interest_radius(200.0) // AOI最大距離。デフォルト: 100.0
        .zone_size(100.0),      // ゾーンのセルサイズ。デフォルト: 50.0
                                // zone_size >= interest_radius / 2 を守ること
);
```

クライアントは `/move x y` または `/move x y z` を送信することで座標を更新できます。interest_radius 内の近隣クライアントに自動で位置がブロードキャストされます。

## 次のステップ

- [Networking](/networking)
