-- The PM explicitly asked to see ONLY tasks that belong to projects they
-- manage (internal or customer-originated alike) - nothing else, even if
-- they happen to be personally the assignee or reporter on a task that
-- lives in a project they don't manage.
--
-- The existing "Scoped issue visibility"/"Scoped issue updates"/"Scoped
-- comment visibility" policies (20260730000000, extended by
-- 20260730020000 for TasksAdmin) OR project ownership together with
-- "assignee_id = auth.uid() or reporter_id = auth.uid()" for EVERYONE,
-- including PMs. That escape hatch is intentional for PS/Staff/other
-- non-PM roles (it's how MyTasks.tsx works for them) but for a PM it was
-- leaking visibility into tasks outside their own projects whenever they
-- were personally tagged as assignee/reporter on them.
--
-- Fix: split the rule so a PM (get_user_type() = 'PM') is scoped strictly
-- by project ownership, while every other non-Manager/non-TasksAdmin role
-- keeps the previous broader OR (project ownership OR personal
-- assignment). Manager/TasksAdmin/TopManagement are unaffected.

drop policy if exists "Scoped issue visibility" on public.issues;
create policy "Scoped issue visibility"
on public.issues
for select
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or (
    public.get_user_type(auth.uid()) = 'PM'
    and project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
  or (
    public.get_user_type(auth.uid()) is distinct from 'PM'
    and (
      assignee_id = auth.uid()
      or reporter_id = auth.uid()
      or project_id in (select id from public.projects where project_manager_id = auth.uid())
    )
  )
);

drop policy if exists "Scoped issue updates" on public.issues;
create policy "Scoped issue updates"
on public.issues
for update
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or (
    public.get_user_type(auth.uid()) = 'PM'
    and project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
  or (
    public.get_user_type(auth.uid()) is distinct from 'PM'
    and (
      assignee_id = auth.uid()
      or reporter_id = auth.uid()
      or project_id in (select id from public.projects where project_manager_id = auth.uid())
    )
  )
)
with check (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
  or (
    public.get_user_type(auth.uid()) = 'PM'
    and project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
  or (
    public.get_user_type(auth.uid()) is distinct from 'PM'
    and (
      assignee_id = auth.uid()
      or reporter_id = auth.uid()
      or project_id in (select id from public.projects where project_manager_id = auth.uid())
    )
  )
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
       or (
         public.get_user_type(auth.uid()) = 'PM'
         and project_id in (select id from public.projects where project_manager_id = auth.uid())
       )
       or (
         public.get_user_type(auth.uid()) is distinct from 'PM'
         and (
           assignee_id = auth.uid()
           or reporter_id = auth.uid()
           or project_id in (select id from public.projects where project_manager_id = auth.uid())
         )
       )
  )
);
