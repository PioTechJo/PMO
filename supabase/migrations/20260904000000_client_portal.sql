-- Client Portal: external users linked to a Customer can log in, file
-- Issues (Bug/Change Request/Inquiry) against their own customer's
-- projects, and comment on them. The 'Client' user type already existed
-- as a selectable option in Team.tsx's invite form but was wired into no
-- permission/RLS logic anywhere (see the RLS overhaul migration's own
-- comment: "Client/Staff are not yet used by any view in the app").

alter table public.users add column if not exists customer_id uuid references public.customers(id);

create or replace function public.get_user_customer_id(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.users where id = p_user_id;
$$;

grant execute on function public.get_user_customer_id(uuid) to authenticated;

-- Clients can see only their own linked customer's projects (needed to
-- populate the project picker when filing an issue). Additive/permissive -
-- doesn't touch the existing Manager/PM select policies.
create policy "Clients can view their own customer's projects"
on public.projects
for select
to authenticated
using (
  public.get_user_type(auth.uid()) = 'Client'
  and customer_id = public.get_user_customer_id(auth.uid())
);

-- Replace the wide-open issues INSERT policy with one that still allows
-- internal staff freely, but requires a Client to (a) file as themselves
-- and (b) only against a project tied to their own linked customer.
drop policy if exists "Authenticated users can create issues" on public.issues;
create policy "Scoped issue creation"
on public.issues
for insert
to authenticated
with check (
  public.get_user_type(auth.uid()) <> 'Client'
  or (
    reporter_id = auth.uid()
    and project_id in (
      select id from public.projects where customer_id = public.get_user_customer_id(auth.uid())
    )
  )
);

-- issue_comments INSERT wasn't touched by the prior RLS overhaul (only
-- SELECT was re-scoped there) - add an explicit policy so a Client can
-- comment on issues they can already see (reporter/assignee/PM/Manager),
-- matching the existing "Scoped comment visibility" SELECT policy's logic.
drop policy if exists "Authenticated users can comment on visible issues" on public.issue_comments;
create policy "Authenticated users can comment on visible issues"
on public.issue_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and issue_id in (
    select id from public.issues where
      public.get_user_role(auth.uid()) = 'Manager'
      or assignee_id = auth.uid()
      or reporter_id = auth.uid()
      or project_id in (select id from public.projects where project_manager_id = auth.uid())
  )
);
