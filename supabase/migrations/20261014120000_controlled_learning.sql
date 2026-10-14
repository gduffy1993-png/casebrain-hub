-- Supervised label learning. Server access only; no existing tables are changed.
create table if not exists public.learning_corrections (
  id uuid primary key default gen_random_uuid(), org_id uuid not null,
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  field text not null check (field in ('defendant','charge','court','hearing')),
  label text not null, expected_value text not null, source_page integer not null check (source_page > 0),
  source_line text not null, source_hash text not null, created_by text not null,
  verified_by text, verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.learning_lessons (
  id uuid primary key default gen_random_uuid(), org_id uuid not null,
  correction_id uuid not null unique references public.learning_corrections(id) on delete cascade,
  field text not null, label text not null,
  status text not null default 'proposed' check (status in ('proposed','approved','revoked')),
  evaluation jsonb, approved_by text, approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(), org_id uuid not null,
  lesson_id uuid references public.learning_lessons(id) on delete cascade,
  actor_id text not null, action text not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists learning_corrections_org on public.learning_corrections(org_id, field);
create index if not exists learning_lessons_org on public.learning_lessons(org_id, status);
create unique index if not exists learning_approved_label on public.learning_lessons(org_id, lower(label)) where status='approved';
alter table public.learning_corrections enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_events enable row level security;
revoke all on public.learning_corrections, public.learning_lessons, public.learning_events from anon, authenticated;
grant all on public.learning_corrections, public.learning_lessons, public.learning_events to service_role;

-- Tenant must match the owned source document. There is no organisations table to FK.
create or replace function public.learning_corrections_org_matches_document()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.documents d
    where d.id = new.document_id and d.org_id::text = new.org_id::text
  ) then
    raise exception 'learning correction org_id must match the source document';
  end if;
  return new;
end $$;
drop trigger if exists learning_corrections_org_matches_document on public.learning_corrections;
create trigger learning_corrections_org_matches_document
  before insert or update on public.learning_corrections
  for each row execute procedure public.learning_corrections_org_matches_document();

create or replace function public.learning_corrections_four_eyes()
returns trigger language plpgsql as $$
begin
  if new.verified_by is not null and new.verified_by is not distinct from new.created_by then
    raise exception 'learning correction cannot be self-verified';
  end if;
  return new;
end $$;
drop trigger if exists learning_corrections_four_eyes on public.learning_corrections;
create trigger learning_corrections_four_eyes
  before insert or update on public.learning_corrections
  for each row execute procedure public.learning_corrections_four_eyes();

-- Approval and audit entry are atomic. Only a server-built current evaluation is accepted.
create or replace function public.approve_learning_lesson(p_org uuid, p_id uuid, p_actor text,
  p_evaluation jsonb, p_version text) returns boolean language plpgsql security definer
set search_path = public as $$
declare
  selected public.learning_lessons;
  training public.learning_corrections;
  active_ids jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into selected from public.learning_lessons where id=p_id and org_id=p_org for update;
  if not found or selected.status <> 'proposed' then return false; end if;
  select * into training from public.learning_corrections
    where id=selected.correction_id and org_id=p_org;
  if not found or training.verified_at is null then return false; end if;
  if p_actor is not distinct from training.created_by
    or p_actor is not distinct from training.verified_by then
    return false;
  end if;
  select coalesce(jsonb_agg(id::text order by id::text),'[]'::jsonb) into active_ids
    from public.learning_lessons where org_id=p_org and status='approved'
      and evaluation->>'pipelineVersion'=p_version;
  if active_ids is distinct from p_evaluation->'baselineLessonIds' then return false; end if;
  if (p_evaluation->>'pipelineVersion') is distinct from p_version
    or (p_evaluation->>'eligible') is distinct from 'true'
    or coalesce((p_evaluation->>'tested')::int,0) < 5
    or coalesce((p_evaluation->>'improvements')::int,0) < 2
    or coalesce((p_evaluation->>'regressions')::int,1) <> 0
    or coalesce((p_evaluation->>'failures')::int,1) <> 0 then return false; end if;
  update public.learning_lessons set status='approved',evaluation=p_evaluation,
    approved_by=p_actor,approved_at=now(),updated_at=now() where id=p_id;
  insert into public.learning_events(org_id,lesson_id,actor_id,action) values(p_org,p_id,p_actor,'approved');
  return true;
end $$;
revoke all on function public.approve_learning_lesson(uuid,uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.approve_learning_lesson(uuid,uuid,text,jsonb,text) to service_role;

create or replace function public.revoke_learning_lesson(p_org uuid,p_id uuid,p_actor text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org::text,0));
  update public.learning_lessons set status='revoked',updated_at=now()
    where id=p_id and org_id=p_org and status='approved';
  if not found then return false; end if;
  insert into public.learning_events(org_id,lesson_id,actor_id,action) values(p_org,p_id,p_actor,'revoked');
  return true;
end $$;
revoke all on function public.revoke_learning_lesson(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.revoke_learning_lesson(uuid,uuid,text) to service_role;
