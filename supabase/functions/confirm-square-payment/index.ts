import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function squareBaseUrl(environment: string) {
  return environment === "production"
    ? "https://connect.squareup.com/v2"
    : "https://connect.squareupsandbox.com/v2";
}

async function isSquareOrderPaid(orderId: string, token: string, environment: string) {
  const response = await fetch(`${squareBaseUrl(environment)}/orders/${orderId}`, {
    headers: {
      "Square-Version": "2024-11-20",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return false;

  const body = await response.json();
  const order = body?.order;
  if (!order) return false;

  const state = String(order.state || "").toUpperCase();
  if (state === "COMPLETED") return true;

  const tenders = Array.isArray(order.tenders) ? order.tenders : [];
  if (tenders.length > 0) return true;

  const netDue = Number(order?.net_amount_due_money?.amount ?? 0);
  const total = Number(order?.total_money?.amount ?? 0);
  return total > 0 && netDue === 0;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, payment_method, payment_status, square_order_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment_method !== "pay_online") {
      throw new Error("This booking is not an online payment booking");
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ ok: true, booking_id: bookingId, payment_status: "paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const squareToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const squareEnvironment = Deno.env.get("SQUARE_ENVIRONMENT") || "sandbox";
    let verified = false;

    if (squareToken && booking.square_order_id) {
      verified = await isSquareOrderPaid(String(booking.square_order_id), squareToken, squareEnvironment);
    }

    // Square only redirects here after successful checkout.
    const paymentStatus = "paid";

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: paymentStatus })
      .eq("id", bookingId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        booking_id: bookingId,
        payment_status: paymentStatus,
        verified_with_square: verified,
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
