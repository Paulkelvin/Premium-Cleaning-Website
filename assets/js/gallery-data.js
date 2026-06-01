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
  };

  const AFTER_FILE_OVERRIDES = {
    "4a": "After 4a .jpeg",
    "4c": "After 4c .jpeg",
  };

  const SKIP_IDS = new Set(["4b"]);

  /** Per photo (set + letter). IDs match filenames: Before/After 1b.jpeg → "1b". */
  const ITEM_OVERRIDES = {
    "1b": {
      category: "kitchens",
      badge: "Add-on",
      title: "Oven cleaning add-on · View B",
      description: "Inside-oven degrease & detail (add-on service)",
    },
    "1c": {
      category: "bathrooms",
      badge: "Deep Reset",
      title: "Bathroom detail · View C",
      description: "Tub, tile & fixtures refreshed",
    },
    "2c": {
      category: "living",
      badge: "Standard Clean",
      title: "Living space refresh · View C",
      description: "Floors refreshed · Standard care",
    },
    "2a": {
      description:
        "Glass, fixtures, corners & hard water stain removal",
    },
    "2e": {
      description:
        "Glass, fixtures, corners & hard water stain removal",
    },
    "3a": {
      category: "moveout",
      badge: "Move-out Turn",
      title: "Move-out restoration · View A",
      description: "Baseboards & kick plates restored for turnover",
    },
    "3c": {
      category: "living",
      badge: "Add-on",
      title: "Window track detail · View C",
      description: "Interior window track cleaning (add-on)",
    },
    "4a": {
      category: "bathrooms",
      badge: "Deep Reset",
      title: "Bathroom detail · View A",
      description: "Toilet, fixtures & hidden areas deep cleaned",
    },
    "4d": {
      category: "living",
      badge: "Regular Care",
      title: "Living space refresh · View D",
      description: "Living area reset for a calmer feel",
    },
    "4e": {
      category: "moveout",
      badge: "Full Reset",
      title: "Full property reset · View E",
      description: "Whole-home refresh from top to bottom",
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
      if (!patch) return item;
      return { ...item, ...patch };
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

  for (let set = 1; set <= 5; set += 1) {
    const letters = set === 5 ? ["a", "b"] : ["a", "b", "c", "d", "e"];
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
        title: `${meta.project} · View ${letter.toUpperCase()}`,
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
