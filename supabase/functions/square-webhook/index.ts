import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendPaymentNotifications } from "../_shared/notification-send.ts";

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
  const text = String(note);
  const tagged = text.match(/(?:booking|open):([0-9a-f-]{36})/i);
  if (tagged?.[1]) return tagged[1];
  const bare = text.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return bare?.[1] ?? null;
}

function mapPaymentStatus(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  // Sandbox Test Payment may send APPROVED before COMPLETED.
  if (normalized === "COMPLETED" || normalized === "APPROVED") return "paid";
  if (normalized === "FAILED" || normalized === "CANCELED") return "payment_failed";
  return "pending_payment";
}

async function resolveBookingId(
  supabase: ReturnType<typeof createClient>,
  payment: Record<string, unknown>
) {
  const fromNote = parseBookingId(String(payment.note || ""));
  if (fromNote) return fromNote;

  const orderId = payment.order_id ? String(payment.order_id) : "";
  if (!orderId) return null;

  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("square_order_id", orderId)
    .maybeSingle();

  return data?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");
  const squareEnvironment = Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox";
  const requireSignature =
    squareEnvironment === "production" ||
    Deno.env.get("SQUARE_REQUIRE_WEBHOOK_SIGNATURE") === "true";

  if (requireSignature && (!signatureKey || !notificationUrl)) {
    console.error("square-webhook: signature verification required but not configured");
    return new Response("Webhook verification not configured", { status: 503 });
  }

  if (signatureKey && notificationUrl) {
    const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
    if (!signatureHeader) {
      console.error("square-webhook: missing signature header");
      return new Response("Missing signature", { status: 401 });
    }

    const urlVariants = [notificationUrl, notificationUrl.replace(/\/$/, ""), `${notificationUrl.replace(/\/$/, "")}/`];
    const uniqueUrls = [...new Set(urlVariants)];
    let signatureValid = false;

    for (const url of uniqueUrls) {
      const expected = await hmacSha256Base64(signatureKey, url + rawBody);
      if (expected === signatureHeader) {
        signatureValid = true;
        break;
      }
    }

    if (!signatureValid) {
      console.error("square-webhook: invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }
  } else if (requireSignature) {
    return new Response("Missing signature", { status: 401 });
  } else {
    console.warn("square-webhook: processing without signature verification (sandbox/dev only)");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = String(payload.type || "");
  if (!eventType.startsWith("payment.")) {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "non-payment event" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const payment = (payload.data as { object?: { payment?: Record<string, unknown> } })?.object?.payment;
  if (!payment) {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "no payment object" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const bookingId = await resolveBookingId(supabase, payment);
  if (!bookingId) {
    console.warn("square-webhook: no booking match", {
      note: payment.note,
      order_id: payment.order_id,
      status: payment.status,
    });
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "booking not matched" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select(
      "id, full_name, email, phone, service_type, preferred_date, address, estimated_total, payment_status"
    )
    .eq("id", bookingId)
    .maybeSingle();

  const paymentStatus = mapPaymentStatus(String(payment.status || ""));
  const paymentId = payment.id ? String(payment.id) : null;

  if (paymentStatus === "pending_payment") {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "intermediate status", booking_id: bookingId }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const updatePayload: Record<string, string> = { payment_status: paymentStatus };
  if (paymentId) updatePayload.square_payment_id = paymentId;

  const { error } = await supabase.from("bookings").update(updatePayload).eq("id", bookingId);
  if (error) {
    console.error("square-webhook: supabase update failed", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("square-webhook: updated booking", bookingId, paymentStatus);

  if (
    paymentStatus === "paid" &&
    existingBooking &&
    existingBooking.payment_status !== "paid"
  ) {
    try {
      await sendPaymentNotifications(existingBooking);
    } catch (notifyError) {
      console.error(
        "square-webhook: payment notification failed",
        notifyError instanceof Error ? notifyError.message : notifyError
      );
    }
  }

  return new Response(JSON.stringify({ ok: true, booking_id: bookingId, payment_status: paymentStatus }), {
    headers: { "Content-Type": "application/json" },
  });
});
