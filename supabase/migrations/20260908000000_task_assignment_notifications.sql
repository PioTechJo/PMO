-- Seeds the editable email template used by the new notify-task-assignment
-- Edge Function (fires whenever a PM/Manager/TasksAdmin assigns or
-- reassigns a resource to a task - internal or customer-originated alike -
-- so the assignee gets an email in addition to the in-app notification
-- addIssue()/updateIssue() already write directly).

insert into public.email_templates (trigger_key, subject_template, body_template)
values
  (
    'TASK_ASSIGNED',
    'You''ve been assigned: {{issue_title}}',
    E'Hello {{assignee_name}},\n\n{{assigned_by_name}} assigned you to a task on project "{{project_name}}" ({{project_code}}):\n\n"{{issue_title}}"\n\nPortal: {{portal_url}}'
  )
on conflict (trigger_key) do nothing;
