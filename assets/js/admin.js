const adminConfig = window.CLEANCO_CONFIG || {};
const adminHasSupabase = Boolean(adminConfig.supabaseUrl && adminConfig.supabaseAnonKey);

const localTables = {
  contact_submissions: "cleanco_contact_submissions",
  quote_requests: "cleanco_quote_requests",
  bookings: "cleanco_bookings"
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
      state.className = "form-state loading";
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
          "apikey": adminConfig.supabaseAnonKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error_description || body.msg || body.message || "Sign in failed");
      }
      goToDashboard(body.access_token);
    } catch (error) {
      console.error(error);
      if (state) {
        state.className = "form-state error";
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
      "apikey": adminConfig.supabaseAnonKey,
      "Authorization": `Bearer ${getAdminToken()}`
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
      "apikey": adminConfig.supabaseAnonKey,
      "Authorization": `Bearer ${getAdminToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function renderRows(table, rows) {
  const target = document.querySelector(`[data-admin-table='${table}']`);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = "<p class='empty-state'>No submissions yet.</p>";
    return;
  }

  target.innerHTML = rows.map((row) => {
    const name = row.full_name || row.name || row.email || "New lead";
    const detail = row.message || row.service_type || row.inquiry_type || row.preferred_date || "";
    const status = row.status || "new";
    const created = row.created_at ? new Date(row.created_at).toLocaleString() : "Just now";
    return `
      <article class="admin-card">
        <div>
          <span class="status ${status}">${status}</span>
          <h3>${name}</h3>
          <p>${detail}</p>
          <small>${created}</small>
        </div>
        <div class="admin-actions">
          <a class="button ghost small" href="mailto:${row.email || adminConfig.email || ""}">Email</a>
          <button class="button small" data-mark-handled data-table="${table}" data-id="${row.id}">Mark handled</button>
        </div>
      </article>
    `;
  }).join("");
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
  document.querySelector("[data-count='new']").textContent = all.filter((row) => (row.status || "new") === "new").length;
  document.querySelector("[data-count='contacts']").textContent = data.contact_submissions.length;
  document.querySelector("[data-count='quotes']").textContent = data.quote_requests.length;
  document.querySelector("[data-count='bookings']").textContent = data.bookings.length;
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-mark-handled]");
  if (!button) return;
  await updateStatus(button.dataset.table, button.dataset.id, "resolved");
  initDashboard();
});

document.querySelector("[data-admin-logout]")?.addEventListener("click", () => {
  safeRemove("cleanco_admin");
  safeRemove("cleanco_admin_token");
  window.location.href = "admin-login.html";
});

initDashboard();
