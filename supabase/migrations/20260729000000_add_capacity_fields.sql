-- Phase 1 of the resource/KPI dashboard effort: add the minimum schema fields
-- needed before any real utilization/performance KPI can be computed.
-- Deliberately narrow in scope - see conversation for the full list of KPIs
-- that remain blocked pending further schema/process work (department is a
-- free-text field here, not a lookup table, matching users.type's existing
-- pattern; a proper departments lookup can follow later if needed).

-- ============================================================================
-- 1. users.department - lets "by department" grouping/reporting exist at all.
-- ============================================================================
alter table public.users
  add column if not exists department text;

-- ============================================================================
-- 2. issues.estimated_hours - hour-level estimate alongside the existing
--    day-level expected_duration, needed for any utilization/capacity math.
-- ============================================================================
alter table public.issues
  add column if not exists estimated_hours numeric;

-- ============================================================================
-- 3. issues.completed_at - actual completion timestamp, required for
--    resolution time / cycle time KPIs. Set automatically by trigger rather
--    than left to the client, so it can't be forgotten or backdated by the
--    app layer: whenever status transitions to Resolved/Closed it's stamped
--    with now() (if not already set), and clearing the status back to
--    Open/In Progress clears it again so reopened issues don't keep a stale
--    completion time.
-- ============================================================================
alter table public.issues
  add column if not exists completed_at timestamptz;

create or replace function public.set_issue_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('Resolved', 'Closed') then
    if old.status not in ('Resolved', 'Closed') then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_issue_completed_at on public.issues;
create trigger trg_set_issue_completed_at
before update on public.issues
for each row
when (new.status is distinct from old.status)
execute function public.set_issue_completed_at();

-- Backfill: issues already Resolved/Closed get completed_at = created_at as a
-- best-effort baseline (the real completion time was never recorded), so
-- historical rows aren't left null and skewing early KPI averages to zero.
update public.issues
set completed_at = created_at
where status in ('Resolved', 'Closed') and completed_at is null;
