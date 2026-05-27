function getPricingConfig() {
  const cfg = window.CLEANCO_CONFIG?.pricing;
  if (cfg?.rates && cfg?.addOns) return cfg;
  return {
    minimumJob: 100,
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.30,
      "Move-in/Move-out": 0.35,
      "Office cleaning": 0.20
    },
    addOns: {
      "Carpet cleaning": 75,
      "Wash and fold": 45,
      "Inside oven": 25,
      "Inside fridge": 25,
      "Cabinet interiors": 30,
      "Interior windows": 40,
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
}

const ADDON_VALUE_ALIASES = {
  oven: "Inside oven",
  fridge: "Inside fridge",
  windows: "Interior windows",
  laundry: "Wash and fold",
  "wash and fold": "Wash and fold",
  "carpet refresh": "Carpet cleaning",
  "carpet cleaning": "Carpet cleaning",
  "inside cabinets": "Cabinet interiors",
  "cabinet interiors": "Cabinet interiors",
  "interior windows": "Interior windows",
  "inside oven": "Inside oven",
  "inside fridge": "Inside fridge",
  "junk removal": "Junk removal",
  "power washing": "Power washing"
};

function normalizeAddonValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const canonical = ADDON_VALUE_ALIASES[trimmed.toLowerCase()];
  if (canonical) return canonical;
  const pricing = getPricingConfig();
  if (pricing.addOns[trimmed]) return trimmed;
  return trimmed;
}

const SERVICE_SLUG_MAP = {
  "standard-cleaning": "Standard cleaning",
  "deep-cleaning": "Deep cleaning",
  "move-in-out-cleaning": "Move-in/Move-out",
  "move-in-out": "Move-in/Move-out",
  "office-cleaning": "Office cleaning"
};

const ADDON_SLUG_MAP = {
  "carpet-cleaning": "Carpet cleaning",
  "wash-and-fold": "Wash and fold",
  "inside-oven": "Inside oven",
  "inside-fridge": "Inside fridge",
  "cabinet-interiors": "Cabinet interiors",
  "interior-windows": "Interior windows",
  "junk-removal": "Junk removal",
  "power-washing": "Power washing"
};

const QUOTE_CONTEXT_KEY = "rs_cleaning_quote_context";

function getServiceAreaMeta() {
  const key = window.SERVICE_AREA_META_KEY || "rs_service_area_meta";
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const SERVICE_ALIASES = {
  "Move-in / Move-out": "Move-in/Move-out",
  "Move in/out": "Move-in/Move-out"
};

function parseQuoteContextFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const context = {
    intent: params.get("intent") || "",
    serviceSlug: params.get("service") || "",
    serviceType: "",
    addons: [],
    frequency: params.get("frequency") || "",
    startStep: parseInt(params.get("step") || "0", 10) || 0
  };

  const slug = context.serviceSlug.toLowerCase();
  if (slug && SERVICE_SLUG_MAP[slug]) {
    context.serviceType = SERVICE_SLUG_MAP[slug];
  } else if (slug && ADDON_SLUG_MAP[slug]) {
    context.addons.push(ADDON_SLUG_MAP[slug]);
  }

  const addonParam = params.get("addon") || params.get("addons") || "";
  if (addonParam) {
    addonParam.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const addonSlug = trimmed.toLowerCase();
      if (ADDON_SLUG_MAP[addonSlug]) context.addons.push(ADDON_SLUG_MAP[addonSlug]);
      else context.addons.push(trimmed);
    });
  }

  context.addons = [...new Set(context.addons.map(normalizeAddonValue))];
  if (context.startStep >= 5) context.startStep = 4;
  if (context.startStep < 0) context.startStep = 0;
  return context;
}

function saveQuoteContext(context) {
  try {
    sessionStorage.setItem(QUOTE_CONTEXT_KEY, JSON.stringify(context));
  } catch {}
}

function loadQuoteContext() {
  try {
    const raw = sessionStorage.getItem(QUOTE_CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyQuoteContextToForm(form, context) {
  if (!form || !context) return;

  if (context.serviceType) {
    setFormValue(form, "service_type", context.serviceType);
  }
  if (context.frequency) {
    setFormValue(form, "frequency", context.frequency);
  }
  context.addons.forEach((addon) => {
    const normalized = normalizeAddonValue(addon);
    form.querySelectorAll('input[name="add_ons[]"]').forEach((input) => {
      if (input.value === normalized) input.checked = true;
    });
  });

  form.dispatchEvent(new Event("change", { bubbles: true }));
}

function initQuoteContext() {
  const form = document.querySelector("#quoteAssistantForm");
  if (!form || form.getAttribute("data-table") !== "quote_requests") return;

  const urlContext = parseQuoteContextFromUrl();
  const hasUrlContext = Boolean(
    urlContext.serviceType ||
    urlContext.addons.length ||
    urlContext.frequency ||
    urlContext.intent ||
    urlContext.startStep
  );

  if (!hasUrlContext) {
    try {
      sessionStorage.removeItem(QUOTE_CONTEXT_KEY);
    } catch {}
    window.__quoteContext = null;
    return;
  }

  saveQuoteContext(urlContext);
  applyQuoteContextToForm(form, urlContext);
  window.__quoteContext = urlContext;
}

function getQuoteContext() {
  return window.__quoteContext || loadQuoteContext() || null;
}

document.addEventListener("DOMContentLoaded", () => {
  initQuotePrefill();
  initQuoteContext();
  initQuoteAssistant();
});

function normalizeServiceType(value) {
  if (!value) return "";
  return SERVICE_ALIASES[value] || value;
}

function parseSqft(raw, bedrooms, bathrooms) {
  const parsed = parseInt(String(raw || "").replace(/,/g, ""), 10);
  if (parsed > 0) return parsed;
  const beds = parseInt(bedrooms, 10) || 2;
  const baths = parseInt(bathrooms, 10) || 1;
  return Math.round(beds * 450 + baths * 150 + 350);
}

function calculateQuoteTotal(form) {
  const data = new FormData(form);
  const table = form.getAttribute("data-table");
  const session = table === "bookings" && typeof window.loadQuoteSession === "function"
    ? window.loadQuoteSession()
    : null;

  const serviceType = normalizeServiceType(data.get("service_type") || session?.service_type);
  const sqft = parseSqft(
    data.get("square_feet") || session?.square_feet,
    data.get("bedrooms") || session?.bedrooms,
    data.get("bathrooms") || session?.bathrooms
  );
  const freq = data.get("frequency") || session?.frequency || "One-time";
  let addons = data.getAll("add_ons[]");
  if (!addons.length && session?.add_ons) {
    addons = String(session.add_ons).split(",").map((v) => v.trim()).filter(Boolean);
  }

  const pricingConfig = getPricingConfig();
  if (!serviceType || !pricingConfig.rates[serviceType]) {
    return { total: 0, sqft, serviceType, freq, addons };
  }

  let basePrice = sqft * pricingConfig.rates[serviceType];
  const minimumJob = pricingConfig.minimumJob || 100;
  if (basePrice > 0 && basePrice < minimumJob) basePrice = minimumJob;

  let addonsPrice = 0;
  addons.forEach((addon) => {
    const key = normalizeAddonValue(addon);
    if (pricingConfig.addOns[key]) addonsPrice += pricingConfig.addOns[key];
  });

  let subtotal = basePrice + addonsPrice;
  const discount = pricingConfig.frequencyDiscounts[freq] || 0;
  subtotal -= subtotal * discount;

  const areaMeta = getServiceAreaMeta();
  const travelFee = areaMeta?.travelFee ? Number(areaMeta.travelFee) : 0;
  subtotal += travelFee;

  return {
    total: Math.round(subtotal * 100) / 100,
    sqft,
    serviceType,
    freq,
    addons,
    basePrice,
    addonsPrice,
    discount,
    travelFee,
    areaName: areaMeta?.name || ""
  };
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function formatPhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  let formatted = `(${digits.slice(0, 3)}`;
  if (digits.length <= 3) return formatted;
  formatted += `) ${digits.slice(3, 6)}`;
  if (digits.length <= 6) return formatted;
  return `${formatted}-${digits.slice(6, 10)}`;
}

function animateCountUp(el, targetTotal, duration = 1200) {
  if (!el) return;
  const target = Number(targetTotal || 0);
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatMoney(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatMoney(target);
  };

  el.textContent = formatMoney(0);
  requestAnimationFrame(tick);
}

function initPhoneFormatting(form) {
  const phoneInput = form.querySelector('input[name="phone"]');
  if (!phoneInput || phoneInput.dataset.formatted === "true") return;
  phoneInput.dataset.formatted = "true";

  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhoneDigits(phoneInput.value);
  });

  if (phoneInput.value) phoneInput.value = formatPhoneDigits(phoneInput.value);
}

function validateEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
}

function validatePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "").length >= 10;
}

function ensureStudioToast(root) {
  const header = root.querySelector(".quote-app-header") || root;
  let toast = header.querySelector(".quote-studio-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "quote-studio-toast";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "polite");
    header.insertBefore(toast, header.firstChild);
  }
  return toast;
}

function showStudioToast(root, message, type = "error") {
  const toast = ensureStudioToast(root);
  toast.textContent = message;
  toast.className = `quote-studio-toast is-${type}`;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  if (toast._hideTimer) clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 4500);
}

function getInputLabel(input) {
  const fieldLabel = input.closest("label.field");
  if (fieldLabel) {
    const textNode = fieldLabel.childNodes[0];
    if (textNode?.nodeType === Node.TEXT_NODE) {
      return textNode.textContent.replace(/optional/i, "").trim();
    }
  }
  const legend = input.closest("fieldset")?.querySelector("legend");
  if (legend) return legend.textContent.trim();
  const groupLabel = input.closest(".book-schedule-block")?.querySelector(".quote-field-label");
  if (groupLabel) return groupLabel.textContent.trim();
  return input.name?.replace(/_/g, " ") || "This field";
}

function initBookDatePicker(form) {
  const container = form.querySelector("#bookDatePicker");
  const hidden = form.querySelector('input[name="preferred_date"]');
  if (!container || !hidden || container.dataset.ready === "true") return;
  container.dataset.ready = "true";

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const chips = [];

  for (let offset = 1; offset <= 14; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const iso = [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, "0"),
      String(day.getDate()).padStart(2, "0")
    ].join("-");
    const weekday = day.toLocaleDateString("en-US", { weekday: "short" });
    const label = day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    chips.push(`<button type="button" class="book-date-chip" data-date="${iso}" aria-label="${weekday}, ${label}"><em>${weekday}</em><strong>${label}</strong></button>`);
  }

  container.innerHTML = chips.join("");

  container.addEventListener("click", (event) => {
    const chip = event.target.closest(".book-date-chip");
    if (!chip) return;
    container.querySelectorAll(".book-date-chip").forEach((el) => el.classList.remove("is-selected"));
    chip.classList.add("is-selected");
    hidden.value = chip.dataset.date || "";
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  });

  if (hidden.value) {
    const match = container.querySelector(`[data-date="${hidden.value}"]`);
    match?.classList.add("is-selected");
  }
}

function initServiceTooltips(root) {
  if (!root || root.dataset.tooltipsReady === "true") return;
  root.dataset.tooltipsReady = "true";

  let popover = root.querySelector(".quote-tip-popover");
  if (!popover) {
    popover = document.createElement("div");
    popover.className = "quote-tip-popover";
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    root.appendChild(popover);
  }

  let hideTimer = null;
  let activeTrigger = null;

  const hideTip = () => {
    popover.classList.remove("is-visible");
    hideTimer = setTimeout(() => {
      popover.hidden = true;
      activeTrigger = null;
    }, 220);
  };

  const positionTip = (trigger) => {
    const rootRect = root.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    popover.hidden = false;
    popover.style.left = "0";
    popover.style.top = "0";

    const popRect = popover.getBoundingClientRect();
    let left = triggerRect.left - rootRect.left + triggerRect.width / 2 - popRect.width / 2;
    let top = triggerRect.bottom - rootRect.top + 8;

    left = Math.max(8, Math.min(left, rootRect.width - popRect.width - 8));
    if (top + popRect.height > rootRect.height - 8) {
      top = triggerRect.top - rootRect.top - popRect.height - 8;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  };

  const showTip = (trigger) => {
    const text = trigger.dataset.tip;
    if (!text) return;
    if (hideTimer) clearTimeout(hideTimer);
    activeTrigger = trigger;
    popover.textContent = text;
    positionTip(trigger);
    requestAnimationFrame(() => popover.classList.add("is-visible"));
  };

  root.querySelectorAll(".quote-tip-trigger").forEach((trigger) => {
    trigger.addEventListener("mouseenter", () => showTip(trigger));
    trigger.addEventListener("focus", () => showTip(trigger));
    trigger.addEventListener("mouseleave", () => {
      hideTimer = setTimeout(hideTip, 120);
    });
    trigger.addEventListener("blur", hideTip);
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
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
  const values = String(addOnsValue)
    .split(",")
    .map((v) => normalizeAddonValue(v))
    .filter(Boolean);
  form.querySelectorAll('input[name="add_ons[]"]').forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function initQuotePrefill() {
  const form = document.querySelector("#quoteAssistantForm");
  if (!form || form.getAttribute("data-table") !== "bookings") return;

  const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
  const banner = document.getElementById("quotePrefillBanner");
  const noQuoteGate = document.getElementById("bookNoQuoteGate");
  const bookFormWrap = document.getElementById("bookFormWrap");

  if (!session) {
    if (noQuoteGate) noQuoteGate.hidden = false;
    if (bookFormWrap) bookFormWrap.hidden = true;
    return;
  }

  if (noQuoteGate) noQuoteGate.hidden = true;
  if (bookFormWrap) bookFormWrap.hidden = false;

  setFormValue(form, "full_name", session.full_name);
  setFormValue(form, "email", session.email);
  setFormValue(form, "phone", formatPhoneDigits(session.phone));
  setFormValue(form, "property_type", session.property_type);
  setFormValue(form, "bedrooms", session.bedrooms);
  setFormValue(form, "bathrooms", session.bathrooms);
  setFormValue(form, "square_feet", session.square_feet);
  setFormValue(form, "service_type", session.service_type);
  setFormValue(form, "frequency", session.frequency);
  setAddonValues(form, session.add_ons);

  if (banner) {
    banner.hidden = false;
    const totalEl = banner.querySelector("[data-prefill-total]");
    const serviceEl = banner.querySelector("[data-prefill-service]");
    if (totalEl) totalEl.textContent = formatMoney(session.estimated_total);
    if (serviceEl) serviceEl.textContent = session.service_type || "Your service";
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

  if (table === "bookings") {
    const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    if (session) {
      [
        "full_name", "email", "phone", "service_type", "property_type",
        "bedrooms", "bathrooms", "square_feet", "frequency", "add_ons", "estimated_total"
      ].forEach((key) => {
        if ((!payload[key] || payload[key] === "") && session[key] != null && session[key] !== "") {
          payload[key] = session[key];
        }
      });
      if (session.quote_id) payload.quote_id = session.quote_id;
    }
  }

  payload.service_type = normalizeServiceType(payload.service_type);
  if (!payload.square_feet && pricing.sqft) {
    payload.square_feet = String(pricing.sqft);
  }
  payload.estimated_total = pricing.total || payload.estimated_total || 0;
  payload.consent = Boolean(form.querySelector("[name='consent']")?.checked);

  if (table === "bookings") {
    payload.payment_method = data.get("payment_method") || "pay_at_service";
    payload.payment_status = payload.payment_method === "pay_online" ? "pending_payment" : "pay_at_service";
  }

  return { payload, pricing };
}


function initQuoteSizeChips(form) {
  if (!form.querySelector(".quote-size-metrics")) return;
}

function initQuoteAssistant(formContainer = document) {
  const form = formContainer.querySelector("#quoteAssistantForm");
  if (!form) return;

  const table = form.getAttribute("data-table") || "quote_requests";
  const isBooking = table === "bookings";

  if (isBooking) {
    const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    const bookFormWrap = document.getElementById("bookFormWrap");
    const noQuoteGate = document.getElementById("bookNoQuoteGate");
    if (!session) {
      if (noQuoteGate) noQuoteGate.hidden = false;
      if (bookFormWrap) bookFormWrap.hidden = true;
      return;
    }
    if (noQuoteGate) noQuoteGate.hidden = true;
    if (bookFormWrap) bookFormWrap.hidden = false;
  }
  const steps = form.querySelectorAll(".quote-step");
  const btnNext = formContainer.querySelector("#btnQuoteNext");
  const btnBack = formContainer.querySelector("#btnQuoteBack");
  const btnSubmit = formContainer.querySelector("#btnQuoteSubmit");

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
  const reviewSchedule = formContainer.querySelector("#reviewSchedule");
  const root = form.closest("#quoteAssistantCard, #bookAssistantCard, .quote-window") || formContainer;
  const assistantBubble = root.querySelector("#assistantBubble");
  const windowTitle = root.querySelector("#quoteWindowTitle");
  const isQuoteStudio = root.classList.contains("quote-window");
  const formStage = root.querySelector(".quote-form-stage");
  const expandSection = root.querySelector(".quote-window-expand");
  const windowHead = root.querySelector(".quote-window-head");
  const calculatingState = root.querySelector("#quoteCalculatingState");
  const reviewReveal = root.querySelector("#quoteReviewReveal");
  let typewriterTimer = null;
  let reviewRevealTimer = null;
  let reviewMsgTimer = null;
  let reviewAnimationStep = -1;

  const quoteContext = !isBooking ? getQuoteContext() : null;
  const quoteMessages = [
    quoteContext?.intent === "book"
      ? "Let's confirm your price first — then you'll pick a date and pay."
      : "Pick your property type, then enter beds, baths, and square footage.",
    "Choose a cleaning type and how often.",
    "Optional add-ons — tap any that apply, or skip.",
    "Your contact details so we can send the estimate.",
    "Review your total and submit."
  ];
  const bookMessages = [
    "Your quote is saved. Where should we come, and when works best?",
    "Review your booking and choose how you'd like to pay."
  ];

  function scrollQuoteStepIntoView() {
    if (!isQuoteStudio || isBooking) return;
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
    const scrollTarget = root.querySelector(".quote-form-stage") || root.querySelector(".quote-window-chrome") || root;
    requestAnimationFrame(() => {
      const rect = scrollTarget.getBoundingClientRect();
      const targetTop = rect.top + window.scrollY - headerHeight - 8;
      if (rect.top < headerHeight + 8) {
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
      }
    });
  }

  function collapseExpandable() {
    if (!expandSection || !isQuoteStudio) return;
    root.classList.remove("is-expanded");
    root.classList.add("is-compact");
    expandSection.style.maxHeight = "0px";
  }

  function expandExpandable() {
    if (!expandSection || !isQuoteStudio) return;
    root.classList.remove("is-compact");
    expandSection.style.maxHeight = `${expandSection.scrollHeight}px`;
    requestAnimationFrame(() => root.classList.add("is-expanded"));
    setTimeout(() => {
      if (root.classList.contains("is-expanded")) {
        expandSection.style.maxHeight = "none";
      }
    }, 1300);
  }

  function remeasureExpandable() {
    if (!expandSection || !root.classList.contains("is-expanded")) return;
    expandSection.style.maxHeight = `${expandSection.scrollHeight}px`;
    requestAnimationFrame(() => {
      expandSection.style.maxHeight = "none";
    });
  }

  function setStepContentVisible(visible) {
    if (!isQuoteStudio) return;
    if (formStage) formStage.classList.toggle("is-revealed", visible);
    if (visible) {
      if (isBooking) {
        expandExpandable();
        return;
      }
      root.classList.remove("is-compact");
      root.classList.add("is-expanded");
      if (expandSection) {
        expandSection.style.maxHeight = "none";
        expandSection.style.opacity = "1";
        expandSection.style.pointerEvents = "auto";
      }
    } else if (isBooking) {
      collapseExpandable();
    }
  }

  function playAssistantMessage(stepIndex, { instant = false } = {}) {
    const bubbleText = root.querySelector("#assistantBubbleText");
    const bubble = root.querySelector("#assistantBubble");
    if (!bubbleText || !bubble) return;

    const text = getCoachMessage(stepIndex);

    if (typewriterTimer) clearInterval(typewriterTimer);

    if (instant || (isQuoteStudio && !isBooking)) {
      bubbleText.textContent = text;
      bubble.classList.remove("is-typing");
      setStepContentVisible(true);
      remeasureExpandable();
      scrollQuoteStepIntoView();
      if (table === "quote_requests" && stepIndex === steps.length - 1) {
        showCalculatingReview();
      }
      return;
    }

    bubbleText.textContent = "";
    bubble.classList.add("is-typing");

    if (isQuoteStudio) {
      collapseExpandable();
      if (formStage) formStage.classList.remove("is-revealed");
    }

    let index = 0;
    typewriterTimer = setInterval(() => {
      index += 1;
      bubbleText.textContent = text.slice(0, index);
      if (index >= text.length) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        bubble.classList.remove("is-typing");
        if (isQuoteStudio) {
          setTimeout(() => {
            setStepContentVisible(true);
            remeasureExpandable();
            scrollQuoteStepIntoView();
            if (table === "quote_requests" && stepIndex === steps.length - 1) {
              showCalculatingReview();
            }
          }, 280);
        }
      }
    }, 26);
  }

  let currentStepIndex = 0;
  if (quoteContext?.startStep >= 1 && quoteContext.startStep <= steps.length) {
    currentStepIndex = quoteContext.startStep - 1;
  }

  function getCoachMessage(stepIndex) {
    if (isBooking) return bookMessages[stepIndex] || bookMessages[0];
    return quoteMessages[stepIndex] || quoteMessages[0];
  }

  function validateSpaceStep(silent = false) {
    const propertyType = form.querySelector('input[name="property_type"]:checked');
    if (!propertyType) {
      if (!silent) showStudioToast(root, "Please select a property type.", "error");
      return false;
    }
    return validateSizeChunk(silent);
  }

  function validateServiceStep(silent = false) {
    const serviceType = form.querySelector('input[name="service_type"]:checked');
    const frequency = form.querySelector('input[name="frequency"]:checked');
    if (!serviceType) {
      if (!silent) showStudioToast(root, "Please select a cleaning type.", "error");
      return false;
    }
    if (!frequency) {
      if (!silent) showStudioToast(root, "Please select a frequency.", "error");
      return false;
    }
    return true;
  }

  function validateAllQuoteSteps(silent = false) {
    if (isBooking) {
      for (let i = 0; i < steps.length; i += 1) {
        if (!validateStep(steps[i], silent)) return false;
      }
      return true;
    }
    if (!validateSpaceStep(silent)) return false;
    if (!validateServiceStep(silent)) return false;
    for (let i = 2; i < steps.length; i += 1) {
      if (!validateStep(steps[i], silent)) return false;
    }
    return true;
  }

  function validateSizeChunk(silent = false) {
    const bedsRaw = String(form.querySelector("#quoteBedrooms")?.value ?? "").trim();
    const bathsRaw = String(form.querySelector("#quoteBathrooms")?.value ?? "").trim();
    const sqftRaw = String(form.querySelector("#quoteSqft")?.value ?? "").trim();
    const beds = bedsRaw === "" ? NaN : parseInt(bedsRaw, 10);
    const baths = bathsRaw === "" ? NaN : parseInt(bathsRaw, 10);
    const sqft = sqftRaw === "" ? NaN : parseInt(sqftRaw.replace(/,/g, ""), 10);

    if (!Number.isInteger(beds) || beds < 0) {
      if (!silent) {
        showStudioToast(root, "Enter the number of bedrooms.", "error");
        form.querySelector("#quoteBedrooms")?.focus?.({ preventScroll: true });
      }
      return false;
    }
    if (!Number.isInteger(baths) || baths < 1) {
      if (!silent) {
        showStudioToast(root, "Enter a whole number of bathrooms (at least 1).", "error");
        form.querySelector("#quoteBathrooms")?.focus?.({ preventScroll: true });
      }
      return false;
    }
    if (!Number.isInteger(sqft) || sqft < 200) {
      if (!silent) {
        showStudioToast(root, "Enter your square footage (at least 200).", "error");
        form.querySelector("#quoteSqft")?.focus?.({ preventScroll: true });
      }
      return false;
    }
    return true;
  }

  function updateNavState() {
    if (!btnNext || currentStepIndex === steps.length - 1) return;

    btnNext.classList.remove("is-ready");

    if (currentStepIndex === 2) {
      btnNext.classList.remove("is-hidden");
      btnNext.disabled = false;
      btnNext.removeAttribute("aria-disabled");
      return;
    }

    if (!isBooking && currentStepIndex === 0) {
      const valid = validateSpaceStep(true);
      btnNext.classList.toggle("is-hidden", !valid);
      btnNext.classList.toggle("is-ready", valid);
      btnNext.disabled = !valid;
      btnNext.setAttribute("aria-disabled", valid ? "false" : "true");
      return;
    }

    if (!isBooking && currentStepIndex === 1) {
      const valid = validateServiceStep(true);
      btnNext.classList.toggle("is-hidden", !valid);
      btnNext.classList.toggle("is-ready", valid);
      btnNext.disabled = !valid;
      btnNext.setAttribute("aria-disabled", valid ? "false" : "true");
      return;
    }

    if (currentStepIndex === 3) {
      const valid = validateStep(steps[currentStepIndex], true);
      btnNext.classList.toggle("is-hidden", !valid);
      btnNext.classList.toggle("is-ready", valid);
      btnNext.disabled = !valid;
      btnNext.setAttribute("aria-disabled", valid ? "false" : "true");
      return;
    }

    btnNext.classList.remove("is-hidden");
    btnNext.disabled = false;
    btnNext.setAttribute("aria-disabled", "false");
  }

  function showSuccessPanel(successState) {
    if (!successState) return;
    successState.hidden = false;
    if (typeof lucide !== "undefined") lucide.createIcons({ root: successState });
  }

  function hideSuccessPanel(successState) {
    if (!successState) return;
    successState.hidden = true;
  }

  const dateInput = form.querySelector('input[name="preferred_date"]');

  function validateStep(stepEl, silent = false) {
    const seenRadios = new Set();
    const errors = [];

    const pushError = (message, input) => {
      errors.push({ message, input });
    };

    stepEl.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.type === "hidden" && input.name === "preferred_date") {
        if (input.required && !input.value) {
          pushError("Please choose a day for your cleaning.", input);
        }
        return;
      }

      if (!input.required && input.type !== "checkbox") return;
      if (input.type === "radio") {
        if (seenRadios.has(input.name)) return;
        seenRadios.add(input.name);
        if (!stepEl.querySelector(`input[name="${input.name}"]:checked`)) {
          const label = getInputLabel(input);
          pushError(`Please select ${label.toLowerCase()}.`, input);
        }
        return;
      }

      if (input.type === "checkbox") {
        if (input.required && !input.checked) {
          pushError("Please check the agreement box before continuing.", input);
        }
        return;
      }

      const value = String(input.value || "").trim();
      if (!value) {
        pushError(`Please enter your ${getInputLabel(input).toLowerCase()}.`, input);
        return;
      }

      if (input.type === "email" && !validateEmailAddress(value)) {
        pushError("Please enter a valid email address (example: name@email.com).", input);
        return;
      }

      if (input.name === "phone" && !validatePhoneNumber(value)) {
        pushError("Please enter a complete phone number — (555) 000-0000.", input);
        return;
      }

      if (input.type === "number" && input.min && Number(value) < Number(input.min)) {
        pushError(`${getInputLabel(input)} must be at least ${input.min}.`, input);
      }
    });

    if (errors.length) {
      const first = errors[0];
      if (!silent) {
        showStudioToast(root, first.message, "error");
        first.input?.focus?.({ preventScroll: true });
        first.input?.closest(".book-date-scroll")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      return false;
    }
    return true;
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

  function populateReview(showTotal = true) {
    const data = new FormData(form);
    const session = isBooking && typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    const pricing = calculateQuoteTotal(form);
    const addons = data.getAll("add_ons[]");
    const addonText = addons.length
      ? addons.join(", ")
      : (session?.add_ons ? String(session.add_ons).split(",").map((v) => v.trim()).filter(Boolean).join(", ") : "None");

    const property = data.get("property_type") || session?.property_type || data.get("address") || "-";
    const beds = data.get("bedrooms") || session?.bedrooms || "0";
    const baths = data.get("bathrooms") || session?.bathrooms || "0";
    const sqftRaw = data.get("square_feet") || session?.square_feet;
    const sqftLabel = sqftRaw ? `${sqftRaw} sq ft` : `~${pricing.sqft} sq ft`;
    if (reviewProperty) {
      if (isBooking && data.get("address")) {
        reviewProperty.textContent = property;
      } else if (!isBooking) {
        reviewProperty.textContent = `${property} · ${beds} bed · ${baths} bath · ${sqftLabel}`;
      } else {
        reviewProperty.textContent = property;
      }
    }
    if (reviewService) reviewService.textContent = data.get("service_type") || session?.service_type || "-";
    if (reviewFrequency) reviewFrequency.textContent = data.get("frequency") || session?.frequency || "-";

    if (reviewSize) reviewSize.textContent = `${beds} bed / ${baths} bath / ${sqftLabel}`;

    if (reviewAddons) reviewAddons.textContent = addonText || "None";

    const name = data.get("full_name") || session?.full_name || "-";
    const phone = data.get("phone") || session?.phone || "-";
    const email = data.get("email") || session?.email || "-";
    if (reviewContact) reviewContact.textContent = `${name} · ${phone} · ${email}`;
    if (reviewMethod) reviewMethod.textContent = data.get("preferred_contact") || session?.preferred_contact || "-";

    const date = data.get("preferred_date");
    const time = data.get("preferred_time");
    if (reviewSchedule) {
      let dateLabel = "";
      if (date) {
        const parsed = new Date(`${date}T12:00:00`);
        dateLabel = parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
      reviewSchedule.textContent = dateLabel && time ? `${dateLabel} · ${time}` : dateLabel || time || "—";
    }

    const liveTotalDisplay = root.querySelector("#liveCalculatedTotal");
    const travelNote = root.querySelector("#reviewTravelNote");
    const totalValue = pricing.total || session?.estimated_total || 0;
    if (liveTotalDisplay) {
      liveTotalDisplay.textContent = showTotal ? formatMoney(totalValue) : "…";
    }
    if (travelNote) {
      if (pricing.travelFee > 0) {
        travelNote.hidden = false;
        travelNote.textContent = `Includes $${pricing.travelFee.toFixed(0)} travel fee${pricing.areaName ? ` for ${pricing.areaName}` : ""}.`;
      } else {
        travelNote.hidden = true;
        travelNote.textContent = "";
      }
    }

    updatePaymentUI();
  }

  function resetReviewRevealAnimation() {
    if (!reviewReveal) return;
    reviewReveal.querySelectorAll(".quote-review-row, .quote-review-total, .quote-plan-bullet, .quote-estimate-hero").forEach((row) => {
      row.classList.remove("is-visible");
    });
  }

  function revealReviewProgressively() {
    if (!reviewReveal) return;

    populateReview(true);
    resetReviewRevealAnimation();

    const rows = reviewReveal.querySelectorAll(".quote-plan-bullet, .quote-review-row");
    const totalRow = reviewReveal.querySelector(".quote-estimate-hero, .quote-review-total");
    const totalEl = root.querySelector("#liveCalculatedTotal");
    const pricing = calculateQuoteTotal(form);

    if (totalEl) totalEl.textContent = formatMoney(0);
    reviewReveal.classList.add("is-revealed");

    rows.forEach((row, index) => {
      setTimeout(() => row.classList.add("is-visible"), 160 + index * 220);
    });

    const totalDelay = 160 + rows.length * 220 + 260;
    setTimeout(() => {
      totalRow?.classList.add("is-visible");
      animateCountUp(totalEl, pricing.total, 1300);
      scrollQuoteStepIntoView();
    }, totalDelay);
  }

  function showCalculatingReview() {
    if (!calculatingState || !reviewReveal) {
      populateReview(true);
      return;
    }

    if (reviewAnimationStep === currentStepIndex && !reviewReveal.hidden && reviewReveal.classList.contains("is-revealed")) {
      populateReview(true);
      return;
    }
    reviewAnimationStep = currentStepIndex;

    if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
    if (reviewMsgTimer) clearInterval(reviewMsgTimer);

    calculatingState.hidden = false;
    reviewReveal.hidden = true;
    reviewReveal.classList.remove("is-revealed");
    resetReviewRevealAnimation();
    populateReview(false);

    const subEl = calculatingState.querySelector(".quote-calculating-sub");
    const calcMessages = [
      "Reviewing space, service, and add-ons",
      "Matching your space to service rates…",
      "Checking selected add-ons…",
      "Preparing your personalized total…"
    ];
    let calcIndex = 0;
    if (subEl) subEl.textContent = calcMessages[0];
    reviewMsgTimer = setInterval(() => {
      calcIndex += 1;
      if (calcIndex < calcMessages.length && subEl) {
        subEl.style.opacity = "0";
        setTimeout(() => {
          subEl.textContent = calcMessages[calcIndex];
          subEl.style.opacity = "1";
        }, 120);
      }
    }, 420);

    reviewRevealTimer = setTimeout(() => {
      clearInterval(reviewMsgTimer);
      reviewMsgTimer = null;
      calculatingState.hidden = true;
      reviewReveal.hidden = false;
      revealReviewProgressively();
      remeasureExpandable();
      scrollQuoteStepIntoView();
    }, 1200);
  }

  function updateStepChrome() {
    const stepNum = currentStepIndex + 1;
    if (windowTitle && isQuoteStudio && !isBooking) {
      windowTitle.textContent = `Quote · Step ${stepNum} of ${steps.length}`;
    }
    root.dataset.step = String(stepNum);
  }

  function transitionToStep(nextIndex, direction = 1) {
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    if (!isQuoteStudio) {
      currentStepIndex = nextIndex;
      updateUI();
      playAssistantMessage(currentStepIndex);
      return;
    }

    const currentStepEl = steps[currentStepIndex];
    const nextStepEl = steps[nextIndex];
    if (currentStepEl === nextStepEl) return;

    currentStepEl.classList.add(direction > 0 ? "is-exiting-forward" : "is-exiting-back");
    setTimeout(() => {
      currentStepEl.classList.remove("active", "is-exiting-forward", "is-exiting-back");
      currentStepIndex = nextIndex;
      nextStepEl.classList.add("active", direction > 0 ? "is-entering-forward" : "is-entering-back");
      updateUI();
      playAssistantMessage(currentStepIndex);
      scrollQuoteStepIntoView();
      setTimeout(() => {
        nextStepEl.classList.remove("is-entering-forward", "is-entering-back");
      }, 360);
    }, 240);
  }

  function updateUI() {
    if (isQuoteStudio) {
      steps.forEach((step, index) => {
        const isActive = index === currentStepIndex;
        step.classList.toggle("active", isActive);
        step.style.display = isActive ? "block" : "none";
        if (!isActive) {
          step.style.opacity = "";
          step.style.transform = "";
        }
      });
    } else {
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
    }

    updateStepChrome();
    updateNavState();

    const showBack = currentStepIndex > 0;
    if (btnBack) btnBack.style.display = showBack ? "inline-flex" : "none";

    if (currentStepIndex === steps.length - 1) {
      if (btnNext) btnNext.style.display = "none";
      if (btnSubmit) btnSubmit.style.display = "inline-flex";
      if (!(isQuoteStudio && table === "quote_requests")) {
        populateReview(true);
        if (isBooking) updatePaymentUI();
      }
    } else {
      if (btnNext) btnNext.style.display = "inline-flex";
      if (btnSubmit) btnSubmit.style.display = "none";
      if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
      if (reviewMsgTimer) clearInterval(reviewMsgTimer);
      reviewAnimationStep = -1;
      if (calculatingState) calculatingState.hidden = true;
      if (reviewReveal) {
        reviewReveal.hidden = true;
        reviewReveal.classList.remove("is-revealed");
      }
    }
  }

  if (!isQuoteStudio) {
    steps.forEach((step) => {
      step.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      if (!step.classList.contains("active")) {
        step.style.display = "none";
        step.style.opacity = "0";
        step.style.transform = "translateX(10px)";
      }
    });
  }

  if (isQuoteStudio && formStage) {
    formStage.classList.add("is-revealed");
  }
  if (isQuoteStudio && !isBooking) {
    root.classList.add("is-expanded");
    if (expandSection) {
      expandSection.style.maxHeight = "none";
      expandSection.style.opacity = "1";
      expandSection.style.pointerEvents = "auto";
    }
  } else if (isQuoteStudio && isBooking) {
    root.classList.add("is-compact");
    collapseExpandable();
  }

  updateUI();
  updateLiveSummary();
  initQuoteSizeChips(form);
  if (!isBooking || (typeof window.loadQuoteSession === "function" && window.loadQuoteSession())) {
    playAssistantMessage(currentStepIndex);
    initPhoneFormatting(form);
    if (isBooking) initBookDatePicker(form);
    if (isQuoteStudio) initServiceTooltips(root);
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (!isBooking && currentStepIndex === 0) {
        if (!validateSpaceStep()) return;
      } else if (!isBooking && currentStepIndex === 1) {
        if (!validateServiceStep()) return;
      } else if (!validateStep(steps[currentStepIndex])) {
        return;
      }

      if (currentStepIndex < steps.length - 1) {
        transitionToStep(currentStepIndex + 1, 1);
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentStepIndex > 0) {
        transitionToStep(currentStepIndex - 1, -1);
      }
    });
  }

  form.addEventListener("change", () => {
    updateLiveSummary();
    updateNavState();
    if (currentStepIndex === steps.length - 1) populateReview();
  });

  form.addEventListener("input", () => {
    updateLiveSummary();
    updateNavState();
    if (currentStepIndex === steps.length - 1) populateReview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateAllQuoteSteps()) return;

    const defaultSubmitLabel = isBooking
      ? (btnSubmit?.innerHTML || "Confirm booking")
      : `Submit quote & book <i data-lucide="arrow-right"></i>`;

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
        const expand = formContainer.querySelector(".quote-window-expand");
        if (expand) expand.style.display = "none";
        const progress = formContainer.querySelector(".quote-progress");
        if (progress) progress.style.display = "none";
        if (windowHead) windowHead.style.display = "none";

        const successState = formContainer.querySelector("#quoteSuccessState");
        if (successState) {
          const totalEl = successState.querySelector("[data-success-total]");
          if (totalEl) totalEl.textContent = formatMoney(pricing.total);
          showSuccessPanel(successState);
        }
      } else {
        const payOnline = payload.payment_method === "pay_online";
        const stripeLink = window.CLEANCO_CONFIG?.stripePaymentLink;

        if (typeof window.clearQuoteSession === "function") {
          window.clearQuoteSession();
        }

        form.style.display = "none";
        const expand = formContainer.querySelector(".quote-window-expand");
        if (expand) expand.style.display = "none";
        const progress = formContainer.querySelector(".quote-progress");
        if (progress) progress.style.display = "none";
        if (windowHead) windowHead.style.display = "none";
        const stepBanner = root.querySelector(".quote-step-banner");
        if (stepBanner) stepBanner.style.display = "none";
        const prefillBanner = document.getElementById("quotePrefillBanner");
        if (prefillBanner) prefillBanner.hidden = true;

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
          if (totalEl) totalEl.textContent = formatMoney(pricing.total || payload.estimated_total);
          showSuccessPanel(successState);
        }

        if (payOnline && stripeLink) {
          setTimeout(() => { window.open(stripeLink, "_blank", "noopener"); }, 600);
        }
      }

      if (assistantBubble) {
        const bubbleText = root.querySelector("#assistantBubbleText");
        const msg = isBooking
          ? "You're all set! We'll confirm your appointment soon."
          : "Great estimate! Continue to booking when you're ready.";
        if (bubbleText) bubbleText.textContent = msg;
        assistantBubble.classList.remove("is-typing");
      }
    } catch (err) {
      console.error("Submission error:", err);
      if (stateEl) {
        stateEl.className = "form-state error";
        stateEl.textContent = typeof window.mapSubmissionError === "function"
          ? window.mapSubmissionError(err)
          : `Could not submit: ${err.message}`;
      }
      showStudioToast(root, typeof window.mapSubmissionError === "function"
        ? window.mapSubmissionError(err)
        : `Could not submit: ${err.message}`, "error");
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
      hideSuccessPanel(successState);
      form.style.display = "";
      const progress = formContainer.querySelector(".quote-progress");
      if (progress) progress.style.display = "";
      if (windowHead) windowHead.style.display = "";
      updateUI();
      updateLiveSummary();
      playAssistantMessage(0);
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
  const root = formContainer.closest?.("#quoteAssistantCard, .quote-window") || formContainer;
  const bubbleText = root.querySelector("#assistantBubbleText");
  const bubble = root.querySelector("#assistantBubble");
  if (!bubbleText || !bubble) return;

  const quoteContext = !isBooking ? getQuoteContext() : null;
  const quoteMessages = [
    quoteContext?.intent === "book"
      ? "Let's confirm your price first — then you'll pick a date and pay."
      : "Pick your property type, then enter beds, baths, and square footage.",
    "Choose a cleaning type and how often.",
    "Optional add-ons — tap any that apply, or skip.",
    "Your contact details so we can send the estimate.",
    "Review your total and submit."
  ];
  const bookMessages = [
    "Your quote is saved. Where should we come, and when works best?",
    "Review your booking and choose how you'd like to pay."
  ];
  const messages = isBooking ? bookMessages : quoteMessages;
  bubbleText.textContent = messages[stepIndex] || messages[0];
}
