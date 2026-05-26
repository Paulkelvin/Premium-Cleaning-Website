const PRICING_CONFIG = {
  rates: {
    "Standard cleaning": 0.17,
    "Deep cleaning": 0.30,
    "Move-in/Move-out": 0.35,
    "Post-construction": 0.40,
    "Office cleaning": 0.20
  },
  addOns: {
    "Carpet cleaning": 75,
    "Wash and fold": 45,
    "Laundry": 45,
    "Inside oven": 25,
    "Inside fridge": 25,
    "Oven": 25,
    "Fridge": 25,
    "Cabinet interiors": 30,
    "Inside cabinets": 30,
    "Interior windows": 40,
    "Windows": 40,
    "Baseboards detail": 35,
    "Junk removal": 95,
    "Power washing": 120
  },
  frequencyDiscounts: {
    "Weekly": 0.20,
    "Bi-weekly": 0.15,
    "Monthly": 0.10,
    "One-time": 0.0
  }
};

const SERVICE_ALIASES = {
  "Move-in / Move-out": "Move-in/Move-out",
  "Move in/out": "Move-in/Move-out"
};

document.addEventListener("DOMContentLoaded", () => {
  initQuoteAssistant();
  initQuoteModalIntercept();
  initQuotePrefill();
});

function normalizeServiceType(value) {
  if (!value) return "";
  return SERVICE_ALIASES[value] || value;
}

function parseSqft(raw, bedrooms, bathrooms) {
  const parsed = parseInt(String(raw || "").replace(/,/g, ""), 10);
  if (parsed > 0) return parsed;
  const beds = parseInt(bedrooms, 10) || 2;
  const baths = parseFloat(bathrooms) || 1;
  return Math.round(beds * 450 + baths * 150 + 350);
}

function calculateQuoteTotal(form) {
  const data = new FormData(form);
  const serviceType = normalizeServiceType(data.get("service_type"));
  const sqft = parseSqft(data.get("square_feet"), data.get("bedrooms"), data.get("bathrooms"));
  const freq = data.get("frequency") || "One-time";
  const addons = data.getAll("add_ons[]");

  if (!serviceType || !PRICING_CONFIG.rates[serviceType]) {
    return { total: 0, sqft, serviceType, freq, addons };
  }

  let basePrice = sqft * PRICING_CONFIG.rates[serviceType];
  if (basePrice > 0 && basePrice < 100) basePrice = 100;

  let addonsPrice = 0;
  addons.forEach((addon) => {
    if (PRICING_CONFIG.addOns[addon]) addonsPrice += PRICING_CONFIG.addOns[addon];
  });

  let subtotal = basePrice + addonsPrice;
  const discount = PRICING_CONFIG.frequencyDiscounts[freq] || 0;
  subtotal -= subtotal * discount;

  return {
    total: Math.round(subtotal * 100) / 100,
    sqft,
    serviceType,
    freq,
    addons,
    basePrice,
    addonsPrice,
    discount
  };
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function setFormValue(form, name, value) {
  if (value === undefined || value === null || value === "") return;
  const fields = form.querySelectorAll(`[name="${name}"]`);
  fields.forEach((field) => {
    if (field.type === "radio" || field.type === "checkbox") {
      if (String(field.value) === String(value)) field.checked = true;
    } else {
      field.value = value;
    }
  });
}

function setAddonValues(form, addOnsValue) {
  if (!addOnsValue) return;
  const values = String(addOnsValue).split(",").map((v) => v.trim()).filter(Boolean);
  form.querySelectorAll('input[name="add_ons[]"]').forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function initQuotePrefill() {
  const form = document.querySelector("#quoteAssistantForm");
  if (!form || form.getAttribute("data-table") !== "bookings") return;

  const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
  const params = new URLSearchParams(window.location.search);
  const fromQuote = params.get("from") === "quote";
  const banner = document.getElementById("quotePrefillBanner");
  const noQuoteBanner = document.getElementById("noQuoteBanner");

  if (!session && !fromQuote) {
    if (noQuoteBanner) noQuoteBanner.style.display = "block";
    return;
  }

  if (!session) return;

  const data = session;
  setFormValue(form, "full_name", data.full_name);
  setFormValue(form, "email", data.email);
  setFormValue(form, "phone", data.phone);
  setFormValue(form, "property_type", data.property_type);
  setFormValue(form, "bedrooms", data.bedrooms);
  setFormValue(form, "bathrooms", data.bathrooms);
  setFormValue(form, "square_feet", data.square_feet);
  setFormValue(form, "service_type", data.service_type);
  setFormValue(form, "frequency", data.frequency);
  setAddonValues(form, data.add_ons);

  if (banner && data.estimated_total) {
    banner.style.display = "block";
    banner.querySelector("[data-prefill-total]").textContent = formatMoney(data.estimated_total);
    banner.querySelector("[data-prefill-service]").textContent = data.service_type || "your selected service";
  }

  form.dispatchEvent(new Event("change", { bubbles: true }));
}

function buildSubmissionPayload(form, table) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  const pricing = calculateQuoteTotal(form);

  const addOnsCheckboxes = form.querySelectorAll('input[name="add_ons[]"]:checked');
  if (addOnsCheckboxes.length > 0) {
    payload.add_ons = Array.from(addOnsCheckboxes).map((cb) => cb.value).join(", ");
  }
  delete payload["add_ons[]"];

  payload.service_type = normalizeServiceType(payload.service_type);
  if (!payload.square_feet && pricing.sqft) {
    payload.square_feet = String(pricing.sqft);
  }
  payload.estimated_total = pricing.total;
  payload.consent = Boolean(form.querySelector("[name='consent']")?.checked);

  if (table === "bookings") {
    payload.payment_method = data.get("payment_method") || "pay_at_service";
    payload.payment_status = payload.payment_method === "pay_online" ? "pending_payment" : "pay_at_service";
  }

  return { payload, pricing };
}

function initQuoteAssistant(formContainer = document) {
  const form = formContainer.querySelector("#quoteAssistantForm");
  if (!form) return;

  const table = form.getAttribute("data-table") || "quote_requests";
  const isBooking = table === "bookings";
  const steps = form.querySelectorAll(".quote-step");
  const btnNext = formContainer.querySelector("#btnQuoteNext");
  const btnBack = formContainer.querySelector("#btnQuoteBack");
  const btnSubmit = formContainer.querySelector("#btnQuoteSubmit");
  const progressFill = formContainer.querySelector("#quoteProgressFill");
  const progressText = formContainer.querySelector("#quoteProgressText");

  const liveSpace = formContainer.querySelector("#liveSpace");
  const liveService = formContainer.querySelector("#liveService");
  const liveFrequency = formContainer.querySelector("#liveFrequency");
  const liveAddons = formContainer.querySelector("#liveAddons");
  const liveScope = formContainer.querySelector("#liveScope");

  const reviewProperty = formContainer.querySelector("#reviewProperty");
  const reviewService = formContainer.querySelector("#reviewService");
  const reviewFrequency = formContainer.querySelector("#reviewFrequency");
  const reviewSize = formContainer.querySelector("#reviewSize");
  const reviewAddons = formContainer.querySelector("#reviewAddons");
  const reviewContact = formContainer.querySelector("#reviewContact");
  const reviewMethod = formContainer.querySelector("#reviewMethod");
  const assistantBubble = formContainer.querySelector("#assistantBubble");

  let currentStepIndex = 0;

  const dateInput = form.querySelector('input[name="preferred_date"]');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }

  function updatePaymentUI() {
    if (!isBooking || !btnSubmit) return;
    const payOnline = form.querySelector('input[name="payment_method"][value="pay_online"]')?.checked;
    const stripeLink = window.CLEANCO_CONFIG?.stripePaymentLink;
    if (payOnline && stripeLink) {
      btnSubmit.innerHTML = `Pay & Book Now <i data-lucide="lock"></i>`;
    } else if (payOnline) {
      btnSubmit.innerHTML = `Confirm booking — pay online <i data-lucide="credit-card"></i>`;
    } else {
      btnSubmit.innerHTML = `Confirm booking <i data-lucide="calendar-check"></i>`;
    }
    if (typeof lucide !== "undefined") lucide.createIcons({ root: btnSubmit.parentElement });
  }

  function updateLiveSummary() {
    const data = new FormData(form);
    const pricing = calculateQuoteTotal(form);
    const pType = data.get("property_type") || "";
    const beds = data.get("bedrooms") || "0";
    const baths = data.get("bathrooms") || "0";
    const sType = data.get("service_type") || "Pending...";
    const freq = data.get("frequency") || "-";
    const addons = data.getAll("add_ons[]");

    let spaceText = "Pending...";
    if (pType) spaceText = `${pType} • ${beds} bed, ${baths} bath`;
    else if (beds !== "0") spaceText = `${beds} bed, ${baths} bath • ~${pricing.sqft} sq ft`;

    if (liveSpace) liveSpace.textContent = spaceText;
    if (liveService) liveService.textContent = sType;
    if (liveFrequency) liveFrequency.textContent = freq;
    if (liveAddons) liveAddons.textContent = addons.length ? `${addons.length} selected` : "0 selected";

    if (liveScope) {
      if (sType.includes("Deep") || sType.includes("Move")) liveScope.textContent = "Heavy reset scope";
      else if (addons.length > 2) liveScope.textContent = "Detailed scope";
      else if (pType || beds !== "0") liveScope.textContent = "Standard scope";
      else liveScope.textContent = "Calculating...";
    }

    const liveTotalDisplay = formContainer.querySelector("#liveCalculatedTotal");
    if (liveTotalDisplay && pricing.total > 0) {
      liveTotalDisplay.textContent = formatMoney(pricing.total);
    }
  }

  function populateReview() {
    const data = new FormData(form);
    const pricing = calculateQuoteTotal(form);
    const addons = data.getAll("add_ons[]");

    if (reviewProperty) reviewProperty.textContent = data.get("property_type") || data.get("address") || "-";
    if (reviewService) reviewService.textContent = data.get("service_type") || "-";
    if (reviewFrequency) reviewFrequency.textContent = data.get("frequency") || "-";

    const beds = data.get("bedrooms") || "0";
    const baths = data.get("bathrooms") || "0";
    const sqftLabel = data.get("square_feet") ? `${data.get("square_feet")} sq ft` : `~${pricing.sqft} sq ft (est.)`;
    if (reviewSize) reviewSize.textContent = `${beds} bed / ${baths} bath / ${sqftLabel}`;

    if (reviewAddons) reviewAddons.textContent = addons.length ? addons.join(", ") : "None";

    const name = data.get("full_name") || "-";
    const phone = data.get("phone") || "-";
    const email = data.get("email") || "-";
    if (reviewContact) reviewContact.textContent = `${name} • ${phone} • ${email}`;
    if (reviewMethod) reviewMethod.textContent = data.get("preferred_contact") || "-";

    const liveTotalDisplay = formContainer.querySelector("#liveCalculatedTotal");
    if (liveTotalDisplay) liveTotalDisplay.textContent = formatMoney(pricing.total);

    updatePaymentUI();
  }

  function updateUI() {
    steps.forEach((step, index) => {
      if (index === currentStepIndex) {
        step.classList.add("active");
        step.style.display = "block";
        setTimeout(() => { step.style.opacity = "1"; step.style.transform = "translateX(0)"; }, 10);
      } else {
        step.classList.remove("active");
        step.style.opacity = "0";
        step.style.transform = "translateX(10px)";
        setTimeout(() => { if (!step.classList.contains("active")) step.style.display = "none"; }, 300);
      }
    });

    const stepNum = currentStepIndex + 1;
    if (progressFill) progressFill.style.width = `${(stepNum / steps.length) * 100}%`;
    if (progressText) progressText.textContent = `Step ${stepNum} of ${steps.length}`;

    if (btnBack) btnBack.style.display = currentStepIndex === 0 ? "none" : "inline-flex";

    if (currentStepIndex === steps.length - 1) {
      if (btnNext) btnNext.style.display = "none";
      if (btnSubmit) btnSubmit.style.display = "inline-flex";
      populateReview();
    } else {
      if (btnNext) btnNext.style.display = "inline-flex";
      if (btnSubmit) btnSubmit.style.display = "none";
    }
  }

  steps.forEach((step) => {
    step.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    if (!step.classList.contains("active")) {
      step.style.display = "none";
      step.style.opacity = "0";
      step.style.transform = "translateX(10px)";
    }
  });

  updateUI();
  updateLiveSummary();

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      const currentStepEl = steps[currentStepIndex];
      const inputs = currentStepEl.querySelectorAll("input[required], select[required]");
      let valid = true;
      inputs.forEach((input) => {
        if (!input.reportValidity()) valid = false;
      });
      if (!valid) return;

      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        updateUI();
        updateAssistantBubble(formContainer, currentStepIndex, isBooking);
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        updateUI();
        updateAssistantBubble(formContainer, currentStepIndex, isBooking);
      }
    });
  }

  form.addEventListener("change", () => {
    updateLiveSummary();
    if (currentStepIndex === steps.length - 1) populateReview();
  });

  form.addEventListener("input", () => {
    updateLiveSummary();
    if (currentStepIndex === steps.length - 1) populateReview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const defaultSubmitLabel = isBooking
      ? (btnSubmit?.innerHTML || "Confirm booking")
      : `Get estimate & continue <i data-lucide="arrow-right"></i>`;

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Sending...";
    }

    const stateEl = form.querySelector("[data-form-state]");
    if (stateEl) {
      stateEl.className = "form-state loading";
      stateEl.textContent = "Saving your request...";
    }

    try {
      if (typeof window.supabaseInsert !== "function") {
        throw new Error("Form service unavailable. Please refresh and try again.");
      }

      const { payload, pricing } = buildSubmissionPayload(form, table);

      if (table === "bookings") {
        const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
        if (session?.quote_id) payload.quote_id = session.quote_id;
      }

      const result = await window.supabaseInsert(table, payload);

      if (table === "quote_requests") {
        const sessionData = {
          ...payload,
          quote_id: result.id,
          estimated_total: pricing.total
        };
        if (typeof window.saveQuoteSession === "function") {
          window.saveQuoteSession(sessionData);
        }

        form.style.display = "none";
        const progress = formContainer.querySelector(".quote-progress");
        if (progress) progress.style.display = "none";

        const successState = formContainer.querySelector("#quoteSuccessState");
        if (successState) {
          const totalEl = successState.querySelector("[data-success-total]");
          if (totalEl) totalEl.textContent = formatMoney(pricing.total);
          successState.style.display = "block";
          if (typeof lucide !== "undefined") lucide.createIcons({ root: successState });
        }
      } else {
        const payOnline = payload.payment_method === "pay_online";
        const stripeLink = window.CLEANCO_CONFIG?.stripePaymentLink;

        if (typeof window.clearQuoteSession === "function") {
          window.clearQuoteSession();
        }

        form.style.display = "none";
        const progress = formContainer.querySelector(".quote-progress");
        if (progress) progress.style.display = "none";

        const successState = formContainer.querySelector("#quoteSuccessState");
        if (successState) {
          const msg = successState.querySelector("[data-booking-message]");
          if (msg) {
            if (payOnline && stripeLink) {
              msg.textContent = "Your booking is saved. Complete secure payment in the next step to lock in your time slot.";
            } else if (payOnline) {
              msg.textContent = "Your booking is saved. We'll send a secure payment link to your email within the hour.";
            } else {
              msg.textContent = "Your appointment request is confirmed. We'll contact you shortly to finalize your time slot.";
            }
          }
          const totalEl = successState.querySelector("[data-success-total]");
          if (totalEl) totalEl.textContent = formatMoney(pricing.total);
          successState.style.display = "block";
          if (typeof lucide !== "undefined") lucide.createIcons({ root: successState });
        }

        if (payOnline && stripeLink) {
          setTimeout(() => { window.open(stripeLink, "_blank", "noopener"); }, 600);
        }
      }

      if (assistantBubble) {
        assistantBubble.textContent = isBooking
          ? "You're all set! We'll confirm your appointment soon."
          : "Great estimate! Continue to booking when you're ready.";
      }
    } catch (err) {
      console.error("Submission error:", err);
      if (stateEl) {
        stateEl.className = "form-state error";
        stateEl.textContent = `Could not submit: ${err.message}`;
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = defaultSubmitLabel;
        if (typeof lucide !== "undefined") lucide.createIcons({ root: btnSubmit.parentElement });
      }
    }
  });

  const btnRestart = formContainer.querySelector("#btnRestartQuote");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      form.reset();
      currentStepIndex = 0;
      const successState = formContainer.querySelector("#quoteSuccessState");
      if (successState) successState.style.display = "none";
      form.style.display = "block";
      const progress = formContainer.querySelector(".quote-progress");
      if (progress) progress.style.display = "block";
      updateUI();
      updateLiveSummary();
      updateAssistantBubble(formContainer, 0, isBooking);
    });
  }

  const btnBookNow = formContainer.querySelector("#btnContinueToBook");
  if (btnBookNow) {
    btnBookNow.addEventListener("click", () => {
      window.location.href = "book.html?from=quote";
    });
  }
}

function updateAssistantBubble(formContainer, stepIndex, isBooking) {
  const bubble = formContainer.querySelector("#assistantBubble");
  if (!bubble) return;
  const quoteMessages = [
    "Let's build your instant estimate — starting with your space.",
    "Standard is $0.17/sq ft, deep clean is $0.30/sq ft.",
    "Add extras like carpet, laundry, or power washing if you need them.",
    "Where should we send your estimate?",
    "Review your quote, then continue straight to booking."
  ];
  const bookMessages = [
    "Welcome back — let's finish your booking.",
    "Confirm service details from your quote.",
    "Pick frequency and any extras.",
    "Choose your preferred date and time.",
    "Review total and choose how you'd like to pay."
  ];
  const messages = isBooking ? bookMessages : quoteMessages;
  bubble.style.opacity = "0";
  setTimeout(() => {
    bubble.textContent = messages[stepIndex] || messages[0];
    bubble.style.opacity = "1";
  }, 200);
}

function initQuoteModalIntercept() {
  if (window.location.pathname.endsWith("quote.html")) return;

  document.addEventListener("click", async (e) => {
    const anchor = e.target.closest("a.open-quote-modal");
    if (!anchor) return;

    e.preventDefault();

    let modal = document.getElementById("quoteModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "quoteModal";
      modal.className = "quote-modal fade-in-up";
      modal.innerHTML = `
        <div class="quote-modal-overlay"></div>
        <div class="quote-modal-content">
          <button class="quote-modal-close" aria-label="Close quote modal"><i data-lucide="x"></i></button>
          <div class="quote-modal-body" id="quoteModalBody">
            <div style="text-align:center; padding: 40px; color:var(--muted);">Loading quote assistant...</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => {
        modal.classList.remove("is-open");
        document.body.style.overflow = "";
      };

      modal.querySelector(".quote-modal-close").addEventListener("click", closeModal);
      modal.querySelector(".quote-modal-overlay").addEventListener("click", closeModal);

      try {
        const response = await fetch("quote.html");
        if (!response.ok) throw new Error("Failed to load quote");
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const card = doc.querySelector("#quoteAssistantCard");

        if (card) {
          const modalBody = modal.querySelector("#quoteModalBody");
          modalBody.innerHTML = "";
          modalBody.appendChild(card.cloneNode(true));
          if (typeof lucide !== "undefined") lucide.createIcons({ root: modalBody });
          initQuoteAssistant(modalBody);
        } else {
          window.location.href = "quote.html";
          return;
        }
      } catch (err) {
        console.error("Error loading quote modal:", err);
        window.location.href = "quote.html";
        return;
      }
    }

    setTimeout(() => {
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }, 10);
  });
}
