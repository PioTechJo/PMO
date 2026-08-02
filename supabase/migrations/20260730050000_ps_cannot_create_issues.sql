-- PS can only comment and change status on tasks assigned to them - they
-- should never be able to create new tasks (that's now hidden in the UI,
-- this is the matching DB-level enforcement so it can't be bypassed by
-- calling the API directly).

drop policy if exists "Authenticated users can create issues" on public.issues;
create policy "Everyone except PS can create issues"
on public.issues
for insert
to authenticated
with check (public.get_user_type(auth.uid()) <> 'PS');
