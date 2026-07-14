-- Fix maker-checker security gap: milestone due-date changes must require
-- Manager approval at the DATABASE level, not just in the frontend UI.
--
-- Root cause found in production RLS policies (via pg_policies audit):
--   activities                  | ALL   | authenticated | true / true
--   projects                    | ALL   | authenticated | true / true
--   notifications               | ALL   | public        | true / true
--   milestone_change_requests   | ALL   | public/auth   | true (x2 policies)
--   milestone_audit_logs        | ALL   | public/auth   | true (x2 policies)
--
-- Postgres OR's multiple permissive policies together, so these blanket
-- "true" ALL policies made every other scoped SELECT policy meaningless and
-- let any authenticated user read/write any row, including approving their
-- own milestone due-date change requests directly via the REST/JS client.
--
-- This migration:
--   1. Adds an is_manager() helper.
--   2. Replaces the blanket ALL policies on activities, milestone_change_requests,
--      milestone_audit_logs, and notifications with role- and ownership-scoped ones.
--   3. Adds a trigger that blocks any due_date change on activities unless the
--      acting user is a Manager (defense in depth, independent of RLS/app bugs).
--   4. Adds two SECURITY DEFINER RPCs (request_milestone_change,
--      resolve_milestone_change_request) that perform the multi-table
--      maker-checker workflow atomically, with the role check enforced
--      server-side.
--
-- NOTE: projects table has the same "ALL/true" pattern but was out of scope
-- for this ticket (broad project visibility may be intentional for
-- dashboards) - flagged for a separate follow-up, not touched here.

-- ============================================================================
-- 1. Helper: is the given user a Manager?
-- ============================================================================
create or replace function public.is_manager(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and (u.role = 'Manager' or u.type = 'Manager')
  );
$$;

grant execute on function public.is_manager(uuid) to authenticated;

-- ============================================================================
-- 2. activities: replace blanket ALL policy with scoped INSERT/UPDATE/DELETE
--    (existing scoped SELECT policy "Users can only see activities from
--    their own projects" is left untouched).
-- ============================================================================
drop policy if exists "Allow authenticated access to activities" on public.activities;

create policy "PMs and Managers can insert activities for their projects"
on public.activities
for insert
to authenticated
with check (
  public.is_manager(auth.uid())
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

create policy "PMs and Managers can update activities for their projects"
on public.activities
for update
to authenticated
using (
  public.is_manager(auth.uid())
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
)
with check (
  public.is_manager(auth.uid())
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

create policy "Only Managers can delete activities"
on public.activities
for delete
to authenticated
using (public.is_manager(auth.uid()));

-- Column-level protection: due_date can only ever change if the acting user
-- is a Manager. This holds even if a future change reintroduces a permissive
-- RLS policy, and it blocks the existing updateMilestone() client function
-- from being used to bypass the change-request workflow.
create or replace function public.protect_activity_due_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.due_date is distinct from old.due_date then
    if not public.is_manager(auth.uid()) then
      raise exception 'Only a Manager can change a milestone due date. Submit a change request instead.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_activity_due_date on public.activities;
create trigger trg_protect_activity_due_date
before update on public.activities
for each row
execute function public.protect_activity_due_date();

-- ============================================================================
-- 3. milestone_change_requests: replace blanket ALL policies. All writes now
--    go through the SECURITY DEFINER RPCs below, which bypass RLS as the
--    table owner - so only SELECT policies are needed here, direct
--    INSERT/UPDATE/DELETE from the client are denied by default.
-- ============================================================================
drop policy if exists "Allow authenticated users access to change requests" on public.milestone_change_requests;
drop policy if exists "Allow all for authenticated users" on public.milestone_change_requests;

create policy "Requesters, project PMs and Managers can view change requests"
on public.milestone_change_requests
for select
to authenticated
using (
  public.is_manager(auth.uid())
  or requested_by = auth.uid()
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

-- ============================================================================
-- 4. milestone_audit_logs: same pattern - read-only from the client, all
--    writes happen inside the RPCs.
-- ============================================================================
drop policy if exists "Allow authenticated users access to audit logs" on public.milestone_audit_logs;
drop policy if exists "Allow all for authenticated users" on public.milestone_audit_logs;

create policy "Requesters, project PMs and Managers can view audit logs"
on public.milestone_audit_logs
for select
to authenticated
using (
  public.is_manager(auth.uid())
  or user_id = auth.uid()
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

-- ============================================================================
-- 5. notifications: was ALL/true for the `public` role (any client, even
--    anonymous, with table grants). Scope reads/updates to the owning user;
--    inserts stay open since several flows legitimately notify other users
--    (issue assignment, manager alerts) - the RPCs below cover the
--    milestone-related ones server-side.
-- ============================================================================
drop policy if exists "Allow all access to notifications" on public.notifications;

create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Authenticated users can create notifications"
on public.notifications
for insert
to authenticated
with check (true);

-- ============================================================================
-- 6. RPC: request_milestone_change - PM (or Manager) requests a due-date
--    change. Atomic insert of request + audit log + manager notifications.
-- ============================================================================
create or replace function public.request_milestone_change(
  p_milestone_id uuid,
  p_new_due_date date,
  p_reason text
)
returns public.milestone_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity record;
  v_request public.milestone_change_requests;
begin
  select a.id, a.title, a.due_date, a.project_id, p.project_manager_id
  into v_activity
  from public.activities a
  join public.projects p on p.id = a.project_id
  where a.id = p_milestone_id;

  if not found then
    raise exception 'Milestone not found';
  end if;

  if not (public.is_manager(auth.uid()) or v_activity.project_manager_id = auth.uid()) then
    raise exception 'Not authorized to request a change for this milestone';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A justification is required';
  end if;

  insert into public.milestone_change_requests
    (milestone_id, requested_by, old_due_date, new_due_date, reason, status)
  values
    (p_milestone_id, auth.uid(), v_activity.due_date, p_new_due_date, p_reason, 'pending')
  returning * into v_request;

  insert into public.milestone_audit_logs
    (milestone_id, user_id, action, field_name, old_value, new_value)
  values
    (p_milestone_id, auth.uid(), 'requested_change', 'due_date',
     v_activity.due_date::text, p_new_due_date::text);

  insert into public.notifications (user_id, title, message, type, link_id)
  select
    u.id,
    'Milestone Change Requested',
    'A change has been requested for milestone: ' || coalesce(v_activity.title, 'N/A'),
    'milestone_change_requested',
    p_milestone_id
  from public.users u
  where u.role = 'Manager' or u.type = 'Manager';

  return v_request;
end;
$$;

grant execute on function public.request_milestone_change(uuid, date, text) to authenticated;

-- ============================================================================
-- 7. RPC: resolve_milestone_change_request - Manager-only approve/reject.
--    Atomically updates the request, the milestone due_date (on approval),
--    the audit log, and notifies the requester.
-- ============================================================================
create or replace function public.resolve_milestone_change_request(
  p_request_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns public.milestone_change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.milestone_change_requests;
  v_title text;
begin
  if not public.is_manager(auth.uid()) then
    raise exception 'Only a Manager can approve or reject milestone change requests';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  select * into v_req
  from public.milestone_change_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Change request not found';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'This change request has already been resolved';
  end if;

  if p_decision = 'rejected' and (p_rejection_reason is null or length(trim(p_rejection_reason)) = 0) then
    raise exception 'A rejection reason is required';
  end if;

  select title into v_title from public.activities where id = v_req.milestone_id;

  if p_decision = 'approved' then
    update public.activities set due_date = v_req.new_due_date where id = v_req.milestone_id;
  end if;

  update public.milestone_change_requests
  set status = p_decision,
      approved_by = auth.uid(),
      approval_date = now(),
      rejection_reason = case when p_decision = 'rejected' then p_rejection_reason else null end
  where id = p_request_id
  returning * into v_req;

  insert into public.milestone_audit_logs
    (milestone_id, user_id, action, field_name, old_value, new_value)
  values
    (v_req.milestone_id, auth.uid(), p_decision || '_change', 'due_date',
     v_req.old_due_date::text, v_req.new_due_date::text);

  insert into public.notifications (user_id, title, message, type, link_id)
  values (
    v_req.requested_by,
    case when p_decision = 'approved' then 'Milestone Change Approved' else 'Milestone Change Rejected' end,
    case when p_decision = 'approved'
      then 'Your requested change for milestone due date has been approved.'
      else 'Your requested change for milestone due date was rejected: ' || coalesce(p_rejection_reason, '')
    end,
    'milestone_change_result',
    v_req.milestone_id
  );

  return v_req;
end;
$$;

grant execute on function public.resolve_milestone_change_request(uuid, text, text) to authenticated;

-- ============================================================================
-- 8. RPC: replace_lookup_items - atomic delete+upsert for lookup tables
--    (was two sequential unguarded client calls in updateLookups(), so a
--    failed upsert could leave the table with rows deleted and nothing
--    restored). The whole function body runs as one transaction.
-- ============================================================================
create or replace function public.replace_lookup_items(p_table text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[] := array['countries', 'categories', 'teams', 'products', 'project_statuses', 'customers'];
begin
  if not (p_table = any(v_allowed)) then
    raise exception 'Invalid lookup table: %', p_table;
  end if;

  if jsonb_array_length(p_items) > 0 then
    execute format(
      'delete from public.%I where id not in (select (value->>''id'')::uuid from jsonb_array_elements($1) as value)',
      p_table
    ) using p_items;
  end if;

  execute format(
    'insert into public.%I (id, name) select (value->>''id'')::uuid, value->>''name'' from jsonb_array_elements($1) as value on conflict (id) do update set name = excluded.name',
    p_table
  ) using p_items;
end;
$$;

grant execute on function public.replace_lookup_items(text, jsonb) to authenticated;
