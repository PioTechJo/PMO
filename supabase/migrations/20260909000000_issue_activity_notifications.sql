-- Seeds the editable email templates used by the new notify-issue-activity
-- Edge Function (fires whenever a comment is added or the status changes on
-- an issue). Recipients are always "reporter + PM + assignee, minus
-- whoever just made the change" - so a Client Portal user commenting on
-- their own filed issue notifies the assignee + PM, while a PM/Dev
-- commenting or changing status notifies the reporter (creator) + PM.

insert into public.email_templates (trigger_key, subject_template, body_template)
values
  (
    'ISSUE_COMMENT_ADDED',
    'New comment on: {{issue_title}}',
    E'Hello {{recipient_name}},\n\n{{actor_name}} commented on "{{issue_title}}" (project "{{project_name}}" / {{project_code}}):\n\n"{{comment_text}}"\n\nPortal: {{portal_url}}'
  ),
  (
    'ISSUE_STATUS_CHANGED',
    'Status updated: {{issue_title}}',
    E'Hello {{recipient_name}},\n\n{{actor_name}} changed the status of "{{issue_title}}" (project "{{project_name}}" / {{project_code}}) to {{new_status}}.\n\nPortal: {{portal_url}}'
  )
on conflict (trigger_key) do nothing;
