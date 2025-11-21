create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  steps jsonb not null,
  created_by uuid not null,
  created_at timestamptz default now()
);

create table if not exists public.playbook_runs (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid references public.playbooks(id) on delete cascade,
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete cascade,
  status text not null default 'pending',
  logs jsonb default '[]'::jsonb,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.playbooks enable row level security;
alter table public.playbook_runs enable row level security;

drop policy if exists deny_anon_all_playbooks on public.playbooks;
drop policy if exists deny_anon_all_playbook_runs on public.playbook_runs;

create policy deny_anon_all_playbooks
  on public.playbooks
  for all
  using (false)
  with check (false);

create policy deny_anon_all_playbook_runs
  on public.playbook_runs
  for all
  using (false)
  with check (false);

create or replace function public.playbook_runs_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger playbook_runs_set_updated_at
before update on public.playbook_runs
for each row execute procedure public.playbook_runs_updated_at();

