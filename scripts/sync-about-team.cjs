/**
 * Sync About page team + founder section into Sanity (page-about).
 * Run: sanity exec scripts/sync-about-team.cjs --with-user-token
 */
const {getCliClient} = require('@sanity/cli')
const fs = require('fs')
const path = require('path')

const client = getCliClient({apiVersion: '2025-05-23'})
const IMAGES = path.join(__dirname, '..', 'assets', 'images')

function imageRef(assetId) {
  return {_type: 'image', asset: {_type: 'reference', _ref: assetId}}
}

async function uploadLocal(fileName) {
  const localPath = path.join(IMAGES, fileName)
  if (!fs.existsSync(localPath)) return null
  const buffer = fs.readFileSync(localPath)
  return client.assets.upload('image', buffer, {filename: fileName})
}

async function uploadTeamPhoto(member) {
  if (!member.photoFile) return member
  const asset = await uploadLocal(member.photoFile)
  if (!asset) return member
  const {photoFile, ...rest} = member
  return {...rest, photo: imageRef(asset._id)}
}

const TEAM = [
  {
    name: 'Ryann Sargent',
    role: 'Founder & Owner',
    bio: 'Ryann leads operations, scheduling, quality control, and client experience with the same standards of organization, confidentiality, and care that shaped her professional background.',
    photoFile: 'rscleaningcollective_founder.jpg',
  },
  {
    name: 'Nikki Hare',
    role: 'Field Operations Manager',
    bio: 'Nikki leads field services and keeps every appointment running smoothly, combining cleaning and hospitality experience with strong professionalism clients can rely on.',
    photoFile: 'Nikki Hare.jpg',
  },
  {
    name: 'Jamilla Abdul-Muhaimin',
    role: 'Operations Coordinator',
    bio: 'Jamilla manages behind-the-scenes coordination and systems support so each visit stays consistent, organized, and aligned with the quality RS is known for.',
    photoFile: 'Jamilla Abdul-Muhaimin.jpg',
  },
]

const ORIGIN_SECTION = {
  eyebrow: 'WHY WE DO WHAT WE DO',
  title: 'We lead with compassion instead of judgment.',
  body: [
    "We understand that life gets busy, overwhelming, and sometimes messy - not because people don't care, but because they're juggling work, kids, stress, health, or simply trying to keep up. We're familiar with what it feels like to live in disarray, and that understanding is what drives our approach with compassion instead of judgment.",
    "For us, cleaning is about more than making a home look nice. It's about creating relief. It's about helping someone walk into their space and finally feel able to breathe, relax, and reset.",
    "Whether it's routine maintenance, deep cleaning, organizing, move-out services, or helping tackle spaces that have gotten out of control, we take pride in bringing homes back to a place that feels manageable, comfortable, and cared for.",
    'We treat every home with respect, attention to detail, and the same care we would want for our own families.',
  ].join('\n\n'),
  imageFile: 'rscleaningcollective_founder.jpg',
}

async function run() {
  const existing = await client.fetch(`*[_id == "page-about"][0]`)
  if (!existing) throw new Error('page-about not found')

  const founderAsset = await uploadLocal(ORIGIN_SECTION.imageFile)
  const teamMembers = []
  for (const member of TEAM) {
    teamMembers.push(await uploadTeamPhoto(member))
  }

  const sections = [{
    eyebrow: ORIGIN_SECTION.eyebrow,
    title: ORIGIN_SECTION.title,
    body: ORIGIN_SECTION.body,
    image: founderAsset ? imageRef(founderAsset._id) : undefined,
  }]

  await client
    .patch('page-about')
    .set({
      heroEyebrow: 'ABOUT US',
      heroTitle: 'Compassionate cleaning that helps people reclaim peace and comfort at home.',
      heroCopy:
        'At RS Cleaning Collective, we believe a clean, organized space can completely change how someone feels in their home. We started this business because we genuinely enjoy helping people reclaim peace, comfort, and functionality in their everyday lives.',
      sections,
      teamMembers,
    })
    .commit()

  console.log('About page synced: founder section + 3 team members (Ryann + Nikki photos uploaded).')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
