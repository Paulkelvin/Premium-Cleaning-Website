function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isGmailConfigured() {
  return Boolean(
    Deno.env.get("GOOGLE_CLIENT_ID") &&
      Deno.env.get("GOOGLE_CLIENT_SECRET") &&
      Deno.env.get("GOOGLE_REFRESH_TOKEN") &&
      Deno.env.get("GMAIL_FROM_EMAIL")
  );
}

export async function getGoogleAccessToken() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail is not configured yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, and GMAIL_FROM_EMAIL to Supabase secrets (see OFFLINE_INVOICES_SETUP.md)."
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
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
  const from = Deno.env.get("GMAIL_FROM_EMAIL")?.trim();
  if (!from) {
    throw new Error("GMAIL_FROM_EMAIL is not configured");
  }

  const to = String(options.to || "").trim();
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const text = options.text || options.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const raw = [
    `From: RS Cleaning Collective <${from}>`,
    `To: ${to}`,
    `Subject: ${options.subject}`,
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
