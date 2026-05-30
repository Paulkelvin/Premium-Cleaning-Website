import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function computeBookingTotal(booking: Record<string, string | null | undefined>) {
  const pricing = {
    minimumJob: 1,
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

function isPaidSquareStatus(status?: string | null) {
  const normalized = String(status || "").toUpperCase();
  return normalized === "COMPLETED" || normalized === "APPROVED";
}

async function squareFetch(
  token: string,
  environment: string,
  path: string,
  method = "GET",
  body?: unknown
) {
  const response = await fetch(`${squareBaseUrl(environment)}${path}`, {
    method,
    headers: {
      "Square-Version": "2024-11-20",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.code ||
      `Square API error (${response.status})`;
    throw new Error(String(detail));
  }
  return payload;
}

async function verifySquarePaymentForBooking(
  bookingId: string,
  squareOrderId: string | null | undefined,
  expectedAmountCents: number,
  token: string,
  environment: string
) {
  if (squareOrderId) {
    const orderPayload = await squareFetch(token, environment, `/orders/${squareOrderId}`);
    const order = orderPayload?.order;
    if (!order) throw new Error("Square order not found");

    const orderState = String(order.state || "").toUpperCase();
    if (orderState === "COMPLETED") {
      const paidCents = Number(order.total_money?.amount || 0);
      if (paidCents >= expectedAmountCents) {
        return {
          paymentId: order.tenders?.[0]?.payment_id ? String(order.tenders[0].payment_id) : null,
          orderId: squareOrderId,
        };
      }
      throw new Error("Payment amount does not match booking total");
    }
    if (orderState === "CANCELED") throw new Error("Square order was canceled");
  }

  const searchPayload = await squareFetch(token, environment, "/payments/search", "POST", {
    query: {
      filter: {
        note: { exact: bookingNote(bookingId) },
      },
    },
    sort: {
      sort_field: "CREATED_AT",
      sort_order: "DESC",
    },
  });

  const payments = searchPayload?.payments || [];
  const paid = payments.find((payment: Record<string, unknown>) =>
    isPaidSquareStatus(String(payment.status || ""))
  );

  if (!paid) {
    throw new Error("No completed Square payment found for this booking yet");
  }

  const paidCents = Number(paid.amount_money?.amount || 0);
  if (paidCents < expectedAmountCents) {
    throw new Error("Payment amount does not match booking total");
  }

  return {
    paymentId: paid.id ? String(paid.id) : null,
    orderId: paid.order_id ? String(paid.order_id) : squareOrderId || null,
  };
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
    const squareEnvironment = Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox";
    if (!squareToken) {
      throw new Error("Square is not configured on the server yet");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, estimated_total, payment_method, payment_status, square_order_id, service_type, bedrooms, bathrooms, square_feet, add_ons, frequency, service_area_name, travel_fee"
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(bookingError?.message || "Booking not found");
    }

    if (booking.payment_method !== "pay_online") {
      throw new Error("This booking is not an online payment booking");
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ ok: true, booking_id: bookingId, payment_status: "paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!String(booking.service_area_name || "").trim()) {
      throw new Error("Service area must be confirmed before payment confirmation");
    }

    const storedTotal = Number(booking.estimated_total);
    const total =
      Number.isFinite(storedTotal) && storedTotal > 0
        ? Math.round(storedTotal * 100) / 100
        : computeBookingTotal(booking).total;
    const expectedAmountCents = Math.round(total * 100);
    if (!Number.isFinite(expectedAmountCents) || expectedAmountCents < 100) {
      throw new Error("Could not determine a valid booking total");
    }

    const verification = await verifySquarePaymentForBooking(
      bookingId,
      booking.square_order_id,
      expectedAmountCents,
      squareToken,
      squareEnvironment
    );

    const updatePayload: Record<string, string> = { payment_status: "paid" };
    if (verification.paymentId) updatePayload.square_payment_id = verification.paymentId;
    if (verification.orderId) updatePayload.square_order_id = verification.orderId;

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        booking_id: bookingId,
        payment_status: "paid",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm payment";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
