import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const encoder = new TextEncoder();

async function hmacSha256Base64(key: string, message: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function parseBookingId(note?: string | null) {
  if (!note) return null;
  const match = String(note).match(/booking:([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

function mapPaymentStatus(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "paid";
  if (normalized === "FAILED" || normalized === "CANCELED") return "payment_failed";
  return "pending_payment";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");

  if (signatureKey && notificationUrl) {
    const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
    if (!signatureHeader) {
      return new Response("Missing signature", { status: 401 });
    }

    const expected = await hmacSha256Base64(signatureKey, notificationUrl + rawBody);
    if (expected !== signatureHeader) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = String(payload.type || "");
  if (!eventType.startsWith("payment.")) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payment = (payload.data as { object?: { payment?: Record<string, unknown> } })?.object?.payment;
  if (!payment) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const bookingId = parseBookingId(String(payment.note || ""));
  if (!bookingId) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const paymentStatus = mapPaymentStatus(String(payment.status || ""));
  const paymentId = payment.id ? String(payment.id) : null;

  const updatePayload: Record<string, string> = { payment_status: paymentStatus };
  if (paymentId) updatePayload.square_payment_id = paymentId;

  await supabase.from("bookings").update(updatePayload).eq("id", bookingId);

  return new Response(JSON.stringify({ ok: true, booking_id: bookingId, payment_status: paymentStatus }), {
    headers: { "Content-Type": "application/json" },
  });
});
