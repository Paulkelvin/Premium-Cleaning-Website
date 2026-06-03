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
    "estimated_total", "service_area_name", "travel_fee",
    "payment_method", "quote_id", "pricing_locked", "consent"
  ]
};

function finalizeBookingPayload(body) {
  delete body.payment_status;
  delete body.square_order_id;
  delete body.square_checkout_url;
  delete body.square_payment_id;
  body.payment_method = body.payment_method === "pay_online" ? "pay_online" : "pay_at_service";
  return body;
}

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

function mapSubmissionError(error) {
  const raw = String(error?.message || error || "");
  if (raw.toLowerCase().includes("service area")) {
    return "Please confirm your service area before checkout. If unsure, continue and we'll apply the outside-area review fee.";
  }
  if (raw.includes("row-level security") || raw.includes("RLS") || raw.includes("42501")) {
    return "We could not save your booking. If paying online, confirm your service area on the quote page (or pick Pay at service). Otherwise call or email us.";
  }
  if (raw.includes("Invalid API key")) {
    return "Our form service is being updated. Please try again shortly or contact us directly.";
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return "Network error — check your connection and try again.";
  }
  return "Something went wrong sending your message. Please try again or contact us directly.";
}

function getSupabaseRestHeaders() {
  const apiKey = config.supabaseFunctionKey || config.supabaseAnonKey;
  const headers = {
    apikey: apiKey,
    "Content-Type": "application/json",
    Prefer: "return=minimal"
  };
  if (typeof apiKey === "string" && apiKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

async function supabaseInsert(table, payload) {
  const body = sanitizePayload(table, payload);
  const rowId = crypto.randomUUID();
  body.id = rowId;

  if (table === "bookings") {
    finalizeBookingPayload(body);
    if (body.consent != null) body.consent = Boolean(body.consent);
    if (body.pricing_locked != null) body.pricing_locked = Boolean(body.pricing_locked);
  }

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
    headers: getSupabaseRestHeaders(),
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
  const baseClass = state.classList.contains("contact-form-feedback")
    ? "form-state contact-form-feedback"
    : "form-state";
  state.className = type ? `${baseClass} ${type}` : baseClass;
  state.textContent = message || "";
  if (message) {
    state.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function showContactFeedback(form, type, message) {
  showState(form, type, message);
  if (form.getAttribute("data-table") !== "contact_submissions") return;
  if (typeof window.showAppToast === "function" && (type === "success" || type === "error")) {
    window.showAppToast(message, type);
  }
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

window.mapSubmissionError = mapSubmissionError;
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
    const honeypot = form.querySelector("[name='company_website']");
    if (honeypot?.value) {
      showContactFeedback(form, "success", "Thanks. Your request was received and our team will follow up shortly.");
      return;
    }

    if (typeof window.clearFieldErrors === "function") window.clearFieldErrors(form);
    const firstName = form.querySelector("#contactFirstName");
    const lastName = form.querySelector("#contactLastName");
    const email = form.querySelector('input[name="email"]');
    const phone = form.querySelector('input[name="phone"]');
    const message = form.querySelector('textarea[name="message"]');
    const consent = form.querySelector('input[name="consent"]');

    const fail = (field, text) => {
      if (typeof window.markFieldInvalid === "function") window.markFieldInvalid(field);
      if (typeof window.showAppToast === "function") window.showAppToast(text, "error");
      if (typeof window.scrollFieldIntoView === "function") window.scrollFieldIntoView(field);
      showContactFeedback(form, "error", text);
      field?.focus?.({ preventScroll: true });
      return false;
    };

    if (!firstName?.value.trim()) return fail(firstName, "Please enter your first name.");
    if (!lastName?.value.trim()) return fail(lastName, "Please enter your last name.");
    if (!email?.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.value.trim())) {
      return fail(email, "Please enter a valid email address.");
    }
    if (!phone?.value.trim() || phone.value.replace(/\D/g, "").length < 10) {
      return fail(phone, "Please enter a complete phone number.");
    }
    if (!message?.value.trim()) return fail(message, "Please enter a message so we know how to help.");
    if (!consent?.checked) return fail(consent, "Please agree to the privacy policy before sending.");

    submit.disabled = true;
    showContactFeedback(form, "loading", "Sending your message…");

    try {
      const payload = formPayload(form);
      payload.consent = Boolean(form.querySelector("[name='consent']")?.checked);
      await supabaseInsert(table, payload);
      form.reset();
      showContactFeedback(
        form,
        "success",
        "Message sent! We'll follow up by email or phone, usually within one business day."
      );
    } catch (error) {
      console.error(error);
      showContactFeedback(form, "error", mapSubmissionError(error));
    } finally {
      submit.disabled = false;
    }
  });
});
