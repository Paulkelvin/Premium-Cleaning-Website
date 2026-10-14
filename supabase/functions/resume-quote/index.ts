// Returns a saved quote so the customer can continue to booking from the
// "Continue to booking" link in their quote email, on any device.
// Public (verify_jwt = false): the quote id is a random UUID that only the
// customer receives, links expire after QUOTE_LINK_DAYS, and quotes that have
// already been booked are not returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function serviceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Server configuration incomplete");
  return createClient(supabaseUrl, serviceRoleKey);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUOTE_LINK_DAYS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RETURNED_FIELDS =
  "id, created_at, full_name, email, phone, service_type, property_type, bedrooms, bathrooms, square_feet, add_ons, frequency, preferred_contact, estimated_total";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { quote_id: quoteId } = await req.json().catch(() => ({}));
    if (typeof quoteId !== "string" || !UUID_RE.test(quoteId)) {
      return json({ status: "not_found" }, 404);
    }

    const client = serviceRoleClient();
    const { data: quote, error } = await client
      .from("quote_requests")
      .select(RETURNED_FIELDS)
      .eq("id", quoteId)
      .maybeSingle();

    if (error || !quote) return json({ status: "not_found" }, 404);
    const record = quote as unknown as Record<string, unknown>;

    const ageMs = Date.now() - new Date(String(record.created_at)).getTime();
    if (!Number.isFinite(ageMs) || ageMs > QUOTE_LINK_DAYS * 24 * 60 * 60 * 1000) {
      return json({ status: "expired" }, 410);
    }

    const { count } = await client
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId);
    if ((count || 0) > 0) return json({ status: "booked" }, 409);

    // Re-estimating creates a new quote, so a customer may book from a newer
    // quote. Treat an older link as booked once that email has booked since.
    const email = String(record.email || "").trim();
    if (email) {
      const { count: bookedSince } = await client
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .ilike("email", email.replace(/[\\%_]/g, (ch) => `\\${ch}`))
        .gte("created_at", String(record.created_at));
      if ((bookedSince || 0) > 0) return json({ status: "booked" }, 409);
    }

    return json({ status: "ok", quote: record });
  } catch (err) {
    console.error("resume-quote:", err instanceof Error ? err.message : err);
    return json({ error: "Could not load quote" }, 500);
  }
});
