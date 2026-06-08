-- ============================================================
-- 0006_create_tasks.sql
-- Idempotent + safe for re-runs
-- ============================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  created_by uuid not null,
  status text not null default 'pending',
  notification_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS safely
alter table public.tasks enable row level security;

-- Policies (safe re-run)
drop policy if exists deny_anon_all_tasks on public.tasks;

create policy deny_anon_all_tasks
  on public.tasks
  for all
  using (false)
  with check (false);

-- Updated-at trigger function (safe replace)
create or replace function public.tasks_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- 🔑 THIS IS THE CRITICAL FIX
-- Drop trigger if it already exists BEFORE recreating
drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute procedure public.tasks_updated_at();

