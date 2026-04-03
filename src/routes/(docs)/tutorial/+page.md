# チュートリアル: ルーム付きチャットサーバーを作ろう

このチュートリアルでは、ルーム付きチャットサーバーを一から実装します。

完成すると、クライアントは`/join <ルーム名>`でルームに入室し、同じルームのメンバーだけにメッセージが届くようになります。

---

### 完成形のイメージ

```
クライアントA: /join rust    →  [System] Joined: rust
クライアントB: /join rust    →  [System] Joined: rust
クライアントA: こんにちは    →  [rust]: こんにちは  ← AとBに届く
クライアントC: /join gleam   →  [System] Joined: gleam
クライアントC: やあ          →  [gleam]: やあ       ← Cにしか届かない
```

---

## 1. コンポーネントを定義する

まず「このコンポーネントはどのルームにいるか」というデータを表示するコンポーネントを作ります。

```Rust
use ecson::prelude::*;

#[derive(Component)]
struct Room(String);
```

`#[derive(Component)]`を付けるだけで、ECSワールド上のエンティティに取り付けられるコンポーネントになります。`Room("rust".to_string())`のように使い、`String`でルーム名を保持します。

> 改めて、コンポーネントとは<br>
エンティティ（＝接続）に貼り付けられるデータのラベルです。Room コンポーネントが付いていないエンティティは「まだどのルームにも入っていない」ことを意味します。コンポーネントの有無自体が状態を表せる点が、ECSの大きな特徴です。

## 2. システムのシグネチャを決める

ロジックを書く前に、システムの「引数リスト」を組み立てましょう。引数がそのままシステムの能力を決めます。

```Rust
fn chat_server_system(
    mut commands: Commands,
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
    clients: Query<(Entity, &Room)>,
) {

}

fn cleanup_system(
    mut commands: Commands,
    mut ev_disconnect: MessageReader<UserDisconnected>,
) {

}
```

|引数|役割|
|:---|:---|
|`Commands`|エンティティへのコンポーネントのアタッチ・デスポーンなど、ECSの変更操作を行うハンドル|
|`MessageReader<MessageReceived>`|クライアントから届いたメッセージを読み取る|
|`MessageWriter<SendMessage>`|クライアントへメッセージを送り出す|
|`Query<(Entity, &Room)>`|`Room`コンポーネントを持つエンティティの一覧を取得する|

---

### Queryについて

`Query`は「どんなコンポーネントを持つエンティティを探したいか」を型で表す検索窓口です。

```Rust
// Room を持つ全エンティティの Entity と &Room を取得
Query<(Entity, &Room)>
```

`With<T>`をフィルターとして使うと、取得したいデータには含めず「持っている」条件だけを追加できます。

```Rust
// ClientId を持つ Entity だけが欲しい (ClientId の中身は要らない)
Query<Entity, With(ClientId)>
```

## 3. コンポーネントをアタッチする

クライアントから`/join rust`というメッセージが届いたら、`Room("rust")`をそのエンティティに取り付けます。

```Rust
fn chat_server_system(
    mut commands: Commands,
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
    clients: Query<(Entity, &Room)>,
) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        let text = text.trim();

        if let Some(room_name) = text.strip_prefix("/join ") {
            // ① ルーム名を取り出してコンポーネントを作る
            let new_room = room_name.trim().to_string();

            // ② エンティティに Room コンポーネントをアタッチ
            commands.entity(msg.entity).insert(Room(new_room.clone()));

            // ③ 入室メッセージを返す
            ev_send.write(SendMessage {
                target: msg.entity,
                payload: NetworkPayload::Text(format!("[System] Joined: {}", new_room)),
            });
        }
        // ...
    }
}
```

`commands.entity(msg.entity).insert(Room(...))`がコンポーネントのアタッチです。既に`Room`が付いている場合は自動的に上書きされるため、ルームの移動も同じコードで実現できます。

> なぜ `Commands` を使うのか<br>
ECSは複数のシステムを並列実行することがあります。そのため「今すぐ変更」ではなく Commands に変更内容を「予約」しておき、フレームの切り替わり時にまとめて適用することで安全性を保っています。

## 4. Queryでデータを取得する

`/join`以外のメッセージが届いたとき、送信者がルームに入っているかを確認し、同じルームのメンバー全員へ配信します。

```Rust
// /join から始まらないメッセージの処理
        } else if let Ok((_, room)) = clients.get(msg.entity) {
            // ↑ Query::get() で特定エンティティのコンポーネントを取得
            //   Room を持っていなければ Err が返るので、未入室ユーザーを弾ける

            for (target_entity, target_room) in clients.iter() {
                // 同じルームにいるメンバーにだけ送信
                if target_room.0 == room.0 {
                    ev_send.write(SendMessage {
                        target: target_entity,
                        payload: NetworkPayload::Text(
                            format!("[{}]: {}", room.0, text)
                        ),
                    });
                }
            }
        }
```

`Query`には主に2つの使い方があります。

|メソッド|用途|
|---|---|
|`.get(entity)`|特定のエンティティ1件を取得。コンポーネントが無ければ`Err`|
|`.iter()`|クエリ条件に一致する全エンティティをイテレート|

ここでは`.get()`で「送信者がルームに入っているか」を確認し、`.iter()`で「全ルームメンバー」を走査するという2段構えを使っています。

## 5. 切断時にエンティティをデスポーンする

クラアントが切断しても、Ecsonは自動でエンティティを削除しません。不要なエンティティが残るとメモリリークや誤送信の原因になるため、`UserDisconnected`イベントを受け取ってデスポーンします。

```Rust
fn cleanup_system(
    mut commands: Commands,
    mut ev_disconnect: MessageReader<UserDisconnected>,
) {
    for event in ev_disconnect.read() {
        if let Ok(mut ent) = commands.get_entity(event.entity) {
            ent.despawn();
        }
    }
}
```

`UserDisconnected`はEcsonがネットワーク層を監視して自動的に発行するイベントです。`commands.get_entity()`でエンティティのハンドルを取得し、`.despawn()`でエンティティでECSワールドから削除します。`get_entity`が`Ok`を返すかをチェックしているのは、切断のタイミング次第でエンティティが既に存在しない場合があるためです。

## 6. まとめて登録して起動する

```Rust
fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_systems(Update, (chat_server_system, cleanup_system))
        .run();
}
```

複数のシステムはタプルでまとめて渡せます。

## 完成コード

```Rust
use ecson::prelude::*;

#[derive(Component)]
struct Room(String);

fn chat_server_system(
    mut commands: Commands,
    mut ev_received: MessageReader<MessageReceived>,
    mut ev_send: MessageWriter<SendMessage>,
    clients: Query<(Entity, &Room)>,
) {
    for msg in ev_received.read() {
        let NetworkPayload::Text(text) = &msg.payload else { continue };
        let text = text.trim();

        if let Some(room_name) = text.strip_prefix("/join ") {
            let new_room = room_name.trim().to_string();
            commands.entity(msg.entity).insert(Room(new_room.clone()));
            ev_send.write(SendMessage {
                target: msg.entity,
                payload: NetworkPayload::Text(format!("[System] Joined: {}", new_room)),
            });
        } else if let Ok((_, room)) = clients.get(msg.entity) {
            for (target_entity, target_room) in clients.iter() {
                if target_room.0 == room.0 {
                    ev_send.write(SendMessage {
                        target: target_entity,
                        payload: NetworkPayload::Text(format!("[{}]: {}", room.0, text)),
                    });
                }
            }
        }
    }
}

fn cleanup_system(
    mut commands: Commands,
    mut ev_disconnect: MessageReader<UserDisconnected>,
) {
    for event in ev_disconnect.read() {
        if let Ok(mut ent) = commands.get_entity(event.entity) {
            ent.despawn();
        }
    }
}

fn main() {
    EcsonApp::new()
        .add_plugins(EcsonWebSocketPlugin::new("127.0.0.1:8080"))
        .add_systems(Update, (chat_server_system, cleanup_system))
        .run();
}
```

## 次のステップ

ここまでで、コンポーネントの定義・アタッチ・クエリ・デスポーンという基本操作をひととおり体験しました。
同じ要領で Username(String) コンポーネントを追加してニックネーム機能を付けたり、Health(u32) を付けてゲームのHPを管理したりと、自由に拡張できます。

また、ここで手書きしたロジックは ChatFullPlugin として提供されています。実際のプロダクトでは組み込みプラグインを活用して、よりビジネスロジックの本質に集中することができます。

- [Core Concepts](/concept) — Ecson固有概念について
- [Plugins](/plugins) — プラグイン一覧と作り方
