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

alter table public.tasks enable row level security;

drop policy if exists deny_anon_all_tasks on public.tasks;

create policy deny_anon_all_tasks
  on public.tasks
  for all
  using (false)
  with check (false);

create or replace function public.tasks_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute procedure public.tasks_updated_at();

