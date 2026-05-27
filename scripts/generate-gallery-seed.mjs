/**
 * Builds galleryItem NDJSON lines from the same rules as assets/js/gallery-data.js
 * Run: node scripts/generate-gallery-seed.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SITE_BASE = process.env.SITE_BASE_URL || "https://REDACTED.com";

const SET_META = {
  1: { category: "kitchens", badge: "Standard Clean", project: "Kitchen reset", description: "Surfaces refreshed · Details restored" },
  2: { category: "bathrooms", badge: "Deep Reset", project: "Bathroom detail", description: "Glass, fixtures, and corners cleaned" },
  3: { category: "living", badge: "Regular Care", project: "Living space refresh", description: "Living area reset for a calmer feel" },
  4: { category: "moveout", badge: "Move-out Turn", project: "Move-out restoration", description: "Cabinets, floors, and baseboards restored" },
  5: { category: "moveout", badge: "Full Reset", project: "Full property reset", description: "Whole-home refresh from top to bottom" },
};

const AFTER_FILE_OVERRIDES = { "4a": "After 4a .jpeg", "4c": "After 4c .jpeg" };
const SKIP_IDS = new Set(["4b"]);

function imageUrl(file) {
  return `${SITE_BASE}/assets/images/${encodeURIComponent(file)}`;
}

function beforeFile(set, letter) {
  return `Before ${set}${letter}.jpeg`;
}

function afterFile(set, letter) {
  const id = `${set}${letter}`;
  if (AFTER_FILE_OVERRIDES[id]) return AFTER_FILE_OVERRIDES[id];
  return `After ${set}${letter}.jpeg`;
}

const items = [];
let order = 1;

for (let set = 1; set <= 5; set += 1) {
  const letters = set === 5 ? ["a", "b"] : ["a", "b", "c", "d", "e"];
  const meta = SET_META[set];
  letters.forEach((letter) => {
    const id = `${set}${letter}`;
    if (SKIP_IDS.has(id)) return;
    items.push({
      _id: `gallery-${set}${letter}`,
      _type: "galleryItem",
      title: `${meta.project} · View ${letter.toUpperCase()}`,
      slug: { _type: "slug", current: `gallery-${set}${letter}` },
      serviceType: meta.badge,
      category: meta.category,
      badge: meta.badge,
      beforeImageUrl: imageUrl(beforeFile(set, letter)),
      afterImageUrl: imageUrl(afterFile(set, letter)),
      description: meta.description,
      displayOrder: order++,
    });
  });
}

const seedPath = path.join(root, "sanity", "seed.ndjson");
const lines = fs.readFileSync(seedPath, "utf8").trim().split("\n");
const filtered = lines.filter((line) => !line.includes('"galleryItem"'));
const galleryLines = items.map((doc) => JSON.stringify(doc));
const merged = [...filtered, ...galleryLines].join("\n") + "\n";
fs.writeFileSync(seedPath, merged);

console.log(`Updated ${seedPath} with ${items.length} gallery items (site base: ${SITE_BASE})`);
