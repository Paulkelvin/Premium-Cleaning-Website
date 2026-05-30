/**
 * Upsert service area documents from sanity/seed.ndjson and remove stale entries.
 *
 * Run: sanity exec scripts/sync-service-areas.cjs --with-user-token
 */
const {getCliClient} = require('@sanity/cli')
const fs = require('fs')
const path = require('path')

const client = getCliClient({apiVersion: '2025-05-23'})
const seedPath = path.join(__dirname, '..', 'sanity', 'seed.ndjson')

const EXPECTED_IDS = new Set([
  'area-charles',
  'area-st-marys',
  'area-calvert',
  'area-prince-georges',
])

function loadServiceAreas() {
  const lines = fs.readFileSync(seedPath, 'utf8').trim().split('\n')
  return lines
    .map((line) => JSON.parse(line))
    .filter((doc) => doc._type === 'serviceArea')
}

async function run() {
  const areas = loadServiceAreas()
  console.log(`Upserting ${areas.length} service area documents…`)

  for (const doc of areas) {
    await client.createOrReplace(doc)
    console.log(`  ${doc._id}: ${doc.name}`)
  }

  const existing = await client.fetch(`*[_type == "serviceArea"]._id`)
  for (const id of existing) {
    if (EXPECTED_IDS.has(id)) continue
    console.log(`Deleting stale service area: ${id}`)
    await client.delete(id)
  }

  console.log('Service areas synced.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
