create or replace function public.tasks_after_insert()
returns trigger as $$
begin
  insert into public.task_log (task_id, org_id, actor_id, event, detail)
  values (new.id, new.org_id, new.created_by, 'created', jsonb_build_object(
    'title', new.title,
    'description', new.description,
    'due_at', new.due_at
  ));
  return new;
end;
$$ language plpgsql;

create or replace function public.tasks_after_update()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.task_log (task_id, org_id, actor_id, event, detail)
    values (new.id, new.org_id, null, 'status_change', jsonb_build_object(
      'from', old.status,
      'to', new.status
    ));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_log_insert on public.tasks;
drop trigger if exists tasks_log_update on public.tasks;

create trigger tasks_log_insert
after insert on public.tasks
for each row execute procedure public.tasks_after_insert();

create trigger tasks_log_update
after update on public.tasks
for each row execute procedure public.tasks_after_update();

