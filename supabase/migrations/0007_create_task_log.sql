create table if not exists public.task_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  org_id uuid not null,
  actor_id uuid,
  event text not null,
  detail jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.task_log enable row level security;

drop policy if exists deny_anon_all_task_log on public.task_log;

create policy deny_anon_all_task_log
  on public.task_log
  for all
  using (false)
  with check (false);

