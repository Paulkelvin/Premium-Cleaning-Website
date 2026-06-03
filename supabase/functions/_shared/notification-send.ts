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

export async function fetchAdminEmails(client: ReturnType<typeof createClient>) {
  const { data, error } = await client.from("admin_users").select("email");
  if (error) {
    console.warn("notify: could not read admin_users", error.message);
    return [];
  }
  return (data || [])
    .map((row) => String(row.email || "").trim().toLowerCase())
    .filter(Boolean);
}

async function sendMany(recipients: string[], subject: string, html: string) {
  const unique = [...new Set(recipients.map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
  const results: string[] = [];
  for (const to of unique) {
    await sendGmailEmail({ to, subject, html });
    results.push(to);
  }
  return results;
}

export async function sendLeadNotifications(table: string, record: LeadRecord) {
  if (!isGmailConfigured()) {
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
  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    await sendGmailEmail({
      to: customerEmail,
      subject: customerEmailContent.subject,
      html: customerEmailContent.html,
    });
    sentTo.push(customerEmail);
  }

  return { ok: true, sent_to: sentTo };
}

export async function sendPaymentNotifications(record: LeadRecord) {
  if (!isGmailConfigured()) {
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
  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    await sendGmailEmail({
      to: customerEmail,
      subject: customerEmailContent.subject,
      html: customerEmailContent.html,
    });
    sentTo.push(customerEmail);
  }

  return { ok: true, sent_to: sentTo };
}
