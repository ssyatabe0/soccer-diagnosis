-- LINE既存WebhookをAI秘書に接続するための最小保存テーブル
-- 既存 users テーブルは顧客候補として再利用し、LINE受信全文だけを追加保存する。

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
  ADD COLUMN IF NOT EXISTS manual_memo TEXT;

ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access line_messages" ON line_messages;
CREATE POLICY "Service role full access line_messages"
  ON line_messages FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access line_accounts" ON line_accounts;
CREATE POLICY "Service role full access line_accounts"
  ON line_accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

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
  lm.customer_candidates,
  lm.match_confidence,
  lm.match_reasons,
  lm.status,
  lm.occurred_at,
  lm.created_at,
  la.display_name AS account_display_name,
  la.service_area AS account_service_area,
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
LEFT JOIN users u ON u.id = lm.matched_user_id;
