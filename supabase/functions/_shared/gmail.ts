import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromEmail: string;
};

let cachedConfig: GmailConfig | null | undefined;

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** RFC 2047 — prevents mojibake (e.g. Ã¢Â€Â) for em dashes and other UTF-8 in Subject headers. */
function encodeMimeHeaderValue(value: string) {
  if (!/[^\x00-\x7F]/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function readEnvConfig(): GmailConfig | null {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")?.trim() || "";
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim() || "";
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN")?.trim() || "";
  const fromEmail = Deno.env.get("GMAIL_FROM_EMAIL")?.trim() || "";
  if (!clientId || !clientSecret || !refreshToken || !fromEmail) return null;
  return { clientId, clientSecret, refreshToken, fromEmail };
}

function serviceRoleClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function loadGmailConfig(): Promise<GmailConfig | null> {
  if (cachedConfig !== undefined) return cachedConfig;

  const envConfig = readEnvConfig();
  if (envConfig) {
    cachedConfig = envConfig;
    return envConfig;
  }

  const client = serviceRoleClient();
  if (!client) {
    cachedConfig = null;
    return null;
  }

  const { data, error } = await client
    .from("internal_gmail_config")
    .select("client_id, client_secret, refresh_token, from_email")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("gmail: could not read internal_gmail_config", error.message);
    cachedConfig = null;
    return null;
  }

  const config: GmailConfig = {
    clientId: String(data?.client_id || "").trim(),
    clientSecret: String(data?.client_secret || "").trim(),
    refreshToken: String(data?.refresh_token || "").trim(),
    fromEmail: String(data?.from_email || "").trim(),
  };

  if (!config.clientId || !config.clientSecret || !config.refreshToken || !config.fromEmail) {
    cachedConfig = null;
    return null;
  }

  cachedConfig = config;
  return config;
}

export async function isGmailConfigured() {
  return (await loadGmailConfig()) !== null;
}

export async function getGoogleAccessToken() {
  const config = await loadGmailConfig();
  if (!config) {
    throw new Error(
      "Gmail is not configured yet. Add GOOGLE_* secrets in Supabase or configure internal_gmail_config (see OFFLINE_INVOICES_SETUP.md)."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    const detail = body.error_description || body.error || "Could not refresh Google access token";
    throw new Error(detail);
  }
  return String(body.access_token);
}

export async function sendGmailEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const config = await loadGmailConfig();
  if (!config) {
    throw new Error("GMAIL_FROM_EMAIL is not configured");
  }

  const to = String(options.to || "").trim();
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const text = options.text || options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const raw = [
    `From: RS Cleaning Collective <${config.fromEmail}>`,
    `To: ${to}`,
    `Subject: ${encodeMimeHeaderValue(options.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    options.html,
  ].join("\r\n");

  const token = await getGoogleAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(raw) }),
  });

  const body = await response.json();
  if (!response.ok) {
    const detail = body.error?.message || "Gmail API rejected the message";
    throw new Error(detail);
  }
  return body;
}
