(function defineGalleryItems() {
  const IMAGE_DIR = "assets/images";
  const image = (file) => `${IMAGE_DIR}/${encodeURIComponent(file)}`;

  const SET_META = {
    1: {
      category: "kitchens",
      badge: "Standard Clean",
      project: "Kitchen reset",
      description: "Surfaces refreshed · Details restored",
    },
    2: {
      category: "bathrooms",
      badge: "Deep Reset",
      project: "Bathroom detail",
      description: "Glass, fixtures, and corners cleaned",
    },
    3: {
      category: "living",
      badge: "Regular Care",
      project: "Living space refresh",
      description: "Living area reset for a calmer feel",
    },
    4: {
      category: "moveout",
      badge: "Move-out Turn",
      project: "Move-out restoration",
      description: "Cabinets, floors, and baseboards restored",
    },
    5: {
      category: "moveout",
      badge: "Full Reset",
      project: "Full property reset",
      description: "Whole-home refresh from top to bottom",
    },
    6: {
      category: "bathrooms",
      badge: "Deep Reset",
      project: "Fixture restoration",
      description: "Fixtures and surfaces restored",
    },
  };

  const AFTER_FILE_OVERRIDES = {
    "4a": "After 4a .jpeg",
    "4c": "After 4c .jpeg",
  };

  /** Before/after files uploaded with labels reversed (swap URLs only). */
  const SWAP_BEFORE_AFTER_IDS = new Set(["5c"]);

  const SKIP_IDS = new Set(["4b"]);

  /** Per photo (id = set + letter in filenames). Titles are descriptive — no View A/B labels. */
  const ITEM_OVERRIDES = {
    "1a": {
      title: "Return air vent detail",
      description: "Dust and lint removed from HVAC grille slats",
      category: "kitchens",
      badge: "Add-on",
    },
    "1b": {
      title: "Oven cleaning add-on",
      description: "Inside-oven degrease & detail (add-on service)",
      category: "kitchens",
      badge: "Add-on",
    },
    "1c": {
      title: "Tub & tile refresh",
      description: "Bathtub, tile & fixtures restored",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "1d": {
      title: "Gas range surface detail",
      description: "Burnt-on spills & crumbs cleared from stovetop",
      category: "kitchens",
      badge: "Deep Reset",
    },
    "1e": {
      title: "Microwave interior detail",
      description: "Splatter and buildup removed inside microwave",
      category: "kitchens",
      badge: "Add-on",
    },
    "2a": {
      title: "Shower hard water restoration",
      description: "Glass, fixtures, corners & hard water stain removal",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "2b": {
      title: "Shower track & baseboard detail",
      description: "Door track grime and baseboard corners deep cleaned",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "2c": {
      title: "Bathroom floor refresh",
      description: "Tile floors swept, mopped & detail-cleaned",
      category: "living",
      badge: "Standard Clean",
    },
    "2d": {
      title: "Stair carpet deep clean",
      description: "Ground-in traffic stains lifted from carpeted stairs",
      category: "living",
      badge: "Deep Reset",
    },
    "2e": {
      title: "Shower mineral & rust removal",
      description: "Heavy rust and hard water buildup cleared from shower",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "3a": {
      title: "Move-out baseboard detail",
      description: "Baseboards & kick plates restored for turnover",
      category: "moveout",
      badge: "Move-out Turn",
    },
    "3b": {
      title: "Tub & tile restoration",
      description: "Grout, fixtures & tub surfaces refreshed",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "3c": {
      title: "Window track detail",
      description: "Interior window track cleaning (add-on)",
      category: "living",
      badge: "Add-on",
    },
    "3d": {
      title: "Window blind & mold detail",
      description: "Mildew spotting treated on blind slats & trim",
      category: "living",
      badge: "Deep Reset",
    },
    "3e": {
      title: "Bathtub rust & mineral removal",
      description: "Rust and hard water stains cleared from tub & drain",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "4a": {
      title: "Toilet & fixture deep clean",
      description: "Toilet, fixtures & hidden areas deep cleaned",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "4c": {
      title: "Behind-appliance floor detail",
      description: "Grime and buildup cleared behind kitchen appliances",
      category: "moveout",
      badge: "Move-out Turn",
    },
    "4d": {
      title: "Shower stall reset",
      description: "Soap scum and hard water staining removed from shower",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "4e": {
      title: "Sliding door track detail",
      description: "Built-up debris cleared from door tracks & threshold",
      category: "moveout",
      badge: "Full Reset",
    },
    "5a": {
      title: "Sliding door track restoration",
      description: "Door track grime removed for smooth operation",
      category: "living",
      badge: "Add-on",
    },
    "5b": {
      title: "Wall mark removal",
      description: "Crayon and scuff marks cleaned from painted walls",
      category: "living",
      badge: "Deep Reset",
    },
    "5c": {
      title: "Bedroom carpet refresh",
      description: "Spot treatment & deep vacuum — stains lifted from carpet",
      category: "living",
      badge: "Deep Reset",
    },
    "5d": {
      title: "Walk-in shower glass detail",
      description: "Glass, frame & tile — soap scum and buildup removed",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "6a": {
      title: "Toilet bowl deep clean",
      description: "Murky water and grime ring cleared from toilet bowl",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "6b": {
      title: "Microwave interior degrease",
      description: "Baked-on grease and food buildup removed from microwave floor",
      category: "kitchens",
      badge: "Add-on",
    },
    "6c": {
      title: "Glass cooktop restoration",
      description: "Grease splatters and dried spills cleared from gas cooktop",
      category: "kitchens",
      badge: "Deep Reset",
    },
    "6d": {
      title: "Shower handle limescale removal",
      description: "Heavy mineral buildup cleared from Moen escutcheon and handle",
      category: "bathrooms",
      badge: "Deep Reset",
    },
    "6e": {
      title: "Fiberglass shower stall reset",
      description: "Grime and buildup removed from seats, walls, and shower floor",
      category: "bathrooms",
      badge: "Deep Reset",
    },
  };

  function galleryItemKey(item) {
    const raw = String(item.id || "");
    const match = raw.match(/(?:gallery-)?(\d)([a-e])$/i);
    return match ? `${match[1]}${match[2].toLowerCase()}` : raw.toLowerCase();
  }

  function applyGalleryItemOverrides(items) {
    return items.map((item) => {
      const key = galleryItemKey(item);
      const patch = ITEM_OVERRIDES[key];
      const next = patch ? { ...item, ...patch } : { ...item };
      if (patch?.badge) next.badge = patch.badge;
      if (SWAP_BEFORE_AFTER_IDS.has(key)) {
        const before = next.beforeImageUrl;
        next.beforeImageUrl = next.afterImageUrl;
        next.afterImageUrl = before;
      }
      return next;
    });
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

  for (let set = 1; set <= 6; set += 1) {
    const letters = set === 5 ? ["a", "b", "c", "d"] : ["a", "b", "c", "d", "e"];
    const meta = SET_META[set];

    letters.forEach((letter) => {
      const id = `${set}${letter}`;
      if (SKIP_IDS.has(id)) return;

      items.push({
        id,
        set,
        letter,
        category: meta.category,
        badge: meta.badge,
        title: ITEM_OVERRIDES[id]?.title || meta.project,
        description: meta.description,
        beforeImageUrl: image(beforeFile(set, letter)),
        afterImageUrl: image(afterFile(set, letter)),
      });
    });
  }

  window.GALLERY_ITEMS = applyGalleryItemOverrides(items);
  window.applyGalleryItemOverrides = applyGalleryItemOverrides;
  window.HOME_GALLERY_LIMIT = 3;
})();
