# Memo Log

TiDB Cloudをデータベースとして利用した、シンプルなメモ帳アプリです。

## 機能

- メモ保存
- メモ一覧表示
- メモ編集
- メモ削除
- 文字数カウント

## 構成

```text
GitHub
↓
Cloudflare Pages / Pages Functions
↓
TiDB Cloud
```

## 必要な環境変数

Cloudflare Pagesの環境変数に以下を設定してください。

```text
TIDB_URL
```

接続情報やパスワードはGitHubに置かないでください。
