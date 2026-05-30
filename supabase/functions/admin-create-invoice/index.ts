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

function cleanString(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
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
    const payload = await req.json();
    const bookingId = cleanString(payload.booking_id, 80);
    const client = serviceRoleClient();

    const record = {
      source: "admin",
      status: "new",
      full_name: cleanString(payload.full_name, 120),
      email: cleanString(payload.email, 200).toLowerCase(),
      phone: cleanString(payload.phone, 40),
      service_type: cleanString(payload.service_type, 120),
      property_type: cleanString(payload.property_type, 80),
      bedrooms: cleanString(payload.bedrooms, 10),
      bathrooms: cleanString(payload.bathrooms, 10),
      square_feet: cleanString(payload.square_feet, 20),
      add_ons: cleanString(payload.add_ons, 1000),
      frequency: cleanString(payload.frequency, 40) || "One-time",
      service_area_name: cleanString(payload.service_area_name, 120),
      travel_fee: Math.max(0, Number(payload.travel_fee) || 0),
      address: cleanString(payload.address, 500) || "Confirmed with customer",
      preferred_date: payload.preferred_date || null,
      preferred_time: cleanString(payload.preferred_time, 40) || null,
      message: cleanString(payload.message, 2000) || null,
      admin_notes: cleanString(payload.admin_notes, 2000) || null,
      estimated_total: Math.max(0, Number(payload.estimated_total) || 0),
      pricing_locked: true,
      payment_method: "pay_online",
      payment_status: "invoice_draft",
      consent: true,
    };

    if (!record.full_name || !record.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
      throw new Error("Customer name and a valid email are required");
    }
    if (!record.service_type) {
      throw new Error("Service type is required");
    }
    if (!record.service_area_name) {
      throw new Error("Service area is required for travel fee and checkout");
    }
    if (!Number.isFinite(record.estimated_total) || record.estimated_total <= 0) {
      throw new Error("Amount to charge must be greater than zero");
    }

    if (bookingId) {
      const { data, error } = await client
        .from("bookings")
        .update({
          ...record,
          square_checkout_url: null,
          square_order_id: null,
          square_payment_id: null,
          invoice_sent_at: null,
        })
        .eq("id", bookingId)
        .eq("source", "admin")
        .select("id")
        .single();
      if (error || !data) throw new Error("Could not update invoice");
      return json({ booking_id: data.id, updated: true });
    }

    const { data, error } = await client.from("bookings").insert(record).select("id").single();
    if (error || !data) {
      throw new Error(error?.message || "Could not create invoice");
    }
    return json({ booking_id: data.id, created: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save invoice";
    return json({ error: message }, message === "Unauthorized" || message === "Admin access required" ? 401 : 400);
  }
});
