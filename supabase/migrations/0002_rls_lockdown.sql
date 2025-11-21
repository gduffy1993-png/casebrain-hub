alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.templates enable row level security;
alter table public.letters enable row level security;
alter table public.deadlines enable row level security;

drop policy if exists anon_select_cases on public.cases;
drop policy if exists anon_select_documents on public.documents;
drop policy if exists anon_select_templates on public.templates;
drop policy if exists anon_select_letters on public.letters;
drop policy if exists anon_select_deadlines on public.deadlines;

drop policy if exists dev_all_cases on public.cases;
drop policy if exists dev_all_docs on public.documents;
drop policy if exists dev_all_templates on public.templates;
drop policy if exists dev_all_letters on public.letters;
drop policy if exists dev_all_deadlines on public.deadlines;

create policy deny_anon_all_cases on public.cases
  for all using (false) with check (false);

create policy deny_anon_all_docs on public.documents
  for all using (false) with check (false);

create policy deny_anon_all_templates on public.templates
  for all using (false) with check (false);

create policy deny_anon_all_letters on public.letters
  for all using (false) with check (false);

create policy deny_anon_all_deadlines on public.deadlines
  for all using (false) with check (false);

