import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function requireAdmin(req: Request): Promise<{ email: string; userId: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !anonKey || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user?.email) {
    throw new Error("Unauthorized");
  }

  const email = String(callerData.user.email).toLowerCase();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceRoleKey) {
    throw new Error("Server configuration incomplete");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (adminError || !adminRow) {
    throw new Error("Admin access required");
  }

  return { email, userId: callerData.user.id };
}

export function serviceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server configuration incomplete");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
