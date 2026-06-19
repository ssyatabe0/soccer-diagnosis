-- LINE既存WebhookをAI秘書に接続するための最小保存テーブル
-- 既存 users テーブルは顧客候補として再利用し、LINE受信全文だけを追加保存する。

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
  ADD COLUMN IF NOT EXISTS match_reasons TEXT[] DEFAULT '{}';

ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access line_messages"
  ON line_messages FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 管理画面やAI秘書が未対応LINEを読みやすいようにするビュー。
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
  lm.customer_candidates,
  lm.match_confidence,
  lm.match_reasons,
  lm.status,
  lm.occurred_at,
  lm.created_at,
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
LEFT JOIN users u ON u.id = lm.matched_user_id;
