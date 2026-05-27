function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGalleryCard(item, index) {
  const wipeClass = index === 0 ? " wipe-reveal" : "";
  const sparkle = index === 0
    ? `<div class="sparkle-accent" style="top:-15px; left:-15px;"><i data-lucide="sparkles" style="width:20px; height:20px;"></i></div>`
    : "";

  return `
    <article class="card gallery-card fade-in-up${wipeClass}" data-category="${escapeHtml(item.category)}" data-gallery-id="${escapeHtml(item.id)}" style="--delay: ${(index % 5) * 0.1}s;">
      ${sparkle}
      <div class="gallery-slider">
        <div class="slider-container">
          <span class="case-badge">${escapeHtml(item.badge)}</span>
          <img class="slider-img img-before" src="${escapeHtml(item.beforeImageUrl)}" alt="${escapeHtml(item.title)} before">
          <img class="slider-img img-after" src="${escapeHtml(item.afterImageUrl)}" alt="${escapeHtml(item.title)} after">
          <div class="slider-bar"></div>
          <div class="slider-button">↔</div>
          <span class="slider-label label-before">Before</span>
          <span class="slider-label label-after">After</span>
          <div class="slider-hint"><i data-lucide="chevrons-left-right" style="width:12px;height:12px;"></i> Slide</div>
          <button class="slider-expand-btn" aria-label="Expand image comparison"><i data-lucide="maximize-2"></i></button>
        </div>
      </div>
      <div class="case-meta">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="case-metric">Project ${item.set} · Set ${item.letter.toUpperCase()}</span>
      </div>
      <p class="gallery-outcome">${escapeHtml(item.description)}</p>
    </article>
  `;
}

function getHomeGalleryItems() {
  const preferredIds = ["1a", "2a", "3a"];
  const picked = preferredIds
    .map((id) => window.GALLERY_ITEMS.find((item) => item.id === id))
    .filter(Boolean);

  if (picked.length >= (window.HOME_GALLERY_LIMIT || 3)) {
    return picked.slice(0, window.HOME_GALLERY_LIMIT || 3);
  }

  return window.GALLERY_ITEMS.slice(0, window.HOME_GALLERY_LIMIT || 3);
}

function renderGallery(options = {}) {
  const list = document.querySelector("[data-gallery-list]");
  if (!list || !window.GALLERY_ITEMS?.length) return;

  const items = options.limit
    ? getHomeGalleryItems()
    : window.GALLERY_ITEMS;

  list.innerHTML = items.map((item, index) => renderGalleryCard(item, index)).join("");

  const footer = document.querySelector("[data-gallery-footer]");
  if (footer) {
    const total = window.GALLERY_ITEMS.length;
    const shown = items.length;
    const remaining = total - shown;
    footer.hidden = !options.showSeeMore || remaining <= 0;

    const countEl = footer.querySelector("[data-gallery-count]");
    if (countEl) countEl.textContent = String(total);
  }

  if (typeof window.refreshInteractiveFeatures === "function") {
    window.refreshInteractiveFeatures();
  }
  if (typeof window.initGalleryFilters === "function") {
    window.initGalleryFilters();
  }
  if (typeof window.initScrollReveal === "function") {
    window.initScrollReveal({ revealVisibleNow: true });
  }
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-gallery-list]")) return;

  const isHome = document.body.dataset.sanityPage === "home";
  renderGallery({
    limit: isHome ? window.HOME_GALLERY_LIMIT || 3 : null,
    showSeeMore: isHome,
  });
});

window.renderGallery = renderGallery;
