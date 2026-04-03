# Concept

このページにEcson固有の仕組みや設計判断を詰め込みます。少し長くなるので、「何について話すのか」目次を参考にしてください。

1. `EcsonApp`
2. スケジュール方式
3. サーバーのTick
4. ネットワーク層とECS層のブリッジ
5. `Commands`
6. `NetworkPayload`とメッセージ形式

## 1. `EcsonApp`

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

### 中身

`EcsonApp`はこのように定義されています。

```Rust
pub struct EcsonApp {
    pub world: World,
    pub schedules: Schedules,
}
```


## 2. スケジュール方式


## 3. サーバーのTick


## 4. ネットワーク層とECS層のブリッジ


## 5. `Commands`


## 6. `NetworkPayload`とメッセージ形式
