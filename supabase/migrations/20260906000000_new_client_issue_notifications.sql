-- Seeds the editable email template used by the new notify-client-issue
-- Edge Function (fires when a Client Portal user files a Bug/CR/Inquiry,
-- so the project's PM gets an email in addition to the in-app notification
-- addIssue() already writes directly).

insert into public.email_templates (trigger_key, subject_template, body_template)
values
  (
    'NEW_CLIENT_ISSUE',
    'New {{issue_type}} on {{project_name}}',
    E'Hello {{pm_name}},\n\n{{reporter_name}} from {{customer_name}} opened a new {{issue_type}} on project "{{project_name}}" ({{project_code}}):\n\n"{{issue_title}}"\n\nPortal: {{portal_url}}'
  )
on conflict (trigger_key) do nothing;
