function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGalleryPair(item) {
  return `
    <div class="gallery-pair" role="button" tabindex="0" aria-label="View ${escapeHtml(item.title)} before and after comparison">
      <div class="gallery-zoom-container">
        <span class="gallery-pane-label">Before</span>
        <img src="${escapeHtml(item.beforeImageUrl)}" alt="${escapeHtml(item.title)} before cleaning">
      </div>
      <div class="gallery-zoom-container">
        <span class="gallery-pane-label">After</span>
        <img src="${escapeHtml(item.afterImageUrl)}" alt="${escapeHtml(item.title)} after cleaning">
      </div>
      <button type="button" class="gallery-expand-btn" aria-label="Expand ${escapeHtml(item.title)} comparison">
        <i data-lucide="maximize-2"></i>
      </button>
    </div>
  `;
}

function renderGalleryCard(item, index) {
  const wipeClass = index === 0 ? " wipe-reveal" : "";
  const sparkle = index === 0
    ? `<div class="sparkle-accent" style="top:-15px; left:-15px;"><i data-lucide="sparkles" style="width:20px; height:20px;"></i></div>`
    : "";

  return `
    <article class="card gallery-card fade-in-up${wipeClass}" data-category="${escapeHtml(item.category)}" data-gallery-id="${escapeHtml(item.id)}" style="--delay: ${(index % 5) * 0.1}s;">
      ${sparkle}
      ${renderGalleryPair(item)}
      <div class="case-meta">
        <h3>${escapeHtml(item.title)}</h3>
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
window.renderGalleryPair = renderGalleryPair;
