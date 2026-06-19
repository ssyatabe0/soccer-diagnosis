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
  memo TEXT,
  source TEXT NOT NULL DEFAULT 'line',
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
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
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_customers_service_type ON customers(service_type);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact_at ON customers(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_line_accounts_customer_id ON customer_line_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_line_accounts_line_user ON customer_line_accounts(account_key, line_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer_at ON customer_timeline_events(customer_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_sync_customer ON gmail_sync_sources(customer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_customer ON calendar_sync_sources(customer_id);

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
