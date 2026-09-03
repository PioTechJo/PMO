-- Adds an explicit, assignee-set due date on issues (separate from the
-- existing expectedDuration/createdAt-derived "due date" shown on internal
-- tasks - this one is a real date the assignee picks themselves, used
-- specifically for Client Portal (customer-originated) tasks).
--
-- Once a due date is set, only a Manager can change it - enforced here at
-- the DB level via a trigger (RLS alone can't do column-level "who set
-- this last" locking), so it can't be bypassed by calling the API
-- directly.

alter table public.issues add column if not exists due_date date;

create or replace function public.enforce_due_date_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.due_date is distinct from old.due_date then
    if old.due_date is not null and public.get_user_role(auth.uid()) <> 'Manager' then
      raise exception 'Only a Manager can change a due date once it has been set.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_due_date_lock on public.issues;
create trigger trg_enforce_due_date_lock
before update on public.issues
for each row execute function public.enforce_due_date_lock();
