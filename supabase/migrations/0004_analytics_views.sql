create view public.case_metrics as
select
  c.id as case_id,
  c.title,
  c.org_id,
  c.status,
  c.created_at,
  coalesce(count(distinct d.id), 0) as document_count,
  coalesce(count(distinct l.id), 0) as letter_count,
  coalesce(
    min(case when dl.due_date >= current_date then dl.due_date end),
    null
  ) as next_deadline
from public.cases c
left join public.documents d on d.case_id = c.id
left join public.letters l on l.case_id = c.id
left join public.deadlines dl on dl.case_id = c.id
group by c.id, c.title, c.org_id, c.status, c.created_at;

create view public.template_metrics as
select
  t.id as template_id,
  t.name,
  t.role,
  coalesce(count(l.id), 0) as usage_count,
  coalesce(
    max(l.created_at),
    null
  ) as last_used_at
from public.letterTemplates t
left join public.letters l on l.template_id = t.id
group by t.id, t.name, t.role;

