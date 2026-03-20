-- サッカー才能の出し方診断 - Supabaseスキーマ
-- Supabase SQL Editorで実行してください

-- 診断結果テーブル
CREATE TABLE IF NOT EXISTS diagnosis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id INTEGER NOT NULL,
  type_name TEXT NOT NULL,
  lane TEXT NOT NULL CHECK (lane IN ('A', 'B', 'C')),
  tags TEXT[] DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  answers INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザー管理テーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_result_id UUID REFERENCES diagnosis_results(id),
  type_id INTEGER NOT NULL,
  type_name TEXT NOT NULL,
  lane TEXT NOT NULL CHECK (lane IN ('A', 'B', 'C')),
  tags TEXT[] DEFAULT '{}',
  total_score INTEGER DEFAULT 0,
  name TEXT,
  email TEXT,
  prefecture TEXT,
  line_user_id TEXT,
  line_delivery_step INTEGER DEFAULT 0,
  conversion_status TEXT DEFAULT 'new' CHECK (conversion_status IN ('new', 'contacted', 'in_progress', 'converted', 'lost')),
  staff_required BOOLEAN DEFAULT FALSE,
  selection_priority BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 診断タグテーブル（正規化用）
CREATE TABLE IF NOT EXISTS diagnosis_tags (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tag TEXT NOT NULL CHECK (tag IN ('beginner', 'low_grade', 'late_start', 'stagnation', 'selection')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LINE配信ログ
CREATE TABLE IF NOT EXISTS line_delivery_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  step INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE
);

-- 症例カルテリンク閲覧ログ
CREATE TABLE IF NOT EXISTS case_links (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  case_url TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成約ステータス管理
CREATE TABLE IF NOT EXISTS conversion_status (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL,
  notes TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- スタッフメモ
CREATE TABLE IF NOT EXISTS staff_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  note TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_lane ON users(lane);
CREATE INDEX IF NOT EXISTS idx_users_tags ON users USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_staff_required ON users(staff_required) WHERE staff_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_selection_priority ON users(selection_priority) WHERE selection_priority = TRUE;
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_type ON diagnosis_results(type_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tags_user ON diagnosis_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_line_logs_user ON line_delivery_logs(user_id);

-- RLS（Row Level Security）ポリシー
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notes ENABLE ROW LEVEL SECURITY;

-- Anonymous insert/select policy for diagnosis
CREATE POLICY "Anyone can insert diagnosis results"
  ON diagnosis_results FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "Anyone can read diagnosis results"
  ON diagnosis_results FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Anyone can insert user"
  ON users FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY "Anyone can read users"
  ON users FOR SELECT TO anon USING (TRUE);

-- Service role has full access
CREATE POLICY "Service role full access diagnosis_results"
  ON diagnosis_results FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access users"
  ON users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access diagnosis_tags"
  ON diagnosis_tags FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access line_delivery_logs"
  ON line_delivery_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access case_links"
  ON case_links FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access conversion_status"
  ON conversion_status FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access staff_notes"
  ON staff_notes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
