# AI秘書 Phase6 契約書管理

## 現在の実装範囲

クラウドサインAPI送信は実装しない。現在はLightプラン運用を前提に、以下までを行う。

- 契約書テンプレート管理
- 顧客情報の自動差し込み
- PDF生成
- 顧客詳細への保存
- 契約書ステータス管理
- 送付準備完了の記録
- PDFダウンロード

## 契約書ステータス

- draft: 未作成
- created: 作成済み
- ready_to_send: 送付準備済み
- sent: 送付済み
- checking: 確認中
- waiting_signature: 署名待ち
- signed: 締結済み
- cancelled: キャンセル
- expired: 期限切れ

## テンプレート

- 谷田部個人レッスン契約書
- スタッフ個人レッスン契約書
- キッズスクール利用規約
- 足技塾利用規約
- SYSC入会契約書
- オンライン診断同意書
- 海外向け契約書
- 写真動画利用同意書
- 個人情報同意書

## CloudSign Corporate移行時の追加設計

`contract_documents` には将来API連携用に以下の列を用意している。

- cloudsign_document_id
- cloudsign_status
- sent_at
- signed_at
- expires_at

Corporateプラン移行後に追加するAPI候補。

- POST /api/ai-secretary/cloudsign/upload
- POST /api/ai-secretary/cloudsign/send
- GET /api/ai-secretary/cloudsign/status/:id
- GET /api/ai-secretary/cloudsign/completed-pdf/:id

## 重要な運用ルール

- 自動送信しない
- 契約内容を勝手に確定しない
- クラウドサイン送信しない
- PDF作成後、谷田部が内容確認してから送付する
