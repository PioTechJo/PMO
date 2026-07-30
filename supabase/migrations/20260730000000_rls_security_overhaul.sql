-- Full RLS security overhaul. Triggered by a live audit (pg_policies) that
-- showed several tables wide open ("Allow all ... true/true" PERMISSIVE
-- policies) even where a properly-scoped policy already existed alongside
-- them - Postgres ORs all permissive policies together, so the blanket one
-- silently won every time. The 2026-07-14 maker-checker migration was meant
-- to have already fixed activities/notifications/milestone_change_requests/
-- milestone_audit_logs, but the live audit shows those same open policies
-- still present - that migration was apparently never actually applied to
-- this database (only committed to the repo), so this file re-applies it
-- alongside the new fixes rather than assuming it's already in effect.
--
-- Access model (role = Manager acts as "Admin" here - there is no separate
-- Admin value in the data, Manager already means "sees everything" per the
-- existing get_user_role() usage on projects/activities):
--   Manager -> sees/manages everything
--   PM      -> sees only their own projects, and issues/milestones/payment
--              history that belong to those projects
--   PS      -> sees only issues assigned to them
--   (Client/Staff are not yet used by any view in the app - not scoped here)

-- ============================================================================
-- 0. Helper: get a user's `type` (PM/PS/Client/Staff), mirroring the existing
--    get_user_role() helper already used for the Manager check.
-- ============================================================================
create or replace function public.get_user_type(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select type from public.users where id = p_user_id;
$$;

grant execute on function public.get_user_type(uuid) to authenticated;

-- ============================================================================
-- 1. issues - was completely open ("Allow all access to issues", ALL/true).
--    New rule: Manager sees all; PM sees issues in their own projects;
--    PS/reporter sees only issues assigned to or reported by them.
-- ============================================================================
drop policy if exists "Allow all access to issues" on public.issues;

create policy "Scoped issue visibility"
on public.issues
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

create policy "Authenticated users can create issues"
on public.issues
for insert
to authenticated
with check (true);

create policy "Scoped issue updates"
on public.issues
for update
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
)
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

create policy "Only Managers can delete issues"
on public.issues
for delete
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

-- issue_comments: was fully open for SELECT ("Everyone can view comments",
-- true). Scope reads to whoever can see the parent issue.
drop policy if exists "Everyone can view comments" on public.issue_comments;

create policy "Scoped comment visibility"
on public.issue_comments
for select
to authenticated
using (
  issue_id in (
    select id from public.issues
    -- re-derive the same visibility rule inline (policies can't call
    -- another table's policy directly)
    where public.get_user_role(auth.uid()) = 'Manager'
       or assignee_id = auth.uid()
       or reporter_id = auth.uid()
       or project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
);

-- ============================================================================
-- 2. projects / activities (milestones) - each already has a correctly
--    scoped SELECT policy, but it was being neutralized by a sibling
--    ALL/true policy. Drop the blanket ones; keep the scoped SELECT; add
--    properly scoped write policies.
-- ============================================================================
drop policy if exists "Allow authenticated access to projects" on public.projects;
drop policy if exists "Allow authenticated users to insert new projects" on public.projects;
drop policy if exists "Allow authenticated users to view all projects" on public.projects;

create policy "PMs and Managers can insert projects"
on public.projects
for insert
to authenticated
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_manager_id = auth.uid()
);

create policy "PMs and Managers can update their projects"
on public.projects
for update
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_manager_id = auth.uid()
)
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_manager_id = auth.uid()
);

create policy "Only Managers can delete projects"
on public.projects
for delete
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

drop policy if exists "Allow authenticated access to activities" on public.activities;

-- (INSERT/UPDATE/DELETE policies for activities already exist from the
-- 2026-07-14 migration below - re-applied since that migration never took
-- effect on this database.)
drop policy if exists "PMs and Managers can insert activities for their projects" on public.activities;
create policy "PMs and Managers can insert activities for their projects"
on public.activities
for insert
to authenticated
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

drop policy if exists "PMs and Managers can update activities for their projects" on public.activities;
create policy "PMs and Managers can update activities for their projects"
on public.activities
for update
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
)
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

drop policy if exists "Only Managers can delete activities" on public.activities;
create policy "Only Managers can delete activities"
on public.activities
for delete
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

-- ============================================================================
-- 3. payment_status_history - was the worst offender: 7 overlapping
--    policies, all unconditionally true for any authenticated user.
--    Consolidate into read/insert scoped to the owning project's PM (or
--    Manager) via the milestone (activities) the history row belongs to.
-- ============================================================================
drop policy if exists "Allow all authenticated to read payment history" on public.payment_status_history;
drop policy if exists "Allow authenticated to insert payment history" on public.payment_status_history;
drop policy if exists "Allow insert payment history" on public.payment_status_history;
drop policy if exists "Allow read payment history" on public.payment_status_history;
drop policy if exists "Enable all for authenticated users" on public.payment_status_history;
drop policy if exists "Enable insert access for authenticated users" on public.payment_status_history;
drop policy if exists "Enable read access for all users" on public.payment_status_history;
drop policy if exists "Users can insert payment status history" on public.payment_status_history;
drop policy if exists "Users can view payment status history" on public.payment_status_history;

create policy "Scoped payment history visibility"
on public.payment_status_history
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

create policy "PMs and Managers can log payment history"
on public.payment_status_history
for insert
to authenticated
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

-- ============================================================================
-- 4. Re-apply the 2026-07-14 maker-checker fixes (notifications,
--    milestone_change_requests, milestone_audit_logs) - confirmed via
--    pg_policies that the old blanket policies these were meant to replace
--    are still live, so that migration never actually ran here.
-- ============================================================================
drop policy if exists "Allow all access to notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Authenticated users can create notifications" on public.notifications;
create policy "Authenticated users can create notifications"
on public.notifications
for insert
to authenticated
with check (true);

drop policy if exists "Allow all for authenticated users" on public.milestone_change_requests;
drop policy if exists "Allow authenticated users access to change requests" on public.milestone_change_requests;
drop policy if exists "Requesters, project PMs and Managers can view change requests" on public.milestone_change_requests;
create policy "Requesters, project PMs and Managers can view change requests"
on public.milestone_change_requests
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or requested_by = auth.uid()
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

drop policy if exists "Allow all for authenticated users" on public.milestone_audit_logs;
drop policy if exists "Allow authenticated users access to audit logs" on public.milestone_audit_logs;
drop policy if exists "Requesters, project PMs and Managers can view audit logs" on public.milestone_audit_logs;
create policy "Requesters, project PMs and Managers can view audit logs"
on public.milestone_audit_logs
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or user_id = auth.uid()
  or milestone_id in (
    select a.id from public.activities a
    join public.projects p on p.id = a.project_id
    where p.project_manager_id = auth.uid()
  )
);

-- ============================================================================
-- 5. users - "Everyone can view profiles" ran for the `public` role (i.e.
--    unauthenticated too, not just authenticated). Names/avatars/type aren't
--    highly sensitive and the whole UI depends on reading them broadly (
--    assignee dropdowns, PM lists, etc.), so keep SELECT broad but require
--    at least authentication.
-- ============================================================================
drop policy if exists "Everyone can view profiles" on public.users;
drop policy if exists "Allow authenticated read access to users" on public.users;
drop policy if exists "Allow authenticated users to view users" on public.users;
create policy "Authenticated users can view profiles"
on public.users
for select
to authenticated
using (true);
