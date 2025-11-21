create type public.risk_severity as enum ('low', 'medium', 'high', 'critical');

create table if not exists public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  flag_type text not null,
  severity public.risk_severity not null default 'medium',
  description text not null,
  metadata jsonb default '{}'::jsonb,
  resolved boolean default false,
  resolved_at timestamptz,
  detected_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.risk_flags enable row level security;

drop policy if exists deny_anon_all_risk_flags on public.risk_flags;

create policy deny_anon_all_risk_flags
  on public.risk_flags
  for all
  using (false)
  with check (false);

