# ECS Primer

Ecson開発を円滑に進めるために、ECS（Entity Component System）の基本概念を学びます。

## ECSとは

ECSはゲームエンジン分野で生まれたアーキテクチャパターンで、3つの要素から成ります。

### Entity（エンティティ）

Entityは単なる**ID**です。それ自体はデータも振る舞いも持ちません。

```rust
// EntityはWorldが発行する識別子
let player: Entity = world.spawn_empty().id();
```

### Component（コンポーネント）

Componentは**純粋なデータ**です。振る舞いを持ちません。

```rust
#[derive(Component)]
struct Position { x: f32, y: f32 }

#[derive(Component)]
struct Health { current: u32, max: u32 }

#[derive(Component)]
struct Connected { peer_addr: SocketAddr }
```

### System（システム）

Systemは**純粋な関数**です。QueryでComponentを取得し、処理します。

```rust
fn heal_system(mut query: Query<&mut Health>) {
    for mut health in &mut query {
        health.current = health.current.saturating_add(1).min(health.max);
    }
}
```

## なぜサーバーにECS？

従来のOOP的なサーバー設計では、接続ハンドラがすべての状態を持ちがちです。

ECSでは接続・ゲーム状態・イベントをすべてWorldに集約するため：

- **テストしやすい** — SystemはWorldを受け取る純粋な関数
- **並列しやすい** — 読み取り専用Systemは自動的に並列実行
- **拡張しやすい** — 新機能はComponentとSystemを追加するだけ

## EcsonのWorld

EcsonではBevyと同様に `World` がすべてのデータを管理します。

```rust
// Systemの引数はWorldから自動的にインジェクションされる
fn broadcast_system(
    query: Query<&Message, With<Connected>>,
    mut events: EventWriter<BroadcastEvent>,
) {
    for msg in &query {
        events.send(BroadcastEvent { content: msg.0.clone() });
    }
}
```

## 次のステップ

- [Quick Start](/quick-start) — 実際にECSを使ってみる
- [Components](/components) — Componentの詳細
- [Events](/events) — Eventシステムの使い方
