create table if not exists public.organisation_settings (
  org_id uuid primary key,
  slack_webhook text,
  teams_webhook text,
  calendar_email text,
  updated_at timestamptz default now()
);

alter table public.organisation_settings enable row level security;

drop policy if exists deny_anon_all_org_settings on public.organisation_settings;

create policy deny_anon_all_org_settings
  on public.organisation_settings
  for all
  using (false)
  with check (false);

