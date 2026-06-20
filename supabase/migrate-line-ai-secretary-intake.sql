-- LINE既存WebhookをAI秘書に接続するための最小保存テーブル
-- 既存 users テーブルは顧客候補として再利用し、LINE受信全文だけを追加保存する。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS line_accounts (
  account_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  service_area TEXT,
  webhook_url TEXT,
  line_basic_id TEXT,
  destination TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO line_accounts (account_key, display_name, service_area, webhook_url, notes)
VALUES
  ('soccer_private_lesson', 'サッカー家庭教師', '個人レッスン', 'https://soccer-diagnosis.vercel.app/api/line/webhook?account=soccer_private_lesson', '既存接続済み'),
  ('japan_kids_soccer_club', 'JAPANキッズサッカークラブ', 'キッズスクール', 'https://soccer-diagnosis.vercel.app/api/line/webhook?account=japan_kids_soccer_club', '接続予定'),
  ('sysc_team_broadcast', 'SYSCチーム一斉連絡', 'SYSC', 'https://soccer-diagnosis.vercel.app/api/line/webhook?account=sysc_team_broadcast', '接続予定。チーム内連絡用'),
  ('sysc_inquiry_news', 'SYSC問い合わせ＆最新情報', 'SYSC', 'https://soccer-diagnosis.vercel.app/api/line/webhook?account=sysc_inquiry_news', '接続予定。問い合わせ・告知用'),
  ('dribble_school', 'ドリブル塾', '足技塾/ドリブル塾', 'https://soccer-diagnosis.vercel.app/api/line/webhook?account=dribble_school', '接続予定')
ON CONFLICT (account_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  service_area = EXCLUDED.service_area,
  webhook_url = EXCLUDED.webhook_url,
  notes = EXCLUDED.notes,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  parent_name TEXT,
  child_name TEXT,
  email TEXT,
  phone TEXT,
  service_type TEXT NOT NULL DEFAULT 'unknown' CHECK (service_type IN ('private_lesson', 'ashiwaza_dribble', 'sysc', 'kids_school', 'overseas', 'unknown')),
  status TEXT NOT NULL DEFAULT 'new_inquiry' CHECK (status IN ('new_inquiry', 'trial_scheduling', 'trial_booked', 'trial_done', 'considering', 'enrolled', 'continuing', 'paused', 'withdrawn')),
  grade TEXT,
  region TEXT,
  team_name TEXT,
  inquiry_date DATE,
  trial_date DATE,
  enrolled_date DATE,
  withdrawn_date DATE,
  owner_name TEXT,
  next_reservation_at TIMESTAMPTZ,
  memo TEXT,
  source TEXT NOT NULL DEFAULT 'line',
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_ai_profiles (
  customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  overview TEXT,
  pain_points TEXT,
  inquiry_reason TEXT,
  contract_reason TEXT,
  continuation_reason TEXT,
  churn_reason TEXT,
  current_relationship TEXT,
  reproposal_score TEXT CHECK (reproposal_score IN ('high', 'medium', 'low', 'unknown')) DEFAULT 'unknown',
  review_request_score TEXT CHECK (review_request_score IN ('high', 'medium', 'low', 'unknown')) DEFAULT 'unknown',
  recommended_service TEXT,
  caution_notes TEXT,
  source_summary TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_line_accounts (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_key TEXT NOT NULL REFERENCES line_accounts(account_key),
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_key, line_user_id)
);

CREATE TABLE IF NOT EXISTS customer_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('inquiry', 'line_message', 'trial', 'enrollment', 'withdrawal', 'memo', 'gmail', 'calendar')),
  title TEXT NOT NULL,
  body TEXT,
  source TEXT NOT NULL DEFAULT 'line',
  source_table TEXT,
  source_id TEXT,
  account_key TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gmail_sync_sources (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  gmail_message_id TEXT UNIQUE,
  thread_id TEXT,
  from_email TEXT,
  to_email TEXT,
  subject TEXT,
  snippet TEXT,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'replied', 'ignored', 'handled')),
  needs_reply BOOLEAN DEFAULT TRUE,
  ai_summary TEXT,
  ai_reply_draft TEXT,
  occurred_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS calendar_sync_sources (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  calendar_event_id TEXT UNIQUE,
  title TEXT,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  event_type TEXT DEFAULT 'lesson' CHECK (event_type IN ('lesson', 'trial', 'meeting', 'other')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'unknown')),
  ticket_usage_candidate BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('private_lesson', 'ashiwaza_dribble', 'sysc', 'kids_school', 'overseas', 'unknown')),
  product_type TEXT NOT NULL CHECK (product_type IN ('ticket', 'monthly', 'diagnosis', 'intensive', 'other')),
  ticket_count INTEGER,
  validity_days INTEGER,
  price INTEGER,
  monthly_fee INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO products (product_key, name, service_type, product_type, ticket_count, validity_days, price, monthly_fee, notes)
VALUES
  ('private_4_ticket', '個人レッスン 4回券', 'private_lesson', 'ticket', 4, 45, NULL, NULL, '初回利用日から45日'),
  ('private_8_ticket', '個人レッスン 8回券', 'private_lesson', 'ticket', 8, 90, NULL, NULL, '初回利用日から90日'),
  ('private_intensive', '個人レッスン 短期集中', 'private_lesson', 'intensive', NULL, NULL, NULL, NULL, '短期集中プラン'),
  ('online_diagnosis', 'オンライン診断', 'private_lesson', 'diagnosis', NULL, NULL, NULL, NULL, 'オンライン診断'),
  ('kids_school_monthly', 'キッズスクール 月謝', 'kids_school', 'monthly', NULL, NULL, NULL, NULL, '在籍・退会・月謝管理'),
  ('ashiwaza_monthly', '足技塾 月謝', 'ashiwaza_dribble', 'monthly', NULL, NULL, NULL, NULL, '在籍・退会・月謝管理'),
  ('sysc_monthly', 'SYSC 月謝', 'sysc', 'monthly', NULL, NULL, NULL, NULL, '在籍・退会・月謝管理')
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  service_type = EXCLUDED.service_type,
  product_type = EXCLUDED.product_type,
  ticket_count = EXCLUDED.ticket_count,
  validity_days = EXCLUDED.validity_days,
  price = EXCLUDED.price,
  monthly_fee = EXCLUDED.monthly_fee,
  notes = EXCLUDED.notes,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  contract_type TEXT NOT NULL DEFAULT 'ticket' CHECK (contract_type IN ('ticket', 'monthly', 'diagnosis', 'intensive', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'cancelled', 'expired')),
  purchase_date DATE DEFAULT CURRENT_DATE,
  start_date DATE,
  first_usage_date DATE,
  valid_until DATE,
  end_date DATE,
  purchased_count INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  amount INTEGER,
  monthly_fee INTEGER,
  payment_status TEXT NOT NULL DEFAULT 'unknown' CHECK (payment_status IN ('unknown', 'unpaid', 'paid', 'refunded')),
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_usage (
  id BIGSERIAL PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_count INTEGER NOT NULL DEFAULT 1,
  lesson_title TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_tasks (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('remaining_1', 'remaining_2', 'expiry_30', 'expiry_14', 'expiry_7', 'unused_90', 'trial_follow', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'kids_school_candidate', 'private_lesson_reproposal', 'manual')),
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'dismissed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ai_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_pipeline (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('renewal', 'expiry_follow', 'unused_follow', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'kids_school_candidate', 'private_lesson_reproposal', 'monthly_retention', 'manual')),
  title TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'candidate' CHECK (stage IN ('candidate', 'proposed', 'negotiating', 'won', 'lost', 'deferred')),
  expected_amount INTEGER,
  expected_month DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ai_reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gmail_sync_sources
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'replied', 'ignored', 'handled')),
  ADD COLUMN IF NOT EXISTS needs_reply BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_reply_draft TEXT;

ALTER TABLE calendar_sync_sources
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'lesson' CHECK (event_type IN ('lesson', 'trial', 'meeting', 'other')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'unknown')),
  ADD COLUMN IF NOT EXISTS ticket_usage_candidate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS next_reservation_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_service_type ON customers(service_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact_at ON customers(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_line_accounts_customer_id ON customer_line_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_line_accounts_line_user ON customer_line_accounts(account_key, line_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer_at ON customer_timeline_events(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_customer ON gmail_sync_sources(customer_id);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_status ON gmail_sync_sources(status, needs_reply);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_customer ON calendar_sync_sources(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_starts_at ON calendar_sync_sources(starts_at);
CREATE INDEX IF NOT EXISTS idx_products_service_type ON products(service_type);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_valid_until ON contracts(valid_until);
CREATE INDEX IF NOT EXISTS idx_ticket_usage_contract_id ON ticket_usage(contract_id);
CREATE INDEX IF NOT EXISTS idx_ticket_usage_customer_date ON ticket_usage(customer_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_follow_tasks_due_status ON follow_tasks(status, due_date);
CREATE INDEX IF NOT EXISTS idx_follow_tasks_customer ON follow_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_customer ON sales_pipeline(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_month_stage ON sales_pipeline(expected_month, stage);

ALTER TABLE follow_tasks DROP CONSTRAINT IF EXISTS follow_tasks_task_type_check;
ALTER TABLE follow_tasks
  ADD CONSTRAINT follow_tasks_task_type_check
  CHECK (task_type IN ('remaining_1', 'remaining_2', 'expiry_30', 'expiry_14', 'expiry_7', 'unused_90', 'trial_follow', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'kids_school_candidate', 'private_lesson_reproposal', 'manual'));

ALTER TABLE sales_pipeline DROP CONSTRAINT IF EXISTS sales_pipeline_opportunity_type_check;
ALTER TABLE sales_pipeline
  ADD CONSTRAINT sales_pipeline_opportunity_type_check
  CHECK (opportunity_type IN ('renewal', 'expiry_follow', 'unused_follow', 'review_request', 'ashiwaza_candidate', 'sysc_candidate', 'kids_school_candidate', 'private_lesson_reproposal', 'monthly_retention', 'manual'));

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS next_reservation_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS line_messages (
  id BIGSERIAL PRIMARY KEY,
  account_key TEXT NOT NULL DEFAULT 'soccer_private_lesson',
  line_user_id TEXT,
  line_source_type TEXT,
  line_group_id TEXT,
  line_room_id TEXT,
  line_message_id TEXT,
  reply_token_present BOOLEAN DEFAULT FALSE,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  extracted_type TEXT,
  intent TEXT DEFAULT 'line_message',
  ai_summary TEXT,
  ai_reply_draft TEXT,
  manual_memo TEXT,
  service_category TEXT DEFAULT 'unknown',
  customer_status TEXT DEFAULT 'new_inquiry',
  customer_id UUID REFERENCES customers(id),
  matched_user_id UUID REFERENCES users(id),
  customer_candidates JSONB DEFAULT '[]'::jsonb,
  match_confidence TEXT,
  match_reasons TEXT[] DEFAULT '{}',
  line_reply_status INTEGER,
  line_reply_ok BOOLEAN,
  raw_event JSONB,
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'matched', 'ignored', 'handled')),
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_messages_account_key ON line_messages(account_key);
CREATE INDEX IF NOT EXISTS idx_line_messages_line_user_id ON line_messages(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_matched_user ON line_messages(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_status ON line_messages(status);
CREATE INDEX IF NOT EXISTS idx_line_messages_occurred_at ON line_messages(occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_messages_unique_message
  ON line_messages(account_key, line_message_id)
  WHERE line_message_id IS NOT NULL;

ALTER TABLE line_messages
  ADD COLUMN IF NOT EXISTS customer_candidates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS match_confidence TEXT,
  ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_memo TEXT,
  ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS customer_status TEXT DEFAULT 'new_inquiry',
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

ALTER TABLE gmail_sync_sources
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'replied', 'ignored', 'handled')),
  ADD COLUMN IF NOT EXISTS needs_reply BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_reply_draft TEXT;

ALTER TABLE calendar_sync_sources
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'lesson' CHECK (event_type IN ('lesson', 'trial', 'meeting', 'other')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'unknown')),
  ADD COLUMN IF NOT EXISTS ticket_usage_candidate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_line_messages_customer_id ON line_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_service_category ON line_messages(service_category);
CREATE INDEX IF NOT EXISTS idx_line_messages_customer_status ON line_messages(customer_status);

ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_line_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ai_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access line_messages" ON line_messages;
CREATE POLICY "Service role full access line_messages"
  ON line_messages FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access line_accounts" ON line_accounts;
CREATE POLICY "Service role full access line_accounts"
  ON line_accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access customers" ON customers;
CREATE POLICY "Service role full access customers"
  ON customers FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access customer_line_accounts" ON customer_line_accounts;
CREATE POLICY "Service role full access customer_line_accounts"
  ON customer_line_accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access customer_timeline_events" ON customer_timeline_events;
CREATE POLICY "Service role full access customer_timeline_events"
  ON customer_timeline_events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access gmail_sync_sources" ON gmail_sync_sources;
CREATE POLICY "Service role full access gmail_sync_sources"
  ON gmail_sync_sources FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access calendar_sync_sources" ON calendar_sync_sources;
CREATE POLICY "Service role full access calendar_sync_sources"
  ON calendar_sync_sources FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access products" ON products;
CREATE POLICY "Service role full access products"
  ON products FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access contracts" ON contracts;
CREATE POLICY "Service role full access contracts"
  ON contracts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access ticket_usage" ON ticket_usage;
CREATE POLICY "Service role full access ticket_usage"
  ON ticket_usage FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access follow_tasks" ON follow_tasks;
CREATE POLICY "Service role full access follow_tasks"
  ON follow_tasks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access sales_pipeline" ON sales_pipeline;
CREATE POLICY "Service role full access sales_pipeline"
  ON sales_pipeline FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access customer_ai_profiles" ON customer_ai_profiles;
CREATE POLICY "Service role full access customer_ai_profiles"
  ON customer_ai_profiles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 既存LINE履歴を顧客マスタへ復元する。
-- 同じ公式アカウント内の同じLINEユーザーIDを1顧客候補として扱い、
-- 以後の受信メッセージはアプリ側で同じ顧客へ紐づける。
WITH grouped_line_customers AS (
  SELECT
    gen_random_uuid() AS customer_id,
    lm.account_key,
    lm.line_user_id,
    MIN(lm.occurred_at) AS first_contact_at,
    MAX(lm.occurred_at) AS last_contact_at,
    MIN(lm.occurred_at)::DATE AS inquiry_date,
    CASE
      WHEN lm.account_key = 'soccer_private_lesson' THEN 'private_lesson'
      WHEN lm.account_key = 'japan_kids_soccer_club' THEN 'kids_school'
      WHEN lm.account_key IN ('sysc_team_broadcast', 'sysc_inquiry_news') THEN 'sysc'
      WHEN lm.account_key = 'dribble_school' THEN 'ashiwaza_dribble'
      ELSE COALESCE(NULLIF((ARRAY_AGG(lm.service_category ORDER BY lm.occurred_at DESC))[1], 'unknown'), 'unknown')
    END AS service_type,
    COALESCE((ARRAY_AGG(lm.customer_status ORDER BY lm.occurred_at DESC))[1], 'new_inquiry') AS status,
    LEFT(COALESCE((ARRAY_AGG(lm.body ORDER BY lm.occurred_at ASC))[1], ''), 180) AS first_body
  FROM line_messages lm
  WHERE lm.line_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM customer_line_accounts cla
      WHERE cla.account_key = lm.account_key
        AND cla.line_user_id = lm.line_user_id
    )
  GROUP BY lm.account_key, lm.line_user_id
),
inserted_customers AS (
  INSERT INTO customers (
    id,
    service_type,
    status,
    inquiry_date,
    source,
    first_contact_at,
    last_contact_at,
    memo
  )
  SELECT
    customer_id,
    service_type,
    status,
    inquiry_date,
    'line',
    first_contact_at,
    last_contact_at,
    CASE
      WHEN first_body = '' THEN '既存LINE履歴から自動復元'
      ELSE '既存LINE履歴から自動復元。初回内容: ' || first_body
    END
  FROM grouped_line_customers
  RETURNING id
),
inserted_line_accounts AS (
  INSERT INTO customer_line_accounts (
    customer_id,
    account_key,
    line_user_id,
    first_seen_at,
    last_seen_at
  )
  SELECT
    glc.customer_id,
    glc.account_key,
    glc.line_user_id,
    glc.first_contact_at,
    glc.last_contact_at
  FROM grouped_line_customers glc
  JOIN inserted_customers ic ON ic.id = glc.customer_id
  ON CONFLICT (account_key, line_user_id) DO NOTHING
  RETURNING customer_id, account_key, line_user_id
)
UPDATE line_messages lm
SET customer_id = cla.customer_id
FROM customer_line_accounts cla
WHERE lm.customer_id IS NULL
  AND lm.account_key = cla.account_key
  AND lm.line_user_id = cla.line_user_id;

INSERT INTO customer_timeline_events (
  customer_id,
  event_type,
  title,
  body,
  source,
  source_table,
  source_id,
  account_key,
  occurred_at
)
SELECT
  lm.customer_id,
  'line_message',
  'LINE受信: ' || COALESCE(la.display_name, lm.account_key),
  lm.body,
  'line',
  'line_messages',
  lm.id::TEXT,
  lm.account_key,
  lm.occurred_at
FROM line_messages lm
LEFT JOIN line_accounts la ON la.account_key = lm.account_key
WHERE lm.customer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM customer_timeline_events cte
    WHERE cte.source_table = 'line_messages'
      AND cte.source_id = lm.id::TEXT
  );

-- 管理画面やAI秘書が未対応LINEを読みやすいようにするビュー。
DROP VIEW IF EXISTS ai_secretary_line_inbox;

CREATE OR REPLACE VIEW ai_secretary_line_inbox AS
SELECT
  lm.id,
  lm.account_key,
  lm.line_user_id,
  lm.direction,
  lm.body,
  lm.extracted_type,
  lm.intent,
  lm.ai_summary,
  lm.ai_reply_draft,
  lm.manual_memo,
  lm.service_category,
  lm.customer_status,
  lm.customer_id,
  lm.customer_candidates,
  lm.match_confidence,
  lm.match_reasons,
  lm.status,
  lm.occurred_at,
  lm.created_at,
  la.display_name AS account_display_name,
  la.service_area AS account_service_area,
  c.full_name AS customer_full_name,
  c.parent_name AS customer_parent_name,
  c.child_name AS customer_child_name,
  c.grade AS customer_grade,
  c.region AS customer_region,
  c.team_name AS customer_team_name,
  c.status AS customer_master_status,
  c.service_type AS customer_service_type,
  c.owner_name AS customer_owner_name,
  c.memo AS customer_memo,
  u.id AS user_id,
  u.name,
  u.email,
  u.prefecture,
  u.type_name,
  u.lane,
  u.tags,
  u.conversion_status,
  u.staff_required,
  u.selection_priority
FROM line_messages lm
LEFT JOIN line_accounts la ON la.account_key = lm.account_key
LEFT JOIN customers c ON c.id = lm.customer_id
LEFT JOIN users u ON u.id = lm.matched_user_id;

DROP VIEW IF EXISTS ai_secretary_customers;

CREATE OR REPLACE VIEW ai_secretary_customers AS
SELECT
  c.*,
  COUNT(lm.id) AS line_message_count,
  MAX(lm.occurred_at) AS latest_line_at,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT la.display_name), NULL) AS line_account_names
FROM customers c
LEFT JOIN line_messages lm ON lm.customer_id = c.id
LEFT JOIN line_accounts la ON la.account_key = lm.account_key
GROUP BY c.id;

DROP VIEW IF EXISTS ai_secretary_sales_candidates;

DROP VIEW IF EXISTS ai_secretary_contracts;

CREATE OR REPLACE VIEW ai_secretary_contracts AS
WITH usage_totals AS (
  SELECT
    contract_id,
    SUM(used_count)::INTEGER AS usage_used_count,
    MAX(usage_date) AS last_usage_date
  FROM ticket_usage
  GROUP BY contract_id
)
SELECT
  ct.*,
  p.product_key,
  p.name AS product_name,
  p.service_type AS product_service_type,
  p.product_type,
  p.ticket_count AS product_ticket_count,
  p.validity_days AS product_validity_days,
  COALESCE(ct.purchased_count, p.ticket_count, 0) AS total_ticket_count,
  COALESCE(ct.used_count, 0) + COALESCE(ut.usage_used_count, 0) AS total_used_count,
  GREATEST(COALESCE(ct.purchased_count, p.ticket_count, 0) - (COALESCE(ct.used_count, 0) + COALESCE(ut.usage_used_count, 0)), 0) AS remaining_count,
  COALESCE(
    ct.valid_until,
    CASE
      WHEN p.validity_days IS NOT NULL AND ct.first_usage_date IS NOT NULL THEN ct.first_usage_date + p.validity_days
      WHEN p.validity_days IS NOT NULL AND ct.start_date IS NOT NULL THEN ct.start_date + p.validity_days
      ELSE NULL
    END
  ) AS effective_valid_until,
  COALESCE(ut.last_usage_date, ct.first_usage_date) AS last_usage_date
FROM contracts ct
LEFT JOIN products p ON p.id = ct.product_id
LEFT JOIN usage_totals ut ON ut.contract_id = ct.id;

CREATE OR REPLACE VIEW ai_secretary_sales_candidates AS
WITH contract_base AS (
  SELECT
    c.id AS customer_id,
    c.full_name,
    c.parent_name,
    c.child_name,
    c.service_type AS customer_service_type,
    c.status AS customer_status,
    c.last_contact_at,
    ac.id AS contract_id,
    ac.product_name,
    ac.product_type,
    ac.status AS contract_status,
    ac.remaining_count,
    ac.effective_valid_until,
    ac.last_usage_date,
    ac.amount,
    ac.monthly_fee
  FROM customers c
  LEFT JOIN ai_secretary_contracts ac ON ac.customer_id = c.id
),
contract_candidates AS (
  SELECT
    customer_id,
    full_name,
    parent_name,
    child_name,
    customer_service_type,
    customer_status,
    contract_id,
    CASE
      WHEN remaining_count = 1 THEN 'remaining_1'
      WHEN remaining_count = 2 THEN 'remaining_2'
      WHEN effective_valid_until IS NOT NULL AND effective_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'expiry_7'
      WHEN effective_valid_until IS NOT NULL AND effective_valid_until BETWEEN CURRENT_DATE + 8 AND CURRENT_DATE + 14 THEN 'expiry_14'
      WHEN effective_valid_until IS NOT NULL AND effective_valid_until BETWEEN CURRENT_DATE + 15 AND CURRENT_DATE + 30 THEN 'expiry_30'
      WHEN COALESCE(last_usage_date, last_contact_at::DATE) <= CURRENT_DATE - 90 THEN 'unused_90'
      ELSE NULL
    END AS candidate_type,
    product_name,
    remaining_count,
    effective_valid_until,
    COALESCE(amount, monthly_fee) AS expected_amount,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS expected_month,
    CASE
      WHEN remaining_count IN (1, 2) THEN 'high'
      WHEN effective_valid_until IS NOT NULL AND effective_valid_until <= CURRENT_DATE + 14 THEN 'high'
      ELSE 'medium'
    END AS priority,
    CASE
      WHEN remaining_count = 1 THEN '残り1回。継続提案の優先度が高いです。'
      WHEN remaining_count = 2 THEN '残り2回。次回提案の準備対象です。'
      WHEN effective_valid_until IS NOT NULL AND effective_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + 30 THEN '有効期限が30日以内です。期限前フォロー対象です。'
      WHEN COALESCE(last_usage_date, last_contact_at::DATE) <= CURRENT_DATE - 90 THEN '90日以上利用または連絡が空いています。掘り起こし対象です。'
      ELSE NULL
    END AS ai_reason
  FROM contract_base
  WHERE contract_status IN ('active', 'paused')
),
relationship_candidates AS (
  SELECT
    c.id AS customer_id,
    c.full_name,
    c.parent_name,
    c.child_name,
    c.service_type AS customer_service_type,
    c.status AS customer_status,
    NULL::UUID AS contract_id,
    candidates.candidate_type,
    NULL::TEXT AS product_name,
    NULL::INTEGER AS remaining_count,
    NULL::DATE AS effective_valid_until,
    NULL::INTEGER AS expected_amount,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS expected_month,
    CASE
      WHEN candidates.candidate_type IN ('review_request', 'ashiwaza_candidate', 'sysc_candidate') THEN 'medium'
      ELSE 'low'
    END AS priority,
    candidates.ai_reason
  FROM customers c
  CROSS JOIN LATERAL (
    VALUES
      ('review_request', '関係性が継続中のため、レビュー依頼候補です。', c.status IN ('continuing', 'enrolled')),
      ('ashiwaza_candidate', '個人レッスン利用者のため、足技塾への誘導候補です。', c.service_type = 'private_lesson'),
      ('sysc_candidate', '育成サービス利用者のため、SYSC提案候補です。', c.service_type IN ('kids_school', 'ashiwaza_dribble', 'private_lesson')),
      ('kids_school_candidate', '低学年・初回問い合わせ層のため、キッズスクール提案候補です。', c.service_type IN ('unknown', 'private_lesson') AND c.status IN ('new_inquiry', 'trial_scheduling', 'considering')),
      ('private_lesson_reproposal', '休会・退会・検討中のため、個人レッスン再提案候補です。', c.status IN ('withdrawn', 'paused', 'considering'))
  ) AS candidates(candidate_type, ai_reason, is_target)
  WHERE candidates.is_target
)
SELECT *
FROM contract_candidates
WHERE candidate_type IS NOT NULL
UNION ALL
SELECT *
FROM relationship_candidates
WHERE candidate_type IS NOT NULL;

-- Phase6: 契約書テンプレート・PDF生成・送付準備管理
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('yatabe_private_lesson', 'staff_private_lesson', 'kids_school', 'ashiwaza_dribble', 'sysc', 'online_diagnosis', 'overseas', 'common', 'unknown')),
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'terms', 'consent', 'privacy', 'photo_video', 'other')),
  body TEXT,
  required_fields TEXT[] DEFAULT '{}',
  cloudsign_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO contract_templates (template_key, name, service_type, document_type, body, required_fields, notes)
VALUES
  ('yatabe_private_lesson_contract', '谷田部個人レッスン契約書', 'yatabe_private_lesson', 'contract', '個人レッスンの内容、料金、回数券、有効期限、キャンセル規定を確認します。', ARRAY['parent_name','child_name','address','phone','email','start_date','amount','payment_method'], 'LightプランではPDF生成・送付準備まで'),
  ('staff_private_lesson_contract', 'スタッフ個人レッスン契約書', 'staff_private_lesson', 'contract', 'スタッフ担当レッスンの提供条件、担当者、料金、回数券、有効期限を確認します。', ARRAY['parent_name','child_name','address','phone','email','owner_name','start_date','amount','payment_method'], '担当スタッフ確認が必要'),
  ('kids_school_terms', 'キッズスクール利用規約', 'kids_school', 'terms', 'キッズスクールの在籍、月謝、休会、退会、参加ルールを確認します。', ARRAY['parent_name','child_name','address','phone','email','start_date','monthly_fee','payment_method'], '月謝管理用'),
  ('ashiwaza_terms', '足技塾利用規約', 'ashiwaza_dribble', 'terms', '足技塾・ドリブル塾の通い放題、イベント、試合参加条件を確認します。', ARRAY['parent_name','child_name','address','phone','email','start_date','monthly_fee','payment_method'], '足技塾向け'),
  ('sysc_membership_contract', 'SYSC入会契約書', 'sysc', 'contract', 'SYSCのチーム活動、練習、試合、スカウト会、セレクションに関する入会条件を確認します。', ARRAY['parent_name','child_name','address','phone','email','start_date','monthly_fee','payment_method'], 'チーム活動向け'),
  ('online_diagnosis_consent', 'オンライン診断同意書', 'online_diagnosis', 'consent', 'オンライン診断の実施内容、提出動画、診断結果の扱いを確認します。', ARRAY['parent_name','child_name','email','start_date','amount','payment_method'], 'オンライン完結'),
  ('overseas_contract', '海外向け契約書', 'overseas', 'contract', '海外在住者・来日者向けサービスの提供範囲、時差、支払、キャンセル条件を確認します。', ARRAY['parent_name','child_name','email','start_date','amount','payment_method'], '英語版は将来追加'),
  ('photo_video_consent', '写真動画利用同意書', 'common', 'photo_video', '写真・動画の撮影、SNS・サイト掲載、広告利用可否を確認します。', ARRAY['parent_name','child_name','email'], '全サービス共通'),
  ('privacy_consent', '個人情報同意書', 'common', 'privacy', '問い合わせ、契約、レッスン、連絡に必要な個人情報の取り扱いを確認します。', ARRAY['parent_name','child_name','email'], '全サービス共通')
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  service_type = EXCLUDED.service_type,
  document_type = EXCLUDED.document_type,
  body = EXCLUDED.body,
  required_fields = EXCLUDED.required_fields,
  notes = EXCLUDED.notes,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'created', 'ready_to_send', 'sent', 'checking', 'waiting_signature', 'signed', 'cancelled', 'expired')),
  file_name TEXT,
  content_type TEXT DEFAULT 'application/pdf',
  pdf_base64 TEXT,
  field_snapshot JSONB DEFAULT '{}'::jsonb,
  ai_suggestion TEXT,
  cloudsign_document_id TEXT,
  cloudsign_status TEXT,
  ready_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_service ON contract_templates(service_type, is_active);
CREATE INDEX IF NOT EXISTS idx_contract_documents_customer ON contract_documents(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_documents_status ON contract_documents(status, created_at DESC);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access contract_templates" ON contract_templates;
CREATE POLICY "Service role full access contract_templates"
  ON contract_templates FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access contract_documents" ON contract_documents;
CREATE POLICY "Service role full access contract_documents"
  ON contract_documents FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS ai_secretary_contract_documents;
CREATE OR REPLACE VIEW ai_secretary_contract_documents AS
SELECT
  cd.*,
  ct.template_key,
  ct.name AS template_name,
  ct.document_type,
  c.full_name,
  c.parent_name,
  c.child_name,
  c.email,
  c.phone
FROM contract_documents cd
LEFT JOIN contract_templates ct ON ct.id = cd.template_id
LEFT JOIN customers c ON c.id = cd.customer_id;

-- Phase7: Gmail/Googleカレンダー統合・回数券消化候補
CREATE TABLE IF NOT EXISTS calendar_ticket_usage_candidates (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  calendar_source_id BIGINT REFERENCES calendar_sync_sources(id) ON DELETE CASCADE,
  candidate_date DATE NOT NULL,
  lesson_title TEXT,
  suggested_used_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  ai_reason TEXT,
  confirmed_usage_id BIGINT REFERENCES ticket_usage(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_source_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_ticket_usage_candidates_status ON calendar_ticket_usage_candidates(status, candidate_date DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_ticket_usage_candidates_customer ON calendar_ticket_usage_candidates(customer_id, candidate_date DESC);

ALTER TABLE calendar_ticket_usage_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access calendar_ticket_usage_candidates" ON calendar_ticket_usage_candidates;
CREATE POLICY "Service role full access calendar_ticket_usage_candidates"
  ON calendar_ticket_usage_candidates FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS ai_secretary_calendar_usage_candidates;
CREATE OR REPLACE VIEW ai_secretary_calendar_usage_candidates AS
SELECT
  ctu.*,
  c.full_name,
  c.parent_name,
  c.child_name,
  c.service_type,
  ac.product_name,
  ac.remaining_count,
  ac.effective_valid_until,
  cs.title AS calendar_title,
  cs.starts_at,
  cs.ai_summary AS calendar_summary
FROM calendar_ticket_usage_candidates ctu
LEFT JOIN customers c ON c.id = ctu.customer_id
LEFT JOIN ai_secretary_contracts ac ON ac.id = ctu.contract_id
LEFT JOIN calendar_sync_sources cs ON cs.id = ctu.calendar_source_id;

-- Phase9: 症例カルテ・動画・記事/SNS生成支援
CREATE TABLE IF NOT EXISTS case_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code TEXT UNIQUE DEFAULT ('CASE-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  age INTEGER,
  grade TEXT,
  position TEXT,
  problem TEXT,
  cause TEXT,
  improvement TEXT,
  result TEXT,
  parent_feedback TEXT,
  publish_status TEXT NOT NULL DEFAULT 'private' CHECK (publish_status IN ('private', 'permission_needed', 'public_allowed', 'published')),
  country TEXT,
  region TEXT,
  tags TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_code TEXT UNIQUE DEFAULT ('VID-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  case_id UUID REFERENCES case_records(id) ON DELETE SET NULL,
  filmed_at DATE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'lesson' CHECK (category IN ('lesson', 'case', 'short', 'youtube', 'sns', 'interview', 'other')),
  publish_status TEXT NOT NULL DEFAULT 'private' CHECK (publish_status IN ('private', 'permission_needed', 'scheduled', 'published', 'unlisted')),
  youtube_url TEXT,
  short_url TEXT,
  description TEXT,
  thumbnail_idea TEXT,
  sns_caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('case', 'video', 'customer', 'manual')),
  source_id TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_draft', 'case_article', 'seo_article', 'video_description', 'youtube_title', 'thumbnail_idea', 'sns_post')),
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_records_customer ON case_records(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_records_publish ON case_records(publish_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_videos_case ON case_videos(case_id, filmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_videos_customer ON case_videos(customer_id, filmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_contents_source ON generated_contents(source_type, source_id, created_at DESC);

ALTER TABLE case_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access case_records" ON case_records;
CREATE POLICY "Service role full access case_records"
  ON case_records FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access case_videos" ON case_videos;
CREATE POLICY "Service role full access case_videos"
  ON case_videos FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access generated_contents" ON generated_contents;
CREATE POLICY "Service role full access generated_contents"
  ON generated_contents FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS ai_secretary_case_assets;
CREATE OR REPLACE VIEW ai_secretary_case_assets AS
SELECT
  cr.*,
  c.full_name,
  c.parent_name,
  c.child_name,
  c.service_type,
  COUNT(cv.id) AS video_count,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT cv.youtube_url), NULL) AS youtube_urls
FROM case_records cr
LEFT JOIN customers c ON c.id = cr.customer_id
LEFT JOIN case_videos cv ON cv.case_id = cr.id
GROUP BY cr.id, c.full_name, c.parent_name, c.child_name, c.service_type;

-- Phase10: AI診断センター・提案書・契約候補生成
CREATE TABLE IF NOT EXISTS ai_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('line', 'gmail', 'form', 'video', 'parent_consultation', 'manual')),
  source_id TEXT,
  source_text TEXT NOT NULL,
  concern_type TEXT,
  cause_candidates TEXT[] DEFAULT '{}',
  improvement_priorities TEXT[] DEFAULT '{}',
  similar_case_ids UUID[] DEFAULT '{}',
  related_video_ids UUID[] DEFAULT '{}',
  related_article_ids UUID[] DEFAULT '{}',
  recommended_service TEXT,
  recommended_plan TEXT,
  next_step TEXT,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'proposed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID REFERENCES ai_diagnoses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  title TEXT,
  current_issue TEXT,
  inferred_causes TEXT,
  improvement_plan TEXT,
  similar_cases TEXT,
  recommended_service TEXT,
  recommended_plan TEXT,
  price_note TEXT,
  next_steps TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'sent_ready', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_contract_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID REFERENCES ai_diagnoses(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES ai_proposals(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  service_type TEXT,
  product_name TEXT,
  plan_name TEXT,
  estimated_amount INTEGER,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  ai_reason TEXT,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'reviewed', 'converted', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_customer ON ai_diagnoses(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_source ON ai_diagnoses(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_customer ON ai_proposals(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_contract_candidates_customer ON ai_contract_candidates(customer_id, created_at DESC);

ALTER TABLE ai_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contract_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access ai_diagnoses" ON ai_diagnoses;
CREATE POLICY "Service role full access ai_diagnoses"
  ON ai_diagnoses FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access ai_proposals" ON ai_proposals;
CREATE POLICY "Service role full access ai_proposals"
  ON ai_proposals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access ai_contract_candidates" ON ai_contract_candidates;
CREATE POLICY "Service role full access ai_contract_candidates"
  ON ai_contract_candidates FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS ai_secretary_diagnosis_center;
CREATE OR REPLACE VIEW ai_secretary_diagnosis_center AS
SELECT
  d.*,
  c.full_name,
  c.parent_name,
  c.child_name,
  c.service_type AS customer_service_type,
  c.status AS customer_status,
  p.id AS proposal_id,
  p.title AS proposal_title,
  p.status AS proposal_status,
  cc.id AS contract_candidate_id,
  cc.product_name AS contract_product_name,
  cc.estimated_amount,
  cc.confidence AS contract_confidence
FROM ai_diagnoses d
LEFT JOIN customers c ON c.id = d.customer_id
LEFT JOIN ai_proposals p ON p.diagnosis_id = d.id
LEFT JOIN ai_contract_candidates cc ON cc.diagnosis_id = d.id;

-- Phase13: 谷田部メソッド知識DB・AIコーチ支援・スタッフ教育・品質管理
CREATE TABLE IF NOT EXISTS yatabe_method_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('dribble', 'shoot', 'game_involvement', 'mental', 'selection', 'parent_support', 'lesson_quality', 'other')),
  title TEXT NOT NULL,
  problem_pattern TEXT,
  cause_pattern TEXT,
  coaching_points TEXT,
  parent_explanation TEXT,
  staff_checklist TEXT[] DEFAULT '{}',
  related_tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO yatabe_method_knowledge (category, title, problem_pattern, cause_pattern, coaching_points, parent_explanation, staff_checklist, related_tags)
VALUES
  ('dribble', 'ドリブルで抜けない選手の初期診断', '相手を抜けない、ボールを失う、1対1で止まる', '相手との距離、身体の向き、仕掛けるタイミングが整理できていない', 'まず成功しやすい距離を作り、身体の向きとファーストタッチを修正。試合で使う判断条件までセットで教える。', '技術不足だけでなく、いつ仕掛けるかが分かると変化が出やすいです。', ARRAY['相手との距離を確認', '身体の向きを確認', '成功体験を作る', '試合で使う場面を説明'], ARRAY['ドリブル','抜けない','1対1']),
  ('shoot', 'シュート・キック力改善', 'シュートが弱い、打てない、決定力がない', '軸足、踏み込み、ボールへの入り方、上半身の使い方に課題', '止まったボールから動いたボールへ段階化し、フォームより先に入る角度とタイミングを見る。', '力任せではなく、身体の使い方と入り方で強さが変わります。', ARRAY['軸足', '踏み込み', '上半身', '動いたボールで再現'], ARRAY['シュート','キック','決定力']),
  ('game_involvement', '試合で消える選手の関与改善', '試合で消える、ボールに関われない、活躍できない', '立ち位置、受ける前の準備、判断の優先順位が曖昧', 'ボールを受ける前に見るものを決め、関わる位置とタイミングを整理する。', '試合で消える場合は技術より前に、どこに立つか・何を見るかが重要です。', ARRAY['立ち位置', '首振り', '受ける前の準備', '判断の優先順位'], ARRAY['試合','消える','関われない']),
  ('mental', '自信がない選手への成功体験設計', '自信がない、消極的、チャレンジしない', '失敗経験が多く、成功する条件が本人の中で整理されていない', '難易度を落として成功条件を言語化し、成功を本人が再現できる形にする。', '自信は気合いではなく、できた理由が分かることで積み上がります。', ARRAY['成功条件を小さくする', 'できた理由を言語化', '否定より再現性', '保護者にも変化を共有'], ARRAY['自信','メンタル','消極的']),
  ('parent_support', '保護者相談の基本姿勢', '焦り、不安、進路、セレクション、継続判断', '情報不足と比較により判断軸がぶれている', 'まず不安を整理し、現在地、優先順位、次の一手を短く提示する。', '今すぐ全部を解決するより、次に何を見るかを決めると動きやすくなります。', ARRAY['不安を否定しない', '現在地を整理', '次の一手を提示', '契約判断を急がせない'], ARRAY['保護者','相談','不安'])
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS staff_training_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  case_id UUID REFERENCES case_records(id) ON DELETE SET NULL,
  lesson_count INTEGER DEFAULT 0,
  success_score INTEGER,
  continuation_status TEXT,
  review_status TEXT,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_control_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('line', 'gmail', 'proposal', 'lesson_note', 'manual')),
  source_id TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_name TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('insufficient_explanation', 'insufficient_proposal', 'missed_followup', 'tone_risk', 'missing_method', 'other')),
  issue_summary TEXT,
  yatabe_method_suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'fixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yatabe_method_category ON yatabe_method_knowledge(category, status);
CREATE INDEX IF NOT EXISTS idx_staff_training_staff ON staff_training_metrics(staff_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_control_status ON quality_control_reviews(status, created_at DESC);

ALTER TABLE yatabe_method_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access yatabe_method_knowledge" ON yatabe_method_knowledge;
CREATE POLICY "Service role full access yatabe_method_knowledge"
  ON yatabe_method_knowledge FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access staff_training_metrics" ON staff_training_metrics;
CREATE POLICY "Service role full access staff_training_metrics"
  ON staff_training_metrics FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access quality_control_reviews" ON quality_control_reviews;
CREATE POLICY "Service role full access quality_control_reviews"
  ON quality_control_reviews FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS ai_coach_lesson_support;
CREATE OR REPLACE VIEW ai_coach_lesson_support AS
SELECT
  c.id AS customer_id,
  c.full_name,
  c.parent_name,
  c.child_name,
  c.grade,
  c.team_name,
  c.service_type,
  c.status,
  c.owner_name,
  c.next_reservation_at,
  c.memo,
  p.overview AS ai_profile_overview,
  p.pain_points,
  p.caution_notes,
  p.recommended_service,
  COUNT(DISTINCT cr.id) AS case_count,
  COUNT(DISTINCT d.id) AS diagnosis_count,
  MAX(d.concern_type) AS latest_concern,
  MAX(d.next_step) AS latest_next_step
FROM customers c
LEFT JOIN customer_ai_profiles p ON p.customer_id = c.id
LEFT JOIN case_records cr ON cr.customer_id = c.id
LEFT JOIN ai_diagnoses d ON d.customer_id = c.id
GROUP BY c.id, p.overview, p.pain_points, p.caution_notes, p.recommended_service;

DROP VIEW IF EXISTS staff_training_summary;
CREATE OR REPLACE VIEW staff_training_summary AS
SELECT
  COALESCE(NULLIF(c.owner_name, ''), stm.staff_name, '未設定') AS staff_name,
  COUNT(DISTINCT c.id) AS assigned_customers,
  COUNT(DISTINCT cr.id) AS assigned_cases,
  COUNT(DISTINCT CASE WHEN c.status IN ('continuing', 'enrolled') THEN c.id END) AS continuing_customers,
  COUNT(DISTINCT CASE WHEN sp.candidate_type = 'review_request' THEN sp.customer_id END) AS review_candidates,
  COUNT(DISTINCT stm.id) AS training_records,
  AVG(stm.success_score) AS avg_success_score
FROM customers c
FULL OUTER JOIN staff_training_metrics stm ON stm.customer_id = c.id
LEFT JOIN case_records cr ON cr.customer_id = c.id
LEFT JOIN ai_secretary_sales_candidates sp ON sp.customer_id = c.id
GROUP BY COALESCE(NULLIF(c.owner_name, ''), stm.staff_name, '未設定');

-- Phase14: 谷田部メソッドOS / SaaS マルチテナント基盤
CREATE TABLE IF NOT EXISTS saas_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tenant_type TEXT NOT NULL DEFAULT 'school' CHECK (tenant_type IN ('individual_coach', 'school', 'club', 'academy', 'overseas_school', 'enterprise')),
  country TEXT DEFAULT 'Japan',
  language TEXT DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'zh', 'ko', 'th')),
  plan_key TEXT DEFAULT 'founder',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'paused', 'cancelled')),
  owner_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO saas_tenants (tenant_key, name, tenant_type, country, language, plan_key, status, owner_email, notes)
VALUES ('yatabe-method', '谷田部メソッド', 'academy', 'Japan', 'ja', 'founder', 'active', 'ssyatabe0@gmail.com', '既存運用データのデフォルトテナント')
ON CONFLICT (tenant_key) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();

CREATE TABLE IF NOT EXISTS saas_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  target_user TEXT,
  monthly_price_jpy INTEGER,
  included_coaches INTEGER,
  included_customers INTEGER,
  included_ai_diagnoses INTEGER,
  features TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO saas_pricing_plans (plan_key, name, target_user, monthly_price_jpy, included_coaches, included_customers, included_ai_diagnoses, features)
VALUES
  ('light', 'ライト', '個人コーチ', 9800, 1, 100, 50, ARRAY['AI秘書','顧客管理','AI診断','症例検索']),
  ('standard', 'スタンダード', '小規模スクール', 29800, 3, 500, 300, ARRAY['AI秘書','顧客管理','契約管理','回数券管理','AI提案書','保護者相談']),
  ('pro', 'プロ', '複数コーチ運用', 59800, 10, 2000, 1000, ARRAY['AI診断センター','症例ライブラリ','スタッフ教育','品質管理','売上管理']),
  ('school', 'スクール', 'サッカースクール', 98000, 30, 5000, 3000, ARRAY['マルチ拠点','スタッフ管理','API連携','多言語']),
  ('club', 'クラブ', 'クラブチーム/アカデミー', 198000, 80, 15000, 10000, ARRAY['クラブ運用','品質管理','選手カルテ','提案書','API']),
  ('enterprise', 'エンタープライズ', '海外/大規模展開', NULL, NULL, NULL, NULL, ARRAY['専用環境','SLA','SSO','カスタムAI','多言語'])
ON CONFLICT (plan_key) DO UPDATE SET name = EXCLUDED.name, monthly_price_jpy = EXCLUDED.monthly_price_jpy;

CREATE TABLE IF NOT EXISTS saas_api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  allowed_scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'revoked')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  feature_area TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'building', 'released', 'deferred')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE line_messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE gmail_sync_sources ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE case_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE case_videos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE ai_diagnoses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE ai_proposals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE yatabe_method_knowledge ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE yatabe_method_knowledge ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'tenant' CHECK (visibility IN ('tenant', 'shared_library', 'marketplace'));

UPDATE customers SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE line_messages SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE gmail_sync_sources SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE contracts SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE case_records SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE case_videos SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE ai_diagnoses SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE ai_proposals SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE yatabe_method_knowledge SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_messages_tenant ON line_messages(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_records_tenant ON case_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_diagnoses_tenant ON ai_diagnoses(tenant_id, created_at DESC);

ALTER TABLE saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_feature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access saas_tenants" ON saas_tenants;
CREATE POLICY "Service role full access saas_tenants" ON saas_tenants FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access saas_pricing_plans" ON saas_pricing_plans;
CREATE POLICY "Service role full access saas_pricing_plans" ON saas_pricing_plans FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access saas_api_clients" ON saas_api_clients;
CREATE POLICY "Service role full access saas_api_clients" ON saas_api_clients FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access saas_feature_requests" ON saas_feature_requests;
CREATE POLICY "Service role full access saas_feature_requests" ON saas_feature_requests FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS saas_tenant_dashboard;
CREATE OR REPLACE VIEW saas_tenant_dashboard AS
SELECT
  t.id AS tenant_id,
  t.tenant_key,
  t.name,
  t.tenant_type,
  t.country,
  t.language,
  t.plan_key,
  t.status,
  COUNT(DISTINCT c.id) AS customer_count,
  COUNT(DISTINCT lm.id) AS inquiry_count,
  COUNT(DISTINCT ct.id) AS contract_count,
  COUNT(DISTINCT CASE WHEN c.status IN ('continuing', 'enrolled') THEN c.id END) AS active_customer_count,
  COUNT(DISTINCT CASE WHEN c.status = 'withdrawn' THEN c.id END) AS churn_customer_count,
  COALESCE(SUM(ct.amount), 0) AS total_contract_amount,
  COUNT(DISTINCT cr.id) AS case_count,
  COUNT(DISTINCT cv.id) AS video_count,
  COUNT(DISTINCT d.id) AS diagnosis_count,
  COUNT(DISTINCT p.id) AS proposal_count
FROM saas_tenants t
LEFT JOIN customers c ON c.tenant_id = t.id
LEFT JOIN line_messages lm ON lm.tenant_id = t.id
LEFT JOIN contracts ct ON ct.tenant_id = t.id
LEFT JOIN case_records cr ON cr.tenant_id = t.id
LEFT JOIN case_videos cv ON cv.tenant_id = t.id
LEFT JOIN ai_diagnoses d ON d.tenant_id = t.id
LEFT JOIN ai_proposals p ON p.tenant_id = t.id
GROUP BY t.id;

-- Phase15: 谷田部メソッド認定制度 / 全国ネットワーク
CREATE TABLE IF NOT EXISTS method_certified_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  coach_name TEXT NOT NULL,
  email TEXT,
  country TEXT DEFAULT 'Japan',
  region TEXT,
  languages TEXT[] DEFAULT ARRAY['ja'],
  certification_rank TEXT NOT NULL DEFAULT 'candidate' CHECK (certification_rank IN ('candidate', 'bronze', 'silver', 'gold', 'master')),
  case_understanding_score INTEGER DEFAULT 0 CHECK (case_understanding_score BETWEEN 0 AND 100),
  diagnosis_score INTEGER DEFAULT 0 CHECK (diagnosis_score BETWEEN 0 AND 100),
  proposal_score INTEGER DEFAULT 0 CHECK (proposal_score BETWEEN 0 AND 100),
  total_score INTEGER DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  assessment_summary TEXT,
  next_training_focus TEXT,
  status TEXT NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'certified', 'paused', 'revoked')),
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS method_certified_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES saas_tenants(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  country TEXT DEFAULT 'Japan',
  region TEXT,
  certification_rank TEXT NOT NULL DEFAULT 'candidate' CHECK (certification_rank IN ('candidate', 'bronze', 'silver', 'gold', 'master')),
  retention_rate NUMERIC(5,2) DEFAULT 0,
  improvement_rate NUMERIC(5,2) DEFAULT 0,
  review_score NUMERIC(3,2) DEFAULT 0,
  contract_rate NUMERIC(5,2) DEFAULT 0,
  assessment_summary TEXT,
  required_improvement TEXT,
  status TEXT NOT NULL DEFAULT 'reviewing' CHECK (status IN ('reviewing', 'certified', 'paused', 'revoked')),
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS national_case_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_case_id UUID REFERENCES case_records(id) ON DELETE SET NULL,
  source_tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  anonymized_code TEXT UNIQUE DEFAULT ('NCASE-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8))),
  age_band TEXT,
  grade TEXT,
  position TEXT,
  concern TEXT,
  cause_summary TEXT,
  improvement_summary TEXT,
  result_summary TEXT,
  country TEXT,
  region TEXT,
  tags TEXT[] DEFAULT '{}',
  publish_scope TEXT NOT NULL DEFAULT 'network' CHECK (publish_scope IN ('network', 'public', 'internal_training')),
  ai_learning_weight NUMERIC(4,2) DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'reviewing' CHECK (status IN ('reviewing', 'approved', 'hidden', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_diagnosis_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  diagnosis_id UUID REFERENCES ai_diagnoses(id) ON DELETE SET NULL,
  matched_case_id UUID REFERENCES national_case_library(id) ON DELETE SET NULL,
  predicted_cause TEXT,
  actual_cause TEXT,
  accuracy_score INTEGER CHECK (accuracy_score BETWEEN 0 AND 100),
  coach_feedback TEXT,
  used_for_training BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_network_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  coach_certification_id UUID REFERENCES method_certified_coaches(id) ON DELETE SET NULL,
  school_certification_id UUID REFERENCES method_certified_schools(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('coach', 'school', 'club', 'academy')),
  country TEXT DEFAULT 'Japan',
  region TEXT,
  city TEXT,
  service_types TEXT[] DEFAULT '{}',
  certification_rank TEXT NOT NULL DEFAULT 'candidate' CHECK (certification_rank IN ('candidate', 'bronze', 'silver', 'gold', 'master')),
  referral_priority INTEGER DEFAULT 50 CHECK (referral_priority BETWEEN 0 AND 100),
  contact_policy TEXT DEFAULT 'introduce_by_yatabe',
  public_profile_status TEXT NOT NULL DEFAULT 'private' CHECK (public_profile_status IN ('private', 'ready', 'published')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_training_metrics ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
ALTER TABLE quality_control_reviews ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
UPDATE staff_training_metrics SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;
UPDATE quality_control_reviews SET tenant_id = (SELECT id FROM saas_tenants WHERE tenant_key = 'yatabe-method') WHERE tenant_id IS NULL;

INSERT INTO method_certified_schools (tenant_id, school_name, country, region, certification_rank, retention_rate, improvement_rate, review_score, contract_rate, assessment_summary, status)
SELECT id, name, country, '本部', 'master', 0, 0, 0, 0, '谷田部メソッド本部。認定制度と全国症例DBの基準テナント。', 'certified'
FROM saas_tenants
WHERE tenant_key = 'yatabe-method'
ON CONFLICT (tenant_id) DO UPDATE SET school_name = EXCLUDED.school_name, certification_rank = EXCLUDED.certification_rank, updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_method_certified_coaches_tenant ON method_certified_coaches(tenant_id, certification_rank, status);
CREATE INDEX IF NOT EXISTS idx_method_certified_schools_rank ON method_certified_schools(certification_rank, status);
CREATE INDEX IF NOT EXISTS idx_national_case_library_search ON national_case_library(status, publish_scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_network_region ON referral_network_entries(country, region, certification_rank, public_profile_status);
CREATE INDEX IF NOT EXISTS idx_ai_diagnosis_feedback_tenant ON ai_diagnosis_feedback(tenant_id, created_at DESC);

ALTER TABLE method_certified_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE method_certified_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_case_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_diagnosis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_network_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access method_certified_coaches" ON method_certified_coaches;
CREATE POLICY "Service role full access method_certified_coaches" ON method_certified_coaches FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access method_certified_schools" ON method_certified_schools;
CREATE POLICY "Service role full access method_certified_schools" ON method_certified_schools FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access national_case_library" ON national_case_library;
CREATE POLICY "Service role full access national_case_library" ON national_case_library FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access ai_diagnosis_feedback" ON ai_diagnosis_feedback;
CREATE POLICY "Service role full access ai_diagnosis_feedback" ON ai_diagnosis_feedback FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access referral_network_entries" ON referral_network_entries;
CREATE POLICY "Service role full access referral_network_entries" ON referral_network_entries FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS method_network_dashboard;
CREATE OR REPLACE VIEW method_network_dashboard AS
SELECT
  COUNT(DISTINCT t.id) AS tenant_count,
  COUNT(DISTINCT cc.id) AS certified_coach_count,
  COUNT(DISTINCT cs.id) AS certified_school_count,
  COUNT(DISTINCT ncl.id) AS national_case_count,
  COUNT(DISTINCT rne.id) AS referral_entry_count,
  COALESCE(AVG(NULLIF(cc.total_score, 0)), 0) AS avg_coach_score,
  COALESCE(AVG(NULLIF(cs.retention_rate, 0)), 0) AS avg_retention_rate,
  COALESCE(AVG(NULLIF(f.accuracy_score, 0)), 0) AS avg_diagnosis_accuracy
FROM saas_tenants t
LEFT JOIN method_certified_coaches cc ON cc.tenant_id = t.id AND cc.status = 'certified'
LEFT JOIN method_certified_schools cs ON cs.tenant_id = t.id AND cs.status = 'certified'
LEFT JOIN national_case_library ncl ON ncl.source_tenant_id = t.id AND ncl.status = 'approved'
LEFT JOIN referral_network_entries rne ON rne.tenant_id = t.id AND rne.public_profile_status IN ('ready', 'published')
LEFT JOIN ai_diagnosis_feedback f ON f.tenant_id = t.id;

DROP VIEW IF EXISTS certified_referral_network;
CREATE OR REPLACE VIEW certified_referral_network AS
SELECT
  rne.*,
  t.name AS tenant_name,
  COALESCE(cc.total_score, 0) AS coach_score,
  COALESCE(cs.retention_rate, 0) AS school_retention_rate,
  COALESCE(cs.improvement_rate, 0) AS school_improvement_rate
FROM referral_network_entries rne
LEFT JOIN saas_tenants t ON t.id = rne.tenant_id
LEFT JOIN method_certified_coaches cc ON cc.id = rne.coach_certification_id
LEFT JOIN method_certified_schools cs ON cs.id = rne.school_certification_id
WHERE rne.public_profile_status IN ('ready', 'published');

-- Phase16: 世界展開 / AI海外診断センター
CREATE TABLE IF NOT EXISTS global_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  priority_group TEXT NOT NULL CHECK (priority_group IN ('first', 'second', 'future')),
  primary_language TEXT NOT NULL DEFAULT 'en',
  supported_languages TEXT[] DEFAULT '{}',
  target_keywords TEXT[] DEFAULT '{}',
  market_notes TEXT,
  status TEXT NOT NULL DEFAULT 'researching' CHECK (status IN ('researching', 'landing_page_ready', 'lead_testing', 'active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO global_markets (country_code, country_name, priority_group, primary_language, supported_languages, target_keywords, market_notes)
VALUES
  ('US', 'United States', 'first', 'en', ARRAY['en','ja'], ARRAY['Private Soccer Coach Japan','Soccer Diagnosis','Train Like Japanese Players'], 'MLS NEXT、個人指導、海外短期キャンプの最重要市場'),
  ('CA', 'Canada', 'first', 'en', ARRAY['en','ja'], ARRAY['Private Soccer Coach Japan','Soccer Diagnosis'], '北米英語圏の展開候補'),
  ('SG', 'Singapore', 'first', 'en', ARRAY['en','zh','ja'], ARRAY['Japanese Soccer Training','Soccer Diagnosis'], '英語/中国語対応のアジア拠点候補'),
  ('HK', 'Hong Kong', 'first', 'zh', ARRAY['zh','en','ja'], ARRAY['Japanese Soccer Training','Soccer Diagnosis'], '繁体字/英語対応が必要'),
  ('KR', 'Korea', 'first', 'ko', ARRAY['ko','ja','en'], ARRAY['Japanese Soccer Training','Soccer Diagnosis'], '韓国語対応が必要'),
  ('GB', 'United Kingdom', 'second', 'en', ARRAY['en'], ARRAY['Private Soccer Coach Japan','Japanese Soccer Training'], '第二優先の英語圏'),
  ('AU', 'Australia', 'second', 'en', ARRAY['en'], ARRAY['Soccer Diagnosis','Japanese Soccer Training'], '第二優先の英語圏'),
  ('TH', 'Thailand', 'second', 'th', ARRAY['th','en','ja'], ARRAY['Japanese Soccer Training','Soccer Diagnosis'], 'タイ語対応が必要'),
  ('ID', 'Indonesia', 'second', 'en', ARRAY['id','en'], ARRAY['Soccer Diagnosis'], '将来インドネシア語対応を検討'),
  ('MY', 'Malaysia', 'second', 'en', ARRAY['en','zh'], ARRAY['Soccer Diagnosis','Japanese Soccer Training'], '英語/中国語対応候補')
ON CONFLICT (country_code) DO UPDATE SET country_name = EXCLUDED.country_name, priority_group = EXCLUDED.priority_group, updated_at = NOW();

CREATE TABLE IF NOT EXISTS global_diagnosis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  country_code TEXT REFERENCES global_markets(country_code) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'en',
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('line', 'gmail', 'form', 'video', 'parent_consultation', 'manual')),
  player_age INTEGER,
  player_level TEXT,
  position TEXT,
  consultation_text TEXT,
  video_url TEXT,
  diagnosis_summary TEXT,
  cause_summary TEXT,
  improvement_plan TEXT,
  similar_case_notes TEXT,
  recommended_program TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'diagnosed', 'proposal_ready', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS overseas_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_name TEXT NOT NULL,
  country_code TEXT REFERENCES global_markets(country_code) ON DELETE SET NULL,
  city TEXT,
  starts_on DATE,
  ends_on DATE,
  capacity INTEGER,
  participant_count INTEGER DEFAULT 0,
  contract_status_summary TEXT,
  payment_status_summary TEXT,
  parent_support_notes TEXT,
  review_status_summary TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'recruiting', 'confirmed', 'running', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_translation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT,
  yatabe_style_reply TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'translated', 'reviewed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS overseas_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  country_code TEXT REFERENCES global_markets(country_code) ON DELETE SET NULL,
  language TEXT DEFAULT 'en',
  review_text TEXT,
  improvement_summary TEXT,
  related_case_id UUID REFERENCES case_records(id) ON DELETE SET NULL,
  publish_status TEXT NOT NULL DEFAULT 'private' CHECK (publish_status IN ('private', 'permission_needed', 'public_allowed', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase17: サッカー技術の病院 / 電子カルテ / AI処方箋
CREATE TABLE IF NOT EXISTS soccer_medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL,
  chief_complaint TEXT,
  symptom_category TEXT CHECK (symptom_category IN ('dribble', 'shoot', 'trap', 'decision', 'defense', 'physical', 'mental', 'other')),
  root_cause TEXT,
  improvement_history TEXT,
  video_summary TEXT,
  case_links UUID[] DEFAULT '{}',
  contract_history_summary TEXT,
  lesson_history_summary TEXT,
  current_status TEXT NOT NULL DEFAULT 'active' CHECK (current_status IN ('active', 'monitoring', 'improved', 'paused', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID REFERENCES soccer_medical_records(id) ON DELETE CASCADE,
  diagnosis_id UUID REFERENCES ai_diagnoses(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  prescription_title TEXT NOT NULL,
  priority_order TEXT[] DEFAULT '{}',
  training_menu TEXT,
  related_video_ids UUID[] DEFAULT '{}',
  related_article_ids UUID[] DEFAULT '{}',
  related_case_ids UUID[] DEFAULT '{}',
  expected_frequency TEXT,
  review_after_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improvement_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  medical_record_id UUID REFERENCES soccer_medical_records(id) ON DELETE SET NULL,
  improvement_probability INTEGER CHECK (improvement_probability BETWEEN 0 AND 100),
  estimated_weeks INTEGER,
  estimated_lesson_count INTEGER,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  prediction_reason TEXT,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'reviewed', 'validated', 'missed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_research_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_title TEXT NOT NULL,
  symptom_category TEXT,
  common_causes TEXT[] DEFAULT '{}',
  common_interventions TEXT[] DEFAULT '{}',
  evidence_case_ids UUID[] DEFAULT '{}',
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS soccer_university_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_type TEXT NOT NULL CHECK (course_type IN ('parent', 'player', 'coach')),
  title TEXT NOT NULL,
  target_level TEXT,
  source_case_ids UUID[] DEFAULT '{}',
  outline TEXT,
  lesson_modules TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_markets_priority ON global_markets(priority_group, status);
CREATE INDEX IF NOT EXISTS idx_global_diagnosis_country ON global_diagnosis_requests(country_code, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_overseas_camps_country ON overseas_camps(country_code, starts_on DESC);
CREATE INDEX IF NOT EXISTS idx_translation_tasks_customer ON ai_translation_tasks(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soccer_medical_records_customer ON soccer_medical_records(customer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prescriptions_customer ON ai_prescriptions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_improvement_predictions_customer ON improvement_predictions(customer_id, created_at DESC);

ALTER TABLE global_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_diagnosis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE overseas_camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_translation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE overseas_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE soccer_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE soccer_university_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access global_markets" ON global_markets;
CREATE POLICY "Service role full access global_markets" ON global_markets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access global_diagnosis_requests" ON global_diagnosis_requests;
CREATE POLICY "Service role full access global_diagnosis_requests" ON global_diagnosis_requests FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access overseas_camps" ON overseas_camps;
CREATE POLICY "Service role full access overseas_camps" ON overseas_camps FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access ai_translation_tasks" ON ai_translation_tasks;
CREATE POLICY "Service role full access ai_translation_tasks" ON ai_translation_tasks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access overseas_reviews" ON overseas_reviews;
CREATE POLICY "Service role full access overseas_reviews" ON overseas_reviews FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access soccer_medical_records" ON soccer_medical_records;
CREATE POLICY "Service role full access soccer_medical_records" ON soccer_medical_records FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access ai_prescriptions" ON ai_prescriptions;
CREATE POLICY "Service role full access ai_prescriptions" ON ai_prescriptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access improvement_predictions" ON improvement_predictions;
CREATE POLICY "Service role full access improvement_predictions" ON improvement_predictions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access case_research_findings" ON case_research_findings;
CREATE POLICY "Service role full access case_research_findings" ON case_research_findings FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role full access soccer_university_courses" ON soccer_university_courses;
CREATE POLICY "Service role full access soccer_university_courses" ON soccer_university_courses FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP VIEW IF EXISTS global_expansion_dashboard;
CREATE OR REPLACE VIEW global_expansion_dashboard AS
SELECT
  COUNT(DISTINCT gm.id) AS market_count,
  COUNT(DISTINCT CASE WHEN gm.priority_group = 'first' THEN gm.id END) AS first_priority_market_count,
  COUNT(DISTINCT gdr.id) AS diagnosis_request_count,
  COUNT(DISTINCT oc.id) AS overseas_camp_count,
  COUNT(DISTINCT tr.id) AS translation_task_count,
  COUNT(DISTINCT rv.id) AS overseas_review_count,
  COUNT(DISTINCT CASE WHEN gm.status = 'active' THEN gm.id END) AS active_market_count
FROM global_markets gm
LEFT JOIN global_diagnosis_requests gdr ON gdr.country_code = gm.country_code
LEFT JOIN overseas_camps oc ON oc.country_code = gm.country_code
LEFT JOIN ai_translation_tasks tr ON TRUE
LEFT JOIN overseas_reviews rv ON rv.country_code = gm.country_code;

DROP VIEW IF EXISTS soccer_hospital_dashboard;
CREATE OR REPLACE VIEW soccer_hospital_dashboard AS
SELECT
  COUNT(DISTINCT smr.id) AS medical_record_count,
  COUNT(DISTINCT ap.id) AS prescription_count,
  COUNT(DISTINCT ip.id) AS prediction_count,
  COUNT(DISTINCT crf.id) AS research_finding_count,
  COUNT(DISTINCT suc.id) AS course_count,
  COALESCE(AVG(ip.improvement_probability), 0) AS avg_improvement_probability,
  COALESCE(AVG(ip.estimated_weeks), 0) AS avg_estimated_weeks,
  COALESCE(AVG(ip.estimated_lesson_count), 0) AS avg_estimated_lesson_count
FROM soccer_medical_records smr
LEFT JOIN ai_prescriptions ap ON ap.medical_record_id = smr.id
LEFT JOIN improvement_predictions ip ON ip.medical_record_id = smr.id
LEFT JOIN case_research_findings crf ON TRUE
LEFT JOIN soccer_university_courses suc ON TRUE;
