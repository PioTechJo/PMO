-- Daily overdue-task reminder notifications. Runs entirely in Postgres via
-- pg_cron (no edge function needed) so it fires even if nobody has the app
-- open.
--
-- Due date logic mirrors the frontend's getDueDate()/skipWeekend() exactly:
-- created_at + expected_duration calendar days, then a single nudge forward
-- if that lands on Friday (+2, to Sunday) or Saturday (+1, to Sunday) - NOT
-- full business-day counting across the whole span.

create extension if not exists pg_cron;

alter table public.issues
  add column if not exists last_overdue_notified_at timestamptz;

create or replace function public.compute_issue_due_date(p_created_at timestamptz, p_expected_duration int)
returns date
language sql
immutable
as $$
  select case
    when p_expected_duration is null then null
    else (
      case extract(dow from (p_created_at::date + p_expected_duration))
        when 5 then p_created_at::date + p_expected_duration + 2 -- Friday -> Sunday
        when 6 then p_created_at::date + p_expected_duration + 1 -- Saturday -> Sunday
        else p_created_at::date + p_expected_duration
      end
    )
  end;
$$;

create or replace function public.notify_overdue_issues()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, message, type, link_id)
  select
    i.assignee_id,
    'Overdue Task',
    '"' || i.title || '" was due on ' || to_char(public.compute_issue_due_date(i.created_at, i.expected_duration), 'Mon DD') || ' and is still open.',
    'status_change',
    i.id
  from public.issues i
  where i.assignee_id is not null
    and i.status in ('Open', 'In Progress')
    and i.expected_duration is not null
    and public.compute_issue_due_date(i.created_at, i.expected_duration) < current_date
    and (i.last_overdue_notified_at is null or i.last_overdue_notified_at < now() - interval '24 hours');

  update public.issues
  set last_overdue_notified_at = now()
  where assignee_id is not null
    and status in ('Open', 'In Progress')
    and expected_duration is not null
    and public.compute_issue_due_date(created_at, expected_duration) < current_date
    and (last_overdue_notified_at is null or last_overdue_notified_at < now() - interval '24 hours');
end;
$$;

-- Runs every weekday morning at 8:00 UTC. Adjust the schedule/timezone to
-- taste - this just needs to happen at most once a day. Unschedule first so
-- re-running this migration doesn't create a duplicate job.
do $$
begin
  perform cron.unschedule('notify-overdue-issues-daily');
exception when others then
  null; -- job didn't exist yet - fine
end $$;

select cron.schedule(
  'notify-overdue-issues-daily',
  '0 8 * * 0-4',
  $$select public.notify_overdue_issues();$$
);
