-- Add practice area tagging to cases
alter table public.cases
add column if not exists practice_area text not null default 'general';

create index if not exists cases_practice_area_idx on public.cases (practice_area);

-- Create PI / Clinical Neg case metadata table
create table if not exists public.pi_cases (
  id uuid primary key references public.cases(id) on delete cascade,
  org_id uuid not null,
  case_type text not null,
  accident_date date,
  date_of_knowledge date,
  limitation_date date,
  client_dob date,
  liability_stance text,
  injury_description text,
  injury_severity text,
  employment_status text,
  loss_of_earnings_estimate numeric,
  special_damages_estimate numeric,
  general_damages_band text,
  stage text not null default 'intake',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_cases_org_idx on public.pi_cases (org_id);
create index if not exists pi_cases_stage_idx on public.pi_cases (stage);
create index if not exists pi_cases_limitation_idx on public.pi_cases (limitation_date);

create or replace function public.pi_cases_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_cases_updated_at on public.pi_cases;
create trigger trg_pi_cases_updated_at
before update on public.pi_cases
for each row execute procedure public.pi_cases_set_updated_at();

-- Medical reports
create table if not exists public.pi_medical_reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  org_id uuid not null,
  expert_name text,
  specialism text,
  report_type text,
  instruction_date date,
  report_due_date date,
  report_received_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_medical_reports_case_idx on public.pi_medical_reports (case_id);
create index if not exists pi_medical_reports_org_idx on public.pi_medical_reports (org_id);

create or replace function public.pi_medical_reports_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_medical_reports_updated_at on public.pi_medical_reports;
create trigger trg_pi_medical_reports_updated_at
before update on public.pi_medical_reports
for each row execute procedure public.pi_medical_reports_set_updated_at();

-- Offers
create table if not exists public.pi_offers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  org_id uuid not null,
  party text not null,
  amount numeric not null,
  date_made date not null,
  deadline_to_respond date,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_offers_case_idx on public.pi_offers (case_id);
create index if not exists pi_offers_org_idx on public.pi_offers (org_id);
create index if not exists pi_offers_status_idx on public.pi_offers (status);

create or replace function public.pi_offers_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_offers_updated_at on public.pi_offers;
create trigger trg_pi_offers_updated_at
before update on public.pi_offers
for each row execute procedure public.pi_offers_set_updated_at();

-- Hearings
create table if not exists public.pi_hearings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  org_id uuid not null,
  hearing_type text,
  date timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_hearings_case_idx on public.pi_hearings (case_id);
create index if not exists pi_hearings_org_idx on public.pi_hearings (org_id);
create index if not exists pi_hearings_date_idx on public.pi_hearings (date);

create or replace function public.pi_hearings_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_hearings_updated_at on public.pi_hearings;
create trigger trg_pi_hearings_updated_at
before update on public.pi_hearings
for each row execute procedure public.pi_hearings_set_updated_at();

-- Disbursements
create table if not exists public.pi_disbursements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  org_id uuid not null,
  category text,
  amount numeric not null,
  incurred_date date,
  paid boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_disbursements_case_idx on public.pi_disbursements (case_id);
create index if not exists pi_disbursements_org_idx on public.pi_disbursements (org_id);
create index if not exists pi_disbursements_paid_idx on public.pi_disbursements (paid);

create or replace function public.pi_disbursements_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_disbursements_updated_at on public.pi_disbursements;
create trigger trg_pi_disbursements_updated_at
before update on public.pi_disbursements
for each row execute procedure public.pi_disbursements_set_updated_at();

-- Letter templates (global + per org overrides)
create table if not exists public.pi_letter_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  code text not null,
  name text not null,
  description text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pi_letter_templates_org_idx on public.pi_letter_templates (org_id);
create index if not exists pi_letter_templates_code_idx on public.pi_letter_templates (code);

create or replace function public.pi_letter_templates_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pi_letter_templates_updated_at on public.pi_letter_templates;
create trigger trg_pi_letter_templates_updated_at
before update on public.pi_letter_templates
for each row execute procedure public.pi_letter_templates_set_updated_at();

-- Enable RLS and add deny-all policies (service role will manage access)
alter table public.pi_cases enable row level security;
alter table public.pi_medical_reports enable row level security;
alter table public.pi_offers enable row level security;
alter table public.pi_hearings enable row level security;
alter table public.pi_disbursements enable row level security;
alter table public.pi_letter_templates enable row level security;

drop policy if exists deny_anon_pi_cases on public.pi_cases;
drop policy if exists deny_anon_pi_medical_reports on public.pi_medical_reports;
drop policy if exists deny_anon_pi_offers on public.pi_offers;
drop policy if exists deny_anon_pi_hearings on public.pi_hearings;
drop policy if exists deny_anon_pi_disbursements on public.pi_disbursements;
drop policy if exists deny_anon_pi_letter_templates on public.pi_letter_templates;

create policy deny_anon_pi_cases on public.pi_cases
  for all using (false) with check (false);

create policy deny_anon_pi_medical_reports on public.pi_medical_reports
  for all using (false) with check (false);

create policy deny_anon_pi_offers on public.pi_offers
  for all using (false) with check (false);

create policy deny_anon_pi_hearings on public.pi_hearings
  for all using (false) with check (false);

create policy deny_anon_pi_disbursements on public.pi_disbursements
  for all using (false) with check (false);

create policy deny_anon_pi_letter_templates on public.pi_letter_templates
  for all using (false) with check (false);


