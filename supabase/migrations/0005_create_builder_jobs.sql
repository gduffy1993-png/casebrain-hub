create table if not exists public.builder_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  created_by uuid not null,
  prompt text not null,
  status text not null default 'queued',
  output text default '',
  error text default '',
  requires_approval boolean default false,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.builder_jobs enable row level security;

drop policy if exists deny_anon_all_builder_jobs on public.builder_jobs;

create policy deny_anon_all_builder_jobs
  on public.builder_jobs
  for all
  using (false)
  with check (false);

create or replace function public.builder_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger builder_jobs_set_updated_at
before update on public.builder_jobs
for each row execute procedure public.builder_jobs_updated_at();

