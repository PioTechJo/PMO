-- Re-applies (idempotently) the Storage RLS policies for the
-- issue-attachments bucket, in case the earlier migration
-- (20260910000000_issue_attachments.sql) didn't fully apply - e.g. if the
-- bucket insert or an earlier statement errored and the SQL editor stopped
-- partway through, silently leaving files unreadable/undownloadable for
-- anyone who isn't the uploader.

insert into storage.buckets (id, name, public)
values ('issue-attachments', 'issue-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Scoped attachment file read" on storage.objects;
create policy "Scoped attachment file read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'issue-attachments'
  and public.can_access_issue((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Scoped attachment file upload" on storage.objects;
create policy "Scoped attachment file upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'issue-attachments'
  and public.can_access_issue((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Uploader or admin can delete attachment files" on storage.objects;
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
