/**
 * Website → Sanity sync (website repo is source of truth for copy + local images).
 *
 * - Text/structure: parsed from HTML + config.js
 * - Gallery: built from assets/js/gallery-data.js rules (real before/after photos)
 * - Images: only uploads from assets/images/*; never overwrites uploads with Unsplash URLs
 *
 * Run: npm run sanity:sync-website
 */
const {getCliClient} = require('@sanity/cli')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const client = getCliClient({apiVersion: '2025-05-23'})

const SET_META = {
  1: {category: 'kitchens', badge: 'Standard Clean', project: 'Kitchen reset', description: 'Surfaces refreshed · Details restored'},
  2: {category: 'bathrooms', badge: 'Deep Reset', project: 'Bathroom detail', description: 'Glass, fixtures, and corners cleaned'},
  3: {category: 'living', badge: 'Regular Care', project: 'Living space refresh', description: 'Living area reset for a calmer feel'},
  4: {category: 'moveout', badge: 'Move-out Turn', project: 'Move-out restoration', description: 'Cabinets, floors, and baseboards restored'},
  5: {category: 'moveout', badge: 'Full Reset', project: 'Full property reset', description: 'Whole-home refresh from top to bottom'},
}
const AFTER_FILE_OVERRIDES = {'4a': 'After 4a .jpeg', '4c': 'After 4c .jpeg'}
const SKIP_GALLERY_IDS = new Set(['4b'])

const SERVICE_ORDER = {
  'standard-cleaning': 1,
  'deep-cleaning': 2,
  'move-in-out-cleaning': 3,
  'office-cleaning': 4,
  'carpet-cleaning': 5,
}

const IMAGE_FIELD_PAIRS = [
  ['heroImage', 'heroImageUrl'],
  ['beforeImage', 'beforeImageUrl'],
  ['afterImage', 'afterImageUrl'],
  ['avatar', 'avatarUrl'],
]

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function stripTags(html) {
  return decodeHtml(String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function first(html, pattern) {
  const match = html.match(pattern)
  return match ? stripTags(match[1]) : ''
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function isPlaceholderUrl(url) {
  if (!url) return true
  const value = String(url).toLowerCase()
  return (
    value.includes('unsplash.com') ||
    value.includes('example.com') ||
    value.startsWith('https://images.unsplash')
  )
}

function isLocalAssetUrl(url) {
  return String(url || '').startsWith('assets/images/')
}

function sanitizeImageUrl(url) {
  if (!url || isPlaceholderUrl(url)) return undefined
  if (isLocalAssetUrl(url)) return url
  return undefined
}

function parseConfig() {
  const source = read('assets/js/config.js')
  const pick = (key) => {
    const match = source.match(new RegExp(`${key}:\\s*"([^"]*)"`))
    return match ? match[1] : ''
  }
  const serviceAreasMatch = source.match(/serviceAreas:\s*\[([\s\S]*?)\]/)
  const areas = serviceAreasMatch
    ? [...serviceAreasMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : []

  return {
    businessName: pick('businessName'),
    logoText: pick('businessName'),
    phone: pick('phone'),
    email: pick('email'),
    serviceAreaSummary: pick('serviceArea'),
    operatingHours: 'Monday to Saturday, 8am to 6pm',
    footerDescription: 'Premium local cleaning for homes, rentals, and workplaces.',
    socialLinks: [],
    primaryCtaLabel: 'Request quote',
    primaryCtaHref: 'quote.html',
    serviceAreas: areas,
  }
}

function extractHeroBlock(html) {
  const section =
    html.match(/<section class="[^"]*page-hero[^"]*"[\s\S]*?<\/section>/i)?.[0] ||
    html.match(/<section class="hero hero--backdrop[\s\S]*?<\/section>/i)?.[0] ||
    html.match(/<section class="page-hero[\s\S]*?<\/section>/i)?.[0] ||
    ''

  if (!section) return {heroEyebrow: '', heroTitle: '', heroCopy: '', heroImageUrl: ''}

  const heroCopy =
    first(section, /<p class="hero-lead">([\s\S]*?)<\/p>/i) ||
    first(section, /<p class="contact-page-hero-lead[^"]*">([\s\S]*?)<\/p>/i) ||
    first(section, /<h1[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/i)

  const heroImage = section.match(/<img[^>]+src="([^"]+)"/i)?.[1] || ''

  return {
    heroEyebrow: first(section, /<p class="eyebrow[^"]*">([\s\S]*?)<\/p>/i),
    heroTitle: first(section, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    heroCopy,
    heroImageUrl: heroImage,
  }
}

function extractHomePage() {
  const html = read('index.html')

  const trustIndicators = [...html.matchAll(
    /<div class="hero-strip[\s\S]*?<div><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/div>/g
  )].map((m) => ({value: stripTags(m[1]), label: stripTags(m[2])}))

  const serviceCards = [...html.matchAll(
    /<article class="card service-card-horizontal[\s\S]*?<h3>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>[\s\S]*?href="([^"]+)"/g
  )].map((m) => ({
    title: stripTags(m[1]),
    body: stripTags(m[2]),
    href: m[3],
  }))

  const howItWorksSteps = [...html.matchAll(
    /<article class="card step[\s\S]*?<h3>([^<]+)<\/h3>\s*<p>([^<]+)<\/p>/g
  )].map((m) => ({title: stripTags(m[1]), body: stripTags(m[2]), href: ''}))

  const whyChooseUsItems = [...html.matchAll(
    /<li class="feature-row">[\s\S]*?<div class="feature-text">[\s\S]*?<strong>([^<]+)<\/strong>/g
  )].map((m) => stripTags(m[1]))

  const quotePanel = html.match(/<div class="quote-panel[\s\S]*?<\/div>\s*<\/div>/i)?.[0] || ''

  return {
    _id: 'homePage-main',
    _type: 'homePage',
    heroEyebrow: '',
    heroTitle: first(html, /<section class="hero[\s\S]*?<h1>([^<]+)<\/h1>/i),
    heroCopy: first(html, /<section class="hero[\s\S]*?<p class="hero-lead">([^<]+)<\/p>/i),
    heroImageUrl: 'assets/images/hero-image.png',
    primaryCta: {
      label: first(html, /<div class="hero-actions[\s\S]*?<a class="button secondary"[^>]*>([^<]+)/i) || 'Get estimate in minutes',
      href: 'quote.html',
    },
    secondaryCta: {
      label: first(html, /<div class="hero-actions[\s\S]*?<a class="button ghost"[^>]*>([^<]+)/i) || 'Schedule a call',
      href: 'contact.html?inquiry=consultation',
    },
    trustIndicators,
    servicesOverviewTitle: first(html, /<div class="heading-underline-gradient">[\s\S]*?<h2>([^<]+)<\/h2>/i),
    serviceCards,
    howItWorksSteps,
    whyChooseUsTitle: first(html, /<div class="heading-tag-split">[\s\S]*?<h2>([^<]+)<\/h2>/i),
    whyChooseUsItems,
    finalCtaTitle: first(quotePanel, /<h2[^>]*>([^<]+)<\/h2>/i),
    finalCtaCopy: first(quotePanel, /<h2[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i),
  }
}

function extractPage(slug, file) {
  const html = read(file)
  const hero = extractHeroBlock(html)
  const metaDescription = first(html, /<meta name="description" content="([^"]+)"/i)
  const title = first(html, /<title>([^<|]+)/i).replace(/\s*\|.*/, '').trim()

  const doc = {
    _id: `page-${slug}`,
    _type: 'page',
    title,
    slug: {_type: 'slug', current: slug},
    metaDescription,
    heroEyebrow: hero.heroEyebrow,
    heroTitle: hero.heroTitle,
    heroCopy: hero.heroCopy,
    sections: [],
  }

  const pageHero = sanitizeImageUrl(hero.heroImageUrl)
  if (slug === 'gallery') doc.heroImageUrl = 'assets/images/gallery-before-after.png'
  else if (pageHero) doc.heroImageUrl = pageHero

  if (slug === 'about') {
    const origin = html.match(/<section class="about-story-origin"[\s\S]*?<\/section>/i)?.[0] || ''
    const paragraphs = [...origin.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1])).filter(Boolean)
    doc.sections = [{
      eyebrow: first(origin, /<p class="eyebrow">([\s\S]*?)<\/p>/i),
      title: first(origin, /<h2>([\s\S]*?)<\/h2>/i),
      body: paragraphs.join('\n\n'),
      imageUrl: 'assets/images/rscleaningcollective_founder.jpg',
    }]
  }

  if (slug === 'quote' || slug === 'book') {
    doc.heroTitle = first(html, /data-studio-title>([^<]+)</i) || doc.heroTitle
    doc.heroCopy = first(html, /data-studio-copy>([^<]+)</i) || doc.heroCopy
  }

  return doc
}

function extractService(slug, file) {
  const html = read(file)
  const hero = extractHeroBlock(html)
  const scope = html.match(/<section class="service-detail-scope"[\s\S]*?<\/section>/i)?.[0] || ''
  const includedBlock = scope.match(/<ul class="feature-list">([\s\S]*?)<\/ul>/i)?.[1] || ''
  const includedItems = [...includedBlock.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1]))

  const doc = {
    _id: `service-${slug}`,
    _type: 'service',
    title: hero.heroEyebrow || slug,
    slug: {_type: 'slug', current: slug},
    shortDescription: hero.heroTitle,
    overviewTitle: 'Included',
    overview: hero.heroCopy,
    includedItems,
    recommendedAddOns: [],
    estimateFactors: ['Rooms', 'Bathrooms', 'Size', 'Frequency', 'Current condition'],
    ctaLabel: first(html, /<a class="button"[^>]*href="[^"]*quote[^"]*">([^<]+)</i) || 'Get estimate',
    displayOrder: SERVICE_ORDER[slug] || 99,
  }

  const heroUrl = sanitizeImageUrl(html.match(/<section class="service-detail-hero[\s\S]*?<img[^>]+src="([^"]+)"/i)?.[1])
  if (heroUrl) doc.heroImageUrl = heroUrl

  return doc
}

function extractFaqs() {
  const html = read('faq.html')
  const items = [...html.matchAll(
    /<div class="faq-item[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<div class="faq-panel"[^>]*>([\s\S]*?)<\/div>/g
  )]

  return items.map((match, index) => {
    const question = stripTags(match[1])
    const answer = [...match[2].matchAll(/<p>([\s\S]*?)<\/p>/g)]
      .map((p) => stripTags(p[1]))
      .filter(Boolean)
      .join('\n\n')

    return {
      _id: `faq-${slugify(question)}`,
      _type: 'faq',
      question,
      answer,
      category: 'General',
      displayOrder: index + 1,
    }
  })
}

function extractTestimonials() {
  const html = read('index.html')
  const cards = [...html.matchAll(/<article class="card review-card">([\s\S]*?)<\/article>/g)]

  return cards.map((match, index) => {
    const block = match[1]
    const customerName = first(block, /<strong>([^<]+)<\/strong>/i)
    const location = first(block, /<strong>[\s\S]*?<span>([^<]+)<\/span>/i)
    const quote = first(block, /<p class="review-text">([^<]+)<\/p>/i)

    return {
      _id: `testimonial-${slugify(customerName)}`,
      _type: 'testimonial',
      customerName,
      serviceType: '',
      location,
      quote,
      rating: 5,
      displayOrder: index + 1,
    }
  })
}

function buildGalleryItems() {
  const items = []
  let order = 1

  for (let set = 1; set <= 5; set += 1) {
    const letters = set === 5 ? ['a', 'b'] : ['a', 'b', 'c', 'd', 'e']
    const meta = SET_META[set]

    letters.forEach((letter) => {
      const id = `${set}${letter}`
      if (SKIP_GALLERY_IDS.has(id)) return

      const afterName = AFTER_FILE_OVERRIDES[id] || `After ${id}.jpeg`
      items.push({
        _id: `gallery-${id}`,
        _type: 'galleryItem',
        title: `${meta.project} · View ${letter.toUpperCase()}`,
        slug: {_type: 'slug', current: `gallery-${id}`},
        serviceType: meta.badge,
        category: meta.category,
        badge: meta.badge,
        beforeImageUrl: `assets/images/Before ${id}.jpeg`,
        afterImageUrl: `assets/images/${afterName}`,
        description: meta.description,
        displayOrder: order++,
      })
    })
  }

  return items
}

function buildServiceAreas(areas) {
  const seed = read('sanity/seed.ndjson')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .filter((doc) => doc._type === 'serviceArea')

  return seed.filter((doc) => areas.includes(doc.name))
}

function mergePreserveImages(existing, incoming, options = {}) {
  if (options.forceGalleryImages) {
    return {...incoming}
  }

  const merged = {...incoming}

  for (const [imageField, urlField] of IMAGE_FIELD_PAIRS) {
    if (existing?.[imageField]?.asset?._ref) {
      merged[imageField] = existing[imageField]
      delete merged[urlField]
      continue
    }
    if (isPlaceholderUrl(merged[urlField]) || !isLocalAssetUrl(merged[urlField])) {
      delete merged[urlField]
    }
  }

  if (Array.isArray(merged.serviceCards)) {
    merged.serviceCards = merged.serviceCards.map((card, index) => {
      const prev = existing?.serviceCards?.[index]
      const next = {...card}
      if (prev?.image?.asset?._ref) {
        next.image = prev.image
        delete next.imageUrl
      } else {
        delete next.imageUrl
      }
      return next
    })
  }

  if (Array.isArray(merged.howItWorksSteps)) {
    merged.howItWorksSteps = merged.howItWorksSteps.map((step, index) => {
      const prev = existing?.howItWorksSteps?.[index]
      const next = {...step}
      if (prev?.image?.asset?._ref) {
        next.image = prev.image
        delete next.imageUrl
      } else {
        delete next.imageUrl
      }
      return next
    })
  }

  if (Array.isArray(merged.sections)) {
    merged.sections = merged.sections.map((section, index) => {
      const prev = existing?.sections?.[index]
      const next = {...section}
      const url = sanitizeImageUrl(next.imageUrl)
      if (prev?.image?.asset?._ref) {
        next.image = prev.image
        delete next.imageUrl
      } else if (url) {
        next.imageUrl = url
      } else {
        delete next.imageUrl
      }
      return next
    })
  }

  return merged
}

async function deleteOrphans(type, keepIds) {
  const keep = new Set(keepIds)
  const existing = await client.fetch(`*[_type == "${type}"]._id`)
  for (const id of existing) {
    if (keep.has(id)) continue
    console.log(`Removing stale ${type}: ${id}`)
    await client.delete(id)
  }
}

async function upsertDocument(doc, options = {}) {
  const existing = await client.fetch(`*[_id == $id][0]`, {id: doc._id})
  const merged = existing ? mergePreserveImages(existing, doc, options) : doc
  await client.createOrReplace(merged)
  console.log(`Synced ${doc._type}: ${doc._id}`)
}

async function run() {
  const config = parseConfig()

  const siteSettings = {
    _id: 'siteSettings-main',
    _type: 'siteSettings',
    businessName: config.businessName,
    logoText: config.logoText,
    phone: config.phone,
    email: config.email,
    serviceAreaSummary: config.serviceAreaSummary,
    operatingHours: config.operatingHours,
    footerDescription: config.footerDescription,
    socialLinks: config.socialLinks,
    primaryCtaLabel: config.primaryCtaLabel,
    primaryCtaHref: config.primaryCtaHref,
  }

  const pages = [
    ['about', 'about.html'],
    ['services', 'services.html'],
    ['quote', 'quote.html'],
    ['book', 'book.html'],
    ['contact', 'contact.html'],
    ['faq', 'faq.html'],
    ['gallery', 'gallery.html'],
    ['testimonials', 'testimonials.html'],
    ['service-areas', 'service-areas.html'],
    ['terms', 'terms.html'],
    ['privacy', 'privacy.html'],
  ].map(([slug, file]) => extractPage(slug, file))

  const services = fs
    .readdirSync(path.join(ROOT, 'services'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => {
      const slug = name.replace('.html', '')
      return extractService(slug, path.join('services', name).replace(/\\/g, '/'))
    })

  const faqs = extractFaqs()
  const testimonials = extractTestimonials()
  const galleryItems = buildGalleryItems()
  const serviceAreas = buildServiceAreas(config.serviceAreas)
  const homePage = extractHomePage()

  console.log('Syncing website content → Sanity (text from HTML, gallery from assets/images)…')

  await upsertDocument(siteSettings)
  await upsertDocument(homePage)
  for (const doc of pages) await upsertDocument(doc)
  for (const doc of services) await upsertDocument(doc)
  for (const doc of faqs) await upsertDocument(doc)
  for (const doc of testimonials) await upsertDocument(doc)
  for (const doc of serviceAreas) await upsertDocument(doc)
  for (const doc of galleryItems) {
    await upsertDocument(doc, {forceGalleryImages: true})
  }

  await deleteOrphans('faq', faqs.map((d) => d._id))
  await deleteOrphans('testimonial', testimonials.map((d) => d._id))
  await deleteOrphans('galleryItem', galleryItems.map((d) => d._id))
  await deleteOrphans('service', services.map((d) => d._id))
  await deleteOrphans('page', pages.map((d) => d._id))
  await deleteOrphans('serviceArea', serviceAreas.map((d) => d._id))

  console.log('Uploading local images into Sanity asset fields…')
  const {execSync} = require('child_process')
  execSync('npm run sanity:migrate-images:cli', {stdio: 'inherit', cwd: ROOT})

  const report = await client.fetch(`{
    "gallery": count(*[_type == "galleryItem" && (!defined(beforeImage.asset) || !defined(afterImage.asset))]),
    "galleryTotal": count(*[_type == "galleryItem"]),
    "legacyUrls": {
      "gallery": count(*[_type == "galleryItem" && (defined(beforeImageUrl) || defined(afterImageUrl))]),
      "home": count(*[_type == "homePage" && defined(heroImageUrl)]),
      "service": count(*[_type == "service" && defined(heroImageUrl)])
    }
  }`)

  console.log('Sync report:', JSON.stringify(report, null, 2))
  console.log('Website → Sanity sync complete.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
