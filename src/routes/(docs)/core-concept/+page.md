# コンセプト

このページにEcson固有の仕組みや設計判断を詰め込みます。少し長くなるので、「何について話すのか」目次を参考にしてください。

1. `EcsonApp`
2. スケジュール方式
3. サーバーのTick
4. ネットワーク層とECS層のブリッジ
5. `Commands`
6. `NetworkPayload`とメッセージ形式

## `EcsonApp`

全ての起点は`EcsonApp`です。

```Rust
let app = EcsonApp::new();
```

`EcsonApp::new()`を呼ぶと、内部で**World**が初期化されます。WorldはECSの「世界」でもあり、すべてのエンティティ・コンポーネント・リソースをここで一元管理します。システムもWorldを介してデータにアクセスします。

```
EcsonApp
└── World
    ├── Entity 1  ──  ClientId(1), ClientSender, Room("rust")
    ├── Entity 2  ──  ClientId(2), ClientSender
    ├── Entity 3  ──  ClientId(3), ClientSender, Room("gleam")
    └── Resource: ConnectionMap, RoomMap, ServerTimeConfig ...
```

プラグインやシステムを登録した後、`.run()` を呼ぶとメインループが始まり、サーバーはシャットダウンするまでこのループを回し続けます。

## スケジュール

Ecsonには3つのスケジュールがあり、`add_systems`の第一引数で指定します。

```Rust
app.add_systems(Startup,     once_system);
app.add_systems(Update,      receive_system);
app.add_systems(FixedUpdate, game_logic_system);
```

### Startup

サーバー起動時に一回だけ実行されます。初期データの投入や初期化処理に使います。

### Update

メインループの毎フレーム、可能な限り高速に実行されます。ネットワークメッセージの受信ポーリングなど、遅延を最小化したい処理に向いています。

### FixedUpdate

`ServerTimeConfig`で設定したTickレートに基づき、固定間隔で実行されます。ゲームロジックや状態の動機など、実行頻度を一定に保ちたい処理に向いています。

「起動時に1回だけ」は`Startup`、「入力の受け取り」は `Update`、「状態を変える処理」は `FixedUpdate` を基本にすると整理しやすいです。
留意いただきたいのは、`Update`も`FixedUpdate`も、常に処理は一定間隔でないということです。
例えば`FixedUpdate`は実行されないフレームが発生することがあるので、「1フレームだけtrue」と言った処理には向いていません。

## ServerTimeConfigとTickレート

`FixedUpdate`の動作は`ServerTimeConfig`リソースで制御できます。

```Rust
app.world.insert_resource(ServerTimeConfig {
    tick_rate: 60.0,        // 1秒間に60回 FixedUpdate を実行する
    max_ticks_per_frame: 5, // 1フレームあたりの FixedUpdate の最大回数
    warn_on_lag: true,      // 処理落ち時に警告ログを出す
});
```

`max_ticks_per_frame` は無限ループ対策です。サーバーが重くて処理が遅れると、Ecsonは「遅れを取り戻そう」として FixedUpdate を連続実行しようとします。それが上限を超えた場合はスキップし、`warn_on_lag: true` なら警告ログを出します。

## ネットワーク層とECS層のブリッジ

Ecsonの内部は、**Tokio(非同期)** と **ECS(同期)** という2つの異なる世界から成り立っています。

<img src="/ecs_tokio_architecture.svg" alt="ecs tokio architecture" width="70%">

Tokio側はクライアントごとに非同期タスクとして動き、接続・メッセージ・切断を`NetworkEvent`として`mpsc`チャンネルへ送ります。ECS側はフレームごとにこのチャンネルをポーリング(`try_recv`)し、イベントをECSの世界に取り込みます。

このブリッジはネットワークプラグイン（`EcsonWebSocketPlugin` など）が自動的に構築するため、通常アプリ開発者が意識する必要はありません。ただし、この構造を知っておくと「なぜロックが不要なのか」が腑に落ちます。ECS側のシステムが動いている間、Tokio側は別スレッドで独立して動いており、両者はチャンネルという一方向の受け渡し口だけで繋がっているためです。

## Commands と遅延適用

システムの引数に `Commands` を受け取ると、エンティティの生成・削除・コンポーネントのアタッチができます。

```Rust
// コンポーネントのアタッチ
commands.entity(entity).insert(Room("rust".to_string()));

// エンティティの削除
commands.entity(entity).despawn();
```

ただし、これらの変更はその場で即座に反映されるわけではありません。Commands はいわば「変更のメモ書き」であり、フレームの区切りでまとめてWorldに適用されます。

これはECSが複数のシステムを並列実行するための安全機構です。あるシステムがエンティティを削除しようとしている最中に、別のシステムが同じエンティティのコンポーネントを読もうとすると問題が起きます。Commands による遅延適用はこの競合を防ぎます。

実用上は「同じフレーム内で `insert` した直後に `get` しても取れないことがある」と覚えておけば十分です。

## NetworkPayload とメッセージ形式

クライアントとの間でやり取りされるデータは NetworkPayload 型で表現されます。

```Rust
rustpub enum NetworkPayload {
    Text(String),    // テキスト（JSON など）
    Binary(Vec<u8>), // バイナリデータ
}
```

プロトコルの選択はアプリケーション側に委ねられています。シンプルなチャットなら `Text` にプレーンな文字列、より複造なデータのやり取りには Text にJSONを乗せる、あるいはパフォーマンスを重視するなら `Binary` にMessagePackなどを使うといった構成が考えられます。

> WebTransportについてはバイナリを使用するのが一般的です。

## 次のステップ

コアコンセプトを理解したところで、ECSのコンセプトに進むのはどうでしょうか
概念・作り方・組み込み について書かれています。

- [Components](/core-concept)
- [Events](/events)
- [Resources](/resources)
- [Plugins](/plugins)
