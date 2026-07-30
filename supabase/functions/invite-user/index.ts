import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

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

    // 1. Only a Manager (this app's "Admin") may invite users - verify the
    // caller's own token server-side rather than trusting the client.
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerErr || !callerData?.user) throw new Error("Invalid session");

    const { data: callerProfile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", callerData.user.id)
      .maybeSingle();

    if (callerProfile?.role !== "Manager") {
      return new Response(JSON.stringify({ error: "Only a Manager can invite users." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse and validate the invite payload
    const { email, name, type, department } = await req.json();
    if (!email || !name || !type) {
      throw new Error("Missing required fields: email, name, type");
    }

    // 3. Create the auth account with a generated temporary password
    const temporaryPassword = crypto.randomUUID().replace(/-/g, "").substring(0, 16) + "A1!";

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { name, type },
    });

    if (authError || !authData?.user) {
      const rawMessage = authError?.message || "Unknown error creating the account.";
      const isDuplicate = /already.*registered|already.*exists/i.test(rawMessage);
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? `An account with the email "${email}" already exists.`
            : `Could not create the account: ${rawMessage}`,
        }),
        { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // 4. Upsert the profile row (service role bypasses RLS). Upsert rather
    // than insert because a DB trigger from the old public-signup flow may
    // already have auto-created a bare row for this id the moment
    // createUser() ran above - a plain insert would collide with it.
    const { error: profileError } = await supabaseAdmin.from("users").upsert(
      {
        id: newUserId,
        name,
        type,
        role: type === "Manager" ? "Manager" : "User",
        email,
        department: department || null,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(`Profile insert error: ${profileError.message}`);
    }

    // 5. Email the temporary password via the same Power Automate pipeline
    let emailStatus = "sent";
    let errorMessage: string | null = null;

    if (POWER_AUTOMATE_WEBHOOK_URL) {
      const { data: template } = await supabaseAdmin
        .from("email_templates")
        .select("subject_template, body_template")
        .eq("trigger_key", "USER_INVITED")
        .maybeSingle();

      const vars = { name, email, temp_password: temporaryPassword, portal_url: PORTAL_URL };
      const subject = template
        ? fillTemplate(template.subject_template, vars)
        : "You've been invited to the Pio-Tech Projects Portfolio";
      const rawBody = template
        ? fillTemplate(template.body_template, vars)
        : `Hello ${name},\n\nAn account has been created for you.\n\nPortal: ${PORTAL_URL}\nEmail: ${email}\nTemporary Password: ${temporaryPassword}`;

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

      try {
        const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: email, subject, htmlBody }),
        });
        if (!res.ok) {
          emailStatus = "failed";
          errorMessage = `Power Automate webhook returned ${res.status}: ${await res.text()}`;
        }
      } catch (err: any) {
        emailStatus = "failed";
        errorMessage = err.message;
      }

      try {
        await supabaseAdmin.from("email_logs").insert({
          recipient_email: email,
          subject,
          status: emailStatus,
          error_message: errorMessage,
        });
      } catch (logErr) {
        console.error("Failed to log invite email:", logErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        temporaryPassword,
        emailStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("invite-user error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
