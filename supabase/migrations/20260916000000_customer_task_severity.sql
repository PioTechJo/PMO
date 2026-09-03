-- Adds a "severity" field to issues, distinct from the existing internal
-- "priority" field even though it reuses the same Low/Medium/High/Critical
-- scale: the creator (Client Portal reporter) sets it when filing the
-- task, and afterward only the assignee (or a Manager) can change it -
-- same lock pattern as enforce_customer_task_status_flow, extended here to
-- also cover severity changes on customer-originated tasks.

alter table public.issues add column if not exists severity text;

create or replace function public.enforce_customer_task_status_flow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Internal tasks (task_type is null or 'Task') are untouched.
  if new.task_type is null or new.task_type = 'Task' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'Resolved' then
      if public.get_user_role(auth.uid()) <> 'Manager' and old.assignee_id is distinct from auth.uid() then
        raise exception 'Only the assignee or a Manager can mark this task as Done.';
      end if;
    end if;

    if new.status = 'Closed' or old.status = 'Closed' then
      if public.get_user_role(auth.uid()) <> 'Manager' and old.reporter_id is distinct from auth.uid() then
        raise exception 'Only the task creator or a Manager can close/reopen this task.';
      end if;
    end if;

    if old.status = 'Closed' and new.status is distinct from 'Closed' then
      new.reopen_count := coalesce(old.reopen_count, 0) + 1;
    end if;
  end if;

  if new.severity is distinct from old.severity then
    if public.get_user_role(auth.uid()) <> 'Manager' and old.assignee_id is distinct from auth.uid() then
      raise exception 'Only the assignee or a Manager can change the severity.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_task_status_flow on public.issues;
create trigger trg_enforce_customer_task_status_flow
before update on public.issues
for each row execute function public.enforce_customer_task_status_flow();
