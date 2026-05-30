import { requireAdmin, serviceRoleClient } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function squareBaseUrl(environment: string) {
  return environment === "production"
    ? "https://connect.squareup.com/v2"
    : "https://connect.squareupsandbox.com/v2";
}

function bookingNote(bookingId: string) {
  return `booking:${bookingId}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    await requireAdmin(req);
    const { booking_id: bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== "string") {
      throw new Error("booking_id is required");
    }

    const squareToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const squareLocationId = Deno.env.get("SQUARE_LOCATION_ID");
    const squareEnvironment = Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox";
    const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");

    if (!squareToken || !squareLocationId) {
      throw new Error("Square is not configured on the server yet");
    }
    if (!siteUrl) {
      throw new Error("SITE_URL is not configured on the server yet");
    }

    const client = serviceRoleClient();
    const { data: booking, error: bookingError } = await client
      .from("bookings")
      .select(
        "id, estimated_total, pricing_locked, service_type, full_name, payment_method, payment_status, service_area_name"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Invoice not found");
    }
    if (booking.payment_status === "paid") {
      throw new Error("This invoice is already paid");
    }
    if (!String(booking.service_area_name || "").trim()) {
      throw new Error("Service area is required before creating checkout");
    }

    const total = Number(booking.estimated_total);
    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("Invalid invoice amount");
    }

    const amountCents = Math.round(total * 100);
    const minCents = booking.pricing_locked ? 50 : 100;
    if (amountCents < minCents) {
      throw new Error(`Amount must be at least $${(minCents / 100).toFixed(2)} for Square checkout`);
    }

    const serviceLabel = String(booking.service_type || "Cleaning service").slice(0, 200);
    const checkoutName = `RS Cleaning — ${serviceLabel}`.slice(0, 255);

    const squareResponse = await fetch(`${squareBaseUrl(squareEnvironment)}/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Square-Version": "2024-11-20",
        Authorization: `Bearer ${squareToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: `admin-${bookingId}-${Date.now()}`,
        description: `Invoice ${bookingId}`,
        quick_pay: {
          name: checkoutName,
          price_money: { amount: amountCents, currency: "USD" },
          location_id: squareLocationId,
        },
        checkout_options: {
          redirect_url: `${siteUrl}/payment-complete.html?booking=${encodeURIComponent(bookingId)}`,
        },
        payment_note: bookingNote(bookingId),
      }),
    });

    const squareBody = await squareResponse.json();
    if (!squareResponse.ok) {
      const detail = squareBody?.errors?.[0]?.detail || squareBody?.errors?.[0]?.code || "Square checkout failed";
      throw new Error(detail);
    }

    const checkoutUrl =
      squareBody?.payment_link?.url ||
      squareBody?.payment_link?.long_url ||
      squareBody?.related_resources?.orders?.[0]?.checkout_url;

    if (!checkoutUrl) {
      throw new Error("Square did not return a checkout URL");
    }

    const orderId = squareBody?.payment_link?.order_id || squareBody?.related_resources?.orders?.[0]?.id || null;
    const updatePayload: Record<string, string | number> = {
      payment_method: "pay_online",
      payment_status: "pending_payment",
      estimated_total: total,
      pricing_locked: true,
      square_checkout_url: checkoutUrl,
    };
    if (orderId) updatePayload.square_order_id = orderId;

    await client.from("bookings").update(updatePayload).eq("id", bookingId);

    return json({ checkout_url: checkoutUrl, booking_id: bookingId, amount: total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout";
    return json({ error: message }, 400);
  }
});
