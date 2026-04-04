# コンポーネント

## 概念

名札的なもの。データを持たせることができる。

## 使い方

### 作り方

`Component`アトリビュートを構造体に付与するだけです。

```Rust
use ecson::prelude::*;

#[derive(Component)]
struct User(String);

#[derive(Component)]
struct Velocity {
    x: f32,
    y: f32,
}
```

### アタッチ方法

#### 1. エンティティ生成時

`spawn`の引数です

```Rust
commands.spawn(User("hino".to_string()))
```

#### 2. 後付け

`insert`を使います

```Rust
fn add_component_system(
    mut commands: Commands,
    query: Query<Entity, With<User>>,
) {
    for entity in &query {
        // Velocity コンポーネントを付ける
        commands.entity(entity).insert(Velocity { x: 1.0, y: 0.0 })
    }
}
```

> すでに同じ型のコンポーネントがついている場合、`insert`を使うと新しい値で上書きされます。

### 外し方

`remove`を使います

```Rust
fn remove_component_system(
    mut commands: Commands, 
    query: Query<Entity, With<Velocity>>,
) {
    for entity in &query {
        // Velocity コンポーネントを外す
        commands.entity(entity).remove::<Velocity>();
    }
}
```

#### 複数のコンポーネントを一度にまとめて

全てにコンポーネント付け外し操作には、タプルを使ってまとめて指定できます

```Rust
commands.spawn((ComponentA, ComponentB));
commands.entity(entity).insert((ComponentA, ComponentB));
commands.entity(entity).remove::<(ComponentA, ComponentB)>();
```

またはメソッドチェーンも使えます。可読性や条件分岐によって使い分けてください。

```Rust
commands.entity(entity)
    .insert(ComponentA)
    .insert(ComponentB);
```

### ポイント

- [コアコンセプト](/core-concept)でも触れた通り、設計上コンポーネントの付け外しはスケジュールのタイミングで一括適用されます。
- 頻発すぎるコンポーネントの付け外しは、メモリレイアウトの再計算が発生するため、`bool`やEnumをうまく使用しましょう。
- 実行対象を分けたいだけなら、`struct Room;`など、ユニット構造体をマーカーとして使いましょう。

## 組み込みコンポーネント

ここからは、直接触れることのできる組み込みコンポーネントを紹介します。

## コアコンポーネント

`ecson::prelude::*` に含まれており、追加の設定なしで使用できます。

### `ClientId`

クライアントを一意に識別するネットワークIDです。接続が確立されると自動的に付与されます。

```rust
#[derive(Component, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct ClientId(pub u64);
```

すべての接続エンティティが持つコンポーネントです。`Query` のフィルターとして使うことで、接続中のクライアントだけを対象にできます。

```rust
fn my_system(query: Query<(Entity, &ClientId)>) {
    for (entity, client_id) in query.iter() {
        println!("接続中: {}", client_id.0);
    }
}
```

---

### `Room`

クライアントが現在所属しているルーム名を表します。`ChatCorePlugin` / `ChatFullPlugin` を使う場合は自動で付与・削除されますが、手動で操作することも可能です。

```rust
#[derive(Component, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Room(pub String);
```

`Option<&Room>` でクエリすることで、ルームに入っているかどうかを確認できます。

```rust
fn my_system(query: Query<(Entity, &ClientId, Option<&Room>)>) {
    for (entity, client_id, room) in query.iter() {
        match room {
            Some(r) => println!("{} はルーム '{}' にいます", client_id.0, r.0),
            None    => println!("{} はどのルームにも属していません", client_id.0),
        }
    }
}
```

---

### `Username`

クライアントの表示名（ニックネーム）を保持します。`ChatCorePlugin` / `ChatFullPlugin` を使う場合は `/nick` コマンドで自動的に付与されますが、任意のタイミングで `commands.entity(e).insert(Username(...))` で付与・更新できます。

```rust
#[derive(Component)]
pub struct Username(pub String);
```

```rust
fn my_system(query: Query<(&ClientId, Option<&Username>)>) {
    for (client_id, username) in query.iter() {
        let name = username.map(|u| u.0.as_str()).unwrap_or("名無し");
        println!("{}: {}", client_id.0, name);
    }
}
```

---

## Presenceコンポーネント

`PresencePlugin` を追加すると使用できます。

### `PresenceStatus`

クライアントの在席状態を表します。`PresencePlugin` によって自動的に管理されますが、クエリして参照することができます。

```rust
#[derive(Component, Clone, Debug, PartialEq, Eq, Default)]
pub enum PresenceStatus {
    #[default]
    Online,
    Away,
    Busy,
}
```

クライアントは `/status online` / `/status away` / `/status busy` を送信することで状態を変更できます。

```rust
fn my_system(query: Query<(&ClientId, &PresenceStatus)>) {
    for (client_id, status) in query.iter() {
        println!("{}: {}", client_id.0, status); // "online" / "away" / "busy"
    }
}
```

---

## Snapshotコンポーネント

`SnapshotPlugin` を追加すると使用できます。

### `Snapshotable`

このコンポーネントが付与されたエンティティは、スナップショットの収集対象になります。マーカーコンポーネントなのでフィールドはありません。

```rust
#[derive(Component)]
pub struct Snapshotable;
```

```rust
// スナップショットに含めたいエンティティに付与する
commands.entity(entity).insert(Snapshotable);
```

### `SnapshotSubscriber`

スナップショットの**送信先**を絞り込むためのコンポーネントです。このコンポーネントを持つエンティティにのみスナップショットが送信されます。

```rust
#[derive(Component)]
pub struct SnapshotSubscriber;
```

```rust
// スナップショットを受け取らせたいクライアントに付与する
commands.entity(client_entity).insert(SnapshotSubscriber);
```

---

## Lobbyコンポーネント

`LobbyPlugin` を追加すると使用できます。

### `InLobby`

クライアントが参加しているロビー名を保持します。`LobbyPlugin` によって `/lobby join` コマンドで自動付与・削除されます。

```rust
#[derive(Component)]
pub struct InLobby(pub String);
```

`Option<&InLobby>` でクエリして、クライアントがロビーに参加しているかを確認できます。

```rust
fn my_system(query: Query<(&ClientId, Option<&InLobby>)>) {
    for (client_id, in_lobby) in query.iter() {
        match in_lobby {
            Some(l) => println!("{} はロビー '{}' にいます", client_id.0, l.0),
            None    => println!("{} はロビー未参加です", client_id.0),
        }
    }
}
```

---

## Spatialコンポーネント

`Spatial2DPlugin` / `Spatial3DFlatPlugin` / `Spatial3DPlugin` のいずれかを追加すると使用できます。

### `Position2D`

2D空間上のクライアント座標（XY平面）です。`Spatial2DPlugin` が有効な場合、接続時に自動で付与されます。

```rust
#[derive(Component, Clone, Debug, Default)]
pub struct Position2D {
    pub x: f32,
    pub y: f32,
}
```

### `Position3D`

3D空間上のクライアント座標（XYZ）です。`Spatial3DFlatPlugin` / `Spatial3DPlugin` が有効な場合、接続時に自動で付与されます。

```rust
#[derive(Component, Clone, Debug, Default)]
pub struct Position3D {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}
```

```rust
fn my_system(query: Query<(&ClientId, &Position2D)>) {
    for (client_id, pos) in query.iter() {
        println!("{} の座標: ({}, {})", client_id.0, pos.x, pos.y);
    }
}
```

> **Note:** `SpatialZone2D` / `SpatialZone3D` もエンティティに付与されますが、これらはエンジン内部でAOIゾーン計算に使われるものです。通常は直接操作する必要はありません。

## 次のステップ

- [Events](/events)
- [Resources](/resources)
- [Plugins](/plugins)
