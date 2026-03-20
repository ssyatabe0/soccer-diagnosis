-- users テーブルに line_display_name カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_display_name TEXT;
