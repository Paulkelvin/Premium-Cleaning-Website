import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user?.email) {
      throw new Error("Unauthorized");
    }

    const callerEmail = String(callerData.user.email).toLowerCase();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerAdmin } = await adminClient
      .from("admin_users")
      .select("email, role")
      .eq("email", callerEmail)
      .maybeSingle();

    if (!callerAdmin || callerAdmin.role !== "superuser") {
      throw new Error("Only super admins can remove team members");
    }

    const { email } = await req.json();
    const normalizedEmail = String(email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }

    const { data: targetAdmin } = await adminClient
      .from("admin_users")
      .select("email, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!targetAdmin) {
      throw new Error("Admin account not found");
    }
    if (targetAdmin.role === "superuser") {
      throw new Error("Super admins cannot be removed from the dashboard");
    }
    if (normalizedEmail === callerEmail) {
      throw new Error("You cannot remove your own account");
    }

    const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      throw new Error(listError.message || "Could not look up auth user");
    }

    const authUser = authUsers.users.find(
      (user) => String(user.email || "").toLowerCase() === normalizedEmail
    );

    if (authUser?.id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUser.id);
      if (deleteAuthError) {
        throw new Error(deleteAuthError.message || "Could not delete auth user");
      }
    }

    const { error: deleteRowError } = await adminClient
      .from("admin_users")
      .delete()
      .eq("email", normalizedEmail);

    if (deleteRowError) {
      throw new Error(deleteRowError.message || "Could not remove admin access");
    }

    return jsonResponse({ ok: true, email: normalizedEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete admin user";
    return jsonResponse({ error: message }, 400);
  }
});
