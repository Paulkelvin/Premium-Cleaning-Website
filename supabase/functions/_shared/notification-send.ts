import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isGmailConfigured, sendGmailEmail } from "./gmail.ts";
import {
  buildAdminLeadEmail,
  buildAdminPaymentEmail,
  buildCustomerLeadEmail,
  buildCustomerPaymentEmail,
  type LeadRecord,
} from "./notification-templates.ts";

export function serviceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server configuration incomplete");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getWebhookSecret(client: ReturnType<typeof createClient>) {
  const envSecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET")?.trim();
  if (envSecret) return envSecret;

  const { data, error } = await client
    .from("internal_webhook_config")
    .select("secret")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("notify: could not read internal_webhook_config", error.message);
    return "";
  }
  return String(data?.secret || "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidRecipient(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  return Boolean(normalized && EMAIL_RE.test(normalized));
}

export async function fetchAdminEmails(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from("admin_users").select("email");
  if (error) {
    console.warn("notify: could not read admin_users", error.message);
    return [];
  }
  return (data || [])
    .map((row) => String(row.email || "").trim().toLowerCase())
    .filter(isValidRecipient);
}

async function sendMany(recipients: string[], subject: string, html: string) {
  const unique = [
    ...new Set(recipients.map((entry) => entry.trim().toLowerCase()).filter(isValidRecipient)),
  ];
  const results: string[] = [];
  const failures: { to: string; error: string }[] = [];

  for (const to of unique) {
    try {
      await sendGmailEmail({ to, subject, html });
      results.push(to);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("notify: failed to send to", to, message);
      failures.push({ to, error: message });
    }
  }

  if (results.length === 0 && unique.length > 0) {
    throw new Error(failures[0]?.error || "All notification emails failed");
  }

  return results;
}

export async function sendLeadNotifications(table: string, record: LeadRecord) {
  if (!(await isGmailConfigured())) {
    return { ok: true, skipped: true, reason: "gmail_not_configured" };
  }

  const client = serviceRoleClient();
  const adminEmails = await fetchAdminEmails(client);
  const customerEmail = String(record.email || "").trim().toLowerCase();
  const adminEmail = buildAdminLeadEmail(table, record);
  const customerEmailContent = buildCustomerLeadEmail(table, record);

  const sentTo: string[] = [];
  if (adminEmails.length) {
    sentTo.push(...await sendMany(adminEmails, adminEmail.subject, adminEmail.html));
  }
  if (customerEmail && isValidRecipient(customerEmail)) {
    try {
      await sendGmailEmail({
        to: customerEmail,
        subject: customerEmailContent.subject,
        html: customerEmailContent.html,
      });
      sentTo.push(customerEmail);
    } catch (err) {
      console.warn(
        "notify: customer email failed",
        customerEmail,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { ok: true, sent_to: sentTo };
}

export async function sendPaymentNotifications(record: LeadRecord) {
  if (!(await isGmailConfigured())) {
    return { ok: true, skipped: true, reason: "gmail_not_configured" };
  }

  const client = serviceRoleClient();
  const adminEmails = await fetchAdminEmails(client);
  const customerEmail = String(record.email || "").trim().toLowerCase();
  const adminEmail = buildAdminPaymentEmail(record);
  const customerEmailContent = buildCustomerPaymentEmail(record);

  const sentTo: string[] = [];
  if (adminEmails.length) {
    sentTo.push(...await sendMany(adminEmails, adminEmail.subject, adminEmail.html));
  }
  if (customerEmail && isValidRecipient(customerEmail)) {
    try {
      await sendGmailEmail({
        to: customerEmail,
        subject: customerEmailContent.subject,
        html: customerEmailContent.html,
      });
      sentTo.push(customerEmail);
    } catch (err) {
      console.warn(
        "notify: customer payment email failed",
        customerEmail,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { ok: true, sent_to: sentTo };
}
