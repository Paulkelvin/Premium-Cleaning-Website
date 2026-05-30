const adminConfig = window.CLEANCO_CONFIG || {};
const adminHasSupabase = Boolean(adminConfig.supabaseUrl && adminConfig.supabaseAnonKey);

const TABLES = ["contact_submissions", "quote_requests", "bookings"];

const TABLE_VIEW = {
  contact_submissions: "inbox",
  quote_requests: "quotes",
  bookings: "bookings"
};

const ACTIVITY_ICONS = {
  contact_submissions: "mail",
  quote_requests: "file-text",
  bookings: "calendar-check"
};

const EMPTY_COPY = {
  contact_submissions: "Submissions appear when customers use the contact form.",
  quote_requests: "Quote requests appear when customers complete the quote wizard.",
  bookings: "Bookings appear when customers schedule through the booking flow."
};

let dashboardCache = {
  contact_submissions: [],
  quote_requests: [],
  bookings: []
};

let currentAdminProfile = { email: "", role: "admin" };

function getAdminHeaders() {
  return {
    apikey: adminConfig.supabaseAnonKey,
    Authorization: `Bearer ${getAdminToken()}`
  };
}

async function verifyAdminEmail(email, token) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return false;
  if (!adminHasSupabase) {
    return getAllowedAdminEmails().includes(normalized);
  }
  try {
    const response = await fetch(
      `${adminConfig.supabaseUrl}/rest/v1/admin_users?email=eq.${encodeURIComponent(normalized)}&select=email`,
      { headers: { apikey: adminConfig.supabaseAnonKey, Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return false;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.warn("Could not verify admin_users.", error);
    return false;
  }
}

async function assertAdminSession() {
  if (!adminHasSupabase) return isLoggedIn();
  const token = getAdminToken();
  if (!token) return false;
  const email = (
    safeGet("cleanco_admin_email") ||
    parseJwtEmail(token) ||
    ""
  ).toLowerCase();
  if (!email) return false;
  return verifyAdminEmail(email, token);
}

function showAdminToast(message, type = "error") {
  if (typeof window.showAppToast === "function") {
    window.showAppToast(message, type);
    return;
  }
  window.alert(message);
}

function getAllowedAdminEmails() {
  const list = adminConfig.adminEmails;
  if (Array.isArray(list) && list.length) {
    return list.map((entry) => String(entry).toLowerCase().trim()).filter(Boolean);
  }
  const single = String(adminConfig.adminEmail || "").toLowerCase().trim();
  return single ? [single] : [];
}

const localTables = {
  contact_submissions: "cleanco_contact_submissions",
  quote_requests: "cleanco_quote_requests",
  bookings: "cleanco_bookings"
};

const VIEW_META = {
  dashboard: { title: "Dashboard", subtitle: "Overview of leads, quotes, and bookings" },
  inbox: { title: "Contact Inbox", subtitle: "Customer inquiries and messages" },
  quotes: { title: "Quote Requests", subtitle: "Estimate requests from the quote wizard" },
  bookings: { title: "Bookings", subtitle: "Appointments, payment, and schedule details" },
  invoices: {
    title: "Offline invoices",
    subtitle: "Create locked-price quotes and send Square payment links by email"
  },
  settings: { title: "Settings", subtitle: "Workspace configuration" }
};

const TABLE_LABELS = {
  contact_submissions: "Contact",
  quote_requests: "Quote",
  bookings: "Booking"
};

const FIELD_CONFIG = {
  contact_submissions: [
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "inquiry_type", label: "Inquiry type" },
    { key: "preferred_contact_method", label: "Preferred contact" },
    { key: "consent", label: "Consent", type: "boolean" },
    { key: "status", label: "Status" },
    { key: "id", label: "Record ID", type: "mono" }
  ],
  quote_requests: [
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "service_type", label: "Service" },
    { key: "property_type", label: "Property type" },
    { key: "bedrooms", label: "Bedrooms" },
    { key: "bathrooms", label: "Bathrooms" },
    { key: "square_feet", label: "Square feet" },
    { key: "frequency", label: "Frequency" },
    { key: "add_ons", label: "Add-ons" },
    { key: "preferred_contact", label: "Preferred contact" },
    { key: "estimated_total", label: "Estimate", type: "currency" },
    { key: "consent", label: "Consent", type: "boolean" },
    { key: "status", label: "Status" },
    { key: "id", label: "Record ID", type: "mono" }
  ],
  bookings: [
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "service_type", label: "Service" },
    { key: "property_type", label: "Property type" },
    { key: "bedrooms", label: "Bedrooms" },
    { key: "bathrooms", label: "Bathrooms" },
    { key: "square_feet", label: "Square feet" },
    { key: "frequency", label: "Frequency" },
    { key: "add_ons", label: "Add-ons" },
    { key: "preferred_date", label: "Preferred date", type: "date" },
    { key: "preferred_time", label: "Preferred time" },
    { key: "address", label: "Address", wide: true },
    { key: "source", label: "Source" },
    { key: "payment_method", label: "Payment method" },
    { key: "payment_status", label: "Payment status" },
    { key: "estimated_total", label: "Estimate", type: "currency" },
    { key: "admin_notes", label: "Admin notes", wide: true },
    { key: "invoice_sent_at", label: "Invoice emailed", type: "date" },
    { key: "quote_id", label: "Quote ID", type: "mono" },
    { key: "consent", label: "Consent", type: "boolean" },
    { key: "status", label: "Status" },
    { key: "id", label: "Record ID", type: "mono" }
  ]
};

function safeGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

function safeSet(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function safeRemove(key) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function parseJwtEmail(token) {
  if (!token) return "";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return String(json.email || "").toLowerCase();
  } catch {
    return "";
  }
}

function captureAuthHashOnce() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || !hash.includes("access_token=")) return;
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  if (!token) return;
  safeSet("cleanco_admin_token", token);
  safeSet("cleanco_admin_email", parseJwtEmail(token));
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

captureAuthHashOnce();

function getAdminToken() {
  return safeGet("cleanco_admin_token");
}

function goToDashboard(accessToken) {
  if (accessToken) {
    safeSet("cleanco_admin_email", parseJwtEmail(accessToken));
    safeSet("cleanco_admin_token", accessToken);
  }
  window.location.href = "admin-dashboard.html";
}

function clearAdminSession() {
  safeRemove("cleanco_admin");
  safeRemove("cleanco_admin_token");
  safeRemove("cleanco_admin_email");
}

function isLoggedIn() {
  if (!adminHasSupabase) return safeGet("cleanco_admin") === "true";
  return Boolean(getAdminToken());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFieldValue(value, type) {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "currency") return `$${Number(value).toFixed(2)}`;
  if (type === "date") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : parsed.toLocaleDateString();
  }
  if (type === "email") {
    return `<a href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
  }
  if (type === "phone") {
    const digits = String(value).replace(/\D/g, "");
    const href = digits ? `tel:+${digits}` : "#";
    return `<a href="${href}">${escapeHtml(value)}</a>`;
  }
  if (type === "mono") {
    return `<code>${escapeHtml(value)}</code>`;
  }
  return escapeHtml(String(value).replace(/_/g, " "));
}

function formatTimestamp(value) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function getRowTitle(row) {
  return row.full_name || row.name || row.email || "New lead";
}

function getRowSummary(table, row) {
  if (table === "contact_submissions") {
    return [row.inquiry_type, row.email, row.phone].filter(Boolean).join(" · ");
  }
  if (table === "quote_requests") {
    return [
      row.service_type,
      row.property_type,
      row.bedrooms ? `${row.bedrooms} bed` : "",
      row.estimated_total ? `$${Number(row.estimated_total).toFixed(2)}` : ""
    ].filter(Boolean).join(" · ");
  }
  return [
    row.service_type,
    row.preferred_date,
    row.preferred_time,
    row.estimated_total ? `$${Number(row.estimated_total).toFixed(2)}` : "",
    row.payment_method?.replace(/_/g, " ")
  ].filter(Boolean).join(" · ");
}

function getEstimateBadge(row) {
  if (!row.estimated_total) return "";
  return `<span class="admin-record-estimate">$${Number(row.estimated_total).toFixed(2)}</span>`;
}

function getDateGroupLabel(isoDate) {
  if (!isoDate) return "Earlier";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);

  if (date >= startToday) return "Today";
  if (date >= startYesterday) return "Yesterday";
  if (date >= startWeek) return "This week";
  return "Earlier";
}

function rowMatchesSearch(row, query) {
  if (!query) return true;
  const haystack = [
    row.full_name,
    row.name,
    row.email,
    row.phone,
    row.message,
    row.service_type,
    row.address,
    row.inquiry_type
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function rowMatchesStatusFilter(row, filter) {
  if (!filter || filter === "all") return true;
  return (row.status || "new") === filter;
}

function normalizeFrequency(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "one-time";
  if (text === "one-time" || text === "one time" || text === "onetime") return "one-time";
  if (text === "weekly") return "weekly";
  if (text === "bi-weekly" || text === "biweekly" || text === "every 2 weeks") return "bi-weekly";
  if (text === "monthly") return "monthly";
  return "one-time";
}

function isRepeatFrequency(value) {
  const normalized = normalizeFrequency(value);
  return normalized === "weekly" || normalized === "bi-weekly" || normalized === "monthly";
}

function rowMatchesFrequencyFilter(row, filter) {
  if (!filter || filter === "all") return true;
  const frequency = normalizeFrequency(row.frequency);
  if (filter === "repeat") return isRepeatFrequency(frequency);
  if (filter === "one-time") return frequency === "one-time";
  return frequency === filter;
}

function normalizePaymentStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function rowMatchesPaymentFilter(row, filter, table) {
  if (table !== "bookings" || !filter || filter === "all") return true;
  const paymentStatus = normalizePaymentStatus(row.payment_status);
  if (filter === "paid") return paymentStatus === "paid";
  if (filter === "pending") return paymentStatus === "pending_payment";
  if (filter === "unpaid") return paymentStatus !== "paid";
  return true;
}

function getToolbarState(table) {
  const toolbar = document.querySelector(`[data-admin-toolbar='${table}']`);
  if (!toolbar) return { query: "", status: "all", frequency: "all", payment: "all" };
  const search = toolbar.querySelector("[data-admin-search]");
  const statusFilter = toolbar.querySelector("[data-admin-status-filter]");
  const frequencyFilter = toolbar.querySelector("[data-admin-frequency-filter]");
  const paymentFilter = toolbar.querySelector("[data-admin-payment-filter]");
  return {
    query: (search?.value || "").trim().toLowerCase(),
    status: statusFilter?.value || "all",
    frequency: frequencyFilter?.value || "all",
    payment: paymentFilter?.value || "all"
  };
}

function filterRows(table, rows) {
  const { query, status, frequency, payment } = getToolbarState(table);
  return rows.filter(
    (row) =>
      rowMatchesSearch(row, query) &&
      rowMatchesStatusFilter(row, status) &&
      rowMatchesFrequencyFilter(row, frequency) &&
      rowMatchesPaymentFilter(row, payment, table)
  );
}

function renderFieldGrid(table, row) {
  const fields = FIELD_CONFIG[table] || [];
  return fields
    .map((field) => {
      const raw = row[field.key];
      const value = field.key === "status" ? raw || "new" : raw;
      const classes = ["admin-field"];
      if (field.wide) classes.push("admin-field--wide");
      return `
      <div class="${classes.join(" ")}">
        <span class="admin-field-label">${escapeHtml(field.label)}</span>
        <span class="admin-field-value">${formatFieldValue(value, field.type)}</span>
      </div>
    `;
    })
    .join("");
}

function renderStatusActions(table, row, status) {
  const actions = [];
  const title = getRowTitle(row);
  if (row.email) {
    actions.push(
      `<a class="admin-btn admin-btn--ghost" href="mailto:${escapeHtml(row.email)}"><i data-lucide="mail"></i> Email</a>`
    );
  }
  if (row.phone) {
    actions.push(
      `<a class="admin-btn admin-btn--ghost" href="tel:${escapeHtml(String(row.phone).replace(/\D/g, ""))}"><i data-lucide="phone"></i> Call</a>`
    );
  }
  if (table === "bookings" && row.source === "admin" && row.square_checkout_url) {
    actions.push(
      `<button class="admin-btn admin-btn--ghost" type="button" data-booking-copy-link="${escapeHtml(row.id)}"><i data-lucide="link"></i> Copy pay link</button>`
    );
  }
  if (table === "bookings" && row.source === "admin" && row.payment_status !== "paid") {
    actions.push(
      `<button class="admin-btn admin-btn--ghost" type="button" data-booking-open-invoice="${escapeHtml(row.id)}"><i data-lucide="receipt"></i> Invoices</button>`
    );
  }
  if (status === "new") {
    actions.push(
      `<button class="admin-btn admin-btn--ghost" type="button" data-mark-status data-status="contacted" data-table="${table}" data-id="${row.id}"><i data-lucide="message-circle"></i> Contacted</button>`
    );
  }
  if (status !== "resolved") {
    actions.push(
      `<button class="admin-btn admin-btn--primary" type="button" data-mark-status data-status="resolved" data-table="${table}" data-id="${row.id}"><i data-lucide="check"></i> Mark handled</button>`
    );
  }
  actions.push(
    `<button class="admin-btn admin-btn--danger" type="button" data-delete-record data-table="${table}" data-id="${row.id}" data-title="${escapeHtml(title)}"><i data-lucide="trash-2"></i> Delete</button>`
  );
  return actions.join("");
}

function renderPaymentBadge(row, table) {
  if (table !== "bookings") return "";
  const paymentStatus = normalizePaymentStatus(row.payment_status);
  if (paymentStatus === "paid") {
    return `<span class="status paid">paid</span>`;
  }
  if (paymentStatus === "pending_payment") {
    return `<span class="status pending-payment">pending</span>`;
  }
  return "";
}

function renderRecord(table, row, { forceExpanded } = {}) {
  const status = row.status || "new";
  const paymentStatus = normalizePaymentStatus(row.payment_status);
  const isPaidBooking = table === "bookings" && paymentStatus === "paid";
  const title = getRowTitle(row);
  const summary = getRowSummary(table, row);
  const expanded = forceExpanded === true;
  const bodyId = `record-body-${table}-${row.id}`;
  const estimateBadge =
    table !== "contact_submissions" ? getEstimateBadge(row) : "";
  const paymentBadge = renderPaymentBadge(row, table);

  const message = row.message
    ? `
    <div class="admin-record-message">
      <span class="admin-field-label">Message</span>
      <p>${escapeHtml(row.message)}</p>
    </div>
  `
    : "";

  return `
    <article class="admin-record${expanded ? " is-expanded" : ""}${isPaidBooking ? " admin-record--paid" : ""}" data-record-id="${escapeHtml(row.id)}" data-admin-record data-table="${table}">
      <div class="admin-record-head">
        <button type="button" class="admin-record-toggle" aria-expanded="${expanded}" aria-controls="${bodyId}">
          <span class="admin-record-chevron" aria-hidden="true"></span>
          <span class="admin-record-title-wrap">
            <span class="admin-record-statuses">
              <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
              ${paymentBadge}
            </span>
            <span class="admin-record-heading">
              <strong class="admin-record-name">${escapeHtml(title)}</strong>
              ${estimateBadge}
            </span>
            <span class="admin-record-summary">${escapeHtml(summary || "No summary")}</span>
            <time class="admin-record-time">${formatTimestamp(row.created_at)}</time>
          </span>
        </button>
        <div class="admin-record-actions">
          ${renderStatusActions(table, row, status)}
        </div>
      </div>
      <div class="admin-record-body" id="${bodyId}"${expanded ? "" : " hidden"}>
        <div class="admin-record-grid">
          ${renderFieldGrid(table, row)}
        </div>
        ${message}
      </div>
    </article>
  `;
}

function renderEmptyState(table, filtered) {
  const { query, status, frequency, payment } = getToolbarState(table);
  const hasFilters = query || status !== "all" || frequency !== "all" || payment !== "all";
  if (hasFilters && filtered) {
    return `
      <div class="admin-empty">
        <i data-lucide="search-x"></i>
        <p><strong>No matches</strong></p>
        <p>Try a different search or filter.</p>
      </div>
    `;
  }
  return `
    <div class="admin-empty">
      <i data-lucide="inbox"></i>
      <p><strong>No ${TABLE_LABELS[table]?.toLowerCase() || "record"} submissions yet</strong></p>
      <p>${EMPTY_COPY[table] || ""}</p>
    </div>
  `;
}

function groupRowsByDate(rows) {
  const groups = new Map();
  const order = ["Today", "Yesterday", "This week", "Earlier"];

  rows.forEach((row) => {
    const label = getDateGroupLabel(row.created_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  });

  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, rows: groups.get(label) }));
}

function renderRows(table, rows, { forceExpanded } = {}) {
  const target = document.querySelector(`[data-admin-table='${table}']`);
  if (!target) return;

  const filtered = filterRows(table, rows);
  updatePanelCount(table, rows, filtered);

  if (!filtered.length) {
    target.innerHTML = renderEmptyState(table, true);
    refreshIcons();
    return;
  }

  const grouped = groupRowsByDate(filtered);
  target.innerHTML = grouped
    .map(
      ({ label, rows: groupRows }) => `
      <div class="admin-record-group">
        <h3 class="admin-record-group-label">${escapeHtml(label)}</h3>
        ${groupRows.map((row) => renderRecord(table, row, { forceExpanded })).join("")}
      </div>
    `
    )
    .join("");
  refreshIcons();
}

function updatePanelCount(table, allRows, filteredRows) {
  const chip = document.querySelector(`[data-admin-panel-count='${table}']`);
  if (!chip) return;
  const newCount = allRows.filter((r) => (r.status || "new") === "new").length;
  const showing = filteredRows.length;
  const total = allRows.length;
  if (showing === total) {
    chip.textContent = `${total} submission${total === 1 ? "" : "s"} · ${newCount} new`;
  } else {
    chip.textContent = `Showing ${showing} of ${total} · ${newCount} new`;
  }
}

function setRecordExpanded(record, expanded) {
  const toggle = record.querySelector(".admin-record-toggle");
  const body = record.querySelector(".admin-record-body");
  if (!toggle || !body) return;
  record.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  body.hidden = !expanded;
}

function setAllRecordsExpanded(table, expanded) {
  document
    .querySelectorAll(`[data-admin-table='${table}'] [data-admin-record]`)
    .forEach((record) => setRecordExpanded(record, expanded));
}

function renderActivity(allRows) {
  const target = document.querySelector("[data-admin-activity]");
  if (!target) return;

  const sorted = [...allRows]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  if (!sorted.length) {
    target.innerHTML = `
      <div class="admin-empty admin-empty--compact">
        <i data-lucide="activity"></i>
        <p>No activity yet.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  target.innerHTML = sorted
    .map((row) => {
      const status = row.status || "new";
      const paymentBadge = renderPaymentBadge(row, row.table);
      const icon = ACTIVITY_ICONS[row.table] || "circle";
      return `
      <a class="admin-activity-item" href="#" data-activity-jump="${row.table}">
        <span class="admin-activity-icon"><i data-lucide="${icon}"></i></span>
        <span class="admin-activity-type">${escapeHtml(TABLE_LABELS[row.table])}</span>
        <div class="admin-activity-copy">
          <strong>${escapeHtml(getRowTitle(row))}</strong>
          <span>${escapeHtml(getRowSummary(row.table, row) || "New submission")}</span>
        </div>
        <span class="admin-activity-statuses">
          <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
          ${paymentBadge}
        </span>
        <time>${formatTimestamp(row.created_at)}</time>
      </a>
    `;
    })
    .join("");
  refreshIcons();
}

function toMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function safePercent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function buildFrequencyMix(bookings) {
  const buckets = {
    "one-time": 0,
    weekly: 0,
    "bi-weekly": 0,
    monthly: 0,
    other: 0
  };
  bookings.forEach((row) => {
    const freq = normalizeFrequency(row.frequency);
    if (Object.prototype.hasOwnProperty.call(buckets, freq)) {
      buckets[freq] += 1;
    } else {
      buckets.other += 1;
    }
  });
  return buckets;
}

function renderAnalytics() {
  const target = document.querySelector("[data-admin-analytics]");
  if (!target) return;

  const quotes = dashboardCache.quote_requests || [];
  const bookings = dashboardCache.bookings || [];
  const validBookings = bookings.filter((row) => Number(row.estimated_total || 0) > 0);
  const totalRevenue = validBookings.reduce((sum, row) => sum + Number(row.estimated_total || 0), 0);
  const avgTicket = validBookings.length ? totalRevenue / validBookings.length : 0;

  const clientKeys = new Set();
  bookings.forEach((row) => {
    const key = String(row.email || row.phone || "").trim().toLowerCase();
    if (key) clientKeys.add(key);
  });

  const repeatClients = new Set();
  bookings.forEach((row) => {
    const key = String(row.email || row.phone || "").trim().toLowerCase();
    if (!key) return;
    if (isRepeatFrequency(row.frequency)) repeatClients.add(key);
  });

  const repeatRate = safePercent(repeatClients.size, clientKeys.size);
  const bookingsFromQuotes = bookings.filter((row) => Boolean(row.quote_id)).length;
  const quoteToBookingRate = safePercent(bookingsFromQuotes, quotes.length);
  const mix = buildFrequencyMix(bookings);
  const mixMax = Math.max(...Object.values(mix), 1);

  const adminInvoices = bookings.filter((row) => row.source === "admin");
  const invoicePipeline = {
    draft: adminInvoices.filter((row) => row.payment_status === "invoice_draft").length,
    pending: adminInvoices.filter((row) => row.payment_status === "pending_payment").length,
    sent: adminInvoices.filter((row) => row.payment_status === "invoice_sent").length,
    paid: adminInvoices.filter((row) => row.payment_status === "paid").length
  };

  target.innerHTML = `
    <article class="admin-analytic-card">
      <h3>Revenue snapshot</h3>
      <p><strong>${toMoney(totalRevenue)}</strong> from ${validBookings.length} bookings</p>
      <span>Avg ticket: ${toMoney(avgTicket)}</span>
    </article>
    <article class="admin-analytic-card">
      <h3>Repeat client rate</h3>
      <p><strong>${repeatRate}%</strong> repeat clients</p>
      <span>${repeatClients.size} of ${clientKeys.size || 0} clients have non one-time frequency</span>
    </article>
    <article class="admin-analytic-card">
      <h3>Quote to booking</h3>
      <p><strong>${quoteToBookingRate}%</strong> conversion</p>
      <span>${bookingsFromQuotes} quote-linked bookings from ${quotes.length} quotes</span>
    </article>
    <article class="admin-analytic-card">
      <h3>Invoice pipeline</h3>
      <p><strong>${adminInvoices.length}</strong> admin invoices</p>
      <span>Draft ${invoicePipeline.draft} · Pending ${invoicePipeline.pending} · Sent ${invoicePipeline.sent} · Paid ${invoicePipeline.paid}</span>
    </article>
    <article class="admin-analytic-card admin-analytic-card--wide">
      <h3>Frequency mix</h3>
      <div class="admin-frequency-bars">
        ${[
          ["one-time", "One-time", mix["one-time"]],
          ["weekly", "Weekly", mix.weekly],
          ["bi-weekly", "Bi-weekly", mix["bi-weekly"]],
          ["monthly", "Monthly", mix.monthly]
        ]
          .map(
            ([key, label, count]) => `
          <div class="admin-frequency-bar-row">
            <span>${label}</span>
            <div class="admin-frequency-bar-track"><i style="width:${Math.max(8, Math.round((count / mixMax) * 100))}%"></i></div>
            <strong>${count}</strong>
          </div>`
          )
          .join("")}
      </div>
    </article>
  `;
}

function refreshIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function setDashboardLoading(loading) {
  const el = document.querySelector("[data-admin-loading]");
  const main = document.querySelector("[data-admin-main]");
  if (el) {
    el.hidden = !loading;
    el.setAttribute("aria-hidden", String(!loading));
  }
  if (main) main.classList.toggle("is-loading", loading);
}

function updateSignedInLabel() {
  const label = document.querySelector("[data-admin-user-label]");
  if (!label) return;
  const email =
    safeGet("cleanco_admin_email") ||
    parseJwtEmail(getAdminToken()) ||
    getAllowedAdminEmails()[0] ||
    "Admin";
  label.textContent = email;
  label.title = email;
}

function updateCounts() {
  const all = TABLES.flatMap((table) =>
    dashboardCache[table].map((row) => ({ table, ...row }))
  );

  const newCount = all.filter((row) => (row.status || "new") === "new").length;
  const contactsEl = document.querySelector("[data-count='contacts']");
  const quotesEl = document.querySelector("[data-count='quotes']");
  const bookingsEl = document.querySelector("[data-count='bookings']");
  const newEl = document.querySelector("[data-count='new']");

  if (newEl) newEl.textContent = newCount;
  if (contactsEl) contactsEl.textContent = dashboardCache.contact_submissions.length;
  if (quotesEl) quotesEl.textContent = dashboardCache.quote_requests.length;
  if (bookingsEl) bookingsEl.textContent = dashboardCache.bookings.length;

  const navContacts = document.querySelector("[data-nav-count='contacts']");
  const navQuotes = document.querySelector("[data-nav-count='quotes']");
  const navBookings = document.querySelector("[data-nav-count='bookings']");

  if (navContacts) {
    navContacts.textContent = dashboardCache.contact_submissions.filter(
      (r) => (r.status || "new") === "new"
    ).length;
  }
  if (navQuotes) {
    navQuotes.textContent = dashboardCache.quote_requests.filter(
      (r) => (r.status || "new") === "new"
    ).length;
  }
  if (navBookings) {
    navBookings.textContent = dashboardCache.bookings.filter(
      (r) => (r.status || "new") === "new"
    ).length;
  }

  document.querySelectorAll("[data-nav-count]").forEach((badge) => {
    badge.hidden = Number(badge.textContent) === 0;
  });
}

function renderAllTables() {
  TABLES.forEach((table) => renderRows(table, dashboardCache[table]));
}

const loginForm = document.querySelector("[data-admin-login]");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);
    const email = data.get("email");
    const password = data.get("password");
    const state = loginForm.querySelector("[data-form-state]");
    const submit = loginForm.querySelector("button[type='submit']");
    if (state) {
      state.className = "form-state loading admin-login-state";
      state.textContent = "Signing in...";
    }
    if (submit) submit.disabled = true;

    if (!adminHasSupabase && email && password) {
      safeSet("cleanco_admin", "true");
      safeSet("cleanco_admin_email", String(email).toLowerCase());
      window.location.href = "admin-dashboard.html";
      return;
    }

    try {
      const response = await fetch(`${adminConfig.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: adminConfig.supabaseAnonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error_description || body.msg || body.message || "Sign in failed");
      }
      const signedInEmail = String(body.user?.email || email || "").toLowerCase();
      const isAuthorized = await verifyAdminEmail(signedInEmail, body.access_token);
      if (!isAuthorized) {
        throw new Error("This account is not authorized for admin access.");
      }
      safeSet("cleanco_admin_email", signedInEmail);
      goToDashboard(body.access_token);
    } catch (error) {
      console.error(error);
      if (state) {
        state.className = "form-state error admin-login-state";
        state.textContent = `Could not sign in: ${error.message}`;
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

async function fetchTable(table) {
  if (!adminHasSupabase) {
    return JSON.parse(localStorage.getItem(localTables[table]) || "[]");
  }

  const response = await fetch(
    `${adminConfig.supabaseUrl}/rest/v1/${table}?select=*&order=created_at.desc`,
    { headers: getAdminHeaders() }
  );
  if (!response.ok) {
    console.error(`Could not fetch ${table}:`, await response.text());
    return [];
  }
  return response.json();
}

async function updateStatus(table, id, status) {
  if (!adminHasSupabase) {
    const key = localTables[table];
    const rows = JSON.parse(localStorage.getItem(key) || "[]").map((row) =>
      row.id === id ? { ...row, status } : row
    );
    localStorage.setItem(key, JSON.stringify(rows));
    return;
  }

  const response = await fetch(`${adminConfig.supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...getAdminHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function deleteRecord(table, id) {
  if (!adminHasSupabase) {
    const key = localTables[table];
    const rows = JSON.parse(localStorage.getItem(key) || "[]").filter((row) => row.id !== id);
    localStorage.setItem(key, JSON.stringify(rows));
    return;
  }

  const response = await fetch(`${adminConfig.supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: getAdminHeaders()
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function fetchCurrentAdminProfile() {
  const email = (
    safeGet("cleanco_admin_email") ||
    parseJwtEmail(getAdminToken()) ||
    ""
  ).toLowerCase();

  if (!adminHasSupabase || !email) {
    const isSuper = getAllowedAdminEmails().includes(email);
    return { email, role: isSuper ? "superuser" : "admin" };
  }

  const response = await fetch(
    `${adminConfig.supabaseUrl}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&select=email,role`,
    { headers: getAdminHeaders() }
  );
  if (!response.ok) {
    return { email, role: "admin" };
  }
  const rows = await response.json();
  if (!rows.length) {
    return { email, role: "admin" };
  }
  return rows[0];
}

function isSuperuser() {
  return currentAdminProfile.role === "superuser";
}

async function fetchAdminTeam() {
  if (!isSuperuser()) return [];
  if (!adminHasSupabase) {
    return getAllowedAdminEmails().map((entry) => ({
      email: entry,
      created_at: null,
      invited_by: null,
      role: "superuser"
    }));
  }
  const response = await fetch(
    `${adminConfig.supabaseUrl}/rest/v1/admin_users?role=eq.admin&select=email,created_at,invited_by,role&order=created_at.asc`,
    { headers: getAdminHeaders() }
  );
  if (!response.ok) {
    console.error("Could not fetch admin team:", await response.text());
    return [];
  }
  return response.json();
}

async function createAdminUser(email, password) {
  if (!adminHasSupabase) {
    throw new Error("Supabase is required to create admin accounts.");
  }
  const response = await fetch(`${adminConfig.supabaseUrl}/functions/v1/admin-create-user`, {
    method: "POST",
    headers: {
      ...getAdminHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Could not create admin account");
  }
  return body;
}

async function deleteAdminUser(email) {
  if (!adminHasSupabase) {
    throw new Error("Supabase is required to remove admin accounts.");
  }
  const response = await fetch(`${adminConfig.supabaseUrl}/functions/v1/admin-delete-user`, {
    method: "POST",
    headers: {
      ...getAdminHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Could not remove admin account");
  }
  return body;
}

function renderAdminTeam(members) {
  const list = document.querySelector("[data-admin-team-list]");
  if (!list) return;
  if (!members.length) {
    list.innerHTML = `<li class="admin-team-empty">No standard admin accounts yet.</li>`;
    return;
  }
  list.innerHTML = members
    .map((member) => {
      const invited = member.invited_by ? ` · invited by ${escapeHtml(member.invited_by)}` : "";
      const when = member.created_at ? formatTimestamp(member.created_at) : "Demo mode";
      return `
        <li class="admin-team-item">
          <div class="admin-team-item-copy">
            <strong>${escapeHtml(member.email)}</strong>
            <span>${when}${invited}</span>
          </div>
          <button class="admin-btn admin-btn--danger admin-btn--small" type="button" data-delete-admin data-email="${escapeHtml(member.email)}">
            <i data-lucide="trash-2"></i> Remove
          </button>
        </li>`;
    })
    .join("");
}

function updateSettingsPanel() {
  const emailEl = document.querySelector("[data-settings-email]");
  const roleEl = document.querySelector("[data-settings-role]");
  const siteEl = document.querySelector("[data-settings-site-url]");
  const superCard = document.querySelector("[data-superuser-only]");
  const adminNote = document.querySelector("[data-admin-only-note]");
  const email =
    currentAdminProfile.email ||
    safeGet("cleanco_admin_email") ||
    parseJwtEmail(getAdminToken()) ||
    "Admin";

  if (emailEl) emailEl.textContent = email;
  if (roleEl) {
    const label = isSuperuser() ? "Super admin" : "Admin";
    roleEl.textContent = label;
    roleEl.hidden = false;
    roleEl.className = `admin-role-badge ${isSuperuser() ? "is-super" : "is-admin"}`;
  }
  if (superCard) superCard.hidden = !isSuperuser();
  if (adminNote) adminNote.hidden = isSuperuser();
  if (siteEl) {
    const siteUrl = adminConfig.siteUrl || window.location.origin;
    siteEl.innerHTML = `<a href="${escapeHtml(siteUrl)}" target="_blank" rel="noopener">${escapeHtml(siteUrl)}</a>`;
  }
}

async function loadSettingsView() {
  currentAdminProfile = await fetchCurrentAdminProfile();
  updateSettingsPanel();
  if (isSuperuser()) {
    const members = await fetchAdminTeam();
    renderAdminTeam(members);
  }
  refreshIcons();
}

function flattenRecord(row) {
  const copy = { ...row };
  Object.keys(copy).forEach((key) => {
    const value = copy[key];
    if (value === null || value === undefined) return;
    if (typeof value === "object") copy[key] = JSON.stringify(value);
  });
  return copy;
}

function getExportDateRange() {
  const fromVal = document.querySelector("[data-admin-export-from]")?.value?.trim();
  const toVal = document.querySelector("[data-admin-export-to]")?.value?.trim();
  if (!fromVal || !toVal) {
    showAdminToast("Choose a start date and end date for the report.");
    return null;
  }
  const from = new Date(`${fromVal}T00:00:00`);
  const to = new Date(`${toVal}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    showAdminToast("Invalid date range.");
    return null;
  }
  if (from > to) {
    showAdminToast("Start date must be on or before the end date.");
    return null;
  }
  return { from: fromVal, to: toVal, fromTime: from.getTime(), toTime: to.getTime() };
}

function recordInExportRange(row, range) {
  if (!row?.created_at) return false;
  const created = new Date(row.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return created >= range.fromTime && created <= range.toTime;
}

function filterTableRows(table, range) {
  return (dashboardCache[table] || []).filter((row) => recordInExportRange(row, range));
}

function getExportRows(scope, range) {
  if (scope === "all") {
    return [
      ...filterTableRows("contact_submissions", range).map((row) => ({ record_type: "contact", ...flattenRecord(row) })),
      ...filterTableRows("quote_requests", range).map((row) => ({ record_type: "quote", ...flattenRecord(row) })),
      ...filterTableRows("bookings", range).map((row) => ({ record_type: "booking", ...flattenRecord(row) }))
    ];
  }
  const label = scope === "contact_submissions" ? "contact" : scope === "quote_requests" ? "quote" : "booking";
  return filterTableRows(scope, range).map((row) => ({ record_type: label, ...flattenRecord(row) }));
}

function exportFilenameStamp(range) {
  return `${range.from}_to_${range.to}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRecords() {
  const format = document.querySelector("[data-admin-export-format]")?.value || "xlsx";
  const scope = document.querySelector("[data-admin-export-scope]")?.value || "all";
  const range = getExportDateRange();
  if (!range) return;
  const stamp = exportFilenameStamp(range);
  const rows = getExportRows(scope, range);

  if (!rows.length) {
    showAdminToast(`No records found between ${range.from} and ${range.to}.`);
    return;
  }

  if (format === "json") {
    const payload = {
      exported_at: new Date().toISOString(),
      date_from: range.from,
      date_to: range.to,
      scope,
      record_count: rows.length,
      records: rows
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `rs-cleaning-export-${stamp}.json`);
    showAdminToast(`JSON export downloaded (${rows.length} records).`, "success");
    return;
  }

  if (format === "csv") {
    const headers = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    const escapeCsv = (value) => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
      return text;
    };
    const lines = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(","))
    ];
    const csv = `\uFEFF${lines.join("\n")}`;
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `rs-cleaning-export-${stamp}.csv`);
    showAdminToast(`CSV export downloaded (${rows.length} records).`, "success");
    return;
  }

  if (typeof XLSX === "undefined") {
    showAdminToast("Excel export is unavailable. Choose CSV or JSON instead.");
    return;
  }

  if (scope === "all") {
    const workbook = XLSX.utils.book_new();
    const sheets = [
      ["Contacts", filterTableRows("contact_submissions", range)],
      ["Quotes", filterTableRows("quote_requests", range)],
      ["Bookings", filterTableRows("bookings", range)]
    ];
    sheets.forEach(([name, data]) => {
      const sheetRows = data.map(flattenRecord);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows.length ? sheetRows : [{ note: "No records in this date range" }]), name);
    });
    XLSX.writeFile(workbook, `rs-cleaning-export-${stamp}.xlsx`);
  } else {
    const sheetName = scope === "contact_submissions" ? "Contacts" : scope === "quote_requests" ? "Quotes" : "Bookings";
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), sheetName);
    XLSX.writeFile(workbook, `rs-cleaning-${sheetName.toLowerCase()}-${stamp}.xlsx`);
  }
  showAdminToast(`Excel export downloaded (${rows.length} records).`, "success");
}

function initExportDateDefaults() {
  const fromInput = document.querySelector("[data-admin-export-from]");
  const toInput = document.querySelector("[data-admin-export-to]");
  if (!fromInput || !toInput || fromInput.value || toInput.value) return;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toIso = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  fromInput.value = toIso(startOfMonth);
  toInput.value = toIso(today);
}

async function initDashboard() {
  if (!document.querySelector("[data-dashboard]")) return;
  if (!(await assertAdminSession())) {
    clearAdminSession();
    window.location.href = "admin-login.html";
    return;
  }

  setDashboardLoading(true);
  try {
    currentAdminProfile = await fetchCurrentAdminProfile();
    const entries = await Promise.all(
      TABLES.map(async (table) => [table, await fetchTable(table)])
    );
    dashboardCache = Object.fromEntries(entries);

    renderAllTables();

    const all = TABLES.flatMap((table) =>
      dashboardCache[table].map((row) => ({ table, ...row }))
    );
    renderActivity(all);
    renderAnalytics();
    updateCounts();
    updateSignedInLabel();
  } finally {
    setDashboardLoading(false);
  }
}

document.addEventListener("click", async (event) => {
  const jump = event.target.closest("[data-activity-jump]");
  if (jump) {
    event.preventDefault();
    const view = TABLE_VIEW[jump.dataset.activityJump] || "dashboard";
    switchView(view);
    return;
  }

  const toggle = event.target.closest(".admin-record-toggle");
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();
    const record = toggle.closest("[data-admin-record]");
    if (record) {
      const expanded = !record.classList.contains("is-expanded");
      setRecordExpanded(record, expanded);
    }
    return;
  }

  const statusBtn = event.target.closest("[data-mark-status]");
  if (statusBtn) {
    event.preventDefault();
    statusBtn.disabled = true;
    try {
      await updateStatus(
        statusBtn.dataset.table,
        statusBtn.dataset.id,
        statusBtn.dataset.status
      );
      await initDashboard();
    } catch (error) {
      console.error(error);
      showAdminToast("Could not update status. Try refreshing.");
      statusBtn.disabled = false;
    }
    return;
  }

  const deleteBtn = event.target.closest("[data-delete-record]");
  if (deleteBtn) {
    event.preventDefault();
    const table = deleteBtn.dataset.table;
    const id = deleteBtn.dataset.id;
    const title = deleteBtn.dataset.title || "this record";
    const label = TABLE_LABELS[table] || "Record";
    const confirmed = window.confirm(`Delete ${label.toLowerCase()} "${title}"? This cannot be undone.`);
    if (!confirmed) return;
    deleteBtn.disabled = true;
    try {
      await deleteRecord(table, id);
      showAdminToast("Record deleted.", "success");
      await initDashboard();
    } catch (error) {
      console.error(error);
      showAdminToast("Could not delete record. Check that admin delete permissions are enabled.");
      deleteBtn.disabled = false;
    }
    return;
  }

  const deleteAdminBtn = event.target.closest("[data-delete-admin]");
  if (deleteAdminBtn) {
    event.preventDefault();
    const email = deleteAdminBtn.dataset.email;
    if (!email) return;
    const confirmed = window.confirm(`Remove admin access for ${email}? They will no longer be able to sign in.`);
    if (!confirmed) return;
    deleteAdminBtn.disabled = true;
    try {
      await deleteAdminUser(email);
      showAdminToast(`Removed admin access for ${email}.`, "success");
      await loadSettingsView();
    } catch (error) {
      console.error(error);
      showAdminToast(error.message || "Could not remove admin account.");
      deleteAdminBtn.disabled = false;
    }
    return;
  }

  const expandAll = event.target.closest("[data-admin-expand-all]");
  if (expandAll) {
    const toolbar = expandAll.closest("[data-admin-toolbar]");
    const table = toolbar?.getAttribute("data-admin-toolbar");
    if (table) renderRows(table, dashboardCache[table], { forceExpanded: true });
    return;
  }

  const collapseAll = event.target.closest("[data-admin-collapse-all]");
  if (collapseAll) {
    const toolbar = collapseAll.closest("[data-admin-toolbar]");
    const table = toolbar?.getAttribute("data-admin-toolbar");
    if (table) renderRows(table, dashboardCache[table], { forceExpanded: false });
  }
});

document.addEventListener("input", (event) => {
  const search = event.target.closest("[data-admin-search]");
  if (!search) return;
  const toolbar = search.closest("[data-admin-toolbar]");
  const table = toolbar?.getAttribute("data-admin-toolbar");
  if (table) renderRows(table, dashboardCache[table]);
});

document.addEventListener("change", (event) => {
  const filter = event.target.closest(
    "[data-admin-status-filter], [data-admin-frequency-filter], [data-admin-payment-filter]"
  );
  if (!filter) return;
  const toolbar = filter.closest("[data-admin-toolbar]");
  const table = toolbar?.getAttribute("data-admin-toolbar");
  if (table) renderRows(table, dashboardCache[table]);
});

document.querySelector("[data-admin-refresh]")?.addEventListener("click", () => {
  initDashboard();
});

document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
  clearAdminSession();
  window.location.href = "admin-login.html";
});

function switchView(targetView) {
  const navItems = document.querySelectorAll("[data-view-target]");
  const viewContents = document.querySelectorAll("[data-view-content]");
  const meta = VIEW_META[targetView] || VIEW_META.dashboard;

  navItems.forEach((nav) => {
    nav.classList.toggle("active", nav.getAttribute("data-view-target") === targetView);
  });

  viewContents.forEach((content) => {
    const isActive = content.getAttribute("data-view-content") === targetView;
    if (content.classList.contains("admin-stats")) {
      content.hidden = targetView !== "dashboard";
      return;
    }
    content.hidden = !isActive;
  });

  const title = document.querySelector("[data-admin-title]");
  const subtitle = document.querySelector("[data-admin-subtitle]");
  if (title) title.textContent = meta.title;
  if (subtitle) subtitle.textContent = meta.subtitle;
  if (targetView === "settings") {
    loadSettingsView();
    initExportDateDefaults();
  }
  if (targetView === "invoices" && typeof window.initAdminInvoicesView === "function") {
    window.initAdminInvoicesView();
  }
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function initSettingsHandlers() {
  document.querySelector("[data-admin-export]")?.addEventListener("click", exportRecords);

  const inviteForm = document.querySelector("[data-admin-invite-form]");
  if (inviteForm) {
    inviteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const state = inviteForm.querySelector("[data-admin-invite-state]");
      const submit = inviteForm.querySelector("button[type='submit']");
      const data = new FormData(inviteForm);
      const email = String(data.get("email") || "").trim();
      const password = String(data.get("password") || "");
      if (state) {
        state.className = "form-state loading admin-settings-state";
        state.textContent = "Creating admin account...";
      }
      if (submit) submit.disabled = true;
      try {
        await createAdminUser(email, password);
        inviteForm.reset();
        if (state) {
          state.className = "form-state success admin-settings-state";
          state.textContent = `Admin account created for ${email}. Share the password securely.`;
        }
        showAdminToast(`Admin access granted to ${email}.`, "success");
        await loadSettingsView();
      } catch (error) {
        console.error(error);
        if (state) {
          state.className = "form-state error admin-settings-state";
          state.textContent = error.message || "Could not create admin account.";
        }
        showAdminToast(error.message || "Could not create admin account.");
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }
}

function initKpiNavigation() {
  document.querySelectorAll("[data-kpi-view]").forEach((kpi) => {
    const go = () => switchView(kpi.getAttribute("data-kpi-view"));
    kpi.addEventListener("click", go);
    kpi.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    });
  });
}

function initAdminNavigation() {
  document.querySelectorAll("[data-view-target]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(item.getAttribute("data-view-target"));
    });
  });
}

async function copyBookingPayLink(bookingId) {
  const row = (dashboardCache.bookings || []).find((item) => item.id === bookingId);
  if (!row?.square_checkout_url) {
    showAdminToast("No payment link yet. Open Invoices to create one.");
    return;
  }
  await navigator.clipboard.writeText(row.square_checkout_url);
  showAdminToast("Payment link copied.", "success");
}

async function openInvoiceForBooking(bookingId) {
  switchView("invoices");
  const row = (dashboardCache.bookings || []).find((item) => item.id === bookingId);
  if (!row) return;
  if (typeof window.initAdminInvoicesView === "function") {
    await window.initAdminInvoicesView();
  }
  if (typeof window.fillAdminInvoiceFromRow === "function") {
    window.fillAdminInvoiceFromRow(row);
  }
}

document.addEventListener("click", (event) => {
  const copyBtn = event.target.closest("[data-booking-copy-link]");
  if (copyBtn) {
    event.preventDefault();
    copyBookingPayLink(copyBtn.getAttribute("data-booking-copy-link")).catch((error) => {
      showAdminToast(error.message || "Could not copy link.");
    });
    return;
  }
  const invoiceBtn = event.target.closest("[data-booking-open-invoice]");
  if (invoiceBtn) {
    event.preventDefault();
    openInvoiceForBooking(invoiceBtn.getAttribute("data-booking-open-invoice"));
  }
});

window.getAdminToken = getAdminToken;
window.showAdminToast = showAdminToast;
window.initDashboard = initDashboard;

initDashboard();
document.addEventListener("DOMContentLoaded", () => {
  initAdminNavigation();
  initKpiNavigation();
  initSettingsHandlers();
  initExportDateDefaults();
});
