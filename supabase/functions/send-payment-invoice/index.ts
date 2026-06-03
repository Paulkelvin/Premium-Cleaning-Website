import { requireAdmin, serviceRoleClient } from "../_shared/admin-auth.ts";
import { isGmailConfigured, sendGmailEmail } from "../_shared/gmail.ts";

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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceEmail(booking: Record<string, unknown>, checkoutUrl: string) {
  const name = escapeHtml(String(booking.full_name || "there"));
  const service = escapeHtml(String(booking.service_type || "Cleaning service"));
  const total = Number(booking.estimated_total || 0).toFixed(2);
  const area = escapeHtml(String(booking.service_area_name || ""));
  const message = booking.message
    ? `<p style="margin:16px 0;color:#334155;">${escapeHtml(String(booking.message))}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 30px rgba(15,23,42,.08);">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">RS Cleaning Collective</p>
    <h1 style="margin:0 0 12px;font-size:22px;">Your cleaning invoice</h1>
    <p style="margin:0 0 16px;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 16px;line-height:1.5;">Here is the invoice for your <strong>${service}</strong>${area ? ` in <strong>${area}</strong>` : ""}.</p>
    ${message}
    <p style="margin:20px 0 8px;font-size:28px;font-weight:700;color:#0f4fcf;">$${total}</p>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Secure payment powered by Square.</p>
    <a href="${escapeHtml(checkoutUrl)}" style="display:inline-block;background:#0f4fcf;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:600;">Pay now</a>
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">If the button does not work, copy this link:<br><a href="${escapeHtml(checkoutUrl)}">${escapeHtml(checkoutUrl)}</a></p>
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Questions? Reply to this email or call us at 202-262-6379.</p>
  </div>
</body>
</html>`;
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

    if (!(await isGmailConfigured())) {
      throw new Error(
        "Gmail is not configured yet. Complete Google setup in OFFLINE_INVOICES_SETUP.md, then add secrets to Supabase."
      );
    }

    const { booking_id: bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== "string") {
      throw new Error("booking_id is required");
    }

    const client = serviceRoleClient();
    const { data: booking, error } = await client
      .from("bookings")
      .select(
        "id, full_name, email, service_type, service_area_name, estimated_total, message, square_checkout_url, payment_status"
      )
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      throw new Error("Invoice not found");
    }
    if (!booking.email) {
      throw new Error("Customer email is missing on this invoice");
    }
    if (booking.payment_status === "paid") {
      throw new Error("This invoice is already paid");
    }
    if (!booking.square_checkout_url) {
      throw new Error("Create a payment link first, then send the invoice");
    }

    const subject = `RS Cleaning Collective — Invoice ($${Number(booking.estimated_total).toFixed(2)})`;
    const html = buildInvoiceEmail(booking, String(booking.square_checkout_url));

    await sendGmailEmail({
      to: String(booking.email),
      subject,
      html,
    });

    await client
      .from("bookings")
      .update({
        payment_status: "invoice_sent",
        invoice_sent_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    return json({
      ok: true,
      booking_id: bookingId,
      sent_to: booking.email,
      gmail_configured: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send invoice email";
    return json({ error: message, gmail_configured: await isGmailConfigured() }, 400);
  }
});
