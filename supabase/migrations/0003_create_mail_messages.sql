create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete set null,
  subject text not null,
  from_address text not null,
  body text not null,
  redacted_body text not null,
  redaction_map jsonb not null default '[]'::jsonb,
  summary jsonb,
  received_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.mail_messages enable row level security;

drop policy if exists deny_anon_all_mail_messages on public.mail_messages;

create policy deny_anon_all_mail_messages
  on public.mail_messages
  for all
  using (false)
  with check (false);

