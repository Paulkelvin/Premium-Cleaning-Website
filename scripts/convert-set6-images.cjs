const fs = require('fs')
const path = require('path')
const convert = require('heic-convert')

const dir = path.join(__dirname, '..', 'assets', 'images')
const pairs = ['6a', '6b', '6c', '6d', '6e']

async function toJpeg(src, dest) {
  if (!fs.existsSync(src)) {
    console.log('MISSING', src)
    return false
  }
  const input = fs.readFileSync(src)
  if (src.toLowerCase().endsWith('.heic')) {
    const output = await convert({buffer: input, format: 'JPEG', quality: 0.92})
    fs.writeFileSync(dest, Buffer.from(output))
  } else {
    fs.writeFileSync(dest, input)
  }
  console.log('OK', path.basename(dest))
  return true
}

async function run() {
  for (const id of pairs) {
    const candidatesBefore = [
      `Before ${id}.jpeg`,
      `Before ${id}.jpg`,
      `Before ${id} .jpg`,
      `Before ${id}.heic`,
    ]
    const candidatesAfter = [
      `After ${id}.jpeg`,
      `After ${id}.jpg`,
      `After ${id} .jpeg`,
      `After ${id}.heic`,
    ]
    const beforeSrc = candidatesBefore.map((f) => path.join(dir, f)).find(fs.existsSync)
    const afterSrc = candidatesAfter.map((f) => path.join(dir, f)).find(fs.existsSync)
    if (beforeSrc) await toJpeg(beforeSrc, path.join(dir, `Before ${id}.jpeg`))
    if (afterSrc) await toJpeg(afterSrc, path.join(dir, `After ${id}.jpeg`))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
