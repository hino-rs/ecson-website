# ECS Primer

>Ecsonでの開発を円滑に進めるために、ECS（Entity Component System）の基本概念を学びます。

ECSは「Entity Component System」の略称で、アーキテクチャパターンの1つです。
よくデータ志向設計(DOD)と混同されがちですが、根本的に別レイヤーの概念です。
このサイトでは、ECS駆動であるEcsonを使った開発が円滑になるように、ECSについて解説します。

どうやって解説しようかなーと悩んだのですが、OOP、 DOD、 ECSの順番で説明してみます。

## OOP

言わずと知れたオブジェクト指向ですが、これはDODの対極ともいえる概念なので、まずはOOPを改めて理解しましょう。
オブジェクトは、**「データ」と「処理」をセットにしたモノ**です。
オブジェクトを中心とすることで、人間にとって直感的に扱うことができますが、実はCPUにとってはそうでありません。

例えば、

```Rust
#[derive(Default)]
struct User<'a> {
    id: u64,
    name: &'a str,
    bio: &'a str,
    age: u8,
    friends: Box<Vec<User<'a>>>,
}

impl<'a> User<'a> {
    fn edit_bio(&mut self, new_bio: &'a str) {
        self.bio = new_bio;
    }
}
```

このようなオブジェクトがあったとしましょう。

```Rust
let mut users: Vec<User> = vec![];

for id in 1..=1000000 {
    users.push(
        User {
            id,
            ..Default::default()
        }
    )
}
```

1,000,000のインスタンスを生成し、ベクタに追加したとして、

```Rust
for id in 1..users.len() {
    if users[id].id % 2 == 0 {
        users[id].edit_bio("I like the Rust language");
    }
}
```

このような処理を回してみましょう(処理自体に深い意味はありませんが)。
このとき、本質的には`User`の`bio`を書き換えたいだけなのに、毎回その他5つのフィールドも一緒にメモリから読み込まれてしまっています。

|フィールド|型|サイズ(バイト)|今回の処理に必要か|
|---|---|---|---|
|`id`|`u64`|8|✕|
|`name`|`&str`|16|✕|
|`bio`|`&str`|16|〇|
|`age`|`u8`|1|✕|
|`friends`|`Box`|8|✕|

計49バイトのデータなんですが、この場合8の倍数(56バイト)に揃えるために、コンパイラがパディング(詰め物)を7バイト分入れてしまいます。
その方がCPUにとってキリがよく「気持ちが良い」からだと思ってください。

さあ、もう言いたいことは分かりますよね。
必要なのは16バイトだけなので、28.5%(16/56)しか意味がないんです。言い換えれば、70%以上が無駄なデータを読み込んでいます。

サイズを強調しましたが、ここで一番致命的なのは、**`bio`と次の`bio`の間に別の不要なデータが挟まっていること**なんです。
CPUが連続して処理を行いたいのに、データが飛び飛びになっているせいで、「キャッシュに乗りづらくなる(キャッシュヒット率が下がる)」という現象が起きてしまいます。

## DOD

そういった物理的な問題を解決するのがDOD(データ志向設計)なんです。
OOPが「人間ファースト」であれば、DODは「CPUファースト」と言えるでしょう。

もしかしたら、今のあなたはこの構造体を見れば一瞬で理解できるかもしれません。

```Rust
#[derive(Default)]
struct UsersData<'a> {
    ids: Vec<u64>,
    names: Vec<&'a str>,
    bios: Vec<&'a str>,
    ages: Vec<u8>,
    friend_ids: Vec<Vec<usize>>,
}
```

そうです、データの持ち方を「構造体の配列」から「配列の構造体」へとひっくり返したのです。
前者をAoS(Array of Structures)、後者をSoA(Structure of Arrays)と呼びます。

さて、以下はAoSとSoAどっちでしょうか？
```
[u64, u64, u64, u64, u64, u64 ...]
[&str, &str, &str, &str, &str, ...]
[&str, &str, &str, &str, &str, ...]
[u8, u8, u8, u8, u8, u8, u8, u8 ...]
[Vec<usize>, Vec<usize>, Vec<usize>, ...]
```

続いて、以下はどうでしょう
```
[{u64, &str, &str, u8, Vec<usize>}, {u64, &str, &str, u8, Vec<usize>}, {u64, &str, &str, u8, Vec<usize>}]
```

言うまでもないですが、上がSoA(DODのアプローチ)、下がAoS(OOPのアプローチ)です。

このSoA形式で、先ほどの「bioを編集する操作」をしてみましょう。

```Rust
for i in 0..users.ids.len() {
    if users.ids[i] % 2 == 0 {
        users.bios[i] = "I like the Rust language";
    }
}
```

はい、1対象あたり&str(16バイト)の配列のみを連続して扱う形にすることができました。
間に他の不要なデータが挟まらないのでパディングの無駄も0ですし、CPUは「常にすぐ隣にあるデータ」にアクセスすれば良いので、**キャッシュに超絶乗りやすい(ヒット率が高い)**状態になります。

## ECS

さて、DODの本質を理解したところで、いよいよECSについて見てみましょう。

導入でも言った通り、ECSは3つの要素で構成され、かつ完全にそれぞれ分離しています。

- Entity (エンティティ)
  - 単なる「空の箱」または「ID(識別番号)」です。
- Component (コンポーネント)
  - 「純粋なデータのみ」の集まりです。
- System (システム)
  - 「純粋なロジックのみ」を担当します。

先ほどのDODプログラムを、ECS的な実装に落とし込んでみましょう。

```Rust
#[derive(Default)]
struct World<'a> {
    // コンポーネント群
    ids: Vec<u64>,
    names: Vec<&'a str>,
    bios: Vec<&'a str>,
    ages: Vec<u8>,
    friends: Vec<Vec<usize>>, 
}

// システム(純粋なロジック)
fn edit_bio_system(ids: &[u64], bios: &mut [&str]) {
    for (id, bio) in ids.iter().zip(bios.iter_mut()) {
        if id % 2 == 0 {
            *bio = "I like the Rust language";
        }
    }
}

fn main() {
    let mut world = World::default();

    // エンティティを1,000,000作る
    for id in 1..=1000000 {
        world.ids.push(id);
        world.names.push("");
        world.bios.push("");
        world.ages.push(0);
        world.friends.push(vec![]);
    }

    // システムの実行
    edit_bio_system(&world.ids, &mut world.bios);
}
```

ここで登場した`World`というのは、ECSにおいて **「データベース」のような役割** を果たします。
全てのエンティティ(ID)とそれに紐づくコンポーネント(データ)を中央で管理する巨大なコンテナです。この`World`があるおかげで、システム側は「特定のデータを持つエンティティだけを処理したい!」という要求を簡単に投げることができるようになります。

一言でいえば、**ECSはDODの考え方を現実的に扱いやすくしたアーキテクチャ**なんです。SoAによるパフォーマンスの恩恵を完全に受けつつ、コードの拡張性も高まります。

さらにRust特有のメリットもあります。Rustでは「1つの構造体の一部を不変参照、別の一部を可変参照として同時に借りる」のは仕組み上困難です。しかし、ECSのようにコンポーネントの配列が独立していれば、`edit_bio_system(&world.ids, &mut world.bios);`のように、配列ごとに別々の借用としてスッキリ渡すことができるのです。

## 次のステップ

- [Quick Start](/quick-start) — 実際にECSを使ってみる
- [Components](/components) — Componentの詳細
- [Events](/events) — Eventシステムの使い方
