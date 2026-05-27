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

  window.GALLERY_ITEMS = items;
  window.HOME_GALLERY_LIMIT = 3;
})();
