const config = window.CLEANCO_CONFIG || {};
const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);

async function supabaseInsert(table, payload) {
  if (!hasSupabase) {
    const key = `cleanco_${table}`;
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    items.unshift({ id: crypto.randomUUID(), status: "new", created_at: new Date().toISOString(), ...payload });
    localStorage.setItem(key, JSON.stringify(items));
    return { ok: true, demo: true };
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": config.supabaseAnonKey,
      "Authorization": `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Submission failed");
  }
  return { ok: true };
}

function formPayload(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  
  // Handle add_ons[] array - convert to comma-separated string
  const addOnsCheckboxes = form.querySelectorAll('input[name="add_ons[]"]:checked');
  if (addOnsCheckboxes.length > 0) {
    payload.add_ons = Array.from(addOnsCheckboxes).map(cb => cb.value).join(", ");
    // Remove the add_ons[] key if it was created
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
