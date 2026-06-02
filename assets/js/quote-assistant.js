function getPricingConfig() {
  const cfg = window.CLEANCO_CONFIG?.pricing;
  if (cfg?.rates && cfg?.addOns) return cfg;
  return {
    minimumJob: 125,
    minSqft: 500,
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.28,
      "Move-in/Move-out": 0.32,
      "Office cleaning": 0.20,
      "Short-term rental & Airbnb turnover": 0.18
    },
    addOns: {
      "Wash and fold": 45,
      "Fold laundry only": 25,
      "Inside oven": 40,
      "Inside fridge": 40,
      "Cabinet interiors": 50,
      "Interior Windows Accessible (1-10)": 50,
      "Interior Windows Accessible (11-20)": 100,
      "Bedding refresh (strip and remake beds)": 15
    },
    frequencyDiscounts: {
      "Weekly": 0.20,
      "Bi-weekly": 0.15,
      "Monthly": 0.10,
      "One-time": 0.0
    }
  };
}

function minSqftForQuote() {
  const min = Number(getPricingConfig().minSqft);
  return Number.isFinite(min) && min > 0 ? min : 500;
}

function enforceMinimumJobTotal(amount, minimumJob) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const min = Number(minimumJob) || 125;
  const rounded = Math.round(n * 100) / 100;
  return rounded > 0 && rounded < min ? min : rounded;
}

function initQuoteSqftMin() {
  const sqftInput = document.querySelector("#quoteSqft");
  if (sqftInput) sqftInput.min = String(minSqftForQuote());
}

const ADDON_VALUE_ALIASES = {
  oven: "Inside oven",
  fridge: "Inside fridge",
  windows: "Interior Windows Accessible (1-10)",
  laundry: "Wash and fold",
  "wash and fold": "Wash and fold",
  "fold laundry only": "Fold laundry only",
  "inside cabinets": "Cabinet interiors",
  "cabinet interiors": "Cabinet interiors",
  "interior windows": "Interior Windows Accessible (1-10)",
  "interior windows accessible (1-10)": "Interior Windows Accessible (1-10)",
  "interior windows accessible (11-20)": "Interior Windows Accessible (11-20)",
  "inside oven": "Inside oven",
  "inside fridge": "Inside fridge",
  "bedding refresh (strip and remake beds)": "Bedding refresh (strip and remake beds)"
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
  "office-cleaning": "Office cleaning",
  "airbnb-turnover": "Short-term rental & Airbnb turnover"
};

const ADDON_SLUG_MAP = {
  "wash-and-fold": "Wash and fold",
  "fold-laundry-only": "Fold laundry only",
  "inside-oven": "Inside oven",
  "inside-fridge": "Inside fridge",
  "cabinet-interiors": "Cabinet interiors",
  "interior-windows-accessible-1-10": "Interior Windows Accessible (1-10)",
  "interior-windows-accessible-11-20": "Interior Windows Accessible (11-20)",
  "bedding-refresh": "Bedding refresh (strip and remake beds)"
};

const QUOTE_CONTEXT_KEY = "rs_cleaning_quote_context";

const PROPERTY_PARAM_MAP = {
  office: "Office",
  house: "House",
  home: "House",
  empty: "House",
  apartment: "Apartment"
};

const STEP_TRANSITION_EXIT_MS = 320;
const STEP_TRANSITION_ENTER_MS = 480;
const COACH_FADE_MS = 150;

function getServiceAreaMeta() {
  const key = window.SERVICE_AREA_META_KEY || "rs_service_area_meta";
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function resolveBookingServiceArea(session, pricing = {}, address = "") {
  const fromAddress = typeof window.resolveServiceAreaFromText === "function"
    ? window.resolveServiceAreaFromText(address)
    : null;
  if (fromAddress?.name) {
    return {
      areaName: fromAddress.name,
      travelFee: fromAddress.travelFee,
      matched: fromAddress.matched
    };
  }

  const sessionName = session ? String(session.service_area_name || "").trim() : "";
  if (sessionName) {
    return {
      areaName: sessionName,
      travelFee: Math.max(0, Number(session.travel_fee) || 0),
      matched: true
    };
  }

  const meta = getServiceAreaMeta();
  if (meta?.name) {
    return {
      areaName: String(meta.name).trim(),
      travelFee: Math.max(0, Number(meta.travelFee) || 0),
      matched: meta.tier !== "outside"
    };
  }

  const fallbackName = String(pricing.areaName || "").trim();
  if (fallbackName) {
    return {
      areaName: fallbackName,
      travelFee: Math.max(0, Number(pricing.travelFee) || 0),
      matched: true
    };
  }

  const outside = window.OUTSIDE_AREA_DEFAULT || {
    name: "Extended travel zone",
    travelFee: 35
  };
  return {
    areaName: outside.name,
    travelFee: Math.max(0, Number(outside.travelFee) || 35),
    matched: false
  };
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
    propertyType: "",
    addons: [],
    frequency: params.get("frequency") || "",
    startStep: parseInt(params.get("step") || "0", 10) || 0
  };

  const propertyParam = params.get("property") || "";
  if (propertyParam && PROPERTY_PARAM_MAP[propertyParam.toLowerCase()]) {
    context.propertyType = PROPERTY_PARAM_MAP[propertyParam.toLowerCase()];
  }

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

function mergeQuoteContext(urlContext, stored) {
  if (!stored) return urlContext;
  const merged = { ...stored, ...urlContext };
  merged.serviceType = urlContext.serviceType || stored.serviceType || "";
  merged.frequency = urlContext.frequency || stored.frequency || "";
  merged.propertyType = urlContext.propertyType || stored.propertyType || "";
  merged.intent = urlContext.intent || stored.intent || "";
  merged.serviceSlug = urlContext.serviceSlug || stored.serviceSlug || "";
  merged.startStep = urlContext.startStep || stored.startStep || 1;
  merged.addons = urlContext.addons?.length
    ? [...new Set([...(stored.addons || []), ...urlContext.addons])]
    : [...(stored.addons || [])];
  return merged;
}

function clearQuoteContextStorage() {
  try {
    sessionStorage.removeItem(QUOTE_CONTEXT_KEY);
  } catch {}
  window.__quoteContext = null;
}

function formatPrefillSummary(context) {
  if (!context) return "";
  const parts = [];
  if (context.serviceType) parts.push(context.serviceType);
  if (context.frequency) parts.push(context.frequency);
  if (context.propertyType) parts.push(context.propertyType);
  if (context.addons?.length) {
    const label = context.addons.length === 1
      ? context.addons[0]
      : `${context.addons[0]} +${context.addons.length - 1}`;
    parts.push(`Add-on: ${label}`);
  }
  const areaMeta = getServiceAreaMeta();
  if (areaMeta?.name) parts.push(areaMeta.name);
  return parts.length ? `From your answers: ${parts.join(" · ")}` : "";
}

function applyQuoteContextToForm(form, context) {
  if (!form || !context) return;

  if (context.serviceType) {
    setFormValue(form, "service_type", context.serviceType);
  }
  if (context.propertyType) {
    setFormValue(form, "property_type", context.propertyType);
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
  const stored = loadQuoteContext();
  const hasUrlContext = Boolean(
    urlContext.serviceType ||
    urlContext.addons.length ||
    urlContext.frequency ||
    urlContext.propertyType ||
    urlContext.intent ||
    urlContext.startStep
  );

  let context = null;
  if (hasUrlContext) {
    context = stored ? mergeQuoteContext(urlContext, stored) : urlContext;
    saveQuoteContext(context);
  } else if (stored) {
    context = stored;
  } else {
    window.__quoteContext = null;
    return;
  }

  applyQuoteContextToForm(form, context);
  window.__quoteContext = context;
}

function getQuoteContext() {
  return window.__quoteContext || loadQuoteContext() || null;
}

window.clearQuoteContext = clearQuoteContextStorage;

document.addEventListener("DOMContentLoaded", () => {
  initQuotePrefill();
  initQuoteContext();
  initQuoteSqftMin();
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

function getSizeInputMode(form) {
  return form.querySelector('input[name="size_input_mode"]:checked')?.value || "beds_baths";
}

function readSpaceMetrics(form, session = null) {
  const bedsRaw = String(form.querySelector("#quoteBedrooms")?.value ?? session?.bedrooms ?? "").trim();
  const bathsRaw = String(form.querySelector("#quoteBathrooms")?.value ?? session?.bathrooms ?? "").trim();
  const sqftRaw = String(form.querySelector("#quoteSqft")?.value ?? session?.square_feet ?? "").trim();
  return {
    bedsRaw,
    bathsRaw,
    sqftRaw,
    beds: bedsRaw === "" ? NaN : parseInt(bedsRaw, 10),
    baths: bathsRaw === "" ? NaN : parseInt(bathsRaw, 10),
    sqft: sqftRaw === "" ? NaN : parseInt(sqftRaw.replace(/,/g, ""), 10)
  };
}

function hasCompleteBedBathMetrics(form, session = null) {
  const { beds, baths } = readSpaceMetrics(form, session);
  return Number.isInteger(beds) && beds >= 0 && Number.isInteger(baths) && baths >= 1;
}

function hasCompleteSqftMetrics(form, session = null) {
  const { sqft } = readSpaceMetrics(form, session);
  return Number.isInteger(sqft) && sqft >= minSqftForQuote();
}

function hasValidSpaceMetrics(form, session = null) {
  const mode = session?.size_input_mode || getSizeInputMode(form);
  if (mode === "sqft") return hasCompleteSqftMetrics(form, session);
  return hasCompleteBedBathMetrics(form, session);
}

function inferSizeInputModeFromSession(session) {
  if (!session) return "beds_baths";
  const sqftRaw = String(session.square_feet || "").trim();
  const bedsRaw = String(session.bedrooms ?? "").trim();
  const bathsRaw = String(session.bathrooms ?? "").trim();
  const sqft = sqftRaw === "" ? NaN : parseInt(sqftRaw.replace(/,/g, ""), 10);
  const hasBedsBaths = bedsRaw !== "" && bathsRaw !== "";
  const minSqft = minSqftForQuote();
  if (Number.isInteger(sqft) && sqft >= minSqft && !hasBedsBaths) return "sqft";
  if (hasBedsBaths) return "beds_baths";
  if (Number.isInteger(sqft) && sqft >= minSqft) return "sqft";
  return "beds_baths";
}

function isAirbnbTurnoverService(serviceType) {
  const normalized = normalizeServiceType(serviceType);
  const externalHelper = window.isAirbnbTurnoverService;
  if (typeof externalHelper === "function" && externalHelper !== isAirbnbTurnoverService) {
    return externalHelper(normalized);
  }
  return normalized === "Short-term rental & Airbnb turnover";
}

function syncQuoteServicePricingUi(form) {
  const serviceType = normalizeServiceType(
    form.querySelector('input[name="service_type"]:checked')?.value || ""
  );
  const isAirbnb = isAirbnbTurnoverService(serviceType);
  const hint = form.querySelector("[data-quote-size-hint]");
  const airbnbNote = form.querySelector("[data-quote-airbnb-pricing-note]");
  const freqFieldset = form.querySelector("[data-quote-frequency-fieldset]");

  if (airbnbNote) {
    airbnbNote.hidden = !isAirbnb;
  }

  if (hint && isAirbnb) {
    const mode = getSizeInputMode(form);
    hint.textContent =
      mode === "sqft"
        ? "Unusually large rental? Enter square footage—we'll price at $0.18/sq ft."
        : "Turnovers use a flat rate by bedroom count. Switch to square footage only for larger properties.";
  } else if (hint) {
    const minSqft = minSqftForQuote();
    const mode = getSizeInputMode(form);
    hint.textContent =
      mode === "sqft"
        ? `Enter your square footage (at least ${minSqft}). We'll use that for your estimate.`
        : "Enter bedrooms and bathrooms—we'll estimate square footage for your quote.";
  }

  if (freqFieldset) {
    freqFieldset.classList.toggle("quote-frequency--airbnb", isAirbnb);
    const oneTime = freqFieldset.querySelector('input[name="frequency"][value="One-time"]');
    if (isAirbnb && oneTime) {
      oneTime.checked = true;
      freqFieldset.querySelectorAll('input[name="frequency"]').forEach((input) => {
        if (input !== oneTime) {
          input.checked = false;
          input.disabled = true;
        }
      });
    } else {
      freqFieldset.querySelectorAll('input[name="frequency"]').forEach((input) => {
        input.disabled = false;
      });
    }
  }
}

function applySizeInputMode(form, mode, { clearInactive = false } = {}) {
  const metrics = form.querySelector("#quoteSizeMetrics");
  const bedsGroup = form.querySelector('[data-size-group="beds_baths"]');
  const sqftGroup = form.querySelector('[data-size-group="sqft"]');
  const bedsInput = form.querySelector("#quoteBedrooms");
  const bathsInput = form.querySelector("#quoteBathrooms");
  const sqftInput = form.querySelector("#quoteSqft");
  const hint = form.querySelector("[data-quote-size-hint]");
  const modeInput = form.querySelector(`input[name="size_input_mode"][value="${mode}"]`);

  if (modeInput) modeInput.checked = true;

  const isSqft = mode === "sqft";
  if (metrics) {
    metrics.classList.toggle("is-sqft-only", isSqft);
    metrics.classList.toggle("is-beds-baths-only", !isSqft);
  }
  if (bedsGroup) bedsGroup.hidden = isSqft;
  if (sqftGroup) sqftGroup.hidden = !isSqft;

  if (clearInactive) {
    if (isSqft) {
      if (bedsInput) bedsInput.value = "";
      if (bathsInput) bathsInput.value = "";
    } else if (sqftInput) {
      sqftInput.value = "";
    }
  }

  if (bedsInput) bedsInput.disabled = isSqft;
  if (bathsInput) bathsInput.disabled = isSqft;
  if (sqftInput) sqftInput.disabled = !isSqft;

  // #region agent log
  fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1571d'},body:JSON.stringify({sessionId:'d1571d',runId:'run1',hypothesisId:'H3,H4',location:'quote-assistant.js:applySizeInputMode',message:'size mode applied',data:{mode,isSqft,bedsHidden:!!bedsGroup?.hidden,sqftHidden:!!sqftGroup?.hidden,bedsDisabled:!!bedsInput?.disabled,bathsDisabled:!!bathsInput?.disabled,sqftDisabled:!!sqftInput?.disabled},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (hint) {
    const minSqft = minSqftForQuote();
    hint.textContent = isSqft
      ? `Enter your square footage (at least ${minSqft}). We'll use that for your estimate.`
      : "Enter bedrooms and bathrooms—we'll estimate square footage for your quote.";
  }

  syncQuoteServicePricingUi(form);
}

/** @deprecated Use hasValidSpaceMetrics */
function hasExplicitSpaceMetrics(form, session = null) {
  return hasValidSpaceMetrics(form, session);
}

function hasPartialSpaceMetrics(form) {
  const bedsRaw = String(form.querySelector("#quoteBedrooms")?.value ?? "").trim();
  const bathsRaw = String(form.querySelector("#quoteBathrooms")?.value ?? "").trim();
  const sqftRaw = String(form.querySelector("#quoteSqft")?.value ?? "").trim();
  return Boolean(bedsRaw || bathsRaw || sqftRaw);
}

function calculateQuoteTotal(form, { allowEstimate = false } = {}) {
  const data = new FormData(form);
  const table = form.getAttribute("data-table");
  const session = table === "bookings" && typeof window.loadQuoteSession === "function"
    ? window.loadQuoteSession()
    : null;

  const serviceType = normalizeServiceType(data.get("service_type") || session?.service_type);
  const sizeMode = session?.size_input_mode || getSizeInputMode(form);
  const bedsVal = data.get("bedrooms") || session?.bedrooms;
  const bathsVal = data.get("bathrooms") || session?.bathrooms;
  const rawSqft = data.get("square_feet") || session?.square_feet;
  const parsedSqft = parseInt(String(rawSqft || "").replace(/,/g, ""), 10);
  const beds = bedsVal === "" || bedsVal == null ? NaN : parseInt(String(bedsVal), 10);
  const baths = bathsVal === "" || bathsVal == null ? NaN : parseInt(String(bathsVal), 10);
  let sqft = 0;

  if (sizeMode === "sqft") {
    if (parsedSqft > 0) sqft = parsedSqft;
  } else if (Number.isInteger(beds) && beds >= 0 && Number.isInteger(baths) && baths >= 1) {
    sqft = parseSqft("", beds, baths);
  } else if (allowEstimate && hasPartialSpaceMetrics(form)) {
    sqft = parseSqft("", bedsVal, bathsVal);
  } else if (parsedSqft > 0) {
    sqft = parsedSqft;
  }
  if (sqft <= 0 && session?.square_feet && table === "bookings") {
    sqft = parseInt(String(session.square_feet), 10) || 0;
  }
  const freq = data.get("frequency") || session?.frequency || "One-time";
  let addons = data.getAll("add_ons[]");
  if (!addons.length && session?.add_ons) {
    addons = String(session.add_ons).split(",").map((v) => v.trim()).filter(Boolean);
  }

  const pricingConfig = getPricingConfig();
  const minimumJob = pricingConfig.minimumJob ?? 125;
  let basePrice = 0;
  let pricingMethod = "sqft";
  let airbnbTierLabel = "";
  let airbnbRangeLabel = "";

  if (isAirbnbTurnoverService(serviceType)) {
    if (typeof window.computeAirbnbBasePrice === "function") {
      const airbnb = window.computeAirbnbBasePrice({
        serviceType,
        sizeMode,
        bedrooms: beds,
        bathrooms: baths,
        sqft
      });
      basePrice = airbnb.basePrice;
      pricingMethod = airbnb.pricingMethod;
      airbnbTierLabel = airbnb.tierLabel || "";
      airbnbRangeLabel = airbnb.rangeLabel || "";
      if (pricingMethod === "none") {
        return {
          total: 0,
          sqft,
          serviceType,
          freq,
          addons,
          pricingMethod
        };
      }
    }
  } else if (!serviceType || !pricingConfig.rates[serviceType] || sqft <= 0) {
    return { total: 0, sqft, serviceType, freq, addons };
  } else {
    basePrice = sqft * pricingConfig.rates[serviceType];
    if (basePrice > 0 && basePrice < minimumJob) basePrice = minimumJob;
  }

  if (isAirbnbTurnoverService(serviceType) && basePrice > 0 && basePrice < minimumJob) {
    basePrice = minimumJob;
  }

  let addonsPrice = 0;
  addons.forEach((addon) => {
    const key = normalizeAddonValue(addon);
    if (pricingConfig.addOns[key]) addonsPrice += pricingConfig.addOns[key];
  });

  let subtotal = basePrice + addonsPrice;
  const skipFreqDiscount =
    isAirbnbTurnoverService(serviceType) &&
    (window.getAirbnbTurnoverConfig?.()?.skipFrequencyDiscount !== false);
  const discount = skipFreqDiscount ? 0 : pricingConfig.frequencyDiscounts[freq] || 0;
  subtotal -= subtotal * discount;

  const bookingAddress = table === "bookings"
    ? String(data.get("address") || "").trim()
    : "";
  const { areaName, travelFee } = resolveBookingServiceArea(session, {
    areaName: getServiceAreaMeta()?.name || "",
    travelFee: getServiceAreaMeta()?.travelFee
  }, bookingAddress);
  subtotal += travelFee;

  const preFloorTotal = Math.round(subtotal * 100) / 100;
  const total = enforceMinimumJobTotal(preFloorTotal, minimumJob);

  return {
    total,
    sqft,
    serviceType,
    freq,
    addons,
    basePrice,
    addonsPrice,
    discount,
    travelFee,
    areaName,
    pricingMethod,
    airbnbTierLabel,
    airbnbRangeLabel
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

function showStudioToast(_root, message, type = "error") {
  if (typeof window.showAppToast === "function") {
    window.showAppToast(message, type);
  }
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

function ensureBookingHiddenField(form, name) {
  if (form.querySelector(`[name="${name}"]`)) return;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  form.appendChild(input);
}

function ensureBookingContactFields(form, session) {
  if (!session) return;
  [
    "full_name", "email", "phone", "service_type", "property_type",
    "bedrooms", "bathrooms", "square_feet", "frequency", "add_ons"
  ].forEach((name) => ensureBookingHiddenField(form, name));
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

  const area = resolveBookingServiceArea(session);
  if (area.areaName && !String(session.service_area_name || "").trim()) {
    session.service_area_name = area.areaName;
    session.travel_fee = area.travelFee;
    if (typeof window.saveQuoteSession === "function") {
      window.saveQuoteSession(session);
    }
  }

  if (noQuoteGate) noQuoteGate.hidden = true;
  if (bookFormWrap) bookFormWrap.hidden = false;

  ensureBookingContactFields(form, session);

  if (form.querySelector('input[name="size_input_mode"]')) {
    applySizeInputMode(form, inferSizeInputModeFromSession(session));
  }

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
        "bedrooms", "bathrooms", "square_feet", "frequency", "add_ons",
        "estimated_total", "service_area_name", "travel_fee"
      ].forEach((key) => {
        if ((!payload[key] || payload[key] === "") && session[key] != null && session[key] !== "") {
          payload[key] = session[key];
        }
      });
      if (session.quote_id) payload.quote_id = session.quote_id;
    }
  }

  payload.service_type = normalizeServiceType(payload.service_type);
  delete payload.size_input_mode;

  if (table !== "bookings") {
    const sizeMode = getSizeInputMode(form);
    if (sizeMode === "sqft") {
      payload.square_feet = String(form.querySelector("#quoteSqft")?.value || "").trim();
      payload.bedrooms = "";
      payload.bathrooms = "";
    } else {
      const { beds, baths, bedsRaw, bathsRaw } = readSpaceMetrics(form);
      payload.bedrooms = bedsRaw;
      payload.bathrooms = bathsRaw;
      payload.square_feet = String(parseSqft("", beds, baths));
    }
  }
  payload.consent = Boolean(form.querySelector("[name='consent']")?.checked);

  if (table === "bookings") {
    payload.payment_method = data.get("payment_method") || "pay_at_service";
    if (payload.payment_method !== "pay_online") {
      payload.payment_method = "pay_at_service";
    }

    const quoteSession =
      typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    const bookingAddress = String(payload.address || data.get("address") || "").trim();

    const bookingArea = resolveBookingServiceArea(quoteSession, pricing, bookingAddress);
    if (quoteSession) {
      payload.pricing_locked = Boolean(
        quoteSession.quote_id || Number(quoteSession.estimated_total) > 0
      );
    }
    if (quoteSession?.quote_id) {
      const sessionTotal = Number(quoteSession.estimated_total);
      const recalcTotal = Number(pricing.total) || 0;
      payload.estimated_total =
        Number.isFinite(sessionTotal) && sessionTotal > 0
          ? Math.max(sessionTotal, recalcTotal)
          : recalcTotal;
      payload.service_area_name = bookingArea.areaName;
      payload.travel_fee = bookingArea.travelFee;
      if (quoteSession.square_feet != null && quoteSession.square_feet !== "") {
        payload.square_feet = String(quoteSession.square_feet);
      }
      if (quoteSession.size_input_mode === "sqft") {
        payload.bedrooms = quoteSession.bedrooms ?? "";
        payload.bathrooms = quoteSession.bathrooms ?? "";
      }
    } else {
      payload.estimated_total = pricing.total || payload.estimated_total || 0;
      payload.service_area_name = bookingArea.areaName;
      payload.travel_fee = bookingArea.travelFee;
    }
  } else {
    payload.estimated_total = pricing.total || payload.estimated_total || 0;
  }

  return { payload, pricing };
}


function hasBedBathEntries(form) {
  const { bedsRaw, bathsRaw } = readSpaceMetrics(form);
  return bedsRaw !== "" || bathsRaw !== "";
}

function hasSqftEntries(form) {
  const { sqftRaw } = readSpaceMetrics(form);
  return sqftRaw !== "";
}

function getSizeSwitchConfirmCopy(targetMode) {
  if (targetMode === "sqft") {
    return {
      text: "Switch to square footage? Your beds & baths will be cleared.",
      cancel: "Keep beds & baths",
      ok: "Switch to sq ft"
    };
  }
  return {
    text: "Switch to beds & baths? Your square footage will be cleared.",
    cancel: "Keep square footage",
    ok: "Switch to beds & baths"
  };
}

function initQuoteSizeMode(form, { onUpdate } = {}) {
  if (!form.querySelector(".quote-size-metrics")) return;

  const confirmEl = form.querySelector("[data-size-switch-confirm]");
  const confirmText = form.querySelector("[data-size-switch-confirm-text]");
  const confirmCancel = form.querySelector("[data-size-switch-cancel]");
  const confirmOk = form.querySelector("[data-size-switch-ok]");
  let pendingConfirmCallback = null;
  let committedMode = getSizeInputMode(form);

  const triggerUpdate = () => {
    if (typeof onUpdate === "function") onUpdate();
  };

  const revertModeRadio = (mode) => {
    const input = form.querySelector(`input[name="size_input_mode"][value="${mode}"]`);
    if (input) input.checked = true;
  };

  const hideConfirm = () => {
    pendingConfirmCallback = null;
    if (confirmEl) confirmEl.hidden = true;
  };

  const showConfirm = (targetMode) => {
    const copy = getSizeSwitchConfirmCopy(targetMode);
    if (confirmText) confirmText.textContent = copy.text;
    if (confirmCancel) confirmCancel.textContent = copy.cancel;
    if (confirmOk) confirmOk.textContent = copy.ok;
    if (confirmEl) confirmEl.hidden = false;
  };

  const setMode = (mode, { clearInactive = false } = {}) => {
    applySizeInputMode(form, mode, { clearInactive });
    committedMode = mode;
    hideConfirm();
    triggerUpdate();
  };

  const requestModeSwitch = (targetMode) => {
    if (targetMode === committedMode) return;

    const wouldDiscard =
      targetMode === "sqft" ? hasBedBathEntries(form) : hasSqftEntries(form);

    // #region agent log
    fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1571d'},body:JSON.stringify({sessionId:'d1571d',runId:'run1',hypothesisId:'H2,H3',location:'quote-assistant.js:requestModeSwitch',message:'size switch requested',data:{targetMode,committedMode,wouldDiscard,hasBedBath:hasBedBathEntries(form),hasSqft:hasSqftEntries(form)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!wouldDiscard) {
      setMode(targetMode, { clearInactive: true });
      return;
    }

    pendingConfirmCallback = () => setMode(targetMode, { clearInactive: true });
    applySizeInputMode(form, targetMode, { clearInactive: false });
    const modeInput = form.querySelector(`input[name="size_input_mode"][value="${targetMode}"]`);
    if (modeInput) modeInput.checked = true;
    showConfirm(targetMode);
    triggerUpdate();
  };

  if (confirmOk) {
    confirmOk.addEventListener("click", () => {
      const confirm = pendingConfirmCallback;
      hideConfirm();
      if (typeof confirm === "function") confirm();
    });
  }

  if (confirmCancel) {
    confirmCancel.addEventListener("click", () => {
      pendingConfirmCallback = null;
      hideConfirm();
      applySizeInputMode(form, committedMode, { clearInactive: false });
      revertModeRadio(committedMode);
      triggerUpdate();
    });
  }

  form.querySelectorAll('input[name="size_input_mode"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      requestModeSwitch(input.value);
    });
  });

  form.querySelectorAll('input[name="property_type"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      if (input.value === "Office") {
        requestModeSwitch("sqft");
      } else {
        triggerUpdate();
      }
    });
  });

  const officeSelected = form.querySelector('input[name="property_type"][value="Office"]:checked');
  const initialMode = officeSelected ? "sqft" : committedMode;
  applySizeInputMode(form, initialMode);
  committedMode = initialMode;
  triggerUpdate();
}

const CALC_DELAY_MS_MIN = 900;
const CALC_DELAY_MS_MAX = 1600;
const CALC_DELAY_MS_REDUCED = 800;

function randomInRange(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const liveEstimate = formContainer.querySelector("#liveEstimate");

  const reviewProperty = formContainer.querySelector("#reviewProperty");
  const reviewService = formContainer.querySelector("#reviewService");
  const reviewFrequency = formContainer.querySelector("#reviewFrequency");
  const reviewSize = formContainer.querySelector("#reviewSize");
  const reviewAddons = formContainer.querySelector("#reviewAddons");
  const reviewContact = formContainer.querySelector("#reviewContact");
  const reviewMethod = formContainer.querySelector("#reviewMethod");
  const reviewSchedule = formContainer.querySelector("#reviewSchedule");
  const root = form.closest("#quoteAssistantCard, #bookAssistantCard, .quote-window") || formContainer;
  const liveTotalDisplay = root.querySelector("#liveCalculatedTotal");
  const totalPanel = root.querySelector(".quote-console-total-panel");
  const assistantBubble = root.querySelector("#assistantBubble");
  const windowTitle = root.querySelector("#quoteWindowTitle");
  const isQuoteStudio = root.classList.contains("quote-window");
  const isQuoteConsole = isQuoteStudio && !isBooking && root.classList.contains("quote-console");
  const formStage = root.querySelector(".quote-form-stage");
  const expandSection = root.querySelector(".quote-window-expand");
  const windowHead = root.querySelector(".quote-window-head");
  const calculatingState = root.querySelector("#quoteCalculatingState");
  const reviewReveal = root.querySelector("#quoteReviewReveal");
  const finalQuoteStep = !isBooking ? root.querySelector('.quote-step[data-step="4"]') : null;
  const contactEntry = root.querySelector("#quoteContactEntry");
  const editContactBtn = root.querySelector("#quoteEditContactBtn");
  const btnGetEstimate = root.querySelector("#btnGetEstimate");
  const consentInput = root.querySelector('input[name="consent"]');
  const stepDots = root.querySelector("#quoteStepDots");
  const consoleProgress = root.querySelector("#quoteConsoleProgress");
  const prefillChip = root.querySelector("#quotePrefillChip");
  const stepScrollAnchor = isQuoteConsole
    ? root
    : (root.querySelector(".quote-window-head")
      || root.querySelector(".quote-app-main")
      || root.querySelector(".quote-window-body")
      || formStage
      || root);
  let typewriterTimer = null;
  let reviewRevealTimer = null;
  let reviewMsgTimer = null;
  let reviewAnimationStep = -1;
  let coachInitialPaint = true;
  let isStepTransitioning = false;
  let currentStepIndex = 0;
  let quoteDraft = null;

  const quoteContext = !isBooking ? getQuoteContext() : null;
  const quoteMessages = [
    quoteContext?.intent === "book"
      ? "Let's confirm your price first — then you'll pick a date and pay."
      : "Pick your property type, then enter beds & baths or square footage.",
    "Choose a cleaning type and how often.",
    "Optional add-ons — tap any that apply, or skip.",
    "Share your contact details, review, and submit."
  ];
  const bookMessages = [
    "Your quote is saved. Where should we come, and when works best?",
    "Review your booking and choose how you'd like to pay."
  ];
  const quoteSubmitIdleLabel = !isBooking ? (btnSubmit?.innerHTML || "Submit & book") : "";

  function setQuoteSubmitPreparing(isPreparing) {
    if (isBooking || !btnSubmit) return;
    btnSubmit.disabled = isPreparing;
    btnSubmit.setAttribute("aria-disabled", isPreparing ? "true" : "false");
    btnSubmit.setAttribute("aria-busy", isPreparing ? "true" : "false");
    btnSubmit.innerHTML = isPreparing
      ? `Preparing estimate... <i data-lucide="loader-circle"></i>`
      : quoteSubmitIdleLabel;
    if (typeof lucide !== "undefined") lucide.createIcons({ root: btnSubmit.parentElement });
  }

  function getQuoteHeaderOffset() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
  }

  function scrollElementToQuoteTop(element, { behavior = "smooth", extraOffset = 8 } = {}) {
    if (!element) return;
    const headerHeight = getQuoteHeaderOffset();
    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const targetTop = Math.max(0, rect.top + window.scrollY - headerHeight - extraOffset);
      if (Math.abs(window.scrollY - targetTop) > 2) {
        window.scrollTo({ top: targetTop, behavior });
      }
    });
  }

  function scrollQuoteStepIntoView({ behavior = "smooth" } = {}) {
    if (!isQuoteStudio) return;
    const activeStep = steps[currentStepIndex];
    let anchor = stepScrollAnchor;
    if (isBooking) {
      anchor =
        root.querySelector(".quote-step-banner")
        || activeStep?.querySelector(".quote-review-card, .book-schedule-block")
        || stepScrollAnchor;
    }
    scrollElementToQuoteTop(anchor, { behavior, extraOffset: isBooking ? 12 : 8 });
  }

  const stepKicker = root.querySelector("#quoteProgressText");
  const stepHeading = root.querySelector("#quoteStepHeading");
  const bookProgressFill = root.querySelector("#quoteProgressFill");
  const navHint = form.querySelector("[data-nav-hint]");
  const checkoutLoading = formContainer.querySelector("#quoteCheckoutLoading");

  function setNavHint(message) {
    if (!navHint) return;
    if (message) {
      navHint.textContent = message;
      navHint.hidden = false;
      navHint.classList.add("is-visible");
    } else {
      navHint.hidden = true;
      navHint.classList.remove("is-visible");
      navHint.textContent = "";
    }
  }

  function updateBookStepBanner() {
    if (!isBooking) return;
    const stepEl = steps[currentStepIndex];
    const title = stepEl?.dataset?.stepTitle || `Step ${currentStepIndex + 1}`;
    if (stepKicker) stepKicker.textContent = `Step ${currentStepIndex + 1} of ${steps.length}`;
    if (stepHeading && stepHeading.textContent !== title) {
      stepHeading.classList.remove("is-changing");
      void stepHeading.offsetWidth;
      stepHeading.textContent = title;
      stepHeading.classList.add("is-changing");
    }
    if (bookProgressFill) {
      bookProgressFill.style.width = `${((currentStepIndex + 1) / steps.length) * 100}%`;
    }
    if (stepDots) {
      stepDots.querySelectorAll(".quote-step-dot").forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentStepIndex);
        dot.classList.toggle("is-done", index < currentStepIndex);
      });
    }
  }

  function hideFormChrome() {
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
  }

  function showCheckoutLoadingPanel() {
    hideFormChrome();
    const successState = formContainer.querySelector("#quoteSuccessState");
    if (successState) successState.hidden = true;
    if (checkoutLoading) {
      checkoutLoading.hidden = false;
      if (typeof lucide !== "undefined") lucide.createIcons({ root: checkoutLoading });
    }
  }

  function scrollQuoteEstimateIntoView({ behavior = "smooth" } = {}) {
    if (!isQuoteStudio || isBooking || !reviewReveal || reviewReveal.hidden) return;
    const estimateTarget = reviewReveal.querySelector(".quote-estimate-hero, .quote-review-total") || reviewReveal;
    scrollElementToQuoteTop(estimateTarget, { behavior, extraOffset: 12 });
  }

  function setFinalReviewFocus(enabled) {
    if (!finalQuoteStep || !isQuoteConsole) return;
    const focusOn = Boolean(enabled);
    finalQuoteStep.classList.toggle("is-review-focus", focusOn);
    if (contactEntry) contactEntry.setAttribute("aria-hidden", focusOn ? "true" : "false");
  }

  function isFinalContactInfoComplete() {
    if (!finalQuoteStep) return true;
    const name = String(form.querySelector('input[name="full_name"]')?.value || "").trim();
    const phoneDigits = String(form.querySelector('input[name="phone"]')?.value || "").replace(/\D/g, "");
    const email = String(form.querySelector('input[name="email"]')?.value || "").trim();
    const preferred = form.querySelector('input[name="preferred_contact"]:checked');
    return Boolean(name && phoneDigits.length >= 10 && validateEmailAddress(email) && preferred);
  }

  function isFinalConsentGiven() {
    return Boolean(consentInput?.checked);
  }

  function isFinalReadyForEstimate() {
    return isFinalContactInfoComplete() && isFinalConsentGiven();
  }

  function canShowQuoteEstimateTotal() {
    return !isQuoteConsole || Boolean(quoteDraft?.captured);
  }

  function hideQuoteEstimateDisplay() {
    if (!isQuoteConsole) return;
    if (liveTotalDisplay) liveTotalDisplay.textContent = "—";
    if (totalPanel) totalPanel.classList.remove("is-calculating");
    const travelNote = root.querySelector("#reviewTravelNote");
    if (travelNote) {
      travelNote.hidden = true;
      travelNote.textContent = "";
    }
    if (liveEstimate && currentStepIndex === steps.length - 1) {
      liveEstimate.textContent = isFinalReadyForEstimate()
        ? "Tap Get my estimate to reveal your total"
        : "Consent & contact details required";
    }
  }

  function setSubmitEnabledForFinalStep(enabled) {
    if (!btnSubmit || isBooking || !isQuoteConsole) return;
    btnSubmit.disabled = !enabled;
    btnSubmit.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function setGetEstimateEnabled(enabled) {
    if (!btnGetEstimate || isBooking || !isQuoteConsole) return;
    btnGetEstimate.disabled = !enabled;
    btnGetEstimate.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  function invalidateQuoteDraft() {
    quoteDraft = null;
    setSubmitEnabledForFinalStep(false);
    if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
    if (reviewMsgTimer) clearInterval(reviewMsgTimer);
    reviewAnimationStep = -1;
    if (calculatingState) calculatingState.hidden = true;
    if (reviewReveal) {
      reviewReveal.hidden = true;
      reviewReveal.classList.remove("is-revealed");
    }
    setFinalReviewFocus(false);
    hideQuoteEstimateDisplay();
  }

  async function maybeStartFinalReview() {
    if (!isQuoteConsole || currentStepIndex !== steps.length - 1) return;
    if (!isFinalContactInfoComplete()) {
      if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
      if (reviewMsgTimer) clearInterval(reviewMsgTimer);
      if (calculatingState) calculatingState.hidden = true;
      if (reviewReveal) {
        reviewReveal.hidden = true;
        reviewReveal.classList.remove("is-revealed");
      }
      reviewAnimationStep = -1;
      setFinalReviewFocus(false);
      setQuoteSubmitPreparing(false);
      setSubmitEnabledForFinalStep(false);
      hideQuoteEstimateDisplay();
      showStudioToast(root, "Complete your name, phone, email, and contact preference first.", "error");
      const firstMissing = !String(form.querySelector('input[name="full_name"]')?.value || "").trim()
        ? form.querySelector('input[name="full_name"]')
        : String(form.querySelector('input[name="phone"]')?.value || "").replace(/\D/g, "").length < 10
          ? form.querySelector('input[name="phone"]')
          : !validateEmailAddress(form.querySelector('input[name="email"]')?.value)
            ? form.querySelector('input[name="email"]')
            : form.querySelector('input[name="preferred_contact"]');
      if (typeof window.markFieldInvalid === "function") window.markFieldInvalid(firstMissing);
      if (typeof window.scrollFieldIntoView === "function") window.scrollFieldIntoView(firstMissing);
      return;
    }
    if (!isFinalConsentGiven()) {
      showStudioToast(root, "Please agree to be contacted before getting your estimate.", "error");
      consentInput?.focus?.({ preventScroll: true });
      return;
    }
    if (btnGetEstimate) {
      btnGetEstimate.disabled = true;
      btnGetEstimate.setAttribute("aria-busy", "true");
      btnGetEstimate.innerHTML = `Preparing estimate... <i data-lucide="loader-circle"></i>`;
      if (typeof lucide !== "undefined") lucide.createIcons({ root: btnGetEstimate.parentElement });
    }
    try {
      const { pricing } = buildSubmissionPayload(form, table);
      // Estimate stays local until final submit. Database insert happens only after consent + submit.
      quoteDraft = { captured: true, pricing };
    } catch (err) {
      console.error("Estimate capture failed:", err);
      showStudioToast(root, mapSubmissionError(err), "error");
      invalidateQuoteDraft();
      return;
    } finally {
      if (btnGetEstimate) {
        btnGetEstimate.removeAttribute("aria-busy");
        btnGetEstimate.innerHTML = `Get my estimate <i data-lucide="sparkles"></i>`;
        if (typeof lucide !== "undefined") lucide.createIcons({ root: btnGetEstimate.parentElement });
      }
    }
    showCalculatingReview();
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
    const shouldAutoScroll = instant || (coachInitialPaint && isQuoteStudio && !isBooking);
    const scrollBehavior = shouldAutoScroll ? "auto" : "smooth";

    if (typewriterTimer) clearInterval(typewriterTimer);

    const finishCoach = () => {
      bubbleText.textContent = text;
      bubble.classList.remove("is-typing", "is-fading");
      setStepContentVisible(true);
      remeasureExpandable();
      scrollQuoteStepIntoView({ behavior: scrollBehavior });
    };

    if (instant || (coachInitialPaint && isQuoteStudio && !isBooking)) {
      coachInitialPaint = false;
      finishCoach();
      return;
    }

    if (isQuoteStudio && !isBooking) {
      bubble.classList.add("is-fading");
      setTimeout(finishCoach, COACH_FADE_MS);
      return;
    }

    if (isBooking && !instant) {
      bubble.classList.add("is-fading");
      setTimeout(finishCoach, COACH_FADE_MS);
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
            scrollQuoteStepIntoView({ behavior: scrollBehavior });
          }, 280);
        }
      }
    }, 26);
  }

  function getCoachMessage(stepIndex) {
    if (isBooking) return bookMessages[stepIndex] || bookMessages[0];
    return quoteMessages[stepIndex] || quoteMessages[0];
  }

  function validateSpaceStep(silent = false) {
    const propertyType = form.querySelector('input[name="property_type"]:checked');
    if (!propertyType) {
      if (!silent) {
        showStudioToast(root, "Please select a property type.", "error");
        setNavHint("Please select a property type.");
        if (typeof window.scrollFieldIntoView === "function") {
          window.scrollFieldIntoView(form.querySelector('input[name="property_type"]'));
        }
      }
      return false;
    }
    return validateSizeChunk(silent);
  }

  function validateServiceStep(silent = false) {
    const serviceType = form.querySelector('input[name="service_type"]:checked');
    const frequency = form.querySelector('input[name="frequency"]:checked');
    if (!serviceType) {
      if (!silent) {
        showStudioToast(root, "Please select a cleaning type.", "error");
        setNavHint("Please select a cleaning type.");
        if (typeof window.scrollFieldIntoView === "function") {
          window.scrollFieldIntoView(form.querySelector('input[name="service_type"]'));
        }
      }
      return false;
    }
    if (!frequency) {
      if (!silent) {
        showStudioToast(root, "Please select a frequency.", "error");
        setNavHint("Please select a frequency.");
        if (typeof window.scrollFieldIntoView === "function") {
          window.scrollFieldIntoView(form.querySelector('input[name="frequency"]'));
        }
      }
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
    const mode = getSizeInputMode(form);
    const { beds, baths, sqft } = readSpaceMetrics(form);
  // #region agent log
  fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H1,H2,H5',location:'quote-assistant.js:validateSizeChunk:entry',message:'size validation entry',data:{mode,beds,baths,sqft,silent},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

    if (mode === "sqft") {
      const minSqft = minSqftForQuote();
      if (!Number.isInteger(sqft) || sqft < minSqft) {
        if (!silent) {
          showStudioToast(root, `Enter your square footage (at least ${minSqft}).`, "error");
          form.querySelector("#quoteSqft")?.focus?.({ preventScroll: true });
        }
        return false;
      }
      return true;
    }

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
    return true;
  }

  function isSpaceStepComplete() {
    return validateSpaceStep(true);
  }

  function isServiceStepComplete() {
    return validateServiceStep(true);
  }

  function getFirstIncompleteStepIndex() {
    if (!isSpaceStepComplete()) return 0;
    if (!isServiceStepComplete()) return 1;
    return -1;
  }

  function resolveQuoteStartStep(context) {
    const requested = Math.max(0, Math.min(steps.length - 1, (context?.startStep || 1) - 1));
    const firstIncomplete = getFirstIncompleteStepIndex();
    if (firstIncomplete === -1) return requested;
    return Math.min(requested, firstIncomplete);
  }

  function goToFirstIncompleteStep(message) {
    const incomplete = getFirstIncompleteStepIndex();
    if (incomplete < 0 || incomplete >= currentStepIndex) return false;
    if (message) showStudioToast(root, message, "error");
    transitionToStep(incomplete, -1);
    return true;
  }

  if (!isBooking) {
    currentStepIndex = resolveQuoteStartStep(quoteContext);
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === currentStepIndex);
    });
  }

  function updatePrefillChip() {
    if (!prefillChip || isBooking) return;
    const summary = formatPrefillSummary(getQuoteContext());
    const showOnEarlySteps = currentStepIndex <= 1;
    if (summary && showOnEarlySteps) {
      prefillChip.textContent = summary;
      prefillChip.hidden = false;
    } else {
      prefillChip.hidden = true;
    }
  }

  function updateNavState() {
    if (!btnNext || currentStepIndex === steps.length - 1) return;

    btnNext.classList.remove("is-hidden");
    btnNext.style.display = "inline-flex";

    let valid = true;
    if (currentStepIndex === 2) {
      valid = true;
    } else if (!isBooking && currentStepIndex === 0) {
      valid = validateSpaceStep(true);
    } else if (!isBooking && currentStepIndex === 1) {
      valid = validateServiceStep(true);
    } else if (currentStepIndex === 3) {
      valid = validateStep(steps[currentStepIndex], true);
    } else if (isBooking && currentStepIndex === 0) {
      valid = validateStep(steps[0], true);
    }

    btnNext.classList.toggle("is-ready", valid);
    btnNext.disabled = !valid;
    btnNext.setAttribute("aria-disabled", valid ? "false" : "true");
    // #region agent log
    if (!isBooking && currentStepIndex === 0) {
      const _m2 = readSpaceMetrics(form);
      const _mode2 = getSizeInputMode(form);
      const _pt2 = form.querySelector('input[name="property_type"]:checked')?.value || null;
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H1,H2,H3,H5',location:'quote-assistant.js:updateNavState:step0',message:'step0 nav state updated',data:{valid,disabled:btnNext.disabled,currentStepIndex,mode:_mode2,propertyType:_pt2,beds:_m2.beds,baths:_m2.baths,sqft:_m2.sqft,bedsRaw:_m2.bedsRaw,bathsRaw:_m2.bathsRaw,sqftRaw:_m2.sqftRaw},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion

    // #region agent log
    if (!isBooking && currentStepIndex === 0) {
      const _m = readSpaceMetrics(form);
      const _mode = getSizeInputMode(form);
      const _pt = form.querySelector('input[name="property_type"]:checked')?.value || null;
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1571d'},body:JSON.stringify({sessionId:'d1571d',runId:'run1',hypothesisId:'H1,H5',location:'quote-assistant.js:updateNavState',message:'step0 nav evaluation',data:{valid,mode:_mode,propertyType:_pt,beds:_m.beds,baths:_m.baths,sqft:_m.sqft,bedsRaw:_m.bedsRaw,bathsRaw:_m.bathsRaw,disabled:btnNext.disabled},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
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
        if (typeof window.clearFieldErrors === "function") window.clearFieldErrors(stepEl);
        errors.forEach(({ input }) => {
          if (typeof window.markFieldInvalid === "function") window.markFieldInvalid(input);
        });
        showStudioToast(root, first.message, "error");
        setNavHint(first.message);
        first.input?.focus?.({ preventScroll: true });
        if (first.input?.closest(".book-date-scroll")) {
          first.input.closest(".book-date-scroll")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        } else if (typeof window.scrollFieldIntoView === "function") {
          window.scrollFieldIntoView(first.input);
        }
        scrollQuoteStepIntoView({ behavior: "smooth" });
      }
      return false;
    }
    if (!silent) setNavHint("");
    return true;
  }

  function updatePaymentUI() {
    if (!isBooking || !btnSubmit) return;
    const payOnline = form.querySelector('input[name="payment_method"][value="pay_online"]')?.checked;
    const squareEnabled = typeof window.isSquareCheckoutEnabled === "function" && window.isSquareCheckoutEnabled();
    if (payOnline && squareEnabled) {
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
    const pricing = calculateQuoteTotal(form, { allowEstimate: true });
    const pType = data.get("property_type") || "";
    const mode = getSizeInputMode(form);
    const beds = data.get("bedrooms") || "";
    const baths = data.get("bathrooms") || "";
    const sType = data.get("service_type") || "Pending...";
    const freq = data.get("frequency") || "-";
    const addons = data.getAll("add_ons[]");

    let spaceText = "Pending...";
    const isAirbnb = isAirbnbTurnoverService(sType);
    if (isAirbnb && pricing.pricingMethod === "flat" && hasCompleteBedBathMetrics(form)) {
      const range = pricing.airbnbRangeLabel ? ` (${pricing.airbnbRangeLabel})` : "";
      spaceText = `${beds} bed, ${baths} bath • flat turnover${range}`;
    } else if (isAirbnb && pricing.pricingMethod === "sqft" && pricing.sqft > 0) {
      spaceText = `${pricing.sqft} sq ft • $0.18/sq ft turnover`;
    } else if (pType && mode === "sqft" && pricing.sqft > 0) {
      spaceText = `${pType} • ${pricing.sqft} sq ft`;
    } else if (pType && hasCompleteBedBathMetrics(form)) {
      spaceText = `${pType} • ${beds} bed, ${baths} bath • ~${pricing.sqft} sq ft (est.)`;
    } else if (mode === "sqft" && pricing.sqft > 0) {
      spaceText = `${pricing.sqft} sq ft`;
    } else if (hasCompleteBedBathMetrics(form)) {
      spaceText = `${beds} bed, ${baths} bath • ~${pricing.sqft} sq ft (est.)`;
    }

    if (liveSpace) liveSpace.textContent = spaceText;
    if (liveService) liveService.textContent = sType;
    if (liveFrequency) liveFrequency.textContent = freq;
    if (liveAddons) liveAddons.textContent = addons.length ? `${addons.length} selected` : "0 selected";

    if (liveScope) {
      if (sType.includes("Deep") || sType.includes("Move")) liveScope.textContent = "Heavy reset scope";
      else if (addons.length > 2) liveScope.textContent = "Detailed scope";
      else if (pType || hasValidSpaceMetrics(form)) liveScope.textContent = "Standard scope";
      else liveScope.textContent = "Calculating...";
    }

    const isFinalStep = currentStepIndex === steps.length - 1;
    const isRevealed = reviewReveal?.classList.contains("is-revealed");

    if (liveEstimate && !isFinalStep) {
      liveEstimate.textContent = "Shown at final review";
    }

    if (liveTotalDisplay && !isFinalStep) {
      liveTotalDisplay.textContent = "—";
    }

    if (isFinalStep && !canShowQuoteEstimateTotal()) {
      if (liveTotalDisplay) liveTotalDisplay.textContent = "—";
      if (liveEstimate) {
        liveEstimate.textContent = isFinalReadyForEstimate()
          ? "Tap Get my estimate to reveal your total"
          : "Consent & contact details required";
      }
    }

    if (isFinalStep && isRevealed && liveTotalDisplay && canShowQuoteEstimateTotal()) {
      const pricing = calculateQuoteTotal(form, { allowEstimate: true });
      if (pricing.total > 0) {
        liveTotalDisplay.textContent = formatMoney(pricing.total);
      }
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
    const beds = data.get("bedrooms") || session?.bedrooms || "";
    const baths = data.get("bathrooms") || session?.bathrooms || "";
    const sqftRaw = data.get("square_feet") || session?.square_feet;
    const sizeMode = isBooking ? inferSizeInputModeFromSession(session) : getSizeInputMode(form);
    const sqftLabel =
      sizeMode === "sqft" && sqftRaw
        ? `${sqftRaw} sq ft`
        : `~${pricing.sqft} sq ft (estimated)`;
    if (reviewProperty) {
      if (isBooking && data.get("address")) {
        reviewProperty.textContent = property;
      } else if (!isBooking) {
        const sizePart =
          sizeMode === "sqft"
            ? sqftLabel
            : `${beds} bed · ${baths} bath · ${sqftLabel}`;
        reviewProperty.textContent = `${property} · ${sizePart}`;
      } else {
        reviewProperty.textContent = property;
      }
    }
    if (reviewService) reviewService.textContent = data.get("service_type") || session?.service_type || "-";
    if (reviewFrequency) reviewFrequency.textContent = data.get("frequency") || session?.frequency || "-";

    if (reviewSize) {
      if (isAirbnbTurnoverService(data.get("service_type") || session?.service_type)) {
        if (pricing.pricingMethod === "flat") {
          const tier = pricing.airbnbTierLabel ? ` · ${pricing.airbnbTierLabel}` : "";
          const range = pricing.airbnbRangeLabel ? ` (${pricing.airbnbRangeLabel})` : "";
          reviewSize.textContent = `${beds} bed / ${baths} bath · flat turnover${tier}${range}`;
        } else if (pricing.pricingMethod === "sqft") {
          reviewSize.textContent = `${sqftRaw || pricing.sqft} sq ft · $0.18/sq ft`;
        } else {
          reviewSize.textContent = `${beds} bed / ${baths} bath`;
        }
      } else {
        reviewSize.textContent =
          sizeMode === "sqft"
            ? sqftLabel
            : `${beds} bed / ${baths} bath / ${sqftLabel}`;
      }
    }

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
    const shouldShowTotal = showTotal && canShowQuoteEstimateTotal();
    if (liveTotalDisplay) {
      liveTotalDisplay.textContent = shouldShowTotal ? formatMoney(totalValue) : "—";
    }
    if (travelNote) {
      if (shouldShowTotal && pricing.travelFee > 0) {
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

    const totalEl = liveTotalDisplay || root.querySelector("#liveCalculatedTotal");
    const pricing = calculateQuoteTotal(form);

    reviewReveal.classList.add("is-revealed");

    if (isQuoteConsole) {
      if (totalPanel) totalPanel.classList.remove("is-calculating");
      if (liveEstimate) liveEstimate.textContent = "Confirmed before we arrive";
      setFinalReviewFocus(true);

      if (!hasValidSpaceMetrics(form)) {
        if (totalEl) totalEl.textContent = "—";
        reviewReveal.hidden = false;
        setSubmitEnabledForFinalStep(true);
        scrollQuoteEstimateIntoView();
        return;
      }

      if (totalEl) totalEl.textContent = formatMoney(0);
      animateCountUp(totalEl, pricing.total, 1300);
      reviewReveal.hidden = false;
      setSubmitEnabledForFinalStep(true);
      scrollQuoteEstimateIntoView();
      return;
    }

    const rows = reviewReveal.querySelectorAll(".quote-plan-bullet, .quote-review-row");
    const totalRow = reviewReveal.querySelector(".quote-estimate-hero, .quote-review-total");

    if (totalEl) totalEl.textContent = formatMoney(0);

    if (!hasValidSpaceMetrics(form)) {
      if (totalEl) totalEl.textContent = "—";
      rows.forEach((row) => row.classList.add("is-visible"));
      totalRow?.classList.add("is-visible");
      scrollQuoteEstimateIntoView();
      return;
    }

    rows.forEach((row, index) => {
      setTimeout(() => row.classList.add("is-visible"), 160 + index * 220);
    });

    const totalDelay = 160 + rows.length * 220 + 260;
    setTimeout(() => {
      totalRow?.classList.add("is-visible");
      animateCountUp(totalEl, pricing.total, 1300);
      scrollQuoteEstimateIntoView();
    }, totalDelay);
  }

  function showCalculatingReview() {
    if (!calculatingState || !reviewReveal) {
      setQuoteSubmitPreparing(false);
      populateReview(true);
      return;
    }

    if (!isBooking && !isSpaceStepComplete()) {
      setQuoteSubmitPreparing(false);
      if (calculatingState) calculatingState.hidden = true;
      if (reviewReveal) reviewReveal.hidden = true;
      goToFirstIncompleteStep("Please complete your space details first.");
      return;
    }

    if (!isFinalContactInfoComplete()) {
      setQuoteSubmitPreparing(false);
      setFinalReviewFocus(false);
      setSubmitEnabledForFinalStep(false);
      if (calculatingState) calculatingState.hidden = true;
      if (reviewReveal) {
        reviewReveal.hidden = true;
        reviewReveal.classList.remove("is-revealed");
      }
      return;
    }

    if (reviewAnimationStep === currentStepIndex && !reviewReveal.hidden && reviewReveal.classList.contains("is-revealed")) {
      setQuoteSubmitPreparing(false);
      populateReview(true);
      return;
    }
    reviewAnimationStep = currentStepIndex;

    if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
    if (reviewMsgTimer) clearInterval(reviewMsgTimer);

    if (isQuoteConsole) {
      calculatingState.hidden = true;
    } else {
      calculatingState.hidden = false;
    }
    setFinalReviewFocus(false);
    reviewReveal.hidden = true;
    reviewReveal.classList.remove("is-revealed");
    setQuoteSubmitPreparing(true);
    setSubmitEnabledForFinalStep(false);
    resetReviewRevealAnimation();
    populateReview(false);

    const calcMessages = [
      "Reviewing space, service, and add-ons",
      "Matching your space to service rates…",
      "Checking selected add-ons…",
      "Preparing your personalized total…"
    ];
    let calcIndex = 0;
    const subEl = calculatingState.querySelector(".quote-calculating-sub");
    if (isQuoteConsole) {
      if (totalPanel) totalPanel.classList.add("is-calculating");
      if (liveTotalDisplay) liveTotalDisplay.textContent = "…";
      if (liveEstimate) liveEstimate.textContent = calcMessages[0];
    } else if (subEl) {
      subEl.textContent = calcMessages[0];
    }
    const calcDelay = prefersReducedMotion()
      ? CALC_DELAY_MS_REDUCED
      : randomInRange(CALC_DELAY_MS_MIN, CALC_DELAY_MS_MAX);
    const msgInterval = Math.max(400, Math.floor(calcDelay / calcMessages.length));
    reviewMsgTimer = setInterval(() => {
      calcIndex += 1;
      if (calcIndex < calcMessages.length) {
        if (isQuoteConsole && liveEstimate) {
          liveEstimate.textContent = calcMessages[calcIndex];
        } else if (subEl) {
          subEl.style.opacity = "0";
          setTimeout(() => {
            subEl.textContent = calcMessages[calcIndex];
            subEl.style.opacity = "1";
          }, 120);
        }
      }
    }, msgInterval);

    reviewRevealTimer = setTimeout(() => {
      clearInterval(reviewMsgTimer);
      reviewMsgTimer = null;
      calculatingState.hidden = true;
      reviewReveal.hidden = false;
      setQuoteSubmitPreparing(false);
      revealReviewProgressively();
      if (!isQuoteConsole) {
        remeasureExpandable();
      }
    }, calcDelay);
  }

  function updateStepChrome() {
    const stepNum = currentStepIndex + 1;
    if (windowTitle && isQuoteStudio && !isBooking) {
      windowTitle.textContent = `Step ${stepNum} of ${steps.length}`;
    }
    root.dataset.step = String(stepNum);
    if (consoleProgress && isQuoteStudio && !isBooking) {
      const progress = (stepNum / steps.length) * 100;
      consoleProgress.style.width = `${progress}%`;
    }

    if (stepDots && isQuoteStudio && !isBooking) {
      stepDots.querySelectorAll(".quote-step-dot").forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentStepIndex);
        dot.classList.toggle("is-done", index < currentStepIndex);
        dot.setAttribute("aria-current", index === currentStepIndex ? "step" : "false");
      });
    }

    updatePrefillChip();
    updateBookStepBanner();
  }

  function transitionToStep(nextIndex, direction = 1) {
    if (nextIndex < 0 || nextIndex >= steps.length || isStepTransitioning) {
      // #region agent log
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H4',location:'quote-assistant.js:transitionToStep:blocked',message:'transition blocked',data:{nextIndex,direction,currentStepIndex,isStepTransitioning,stepsLength:steps.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return;
    }

    if (!isQuoteStudio) {
      currentStepIndex = nextIndex;
      updateUI();
      playAssistantMessage(currentStepIndex);
      return;
    }

    const currentStepEl = steps[currentStepIndex];
    const nextStepEl = steps[nextIndex];
    if (currentStepEl === nextStepEl) return;

    isStepTransitioning = true;
    if (formStage) formStage.classList.add("is-step-transitioning");
    currentStepEl.classList.add(direction > 0 ? "is-exiting-forward" : "is-exiting-back");
    setTimeout(() => {
      currentStepEl.classList.remove("active", "is-exiting-forward", "is-exiting-back");
      currentStepIndex = nextIndex;
      nextStepEl.classList.add("active", direction > 0 ? "is-entering-forward" : "is-entering-back");
      updateUI();
      playAssistantMessage(currentStepIndex);
      // #region agent log
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H4',location:'quote-assistant.js:transitionToStep:committed',message:'transition committed',data:{nextIndex,direction,currentStepIndexAfter:currentStepIndex},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      scrollQuoteStepIntoView({ behavior: "smooth" });
      setTimeout(() => {
        nextStepEl.classList.remove("is-entering-forward", "is-entering-back");
        if (formStage) formStage.classList.remove("is-step-transitioning");
        isStepTransitioning = false;
      }, STEP_TRANSITION_ENTER_MS);
    }, STEP_TRANSITION_EXIT_MS);
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
      if (isQuoteConsole) setSubmitEnabledForFinalStep(false);
      if (isQuoteConsole) setGetEstimateEnabled(isFinalReadyForEstimate());
      if (!(isQuoteStudio && table === "quote_requests")) {
        populateReview(true);
        if (isBooking) updatePaymentUI();
      } else if (isQuoteConsole) {
        populateReview(false);
        hideQuoteEstimateDisplay();
      }
    } else {
      setFinalReviewFocus(false);
      setSubmitEnabledForFinalStep(true);
      setGetEstimateEnabled(true);
      if (btnNext) btnNext.style.display = "inline-flex";
      if (btnSubmit) {
        btnSubmit.style.display = "none";
      }
      setQuoteSubmitPreparing(false);
      if (reviewRevealTimer) clearTimeout(reviewRevealTimer);
      if (reviewMsgTimer) clearInterval(reviewMsgTimer);
      reviewAnimationStep = -1;
      if (calculatingState) calculatingState.hidden = true;
      if (reviewReveal) {
        reviewReveal.hidden = true;
        reviewReveal.classList.remove("is-revealed");
      }
      if (isQuoteConsole) {
        if (totalPanel) totalPanel.classList.remove("is-calculating");
        hideQuoteEstimateDisplay();
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
  initQuoteSizeMode(form, {
    onUpdate: () => {
      updateLiveSummary();
      updateNavState();
      if (currentStepIndex === steps.length - 1) populateReview(canShowQuoteEstimateTotal());
    }
  });
  syncQuoteServicePricingUi(form);
  if (!isBooking || (typeof window.loadQuoteSession === "function" && window.loadQuoteSession())) {
    playAssistantMessage(currentStepIndex);
    initPhoneFormatting(form);
    if (isBooking) initBookDatePicker(form);
    if (isQuoteStudio) initServiceTooltips(root);
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      // #region agent log
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H1,H2,H3,H4',location:'quote-assistant.js:btnNext:click',message:'continue clicked',data:{isBooking,currentStepIndex,disabled:!!btnNext.disabled,isStepTransitioning},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (isStepTransitioning) return;

      if (!isBooking && currentStepIndex === 0) {
        if (!validateSpaceStep()) {
          // #region agent log
          fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35abd8'},body:JSON.stringify({sessionId:'35abd8',runId:'run1',hypothesisId:'H1,H2,H5',location:'quote-assistant.js:btnNext:blockedSpace',message:'space step validation failed on continue',data:{currentStepIndex},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          return;
        }
      } else if (!isBooking && currentStepIndex === 1) {
        if (!validateServiceStep()) return;
      } else if (!validateStep(steps[currentStepIndex])) {
        return;
      }

      const nextIndex = currentStepIndex + 1;
      if (!isBooking) {
        const firstIncomplete = getFirstIncompleteStepIndex();
        if (firstIncomplete >= 0 && nextIndex > firstIncomplete) {
          goToFirstIncompleteStep("Please complete the earlier steps first.");
          return;
        }
      }

      if (currentStepIndex < steps.length - 1) {
        transitionToStep(nextIndex, 1);
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (isStepTransitioning) return;
      if (currentStepIndex > 0) {
        transitionToStep(currentStepIndex - 1, -1);
      }
    });
  }

  if (editContactBtn) {
    editContactBtn.addEventListener("click", () => {
      setFinalReviewFocus(false);
      invalidateQuoteDraft();
      setGetEstimateEnabled(isFinalReadyForEstimate());
      contactEntry?.querySelector('input[name="full_name"]')?.focus?.({ preventScroll: true });
      scrollQuoteStepIntoView();
    });
  }

  if (btnGetEstimate) {
    btnGetEstimate.addEventListener("click", async () => {
      await maybeStartFinalReview();
    });
  }

  form.addEventListener("click", (event) => {
    if (!event.target.closest(
      'input[name="property_type"], input[name="size_input_mode"], #quoteBedrooms, #quoteBathrooms, #quoteSqft, .quote-option, .quote-size-mode-option'
    )) return;
    queueMicrotask(() => {
      updateLiveSummary();
      updateNavState();
    });
  });

  form.addEventListener("change", (event) => {
    if (event?.target?.matches?.('input[name="service_type"]')) {
      syncQuoteServicePricingUi(form);
    }
    updateLiveSummary();
    updateNavState();
    // #region agent log
    if (event?.target?.matches?.('input[name="property_type"], input[name="size_input_mode"], #quoteBedrooms, #quoteBathrooms, #quoteSqft')) {
      fetch('http://127.0.0.1:7394/ingest/aa88cdec-5152-40d3-ae85-3d0638ac0c55',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d1571d'},body:JSON.stringify({sessionId:'d1571d',runId:'run1',hypothesisId:'H2,H5',location:'quote-assistant.js:formChange',message:'step0-relevant change event',data:{name:event.target?.name||event.target?.id||'unknown',value:event.target?.value||null,checked:!!event.target?.checked,currentStepIndex},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    if (currentStepIndex === steps.length - 1) {
      populateReview(canShowQuoteEstimateTotal());
      setGetEstimateEnabled(isFinalReadyForEstimate());
      if (event?.target?.matches?.('input[name="consent"]') && !isFinalConsentGiven()) {
        invalidateQuoteDraft();
      }
      if (event?.target?.matches?.('input[name="full_name"], input[name="phone"], input[name="email"], input[name="preferred_contact"]')) {
        invalidateQuoteDraft();
      }
    }
  });

  form.addEventListener("input", (event) => {
    if (event.target.matches("input, select, textarea")) {
      event.target.closest(".field, .book-time-option, .book-schedule-block, .quote-option, .quote-fieldset")
        ?.classList.remove("is-invalid");
      setNavHint("");
    }
    updateLiveSummary();
    updateNavState();
    if (currentStepIndex === steps.length - 1) {
      populateReview(canShowQuoteEstimateTotal());
      setGetEstimateEnabled(isFinalReadyForEstimate());
      if (event?.target?.matches?.('input[name="full_name"], input[name="phone"], input[name="email"]')) {
        invalidateQuoteDraft();
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!isBooking && currentStepIndex === steps.length - 1 && (
      (calculatingState && !calculatingState.hidden) ||
      (isQuoteConsole && totalPanel?.classList.contains("is-calculating"))
    )) {
      showStudioToast(root, "Please wait while we finish your estimate.", "error");
      return;
    }

    if (!isBooking && isQuoteConsole && currentStepIndex === steps.length - 1 && !quoteDraft?.captured) {
      showStudioToast(root, "Tap 'Get my estimate' first.", "error");
      return;
    }

    if (!validateAllQuoteSteps()) return;

    const defaultSubmitLabel = isBooking
      ? (btnSubmit?.innerHTML || "Confirm booking")
      : (quoteSubmitIdleLabel || `Submit quote <i data-lucide="arrow-right"></i>`);

    if (btnSubmit) {
      btnSubmit.disabled = true;
      const payOnlineSelected = isBooking
        && form.querySelector('input[name="payment_method"][value="pay_online"]')?.checked
        && typeof window.isSquareCheckoutEnabled === "function"
        && window.isSquareCheckoutEnabled();
      btnSubmit.textContent = payOnlineSelected ? "Opening checkout..." : "Sending...";
    }

    const stateEl = form.querySelector("[data-form-state]");
    let redirectingToCheckout = false;
    if (stateEl) {
      stateEl.className = "form-state loading";
      stateEl.textContent = "Saving your request...";
    }

    try {
      const { payload, pricing } = buildSubmissionPayload(form, table);
      let result = {};
      if (table === "bookings") {
        if (typeof window.supabaseInsert !== "function") {
          throw new Error("Form service unavailable. Please refresh and try again.");
        }
        const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
        if (session?.quote_id) payload.quote_id = session.quote_id;
        result = await window.supabaseInsert(table, payload);
      } else if (table === "quote_requests") {
        if (typeof window.supabaseInsert !== "function") {
          throw new Error("Form service unavailable. Please refresh and try again.");
        }
        result = await window.supabaseInsert(table, payload);
      } else {
        if (typeof window.supabaseInsert !== "function") {
          throw new Error("Form service unavailable. Please refresh and try again.");
        }
        result = await window.supabaseInsert(table, payload);
      }

      if (table === "quote_requests") {
        const sessionData = {
          ...payload,
          quote_id: result.id,
          estimated_total: pricing.total,
          service_area_name: resolveBookingServiceArea(null, pricing).areaName,
          travel_fee: resolveBookingServiceArea(null, pricing).travelFee,
          size_input_mode: getSizeInputMode(form)
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
        const squareEnabled = typeof window.isSquareCheckoutEnabled === "function" && window.isSquareCheckoutEnabled();
        const canCreateSquareCheckout = payOnline && squareEnabled && typeof window.createSquareCheckout === "function";

        const successState = formContainer.querySelector("#quoteSuccessState");

        if (canCreateSquareCheckout && result?.id) {
          showCheckoutLoadingPanel();
          try {
            const checkoutUrl = await window.createSquareCheckout(result.id);
            if (typeof window.clearQuoteSession === "function") {
              window.clearQuoteSession();
            }
            redirectingToCheckout = true;
            window.location.assign(checkoutUrl);
            return;
          } catch (checkoutErr) {
            console.error("Square checkout error:", checkoutErr);
            if (checkoutLoading) checkoutLoading.hidden = true;
            hideFormChrome();
            if (successState) {
              const msg = successState.querySelector("[data-booking-message]");
              if (msg) {
                msg.textContent = "Your booking is saved, but we couldn't open checkout automatically. Our team will send a payment link shortly.";
              }
              const totalEl = successState.querySelector("[data-success-total]");
              if (totalEl) totalEl.textContent = formatMoney(pricing.total || payload.estimated_total);
              showSuccessPanel(successState);
            }
            showStudioToast(
              root,
              checkoutErr?.message || "Could not open Square checkout. We'll follow up with a payment link.",
              "error"
            );
          }
        } else {
          if (typeof window.clearQuoteSession === "function") {
            window.clearQuoteSession();
          }
          hideFormChrome();
          if (successState) {
            const msg = successState.querySelector("[data-booking-message]");
            if (msg) {
              if (payOnline) {
                msg.textContent = "Your booking is saved. We'll send a secure payment link to your email within the hour.";
              } else {
                msg.textContent = "Your appointment request is confirmed. We'll contact you shortly to finalize your time slot.";
              }
            }
            const totalEl = successState.querySelector("[data-success-total]");
            if (totalEl) totalEl.textContent = formatMoney(pricing.total || payload.estimated_total);
            showSuccessPanel(successState);
          }
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
      if (!redirectingToCheckout && btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = defaultSubmitLabel;
        if (typeof lucide !== "undefined") lucide.createIcons({ root: btnSubmit.parentElement });
      }
    }
  });

  const btnRestart = formContainer.querySelector("#btnRestartQuote");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      clearQuoteContextStorage();
      if (window.history.replaceState) {
        window.history.replaceState({}, "", "quote.html");
      }
      form.reset();
      coachInitialPaint = true;
      currentStepIndex = 0;
      const successState = formContainer.querySelector("#quoteSuccessState");
      hideSuccessPanel(successState);
      form.style.display = "";
      const expand = formContainer.querySelector(".quote-window-expand");
      if (expand) expand.style.display = "";
      const progress = formContainer.querySelector(".quote-progress");
      if (progress) progress.style.display = "";
      if (windowHead) windowHead.style.display = "";
      updateUI();
      updateLiveSummary();
      playAssistantMessage(0, { instant: true });
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
      : "Pick your property type, then enter beds & baths or square footage.",
    "Choose a cleaning type and how often.",
    "Optional add-ons — tap any that apply, or skip.",
    "Share your contact details, review, and submit."
  ];
  const bookMessages = [
    "Your quote is saved. Where should we come, and when works best?",
    "Review your booking and choose how you'd like to pay."
  ];
  const messages = isBooking ? bookMessages : quoteMessages;
  bubbleText.textContent = messages[stepIndex] || messages[0];
}
