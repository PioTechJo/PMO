-- The audit log (system_audit_log) was Manager-only for SELECT. The new
-- per-task "History" page needs a PM, the assignee, or the Client Portal
-- creator to read the audit trail for their own task's row, without
-- opening up the rest of the audit log (projects/users/customers/etc. stay
-- Manager-only). Additive policy, scoped to table_name = 'issues' and reuses
-- the same can_access_issue() visibility helper already used for issue
-- attachments/comments.

create policy "Issue stakeholders can view that issue's audit history"
on public.system_audit_log
for select
to authenticated
using (
  table_name = 'issues'
  and record_id is not null
  and public.can_access_issue(record_id)
);
