/**
 * Single source for per-image gallery copy (filenames still use set + letter: 1a, 5c, etc.).
 * Sync into assets/js/gallery-data.js when editing — browser cannot require() this file.
 */
module.exports.ITEM_OVERRIDES = {
  '1a': {
    title: 'Return air vent detail',
    description: 'Dust and lint removed from HVAC grille slats',
    category: 'kitchens',
    badge: 'Add-on',
  },
  '1b': {
    title: 'Oven deep clean add-on',
    description: 'Inside-oven deep clean, degrease & detail (add-on service)',
    category: 'kitchens',
    badge: 'Add-on',
  },
  '1c': {
    title: 'Tub & tile refresh',
    description: 'Bathtub, tile & fixtures restored',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '1d': {
    title: 'Gas range surface detail',
    description: 'Burnt-on spills & crumbs cleared from stovetop',
    category: 'kitchens',
    badge: 'Deep Reset',
  },
  '1e': {
    title: 'Microwave interior detail',
    description: 'Splatter and buildup removed inside microwave',
    category: 'kitchens',
    badge: 'Add-on',
  },
  '2a': {
    title: 'Shower hard water restoration',
    description: 'Glass, fixtures, corners & hard water stain removal',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '2b': {
    title: 'Shower track & baseboard detail',
    description: 'Door track grime and baseboard corners deep cleaned',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '2c': {
    title: 'Floor refresh',
    description: 'Tile floors swept, mopped & detail-cleaned · Standard care',
    category: 'living',
    badge: 'Standard Clean',
  },
  '2d': {
    title: 'Stair carpet deep clean',
    description: 'Ground-in traffic stains lifted from carpeted stairs',
    category: 'living',
    badge: 'Deep Reset',
  },
  '2e': {
    title: 'Shower mineral & rust removal',
    description: 'Heavy rust and hard water buildup cleared from shower',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '3a': {
    title: 'Move-out baseboard detail',
    description: 'Baseboards & kick plates restored for turnover',
    category: 'moveout',
    badge: 'Move-out Turn',
  },
  '3b': {
    title: 'Tub & tile restoration',
    description: 'Grout, fixtures & tub surfaces refreshed',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '3c': {
    title: 'Window track detail',
    description: 'Interior window track cleaning (add-on)',
    category: 'living',
    badge: 'Add-on',
  },
  '3d': {
    title: 'Window blind & mold detail',
    description: 'Mildew spotting treated on blind slats & trim',
    category: 'living',
    badge: 'Deep Reset',
  },
  '3e': {
    title: 'Bathtub rust & mineral removal',
    description: 'Rust and hard water stains cleared from tub & drain',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '4a': {
    title: 'Toilet & fixture deep clean',
    description: 'Toilet, fixtures & hidden areas deep cleaned',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
  '4c': {
    title: 'Behind-appliance floor detail',
    description: 'Grime and buildup cleared behind kitchen appliances',
    category: 'moveout',
    badge: 'Move-out Turn',
  },
  '4d': {
    title: 'Shower stall care',
    description: 'Soap scum and buildup refreshed · Regular care',
    category: 'bathrooms',
    badge: 'Regular Care',
  },
  '4e': {
    title: 'Sliding door track detail',
    description: 'Built-up debris cleared from tracks · Deep reset',
    category: 'moveout',
    badge: 'Deep Reset',
  },
  '5a': {
    title: 'Sliding door track restoration',
    description: 'Door track grime removed for smooth operation',
    category: 'living',
    badge: 'Add-on',
  },
  '5b': {
    title: 'Wall mark removal',
    description: 'Crayon and scuff marks cleaned from painted walls',
    category: 'living',
    badge: 'Deep Reset',
  },
  '5c': {
    title: 'Bedroom carpet refresh',
    description: 'Spot treatment & deep vacuum — stains lifted from carpet',
    category: 'living',
    badge: 'Deep Reset',
  },
  '5d': {
    title: 'Walk-in shower glass detail',
    description: 'Glass, frame & tile — soap scum and buildup removed',
    category: 'bathrooms',
    badge: 'Deep Reset',
  },
}
