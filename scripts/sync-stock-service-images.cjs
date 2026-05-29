/**
 * One-time: mirror the live site's stock service images into Sanity image fields
 * so Studio shows a populated image for every service card / service hero.
 * The admin can then replace each one with a real photo.
 *
 * Run: sanity exec scripts/sync-stock-service-images.cjs --with-user-token
 */
const {getCliClient} = require('@sanity/cli')

const client = getCliClient({apiVersion: '2025-05-23'})

// Exact images the live site (index.html) shows on the 3 home service cards, in order.
const HOME_SERVICE_CARD_IMAGES = [
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
]

// Service detail hero images (match the service listing/seed imagery).
const SERVICE_HERO_IMAGES = {
  'service-standard-cleaning': 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=85',
  'service-deep-cleaning': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
  'service-move-in-out-cleaning': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  'service-office-cleaning': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
}

function imageRef(assetId) {
  return {_type: 'image', asset: {_type: 'reference', _ref: assetId}}
}

async function uploadUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const filename = decodeURIComponent(url.split('/').pop().split('?')[0]) || 'image.jpg'
  return client.assets.upload('image', buffer, {filename})
}

async function syncHomeServiceCards() {
  const home = await client.fetch(`*[_id == "homePage-main"][0]{serviceCards}`)
  if (!home?.serviceCards?.length) return

  const cards = []
  let changed = false
  for (let i = 0; i < home.serviceCards.length; i += 1) {
    const card = home.serviceCards[i]
    if (card.image?.asset?._ref) {
      cards.push(card)
      continue
    }
    const url = HOME_SERVICE_CARD_IMAGES[i]
    if (!url) {
      cards.push(card)
      continue
    }
    const asset = await uploadUrl(url)
    const {imageUrl, ...rest} = card
    cards.push({...rest, image: imageRef(asset._id)})
    changed = true
    console.log(`Home service card ${i + 1} (${card.title || ''}) image set`)
  }

  if (changed) {
    await client.patch('homePage-main').set({serviceCards: cards}).commit()
  }
}

async function syncServiceHeroes() {
  for (const [id, url] of Object.entries(SERVICE_HERO_IMAGES)) {
    const doc = await client.fetch(`*[_id == $id][0]{_id, heroImage}`, {id})
    if (!doc) {
      console.log(`Skip ${id}: not found`)
      continue
    }
    if (doc.heroImage?.asset?._ref) {
      console.log(`Skip ${id}: already has hero image`)
      continue
    }
    const asset = await uploadUrl(url)
    await client.patch(id).set({heroImage: imageRef(asset._id)}).unset(['heroImageUrl']).commit()
    console.log(`${id} hero image set`)
  }
}

async function run() {
  console.log('Mirroring live-site stock service images into Sanity…')
  await syncHomeServiceCards()
  await syncServiceHeroes()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
