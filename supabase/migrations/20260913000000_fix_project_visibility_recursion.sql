-- 20260912000000_assignee_project_visibility.sql caused "infinite recursion
-- detected in policy" (surfacing as blanket 500s on /projects, /issues,
-- /activities, etc. for every user) because its SELECT policy on
-- public.projects subqueried public.issues directly, while public.issues'
-- own SELECT policy subqueries public.projects right back - a circular
-- policy-to-policy reference. Same class of problem already solved once for
-- issue_attachments via a SECURITY DEFINER wrapper function
-- (can_access_issue() in 20260910000000_issue_attachments.sql) - apply the
-- same fix here: wrap the check in a SECURITY DEFINER function so the
-- inner query runs outside the caller's RLS evaluation instead of
-- re-triggering it.

drop policy if exists "Assignees and reporters can view projects they have a task in" on public.projects;

create or replace function public.user_has_issue_in_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.issues
    where project_id = p_project_id
      and (assignee_id = auth.uid() or reporter_id = auth.uid())
  );
$$;
grant execute on function public.user_has_issue_in_project(uuid) to authenticated;

create policy "Assignees and reporters can view projects they have a task in"
on public.projects
for select
to authenticated
using (public.user_has_issue_in_project(id));
