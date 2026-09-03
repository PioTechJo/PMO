-- Adds file attachments on tasks/issues (internal and Client Portal alike).
-- A private Storage bucket holds the actual files; a metadata table tracks
-- who uploaded what against which issue. Visibility for both the metadata
-- table and the storage objects reuses the exact same "can this user see
-- this issue" rule already enforced on public.issues/issue_comments
-- (20260907000000_scope_pm_issues_to_own_projects.sql) - pulled into a
-- single helper function so it isn't duplicated a third time.

create or replace function public.can_access_issue(p_issue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.issues
    where id = p_issue_id
      and (
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
  );
$$;
grant execute on function public.can_access_issue(uuid) to authenticated;

create table public.issue_attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  uploaded_by uuid references public.users(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);
create index issue_attachments_issue_id_idx on public.issue_attachments(issue_id);

alter table public.issue_attachments enable row level security;

create policy "Scoped attachment visibility"
on public.issue_attachments
for select
to authenticated
using (public.can_access_issue(issue_id));

create policy "Scoped attachment insert"
on public.issue_attachments
for insert
to authenticated
with check (public.can_access_issue(issue_id) and uploaded_by = auth.uid());

create policy "Uploader or admin can delete attachments"
on public.issue_attachments
for delete
to authenticated
using (
  uploaded_by = auth.uid()
  or public.get_user_role(auth.uid()) = 'Manager'
  or public.get_user_type(auth.uid()) = 'TasksAdmin'
);

-- Private bucket - files are only ever reached via short-lived signed URLs
-- generated server-side after the RLS check on issue_attachments passes.
insert into storage.buckets (id, name, public)
values ('issue-attachments', 'issue-attachments', false)
on conflict (id) do nothing;

-- Objects are stored as "<issue_id>/<timestamp>_<filename>" - the first
-- path segment is the issue id, checked against the same visibility rule.
create policy "Scoped attachment file read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'issue-attachments'
  and public.can_access_issue((storage.foldername(name))[1]::uuid)
);

create policy "Scoped attachment file upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-attachments'
  and public.can_access_issue((storage.foldername(name))[1]::uuid)
);

create policy "Uploader or admin can delete attachment files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'issue-attachments'
  and (
    owner = auth.uid()
    or public.get_user_role(auth.uid()) = 'Manager'
    or public.get_user_type(auth.uid()) = 'TasksAdmin'
  )
);
