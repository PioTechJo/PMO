-- Let TasksAdmin delete tasks too (same reach as Manager for issues), not
-- just Manager.

drop policy if exists "Only Managers can delete issues" on public.issues;
create policy "Managers and TasksAdmin can delete issues"
on public.issues
for delete
to authenticated
using (
  public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
);
