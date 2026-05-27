const adminConfig = window.CLEANCO_CONFIG || {};
const adminHasSupabase = Boolean(adminConfig.supabaseUrl && adminConfig.supabaseAnonKey);

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

function goToDashboard(accessToken) {
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

function renderFieldGrid(table, row) {
  const fields = FIELD_CONFIG[table] || [];
  return fields.map((field) => {
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
  }).join("");
}

function renderRecord(table, row) {
  const status = row.status || "new";
  const title = getRowTitle(row);
  const summary = getRowSummary(table, row);
  const message = row.message ? `
    <div class="admin-record-message">
      <span class="admin-field-label">Message</span>
      <p>${escapeHtml(row.message)}</p>
    </div>
  ` : "";

  return `
    <article class="admin-record">
      <header class="admin-record-head">
        <div class="admin-record-title-wrap">
          <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
          <h3>${escapeHtml(title)}</h3>
          <p class="admin-record-summary">${escapeHtml(summary || "No summary")}</p>
          <time class="admin-record-time">${formatTimestamp(row.created_at)}</time>
        </div>
        <div class="admin-record-actions">
          ${row.email ? `<a class="admin-btn admin-btn--ghost" href="mailto:${escapeHtml(row.email)}"><i data-lucide="mail"></i> Email</a>` : ""}
          ${row.phone ? `<a class="admin-btn admin-btn--ghost" href="tel:${escapeHtml(String(row.phone).replace(/\D/g, ""))}"><i data-lucide="phone"></i> Call</a>` : ""}
          ${status !== "resolved" ? `<button class="admin-btn admin-btn--primary" type="button" data-mark-handled data-table="${table}" data-id="${row.id}"><i data-lucide="check"></i> Mark handled</button>` : ""}
        </div>
      </header>
      <div class="admin-record-grid">
        ${renderFieldGrid(table, row)}
      </div>
      ${message}
    </article>
  `;
}

function renderRows(table, rows) {
  const target = document.querySelector(`[data-admin-table='${table}']`);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = `<p class="admin-empty">No ${TABLE_LABELS[table]?.toLowerCase() || "record"} submissions yet.</p>`;
    return;
  }
  target.innerHTML = rows.map((row) => renderRecord(table, row)).join("");
  refreshIcons();
}

function renderActivity(allRows) {
  const target = document.querySelector("[data-admin-activity]");
  if (!target) return;

  const sorted = [...allRows]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 8);

  if (!sorted.length) {
    target.innerHTML = `<p class="admin-empty">No activity yet.</p>`;
    return;
  }

  target.innerHTML = sorted.map((row) => {
    const status = row.status || "new";
    return `
      <a class="admin-activity-item" href="#" data-activity-jump="${row.table}">
        <span class="admin-activity-type">${escapeHtml(TABLE_LABELS[row.table])}</span>
        <div class="admin-activity-copy">
          <strong>${escapeHtml(getRowTitle(row))}</strong>
          <span>${escapeHtml(getRowSummary(row.table, row) || "New submission")}</span>
        </div>
        <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
        <time>${formatTimestamp(row.created_at)}</time>
      </a>
    `;
  }).join("");
}

function refreshIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
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
      const adminEmail = String(adminConfig.adminEmail || "").toLowerCase();
      const signedInEmail = String(body.user?.email || email || "").toLowerCase();
      if (adminEmail && signedInEmail !== adminEmail) {
        throw new Error("This account is not authorized for admin access.");
      }
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

  const response = await fetch(`${adminConfig.supabaseUrl}/rest/v1/${table}?select=*&order=created_at.desc`, {
    headers: {
      apikey: adminConfig.supabaseAnonKey,
      Authorization: `Bearer ${getAdminToken()}`
    }
  });
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

  const tables = ["contact_submissions", "quote_requests", "bookings"];
  const data = Object.fromEntries(await Promise.all(tables.map(async (table) => [table, await fetchTable(table)])));
  tables.forEach((table) => renderRows(table, data[table]));

  const all = tables.flatMap((table) => data[table].map((row) => ({ table, ...row })));
  renderActivity(all);

  const newCount = all.filter((row) => (row.status || "new") === "new").length;
  document.querySelector("[data-count='new']").textContent = newCount;
  document.querySelector("[data-count='contacts']").textContent = data.contact_submissions.length;
  document.querySelector("[data-count='quotes']").textContent = data.quote_requests.length;
  document.querySelector("[data-count='bookings']").textContent = data.bookings.length;

  document.querySelector("[data-nav-count='contacts']").textContent = data.contact_submissions.filter((r) => (r.status || "new") === "new").length;
  document.querySelector("[data-nav-count='quotes']").textContent = data.quote_requests.filter((r) => (r.status || "new") === "new").length;
  document.querySelector("[data-nav-count='bookings']").textContent = data.bookings.filter((r) => (r.status || "new") === "new").length;

  document.querySelectorAll("[data-nav-count]").forEach((badge) => {
    badge.hidden = Number(badge.textContent) === 0;
  });
}

document.addEventListener("click", async (event) => {
  const jump = event.target.closest("[data-activity-jump]");
  if (jump) {
    event.preventDefault();
    const view = jump.dataset.activityJump === "contact_submissions" ? "inbox"
      : jump.dataset.activityJump === "quote_requests" ? "quotes"
      : "bookings";
    switchView(view);
    return;
  }

  const button = event.target.closest("[data-mark-handled]");
  if (!button) return;
  button.disabled = true;
  try {
    await updateStatus(button.dataset.table, button.dataset.id, "resolved");
    await initDashboard();
  } catch (error) {
    console.error(error);
    button.disabled = false;
  }
});

document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
  safeRemove("cleanco_admin");
  safeRemove("cleanco_admin_token");
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

function initAdminNavigation() {
  document.querySelectorAll("[data-view-target]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      switchView(item.getAttribute("data-view-target"));
    });
  });
}

initDashboard();
document.addEventListener("DOMContentLoaded", initAdminNavigation);
