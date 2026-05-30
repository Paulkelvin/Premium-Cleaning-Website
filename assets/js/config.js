window.CLEANCO_CONFIG = {
  businessName: "RS Cleaning Collective",
  // Update phone in Sanity siteSettings when the client provides their real number.
  phone: "202-262-6379",
  email: "Ryannrslegalcollective.com",
  address: "3990 dockser drive, Mechanicsville, Md 20659",
  serviceArea: "Charles County, St. Mary's County, Calvert County, Prince George's County, Southern Anne Arundel County, and Washington, DC",
  serviceAreas: [
    "Charles County",
    "St. Mary's County",
    "Calvert County",
    "Prince George's County",
    "Southern Anne Arundel County",
    "Washington, DC"
  ],
  supabaseUrl: "https://hbacogyhftngwoxenttv.supabase.co",
  supabaseAnonKey: "sb_publishable_jCivAQateqBu5rCK1IbmbQ_zNB4E39g",
  // Optional: legacy anon JWT (eyJ...) from Supabase → Project Settings → API.
  // Only needed if Edge Functions have JWT verification turned ON.
  supabaseFunctionKey: "",
  // Must match Supabase Auth users + supabase/schema.sql RLS policies (exact emails).
  adminEmails: ["rs.cleaning@collective.com", "paulopackager@gmail.com"],
  // phone: fallback before Sanity loads — also edit Site Settings → Phone in Sanity Studio for live updates site-wide
  sanityProjectId: "hjrx2q9w",
  sanityDataset: "production",
  sanityApiVersion: "2025-05-23",
  pricing: {
    minimumJob: 0.5,
    rates: {
      "Standard cleaning": 0.17,
      "Deep cleaning": 0.28,
      "Move-in/Move-out": 0.32,
      "Office cleaning": 0.20
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
  // Enable automated Square checkout for variable quote totals (requires Supabase Edge Functions).
  squareCheckoutEnabled: true,
  // Public site URL — must match SITE_URL secret in Supabase (no trailing slash).
  siteUrl: "https://rs.cleaningcollective.workers.dev",
  // Deprecated: static Stripe link cannot handle variable quote prices.
  stripePaymentLink: ""
};
