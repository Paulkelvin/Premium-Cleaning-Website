import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const amount = Number(body.amount);
    const note = String(body.note || "").trim();

    if (!fullName || fullName.length < 2) {
      throw new Error("Please enter your name");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email");
    }
    if (!Number.isFinite(amount) || amount < 1) {
      throw new Error("Please enter at least $1.00");
    }

    const squareToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const squareLocationId = Deno.env.get("SQUARE_LOCATION_ID");
    const squareEnvironment = Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox";
    const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!squareToken || !squareLocationId) {
      throw new Error("Square is not configured on the server yet");
    }
    if (!siteUrl) {
      throw new Error("SITE_URL is not configured on the server yet");
    }
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server configuration incomplete");
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents < 100) {
      throw new Error("Amount must be at least $1.00");
    }

    const paymentId = crypto.randomUUID();
    const checkoutName = `RS Cleaning — ${fullName}`.slice(0, 255);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error: insertError } = await supabase.from("bookings").insert({
      id: paymentId,
      full_name: fullName,
      email,
      service_type: "Open payment",
      payment_method: "pay_online",
      estimated_total: amount,
      message: note || null,
      source: "open_payment",
      consent: true,
    });

    if (insertError) {
      console.error("create-open-payment: booking insert failed", insertError.message);
      throw new Error("Could not save payment record");
    }

    const squareResponse = await fetch(`${squareBaseUrl(squareEnvironment)}/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        "Square-Version": "2024-11-20",
        Authorization: `Bearer ${squareToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key: paymentId,
        description: `Payment ${paymentId.slice(0, 8)}`,
        quick_pay: {
          name: checkoutName,
          price_money: { amount: amountCents, currency: "USD" },
          location_id: squareLocationId,
        },
        checkout_options: {
          redirect_url: `${siteUrl}/payment-complete.html?open=1&booking=${paymentId}`,
        },
        payment_note: bookingNote(paymentId),
      }),
    });

    const squareBody = await squareResponse.json();
    if (!squareResponse.ok) {
      const detail =
        squareBody?.errors?.[0]?.detail || squareBody?.errors?.[0]?.code || "Square checkout failed";
      throw new Error(detail);
    }

    const checkoutUrl =
      squareBody?.payment_link?.url ||
      squareBody?.payment_link?.long_url ||
      squareBody?.related_resources?.orders?.[0]?.checkout_url;

    if (!checkoutUrl) {
      throw new Error("Square did not return a checkout URL");
    }

    const orderId =
      squareBody?.payment_link?.order_id ||
      squareBody?.related_resources?.orders?.[0]?.id ||
      null;

    await supabase
      .from("bookings")
      .update({
        square_checkout_url: checkoutUrl,
        square_order_id: orderId ? String(orderId) : null,
      })
      .eq("id", paymentId);

    return json({ checkout_url: checkoutUrl, payment_id: paymentId, booking_id: paymentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start payment";
    return json({ error: message }, 400);
  }
});
