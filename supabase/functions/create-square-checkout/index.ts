import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Keep pricing in sync with assets/js/config.js */
function computeBookingTotal(booking: Record<string, string | null | undefined>) {
  const pricing = {
    minimumJob: 1, // TEMP: sync with assets/js/config.js — restore after live payment check
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.28,
      "Move-in/Move-out": 0.32,
      "Office cleaning": 0.20,
    },
    addOns: {
      "Wash and fold": 45,
      "Fold laundry only": 25,
      "Inside oven": 40,
      "Inside fridge": 40,
      "Cabinet interiors": 50,
      "Interior Windows Accessible (1-10)": 50,
      "Interior Windows Accessible (11-20)": 100,
      "Bedding refresh (strip and remake beds)": 15,
    },
    frequencyDiscounts: {
      Weekly: 0.20,
      "Bi-weekly": 0.15,
      Monthly: 0.10,
      "One-time": 0.0,
    },
  };

  const serviceType = String(booking.service_type || "").trim();
  const parsedSqft = parseInt(String(booking.square_feet || "").replace(/,/g, ""), 10);
  const beds = parseInt(String(booking.bedrooms || ""), 10) || 2;
  const baths = parseInt(String(booking.bathrooms || ""), 10) || 1;
  const sqft = parsedSqft > 0 ? parsedSqft : Math.round(beds * 450 + baths * 150 + 350);
  const freq = String(booking.frequency || "One-time").trim() || "One-time";

  if (!serviceType || !pricing.rates[serviceType as keyof typeof pricing.rates] || sqft <= 0) {
    return { total: 0 };
  }

  let basePrice = sqft * pricing.rates[serviceType as keyof typeof pricing.rates];
  if (basePrice > 0 && basePrice < pricing.minimumJob) basePrice = pricing.minimumJob;

  let addonsPrice = 0;
  String(booking.add_ons || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((addon) => {
      if (pricing.addOns[addon as keyof typeof pricing.addOns]) {
        addonsPrice += pricing.addOns[addon as keyof typeof pricing.addOns];
      }
    });

  let subtotal = basePrice + addonsPrice;
  const discount = pricing.frequencyDiscounts[freq as keyof typeof pricing.frequencyDiscounts] || 0;
  subtotal -= subtotal * discount;

  const travelFee = resolveTravelFee(booking.service_area_name, booking.travel_fee);
  subtotal += travelFee;

  return { total: Math.round(subtotal * 100) / 100 };
}

const AREA_FEE_RULES: Record<string, number> = {
  "charles county": 0,
  "st. mary's county": 0,
  "st mary's county": 0,
  "calvert county": 0,
  "prince george's county": 0,
  "prince georges county": 0,
  "southern anne arundel county": 20,
  "washington, dc": 20,
  "washington dc": 20,
};

function resolveTravelFee(areaName?: string | null, rawTravelFee?: string | null) {
  const normalizedArea = String(areaName || "").trim().toLowerCase();
  if (normalizedArea && AREA_FEE_RULES[normalizedArea] != null) {
    return AREA_FEE_RULES[normalizedArea];
  }

  if (rawTravelFee != null && String(rawTravelFee).trim() !== "") {
    return Math.max(0, Number(rawTravelFee) || 0);
  }

  if (normalizedArea) {
    return 0;
  }

  return 35;
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, estimated_total, pricing_locked, service_type, full_name, payment_method, payment_status, bedrooms, bathrooms, square_feet, add_ons, frequency, service_area_name, travel_fee"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment_method !== "pay_online") {
      throw new Error("This booking is not set up for online payment");
    }

    if (booking.payment_status === "paid") {
      throw new Error("This booking is already paid");
    }
    if (!String(booking.service_area_name || "").trim()) {
      throw new Error("Service area must be confirmed before checkout");
    }

    const storedTotal = Number(booking.estimated_total);
    let total = 0;
    if (Number.isFinite(storedTotal) && storedTotal > 0) {
      total = Math.round(storedTotal * 100) / 100;
    } else {
      total = computeBookingTotal(booking).total;
    }
    const amountCents = Math.round(total * 100);
    const minCents = booking.pricing_locked ? 50 : 100;
    if (!Number.isFinite(amountCents) || amountCents < minCents) {
      throw new Error("Could not calculate a valid checkout total for this booking");
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
        idempotency_key: bookingId,
        description: `Booking ${bookingId}`,
        quick_pay: {
          name: checkoutName,
          price_money: {
            amount: amountCents,
            currency: "USD",
          },
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
      payment_status: "pending_payment",
      estimated_total: total,
    };
    if (orderId) updatePayload.square_order_id = orderId;
    if (checkoutUrl) updatePayload.square_checkout_url = checkoutUrl;

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      await supabase
        .from("bookings")
        .update({ payment_status: "pending_payment", estimated_total: total })
        .eq("id", bookingId);
    }

    return new Response(JSON.stringify({ checkout_url: checkoutUrl, booking_id: bookingId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create checkout";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
