# AI秘書 Phase3 売上管理

## 目的

Phase3の目的はCRM化ではなく、谷田部が今月動くべき売上候補を見つけること。

対象は以下。

- 契約管理
- 回数券管理
- 有効期限管理
- フォロー管理
- 売上管理
- 再提案管理

自動送信、自動決済、自動契約変更は実装しない。
現段階では保存、分析、表示まで。

## 追加テーブル

### products

商品マスタ。

初期投入済み商品。

- 個人レッスン 4回券
- 個人レッスン 8回券
- 個人レッスン 短期集中
- オンライン診断
- キッズスクール 月謝
- 足技塾 月謝
- SYSC 月謝

### contracts

顧客ごとの契約、購入、在籍を管理する。

主な項目。

- customer_id
- product_id
- contract_type
- status
- purchase_date
- start_date
- first_usage_date
- valid_until
- purchased_count
- used_count
- amount
- monthly_fee
- payment_status
- notes

### ticket_usage

回数券の消化履歴。

主な項目。

- contract_id
- customer_id
- usage_date
- used_count
- lesson_title
- notes

### follow_tasks

フォロー管理。

対応する抽出条件。

- 残り1回
- 残り2回
- 期限30日前
- 期限14日前
- 期限7日前
- 90日未利用
- 体験後フォロー
- レビュー依頼候補
- 足技塾候補
- SYSC候補
- 個人レッスン再提案候補

### sales_pipeline

売上候補や提案状況の管理。

主な項目。

- opportunity_type
- stage
- expected_amount
- expected_month
- priority
- ai_reason
- status

## 追加ビュー

### ai_secretary_contracts

契約と商品、回数消化をまとめたビュー。

表示できる内容。

- 契約履歴
- 購入履歴
- 購入回数
- 消化回数
- 残回数
- 有効期限
- 最終利用日

### ai_secretary_sales_candidates

今月の売上候補をAI秘書が抽出するビュー。

抽出する内容。

- 残り1回
- 残り2回
- 期限30日前
- 期限14日前
- 期限7日前
- 90日未利用
- レビュー依頼候補
- 足技塾候補
- SYSC候補
- 個人レッスン再提案候補

## 追加画面

### 売上候補一覧

URL:

`/admin/ai-secretary/revenue?token=...`

表示内容。

- 今月売上候補
- 今月失効候補
- 今月フォロー対象

### 顧客詳細

既存の顧客詳細に追加。

- 売上・契約サマリー
- 契約履歴・購入履歴
- AI売上・再提案候補
- フォロー履歴
- 回数消化履歴

## 今すぐ実装可能

- 契約登録フォーム
- 回数券消化ボタン
- フォロー完了ボタン
- 売上候補のステージ変更
- 月謝対象の今月売上見込み集計
- 体験日から体験後フォローを自動作成

## 追加権限が必要

- Googleカレンダーからレッスン消化を自動取り込み
- Gmailから契約・入金・問い合わせを自動補完
- Stripeや決済データから売上を自動反映

## 設計のみ

- 自動送信
- ワンタップ送信
- LINE一斉配信
- 契約自動変更
- 顧客統合の自動確定
- 入金自動消込
