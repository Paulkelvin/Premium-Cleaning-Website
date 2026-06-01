/**
 * Inserts a static Add-ons footer column before Contact on all pages.
 * Run: node scripts/patch-footer-addons-column.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ADDONS_BLOCK = `      <div class="footer-col footer-col--addons" data-footer-addons-col>
        <h3 data-footer-addons-heading>Add-ons</h3>
        <ul data-footer-addons></ul>
      </div>
`;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0;

for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("footer-grid") || html.includes("data-footer-addons-col")) continue;
  if (!html.includes("<h3>Contact</h3>")) continue;

  html = html.replace(
    /(<h3>Services<\/h3>\s*<ul)(\s*>)/g,
    "$1 data-footer-services$2"
  );

  const next = html.replace(
    /(<div>\s*<h3>Services<\/h3>[\s\S]*?<\/ul>\s*<\/div>)\s*(<div>\s*<h3>Contact<\/h3>)/,
    `$1\n${ADDONS_BLOCK}\n      $2`
  );

  if (next !== html) {
    fs.writeFileSync(file, next);
    updated += 1;
    console.log("patched", path.relative(ROOT, file));
  }
}

console.log(`Done. Updated ${updated} file(s).`);
