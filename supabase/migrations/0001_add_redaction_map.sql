alter table public.documents
  add column if not exists redaction_map jsonb default '[]'::jsonb;

