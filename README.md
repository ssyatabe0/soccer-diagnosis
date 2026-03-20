# サッカー才能の出し方診断

サッカー家庭向けの無料診断システム。30秒・10問で子どもの「サッカー才能の出し方」を12タイプに分類し、自動で有料導線（オンライン診断・対面スタート診断）に繋げます。

## 技術構成

- **Next.js** (App Router) + TypeScript
- **Supabase** (DB + Auth)
- **TailwindCSS**
- **LINE Messaging API**
- **Vercel** デプロイ前提

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
cd soccer-diagnosis
npm install
```

### 2. Supabase設定

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行
3. （任意）`supabase/seed.sql` でダミーデータを投入

### 3. 環境変数の設定

`.env.local` を編集し、実際の値を入力：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. LINE Messaging API設定

1. [LINE Developers](https://developers.line.biz/) でチャネルを作成
2. Messaging API チャネルの Access Token を取得
3. Webhook URL を `https://your-domain.com/api/line/webhook` に設定

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

### 6. Vercelデプロイ

```bash
npx vercel
```

Vercelの環境変数に上記の値を設定してください。

## ページ構成

| パス | 内容 |
|------|------|
| `/` | ランディングページ |
| `/diagnosis` | 診断画面（10問） |
| `/diagnosis/result/[id]` | 結果ページ |
| `/admin` | 管理画面ダッシュボード |
| `/admin/users` | ユーザー一覧 |
| `/admin/results` | 診断結果一覧 |

## API

| エンドポイント | メソッド | 内容 |
|---------------|---------|------|
| `/api/diagnosis` | POST | 診断実行・結果保存 |
| `/api/og` | GET | OG画像生成 |
| `/api/line/webhook` | POST | LINE Webhook受信 |
| `/api/share-text` | GET | シェアテキスト生成 |

## 診断ロジック

- 10問の選択式質問
- 各選択肢にスコアキーとポイントを設定
- 合計スコアで12タイプに分類
- 同時にタグ（beginner, low_grade, late_start, stagnation, selection）を付与
- 合計点でレーン振り分け: A(0-4), B(5-8), C(9+)

## DB テーブル

- `diagnosis_results` - 診断結果
- `users` - ユーザー管理
- `diagnosis_tags` - タグ（正規化）
- `line_delivery_logs` - LINE配信ログ
- `case_links` - 症例カルテ閲覧ログ
- `conversion_status` - 成約ステータス
- `staff_notes` - スタッフメモ
