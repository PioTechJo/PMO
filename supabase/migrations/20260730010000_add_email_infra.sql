-- Email notification infrastructure, mirroring Support Portal's setup
-- (editable templates + a send log + throttling column for self-service
-- password reset), adapted to this project's schema.

-- ============================================================================
-- 1. public.users needs an email column to look users up by email on the
--    unauthenticated forgot-password endpoint, and a throttle timestamp so
--    that endpoint can't be used to spam someone's inbox. Backfill email
--    from auth.users for existing rows (public.users.id == auth.users.id).
-- ============================================================================
alter table public.users
  add column if not exists email text,
  add column if not exists last_password_reset_requested_at timestamptz;

update public.users u
set email = a.email
from auth.users a
where u.id = a.id and u.email is null;

-- ============================================================================
-- 2. email_templates - editable subject/body per trigger, with {{var}}
--    placeholders filled in by the edge functions.
-- ============================================================================
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  trigger_key text unique not null,
  subject_template text not null,
  body_template text not null,
  updated_at timestamptz not null default now()
);

insert into public.email_templates (trigger_key, subject_template, body_template)
values
  (
    'PASSWORD_RESET',
    'Your Projects Portfolio password has been reset',
    E'Hello,\n\nYour password has been reset.\n\nEmail: {{email}}\nNew Password: {{temp_password}}\n\nPlease log in and change your password as soon as possible.'
  ),
  (
    'USER_INVITED',
    'You''ve been invited to the Pio-Tech Projects Portfolio',
    E'Hello {{name}},\n\nAn account has been created for you on the Projects Portfolio Portal.\n\nEmail: {{email}}\nTemporary Password: {{temp_password}}\n\nPlease log in and change your password as soon as possible.'
  )
on conflict (trigger_key) do nothing;

alter table public.email_templates enable row level security;

drop policy if exists "Only Managers can manage email templates" on public.email_templates;
create policy "Only Managers can manage email templates"
on public.email_templates
for all
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager')
with check (public.get_user_role(auth.uid()) = 'Manager');

-- ============================================================================
-- 3. email_logs - append-only send log, written by the edge functions via
--    the service role (bypasses RLS), readable by Managers for auditing.
-- ============================================================================
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  subject text not null,
  status text not null,
  error_message text,
  related_issue_id uuid references public.issues(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

drop policy if exists "Only Managers can view email logs" on public.email_logs;
create policy "Only Managers can view email logs"
on public.email_logs
for select
to authenticated
using (public.get_user_role(auth.uid()) = 'Manager');
