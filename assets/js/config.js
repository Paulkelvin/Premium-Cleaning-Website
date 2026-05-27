window.CLEANCO_CONFIG = {
  businessName: "RS Cleaning Collective",
  // Update phone in Sanity siteSettings when the client provides their real number.
  phone: "(555) 014-7820",
  email: "hello@REDACTED.com",
  serviceArea: "Austin, TX and nearby communities",
  supabaseUrl: "https://hbacogyhftngwoxenttv.supabase.co",
  supabaseAnonKey: "sb_publishable_jCivAQateqBu5rCK1IbmbQ_zNB4E39g",
  // Must match Supabase Auth users + supabase/schema.sql RLS policies (exact emails).
  adminEmails: ["rs.cleaning@collective.com", "paulopackager@gmail.com"],
  // phone: fallback before Sanity loads — also edit Site Settings → Phone in Sanity Studio for live updates site-wide
  sanityProjectId: "hjrx2q9w",
  sanityDataset: "production",
  sanityApiVersion: "2025-05-23",
  pricing: {
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
  },
  // stripePaymentLink: paste your Stripe Payment Link URL to enable pay-online booking.
  stripePaymentLink: ""
};
