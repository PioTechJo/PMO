-- The new "TopManagement" user type (added in the app's role-permissions
-- config) can now navigate to Dashboard/Overview/Tasks Overview/Maintenance
-- Overview/Reports client-side, but those screens still came back empty:
-- the underlying RLS SELECT policies on projects/activities/issues only
-- ever allowed 'Manager' (via get_user_role, which reads the `role` column
-- - always 'Manager' or 'User', never the finer-grained `type`) or the
-- owning PM (project_manager_id = auth.uid()). TopManagement users have
-- role='User' and aren't a project's PM, so they matched neither branch
-- and every query returned zero rows.
--
-- Fix: add additive, read-only SELECT policies (Postgres ORs all
-- permissive policies together) granting TopManagement visibility via
-- get_user_type(), the existing helper that reads the `type` column -
-- which invite-user already sets to 'TopManagement' correctly. No new
-- insert/update/delete access is granted; this role stays read-only.

create policy "Top Management can view all projects"
on public.projects
for select
to authenticated
using (public.get_user_type(auth.uid()) = 'TopManagement');

create policy "Top Management can view all milestones"
on public.activities
for select
to authenticated
using (public.get_user_type(auth.uid()) = 'TopManagement');

create policy "Top Management can view all issues"
on public.issues
for select
to authenticated
using (public.get_user_type(auth.uid()) = 'TopManagement');
