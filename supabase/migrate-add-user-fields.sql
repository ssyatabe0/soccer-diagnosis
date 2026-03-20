-- 既存 users テーブルに name, email, prefecture カラムを追加するマイグレーション
-- Supabase SQL Editor で実行してください

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS prefecture TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
