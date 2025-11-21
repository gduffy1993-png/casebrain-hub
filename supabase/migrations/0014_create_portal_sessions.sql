create table if not exists public.portal_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  case_id uuid references public.cases(id) on delete cascade,
  org_id uuid not null,
  expires_at timestamptz not null,
  sections jsonb not null default '["summary","timeline","documents"]'::jsonb,
  created_at timestamptz default now()
);

alter table public.portal_sessions enable row level security;

drop policy if exists deny_anon_all_portal_sessions on public.portal_sessions;

create policy deny_anon_all_portal_sessions
  on public.portal_sessions
  for all
  using (false)
  with check (false);

