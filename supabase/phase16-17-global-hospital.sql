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
