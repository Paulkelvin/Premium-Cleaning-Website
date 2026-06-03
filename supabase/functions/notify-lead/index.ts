import {
  getWebhookSecret,
  sendLeadNotifications,
  serviceRoleClient,
} from "../_shared/notification-send.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TABLES = new Set(["contact_submissions", "quote_requests", "bookings"]);

function json(body: Record<string, unknown>, status = 200) {
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
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const client = serviceRoleClient();
    const expectedSecret = await getWebhookSecret(client);
    const providedSecret = req.headers.get("x-notify-secret")?.trim() || "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json();
    const table = String(payload.table || "").trim();
    const record = payload.record;

    if (!ALLOWED_TABLES.has(table) || !record || typeof record !== "object") {
      return json({ error: "Invalid payload" }, 400);
    }

    if (table === "bookings") {
      const source = String(record.source || "website");
      if (source === "admin") {
        return json({ ok: true, skipped: true, reason: "admin_invoice" });
      }
      if (source === "open_payment") {
        return json({ ok: true, skipped: true, reason: "open_payment" });
      }
    }

    const result = await sendLeadNotifications(table, record as Record<string, unknown>);
    return json({ ok: true, table, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification failed";
    console.error("notify-lead:", message);
    return json({ error: message }, 500);
  }
});
