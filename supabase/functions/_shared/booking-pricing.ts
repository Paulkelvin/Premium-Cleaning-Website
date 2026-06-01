/** Keep in sync with assets/js/config.js → pricing */

export type BookingPricingInput = {
  service_type?: string | null;
  bedrooms?: string | null;
  bathrooms?: string | null;
  square_feet?: string | null;
  add_ons?: string | null;
  frequency?: string | null;
};

type PricingConfig = {
  minimumJob: number;
  rates: Record<string, number>;
  addOns: Record<string, number>;
  frequencyDiscounts: Record<string, number>;
};

const SERVICE_ALIASES: Record<string, string> = {
  "Move-in / Move-out": "Move-in/Move-out",
  "Move in/out": "Move-in/Move-out",
};

const AIRBNB_SERVICE = "Short-term rental & Airbnb turnover";

const AIRBNB_TIERS = [
  { minBeds: 0, maxBeds: 1, amount: 150 },
  { minBeds: 2, maxBeds: 2, amount: 213 },
  { minBeds: 3, maxBeds: 3, amount: 288 },
  { minBeds: 4, maxBeds: 99, amount: 400 },
];

function isAirbnbService(serviceType: string) {
  return serviceType === AIRBNB_SERVICE;
}

function resolveAirbnbFlatFee(bedrooms: number) {
  const beds = Number.isInteger(bedrooms) && bedrooms >= 0 ? bedrooms : 1;
  const tier =
    AIRBNB_TIERS.find((entry) => beds >= entry.minBeds && beds <= entry.maxBeds) ||
    AIRBNB_TIERS[AIRBNB_TIERS.length - 1];
  return tier.amount;
}

function inferAirbnbPricingMode(booking: BookingPricingInput) {
  const bedsRaw = String(booking.bedrooms ?? "").trim();
  const bathsRaw = String(booking.bathrooms ?? "").trim();
  const sqft = parseInt(String(booking.square_feet || "").replace(/,/g, ""), 10);
  if (!bedsRaw && !bathsRaw && sqft > 0) return "sqft";
  if (bedsRaw && bathsRaw) return "beds_baths";
  if (sqft > 0) return "sqft";
  return "beds_baths";
}

const ADDON_ALIASES: Record<string, string> = {
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
  "bedding refresh (strip and remake beds)": "Bedding refresh (strip and remake beds)",
};

function getPricingConfig(): PricingConfig {
  const raw = Deno.env.get("BOOKING_PRICING_JSON");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.rates && parsed?.addOns) return parsed as PricingConfig;
    } catch {
      // fall through to defaults
    }
  }

  return {
    minimumJob: 125,
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.28,
      "Move-in/Move-out": 0.32,
      "Office cleaning": 0.20,
      [AIRBNB_SERVICE]: 0.18,
    },
    addOns: {
      "Wash and fold": 45,
      "Fold laundry only": 25,
      "Inside oven": 40,
      "Inside fridge": 40,
      "Cabinet interiors": 50,
      "Interior Windows Accessible (1-10)": 50,
      "Interior Windows Accessible (11-20)": 100,
      "Bedding refresh (strip and remake beds)": 15,
    },
    frequencyDiscounts: {
      Weekly: 0.20,
      "Bi-weekly": 0.15,
      Monthly: 0.10,
      "One-time": 0.0,
    },
  };
}

function normalizeServiceType(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return SERVICE_ALIASES[trimmed] || trimmed;
}

function normalizeAddonValue(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const canonical = ADDON_ALIASES[trimmed.toLowerCase()];
  if (canonical) return canonical;
  return trimmed;
}

function parseSqft(raw?: string | null, bedrooms?: string | null, bathrooms?: string | null) {
  const parsed = parseInt(String(raw || "").replace(/,/g, ""), 10);
  if (parsed > 0) return parsed;
  const beds = parseInt(String(bedrooms || ""), 10) || 2;
  const baths = parseInt(String(bathrooms || ""), 10) || 1;
  return Math.round(beds * 450 + baths * 150 + 350);
}

export function computeBookingTotal(booking: BookingPricingInput) {
  const pricing = getPricingConfig();
  const serviceType = normalizeServiceType(booking.service_type);
  const sqft = parseSqft(booking.square_feet, booking.bedrooms, booking.bathrooms);
  const freq = String(booking.frequency || "One-time").trim() || "One-time";
  const beds = parseInt(String(booking.bedrooms ?? ""), 10);
  const baths = parseInt(String(booking.bathrooms ?? ""), 10);

  if (!serviceType) {
    return { total: 0, sqft, serviceType, freq };
  }

  let basePrice = 0;

  if (isAirbnbService(serviceType)) {
    const mode = inferAirbnbPricingMode(booking);
    if (mode === "sqft") {
      const sqftOnly = parseInt(String(booking.square_feet || "").replace(/,/g, ""), 10);
      if (sqftOnly <= 0) return { total: 0, sqft: sqftOnly, serviceType, freq };
      basePrice = sqftOnly * (pricing.rates[AIRBNB_SERVICE] || 0.18);
    } else if (Number.isInteger(beds) && beds >= 0 && Number.isInteger(baths) && baths >= 1) {
      basePrice = resolveAirbnbFlatFee(beds);
    } else {
      return { total: 0, sqft, serviceType, freq };
    }
  } else {
    if (!pricing.rates[serviceType] || sqft <= 0) {
      return { total: 0, sqft, serviceType, freq };
    }
    basePrice = sqft * pricing.rates[serviceType];
  }

  if (basePrice > 0 && basePrice < pricing.minimumJob) {
    basePrice = pricing.minimumJob;
  }

  let addonsPrice = 0;
  String(booking.add_ons || "")
    .split(",")
    .map((part) => normalizeAddonValue(part))
    .filter(Boolean)
    .forEach((addon) => {
      if (pricing.addOns[addon]) addonsPrice += pricing.addOns[addon];
    });

  let subtotal = basePrice + addonsPrice;
  const discount = isAirbnbService(serviceType)
    ? 0
    : pricing.frequencyDiscounts[freq] || 0;
  subtotal -= subtotal * discount;

  const rounded = Math.round(subtotal * 100) / 100;
  const total =
    rounded > 0 && rounded < pricing.minimumJob ? pricing.minimumJob : rounded;

  return {
    total,
    sqft,
    serviceType,
    freq,
  };
}
