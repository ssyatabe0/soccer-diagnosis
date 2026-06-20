# 谷田部OS 統合マップ PhaseX

## 目的

これまで実装した AI秘書、顧客管理、売上管理、契約管理、回数券管理、症例管理、動画管理、AI診断、AI提案書、SaaS/世界展開構想を、谷田部OSとして整理する。

## 最終メニュー

| No | メニュー | URL | 状態 | 役割 |
|---:|---|---|---|---|
| 1 | ダッシュボード | `/admin/ai-secretary/dashboard` | 実運用可能 | 今日やる顧客対応を見る |
| 2 | 未対応LINE | `/admin/ai-secretary/line-inbox` | 実運用可能 | LINE受信、要約、返信下書き |
| 3 | 顧客 | `/admin/ai-secretary/customers` | 実運用可能 | 顧客マスタ、詳細、履歴 |
| 4 | 売上 | `/admin/ai-secretary/revenue` | 実運用可能 | 売上候補、再提案候補 |
| 5 | 契約 | `/admin/ai-secretary/contracts` | 実運用可能 | 契約、契約書、PDF管理 |
| 6 | 回数券 | `/admin/ai-secretary/tickets` | 開発中 | 残回数、消化、有効期限 |
| 7 | フォロー | `/admin/ai-secretary/follow` | 開発中 | フォロータスク、期限、レビュー候補 |
| 8 | 症例 | `/admin/ai-secretary/cases` | 開発中 | 症例DB、匿名化、研究用途 |
| 9 | 動画 | `/admin/ai-secretary/videos` | 開発中 | 動画DB、YouTube/SNS連携準備 |
| 10 | AI診断 | `/admin/ai-secretary/diagnosis-center` | 開発中 | 悩み、原因、改善案、類似症例 |
| 11 | AI提案書 | `/admin/ai-secretary/proposals` | 開発中 | サービス提案、プラン提案、提案書 |
| 12 | 設定 | `/admin/ai-secretary/integrations` | 開発中 | Gmail、カレンダー、外部連携 |

## 画面一覧

### 中核画面

- `/admin/ai-secretary/dashboard` 今日の対応ダッシュボード
- `/admin/ai-secretary/line-inbox` 未対応LINE
- `/admin/ai-secretary/customers` 顧客マスタ
- `/admin/ai-secretary/customers/[id]` 顧客詳細
- `/admin/ai-secretary/revenue` 売上候補
- `/admin/ai-secretary/contracts` 契約管理
- `/admin/ai-secretary/tickets` 回数券管理
- `/admin/ai-secretary/follow` フォロー管理
- `/admin/ai-secretary/cases` 症例DB
- `/admin/ai-secretary/videos` 動画DB
- `/admin/ai-secretary/diagnosis-center` AI診断
- `/admin/ai-secretary/proposals` AI提案書
- `/admin/ai-secretary/integrations` 設定/連携

### 補助画面

- `/admin/ai-secretary/sales-meeting` AI営業会議
- `/admin/ai-secretary/today-sales` 今日の営業
- `/admin/ai-secretary/reviews` レビュー候補
- `/admin/ai-secretary/churn-risk` 退会防止
- `/admin/ai-secretary/search` 自然文検索
- `/admin/ai-secretary/case-search` 症例検索
- `/admin/ai-secretary/article-generator` 記事生成
- `/admin/ai-secretary/sns-generator` SNS生成
- `/admin/ai-secretary/coach-support` AIコーチ支援
- `/admin/ai-secretary/case-library` 症例ライブラリ
- `/admin/ai-secretary/parent-consultation` 保護者相談
- `/admin/ai-secretary/staff-training` スタッフ教育
- `/admin/ai-secretary/quality-control` 品質管理

### 将来/SaaS/世界展開画面

- `/admin/ai-secretary/saas-os` 谷田部メソッドOS/SaaS
- `/admin/ai-secretary/tenant-dashboard` SaaS管理
- `/admin/ai-secretary/saas-pricing` SaaS料金
- `/admin/ai-secretary/saas-api` SaaS API
- `/admin/ai-secretary/saas-plan` 事業計画
- `/admin/ai-secretary/method-network` 認定ネットワーク
- `/admin/ai-secretary/coach-certification` 認定コーチ
- `/admin/ai-secretary/school-certification` 認定スクール
- `/admin/ai-secretary/national-cases` 全国症例DB
- `/admin/ai-secretary/referral-network` 紹介ネットワーク
- `/admin/ai-secretary/global-expansion` 世界展開
- `/admin/ai-secretary/global-diagnosis` 海外診断
- `/admin/ai-secretary/world-cases` 世界症例DB
- `/admin/ai-secretary/overseas-camps` 海外キャンプ
- `/admin/ai-secretary/ai-translation` AI通訳
- `/admin/ai-secretary/soccer-hospital` サッカー病院
- `/admin/ai-secretary/medical-records` 電子カルテ
- `/admin/ai-secretary/prescriptions` AI処方箋
- `/admin/ai-secretary/improvement-prediction` 改善予測
- `/admin/ai-secretary/case-lab` 症例研究所
- `/admin/ai-secretary/soccer-university` サッカー大学

## API一覧

### 実運用に近いAPI

- `GET/POST /api/line/webhook` LINE Webhook受信
- `GET /api/ai-secretary/line-inbox` 未対応LINE取得/更新
- `GET/POST /api/ai-secretary/customers` 顧客管理
- `GET/PATCH /api/ai-secretary/customers/[id]` 顧客詳細
- `GET/POST /api/ai-secretary/contracts` 契約管理
- `GET/POST /api/ai-secretary/ticket-usage` 回数券消化
- `GET/POST /api/ai-secretary/follow-tasks` フォロータスク
- `GET /api/ai-secretary/sales` 売上候補

### 開発中API

- `/api/ai-secretary/gmail/import` Gmail取り込み
- `/api/ai-secretary/calendar/import` Googleカレンダー取り込み
- `/api/ai-secretary/calendar-usage-candidates/[id]` 回数券消化候補
- `/api/ai-secretary/profiles/generate` AI人物カルテ生成
- `/api/ai-secretary/diagnosis/generate` AI診断生成
- `/api/ai-secretary/proposals/generate` AI提案書生成
- `/api/ai-secretary/search` 自然文検索
- `/api/ai-secretary/case-search` 症例検索
- `/api/ai-secretary/cases` 症例管理
- `/api/ai-secretary/videos` 動画管理
- `/api/ai-secretary/content/generate` 記事/SNS生成
- `/api/ai-secretary/contract-documents/generate` 契約書PDF生成
- `/api/ai-secretary/contract-documents/[id]` 契約書詳細
- `/api/ai-secretary/contract-documents/[id]/download` PDFダウンロード

### 既存診断/API

- `/api/diagnosis`
- `/api/contact-diagnosis`
- `/api/notify-result`
- `/api/line/send-result`
- `/api/share-text`
- `/api/og`
- `/api/debug-env`

## DB一覧

### 中核DB

- `line_accounts`
- `line_messages`
- `customers`
- `customer_ai_profiles`
- `customer_line_accounts`
- `customer_timeline_events`
- `gmail_sync_sources`
- `calendar_sync_sources`

### 売上/契約/回数券

- `products`
- `contracts`
- `ticket_usage`
- `follow_tasks`
- `sales_pipeline`
- `contract_templates`
- `contract_documents`
- `calendar_ticket_usage_candidates`

### 症例/動画/AI

- `case_records`
- `case_videos`
- `generated_contents`
- `ai_diagnoses`
- `ai_proposals`
- `ai_contract_candidates`
- `yatabe_method_knowledge`
- `staff_training_metrics`
- `quality_control_reviews`

### SaaS/認定/世界展開

- `saas_tenants`
- `saas_pricing_plans`
- `saas_api_clients`
- `saas_feature_requests`
- `method_certified_coaches`
- `method_certified_schools`
- `national_case_library`
- `ai_diagnosis_feedback`
- `referral_network_entries`
- `global_markets`
- `global_diagnosis_requests`
- `overseas_camps`
- `ai_translation_tasks`
- `overseas_reviews`
- `soccer_medical_records`
- `ai_prescriptions`
- `improvement_predictions`
- `case_research_findings`
- `soccer_university_courses`

## 機能分類

### 完成

- 既存LINE Webhook受信
- LINEメッセージ保存
- 未対応LINE一覧
- 顧客候補照合の土台
- Basic認証 + 閲覧トークン
- 契約書テンプレート/PDF生成の土台

### 実運用可能

- 未対応LINE確認
- AI要約/返信下書き確認
- 顧客マスタ確認
- 売上候補確認
- 契約/回数券/フォローの手動管理
- 今日の対応ダッシュボード

### 開発中

- Gmail取り込み
- Googleカレンダー取り込み
- AI人物カルテ自動生成
- 自然文検索
- 症例/動画/記事/SNS生成
- 認定制度
- SaaS/世界展開/サッカー病院

### 未着手

- LINE自動送信
- メール自動送信
- Stripe課金
- テナント別ログイン
- 外部公開APIキー
- 多言語UI完全対応
- 本格ベクトル検索
- 本格監査ログ

## 重複整理

### 統合対象

- `sales-meeting` と `today-sales` は最終的に `dashboard` と `revenue` へ統合する。
- `reviews` と `churn-risk` は `follow` へ統合する。
- `case-search` と `case-library` は `cases` へ統合する。
- `article-generator` と `sns-generator` は `cases` または `videos` へ統合する。
- `saas-*`、`method-*`、`global-*`、`soccer-hospital` 系は通常メニューから外し、OSマップ/設定配下へ置く。

## 技術負債

### 不要候補コード/API

- `/api/debug-env` は本番では閉じるか管理者限定にする。
- `lib/line.ts` のLINE push送信は現在の方針では未使用。送信フェーズまで封印扱い。
- 旧診断API群とAI秘書API群が並存しているため、責務の境界をREADMEに明記する必要あり。

### 不要候補テーブル

現時点で削除はしない。理由はPhaseごとの将来設計が含まれているため。削除候補は実データ投入後に判断する。

### 未使用/要確認環境変数

- `LINE_AUTO_REPLY_ENABLED` は必ず `false` 維持。
- `NEXT_PUBLIC_LIFF_ID`、`NEXT_PUBLIC_LINE_OA_ID` はLIFFを本格利用するまで要確認。
- `RESEND_API_KEY`、`MAIL_TO` は既存診断通知用途。AI秘書メール送信とは分離。
- `GMAIL_*`、`GOOGLE_*` 系は今後追加予定。現状は本格OAuth未実装。

## 権限整理

### 現在

- 管理画面: Basic認証
- AI秘書画面: `AI_SECRETARY_READ_TOKEN`
- DBアクセス: `SUPABASE_SERVICE_ROLE_KEY`

### 今後必要

- 谷田部本人ロール
- 事務補助ロール
- コーチロール
- テナント管理者ロール
- 閲覧専用ロール
- 監査ログ

## ロードマップ

1. PhaseX-1: メニューを12個へ整理する
2. PhaseX-2: 重複画面を統合先へ移す
3. PhaseX-3: Gmail/カレンダーを設定画面へ集約
4. PhaseX-4: LINE/顧客/売上/契約/回数券/フォローを日次運用に固定
5. PhaseX-5: AI診断/症例/動画/提案書を営業導線へ接続
6. PhaseX-6: SaaS/認定/世界展開は別セクションとして管理
