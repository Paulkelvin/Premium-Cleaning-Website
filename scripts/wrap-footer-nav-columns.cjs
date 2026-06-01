/**
 * Wraps footer link columns in .footer-nav-columns for consistent desktop layout.
 * Run: node scripts/wrap-footer-nav-columns.cjs
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

function wrapFooter(html) {
  if (!html.includes('footer-grid') || html.includes('footer-nav-columns')) return null

  const match = html.match(
    /(<div class="section-inner footer-grid">\s*)([\s\S]*?)(\s*<\/div>\s*<div class="section-inner footer-bottom">)/
  )
  if (!match) return null

  const inner = match[2].trim()
  const firstClose = inner.indexOf('</div>')
  if (firstClose < 0) return null

  const brandInner = inner.slice(inner.indexOf('>') + 1, firstClose).trim()
  const rest = inner.slice(firstClose + '</div>'.length).trim()
  if (!rest) return null

  const brand = `<div class="footer-brand-col">\n        ${brandInner}\n      </div>`
  const restBlocks = rest

  const wrapped = `${match[1]}${brand}
      <div class="footer-nav-columns">
      ${restBlocks}
      </div>${match[3]}`

  return html.replace(match[0], wrapped)
}

let updated = 0
for (const file of walk(ROOT)) {
  const html = fs.readFileSync(file, 'utf8')
  const next = wrapFooter(html)
  if (next && next !== html) {
    fs.writeFileSync(file, next)
    updated += 1
    console.log('wrapped', path.relative(ROOT, file))
  }
}

console.log(`Done. Updated ${updated} file(s).`)
