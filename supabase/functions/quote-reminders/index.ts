// Sends ONE follow-up email for quotes that were not booked.
// Called hourly by pg_cron (see migration 20261014_quote_return_links.sql)
// with the same x-notify-secret used by notify-lead.
//
// A quote gets a reminder when it:
//   - was created 24-72 hours ago (so old quotes are never mass-emailed),
//   - has consent, a valid email, and no reminder sent yet,
//   - has no booking linked to it, and the same email has not booked since,
//   - is the customer's latest quote (re-estimating creates a new quote row;
//     only the newest one is reminded, and at most one email per address per run).
import {
  getWebhookSecret,
  serviceRoleClient,
} from "../_shared/notification-send.ts";
import { isGmailConfigured, sendGmailEmail } from "../_shared/gmail.ts";
import { buildQuoteReminderEmail } from "../_shared/notification-templates.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 60 * 60 * 1000;
const MIN_AGE_HOURS = 24;
const MAX_AGE_HOURS = 72;
const BATCH_LIMIT = 25;

// Escape LIKE wildcards so an address containing "_" or "%" matches only itself.
function likeExact(value: string) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const client = serviceRoleClient();
    const expectedSecret = await getWebhookSecret(client);
    const providedSecret = req.headers.get("x-notify-secret")?.trim() || "";
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (!(await isGmailConfigured())) {
      return json({ ok: true, skipped: true, reason: "gmail_not_configured" });
    }

    const now = Date.now();
    const { data: quotes, error } = await client
      .from("quote_requests")
      .select("id, created_at, full_name, email, service_type, estimated_total, frequency, consent")
      .is("reminder_sent_at", null)
      .eq("consent", true)
      .lte("created_at", new Date(now - MIN_AGE_HOURS * HOUR).toISOString())
      .gte("created_at", new Date(now - MAX_AGE_HOURS * HOUR).toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) throw new Error(error.message);

    const sent: string[] = [];
    const emailedThisRun = new Set<string>();
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const quote of quotes || []) {
      const email = String(quote.email || "").trim().toLowerCase();
      const markDone = () =>
        client.from("quote_requests").update({ reminder_sent_at: new Date().toISOString() }).eq("id", quote.id);

      if (!EMAIL_RE.test(email)) {
        await markDone();
        skipped.push({ id: quote.id, reason: "invalid_email" });
        continue;
      }

      const { count: newer } = await client
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .ilike("email", likeExact(email))
        .gt("created_at", quote.created_at);
      if ((newer || 0) > 0 || emailedThisRun.has(email)) {
        await markDone();
        skipped.push({ id: quote.id, reason: "superseded" });
        continue;
      }

      const { count: linked } = await client
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("quote_id", quote.id);
      const { count: sameEmail } = await client
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .ilike("email", likeExact(email))
        .gte("created_at", quote.created_at);
      if ((linked || 0) > 0 || (sameEmail || 0) > 0) {
        await markDone();
        skipped.push({ id: quote.id, reason: "already_booked" });
        continue;
      }

      // Claim the quote first so a parallel run can never send it twice.
      const { data: claimed } = await client
        .from("quote_requests")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", quote.id)
        .is("reminder_sent_at", null)
        .select("id");
      if (!claimed?.length) continue;

      try {
        const content = buildQuoteReminderEmail(quote);
        await sendGmailEmail({ to: email, subject: content.subject, html: content.html });
        sent.push(quote.id);
        emailedThisRun.add(email);
      } catch (err) {
        console.warn("quote-reminders: send failed", quote.id, err instanceof Error ? err.message : err);
        skipped.push({ id: quote.id, reason: "send_failed" });
      }
    }

    return json({ ok: true, checked: (quotes || []).length, sent: sent.length, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reminder run failed";
    console.error("quote-reminders:", message);
    return json({ error: message }, 500);
  }
});
