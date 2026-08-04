-- A project can now be tagged with multiple products (was a single
-- product_id FK on projects, which also had no UI to set it at all). Adds a
-- junction table; the old projects.product_id column is left untouched for
-- backward compatibility but the app no longer reads/writes it.

create table if not exists public.project_products (
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (project_id, product_id)
);

alter table public.project_products enable row level security;

-- Mirrors the projects table's own visibility rule exactly.
drop policy if exists "Scoped project_products visibility" on public.project_products;
create policy "Scoped project_products visibility"
on public.project_products
for select
to authenticated
using (
  project_id in (
    select id from public.projects
    where public.get_user_role(auth.uid()) = 'Manager'
       or public.get_user_type(auth.uid()) = 'TasksAdmin'
       or project_manager_id = auth.uid()
  )
);

drop policy if exists "PMs and Managers can manage project_products" on public.project_products;
create policy "PMs and Managers can manage project_products"
on public.project_products
for all
to authenticated
using (
  project_id in (
    select id from public.projects
    where public.get_user_role(auth.uid()) = 'Manager'
       or project_manager_id = auth.uid()
  )
)
with check (
  project_id in (
    select id from public.projects
    where public.get_user_role(auth.uid()) = 'Manager'
       or project_manager_id = auth.uid()
  )
);

-- Backfill: carry over any existing single product_id so nothing already
-- set is lost.
insert into public.project_products (project_id, product_id)
select id, product_id from public.projects where product_id is not null
on conflict do nothing;
