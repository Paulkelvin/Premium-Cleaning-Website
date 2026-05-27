/**
 * Run via: npm run sanity:migrate-images:cli
 * Uses your `sanity login` session (Editor/Administrator), not a robot token.
 */
const {getCliClient} = require('@sanity/cli')
const path = require('path')
const fs = require('fs')

const SITE_BASE = process.env.SITE_BASE_URL || 'https://REDACTED.com'
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images')
const client = getCliClient({apiVersion: '2025-05-23'})

function localImagePath(url) {
  if (!url) return null
  let rel = url
  if (rel.startsWith('http://') || rel.startsWith('https://')) {
    try {
      rel = decodeURIComponent(new URL(rel).pathname)
    } catch {
      return null
    }
  }
  rel = rel.replace(/^\//, '')
  if (rel.startsWith('assets/images/')) rel = rel.slice('assets/images/'.length)
  else if (!rel.includes('/')) rel = rel
  else return null
  const localPath = path.join(IMAGES_DIR, rel)
  return fs.existsSync(localPath) ? localPath : null
}

async function loadSource(url) {
  if (!url) return null

  const localFirst = localImagePath(url)
  if (localFirst) {
    return {
      buffer: fs.readFileSync(localFirst),
      filename: path.basename(localFirst),
    }
  }

  let target = url
  if (target.startsWith('assets/')) {
    target = `${SITE_BASE}/${target}`
  } else if (target.startsWith('/')) {
    target = `${SITE_BASE}${target}`
  }

  if (target.startsWith('http://') || target.startsWith('https://')) {
    const res = await fetch(target)
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer())
      const name = decodeURIComponent(target.split('/').pop() || 'image.jpg')
      return {buffer, filename: name}
    }
    const fallback = localImagePath(target)
    if (fallback) {
      return {
        buffer: fs.readFileSync(fallback),
        filename: path.basename(fallback),
      }
    }
    throw new Error(`Fetch failed ${res.status}: ${target}`)
  }

  const localPath = path.join(__dirname, '..', url.replace(/^\//, ''))
  if (fs.existsSync(localPath)) {
    return {
      buffer: fs.readFileSync(localPath),
      filename: path.basename(localPath),
    }
  }

  throw new Error(`Could not resolve image: ${url}`)
}

async function uploadFromUrl(url) {
  const source = await loadSource(url)
  if (!source) return null
  return client.assets.upload('image', source.buffer, {filename: source.filename})
}

function imageRef(assetId) {
  return {_type: 'image', asset: {_type: 'reference', _ref: assetId}}
}

async function migrateTestimonials() {
  const docs = await client.fetch(`*[_type == "testimonial"]{_id, avatarUrl, avatar}`)
  for (const doc of docs) {
    if (doc.avatar || !doc.avatarUrl) continue
    console.log(`Testimonial ${doc._id}`)
    const asset = await uploadFromUrl(doc.avatarUrl)
    await client.patch(doc._id).set({avatar: imageRef(asset._id)}).unset(['avatarUrl']).commit()
  }
}

async function migrateGallery() {
  const docs = await client.fetch(`*[_type == "galleryItem"]{_id, beforeImageUrl, afterImageUrl, beforeImage, afterImage}`)
  for (const doc of docs) {
    const patch = client.patch(doc._id)
    let changed = false
    if (!doc.beforeImage && doc.beforeImageUrl) {
      console.log(`Gallery before ${doc._id}`)
      const asset = await uploadFromUrl(doc.beforeImageUrl)
      patch.set({beforeImage: imageRef(asset._id)})
      patch.unset(['beforeImageUrl'])
      changed = true
    }
    if (!doc.afterImage && doc.afterImageUrl) {
      console.log(`Gallery after ${doc._id}`)
      const asset = await uploadFromUrl(doc.afterImageUrl)
      patch.set({afterImage: imageRef(asset._id)})
      patch.unset(['afterImageUrl'])
      changed = true
    }
    if (changed) await patch.commit()
  }
}

async function migrateServices() {
  const docs = await client.fetch(`*[_type == "service"]{_id, heroImageUrl, heroImage}`)
  for (const doc of docs) {
    if (doc.heroImage || !doc.heroImageUrl) continue
    console.log(`Service ${doc._id}`)
    const asset = await uploadFromUrl(doc.heroImageUrl)
    await client.patch(doc._id).set({heroImage: imageRef(asset._id)}).unset(['heroImageUrl']).commit()
  }
}

async function migrateCards(cards = []) {
  let changed = false
  const next = []
  for (const card of cards) {
    if (card?.image?.asset?._ref || !card?.imageUrl) {
      next.push(card)
      continue
    }
    const asset = await uploadFromUrl(card.imageUrl)
    const {_type, imageUrl, ...rest} = card
    next.push({...rest, image: imageRef(asset._id)})
    changed = true
  }
  return {cards: next, changed}
}

async function migrateHomePage() {
  const doc = await client.fetch(`*[_type == "homePage"][0]`)
  if (!doc) return
  const patch = client.patch(doc._id)
  let changed = false

  if (!doc.heroImage && doc.heroImageUrl) {
    console.log('Home hero')
    const asset = await uploadFromUrl(doc.heroImageUrl)
    patch.set({heroImage: imageRef(asset._id)})
    patch.unset(['heroImageUrl'])
    changed = true
  }

  if (doc.serviceCards?.length) {
    const {cards, changed: cardsChanged} = await migrateCards(doc.serviceCards)
    if (cardsChanged) {
      patch.set({serviceCards: cards})
      changed = true
    }
  }

  if (doc.howItWorksSteps?.length) {
    const {cards, changed: stepsChanged} = await migrateCards(doc.howItWorksSteps)
    if (stepsChanged) {
      patch.set({howItWorksSteps: cards})
      changed = true
    }
  }

  if (changed) await patch.commit()
}

async function migratePages() {
  const docs = await client.fetch(`*[_type == "page"]{_id, heroImageUrl, heroImage, sections}`)
  for (const doc of docs) {
    const patch = client.patch(doc._id)
    let changed = false

    if (!doc.heroImage && doc.heroImageUrl) {
      const asset = await uploadFromUrl(doc.heroImageUrl)
      patch.set({heroImage: imageRef(asset._id)})
      patch.unset(['heroImageUrl'])
      changed = true
    }

    if (doc.sections?.length) {
      const nextSections = []
      let sectionsChanged = false
      for (const section of doc.sections) {
        if (section?.image?.asset?._ref || !section?.imageUrl) {
          nextSections.push(section)
          continue
        }
        const asset = await uploadFromUrl(section.imageUrl)
        const {_type, imageUrl, ...rest} = section
        nextSections.push({...rest, image: imageRef(asset._id)})
        sectionsChanged = true
      }
      if (sectionsChanged) {
        patch.set({sections: nextSections})
        changed = true
      }
    }

    if (changed) {
      console.log(`Page ${doc._id}`)
      await patch.commit()
    }
  }
}

async function main() {
  console.log('Migrating Sanity images using CLI login session…')
  await migrateTestimonials()
  await migrateGallery()
  await migrateServices()
  await migrateHomePage()
  await migratePages()
  console.log('Done. Open Studio — each document now has replaceable image fields.')
}

module.exports = main

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
