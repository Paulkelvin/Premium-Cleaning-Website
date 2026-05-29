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

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Server configuration incomplete");
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user?.email) {
      throw new Error("Unauthorized");
    }

    const callerEmail = String(callerData.user.email).toLowerCase();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerAdmin, error: adminCheckError } = await adminClient
      .from("admin_users")
      .select("email")
      .eq("email", callerEmail)
      .maybeSingle();

    if (adminCheckError || !callerAdmin) {
      throw new Error("Only admins can invite team members");
    }

    const { email, password } = await req.json();
    const normalizedEmail = String(email || "").toLowerCase().trim();
    const userPassword = String(password || "");

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("A valid email is required");
    }
    if (userPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const { data: existingAdmin } = await adminClient
      .from("admin_users")
      .select("email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingAdmin) {
      throw new Error("This email is already an admin");
    }

    const { error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: userPassword,
      email_confirm: true,
    });

    if (createError) {
      throw new Error(createError.message || "Could not create auth user");
    }

    const { error: insertError } = await adminClient.from("admin_users").insert({
      email: normalizedEmail,
      invited_by: callerEmail,
    });

    if (insertError) {
      throw new Error(insertError.message || "User created but admin access failed");
    }

    return jsonResponse({ ok: true, email: normalizedEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create admin user";
    return jsonResponse({ error: message }, 400);
  }
});
