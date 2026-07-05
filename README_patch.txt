# memo-log user_key patch

以下3ファイルをGitHubの同じ場所に上書きしてください。

- src/app.js
- functions/api/notes.js
- functions/api/notes/[id].js

この修正で、ブラウザごとに localStorage の `memo_log_user_key` が作成され、
APIには `X-Memo-User-Key` ヘッダーで送られます。

TiDB側では `user_key` カラムでメモを分離します。
