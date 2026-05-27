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
    { key: "payment_method", label: "Payment method" },
    { key: "payment_status", label: "Payment status" },
    { key: "estimated_total", label: "Estimate", type: "currency" },
    { key: "quote_id", label: "Quote ID", type: "mono" },
    { key: "consent", label: "Consent", type: "boolean" },
    { key: "status", label: "Status" },
    { key: "id", label: "Record ID", type: "mono" }
  ]
};

function getHashValue(name) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get(name);
}

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

function getAdminToken() {
  const token = safeGet("cleanco_admin_token") || getHashValue("access_token");
  if (token && !safeGet("cleanco_admin_token")) {
    safeSet("cleanco_admin_token", token);
  }
  return token;
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

function goToDashboard(accessToken) {
  if (accessToken) {
    safeSet("cleanco_admin_email", parseJwtEmail(accessToken));
  }
  if (safeSet("cleanco_admin_token", accessToken)) {
    window.location.href = "admin-dashboard.html";
    return;
  }
  window.location.href = `admin-dashboard.html#access_token=${encodeURIComponent(accessToken)}`;
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

function getToolbarState(table) {
  const toolbar = document.querySelector(`[data-admin-toolbar='${table}']`);
  if (!toolbar) return { query: "", status: "all" };
  const search = toolbar.querySelector("[data-admin-search]");
  const statusFilter = toolbar.querySelector("[data-admin-status-filter]");
  return {
    query: (search?.value || "").trim().toLowerCase(),
    status: statusFilter?.value || "all"
  };
}

function filterRows(table, rows) {
  const { query, status } = getToolbarState(table);
  return rows.filter(
    (row) => rowMatchesSearch(row, query) && rowMatchesStatusFilter(row, status)
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
  return actions.join("");
}

function renderRecord(table, row, { forceExpanded } = {}) {
  const status = row.status || "new";
  const title = getRowTitle(row);
  const summary = getRowSummary(table, row);
  const expanded = forceExpanded === true;
  const bodyId = `record-body-${table}-${row.id}`;
  const estimateBadge =
    table !== "contact_submissions" ? getEstimateBadge(row) : "";

  const message = row.message
    ? `
    <div class="admin-record-message">
      <span class="admin-field-label">Message</span>
      <p>${escapeHtml(row.message)}</p>
    </div>
  `
    : "";

  return `
    <article class="admin-record${expanded ? " is-expanded" : ""}" data-record-id="${escapeHtml(row.id)}" data-admin-record data-table="${table}">
      <div class="admin-record-head">
        <button type="button" class="admin-record-toggle" aria-expanded="${expanded}" aria-controls="${bodyId}">
          <span class="admin-record-chevron" aria-hidden="true"></span>
          <span class="admin-record-title-wrap">
            <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
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
  const { query, status } = getToolbarState(table);
  const hasFilters = query || status !== "all";
  if (hasFilters && filtered) {
    return `
      <div class="admin-empty">
        <i data-lucide="search-x"></i>
        <p><strong>No matches</strong></p>
        <p>Try a different search or status filter.</p>
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
      const icon = ACTIVITY_ICONS[row.table] || "circle";
      return `
      <a class="admin-activity-item" href="#" data-activity-jump="${row.table}">
        <span class="admin-activity-icon"><i data-lucide="${icon}"></i></span>
        <span class="admin-activity-type">${escapeHtml(TABLE_LABELS[row.table])}</span>
        <div class="admin-activity-copy">
          <strong>${escapeHtml(getRowTitle(row))}</strong>
          <span>${escapeHtml(getRowSummary(row.table, row) || "New submission")}</span>
        </div>
        <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
        <time>${formatTimestamp(row.created_at)}</time>
      </a>
    `;
    })
    .join("");
  refreshIcons();
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
      const adminEmails = getAllowedAdminEmails();
      const signedInEmail = String(body.user?.email || email || "").toLowerCase();
      if (adminEmails.length && !adminEmails.includes(signedInEmail)) {
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
    {
      headers: {
        apikey: adminConfig.supabaseAnonKey,
        Authorization: `Bearer ${getAdminToken()}`
      }
    }
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
      apikey: adminConfig.supabaseAnonKey,
      Authorization: `Bearer ${getAdminToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function initDashboard() {
  if (!document.querySelector("[data-dashboard]")) return;
  if (!isLoggedIn()) {
    window.location.href = "admin-login.html";
    return;
  }

  setDashboardLoading(true);
  try {
    const entries = await Promise.all(
      TABLES.map(async (table) => [table, await fetchTable(table)])
    );
    dashboardCache = Object.fromEntries(entries);

    renderAllTables();

    const all = TABLES.flatMap((table) =>
      dashboardCache[table].map((row) => ({ table, ...row }))
    );
    renderActivity(all);
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
      statusBtn.disabled = false;
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
  const filter = event.target.closest("[data-admin-status-filter]");
  if (!filter) return;
  const toolbar = filter.closest("[data-admin-toolbar]");
  const table = toolbar?.getAttribute("data-admin-toolbar");
  if (table) renderRows(table, dashboardCache[table]);
});

document.querySelector("[data-admin-refresh]")?.addEventListener("click", () => {
  initDashboard();
});

document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
  safeRemove("cleanco_admin");
  safeRemove("cleanco_admin_token");
  safeRemove("cleanco_admin_email");
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

initDashboard();
document.addEventListener("DOMContentLoaded", () => {
  initAdminNavigation();
  initKpiNavigation();
});
