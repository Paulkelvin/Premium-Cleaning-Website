// Follow-up emails for quotes that were not booked. Called every 15 minutes by
// pg_cron (see supabase/migrations) with the same x-notify-secret as notify-lead.
//
// Customers are not emailed when a quote is created (see notification-send.ts).
// Instead, for a quote that hasn't been booked:
//   1. ~1 hour later:  the quote itself, with a "Continue to booking" button
//   2. ~24 hours later: one short reminder
// Nothing else is ever sent. A quote is only emailed when it:
//   - has consent and a valid email, and that stage hasn't been sent yet,
//   - is no older than 72 hours (old quotes are never mass-emailed),
//   - has no booking linked to it, and the same email or phone has not booked since,
//   - is the customer's latest quote (re-estimating creates a new quote row;
//     matched by email or phone),
//   and at most one email per address per stage per run.
import {
  getWebhookSecret,
  serviceRoleClient,
} from "../_shared/notification-send.ts";
import { isGmailConfigured, sendGmailEmail } from "../_shared/gmail.ts";
import {
  buildCustomerLeadEmail,
  buildQuoteReminderEmail,
  type LeadRecord,
} from "../_shared/notification-templates.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 60 * 60 * 1000;
const MAX_AGE_HOURS = 72;
const BATCH_LIMIT = 25;

type Stage = {
  name: string;
  column: "quote_email_sent_at" | "reminder_sent_at";
  minAgeHours: number;
  // Earlier stage that must have gone out at least `gapHours` ago, so two
  // emails never land close together (e.g. after scheduler downtime).
  requiresColumn?: "quote_email_sent_at";
  gapHours?: number;
  build: (record: LeadRecord) => { subject: string; html: string };
};

const STAGES: Stage[] = [
  {
    name: "quote_email",
    column: "quote_email_sent_at",
    minAgeHours: 1,
    build: (record) => buildCustomerLeadEmail("quote_requests", record),
  },
  {
    name: "reminder",
    column: "reminder_sent_at",
    minAgeHours: 24,
    requiresColumn: "quote_email_sent_at",
    gapHours: 12,
    build: (record) => buildQuoteReminderEmail(record),
  },
];

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

async function runStage(client: ReturnType<typeof serviceRoleClient>, stage: Stage) {
  const now = Date.now();
  let query = client
    .from("quote_requests")
    .select("id, created_at, full_name, email, phone, service_type, property_type, estimated_total, frequency, add_ons, consent")
    .is(stage.column, null)
    .eq("consent", true)
    .lte("created_at", new Date(now - stage.minAgeHours * HOUR).toISOString())
    .gte("created_at", new Date(now - MAX_AGE_HOURS * HOUR).toISOString());
  if (stage.requiresColumn) {
    query = query.lte(stage.requiresColumn, new Date(now - (stage.gapHours || 0) * HOUR).toISOString());
  }

  const { data: quotes, error } = await query.order("created_at", { ascending: true }).limit(BATCH_LIMIT);
  if (error) throw new Error(error.message);

  const sent: string[] = [];
  const emailedThisRun = new Set<string>();
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const quote of quotes || []) {
    const email = String(quote.email || "").trim().toLowerCase();
    const markDone = () =>
      client.from("quote_requests").update({ [stage.column]: new Date().toISOString() }).eq("id", quote.id);

    if (!EMAIL_RE.test(email)) {
      await markDone();
      skipped.push({ id: quote.id, reason: "invalid_email" });
      continue;
    }

    // Same person = same email, or same phone (catches a mistyped email that
    // was corrected by re-quoting, so the typo address is never emailed).
    const phone = String(quote.phone || "").trim();
    const countSince = async (table: "quote_requests" | "bookings", inclusive: boolean) => {
      const since = (q: any) => inclusive ? q.gte("created_at", quote.created_at) : q.gt("created_at", quote.created_at);
      const { count: byEmail } = await since(
        client.from(table).select("id", { count: "exact", head: true }).ilike("email", likeExact(email)),
      );
      if ((byEmail || 0) > 0 || !phone) return byEmail || 0;
      const { count: byPhone } = await since(
        client.from(table).select("id", { count: "exact", head: true }).eq("phone", phone),
      );
      return byPhone || 0;
    };

    const newer = await countSince("quote_requests", false);
    if (newer > 0 || emailedThisRun.has(email)) {
      await markDone();
      skipped.push({ id: quote.id, reason: "superseded" });
      continue;
    }

    const { count: linked } = await client
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quote.id);
    const bookedSince = (linked || 0) > 0 ? 0 : await countSince("bookings", true);
    if ((linked || 0) > 0 || bookedSince > 0) {
      await markDone();
      skipped.push({ id: quote.id, reason: "already_booked" });
      continue;
    }

    // Claim the quote first so a parallel run can never send it twice.
    const { data: claimed } = await client
      .from("quote_requests")
      .update({ [stage.column]: new Date().toISOString() })
      .eq("id", quote.id)
      .is(stage.column, null)
      .select("id");
    if (!claimed?.length) continue;

    try {
      const content = stage.build(quote);
      await sendGmailEmail({ to: email, subject: content.subject, html: content.html });
      sent.push(quote.id);
      emailedThisRun.add(email);
    } catch (err) {
      console.warn(`quote-reminders: ${stage.name} send failed`, quote.id, err instanceof Error ? err.message : err);
      skipped.push({ id: quote.id, reason: "send_failed" });
    }
  }

  return { checked: (quotes || []).length, sent: sent.length, skipped };
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

    const results: Record<string, unknown> = {};
    for (const stage of STAGES) {
      results[stage.name] = await runStage(client, stage);
    }
    return json({ ok: true, ...results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reminder run failed";
    console.error("quote-reminders:", message);
    return json({ error: message }, 500);
  }
});
