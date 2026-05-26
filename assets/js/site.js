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
  const carousel = document.getElementById("homeReviewsCarousel");
  const track = document.getElementById("homeReviewsTrack");
  const section = document.querySelector(".reviews-section");
  if (!carousel || !track || !section || carousel.dataset.bound === "true") return;
  carousel.dataset.bound = "true";

  const prevBtn = section.querySelector(".prev-btn");
  const nextBtn = section.querySelector(".next-btn");

  const getScrollAmount = () => {
    const card = track.querySelector(".review-card");
    if (!card) return 0;
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "18") || 18;
    return card.offsetWidth + gap;
  };

  const scrollByCard = (direction) => {
    carousel.scrollBy({ left: direction * getScrollAmount(), behavior: "smooth" });
  };

  prevBtn?.addEventListener("click", () => scrollByCard(-1));
  nextBtn?.addEventListener("click", () => scrollByCard(1));

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let hasDragged = false;

  carousel.addEventListener("pointerdown", (event) => {
    isDragging = true;
    hasDragged = false;
    startX = event.clientX;
    startScrollLeft = carousel.scrollLeft;
    carousel.classList.add("is-dragging");
    carousel.setPointerCapture(event.pointerId);
  });

  carousel.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) hasDragged = true;
    carousel.scrollLeft = startScrollLeft - delta;
  });

  const endDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    carousel.classList.remove("is-dragging");
    if (event?.pointerId) {
      try { carousel.releasePointerCapture(event.pointerId); } catch {}
    }
  };

  carousel.addEventListener("pointerup", endDrag);
  carousel.addEventListener("pointercancel", endDrag);
  carousel.addEventListener("click", (event) => {
    if (hasDragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

// Accordions logic
function initAccordions() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    const panel = item.querySelector(".faq-panel");
    if (!trigger || !panel) return;

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

// Magnifier logic
function initMagnifiers() {
  document.querySelectorAll(".gallery-zoom-container").forEach((container) => {
    if (container.querySelector(".zoom-lens")) return;

    const img = container.querySelector("img");
    if (!img) return;

    const lens = document.createElement("div");
    lens.className = "zoom-lens";
    lens.style.backgroundImage = `url('${img.src}')`;
    container.appendChild(lens);

    container.addEventListener("mousemove", (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Keep lens inside container
      lens.style.left = `${x - 70}px`;
      lens.style.top = `${y - 70}px`;

      // Zoom calculations
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;

      lens.style.backgroundPosition = `${percentX}% ${percentY}%`;
      lens.style.backgroundSize = `${rect.width * 2.2}px ${rect.height * 2.2}px`;
    });
  });
}

// Open comparison Lightbox when clicking on gallery items
function initLightboxTriggers() {
  document.addEventListener("click", (e) => {
    const pair = e.target.closest(".gallery-pair");
    if (!pair) return;

    const imgs = pair.querySelectorAll("img");
    if (imgs.length < 2) return;

    const card = pair.closest(".gallery-card") || pair.parentElement;
    const title = card.querySelector("h3")?.textContent || "Before & After Reset";

    openLightbox(imgs[0].src, imgs[1].src, title);
  });
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

      afterImg.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
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

      afterImg.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
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
  afterImg.style.clipPath = "polygon(0 0, 50% 0, 50% 100%, 0 100%)";
  
  modal.querySelector(".slider-bar").style.left = "50%";
  modal.querySelector(".slider-button").style.left = "50%";

  modal.classList.add("is-open");
}

// Scroll animation logic
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("appeared");
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-in-up, .steps").forEach((el) => observer.observe(el));
}

// Expose accordion and magnifier updates for dynamically rendered items
window.refreshInteractiveFeatures = () => {
  initAccordions();
  initMagnifiers();
  initOnPageSliders();
  initHomeReviewsCarousel();
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
  const tabs = document.querySelectorAll('.gallery-filter-btn');
  const cards = document.querySelectorAll('.gallery-card');
  if (!tabs.length || !cards.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.dataset.filter;
      
      cards.forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'block';
          // Trigger reflow
          void card.offsetWidth;
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (card.style.opacity === '0') card.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}
