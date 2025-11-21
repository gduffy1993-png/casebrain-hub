create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  case_id uuid references public.cases(id) on delete cascade,
  label text not null,
  type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.entity_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  source_entity uuid references public.entities(id) on delete cascade,
  target_entity uuid references public.entities(id) on delete cascade,
  relationship text not null,
  created_at timestamptz default now()
);

alter table public.entities enable row level security;
alter table public.entity_links enable row level security;

drop policy if exists deny_anon_all_entities on public.entities;
drop policy if exists deny_anon_all_entity_links on public.entity_links;

create policy deny_anon_all_entities
  on public.entities
  for all
  using (false)
  with check (false);

create policy deny_anon_all_entity_links
  on public.entity_links
  for all
  using (false)
  with check (false);

