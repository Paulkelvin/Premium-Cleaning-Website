export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `$${amount.toFixed(2)}`;
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function detailRow(label: string, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `<tr>
    <td style="padding:8px 12px 8px 0;color:#64748b;font-size:14px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:14px;color:#0f172a;">${escapeHtml(text)}</td>
  </tr>`;
}

export function buildEmailShell(options: {
  eyebrow: string;
  title: string;
  introHtml: string;
  rows?: Array<[string, unknown]>;
  footerHtml?: string;
}) {
  const rows = (options.rows || [])
    .map(([label, value]) => detailRow(label, value))
    .filter(Boolean)
    .join("");

  const table = rows
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 0;">${rows}</table>`
    : "";

  const footer =
    options.footerHtml ||
    `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Questions? Reply to this email or call us at 202-262-6379.</p>`;

  return `<!DOCTYPE html>
<html>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 30px rgba(15,23,42,.08);">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(options.eyebrow)}</p>
    <h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(options.title)}</h1>
    ${options.introHtml}
    ${table}
    ${footer}
  </div>
</body>
</html>`;
}

export function buildAdminDashboardUrl() {
  const siteUrl = String(Deno.env.get("SITE_URL") || "https://rs.cleaningcollective.workers.dev").replace(/\/$/, "");
  return `${siteUrl}/admin-dashboard.html`;
}

export type LeadRecord = Record<string, unknown>;

export function buildAdminLeadEmail(table: string, record: LeadRecord) {
  const name = String(record.full_name || "Customer");
  const dashboardUrl = buildAdminDashboardUrl();

  if (table === "contact_submissions") {
    return {
      subject: `New contact inquiry — ${name}`,
      html: buildEmailShell({
        eyebrow: "Admin alert",
        title: "New contact inquiry",
        introHtml: `<p style="margin:0;line-height:1.5;">A customer submitted the contact form. Review it in your dashboard.</p>`,
        rows: [
          ["Name", name],
          ["Email", record.email],
          ["Phone", record.phone],
          ["Inquiry type", record.inquiry_type],
          ["Preferred contact", record.preferred_contact_method],
          ["Message", record.message],
        ],
        footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;"><a href="${escapeHtml(dashboardUrl)}">Open admin dashboard</a></p>`,
      }),
    };
  }

  if (table === "quote_requests") {
    return {
      subject: `New quote request — ${name} (${formatMoney(record.estimated_total)})`,
      html: buildEmailShell({
        eyebrow: "Admin alert",
        title: "New quote request",
        introHtml: `<p style="margin:0;line-height:1.5;">A customer completed the quote wizard.</p>`,
        rows: [
          ["Name", name],
          ["Email", record.email],
          ["Phone", record.phone],
          ["Service", record.service_type],
          ["Property", record.property_type],
          ["Bedrooms", record.bedrooms],
          ["Bathrooms", record.bathrooms],
          ["Square feet", record.square_feet],
          ["Frequency", record.frequency],
          ["Add-ons", record.add_ons],
          ["Estimate", formatMoney(record.estimated_total)],
          ["Notes", record.message],
        ],
        footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;"><a href="${escapeHtml(dashboardUrl)}">Open admin dashboard</a></p>`,
      }),
    };
  }

  return {
    subject: `New booking — ${name} (${formatDate(record.preferred_date)})`,
    html: buildEmailShell({
      eyebrow: "Admin alert",
      title: "New booking request",
      introHtml: `<p style="margin:0;line-height:1.5;">A customer submitted a booking through the website.</p>`,
      rows: [
        ["Name", name],
        ["Email", record.email],
        ["Phone", record.phone],
        ["Service", record.service_type],
        ["Preferred date", formatDate(record.preferred_date)],
        ["Preferred time", record.preferred_time],
        ["Address", record.address],
        ["Service area", record.service_area_name],
        ["Payment method", record.payment_method === "pay_online" ? "Pay online" : "Pay at service"],
        ["Estimate", formatMoney(record.estimated_total)],
        ["Travel fee", formatMoney(record.travel_fee)],
        ["Add-ons", record.add_ons],
        ["Notes", record.message],
      ],
      footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;"><a href="${escapeHtml(dashboardUrl)}">Open admin dashboard</a></p>`,
    }),
  };
}

export function buildCustomerLeadEmail(table: string, record: LeadRecord) {
  const name = escapeHtml(String(record.full_name || "there"));

  if (table === "contact_submissions") {
    return {
      subject: "We received your message — RS Cleaning Collective",
      html: buildEmailShell({
        eyebrow: "RS Cleaning Collective",
        title: "Thanks for reaching out",
        introHtml: `<p style="margin:0;line-height:1.5;">Hi ${name},</p><p style="margin:16px 0 0;line-height:1.5;">We received your message and will follow up shortly.</p>`,
        rows: [
          ["Inquiry type", record.inquiry_type],
          ["Your message", record.message],
        ],
      }),
    };
  }

  if (table === "quote_requests") {
    return {
      subject: "Your quote request — RS Cleaning Collective",
      html: buildEmailShell({
        eyebrow: "RS Cleaning Collective",
        title: "Quote request received",
        introHtml: `<p style="margin:0;line-height:1.5;">Hi ${name},</p><p style="margin:16px 0 0;line-height:1.5;">Thanks for requesting an estimate. Here is a summary of what you submitted.</p>`,
        rows: [
          ["Service", record.service_type],
          ["Property", record.property_type],
          ["Estimate", formatMoney(record.estimated_total)],
          ["Frequency", record.frequency],
          ["Add-ons", record.add_ons],
        ],
        footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Ready to schedule? Continue to booking on our website or reply to this email.</p>`,
      }),
    };
  }

  const payOnline = record.payment_method === "pay_online";
  const nextStep = payOnline
    ? "If you chose pay online, complete checkout when prompted or watch for a payment link from our team."
    : "We will contact you shortly to confirm your appointment time.";

  return {
    subject: "Booking request received — RS Cleaning Collective",
    html: buildEmailShell({
      eyebrow: "RS Cleaning Collective",
      title: "Your booking request is in",
      introHtml: `<p style="margin:0;line-height:1.5;">Hi ${name},</p><p style="margin:16px 0 0;line-height:1.5;">Thanks for booking with RS Cleaning Collective. ${escapeHtml(nextStep)}</p>`,
      rows: [
        ["Service", record.service_type],
        ["Preferred date", formatDate(record.preferred_date)],
        ["Preferred time", record.preferred_time],
        ["Address", record.address],
        ["Estimate", formatMoney(record.estimated_total)],
        ["Payment", payOnline ? "Pay online" : "Pay at service"],
      ],
    }),
  };
}

export function buildAdminPaymentEmail(record: LeadRecord) {
  const name = String(record.full_name || "Customer");
  return {
    subject: `Payment received — ${name} (${formatMoney(record.estimated_total)})`,
    html: buildEmailShell({
      eyebrow: "Admin alert",
      title: "Booking payment received",
      introHtml: `<p style="margin:0;line-height:1.5;">Square marked this booking as paid.</p>`,
      rows: [
        ["Name", name],
        ["Email", record.email],
        ["Phone", record.phone],
        ["Service", record.service_type],
        ["Amount", formatMoney(record.estimated_total)],
        ["Preferred date", formatDate(record.preferred_date)],
        ["Address", record.address],
      ],
      footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;"><a href="${escapeHtml(buildAdminDashboardUrl())}">Open admin dashboard</a></p>`,
    }),
  };
}

export function buildCustomerPaymentEmail(record: LeadRecord) {
  const name = escapeHtml(String(record.full_name || "there"));
  return {
    subject: "Payment received — RS Cleaning Collective",
    html: buildEmailShell({
      eyebrow: "RS Cleaning Collective",
      title: "Thank you for your payment",
      introHtml: `<p style="margin:0;line-height:1.5;">Hi ${name},</p><p style="margin:16px 0 0;line-height:1.5;">We received your payment. Our team will confirm your appointment details shortly.</p>`,
      rows: [
        ["Service", record.service_type],
        ["Amount paid", formatMoney(record.estimated_total)],
        ["Preferred date", formatDate(record.preferred_date)],
      ],
      footerHtml: `<p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">Square may also send its own receipt. Save this email for your records.</p>`,
    }),
  };
}
