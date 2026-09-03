-- Locks down the status lifecycle specifically for customer-originated
-- tasks (task_type <> 'Task', i.e. Bug/ChangeRequest/Inquiry filed through
-- the Client Portal). Internal tasks keep their existing free-form status
-- editing - this only applies to Client Portal tasks:
--
--   Open ("New")        -> set automatically when the bank files the task (unchanged default)
--   InProgress          -> set automatically the moment a resource is assigned
--   Resolved ("Done")   -> only the assignee (or a Manager) can set this
--   Closed              -> only the task's creator/reporter (or a Manager) can set this
--   Closed -> anything  -> "re-open", also creator/Manager only, bumps reopen_count
--
-- The "auto -> InProgress on assign" part is handled client-side (the
-- caller already has the issue in memory when reassigning); the
-- Done/Closed/reopen restrictions and the reopen counter are enforced here
-- so they can't be bypassed by calling the API directly.

alter table public.issues add column if not exists reopen_count integer not null default 0;

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

  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_task_status_flow on public.issues;
create trigger trg_enforce_customer_task_status_flow
before update on public.issues
for each row execute function public.enforce_customer_task_status_flow();
