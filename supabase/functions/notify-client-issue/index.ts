import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// Fires right after a Client Portal user files a new Bug/CR/Inquiry, so the
// project's PM gets an email (in addition to the in-app notification that
// addIssue() already writes directly). Kept as its own function - like
// invite-user/forgot-password - because sending mail needs the Power
// Automate webhook secret, which only Edge Functions can see.
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

    // Verify the caller is actually the reporter of the issue they're
    // asking us to notify about - stops anyone from spamming PM inboxes
    // for issues that aren't theirs.
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerErr || !callerData?.user) throw new Error("Invalid session");

    const { issueId } = await req.json();
    if (!issueId) throw new Error("Missing issueId");

    const { data: issue, error: issueErr } = await supabaseAdmin
      .from("issues")
      .select("id, title, task_type, reporter_id, project_id")
      .eq("id", issueId)
      .maybeSingle();
    if (issueErr || !issue) throw new Error("Issue not found");
    if (issue.reporter_id !== callerData.user.id) throw new Error("Not the reporter of this issue");

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, name, project_code, project_manager_id, customer_id")
      .eq("id", issue.project_id)
      .maybeSingle();
    if (!project?.project_manager_id) {
      // No PM assigned to this project - nothing to email.
      return new Response(JSON.stringify({ success: true, skipped: "no_pm" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: pm } = await supabaseAdmin.from("users").select("email, name").eq("id", project.project_manager_id).maybeSingle();
    if (!pm?.email) {
      return new Response(JSON.stringify({ success: true, skipped: "no_pm_email" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reporter } = await supabaseAdmin.from("users").select("name").eq("id", issue.reporter_id).maybeSingle();
    const { data: customer } = project.customer_id
      ? await supabaseAdmin.from("customers").select("name").eq("id", project.customer_id).maybeSingle()
      : { data: null };

    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject_template, body_template")
      .eq("trigger_key", "NEW_CLIENT_ISSUE")
      .maybeSingle();

    const vars = {
      pm_name: pm.name || "",
      reporter_name: reporter?.name || "A client user",
      customer_name: customer?.name || "",
      issue_title: issue.title || "",
      issue_type: issue.task_type || "Task",
      project_name: project.name || "",
      project_code: project.project_code || "",
      portal_url: PORTAL_URL,
    };

    const subject = template
      ? fillTemplate(template.subject_template, vars)
      : `New ${vars.issue_type} on ${vars.project_name}`;
    const rawBody = template
      ? fillTemplate(template.body_template, vars)
      : `Hello ${vars.pm_name},\n\n${vars.reporter_name} from ${vars.customer_name} opened a new ${vars.issue_type} on project "${vars.project_name}" (${vars.project_code}):\n\n"${vars.issue_title}"\n\nPortal: ${vars.portal_url}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #7c3aed;">
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
          body: JSON.stringify({ to: pm.email, subject, htmlBody }),
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
        recipient_email: pm.email,
        subject,
        status,
        error_message: errorMessage,
      });
    } catch (logErr) {
      console.error("Failed to log notify-client-issue email:", logErr);
    }

    return new Response(JSON.stringify({ success: status === "sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("notify-client-issue error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
