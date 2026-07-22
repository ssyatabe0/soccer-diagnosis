-- Staff confirmation workflow for Yatabe AI Secretary.
-- Purpose:
-- - Staff only confirms facts: candidate dates, location, availability, notes.
-- - AI creates the parent-facing draft.
-- - Yatabe confirms before any customer message is sent.

create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  services text[] default '{}',
  is_active boolean not null default true,
  notify_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_line_accounts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_members(id) on delete cascade,
  line_account_key text not null,
  line_user_id text not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique(line_account_key, line_user_id)
);

create table if not exists staff_check_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  source_line_inbox_id bigint,
  assigned_staff_id uuid references staff_members(id) on delete set null,
  task_type text not null default 'schedule_check',
  status text not null default 'pending',
  priority text not null default 'normal',
  customer_name text,
  customer_message text,
  question_to_staff text not null,
  due_at timestamptz,
  staff_reply_summary text,
  ai_reply_draft text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_check_replies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references staff_check_tasks(id) on delete cascade,
  staff_id uuid references staff_members(id) on delete set null,
  raw_reply text not null,
  parsed_candidates jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_check_tasks_status_due
  on staff_check_tasks(status, due_at);

create index if not exists idx_staff_check_tasks_customer
  on staff_check_tasks(customer_id);

create index if not exists idx_staff_check_replies_task
  on staff_check_replies(task_id);
