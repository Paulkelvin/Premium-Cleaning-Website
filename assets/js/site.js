// site.js - Premium Interactive Interactions and UI Polish

const BRAND_LOGO_FILE = "rscleaningcollective_logo.png";
const BRAND_LOGO_ALT_FILE = "rscleaningcollective-logo.PNG";

function isUnderServicesSection(path) {
  return /\/services(?:\/|$)/i.test(path);
}

function getSiteAssetPrefix() {
  const path = String(window.location.pathname || "").replace(/\\/g, "/");
  return isUnderServicesSection(path) ? "../" : "";
}

function siteAssetPath(filename) {
  return `${getSiteAssetPrefix()}assets/images/${filename}`;
}

function createBrandLogoImg({ admin = false } = {}) {
  const img = document.createElement("img");
  img.className = admin ? "brand-logo brand-logo--admin" : "brand-logo";
  img.src = siteAssetPath(BRAND_LOGO_FILE);
  img.alt = "RS Cleaning Collective";
  img.decoding = "async";
  if (admin) {
    img.width = 40;
    img.height = 40;
  } else {
    img.width = 220;
    img.height = 72;
  }
  return img;
}

function isAltLogoContext(el) {
  return !!el.closest(".site-footer, .admin-sidebar");
}

function initBrandLogos() {
  document.querySelectorAll(".brand, .admin-brand").forEach((brand) => {
    const existing = brand.querySelector(".brand-logo");
    const mark = brand.querySelector(".brand-mark");
    const nameSpan = brand.querySelector("span:not(.brand-mark):not(.brand-logo)");
    const file = isAltLogoContext(brand) ? BRAND_LOGO_ALT_FILE : BRAND_LOGO_FILE;

    if (existing) {
      existing.src = siteAssetPath(file);
      if (mark) mark.remove();
      if (nameSpan) nameSpan.remove();
      return;
    }

    const isAdmin = brand.classList.contains("admin-brand");
    const img = createBrandLogoImg({ admin: isAdmin });
    img.src = siteAssetPath(file);
    if (mark) mark.replaceWith(img);
    else brand.prepend(img);
    if (nameSpan) nameSpan.remove();
  });

  document.querySelectorAll(".admin-brand-mark, .admin-login-mark").forEach((mark) => {
    if (mark.querySelector(".brand-logo") || mark.classList.contains("brand-logo")) return;
    mark.replaceWith(createBrandLogoImg({ admin: true }));
  });
}

function initSiteMeta() {
  const href = siteAssetPath(BRAND_LOGO_FILE);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.href = href;
}

function getSitePathPrefix() {
  return isUnderServicesSection(String(window.location.pathname || "").replace(/\\/g, "/"))
    ? "../"
    : "";
}

function getFooterServiceLinks() {
  const prefix = getSitePathPrefix();
  return [
    { label: "Standard cleaning", href: `${prefix}services/standard-cleaning.html` },
    { label: "Deep cleaning", href: `${prefix}services/deep-cleaning.html` },
    { label: "Move-in/out cleaning", href: `${prefix}services/move-in-out-cleaning.html` },
    { label: "Office cleaning", href: `${prefix}services/office-cleaning.html` },
    {
      label: "Airbnb turnovers",
      href: `${prefix}services/airbnb-turnover.html`
    },
    { label: "All services", href: `${prefix}services/index.html` }
  ];
}

function formatFooterAddonLabel(name) {
  return String(name || "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
}

function getPayNowHref() {
  if (document.getElementById("pay-now")) return "#pay-now";
  return `${getSitePathPrefix()}index.html#pay-now`;
}

function initFooterPayNowLink() {
  const href = getPayNowHref();
  document.querySelectorAll(".footer-grid").forEach((grid) => {
    const quickHeading = [...grid.querySelectorAll("h3")].find(
      (node) => node.textContent.trim().toLowerCase() === "quick links"
    );
    if (!quickHeading) return;
    const list = quickHeading.parentElement?.querySelector("ul");
    if (!list || list.querySelector("[data-footer-pay-now]")) return;

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("data-footer-pay-now", "");
    link.textContent = "Pay now";
    item.appendChild(link);

    const contactItem = [...list.querySelectorAll("a")].find((a) =>
      /contact/i.test(a.getAttribute("href") || "") || /contact/i.test(a.textContent)
    )?.parentElement;
    if (contactItem) list.insertBefore(item, contactItem);
    else list.appendChild(item);
  });
}

function getFooterAddonsHref() {
  const path = String(window.location.pathname || "").replace(/\\/g, "/");
  const onServicesIndex =
    /\/services\/index\.html$/i.test(path) || /\/services\/?$/i.test(path);
  if (onServicesIndex) return "#addons";
  return `${getSitePathPrefix()}services/index.html#addons`;
}

function getFooterAddonLinks() {
  const addOns = window.CLEANCO_CONFIG?.pricing?.addOns || {};
  const addonsHref = getFooterAddonsHref();
  const prefix = getSitePathPrefix();
  const seen = new Set();
  const links = [];

  const pushLink = (label, href) => {
    const key = String(label || "").trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    links.push({ label, href });
  };

  Object.keys(addOns).forEach((name) => {
    pushLink(formatFooterAddonLabel(name), addonsHref);
  });

  pushLink("Carpet cleaning", `${prefix}services/carpet-cleaning.html`);
  pushLink("Junk removal", `${prefix}services/junk-removal.html`);

  return links;
}

function detachLegacyFooterAddons(servicesColumn, grid) {
  const legacyHeading = [...servicesColumn.querySelectorAll("h3")].find(
    (node) => node.textContent.trim().toLowerCase() === "add-ons"
  );
  if (!legacyHeading) return null;

  let addonsColumn = grid.querySelector("[data-footer-addons-col]");
  if (!addonsColumn) {
    addonsColumn = document.createElement("div");
    addonsColumn.className = "footer-col footer-col--addons";
    addonsColumn.setAttribute("data-footer-addons-col", "");
    servicesColumn.insertAdjacentElement("afterend", addonsColumn);
  }

  if (!addonsColumn.querySelector("[data-footer-addons-heading]")) {
    legacyHeading.setAttribute("data-footer-addons-heading", "");
    addonsColumn.appendChild(legacyHeading);
  } else {
    legacyHeading.remove();
  }

  const legacyList = servicesColumn.querySelector("[data-footer-addons]");
  if (legacyList && !addonsColumn.querySelector("[data-footer-addons]")) {
    addonsColumn.appendChild(legacyList);
  }

  return addonsColumn;
}

function ensureFooterAddonsColumn(grid, servicesColumn) {
  let addonsColumn = grid.querySelector("[data-footer-addons-col]");
  if (!addonsColumn) {
    addonsColumn = document.createElement("div");
    addonsColumn.className = "footer-col footer-col--addons";
    addonsColumn.setAttribute("data-footer-addons-col", "");
    const contactColumn = [...grid.children].find((child) =>
      child.querySelector("h3")?.textContent.trim().toLowerCase() === "contact"
    );
    if (contactColumn) {
      grid.insertBefore(addonsColumn, contactColumn);
    } else {
      servicesColumn.insertAdjacentElement("afterend", addonsColumn);
    }
  }

  if (!addonsColumn.querySelector("[data-footer-addons-heading]")) {
    const heading = document.createElement("h3");
    heading.setAttribute("data-footer-addons-heading", "");
    heading.textContent = "Add-ons";
    addonsColumn.appendChild(heading);
  }

  if (!addonsColumn.querySelector("[data-footer-addons]")) {
    const list = document.createElement("ul");
    list.setAttribute("data-footer-addons", "");
    addonsColumn.appendChild(list);
  }

  return addonsColumn;
}

function normalizeFooterGridLayout(grid) {
  if (!grid || grid.querySelector(".footer-nav-columns")) return;

  const first = grid.firstElementChild;
  if (!first) return;

  first.classList.add("footer-brand-col");

  const nav = document.createElement("div");
  nav.className = "footer-nav-columns";

  const toMove = [...grid.children].filter((child) => child !== first);
  toMove.forEach((child) => nav.appendChild(child));
  grid.appendChild(nav);

  nav.querySelectorAll(":scope > div").forEach((col) => {
    const label = col.querySelector("h3")?.textContent.trim().toLowerCase();
    if (label === "contact") col.classList.add("footer-col--contact");
    if (label === "areas") col.classList.add("footer-col--areas");
  });
}

function initFooterCatalog() {
  const services = getFooterServiceLinks();
  const addons = getFooterAddonLinks();

  document.querySelectorAll(".footer-grid").forEach((grid) => {
    normalizeFooterGridLayout(grid);

    const servicesHeading = [...grid.querySelectorAll("h3")].find(
      (node) => node.textContent.trim().toLowerCase() === "services"
    );
    if (!servicesHeading) return;

    const servicesColumn = servicesHeading.parentElement;
    if (!servicesColumn) return;

    detachLegacyFooterAddons(servicesColumn, grid);

    let servicesList = servicesColumn.querySelector("[data-footer-services]");
    if (!servicesList) {
      servicesList = servicesColumn.querySelector("ul");
      if (servicesList) servicesList.setAttribute("data-footer-services", "");
    }
    if (servicesList) {
      servicesList.innerHTML = services
        .map((item) => `<li><a href="${item.href}">${item.label}</a></li>`)
        .join("");
    }

    const addonsColumn = ensureFooterAddonsColumn(grid, servicesColumn);
    const addonsList = addonsColumn.querySelector("[data-footer-addons]");
    if (addonsList) {
      addonsList.innerHTML = addons
        .map((item) => `<li><a href="${item.href}">${item.label}</a></li>`)
        .join("");
    }
  });
}

function initFooterQuickPolicyLinks() {
  const prefix = getSitePathPrefix();
  const href = `${prefix}cancellation-policy.html`;

  document.querySelectorAll(".footer-grid").forEach((grid) => {
    const quickHeading = [...grid.querySelectorAll("h3")].find(
      (node) => node.textContent.trim().toLowerCase() === "quick links"
    );
    if (!quickHeading) return;
    const list = quickHeading.parentElement?.querySelector("ul");
    if (!list || list.querySelector("[data-footer-cancellation]")) return;

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("data-footer-cancellation", "");
    link.textContent = "Cancellation policy";
    item.appendChild(link);
    list.appendChild(item);
  });
}

function initFooterLegalLinks() {
  const prefix = getSitePathPrefix();
  const cancellationHref = `${prefix}cancellation-policy.html`;
  const privacyHref = `${prefix}privacy.html`;
  const termsHref = `${prefix}terms.html`;

  document.querySelectorAll(".footer-bottom > span:last-child").forEach((row) => {
    if (row.querySelector(`a[href="${cancellationHref}"]`)) return;

    const privacy = row.querySelector(`a[href="${privacyHref}"]`);
    const terms = row.querySelector(`a[href="${termsHref}"]`);
    if (!privacy || !terms) return;

    const cancellation = document.createElement("a");
    cancellation.href = cancellationHref;
    cancellation.textContent = "Cancellation Policy";

    const sep = document.createTextNode(" · ");
    terms.parentNode.insertBefore(sep, terms);
    terms.parentNode.insertBefore(cancellation, sep);
  });
}

function initHeaderPayLink() {
  const href = getPayNowHref();
  document.querySelectorAll(".site-nav").forEach((nav) => {
    if (nav.querySelector("[data-nav-pay]")) return;

    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("data-nav-pay", "");
    link.textContent = "Pay";

    const quoteButton = [...nav.querySelectorAll("a.button")].find((a) =>
      /quote/i.test(a.getAttribute("href") || "") || /quote/i.test(a.textContent)
    );
    if (quoteButton) nav.insertBefore(link, quoteButton);
    else nav.appendChild(link);
  });
}

function getFacebookUrl() {
  const cfg = window.CLEANCO_CONFIG || {};
  return typeof cfg.facebookUrl === "string" ? cfg.facebookUrl.trim() : "";
}

function initFooterSocialLinks() {
  const url = getFacebookUrl();
  if (!url) return;

  document.querySelectorAll(".footer-grid").forEach((grid) => {
    const brandCol = grid.querySelector("div");
    if (!brandCol || brandCol.querySelector("[data-footer-social]")) return;

    const wrap = document.createElement("div");
    wrap.className = "footer-social";
    wrap.setAttribute("data-footer-social", "");

    const link = document.createElement("a");
    link.className = "footer-social-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", "Follow RS Cleaning Collective on Facebook");

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "facebook");
    link.appendChild(icon);

    const label = document.createElement("span");
    label.textContent = "Follow us on Facebook";
    link.appendChild(label);

    wrap.appendChild(link);
    brandCol.appendChild(wrap);
  });
}

function bootSiteUi() {
  document.documentElement.classList.add("js");

  try {
    initBrandLogos();
    initSiteMeta();

    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });

    initHeaderPayLink();
    initFooterLegalLinks();
    initFooterPayNowLink();
    initFooterQuickPolicyLinks();
    initFooterCatalog();
    initFooterSocialLinks();
    document.querySelectorAll(".footer-grid").forEach(normalizeFooterGridLayout);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    const navToggle = document.querySelector(".nav-toggle");
    const siteNav = document.querySelector(".site-nav");
    if (navToggle && siteNav && siteNav.dataset.navBound !== "true") {
      siteNav.dataset.navBound = "true";

      const closeMobileNav = () => {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = "☰";
        document.body.classList.remove("nav-menu-open");
      };

      const openMobileNav = () => {
        siteNav.classList.add("is-open");
        navToggle.setAttribute("aria-expanded", "true");
        navToggle.innerHTML = "✕";
        document.body.classList.add("nav-menu-open");
      };

      const navigateFromNavLink = (link, e) => {
        const href = link.getAttribute("href");
        if (!href) return;
        if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
        if (href.startsWith("#")) {
          const target = href.length > 1 ? document.getElementById(href.slice(1)) : null;
          closeMobileNav();
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            try { history.replaceState(null, "", href); } catch (_) {}
          }
          return;
        }
        const targetUrl = new URL(href, window.location.href).href;
        closeMobileNav();
        window.location.href = targetUrl;
      };

      navToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (siteNav.classList.contains("is-open")) closeMobileNav();
        else openMobileNav();
      });

      siteNav.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link || !siteNav.contains(link)) return;
        e.preventDefault();
        e.stopPropagation();
        navigateFromNavLink(link, e);
      });

      siteNav.addEventListener("touchend", (e) => {
        const link = e.target.closest("a[href]");
        if (!link || !siteNav.contains(link) || !siteNav.classList.contains("is-open")) return;
        e.preventDefault();
        navigateFromNavLink(link, e);
      }, { passive: false });

      document.addEventListener("click", (e) => {
        if (!siteNav.classList.contains("is-open")) return;
        if (navToggle.contains(e.target) || siteNav.contains(e.target)) return;
        closeMobileNav();
      });
    }

    initAccordions();
    initOnPageSliders();
    initLightboxTriggers();
    initScrollReveal();
    initScrollRevealSafetyNet();
    initReviewsSectionReveal();
    initHomepageBubbles();
    initGalleryFilters();
    initTestimonialSlider();
    initHomeReviewsCarousel();
    initContactPage();
    applyContactOverrides();
    initAdminReturnLink();

    document.querySelectorAll("[data-copy-config]").forEach((node) => {
      const key = node.getAttribute("data-copy-config");
      if (window.CLEANCO_CONFIG?.[key]) node.textContent = window.CLEANCO_CONFIG[key];
    });
  } catch (error) {
    console.error("Site UI bootstrap error:", error);
    revealAllScrollContent();
  }
}

document.addEventListener("DOMContentLoaded", bootSiteUi);

if (document.body) {
  initBrandLogos();
  initSiteMeta();
}

// Testimonial slider logic
function initTestimonialSlider() {
  const track = document.getElementById("testimonialTrack");
  const prevBtn = document.getElementById("prevTestimonial");
  const nextBtn = document.getElementById("nextTestimonial");
  if (!track || !prevBtn || !nextBtn) return;

  let currentIndex = 0;
  
  function updateSlider() {
    const slide = track.querySelector(".slide") || track.querySelector(".card");
    if (!slide) return;
    const slideWidth = slide.offsetWidth;
    const gap = 24; // from CSS gap
    const moveAmount = slideWidth + gap;
    track.style.transform = `translateX(-${currentIndex * moveAmount}px)`;
  }

  nextBtn.addEventListener("click", () => {
    const totalSlides = track.children.length;
    const slidesVisible = window.innerWidth >= 768 ? 3 : 1; // Basic responsive check
    if (currentIndex < totalSlides - slidesVisible) {
      currentIndex++;
      updateSlider();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlider();
    }
  });

  window.addEventListener("resize", () => {
    currentIndex = 0;
    updateSlider();
  });
}

function syncHomeReviewsMarqueeDistance(track) {
  if (!track) return;
  const cards = track.querySelectorAll(".review-card");
  if (cards.length < 2) {
    track.style.removeProperty("--reviews-marquee-distance");
    return;
  }
  const half = Math.ceil(cards.length / 2);
  const first = cards[0];
  const firstDup = cards[half];
  if (!first || !firstDup) {
    track.style.removeProperty("--reviews-marquee-distance");
    return;
  }
  const distance = firstDup.offsetLeft - first.offsetLeft;
  if (distance > 0) {
    track.style.setProperty("--reviews-marquee-distance", `-${distance}px`);
  }
}

function initHomeReviewsCarousel() {
  const track = document.getElementById("homeReviewsTrack");
  if (!track || track.dataset.bound === "true") return;
  track.dataset.bound = "true";

  const setupReviewCardScroll = (card) => {
    let text = card.querySelector(".review-text");
    if (!text || card.dataset.scrollReady === "true") return;
    card.dataset.scrollReady = "true";

    if (!text.closest(".review-body")) {
      const body = document.createElement("div");
      body.className = "review-body";
      text.parentNode.insertBefore(body, text);
      body.appendChild(text);
      const hint = document.createElement("span");
      hint.className = "review-scroll-hint";
      hint.textContent = "Scroll for more";
      body.appendChild(hint);
    }

    const body = card.querySelector(".review-body");
    const updateOverflow = () => {
      if (!body || !text) return;
      const hasOverflow = text.scrollHeight > text.clientHeight + 2;
      body.classList.toggle("has-overflow", hasOverflow);
      const atEnd = text.scrollTop + text.clientHeight >= text.scrollHeight - 4;
      body.classList.toggle("is-scrolled-end", atEnd);
    };

    text.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow);
    requestAnimationFrame(updateOverflow);
  };

  track.querySelectorAll(".review-card").forEach(setupReviewCardScroll);

  const originalCards = [...track.children].filter((node) => node.classList?.contains("review-card"));
  originalCards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });
  track.querySelectorAll(".review-card").forEach(setupReviewCardScroll);

  const applyMarqueeMotion = () => {
    syncHomeReviewsMarqueeDistance(track);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.style.animation = reduceMotion ? "none" : "";
  };

  applyMarqueeMotion();
  if (!track.dataset.marqueeResizeBound) {
    track.dataset.marqueeResizeBound = "true";
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(() => syncHomeReviewsMarqueeDistance(track));
    });
  }
}

window.initHomeReviewsCarousel = initHomeReviewsCarousel;

// Accordions logic
window.initAccordions = function initAccordions() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    const panel = item.querySelector(".faq-panel");
    if (!trigger || !panel || trigger.dataset.accordionBound === "true") return;

    trigger.dataset.accordionBound = "true";
    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      
      // Close other FAQs
      document.querySelectorAll(".faq-item.is-open").forEach((other) => {
        if (other !== item) {
          other.classList.remove("is-open");
          other.querySelector(".faq-panel").style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove("is-open");
        panel.style.maxHeight = null;
      } else {
        item.classList.add("is-open");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
}

// Magnifier logic — side-by-side containers and comparison sliders
function initMagnifiers(root = document) {
  root.querySelectorAll(".gallery-zoom-container").forEach((container) => {
    if (container.dataset.magnifierInit) return;

    const img = container.querySelector("img");
    if (!img) return;

    container.dataset.magnifierInit = "true";
    attachZoomLens(container, () => img);
  });

  root.querySelectorAll("[data-comparison-slider], .lightbox-modal .slider-container").forEach((container) => {
    if (container.dataset.magnifierInit) return;

    const beforeImg = container.querySelector(".img-before");
    const afterImg = container.querySelector(".img-after");
    if (!beforeImg || !afterImg) return;

    container.dataset.magnifierInit = "true";
    attachZoomLens(container, (event, rect) => {
      const bar = container.querySelector(".slider-bar");
      const splitPercent = bar ? parseFloat(bar.style.left) || 50 : 50;
      const splitX = (splitPercent / 100) * rect.width;
      const x = event.clientX - rect.left;
      return x < splitX ? beforeImg : afterImg;
    });
  });
}

function attachZoomLens(container, getImageSource) {
  const lens = document.createElement("div");
  lens.className = "zoom-lens";
  container.appendChild(lens);

  const hideLens = () => {
    lens.style.opacity = "0";
    lens.style.transform = "scale(0)";
  };

  container.addEventListener("mousemove", (event) => {
    if (event.buttons === 1) {
      hideLens();
      return;
    }

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      hideLens();
      return;
    }

    const img = typeof getImageSource === "function" && getImageSource.length >= 2
      ? getImageSource(event, rect)
      : getImageSource();

    if (!img?.src) return;

    lens.style.backgroundImage = `url('${img.src}')`;
    lens.style.left = `${x - 70}px`;
    lens.style.top = `${y - 70}px`;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    lens.style.backgroundPosition = `${percentX}% ${percentY}%`;
    lens.style.backgroundSize = `${rect.width * 2.2}px ${rect.height * 2.2}px`;
    lens.style.opacity = "1";
    lens.style.transform = "scale(1)";
  });

  container.addEventListener("mouseleave", hideLens);
}

function initLightboxTriggers() {
  /* Slider containers handle expand/lightbox clicks in initOnPageSliders */
}

function initOnPageSliders() {
  document.querySelectorAll(".slider-container").forEach((container) => {
    if (container.dataset.sliderInitialized) return;
    container.dataset.sliderInitialized = "true";

    const afterImg = container.querySelector(".img-after");
    const bar = container.querySelector(".slider-bar");
    const button = container.querySelector(".slider-button");
    const expandBtn = container.querySelector(".slider-expand-btn");

    if (!afterImg || !bar || !button) return;

    let isDragging = false;
    let hasDragged = false;
    let startX = 0;

    const moveSlider = (clientX) => {
      const rect = container.getBoundingClientRect();
      let x = clientX - rect.left;
      if (x < 0) x = 0;
      if (x > rect.width) x = rect.width;
      const percent = (x / rect.width) * 100;

      afterImg.style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
      bar.style.left = `${percent}%`;
      button.style.left = `${percent}%`;
    };

    const startDrag = (e) => {
      isDragging = true;
      hasDragged = false;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
    };

    const stopDrag = () => {
      isDragging = false;
    };

    container.querySelectorAll("img").forEach(img => {
      img.addEventListener("dragstart", (e) => e.preventDefault());
    });

    bar.addEventListener("mousedown", startDrag);
    container.addEventListener("mousedown", startDrag);

    bar.addEventListener("touchstart", startDrag, { passive: true });
    container.addEventListener("touchstart", startDrag, { passive: true });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const clientX = e.clientX;
      if (Math.abs(clientX - startX) > 4) {
        hasDragged = true;
      }
      moveSlider(clientX);
    });

    window.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const clientX = e.touches[0].clientX;
      if (Math.abs(clientX - startX) > 4) {
        hasDragged = true;
      }
      moveSlider(clientX);
    }, { passive: true });

    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchend", stopDrag);

    if (expandBtn) {
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const card = container.closest(".gallery-card") || container.parentElement;
        const title = card.querySelector("h3")?.textContent || "Before & After Reset";
        const imgBefore = container.querySelector(".img-before")?.src || "";
        const imgAfter = container.querySelector(".img-after")?.src || "";
        openLightbox(imgBefore, imgAfter, title);
      });
    }

    container.addEventListener("click", (e) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      if (e.target.closest(".slider-expand-btn")) return;
      
      const card = container.closest(".gallery-card") || container.parentElement;
      const title = card.querySelector("h3")?.textContent || "Before & After Reset";
      const imgBefore = container.querySelector(".img-before")?.src || "";
      const imgAfter = container.querySelector(".img-after")?.src || "";
      openLightbox(imgBefore, imgAfter, title);
    });
  });
}

function openLightbox(beforeSrc, afterSrc, title) {
  let modal = document.querySelector("#gallery-lightbox");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "gallery-lightbox";
    modal.className = "lightbox-modal";
    modal.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" type="button" aria-label="Close gallery">&times;</button>
        <h3 id="lightbox-title" style="margin-bottom:4px; font-size: 1.4rem;">Before & After</h3>
        <p style="margin-bottom:20px; font-size:0.95rem; color: var(--muted);">Drag the center slider to compare the transformation side-by-side.</p>
        <div class="slider-container">
          <img class="slider-img img-before" src="" alt="Before">
          <img class="slider-img img-after" src="" alt="After">
          <div class="slider-bar"></div>
          <div class="slider-button">↔</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".lightbox-close").addEventListener("click", () => {
      modal.classList.remove("is-open");
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("is-open");
    });

    // Slider comparison logic
    const container = modal.querySelector(".slider-container");
    const afterImg = modal.querySelector(".img-after");
    const bar = modal.querySelector(".slider-bar");
    const button = modal.querySelector(".slider-button");
    let isDragging = false;

    const moveSlider = (clientX) => {
      const rect = container.getBoundingClientRect();
      let x = clientX - rect.left;
      if (x < 0) x = 0;
      if (x > rect.width) x = rect.width;
      const percent = (x / rect.width) * 100;

      afterImg.style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
      bar.style.left = `${percent}%`;
      button.style.left = `${percent}%`;
    };

    const startDrag = () => { isDragging = true; };
    const stopDrag = () => { isDragging = false; };

    bar.addEventListener("mousedown", startDrag);
    container.addEventListener("mousedown", startDrag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      moveSlider(e.clientX);
    });

    // Touch support
    bar.addEventListener("touchstart", startDrag);
    container.addEventListener("touchstart", startDrag);
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      moveSlider(e.touches[0].clientX);
    });
  }

  modal.querySelector("#lightbox-title").textContent = title;
  modal.querySelector(".img-before").src = beforeSrc;
  
  const afterImg = modal.querySelector(".img-after");
  afterImg.src = afterSrc;
  afterImg.style.clipPath = "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)";
  
  modal.querySelector(".slider-bar").style.left = "50%";
  modal.querySelector(".slider-button").style.left = "50%";

  initMagnifiers(modal);
  modal.classList.add("is-open");
}

// Scroll animation logic
let scrollRevealObserver;

const REVEAL_SELECTORS = ".fade-in-up, .fade-in-left, .fade-in-right, .steps";
const REVEAL_STAGGER_PARENTS = ".grid, .steps, [data-gallery-list], .home-proof-bar-inner, .premium-features, .faq-list, .split, .service-cards-stack";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function assignRevealStagger(el) {
  const parent = el.closest(REVEAL_STAGGER_PARENTS);
  if (!parent) return;

  const siblings = [...parent.children].filter((child) =>
    child.matches(".fade-in-up, .fade-in-left, .fade-in-right, .gallery-card, .step, .faq-item, .service-card-horizontal")
  );
  const index = siblings.indexOf(el);
  if (index >= 0) {
    const isGalleryList = parent.matches("[data-gallery-list]");
    const step = isGalleryList ? 0.045 : 0.09;
    const maxDelay = isGalleryList ? 0.24 : 0.54;
    const delay = Math.min(index * step, maxDelay);
    el.style.setProperty("--delay", `${delay}s`);
  }
}

function assignProofBarStagger(container) {
  container.querySelectorAll(".home-proof-compact li, .home-proof-stats li").forEach((item, index) => {
    item.style.setProperty("--delay", `${index * 0.12}s`);
  });
}

function revealElement(el) {
  if (el.classList.contains("appeared")) return;
  el.classList.add("appeared");

  if (el.classList.contains("home-proof-bar-inner") || el.classList.contains("home-proof-compact")) {
    assignProofBarStagger(el);
  }
}

function isElementInRevealViewport(el) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.96 && rect.bottom > vh * 0.04;
}

function revealVisibleInViewport() {
  document.querySelectorAll(`${REVEAL_SELECTORS}:not(.appeared)`).forEach((el) => {
    if (!isElementInRevealViewport(el)) return;
    revealElement(el);
    scrollRevealObserver?.unobserve(el);
  });
}

let scrollRevealSafetyTimer;
function scheduleScrollRevealSafetyCheck() {
  window.clearTimeout(scrollRevealSafetyTimer);
  scrollRevealSafetyTimer = window.setTimeout(revealVisibleInViewport, 120);
}

function revealAllScrollContent() {
  document.querySelectorAll(REVEAL_SELECTORS).forEach(revealElement);
}

function initScrollRevealSafetyNet() {
  if (window.__scrollRevealSafetyBound) return;
  window.__scrollRevealSafetyBound = true;

  window.addEventListener("scroll", scheduleScrollRevealSafetyCheck, { passive: true });
  window.addEventListener("resize", scheduleScrollRevealSafetyCheck, { passive: true });
  window.addEventListener("pageshow", () => {
    scheduleScrollRevealSafetyCheck();
    window.setTimeout(revealVisibleInViewport, 0);
  });

  window.setTimeout(revealVisibleInViewport, 350);
  window.setTimeout(revealVisibleInViewport, 1200);
  window.setTimeout(revealAllScrollContent, 3500);
}

function initReviewsSectionReveal() {
  const section = document.querySelector(".reviews-section");
  if (!section || section.dataset.reviewsRevealBound === "true") return;
  section.dataset.reviewsRevealBound = "true";

  const revealReviewsBlock = () => {
    section.querySelectorAll(`${REVEAL_SELECTORS}:not(.appeared)`).forEach(revealElement);
    section.classList.add("is-visible");
  };

  if (prefersReducedMotion()) {
    revealReviewsBlock();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      revealReviewsBlock();
      observer.disconnect();
    },
    { threshold: 0, rootMargin: "120px 0px 120px 0px" }
  );
  observer.observe(section);
  revealVisibleInViewport();
}

function initScrollReveal({ revealVisibleNow = false } = {}) {
  if (prefersReducedMotion()) {
    document.querySelectorAll(REVEAL_SELECTORS).forEach((el) => revealElement(el));
    return;
  }

  if (!scrollRevealObserver) {
    scrollRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealElement(entry.target);
        scrollRevealObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.01,
      rootMargin: "0px 0px 22% 0px",
    });
  }

  document.querySelectorAll(`${REVEAL_SELECTORS}:not([data-reveal-observed])`).forEach((el) => {
    if (el.matches("form, .service-chooser, [id$='Chooser']")) {
      el.dataset.revealObserved = "true";
      revealElement(el);
      return;
    }
    assignRevealStagger(el);
    el.dataset.revealObserved = "true";
    scrollRevealObserver.observe(el);
  });

  revealVisibleInViewport();
  if (revealVisibleNow) {
    revealVisibleInViewport();
  }
}

window.initScrollReveal = initScrollReveal;

// Expose accordion and magnifier updates for dynamically rendered items
window.refreshInteractiveFeatures = () => {
  initAccordions();
  initMagnifiers();
  initOnPageSliders();
  initHomeReviewsCarousel();
  initReviewsSectionReveal();
  initScrollReveal({ revealVisibleNow: true });
  scheduleScrollRevealSafetyCheck();
};

// 7. Cleaning-themed Homepage Bubbles
function initHomepageBubbles() {
  if (document.body.dataset.sanityPage !== "home") return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const overlay = document.createElement("div");
  overlay.className = "bubbles-overlay";
  document.body.appendChild(overlay);

  for (let i = 0; i < 20; i++) {
    const bubble = document.createElement("div");
    bubble.className = "initial-bubble";
    const size = Math.random() * 30 + 15;
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = Math.random() * 0.6 + 1.2;
    
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${left}%`;
    bubble.style.animationDelay = `${delay}s`;
    bubble.style.animationDuration = `${duration}s`;
    
    overlay.appendChild(bubble);
  }

  setTimeout(() => overlay.remove(), 2500);
}

// 8. Gallery Filtering
function initGalleryFilters() {
  const filterWrap = document.querySelector(".gallery-filters");
  if (!filterWrap || filterWrap.dataset.filtersInitialized) return;
  filterWrap.dataset.filtersInitialized = "true";

  filterWrap.addEventListener("click", (event) => {
    const tab = event.target.closest(".gallery-filter-btn");
    if (!tab) return;

    filterWrap.querySelectorAll(".gallery-filter-btn").forEach((button) => {
      button.classList.remove("active");
    });
    tab.classList.add("active");

    const filter = tab.dataset.filter;
    document.querySelectorAll(".gallery-card").forEach((card) => {
      card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      if (filter === "all" || card.dataset.category === filter) {
        card.style.display = "block";
        void card.offsetWidth;
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      } else {
        card.style.opacity = "0";
        card.style.transform = "translateY(10px)";
        setTimeout(() => {
          if (card.style.opacity === "0") card.style.display = "none";
        }, 300);
      }
    });
  });
}

window.initGalleryFilters = initGalleryFilters;

function initContactPage() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const firstName = document.getElementById("contactFirstName");
  const lastName = document.getElementById("contactLastName");
  const fullName = document.getElementById("contactFullName");
  const inquirySelect = document.getElementById("contactInquiryType");

  const syncFullName = () => {
    if (!fullName || !firstName || !lastName) return;
    fullName.value = `${firstName.value.trim()} ${lastName.value.trim()}`.trim();
  };

  firstName?.addEventListener("input", syncFullName);
  lastName?.addEventListener("input", syncFullName);

  const phoneInput = form.querySelector("[data-phone-format]");
  phoneInput?.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) phoneInput.value = digits;
    else if (digits.length <= 6) phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    else phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  });

  form.addEventListener("submit", () => syncFullName(), true);

  const params = new URLSearchParams(window.location.search);
  const inquiry = params.get("inquiry");

  if (inquiry === "custom-quote" && inquirySelect) {
    const propertyOption = inquirySelect.querySelector('option[data-inquiry="property"]');
    if (propertyOption) propertyOption.selected = true;
    const textarea = form.querySelector('textarea[name="message"]');
    if (textarea && !textarea.value) {
      textarea.value = "I'd like a custom quote for my property. Please contact me to discuss scope and pricing.";
    }
  }

  if (inquiry === "consultation" && inquirySelect) {
    const consultationOption = inquirySelect.querySelector('option[data-inquiry="consultation"]');
    if (consultationOption) consultationOption.selected = true;
    const textarea = form.querySelector('textarea[name="message"]');
    if (textarea && !textarea.value) {
      textarea.placeholder = "Preferred days/times for a call, your space, or any questions…";
    }
  }
}

function applyContactOverrides() {
  const config = window.CLEANCO_CONFIG || {};
  const phone = String(config.phone || "").trim();
  const email = String(config.email || "").trim();
  const address = String(config.address || config.locationLabel || "").trim();
  const locationLabel = String(config.locationLabel || "Southern Maryland").trim();
  const serviceAreaSummary = String(config.serviceArea || "").trim();
  const serviceAreas = Array.isArray(config.serviceAreas) ? config.serviceAreas.filter(Boolean) : [];

  if (phone) {
    const telHref = `tel:${phone.replace(/[^+\d]/g, "")}`;
    document.querySelectorAll("a[href^='tel:']").forEach((node) => {
      node.textContent = phone;
      node.setAttribute("href", telHref);
    });
  }

  if (email) {
    const mailto = email.includes("@") ? `mailto:${email}` : email;
    document.querySelectorAll("a[href^='mailto:']").forEach((node) => {
      node.textContent = email;
      node.setAttribute("href", mailto);
    });
  }

  document.querySelectorAll("[data-sanity-service-area], [data-copy-config='serviceArea']").forEach((node) => {
    if (serviceAreaSummary) node.textContent = serviceAreaSummary;
  });

  document.querySelectorAll("[data-copy-config='address']").forEach((node) => {
    if (address) node.textContent = address;
  });

  document.querySelectorAll(".site-footer").forEach((footer) => {
    const headings = [...footer.querySelectorAll("h3")];
    const contactHeading = headings.find((node) => node.textContent.trim().toLowerCase() === "contact");
    const areasHeading = headings.find((node) => node.textContent.trim().toLowerCase() === "areas");

    if (contactHeading) {
      const contactList = contactHeading.parentElement?.querySelector("ul");
      if (contactList) {
        contactList.innerHTML = `
          <li>${phone ? `<a href="tel:${phone.replace(/[^+\d]/g, "")}">${phone}</a>` : ""}</li>
          <li>${email ? (email.includes("@") ? `<a href="mailto:${email}">${email}</a>` : email) : ""}</li>
          <li>${address || locationLabel || serviceAreaSummary}</li>
        `;
      }
    }

    if (areasHeading && serviceAreas.length) {
      const areasList = areasHeading.parentElement?.querySelector("ul");
      if (areasList) {
        areasList.innerHTML = serviceAreas.map((area) => `<li>${area}</li>`).join("");
      }
    }
  });
}

function ensureAppToastHost() {
  let host = document.getElementById("app-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "app-toast-host";
    host.className = "app-toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  let toast = host.querySelector(".app-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "app-toast";
    toast.setAttribute("role", "alert");
    host.appendChild(toast);
  }
  return toast;
}

function showAppToast(message, type = "error") {
  const toast = ensureAppToastHost();
  toast.textContent = message;
  toast.className = `app-toast is-${type}`;
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  if (toast._hideTimer) clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("is-visible"), 5200);
}

function scrollFieldIntoView(element, { extraOffset = 16 } = {}) {
  if (!element) return;
  const target = element.closest(".field, .book-schedule-block, .book-time-grid, .quote-fieldset, .quote-option-grid, .contact-ui-form")
    || element;
  const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const targetTop = Math.max(0, rect.top + window.scrollY - headerHeight - extraOffset);
    if (Math.abs(window.scrollY - targetTop) > 2) {
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  });
}

function markFieldInvalid(input) {
  if (!input) return;
  const target = input.closest(".field, .book-time-option, .book-schedule-block, .quote-option, .quote-fieldset")
    || input;
  target.classList.add("is-invalid");
}

function clearFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

window.showAppToast = showAppToast;
window.scrollFieldIntoView = scrollFieldIntoView;
window.markFieldInvalid = markFieldInvalid;
window.clearFieldErrors = clearFieldErrors;

function initAdminReturnLink() {
  if (document.body.classList.contains("admin-shell")) return;
  let token = null;
  try {
    token = window.sessionStorage.getItem("cleanco_admin_token") || window.localStorage.getItem("cleanco_admin_token");
  } catch {}
  if (!token) return;

  if (document.querySelector("[data-admin-return-link]")) return;
  const link = document.createElement("a");
  link.href = "admin-dashboard.html";
  link.className = "admin-return-link";
  link.setAttribute("data-admin-return-link", "");
  link.innerHTML = '<i data-lucide="layout-dashboard"></i><span>Admin</span>';
  document.body.appendChild(link);
  if (typeof lucide !== "undefined") lucide.createIcons({ root: link });
}
