-- Comprehensive audit trail: who did what, when, across the whole system,
-- plus login events. A single generic trigger function (security definer)
-- is attached to every audited table so new columns stay covered without
-- further app changes - unlike milestone_audit_logs, which is hand-coded
-- per-RPC and doesn't generalize (see 20260714120000_maker_checker_rls_fix.sql).

create table public.system_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'LOGIN')),
  changed_by uuid references public.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index system_audit_log_created_at_idx on public.system_audit_log(created_at);
create index system_audit_log_table_name_idx on public.system_audit_log(table_name);

alter table public.system_audit_log enable row level security;

create policy "Only Managers can view the audit log"
on public.system_audit_log for select to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

create policy "Only Managers can purge the audit log"
on public.system_audit_log for delete to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');

-- No insert/update policy for `authenticated`: rows are written only by the
-- security-definer functions below, never directly by the client.

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.system_audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- Attached to the primary business tables. Excluded: the six simple lookup
-- tables (countries/categories/teams/products/project_statuses/customers'
-- old bulk path) since they round-trip through replace_lookup_items()'s
-- delete+reinsert-everything RPC and would generate constant noise for
-- unrelated renames; and notifications, which are system-generated, not
-- user actions. customers itself IS audited below since it now has its own
-- dedicated addCustomer/updateCustomer/deleteCustomer write path.
create trigger audit_projects after insert or update or delete on public.projects for each row execute function public.log_audit_event();
create trigger audit_activities after insert or update or delete on public.activities for each row execute function public.log_audit_event();
create trigger audit_users after insert or update or delete on public.users for each row execute function public.log_audit_event();
create trigger audit_customers after insert or update or delete on public.customers for each row execute function public.log_audit_event();
create trigger audit_customer_contacts after insert or update or delete on public.customer_contacts for each row execute function public.log_audit_event();
create trigger audit_maintenance_contracts after insert or update or delete on public.maintenance_contracts for each row execute function public.log_audit_event();
create trigger audit_issues after insert or update or delete on public.issues for each row execute function public.log_audit_event();
create trigger audit_issue_comments after insert or update or delete on public.issue_comments for each row execute function public.log_audit_event();

-- Login events aren't table INSERT/UPDATE/DELETE, so they're written by a
-- small dedicated RPC called from the client on SIGNED_IN.
create or replace function public.log_login_event()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.system_audit_log (table_name, action, changed_by)
  values ('auth', 'LOGIN', auth.uid());
end;
$$;

grant execute on function public.log_login_event() to authenticated;

-- Auto-delete anything older than 3 months, daily at 03:00. Requires the
-- pg_cron extension to be enabled on this Supabase project (Dashboard ->
-- Database -> Extensions) - if enabling it here fails on your plan/tier,
-- run this delete manually/periodically instead via the "Clean log" action
-- in the app until pg_cron is available.
create extension if not exists pg_cron;

select cron.schedule(
  'purge-old-audit-log',
  '0 3 * * *',
  $$delete from public.system_audit_log where created_at < now() - interval '3 months'$$
);
