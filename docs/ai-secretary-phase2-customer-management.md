# AI秘書 Phase2 顧客管理システム設計

## 目的

AI秘書MVPで保存できるようになったLINE受信データを起点に、顧客マスタ、ステータス、タイムラインを作る。

現段階では自動送信しない。保存、分類、管理まで行う。

## 実装済み

### 顧客マスタ

`customers` テーブルを追加。

管理項目:

- 氏名
- 保護者名
- 子ども名
- LINEアカウント連携
- サービス種別
- 学年
- 地域
- 所属チーム
- 問い合わせ日
- 体験日
- 入会日
- 退会日
- 担当者
- メモ

### ステータス管理

`customers.status` と `line_messages.customer_status` で管理。

対応ステータス:

- `new_inquiry`: 新規問い合わせ
- `trial_scheduling`: 体験調整中
- `trial_booked`: 体験予約済み
- `trial_done`: 体験完了
- `considering`: 検討中
- `enrolled`: 入会
- `continuing`: 継続
- `paused`: 休会
- `withdrawn`: 退会

### AI自動分類

LINE本文とLINE公式アカウントから `service_category` を自動分類。

分類:

- `private_lesson`: 個人レッスン
- `ashiwaza_dribble`: 足技塾/ドリブル塾
- `sysc`: SYSC
- `kids_school`: キッズスクール
- `overseas`: 海外問い合わせ
- `unknown`: 未分類

### 顧客タイムライン

`customer_timeline_events` を追加。

対象イベント:

- 問い合わせ
- LINE内容
- 体験
- 入会
- 退会
- メモ
- Gmail
- Googleカレンダー

### Gmail連携準備

`gmail_sync_sources` を追加。

今後、Gmail APIから問い合わせメール、返信履歴、未返信メールを取り込むための保存先。

### Googleカレンダー連携準備

`calendar_sync_sources` を追加。

今後、レッスン予定、体験日、回数券消化、期限管理を取り込むための保存先。

### 自動返信設計

現時点では送信しない。

`LINE_AUTO_REPLY_ENABLED=true` を明示しない限り、WebhookはLINE返信APIを呼ばない。

将来の自動返信は以下の順番で段階的に実装する。

1. AI返信下書きのみ
2. 谷田部確認後コピー
3. 谷田部確認後ワンタップ送信
4. 条件限定の半自動返信
5. 自動返信は最後まで原則OFF

## 画面

### 顧客一覧

`/admin/ai-secretary/customers?token=AI_SECRETARY_READ_TOKEN`

できること:

- 顧客一覧を見る
- ステータスで絞り込む
- サービス種別を見る
- LINE件数を見る
- 最終連絡日を見る

### 顧客詳細

`/admin/ai-secretary/customers/[id]?token=AI_SECRETARY_READ_TOKEN`

できること:

- 顧客マスタ編集
- ステータス変更
- 担当者変更
- メモ編集
- タイムライン表示
- LINE履歴表示

## 今すぐ実装可能

- 顧客一覧の検索
- ステータス変更ボタン
- LINE未対応から顧客詳細への導線強化
- 顧客メモのテンプレート化
- 体験日、入会日、退会日の手動入力
- 顧客タイムラインへの手動メモ追加
- テストデータの整理

## 追加権限が必要

- Gmail読み取り
- Googleカレンダー読み取り
- LINE公式プロフィール取得
- LINE公式への送信
- LINE公式複数アカウントのChannel access token管理
- Vercel環境変数追加
- Supabase Secret key再発行

## 設計のみ

- Gmail本文から顧客照合
- Googleカレンダーから残回数計算
- 回数券期限の自動管理
- AI人物カルテの定期再生成
- 自然文検索
- 自動返信/ワンタップ送信
- Notion/Airtable同期
