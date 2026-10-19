-- New "CFO" user type: sees the Payments page only (project + payment
-- milestone data), strictly read-only. The app's role-permissions config
-- limits the CFO to the 'payments' view; this migration gives the
-- underlying RLS the matching read access. Same pattern as the
-- TopManagement migration: additive SELECT policies keyed on
-- get_user_type(), which reads users.type (set by invite-user).
-- No insert/update/delete policy is granted, so the CFO cannot change
-- projects or milestones (including payment status) even via the API.

drop policy if exists "CFO can view all projects" on public.projects;
create policy "CFO can view all projects"
on public.projects
for select
to authenticated
using (public.get_user_type(auth.uid()) = 'CFO');

drop policy if exists "CFO can view all milestones" on public.activities;
create policy "CFO can view all milestones"
on public.activities
for select
to authenticated
using (public.get_user_type(auth.uid()) = 'CFO');
