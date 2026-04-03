# Ecsonとは

**Ecson(エクソン)** は、Rust向けのECS駆動なステートフル双方向サーバーフレームワークです。
WebSocketやWebTransportを通じた持続的な接続を前提に設計されており、マルチプレイヤーゲームのバックエンド、リアルタイムコラボレーションツール、メタバース、空間シミュレーションといった、状態を持ち続けるリアルタイムアプリケーションの構築を得意とします。

> Ecsonは現在実験段階のプロジェクトです。本番環境への仕様は推奨しませんし、保証できません。APIは予告なく変更される場合があります。

## なぜEcsonが生まれたのか

従来の非同期Webフレームワーク(axum, Actix-web)は、ステートレスなCRUD APIの構築において非常に強力です。
しかし、数千のWebSocket接続が同時に・継続的に状態を共有し合うようなアプリケーションを構築しようとすると、すぐに壁にぶつかります。

それが、グローバル共有状態の問題です。

```Rust
// よくある「つらい」パターン
let state = Arc::new(Mutex::new(AppState::new()));

// ロックの競合、デッドロック、スレッドのブロック...
let mut s  state.lock().await;
```

`Arc<Mutex<T>>`でラップされた共有状態は、接続数が増えるにつれてロックの競合やデッドロックを引き起こし、コードは複雑に絡み合っていきます。

Ecsonはこの問題に対し、**ECS (Entity Component System)** というパラダイムで向き合っています。

> ECSの知識が無くても大丈夫です。[ECS Primer](/ecs-primer)にて解説します。

## ECSによるアプローチ

ECSは元来ゲーム開発の世界で磨かれたアーキテクチャパターンです。Ecsonはこれをサーバー開発に持ち込み、「接続」「データ」「ロジック」の関係を次のように再定義します。

|従来の概念|Ecsonでの扱い|
|:---|:--|
|クライアント接続|Entity (エンティティ)|
|ユーザーの状態・属性|Component (コンポーネント)|
|ビジネスロジック|System (システム)|

各接続はグローバルなECSワールド内で1つのエンティティとして生成されます。
そのエンティティに`ClientId`、`Room`、`Username`といったコンポーネントを付け外しすることでユーザーの状態を表現し、システムと呼ばれる純粋な関数がそれらを処理します。

ECSスケジューラは、データの競合が発生しないシステムを自動的に並行実行します。ロックは一切必要ありません。

---

### Ecsonが向いているケース

- マルチプレイヤーゲームのバックエンド
- ライブホワイトボードやリアルタイムコラボレーションツール
- メタバース・空間シミュレーション
- 在席管理を伴うチャットシステム

### Ecsonが向いていないケース

- REST APIやシンプルなHTTPサーバー
- ステートレスならCRUDアプリケーション

---

## コードで見るEcson

まずはコードを見てみましょう。これはエコーサーバー（受け取ったメッセージをそのまま返す）の完全なコードです。

```Rust
use ecson::prelude::*;

fn echo_system(mut ev_recv: MessageReader<MessageReceived>, mut ev_send: MessageWriter<SendMessage>) {
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

また、組み込みプラグインを使えばルーム付きチャットサーバーがたった4行で完成します。

```Rust
use ecson::prelude::*;
use ecson::plugins::chat::ChatFullPlugin;

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_plugins(ChatFullPlugin)
        .run();
}
```

## 技術スタック

EcsonはRustエコシステムの優れたクレートを組み合わせて構築されています。

- bevy_ecs
- tokio, tokio-tungstenite, tokio-rustls, tokio-util
- wtransport
- tracing, tracing-subscriver
- futures-util
- rcgen
- rustls, rustls-pemfile

## 次のステップ

- [ECS Primer](/ecs-primer) — ECSの基本概念を学ぶ
- [Quick Start](/quick-start) — 5分で動くサーバーを作る
- [Installation](/installation) — プロジェクトへの追加方法
