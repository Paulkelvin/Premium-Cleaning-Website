(function () {
  const config = window.CLEANCO_CONFIG || {};
  let activeInvoiceId = null;
  let formInitialized = false;

  function getAdminHeaders() {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${window.getAdminToken?.() || ""}`,
      "Content-Type": "application/json",
    };
  }

  function getPricing() {
    return config.pricing || { minimumJob: 0.5, rates: {}, addOns: {}, frequencyDiscounts: {} };
  }

  function parseAddons(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function calculateSuggestedTotal(data) {
    const pricing = getPricing();
    const serviceType = String(data.service_type || "").trim();
    const rate = pricing.rates?.[serviceType];
    const beds = parseInt(data.bedrooms, 10) || 2;
    const baths = parseInt(data.bathrooms, 10) || 1;
    const parsedSqft = parseInt(String(data.square_feet || "").replace(/,/g, ""), 10);
    const sqft = parsedSqft > 0 ? parsedSqft : Math.round(beds * 450 + baths * 150 + 350);
    const freq = String(data.frequency || "One-time").trim() || "One-time";

    if (!rate || sqft <= 0) return 0;

    let base = sqft * rate;
    const minimum = Number(pricing.minimumJob) || 0.5;
    if (base > 0 && base < minimum) base = minimum;

    let addons = 0;
    parseAddons(data.add_ons).forEach((name) => {
      if (pricing.addOns?.[name]) addons += pricing.addOns[name];
    });

    let subtotal = base + addons;
    const discount = pricing.frequencyDiscounts?.[freq] || 0;
    subtotal -= subtotal * discount;
    subtotal += Math.max(0, Number(data.travel_fee) || 0);
    return Math.round(subtotal * 100) / 100;
  }

  function readForm(form) {
    const data = new FormData(form);
    const addons = [...form.querySelectorAll('input[name="add_ons"]:checked')].map((el) => el.value);
    const areaSelect = form.querySelector('[name="service_area_name"]');
    const selectedArea = areaSelect?.selectedOptions?.[0];
    return {
      booking_id: activeInvoiceId || "",
      full_name: data.get("full_name"),
      email: data.get("email"),
      phone: data.get("phone"),
      service_type: data.get("service_type"),
      property_type: data.get("property_type"),
      bedrooms: data.get("bedrooms"),
      bathrooms: data.get("bathrooms"),
      square_feet: data.get("square_feet"),
      frequency: data.get("frequency"),
      add_ons: addons.join(", "),
      service_area_name: data.get("service_area_name"),
      travel_fee: selectedArea?.dataset?.travelFee || "0",
      address: data.get("address"),
      preferred_date: data.get("preferred_date") || null,
      preferred_time: data.get("preferred_time"),
      message: data.get("message"),
      admin_notes: data.get("admin_notes"),
      estimated_total: Number(data.get("estimated_total")) || 0,
    };
  }

  function setFormState(message, type = "") {
    const el = document.querySelector("[data-invoice-form-state]");
    if (!el) return;
    el.className = `form-state admin-settings-state${type ? ` ${type}` : ""}`;
    el.textContent = message || "";
  }

  async function callFunction(path, body) {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/${path}`, {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }

  function updateSuggestedTotal() {
    const form = document.querySelector("[data-invoice-form]");
    if (!form) return;
    const payload = readForm(form);
    const suggested = calculateSuggestedTotal(payload);
    const suggestedEl = document.querySelector("[data-invoice-suggested]");
    const amountInput = form.querySelector('[name="estimated_total"]');
    if (suggestedEl) {
      suggestedEl.textContent = suggested > 0 ? `$${suggested.toFixed(2)}` : "—";
    }
    if (amountInput && !amountInput.dataset.touched && suggested > 0) {
      amountInput.value = suggested.toFixed(2);
    }
  }

  function populateServiceAreas(select) {
    if (!select) return;
    const areas = window.SERVICE_AREAS || [];
    select.innerHTML = areas
      .map(
        (area) =>
          `<option value="${area.name}" data-travel-fee="${area.travelFee ?? 0}">${area.name}</option>`
      )
      .join("");
  }

  function populateAddonCheckboxes(container) {
    if (!container) return;
    const addons = Object.keys(getPricing().addOns || {});
    container.innerHTML = addons
      .map(
        (name) => `
      <label class="admin-invoice-addon">
        <input type="checkbox" name="add_ons" value="${name.replace(/"/g, "&quot;")}">
        <span>${name}</span>
      </label>`
      )
      .join("");
  }

  async function fetchAdminInvoices() {
    if (!config.supabaseUrl) return [];
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/bookings?source=eq.admin&select=*&order=created_at.desc`,
      { headers: getAdminHeaders() }
    );
    if (!response.ok) return [];
    return response.json();
  }

  function paymentStatusLabel(status) {
    return String(status || "invoice_draft").replace(/_/g, " ");
  }

  function renderInvoiceList(rows) {
    const list = document.querySelector("[data-invoice-list]");
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = `<p class="admin-invoice-empty">No offline invoices yet. Create one using the form.</p>`;
      return;
    }
    list.innerHTML = rows
      .map((row) => {
        const paid = row.payment_status === "paid";
        const hasLink = Boolean(row.square_checkout_url);
        return `
        <article class="admin-invoice-item${activeInvoiceId === row.id ? " is-active" : ""}" data-invoice-row="${row.id}">
          <div class="admin-invoice-item-head">
            <div>
              <strong>${row.full_name || "Customer"}</strong>
              <span>${row.email || ""} · $${Number(row.estimated_total || 0).toFixed(2)}</span>
              <span class="admin-invoice-meta">${paymentStatusLabel(row.payment_status)}${row.invoice_sent_at ? " · emailed" : ""}</span>
            </div>
            <div class="admin-invoice-item-actions">
              <button type="button" class="admin-btn admin-btn--ghost admin-btn--small" data-invoice-edit="${row.id}">Edit</button>
              ${hasLink ? `<button type="button" class="admin-btn admin-btn--ghost admin-btn--small" data-invoice-copy="${row.id}">Copy link</button>` : ""}
              ${!paid ? `<button type="button" class="admin-btn admin-btn--primary admin-btn--small" data-invoice-checkout="${row.id}">${hasLink ? "Refresh link" : "Create link"}</button>` : ""}
              ${!paid && hasLink ? `<button type="button" class="admin-btn admin-btn--primary admin-btn--small" data-invoice-send="${row.id}">Send email</button>` : ""}
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function fillForm(row) {
    const form = document.querySelector("[data-invoice-form]");
    if (!form || !row) return;
    activeInvoiceId = row.id;
    form.full_name.value = row.full_name || "";
    form.email.value = row.email || "";
    form.phone.value = row.phone || "";
    form.service_type.value = row.service_type || "";
    form.property_type.value = row.property_type || "House";
    form.bedrooms.value = row.bedrooms || "2";
    form.bathrooms.value = row.bathrooms || "1";
    form.square_feet.value = row.square_feet || "";
    form.frequency.value = row.frequency || "One-time";
    form.service_area_name.value = row.service_area_name || "";
    form.address.value = row.address || "";
    form.preferred_date.value = row.preferred_date || "";
    form.preferred_time.value = row.preferred_time || "";
    form.message.value = row.message || "";
    form.admin_notes.value = row.admin_notes || "";
    form.estimated_total.value = Number(row.estimated_total || 0).toFixed(2);
    form.estimated_total.dataset.touched = "1";

    const selected = parseAddons(row.add_ons);
    form.querySelectorAll('input[name="add_ons"]').forEach((input) => {
      input.checked = selected.includes(input.value);
    });
    updateSuggestedTotal();
    setFormState(`Editing invoice ${row.id.slice(0, 8)}…`, "");
  }

  function resetForm() {
    const form = document.querySelector("[data-invoice-form]");
    if (!form) return;
    activeInvoiceId = null;
    form.reset();
    form.property_type.value = "House";
    form.bedrooms.value = "2";
    form.bathrooms.value = "1";
    form.frequency.value = "One-time";
    if (form.service_area_name.options.length) {
      form.service_area_name.selectedIndex = 0;
    }
    const amountInput = form.querySelector('[name="estimated_total"]');
    if (amountInput) delete amountInput.dataset.touched;
    updateSuggestedTotal();
    setFormState("", "");
  }

  async function refreshInvoiceList() {
    const rows = await fetchAdminInvoices();
    renderInvoiceList(rows);
    return rows;
  }

  async function saveInvoice() {
    const form = document.querySelector("[data-invoice-form]");
    if (!form) return;
    const payload = readForm(form);
    setFormState("Saving…", "loading");
    const result = await callFunction("admin-create-invoice", payload);
    activeInvoiceId = result.booking_id;
    setFormState("Invoice saved.", "success");
    if (typeof window.showAdminToast === "function") {
      window.showAdminToast("Invoice saved.", "success");
    }
    await refreshInvoiceList();
    if (typeof window.initDashboard === "function") {
      await window.initDashboard();
    }
  }

  async function createCheckout(bookingId) {
    setFormState("Creating payment link…", "loading");
    const result = await callFunction("admin-invoice-checkout", { booking_id: bookingId });
    setFormState("Payment link ready. You can copy it or send by email.", "success");
    if (typeof window.showAdminToast === "function") {
      window.showAdminToast("Payment link created.", "success");
    }
    await refreshInvoiceList();
    return result.checkout_url;
  }

  async function sendInvoiceEmail(bookingId) {
    setFormState("Sending email…", "loading");
    const result = await callFunction("send-payment-invoice", { booking_id: bookingId });
    setFormState(`Invoice emailed to ${result.sent_to}.`, "success");
    if (typeof window.showAdminToast === "function") {
      window.showAdminToast(`Invoice sent to ${result.sent_to}.`, "success");
    }
    await refreshInvoiceList();
  }

  function initInvoiceForm() {
    const form = document.querySelector("[data-invoice-form]");
    if (!form) return;
    if (formInitialized) return;
    formInitialized = true;
    populateServiceAreas(form.service_area_name);
    populateAddonCheckboxes(document.querySelector("[data-invoice-addons]"));
    updateSuggestedTotal();

    form.addEventListener("input", (event) => {
      if (event.target.name === "estimated_total") {
        event.target.dataset.touched = "1";
      }
      updateSuggestedTotal();
    });
    form.addEventListener("change", updateSuggestedTotal);

    document.querySelector("[data-invoice-save]")?.addEventListener("click", async () => {
      try {
        await saveInvoice();
      } catch (error) {
        setFormState(error.message, "error");
        if (typeof window.showAdminToast === "function") window.showAdminToast(error.message);
      }
    });

    document.querySelector("[data-invoice-reset]")?.addEventListener("click", resetForm);

    document.querySelector("[data-invoice-create-link]")?.addEventListener("click", async () => {
      try {
        if (!activeInvoiceId) {
          await saveInvoice();
        }
        const url = await createCheckout(activeInvoiceId);
        if (url && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        }
      } catch (error) {
        setFormState(error.message, "error");
        if (typeof window.showAdminToast === "function") window.showAdminToast(error.message);
      }
    });

    document.querySelector("[data-invoice-send-email]")?.addEventListener("click", async () => {
      try {
        if (!activeInvoiceId) {
          throw new Error("Save the invoice first");
        }
        await sendInvoiceEmail(activeInvoiceId);
      } catch (error) {
        setFormState(error.message, "error");
        if (typeof window.showAdminToast === "function") window.showAdminToast(error.message);
      }
    });
  }

  let listActionsInitialized = false;

  function initInvoiceListActions() {
    const list = document.querySelector("[data-invoice-list]");
    if (!list || listActionsInitialized) return;
    listActionsInitialized = true;

    list.addEventListener("click", async (event) => {
      const editBtn = event.target.closest("[data-invoice-edit]");
      const copyBtn = event.target.closest("[data-invoice-copy]");
      const checkoutBtn = event.target.closest("[data-invoice-checkout]");
      const sendBtn = event.target.closest("[data-invoice-send]");

      try {
        if (editBtn) {
          const rows = await fetchAdminInvoices();
          const row = rows.find((item) => item.id === editBtn.dataset.invoiceEdit);
          if (row) fillForm(row);
          return;
        }
        if (copyBtn) {
          const rows = await fetchAdminInvoices();
          const row = rows.find((item) => item.id === copyBtn.dataset.invoiceCopy);
          if (!row?.square_checkout_url) throw new Error("No payment link yet");
          await navigator.clipboard.writeText(row.square_checkout_url);
          if (typeof window.showAdminToast === "function") {
            window.showAdminToast("Payment link copied.", "success");
          }
          return;
        }
        if (checkoutBtn) {
          const id = checkoutBtn.dataset.invoiceCheckout;
          await createCheckout(id);
          return;
        }
        if (sendBtn) {
          await sendInvoiceEmail(sendBtn.dataset.invoiceSend);
        }
      } catch (error) {
        if (typeof window.showAdminToast === "function") window.showAdminToast(error.message);
      }
    });
  }

  window.initAdminInvoicesView = async function initAdminInvoicesView() {
    initInvoiceForm();
    initInvoiceListActions();
    await refreshInvoiceList();
  };

  window.fillAdminInvoiceFromRow = fillForm;
})();
