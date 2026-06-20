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
