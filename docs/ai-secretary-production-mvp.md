# AI秘書 LINE実用MVP 本番接続手順

## 目的

既存の `soccer-diagnosis.vercel.app/api/line/webhook` を使い、LINE公式に来たメッセージをSupabaseへ保存し、AI秘書の未対応LINE一覧で確認できるようにする。

送信機能、自動返信、顧客統合確定はまだ行わない。

## 本番で使うURL

- LINE Webhook: `https://soccer-diagnosis.vercel.app/api/line/webhook`
- 未対応LINE一覧: `https://soccer-diagnosis.vercel.app/admin/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値`
- 読み取りAPI: `https://soccer-diagnosis.vercel.app/api/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値`

## Vercelで必要な操作

1. 開くURL: `https://vercel.com/dashboard`
2. 対象プロジェクト: `soccer-diagnosis`
3. 押す場所: `Settings` -> `Environment Variables`
4. 入力する値:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `LINE_ACCOUNT_KEY=soccer_private_lesson`
   - `AI_SECRETARY_READ_TOKEN` 任意の長い文字列
   - `AI_SECRETARY_DISABLED=false`
5. 押す場所: `Deployments` -> 最新デプロイの `Redeploy`
6. 所要時間: 10〜15分

## Supabaseで必要な操作

1. 開くURL: `https://supabase.com/dashboard/projects`
2. 対象プロジェクト: `soccer-diagnosis` で使っているプロジェクト
3. 押す場所: `SQL Editor` -> `New query`
4. 入力する値: `supabase/migrate-line-ai-secretary-intake.sql` の全文
5. 押す場所: `Run`
6. 確認する場所: `Table Editor` -> `line_messages`
7. 所要時間: 5〜10分

## LINE Developersで必要な操作

1. 開くURL: `https://developers.line.biz/console/`
2. 対象Provider: `サッカー家庭教師`
3. 対象Channel: Messaging API channel
4. 押す場所: `Messaging API settings`
5. 確認する値:
   - Webhook URL: `https://soccer-diagnosis.vercel.app/api/line/webhook`
   - Use webhook: `Enabled`
6. 押す場所: `Verify`
7. 所要時間: 3〜5分

## 未対応LINE一覧の見方

1. `https://soccer-diagnosis.vercel.app/admin/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値` を開く。
2. `未対応` タブを見る。
3. 各カードで `受信内容`、`AI要約`、`AI返信下書き` を確認する。
4. 右側の `顧客照合` と `候補一覧` で既存顧客候補を見る。

## 現在できること

- LINE公式に届いたテキストメッセージを保存
- 既存Webhookの自動返信処理を壊さず、裏側でAI秘書用に保存
- LINE公式アカウントキーを保存
- LINE userIdを保存
- 診断タイプ、予約、問い合わせ、回数券確認などの意図を分類
- AI要約を保存
- AI返信下書きを保存
- 既存 `users` テーブルから顧客候補をスコアリング
- 未対応LINE一覧をブラウザで確認

## まだできないこと

- LINEへの手動送信ボタン
- LINE自動返信
- 顧客統合の確定操作
- Gmail、Googleカレンダー、WordPress履歴との本番横断照合
- 回数券残数の本番自動計算

## 注意

`SUPABASE_SERVICE_ROLE_KEY` はサーバー専用の強い鍵なので、ブラウザやLINEには貼らない。VercelのEnvironment Variablesだけに入れる。
