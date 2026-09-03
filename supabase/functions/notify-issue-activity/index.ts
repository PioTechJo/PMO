import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// Fires whenever a comment is added or the status changes on an issue.
// Recipients are always "reporter (creator) + PM + assignee, minus whoever
// just made the change" - so a Client Portal user commenting on their own
// filed issue notifies the assignee + PM, while a PM/Dev/PS commenting or
// changing status notifies the reporter (creator) + PM. Kept as its own
// function - like notify-client-issue/notify-task-assignment - because
// sending mail needs the Power Automate webhook secret.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const POWER_AUTOMATE_WEBHOOK_URL = Deno.env.get("POWER_AUTOMATE_EMAIL_WEBHOOK_URL");
    const PORTAL_URL = Deno.env.get("PORTAL_URL") || "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment configuration is missing.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerErr || !callerData?.user) throw new Error("Invalid session");
    const actorId = callerData.user.id;

    const { issueId, activityType, commentText, newStatus } = await req.json();
    if (!issueId) throw new Error("Missing issueId");
    if (activityType !== "comment" && activityType !== "status_change") {
      throw new Error("Invalid activityType");
    }

    const { data: issue, error: issueErr } = await supabaseAdmin
      .from("issues")
      .select("id, title, reporter_id, assignee_id, project_id")
      .eq("id", issueId)
      .maybeSingle();
    if (issueErr || !issue) throw new Error("Issue not found");

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("name, project_code, project_manager_id")
      .eq("id", issue.project_id)
      .maybeSingle();

    const { data: actor } = await supabaseAdmin.from("users").select("name").eq("id", actorId).maybeSingle();

    // Reporter + PM + assignee, deduped, minus whoever just made the change.
    const candidateIds = Array.from(new Set(
      [issue.reporter_id, project?.project_manager_id, issue.assignee_id].filter((id): id is string => !!id && id !== actorId)
    ));

    if (candidateIds.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "no_recipients" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: recipients } = await supabaseAdmin.from("users").select("id, name, email").in("id", candidateIds);

    const triggerKey = activityType === "comment" ? "ISSUE_COMMENT_ADDED" : "ISSUE_STATUS_CHANGED";
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject_template, body_template")
      .eq("trigger_key", triggerKey)
      .maybeSingle();

    const results: { recipient: string; status: string }[] = [];

    for (const recipient of recipients || []) {
      if (!recipient.email) {
        // Log this rather than silently skipping - a missing email on a
        // known recipient (assignee/PM/reporter) is exactly the kind of
        // thing that's otherwise invisible until someone notices the
        // email never arrived.
        try {
          await supabaseAdmin.from("email_logs").insert({
            recipient_email: `(missing email) user ${recipient.id}`,
            subject: triggerKey,
            status: "failed",
            error_message: "Recipient has no email on their users row.",
          });
        } catch (logErr) {
          console.error("Failed to log missing-email skip:", logErr);
        }
        continue;
      }

      const vars = {
        recipient_name: recipient.name || "",
        actor_name: actor?.name || "Someone",
        issue_title: issue.title || "",
        project_name: project?.name || "",
        project_code: project?.project_code || "",
        comment_text: commentText || "",
        new_status: newStatus || "",
        portal_url: PORTAL_URL,
      };

      const subject = template
        ? fillTemplate(template.subject_template, vars)
        : activityType === "comment"
          ? `New comment on: ${vars.issue_title}`
          : `Status updated: ${vars.issue_title}`;
      const rawBody = template
        ? fillTemplate(template.body_template, vars)
        : activityType === "comment"
          ? `Hello ${vars.recipient_name},\n\n${vars.actor_name} commented on "${vars.issue_title}":\n\n"${vars.comment_text}"\n\nPortal: ${vars.portal_url}`
          : `Hello ${vars.recipient_name},\n\n${vars.actor_name} changed the status of "${vars.issue_title}" to ${vars.new_status}.\n\nPortal: ${vars.portal_url}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #3b82f6;">
            <h2 style="color: #1e293b; margin: 0;">Pio-Tech Projects Portfolio</h2>
          </div>
          <div style="padding: 24px; line-height: 1.6; font-size: 15px;">
            ${rawBody.replace(/\n/g, "<br>")}
          </div>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            This is an automated notification from the Pio-Tech Projects Portfolio.<br>
            Please do not reply directly to this email.
          </div>
        </div>
      `;

      let status = "sent";
      let errorMessage: string | null = null;
      if (POWER_AUTOMATE_WEBHOOK_URL) {
        try {
          const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: recipient.email, subject, htmlBody }),
          });
          if (!res.ok) {
            status = "failed";
            errorMessage = `Power Automate webhook returned ${res.status}: ${await res.text()}`;
          }
        } catch (err: any) {
          status = "failed";
          errorMessage = err.message;
        }
      } else {
        status = "failed";
        errorMessage = "POWER_AUTOMATE_EMAIL_WEBHOOK_URL is not configured.";
      }

      try {
        await supabaseAdmin.from("email_logs").insert({
          recipient_email: recipient.email,
          subject,
          status,
          error_message: errorMessage,
        });
      } catch (logErr) {
        console.error("Failed to log notify-issue-activity email:", logErr);
      }

      results.push({ recipient: recipient.email, status });
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("notify-issue-activity error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
