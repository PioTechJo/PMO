-- A task can optionally be tagged with one of the products already
-- assigned to its project (via project_products, added in the previous
-- migration).

alter table public.issues
  add column if not exists product_id uuid references public.products(id) on delete set null;
