-- Expands `customers` from a bare {id, name} lookup into a real CRM record
-- (contact info, industry, tier, status, internal owner) and adds a
-- customer_contacts table for multiple named contacts per customer.
--
-- The only known write path for `customers` until now was the security
-- definer replace_lookup_items() RPC (see 20260714120000_maker_checker_rls_fix.sql),
-- which bypasses table RLS entirely. The new direct addCustomer/updateCustomer/
-- deleteCustomer calls do NOT bypass RLS, so this migration defensively
-- (re)creates the read/write policies rather than assuming they already exist.

alter table public.customers
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists industry text,
  add column if not exists tier text check (tier in ('VIP', 'Standard', 'Other')) default 'Standard',
  add column if not exists status text check (status in ('active', 'prospect', 'churned')) default 'active',
  add column if not exists owner_id uuid references public.users(id);

alter table public.customers enable row level security;

drop policy if exists "Authenticated users can view customers" on public.customers;
create policy "Authenticated users can view customers"
on public.customers for select to authenticated using (true);

drop policy if exists "Authenticated users can manage customers" on public.customers;
create policy "Authenticated users can manage customers"
on public.customers for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update customers" on public.customers;
create policy "Authenticated users can update customers"
on public.customers for update to authenticated using (true) with check (true);

drop policy if exists "Only Managers can delete customers" on public.customers;
create policy "Only Managers can delete customers"
on public.customers for delete to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index customer_contacts_customer_id_idx on public.customer_contacts(customer_id);

alter table public.customer_contacts enable row level security;

create policy "Authenticated users can view customer contacts"
on public.customer_contacts for select to authenticated using (true);

create policy "Authenticated users can manage customer contacts"
on public.customer_contacts for insert to authenticated with check (true);

create policy "Authenticated users can update customer contacts"
on public.customer_contacts for update to authenticated using (true) with check (true);

create policy "Only Managers can delete customer contacts"
on public.customer_contacts for delete to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');
