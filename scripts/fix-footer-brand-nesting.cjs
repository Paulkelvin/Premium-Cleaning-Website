/**
 * Removes accidental inner <div> inside .footer-brand-col from wrap-footer-nav-columns.cjs
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      walk(full, files)
    } else if (entry.name.endsWith('.html')) {
      files.push(full)
    }
  }
  return files
}

let updated = 0
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8')
  const before = html
  html = html.replace(
    /<div class="footer-brand-col"><div>/g,
    '<div class="footer-brand-col">'
  )
  html = html.replace(
    /(\s*)<\/div><\/div>(\s*<div class="footer-nav-columns">)/g,
    '$1</div>$2'
  )
  if (html !== before) {
    fs.writeFileSync(file, html)
    updated += 1
    console.log('fixed', path.relative(ROOT, file))
  }
}

console.log(`Done. Fixed ${updated} file(s).`)
