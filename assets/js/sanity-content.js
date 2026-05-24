(async function hydrateFromSanity() {
  const config = window.CLEANCO_CONFIG || {};
  if (!config.sanityProjectId || !config.sanityDataset) return;

  const query = `{
    "settings": *[_type == "siteSettings"][0],
    "home": *[_type == "homePage"][0],
    "pages": *[_type == "page"]{
      title,
      "slug": slug.current,
      metaDescription,
      heroEyebrow,
      heroTitle,
      heroCopy,
      sections
    },
    "services": *[_type == "service"] | order(displayOrder asc){
      title,
      "slug": slug.current,
      shortDescription,
      heroImageUrl,
      overviewTitle,
      overview,
      includedItems,
      recommendedAddOns,
      estimateFactors,
      ctaLabel,
      displayOrder
    },
    "faqs": *[_type == "faq"] | order(displayOrder asc){
      question,
      answer,
      category,
      displayOrder
    },
    "testimonials": *[_type == "testimonial"] | order(displayOrder asc){
      customerName,
      serviceType,
      quote,
      rating,
      displayOrder
    },
    "galleryItems": *[_type == "galleryItem"] | order(displayOrder asc){
      title,
      serviceType,
      beforeImageUrl,
      afterImageUrl,
      description,
      displayOrder
    },
    "serviceAreas": *[_type == "serviceArea"] | order(displayOrder asc){
      name,
      region,
      localSeoCopy,
      nearbyAreas,
      displayOrder
    }
  }`;

  try {
    const endpoint = `https://${config.sanityProjectId}.api.sanity.io/v${config.sanityApiVersion || "2025-05-23"}/data/query/${config.sanityDataset}?query=${encodeURIComponent(query)}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(await response.text());
    const { result } = await response.json();
    if (!result) return;
    applySettings(result.settings);
    applyPageHero(result);
    applyHome(result.home);
    applyService(result.services || []);
    applyFaqs(result.faqs || []);
    applyTestimonials(result.testimonials || []);
    applyGallery(result.galleryItems || []);
    applyServiceAreas(result.serviceAreas || []);
    if (typeof window.refreshInteractiveFeatures === "function") {
      window.refreshInteractiveFeatures();
    }
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  } catch (error) {
    console.warn("Sanity content unavailable; using page fallback content.", error);
  }
})();

function text(node, value) {
  if (node && value) node.textContent = value;
}

function attr(node, name, value) {
  if (node && value) node.setAttribute(name, value);
}

function applySettings(settings) {
  if (!settings) return;
  document.querySelectorAll(".brand span:last-child").forEach((node) => {
    if (!node.textContent.includes("Admin")) text(node, settings.logoText || settings.businessName);
  });
  document.querySelectorAll("a[href^='tel:']").forEach((node) => {
    text(node, settings.phone);
    attr(node, "href", `tel:${String(settings.phone || "").replace(/[^+\d]/g, "")}`);
  });
  document.querySelectorAll("a[href^='mailto:']").forEach((node) => {
    text(node, settings.email);
    attr(node, "href", `mailto:${settings.email}`);
  });
  document.querySelectorAll(".site-footer p").forEach((node) => {
    if (node.textContent.includes("Premium local cleaning")) text(node, settings.footerDescription);
  });
}

function applyPageHero(data) {
  const key = document.body.dataset.sanityPage;
  if (!key || key === "home") return;
  const page = (data.pages || []).find((item) => item.slug === key);
  if (!page) return;
  text(document.querySelector(".page-hero .eyebrow"), page.heroEyebrow);
  text(document.querySelector(".page-hero h1"), page.heroTitle);
  text(document.querySelector(".page-hero p:not(.eyebrow)"), page.heroCopy);
  if (page.metaDescription) {
    let meta = document.querySelector("meta[name='description']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", page.metaDescription);
  }
  if (page.title) document.title = `${page.title} | PristinePro Cleaning`;
}

function applyHome(home) {
  if (!home || document.body.dataset.sanityPage !== "home") return;
  text(document.querySelector(".hero .eyebrow"), home.heroEyebrow);
  text(document.querySelector(".hero h1"), home.heroTitle);
  text(document.querySelector(".hero p:not(.eyebrow)"), home.heroCopy);
  if (home.heroImageUrl) {
    document.querySelector(".hero").style.backgroundImage = `linear-gradient(90deg, rgba(12, 35, 29, 0.82), rgba(12, 35, 29, 0.42), rgba(12, 35, 29, 0.14)), url("${home.heroImageUrl}")`;
  }
  const actions = document.querySelectorAll(".hero-actions a");
  text(actions[0], home.primaryCta?.label);
  attr(actions[0], "href", home.primaryCta?.href);
  text(actions[1], home.secondaryCta?.label);
  attr(actions[1], "href", home.secondaryCta?.href);
  document.querySelectorAll(".hero-strip div").forEach((node, index) => {
    const item = home.trustIndicators?.[index];
    if (!item) return;
    text(node.querySelector("strong"), item.value);
    text(node.querySelector("span"), item.label);
  });
}

function applyService(services) {
  const slug = document.body.dataset.serviceSlug;
  if (!slug) return;
  const service = services.find((item) => item.slug === slug);
  if (!service) return;
  text(document.querySelector(".page-hero .eyebrow"), service.title);
  text(document.querySelector(".page-hero h1"), service.shortDescription);
  text(document.querySelector(".page-hero p:not(.eyebrow)"), service.overview);
  text(document.querySelector("main section:nth-of-type(2) h2"), service.overviewTitle);
  const list = document.querySelector("main section:nth-of-type(2) .feature-list");
  if (list && service.includedItems?.length) {
    list.innerHTML = service.includedItems.map((item) => `<li>${item}</li>`).join("");
  }
  const image = document.querySelector("main section:nth-of-type(2) img");
  attr(image, "src", service.heroImageUrl);
  attr(image, "alt", service.title);
  if (service.title) document.title = `${service.title} | PristinePro Cleaning`;
}

function applyFaqs(faqs) {
  const list = document.querySelector("[data-faq-list]");
  if (!list || !faqs.length) return;
  list.innerHTML = faqs.map((item, index) => `
    <div class="faq-item ${index === 0 ? "is-open" : ""}">
      <button class="faq-trigger" type="button">
        <span>${item.question}</span>
        <i data-lucide="chevron-down"></i>
      </button>
      <div class="faq-panel" ${index === 0 ? 'style="max-height: 800px;"' : ''}>
        <p>${item.answer}</p>
      </div>
    </div>
  `).join("");
}

function applyTestimonials(testimonials) {
  const list = document.querySelector("[data-testimonial-list]");
  if (!list || !testimonials.length) return;
  list.innerHTML = testimonials.map((item) => `
    <article class="card testimonial">
      <blockquote>"${item.quote}"</blockquote>
      <strong>${item.customerName}</strong>
      <p>${item.serviceType || ""}</p>
    </article>
  `).join("");
}

function applyGallery(items) {
  const list = document.querySelector("[data-gallery-list]");
  if (!list || !items.length) return;
  list.innerHTML = items.map((item) => `
    <article class="card gallery-card fade-in-up">
      <div class="gallery-pair">
        <div class="gallery-zoom-container">
          <img src="${item.beforeImageUrl}" alt="${item.title} before">
        </div>
        <div class="gallery-zoom-container">
          <img src="${item.afterImageUrl}" alt="${item.title} after">
        </div>
      </div>
      <h3>${item.title}</h3>
      <p>${item.description || ""}</p>
    </article>
  `).join("");
}

function applyServiceAreas(areas) {
  const target = document.querySelector("[data-service-area-list]");
  if (!target || !areas.length) return;
  const area = areas[0];
  const nearby = area.nearbyAreas || [];
  target.innerHTML = `
    <h3>Main region</h3>
    <p>${area.name}, ${area.region}</p>
    <h3>Nearby areas served</h3>
    <ul class="feature-list">${nearby.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

