-- Replaces the blanket "Client sees every project of their linked customer"
-- rule with precise per-project access: a Manager picks exactly which
-- project(s) a Client user can see when inviting them, supporting a
-- customer with several projects where the same portal user shouldn't
-- necessarily see all of them.

create table public.client_project_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index client_project_access_user_id_idx on public.client_project_access(user_id);
create index client_project_access_project_id_idx on public.client_project_access(project_id);

alter table public.client_project_access enable row level security;

create policy "Managers can manage client project access"
on public.client_project_access
for all
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager')
with check (public.get_user_role(auth.uid()) = 'Manager');

create policy "Clients can view their own project access rows"
on public.client_project_access
for select
to authenticated
using (user_id = auth.uid());

-- Replace the customer-wide projects SELECT policy with a precise,
-- per-project one.
drop policy if exists "Clients can view their own customer's projects" on public.projects;
create policy "Clients can view their explicitly granted projects"
on public.projects
for select
to authenticated
using (
  public.get_user_type(auth.uid()) = 'Client'
  and id in (select project_id from public.client_project_access where user_id = auth.uid())
);

-- Replace the customer-wide issues INSERT check the same way.
drop policy if exists "Scoped issue creation" on public.issues;
create policy "Scoped issue creation"
on public.issues
for insert
to authenticated
with check (
  public.get_user_type(auth.uid()) <> 'Client'
  or (
    reporter_id = auth.uid()
    and project_id in (select project_id from public.client_project_access where user_id = auth.uid())
  )
);
