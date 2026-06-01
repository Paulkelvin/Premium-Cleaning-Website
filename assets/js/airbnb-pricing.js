(function initAirbnbPricing() {
  const SERVICE_NAME = "Short-term rental & Airbnb turnover";

  const DEFAULT_CONFIG = {
    sqftRate: 0.18,
    skipFrequencyDiscount: true,
    tiers: [
      { minBeds: 0, maxBeds: 1, amount: 150, rangeLabel: "$125–$175", label: "1 bed / 1 bath" },
      { minBeds: 2, maxBeds: 2, amount: 213, rangeLabel: "$175–$250", label: "2 bed / 2 bath" },
      { minBeds: 3, maxBeds: 3, amount: 288, rangeLabel: "$225–$350", label: "3 bed / 2 bath" },
      { minBeds: 4, maxBeds: 99, amount: 400, rangeLabel: "$300–$500+", label: "4+ bed vacation rental" }
    ]
  };

  function getConfig() {
    const fromSite = window.CLEANCO_CONFIG?.airbnbTurnover;
    if (!fromSite) return { ...DEFAULT_CONFIG, tiers: [...DEFAULT_CONFIG.tiers] };
    return {
      ...DEFAULT_CONFIG,
      ...fromSite,
      tiers: Array.isArray(fromSite.tiers) && fromSite.tiers.length
        ? fromSite.tiers
        : DEFAULT_CONFIG.tiers
    };
  }

  function isAirbnbTurnoverService(serviceType) {
    return String(serviceType || "").trim() === SERVICE_NAME;
  }

  function resolveAirbnbFlatFee(bedrooms, bathrooms) {
    const beds = Number.isInteger(bedrooms) && bedrooms >= 0 ? bedrooms : 1;
    const cfg = getConfig();
    const tier =
      cfg.tiers.find((entry) => beds >= entry.minBeds && beds <= entry.maxBeds) ||
      cfg.tiers[cfg.tiers.length - 1];
    return {
      amount: tier?.amount || DEFAULT_CONFIG.tiers[0].amount,
      tierLabel: tier?.label || "",
      rangeLabel: tier?.rangeLabel || ""
    };
  }

  /**
   * @param {object} input
   * @param {string} input.serviceType
   * @param {"beds_baths"|"sqft"} input.sizeMode
   * @param {number} input.bedrooms
   * @param {number} input.bathrooms
   * @param {number} input.sqft
   */
  function computeAirbnbBasePrice(input) {
    const cfg = getConfig();
    const mode = input.sizeMode === "sqft" ? "sqft" : "beds_baths";
    const sqft = Number(input.sqft) || 0;
    const beds = input.bedrooms;
    const baths = input.bathrooms;

    if (mode === "sqft" && sqft > 0) {
      const rate = Number(cfg.sqftRate) || 0.18;
      return {
        basePrice: sqft * rate,
        pricingMethod: "sqft",
        sqft,
        tierLabel: "",
        rangeLabel: ""
      };
    }

    if (Number.isInteger(beds) && beds >= 0 && Number.isInteger(baths) && baths >= 1) {
      const flat = resolveAirbnbFlatFee(beds, baths);
      return {
        basePrice: flat.amount,
        pricingMethod: "flat",
        sqft,
        tierLabel: flat.tierLabel,
        rangeLabel: flat.rangeLabel
      };
    }

    return { basePrice: 0, pricingMethod: "none", sqft, tierLabel: "", rangeLabel: "" };
  }

  function inferServerPricingMode(booking) {
    const bedsRaw = String(booking?.bedrooms ?? "").trim();
    const bathsRaw = String(booking?.bathrooms ?? "").trim();
    const sqft = parseInt(String(booking?.square_feet || "").replace(/,/g, ""), 10);
    if (!bedsRaw && !bathsRaw && sqft > 0) return "sqft";
    if (bedsRaw && bathsRaw) return "beds_baths";
    if (sqft > 0) return "sqft";
    return "beds_baths";
  }

  window.RS_AIRBNB_SERVICE_NAME = SERVICE_NAME;
  window.isAirbnbTurnoverService = isAirbnbTurnoverService;
  window.getAirbnbTurnoverConfig = getConfig;
  window.resolveAirbnbFlatFee = resolveAirbnbFlatFee;
  window.computeAirbnbBasePrice = computeAirbnbBasePrice;
  window.inferAirbnbServerPricingMode = inferServerPricingMode;
})();
