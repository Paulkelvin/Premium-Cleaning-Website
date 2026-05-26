const config = window.CLEANCO_CONFIG || {};
const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);

const TABLE_COLUMNS = {
  contact_submissions: [
    "full_name", "email", "phone", "inquiry_type", "message",
    "preferred_contact_method", "consent"
  ],
  quote_requests: [
    "full_name", "email", "phone", "service_type", "property_type",
    "bedrooms", "bathrooms", "square_feet", "add_ons", "message",
    "frequency", "preferred_contact", "estimated_total", "consent"
  ],
  bookings: [
    "full_name", "email", "phone", "service_type", "property_type",
    "bedrooms", "bathrooms", "square_feet", "add_ons", "frequency",
    "preferred_date", "preferred_time", "address", "message",
    "estimated_total", "payment_method", "payment_status", "quote_id", "consent"
  ]
};

function sanitizePayload(table, payload) {
  const allowed = TABLE_COLUMNS[table] || Object.keys(payload);
  const clean = {};
  allowed.forEach((key) => {
    if (payload[key] !== undefined && payload[key] !== "") {
      clean[key] = payload[key];
    }
  });
  return clean;
}

async function supabaseInsert(table, payload) {
  const body = sanitizePayload(table, payload);
  const rowId = crypto.randomUUID();
  body.id = rowId;

  if (!hasSupabase) {
    const key = `cleanco_${table}`;
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    const row = {
      id: rowId,
      status: "new",
      created_at: new Date().toISOString(),
      ...body
    };
    items.unshift(row);
    localStorage.setItem(key, JSON.stringify(items));
    return { ok: true, demo: true, id: rowId };
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": config.supabaseAnonKey,
      "Authorization": `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Submission failed");
  }
  return { ok: true, id: rowId };
}

function formPayload(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());

  const addOnsCheckboxes = form.querySelectorAll('input[name="add_ons[]"]:checked');
  if (addOnsCheckboxes.length > 0) {
    payload.add_ons = Array.from(addOnsCheckboxes).map((cb) => cb.value).join(", ");
    delete payload["add_ons[]"];
  }

  return payload;
}

function showState(form, type, message) {
  const state = form.querySelector("[data-form-state]");
  if (!state) return;
  state.className = `form-state ${type}`;
  state.textContent = message;
}

const QUOTE_SESSION_KEY = "rs_cleaning_quote_session";

function saveQuoteSession(data) {
  try {
    sessionStorage.setItem(QUOTE_SESSION_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.warn("Could not save quote session", err);
  }
}

function loadQuoteSession() {
  try {
    const raw = sessionStorage.getItem(QUOTE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearQuoteSession() {
  try {
    sessionStorage.removeItem(QUOTE_SESSION_KEY);
  } catch {}
}

window.supabaseInsert = supabaseInsert;
window.buildFormPayload = formPayload;
window.sanitizePayloadForTable = sanitizePayload;
window.saveQuoteSession = saveQuoteSession;
window.loadQuoteSession = loadQuoteSession;
window.clearQuoteSession = clearQuoteSession;

document.querySelectorAll("[data-lead-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const table = form.getAttribute("data-table");
    const submit = form.querySelector("button[type='submit']");
    submit.disabled = true;
    showState(form, "loading", "Sending...");

    try {
      const payload = formPayload(form);
      payload.consent = Boolean(form.querySelector("[name='consent']")?.checked);
      await supabaseInsert(table, payload);
      form.reset();
      showState(form, "success", "Thanks. Your request was received and our team will follow up shortly.");
    } catch (error) {
      console.error(error);
      showState(form, "error", `Could not send yet: ${error.message}`);
    } finally {
      submit.disabled = false;
    }
  });
});
