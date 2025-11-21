create table if not exists public.mail_opponents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete cascade,
  message_id uuid references public.mail_messages(id) on delete cascade,
  name text,
  email text,
  role text default 'opponent',
  created_at timestamptz default now()
);

alter table public.mail_opponents enable row level security;

drop policy if exists deny_anon_all_mail_opponents on public.mail_opponents;

create policy deny_anon_all_mail_opponents
  on public.mail_opponents
  for all
  using (false)
  with check (false);

