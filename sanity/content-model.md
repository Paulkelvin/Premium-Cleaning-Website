# Sanity Content Model

Use this as the first-pass model for moving the website copy out of hardcoded HTML and into Sanity.

## Documents

### siteSettings

- businessName
- logoText
- phone
- email
- serviceAreaSummary
- operatingHours
- socialLinks
- footerDescription
- primaryCta
- secondaryCta

### page

- title
- slug
- metaDescription
- heroEyebrow
- heroTitle
- heroCopy
- sections

Use this for About, Contact, Service Areas, Privacy Policy, and Terms of Service.

### homePage

- hero
- trustIndicators
- servicesOverview
- instantEstimateSection
- howItWorksSteps
- whyChooseUsItems
- galleryPreview
- testimonialsPreview
- serviceAreasPreview
- aboutPreview
- faqPreview
- finalCta

### service

- title
- slug
- shortDescription
- heroImage
- overview
- includedItems
- recommendedAddOns
- estimateFactors
- ctaLabel
- displayOrder

### faq

- question
- answer
- category
- displayOrder

### testimonial

- customerName, serviceType, location, quote, rating, displayOrder
- **avatar** (image upload — customer photo)

### galleryItem

- title, slug, serviceType, category, badge, description, displayOrder
- **beforeImage**, **afterImage** (image uploads)

### service

- title, slug, shortDescription, overview, includedItems, etc.
- **heroImage** (image upload)

### homePage

- hero fields + **heroImage** (image upload)
- serviceCards[].**image**, howItWorksSteps[].**image**

### page

- hero fields + **heroImage**
- sections[].**image**

- customerName
- serviceType
- quote
- rating
- displayOrder

### galleryItem

- title
- serviceType
- beforeImage
- afterImage
- description
- displayOrder

### serviceArea

- name
- region
- localSeoCopy
- nearbyAreas
- displayOrder

## Frontend Migration

1. Keep Supabase for operational data: contact submissions, quote requests, bookings, and admin statuses.
2. Use Sanity for editable marketing content: pages, services, FAQs, reviews, gallery, footer, and business details.
3. Prefer a Next.js or Astro migration so Sanity content can be rendered before page load for SEO.
4. After schemas are created, migrate the current HTML copy into Sanity documents.
5. Replace hardcoded page text with Sanity queries and fallback content.

