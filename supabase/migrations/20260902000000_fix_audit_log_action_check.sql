-- Fixes system_audit_log_action_check: the live constraint was missing
-- 'LOGIN' as an allowed action value, causing log_login_event() to fail
-- with "violates check constraint system_audit_log_action_check" on every
-- login. Drop and recreate the constraint with the full set of values.

alter table public.system_audit_log drop constraint if exists system_audit_log_action_check;

alter table public.system_audit_log
  add constraint system_audit_log_action_check
  check (action in ('INSERT', 'UPDATE', 'DELETE', 'LOGIN'));
