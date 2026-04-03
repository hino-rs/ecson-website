# Installation

Ecsonをプロジェクトに追加する方法を説明します。

## 前提条件

- Rust 1.75 以降（`rustup` 経由でインストール推奨）
- Cargo（Rustに同梱）

## インストール手順

### 1. cargo add で追加

Cargoを使ってEcsonを追加するのが最も簡単な方法です。

```bash
$ cargo add ecson
```

または `Cargo.toml` に直接記述することもできます。

```toml
[dependencies]
ecson = "0.1"
```

### 2. prelude をインポート

`ecson::prelude::*` をインポートすることで、よく使うアイテムをすべて利用できます。

```rust
use ecson::prelude::*;

fn main() {
    EcsonApp::new()
        .add_plugin(WebSocketPlugin::new("127.0.0.1:8080"))
        .add_system(Update, echo_system)
        .run();
}
```

### 3. ビルド & 起動

```bash
$ cargo run
```

デフォルトでは `127.0.0.1:8080` でWebSocketサーバーが起動します。

## Feature Flags

Ecsonはいくつかのオプション機能をfeature flagsで提供しています。

| Flag | 説明 | デフォルト |
|------|------|-----------|
| `websocket` | WebSocketサポート | 有効 |
| `tls` | TLS/SSL暗号化 | 無効 |
| `tracing` | tracing crateとの統合 | 無効 |
| `full` | 全機能を有効化 | 無効 |

## 次のステップ

- [Tutorial](/tutorial) — 実際にサーバーを構築してみましょう
- [API Reference](https://docs.rs/ecson) — 詳細なAPIリファレンス
