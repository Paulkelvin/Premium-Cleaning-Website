window.CLEANCO_CONFIG = {
  businessName: "RS Cleaning Collective",
  // Update phone in Sanity siteSettings when the client provides their real number.
  phone: "202-262-6379",
  email: "ryann@rslegalcollective.com",
  facebookUrl: "https://web.facebook.com/profile.php?id=61569210390047",
  address: "Mechanicsville, MD",
  locationLabel: "Southern Maryland",
  serviceArea: "Charles County, St. Mary's County, Calvert County, and Prince George's County",
  serviceAreas: [
    "Charles County",
    "St. Mary's County",
    "Calvert County",
    "Prince George's County"
  ],
  supabaseUrl: "https://hbacogyhftngwoxenttv.supabase.co",
  supabaseAnonKey: "sb_publishable_jCivAQateqBu5rCK1IbmbQ_zNB4E39g",
  // Legacy anon JWT for PostgREST + Edge Functions when JWT verification is enabled.
  supabaseFunctionKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiYWNvZ3loZnRuZ3dveGVudHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzU2OTgsImV4cCI6MjA5NTExMTY5OH0.K6SfTHVK01gsf0cgqqST3t2ThJP8T8PBXxW1NjQgyOk",
  // Must match Supabase Auth users + supabase/schema.sql RLS policies (exact emails).
  adminEmails: ["ryann@rslegalcollective.com", "paulopackager@gmail.com"],
  // phone: fallback before Sanity loads — also edit Site Settings → Phone in Sanity Studio for live updates site-wide
  sanityProjectId: "hjrx2q9w",
  sanityDataset: "production",
  sanityApiVersion: "2025-05-23",
  pricing: {
    minimumJob: 125,
    minimumByService: {
      "Standard cleaning": 150,
      "Deep cleaning": 225,
      "Move-in/Move-out": 275,
      "Office cleaning": 125,
      "Short-term rental & Airbnb turnover": 125
    },
    minSqft: 500,
    rates: {
      "Standard cleaning": 0.14,
      "Deep cleaning": 0.22,
      "Move-in/Move-out": 0.25,
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
  },
  airbnbTurnover: {
    sqftRate: 0.18,
    skipFrequencyDiscount: true,
    tiers: [
      { minBeds: 0, maxBeds: 1, amount: 150, rangeLabel: "$125–$175", label: "1 bed / 1 bath" },
      { minBeds: 2, maxBeds: 2, amount: 213, rangeLabel: "$175–$250", label: "2 bed / 2 bath" },
      { minBeds: 3, maxBeds: 3, amount: 288, rangeLabel: "$225–$350", label: "3 bed / 2 bath" },
      { minBeds: 4, maxBeds: 99, amount: 400, rangeLabel: "$300–$500+", label: "4+ bed vacation rental" }
    ]
  },
  // Enable automated Square checkout for variable quote totals (requires Supabase Edge Functions).
  squareCheckoutEnabled: true,
  // Public site URL — must match SITE_URL secret in Supabase (no trailing slash).
  siteUrl: "https://rs.cleaningcollective.workers.dev",
  // Deprecated: static Stripe link cannot handle variable quote prices.
  stripePaymentLink: ""
};
