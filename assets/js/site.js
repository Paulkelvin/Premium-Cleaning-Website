// site.js - Premium Interactive Interactions and UI Polish

document.addEventListener("DOMContentLoaded", () => {
  // 1. Current Year Footer
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  // 2. Lucide Icons Setup
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // 3. Smooth Mobile Hamburger Menu
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.innerHTML = isOpen ? "✕" : "☰";
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!navToggle.contains(e.target) && !siteNav.contains(e.target) && siteNav.classList.contains("is-open")) {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = "☰";
      }
    });
  }

  // 4. Smooth FAQ Accordion Toggle
  initAccordions();

  // 5. Before & After Slider & Lightbox Setup
  initOnPageSliders();
  initLightboxTriggers();

  // 6. Scroll Animations (Scroll Reveal)
  initScrollReveal();

  // 7. Cleaning Theme Microanimations
  initHomepageBubbles();
  initGalleryFilters();

  // 8. Testimonial Slider
  initTestimonialSlider();
  initHomeReviewsCarousel();
  initContactPage();
  initSiteMeta();
  initBrandLogos();
  applyContactOverrides();
  initAdminReturnLink();

  // 7. Config Copy Bindings
  document.querySelectorAll("[data-copy-config]").forEach((node) => {
    const key = node.getAttribute("data-copy-config");
    if (window.CLEANCO_CONFIG?.[key]) node.textContent = window.CLEANCO_CONFIG[key];
  });
});

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

  const originalCards = [...track.children];
  originalCards.forEach((card) => {
    track.appendChild(card.cloneNode(true));
  });
  track.querySelectorAll(".review-card").forEach(setupReviewCardScroll);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    track.style.animation = "none";
  }
}

// Accordions logic
function initAccordions() {
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
      threshold: 0.04,
      rootMargin: "0px 0px 14% 0px",
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

  if (revealVisibleNow) {
    document.querySelectorAll(`${REVEAL_SELECTORS}:not(.appeared)`).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        window.setTimeout(() => revealElement(el), 20);
      }
    });
  }
}

window.initScrollReveal = initScrollReveal;

// Expose accordion and magnifier updates for dynamically rendered items
window.refreshInteractiveFeatures = () => {
  initAccordions();
  initMagnifiers();
  initOnPageSliders();
  initHomeReviewsCarousel();
  initScrollReveal({ revealVisibleNow: true });
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

function getSiteAssetPrefix() {
  const sheet = document.querySelector('link[rel="stylesheet"]')?.href || "";
  return /\/services\/|\\services\\/.test(sheet) ? "../" : "";
}

function siteAssetPath(filename) {
  return `${getSiteAssetPrefix()}assets/images/${filename}`;
}

function createBrandLogoImg({ admin = false } = {}) {
  const img = document.createElement("img");
  img.className = admin ? "brand-logo brand-logo--admin" : "brand-logo";
  img.src = siteAssetPath("rscleaningcollective-logo.PNG");
  img.alt = "RS Cleaning Collective";
  img.decoding = "async";
  if (admin) {
    img.width = 40;
    img.height = 40;
  } else {
    img.width = 168;
    img.height = 56;
  }
  return img;
}

function initBrandLogos() {
  document.querySelectorAll(".brand").forEach((brand) => {
    if (brand.querySelector(".brand-logo")) return;
    const mark = brand.querySelector(".brand-mark");
    const nameSpan = brand.querySelector("span:not(.brand-mark)");
    const img = createBrandLogoImg();
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
  if (document.querySelector('link[rel="icon"]')) return;
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/jpeg";
  link.href = siteAssetPath("favicon.jpeg");
  document.head.appendChild(link);
}

function applyContactOverrides() {
  const config = window.CLEANCO_CONFIG || {};
  const phone = String(config.phone || "").trim();
  const email = String(config.email || "").trim();
  const address = String(config.address || "").trim();
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

  document.querySelectorAll(".site-footer").forEach((footer) => {
    const headings = [...footer.querySelectorAll("h3")];
    const contactHeading = headings.find((node) => node.textContent.trim().toLowerCase() === "contact");
    const areasHeading = headings.find((node) => node.textContent.trim().toLowerCase() === "areas");

    if (contactHeading) {
      const contactList = contactHeading.parentElement?.querySelector("ul");
      if (contactList) {
        const hoursLine = contactList.querySelector("li:last-child")?.textContent || "Mon-Sat, 8am-6pm";
        contactList.innerHTML = `
          <li>${phone ? `<a href="tel:${phone.replace(/[^+\d]/g, "")}">${phone}</a>` : ""}</li>
          <li>${email ? (email.includes("@") ? `<a href="mailto:${email}">${email}</a>` : email) : ""}</li>
          <li>${address || serviceAreaSummary}</li>
          <li>${hoursLine}</li>
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
