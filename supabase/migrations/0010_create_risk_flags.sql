-- =========================================================
-- 0010_create_risk_flags.sql
-- Idempotent + safe on existing databases
-- =========================================================

-- Create enum only if it does not already exist
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'risk_severity'
      and n.nspname = 'public'
  ) then
    create type public.risk_severity as enum (
      'low',
      'medium',
      'high',
      'critical'
    );
  end if;
end
$$;

-- Create table safely
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

-- Enable RLS safely
alter table public.risk_flags enable row level security;

-- Drop old policies if present
drop policy if exists deny_anon_all_risk_flags on public.risk_flags;

-- Recreate deny-anon policy
create policy deny_anon_all_risk_flags
  on public.risk_flags
  for all
  using (false)
  with check (false);
