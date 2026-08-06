-- Adds a per-customer activity log (call/meeting/email/visit/other + note)
-- so customer interactions can be tracked from the new Customer Profile
-- screen. Mirrors the RLS pattern from the 2026-07-30 security overhaul
-- (get_user_role() for the Manager-only checks).

create table public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('call', 'meeting', 'email', 'visit', 'other')),
  note text not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index customer_activities_customer_id_idx on public.customer_activities(customer_id);

alter table public.customer_activities enable row level security;

-- Reads are left open to any authenticated user, matching the current
-- access model for customers/maintenance_contracts (neither is scoped by
-- role or ownership today).
create policy "Authenticated users can view customer activities"
on public.customer_activities
for select
to authenticated
using (true);

create policy "Authenticated users can log customer activities"
on public.customer_activities
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Only Managers can delete customer activities"
on public.customer_activities
for delete
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');
