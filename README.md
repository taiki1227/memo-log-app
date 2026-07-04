# Memo Log

TiDB Cloud をデータベースとして利用する、シンプルなメモ帳アプリです。

## 機能

- メモ保存
- メモ一覧表示
- メモ編集
- メモ削除
- 文字数カウント

## 構成

```text
GitHub Private Repository
↓
Cloudflare Pages / Pages Functions
↓
TiDB Cloud Starter
```

## ファイル構成

```text
memo-log-app/
├── index.html
├── package.json
├── .gitignore
├── README.md
├── src/
│   ├── app.js
│   └── style.css
└── functions/
    └── api/
        ├── notes.js
        └── notes/
            └── [id].js
```

## TiDB側のテーブル

TiDB Cloud SQL Editorで以下を実行してください。

```sql
CREATE DATABASE IF NOT EXISTS memo_log;

CREATE TABLE IF NOT EXISTS memo_log.notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  char_count INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Cloudflare Pages側の設定

Cloudflare Pagesでこのリポジトリを接続します。

### Build settings

シンプルな静的ファイル + Pages Functions構成です。

```text
Build command: npm install
Build output directory: /
```

うまくいかない場合は、Cloudflare Pages側で以下でも試してください。

```text
Build command: npm install
Build output directory: .
```

## 環境変数

Cloudflare Pagesの環境変数に以下を設定してください。

```text
TIDB_URL
```

値はTiDB CloudのConnect画面で取得する接続URLを使います。

例：

```text
mysql://ユーザー名:パスワード@ホスト名/memo_log
```

接続URLやパスワードはGitHubに置かないでください。

## 注意

このアプリは学習・試作用の最小構成です。

本格運用する場合は、以下を追加検討してください。

- 認証
- ユーザーごとのデータ分離
- 入力値バリデーション強化
- Cloudflare Accessによるアクセス制限
- バックアップ
- エラー監視
