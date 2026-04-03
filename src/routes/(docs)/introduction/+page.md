# Introduction

**Ecson** はRust向けのECS（Entity Component System）駆動なリアルタイムサーバーフレームワークです。
WebSocketを通じた双方向通信を、シンプルかつ高パフォーマンスに実現します。

## Ecsonとは

ECSアーキテクチャをサーバーサイドに採用することで、以下を実現します。

- **並列性** — システムはデータの依存関係に基づいて自動的に並列実行されます
- **コンポジション** — 振る舞いをComponentとして分解し、柔軟に組み合わせられます
- **パフォーマンス** — キャッシュフレンドリーなデータレイアウトで高速なイテレーションを実現

## どんな用途に向いているか

- オンラインゲームのゲームサーバー
- コラボレーションツールのリアルタイム同期バックエンド
- IoTデバイスのメッセージハブ
- チャット・通知サーバー

## どんな用途に向いていないか

- 単純なREST APIサーバー（[Axum](https://github.com/tokio-rs/axum) や [Actix-web](https://actix.rs/) を推奨）
- バッチ処理やジョブキュー

## 設計思想

EcsonはBevyエンジンのECS設計から強くインスピレーションを受けています。
Systemは純粋な関数として記述し、副作用はComponentとResourceを通じて管理します。

## 次のステップ

- [ECS Primer](/ecs-primer) — ECSの基本概念を学ぶ
- [Quick Start](/quick-start) — 5分で動くサーバーを作る
- [Installation](/installation) — プロジェクトへの追加方法
