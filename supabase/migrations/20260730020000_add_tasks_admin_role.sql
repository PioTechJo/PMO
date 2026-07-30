-- New "TasksAdmin" user type: sees and manages every task/issue across every
-- project (same reach as Manager, but ONLY for issues/issue_comments - no
-- access to projects, milestones, or payments). Extends the existing scoped
-- issue policies from 20260730000000_rls_security_overhaul.sql with an
-- explicit TasksAdmin check, using the get_user_type() helper from that
-- same migration.

drop policy if exists "Scoped issue visibility" on public.issues;
create policy "Scoped issue visibility"
on public.issues
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

drop policy if exists "Scoped issue updates" on public.issues;
create policy "Scoped issue updates"
on public.issues
for update
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
)
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or assignee_id = auth.uid()
  or reporter_id = auth.uid()
  or project_id in (select id from public.projects where project_manager_id = auth.uid())
);

drop policy if exists "Scoped comment visibility" on public.issue_comments;
create policy "Scoped comment visibility"
on public.issue_comments
for select
to authenticated
using (
  issue_id in (
    select id from public.issues
    where public.get_user_role(auth.uid()) = 'Manager'
       or public.get_user_type(auth.uid()) = 'TasksAdmin'
       or assignee_id = auth.uid()
       or reporter_id = auth.uid()
       or project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
);
