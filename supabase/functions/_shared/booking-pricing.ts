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
    minimumJob: 1,
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.28,
      "Move-in/Move-out": 0.32,
      "Office cleaning": 0.20,
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

  if (!serviceType || !pricing.rates[serviceType] || sqft <= 0) {
    return { total: 0, sqft, serviceType, freq };
  }

  let basePrice = sqft * pricing.rates[serviceType];
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
  const discount = pricing.frequencyDiscounts[freq] || 0;
  subtotal -= subtotal * discount;

  return {
    total: Math.round(subtotal * 100) / 100,
    sqft,
    serviceType,
    freq,
  };
}
