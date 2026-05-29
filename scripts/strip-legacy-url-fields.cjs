/**
 * Remove leftover legacy *Url text fields wherever the real uploaded image
 * asset already exists. These fields are not in the schema and cause Studio's
 * "Unknown fields found" warning. Safe because coalesce() prefers the asset,
 * so removing the redundant URL changes nothing on the live site.
 *
 * Run: sanity exec scripts/strip-legacy-url-fields.cjs --with-user-token
 */
const {getCliClient} = require('@sanity/cli')

const client = getCliClient({apiVersion: '2025-05-23'})

async function stripGallery() {
  const docs = await client.fetch(
    `*[_type == "galleryItem"]{_id, "before": defined(beforeImage.asset), "after": defined(afterImage.asset), beforeImageUrl, afterImageUrl}`
  )
  for (const doc of docs) {
    const unset = []
    if (doc.before && doc.beforeImageUrl !== undefined && doc.beforeImageUrl !== null) unset.push('beforeImageUrl')
    if (doc.after && doc.afterImageUrl !== undefined && doc.afterImageUrl !== null) unset.push('afterImageUrl')
    if (!unset.length) continue
    await client.patch(doc._id).unset(unset).commit()
    console.log(`gallery ${doc._id}: removed ${unset.join(', ')}`)
  }
}

async function stripServices() {
  const docs = await client.fetch(`*[_type == "service"]{_id, "hero": defined(heroImage.asset), heroImageUrl}`)
  for (const doc of docs) {
    if (!doc.hero || doc.heroImageUrl == null) continue
    await client.patch(doc._id).unset(['heroImageUrl']).commit()
    console.log(`service ${doc._id}: removed heroImageUrl`)
  }
}

async function stripPages() {
  const docs = await client.fetch(`*[_type == "page"]{_id, "hero": defined(heroImage.asset), heroImageUrl, sections}`)
  for (const doc of docs) {
    const patch = client.patch(doc._id)
    let changed = false
    if (doc.hero && doc.heroImageUrl != null) {
      patch.unset(['heroImageUrl'])
      changed = true
    }
    if (Array.isArray(doc.sections)) {
      const next = doc.sections.map((section) => {
        if (section?.image?.asset?._ref && 'imageUrl' in section) {
          const {imageUrl, ...rest} = section
          changed = true
          return rest
        }
        return section
      })
      if (changed) patch.set({sections: next})
    }
    if (changed) {
      await patch.commit()
      console.log(`page ${doc._id}: cleaned`)
    }
  }
}

async function stripHome() {
  const doc = await client.fetch(`*[_id == "homePage-main"][0]{_id, "hero": defined(heroImage.asset), heroImageUrl, serviceCards, howItWorksSteps}`)
  if (!doc) return
  const patch = client.patch(doc._id)
  let changed = false

  if (doc.hero && doc.heroImageUrl != null) {
    patch.unset(['heroImageUrl'])
    changed = true
  }

  const cleanCards = (cards) =>
    (cards || []).map((card) => {
      if (card?.image?.asset?._ref && 'imageUrl' in card) {
        const {imageUrl, ...rest} = card
        changed = true
        return rest
      }
      return card
    })

  if (Array.isArray(doc.serviceCards)) patch.set({serviceCards: cleanCards(doc.serviceCards)})
  if (Array.isArray(doc.howItWorksSteps)) patch.set({howItWorksSteps: cleanCards(doc.howItWorksSteps)})

  if (changed) {
    await patch.commit()
    console.log('homePage: cleaned')
  }
}

async function stripTestimonials() {
  const docs = await client.fetch(`*[_type == "testimonial"]{_id, "av": defined(avatar.asset), avatarUrl}`)
  for (const doc of docs) {
    if (!doc.av || doc.avatarUrl == null) continue
    await client.patch(doc._id).unset(['avatarUrl']).commit()
    console.log(`testimonial ${doc._id}: removed avatarUrl`)
  }
}

async function run() {
  console.log('Stripping redundant legacy URL fields where real images exist…')
  await stripGallery()
  await stripServices()
  await stripPages()
  await stripHome()
  await stripTestimonials()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
