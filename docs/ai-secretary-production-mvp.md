# AI秘書 LINE実用MVP 本番運用手順

## 目的

既存の `soccer-diagnosis.vercel.app/api/line/webhook` を使い、LINE公式に来たメッセージをSupabaseへ保存し、AI秘書の未対応LINE一覧で確認できるようにする。

この段階では `保存`、`分類`、`要約`、`返信下書き`、`返信文コピー` まで行う。LINEへの自動送信、ワンタップ送信、一斉配信、顧客統合確定は行わない。

`LINE_AUTO_REPLY_ENABLED` を `true` にしない限り、WebhookはLINE返信APIを呼ばない。

## 本番で使うURL

- LINE Webhook: `https://soccer-diagnosis.vercel.app/api/line/webhook`
- 未対応LINE一覧: `https://soccer-diagnosis.vercel.app/admin/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値`
- 読み取りAPI: `https://soccer-diagnosis.vercel.app/api/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値`

## 管理画面セキュリティ

管理画面 `/admin` 配下はBasic認証必須。`ADMIN_USER` と `ADMIN_PASSWORD` が未設定の場合、管理画面は開かない。

`admin / admin` は使わない。

## Vercelで必要な環境変数

1. 開くURL: `https://vercel.com/dashboard`
2. 対象プロジェクト: `soccer-diagnosis`
3. 押す場所: `Settings` -> `Environment Variables`
4. Productionに設定する値:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `LINE_ACCOUNT_KEY=soccer_private_lesson`
   - `LINE_ACCOUNT_DESTINATION_MAP` 任意。LINEのdestinationで自動識別したい場合に使うJSON。
   - `LINE_AUTO_REPLY_ENABLED=false`
   - `ADMIN_USER` 管理画面ID。`admin` は使わない。
   - `ADMIN_PASSWORD` 管理画面Password。長いランダム文字列にする。
   - `AI_SECRETARY_READ_TOKEN` 管理画面URL/API用の長いランダム文字列。
   - `AI_SECRETARY_DISABLED=false`
5. 押す場所: `Deployments` -> 最新デプロイの `Redeploy`
6. 所要時間: 10〜15分

## Supabase Secret key再発行後の差し替え手順

チャットやメモにSecret keyを貼った場合は、落ち着いたタイミングで再発行して差し替える。

1. 開くURL: `https://supabase.com/dashboard/projects`
2. 対象プロジェクトを開く。
3. 押す場所: `Project Settings` -> `API Keys`
4. `Secret keys` の新しいキーを作成、または既存キーをRotateする。
5. コピーする値: `sb_secret_` で始まる1行の値だけ。
6. Vercelを開く: `https://vercel.com/dashboard`
7. `soccer-diagnosis` -> `Settings` -> `Environment Variables`
8. `SUPABASE_SERVICE_ROLE_KEY` を新しい値に差し替える。
9. `Deployments` -> 最新Productionを `Redeploy`。
10. AI秘書APIで `200 OK` を確認する。

注意: Secret keyには改行、説明文、日本語、空白を混ぜない。1行だけで登録する。

## Supabaseで必要なSQL

1. 開くURL: `https://supabase.com/dashboard/projects`
2. 対象プロジェクト: `soccer-diagnosis` で使っているプロジェクト
3. 押す場所: `SQL Editor` -> `New query`
4. 入力する値: `supabase/migrate-line-ai-secretary-intake.sql` の全文
5. 押す場所: `Run`
6. 確認する場所: `Table Editor` -> `line_messages` と `line_accounts`
7. 所要時間: 5〜10分

## 複数LINE公式アカウントの接続

共通DBに保存しながら、LINE公式アカウントごとに `account_key` を分ける。

| LINE公式 | account_key | Webhook URL |
|---|---|---|
| サッカー家庭教師 | `soccer_private_lesson` | `https://soccer-diagnosis.vercel.app/api/line/webhook?account=soccer_private_lesson` |
| JAPANキッズサッカークラブ | `japan_kids_soccer_club` | `https://soccer-diagnosis.vercel.app/api/line/webhook?account=japan_kids_soccer_club` |
| SYSCチーム一斉連絡 | `sysc_team_broadcast` | `https://soccer-diagnosis.vercel.app/api/line/webhook?account=sysc_team_broadcast` |
| SYSC問い合わせ＆最新情報 | `sysc_inquiry_news` | `https://soccer-diagnosis.vercel.app/api/line/webhook?account=sysc_inquiry_news` |
| ドリブル塾 | `dribble_school` | `https://soccer-diagnosis.vercel.app/api/line/webhook?account=dribble_school` |

LINE Developersで各アカウントを開き、`Messaging API settings` のWebhook URLに上記URLを設定する。

## LINE Developersで必要な操作

1. 開くURL: `https://developers.line.biz/console/`
2. 対象Providerを開く。
3. 対象Channel: Messaging API channel
4. 押す場所: `Messaging API settings`
5. 設定する値:
   - Webhook URL: 上記の該当アカウント用URL
   - Use webhook: `Enabled`
6. 押す場所: `Verify`
7. 所要時間: 1アカウントあたり3〜5分

## 未対応LINE一覧の見方

1. `https://soccer-diagnosis.vercel.app/admin/ai-secretary/line-inbox?token=AI_SECRETARY_READ_TOKENの値` を開く。
2. Basic認証に `ADMIN_USER` と `ADMIN_PASSWORD` を入力する。
3. `未対応` タブを見る。
4. 各カードで以下を見る。
   - 受信日時
   - LINE公式アカウント
   - 問い合わせ種別
   - 対応ステータス
   - 受信内容
   - AI要約
   - AI返信下書き
   - 顧客照合候補
   - 手動メモ欄
5. 返信する場合は `返信文をコピー` を押して、LINE公式管理画面に貼り付けて送る。

## 実運用チェックリスト

- `ADMIN_USER` と `ADMIN_PASSWORD` が `admin / admin` ではない。
- `AI_SECRETARY_READ_TOKEN` が長いランダム文字列になっている。
- `SUPABASE_SERVICE_ROLE_KEY` が1行で登録されている。
- SQL `supabase/migrate-line-ai-secretary-intake.sql` をSupabaseで実行済み。
- `line_messages` に新規LINEが保存される。
- `line_accounts` に接続予定のLINE公式が入っている。
- 各LINE公式のWebhook URLに正しい `account` が付いている。
- LINE DevelopersでWebhookが `Enabled` になっている。
- 未対応LINE一覧に受信日時・種別・AI要約・返信下書きが出る。
- 返信文コピー後、送信前に谷田部が内容確認する。
- 自動送信やワンタップ送信はまだ使わない。
- `LINE_AUTO_REPLY_ENABLED` が `false` または未設定になっている。
- Secret keyを外部に貼った場合はSupabaseで再発行してVercelへ差し替える。

## 現在できること

- LINE公式に届いたテキストメッセージを保存
- LINE公式アカウント別に `account_key` を保存
- LINE userIdを保存
- 診断タイプ、予約、問い合わせ、回数券確認などの意図を分類
- AI要約を保存
- AI返信下書きを保存
- 返信文をコピー
- 手動メモを保存
- 既存 `users` テーブルから顧客候補をスコアリング
- 未対応LINE一覧をブラウザで確認

## まだできないこと

- LINEへの手動送信ボタン
- LINEワンタップ送信
- LINE自動返信の新規追加
- 顧客統合の確定操作
- Gmail、Googleカレンダー、WordPress履歴との本番横断照合
- 回数券残数の本番自動計算

## 注意

`SUPABASE_SERVICE_ROLE_KEY` はサーバー専用の強い鍵なので、ブラウザやLINEには貼らない。VercelのEnvironment Variablesだけに入れる。
