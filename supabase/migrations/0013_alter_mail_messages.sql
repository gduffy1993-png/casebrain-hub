-- =========================================================
-- 0013_alter_mail_messages.sql
-- Idempotent: add columns only if missing
-- =========================================================

alter table public.mail_messages
  add column if not exists auto_reply jsonb default null;

alter table public.mail_messages
  add column if not exists opponent_name text;

alter table public.mail_messages
  add column if not exists opponent_email text;

alter table public.mail_messages
  add column if not exists requires_follow_up boolean default false;

