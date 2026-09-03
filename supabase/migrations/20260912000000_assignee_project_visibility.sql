-- A PS/Dev/Staff assignee could already see an issue assigned to them
-- (issues RLS includes "assignee_id = auth.uid()"), but the projects table
-- RLS only ever granted visibility to Manager and the project's own PM -
-- never to a plain assignee/reporter who isn't the PM. Since the client
-- fetches `projects` and `issues` as two separate arrays and joins them
-- client-side, an assignee whose task lives on a project they don't
-- manage got issue.project === undefined and the UI fell back to
-- "Unknown Project" - even though they could already see the task itself.
--
-- Fix: an additive, read-only SELECT policy granting visibility to a
-- project's row whenever the caller is the assignee or reporter of an
-- issue that belongs to it. This exposes nothing beyond what the caller
-- can already infer from the issue's project_id/project name shown
-- elsewhere - it does not grant milestones/payments/edit access.

create policy "Assignees and reporters can view projects they have a task in"
on public.projects
for select
to authenticated
using (
  id in (
    select project_id from public.issues
    where assignee_id = auth.uid() or reporter_id = auth.uid()
  )
);
