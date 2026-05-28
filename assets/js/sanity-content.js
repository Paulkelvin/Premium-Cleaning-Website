function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(node, value) {
  if (node && value) node.textContent = value;
}

function attr(node, name, value) {
  if (node && value) node.setAttribute(name, value);
}

function renderStars(rating) {
  const count = Math.max(1, Math.min(5, Number(rating) || 5));
  return Array.from({ length: count }, () => '<i data-lucide="star"></i>').join("");
}

function mapSanityGalleryItem(item, index) {
  const slug = String(item.slug || item.title || index)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    id: item.slug || `${index + 1}a`,
    title: item.title || "Cleaning project",
    description: item.description || "",
    beforeImageUrl: item.beforeImageUrl,
    afterImageUrl: item.afterImageUrl,
    category: item.category || "kitchens",
    badge: item.badge || item.serviceType || "Cleaning"
  };
}

(async function hydrateFromSanity() {
  const config = window.CLEANCO_CONFIG || {};
  if (!config.sanityProjectId || !config.sanityDataset) return;

  const query = `{
    "settings": *[_type == "siteSettings"][0],
    "home": *[_type == "homePage"][0]{
      heroEyebrow,
      heroTitle,
      heroCopy,
      "heroImageUrl": coalesce(heroImage.asset->url, heroImageUrl),
      primaryCta,
      secondaryCta,
      trustIndicators,
      servicesOverviewTitle,
      serviceCards[]{
        title,
        body,
        href,
        "imageUrl": coalesce(image.asset->url, imageUrl)
      },
      howItWorksSteps[]{
        title,
        body,
        href,
        "imageUrl": coalesce(image.asset->url, imageUrl)
      },
      whyChooseUsTitle,
      whyChooseUsItems,
      finalCtaTitle,
      finalCtaCopy
    },
    "pages": *[_type == "page"]{
      title,
      "slug": slug.current,
      metaDescription,
      heroEyebrow,
      heroTitle,
      heroCopy,
      "heroImageUrl": coalesce(heroImage.asset->url, heroImageUrl),
      sections[]{
        eyebrow,
        title,
        body,
        "imageUrl": coalesce(image.asset->url, imageUrl)
      }
    },
    "services": *[_type == "service"] | order(displayOrder asc){
      title,
      "slug": slug.current,
      shortDescription,
      "heroImageUrl": coalesce(heroImage.asset->url, heroImageUrl),
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
      location,
      "avatarUrl": coalesce(avatar.asset->url, avatarUrl),
      displayOrder
    },
    "galleryItems": *[_type == "galleryItem"] | order(displayOrder asc){
      title,
      "slug": slug.current,
      serviceType,
      category,
      badge,
      "beforeImageUrl": coalesce(beforeImage.asset->url, beforeImageUrl),
      "afterImageUrl": coalesce(afterImage.asset->url, afterImageUrl),
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
    applyQuoteStudioHero(result.pages || []);
    applyHome(result.home);
    applyService(result.services || []);
    applyFaqs(result.faqs || []);
    applyHomeReviews(result.testimonials || []);
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

function applySettings(settings) {
  if (!settings) return;
  document.querySelectorAll(".brand span:last-child").forEach((node) => {
    if (!node.textContent.includes("Admin")) text(node, settings.logoText || settings.businessName);
  });
  document.querySelectorAll("a[href^='tel:']").forEach((node) => {
    if (!settings.phone) return;
    text(node, settings.phone);
    attr(node, "href", `tel:${String(settings.phone).replace(/[^+\d]/g, "")}`);
  });
  document.querySelectorAll("a[href^='mailto:']").forEach((node) => {
    if (!settings.email) return;
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
  const heroRoot = document.querySelector(".page-hero, .hero--overlay");
  if (!heroRoot) return;
  text(heroRoot.querySelector(".eyebrow"), page.heroEyebrow);
  text(heroRoot.querySelector("h1"), page.heroTitle);
  text(heroRoot.querySelector(".hero-lead, p:not(.eyebrow)"), page.heroCopy);
  if (page.metaDescription) {
    let meta = document.querySelector("meta[name='description']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", page.metaDescription);
  }
  if (page.title) document.title = `${page.title} | RS Cleaning Collective`;

  const heroImg = heroRoot.querySelector("img");
  attr(heroImg, "src", page.heroImageUrl);

  const section = page.sections?.[0];
  if (section) {
    const sectionRoot = document.querySelector(".about-story-origin, main section:nth-of-type(2)");
    if (sectionRoot) {
      text(sectionRoot.querySelector("h2"), section.title);
      text(sectionRoot.querySelector("p"), section.body);
      const sectionImg = sectionRoot.querySelector("img");
      if (sectionImg && !sectionImg.hasAttribute("data-brand-apparel")) {
        attr(sectionImg, "src", section.imageUrl);
        attr(sectionImg, "alt", section.title || page.title);
      }
    }
  }
}

function applyQuoteStudioHero(pages) {
  const key = document.body.dataset.sanityPage;
  if (key !== "quote" && key !== "book") return;
  const page = pages.find((item) => item.slug === key);
  if (!page) return;
  const titleEl = document.querySelector("[data-studio-title]");
  const copyEl = document.querySelector("[data-studio-copy]");
  text(titleEl, page.heroTitle);
  text(copyEl, page.heroCopy);
  if (page.metaDescription) {
    let meta = document.querySelector("meta[name='description']");
    if (meta) meta.setAttribute("content", page.metaDescription);
  }
  if (page.title) document.title = `${page.title} | RS Cleaning Collective`;
}

function applyHome(home) {
  if (!home || document.body.dataset.sanityPage !== "home") return;
  text(document.querySelector(".hero .eyebrow"), home.heroEyebrow);
  text(document.querySelector(".hero h1"), home.heroTitle);
  text(document.querySelector(".hero .hero-lead"), home.heroCopy);

  const heroImage = document.querySelector(".hero-image img, .hero img");
  attr(heroImage, "src", home.heroImageUrl);

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

  text(document.querySelector(".services-overview h2"), home.servicesOverviewTitle);
  text(document.querySelector(".why-choose h2, .band h2"), home.whyChooseUsTitle);

  const serviceCards = document.querySelectorAll("[data-home-service-cards] .card, .services-grid .card");
  (home.serviceCards || []).forEach((card, index) => {
    const node = serviceCards[index];
    if (!node) return;
    text(node.querySelector("h3"), card.title);
    text(node.querySelector("p"), card.body);
    const img = node.querySelector("img");
    attr(img, "src", card.imageUrl);
    attr(img, "alt", card.title);
    const link = node.querySelector("a");
    attr(link, "href", card.href);
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
    list.innerHTML = service.includedItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  const image = document.querySelector("main section:nth-of-type(2) img");
  attr(image, "src", service.heroImageUrl);
  attr(image, "alt", service.title);
  if (service.title) document.title = `${service.title} | RS Cleaning Collective`;
}

function applyFaqs(faqs) {
  const list = document.querySelector("[data-faq-list]");
  if (!list || !faqs.length) return;
  list.innerHTML = faqs.map((item, index) => `
    <div class="faq-item ${index === 0 ? "is-open" : ""}">
      <button class="faq-trigger" type="button">
        <span>${escapeHtml(item.question)}</span>
        <i data-lucide="chevron-down"></i>
      </button>
      <div class="faq-panel" ${index === 0 ? 'style="max-height: 800px;"' : ""}>
        <p>${escapeHtml(item.answer)}</p>
      </div>
    </div>
  `).join("");
}

function renderReviewCard(item, variant) {
  const avatar = item.avatarUrl
    ? `<img class="review-avatar" src="${escapeHtml(item.avatarUrl)}" alt="${escapeHtml(item.customerName)}">`
    : "";
  if (variant === "home") {
    return `
      <article class="card review-card">
        <div class="review-header">
          ${avatar}
          <div class="review-meta">
            <strong>${escapeHtml(item.customerName)}</strong>
            <span>${escapeHtml(item.location || item.serviceType || "")}</span>
          </div>
        </div>
        <p class="review-text">${escapeHtml(item.quote)}</p>
        <div class="review-footer-bar">
          <div class="review-stars">${renderStars(item.rating)}</div>
          <div class="review-quote-bubble"><i data-lucide="quote"></i></div>
        </div>
      </article>
    `;
  }
  return `
    <article class="card testimonial" style="flex: 0 0 calc(33.333% - 16px); min-width: 300px;">
      <blockquote>"${escapeHtml(item.quote)}"</blockquote>
      <strong>${escapeHtml(item.customerName)}</strong>
      <p style="margin-top:4px; font-size:0.85rem;">${escapeHtml(item.serviceType || "")}</p>
    </article>
  `;
}

function applyHomeReviews(testimonials) {
  const track = document.querySelector("[data-home-reviews]");
  if (!track || !testimonials.length) return;
  track.innerHTML = testimonials.map((item) => renderReviewCard(item, "home")).join("");
}

function applyTestimonials(testimonials) {
  const list = document.querySelector("[data-testimonial-list]");
  if (!list || !testimonials.length) return;
  list.innerHTML = testimonials.map((item) => renderReviewCard(item, "page")).join("");
}

function applyGallery(items) {
  if (!items.length) return;
  window.GALLERY_ITEMS = items.map(mapSanityGalleryItem);
  if (typeof window.renderGallery !== "function") return;
  const isHome = document.body.dataset.sanityPage === "home";
  window.renderGallery({
    limit: isHome ? window.HOME_GALLERY_LIMIT || 3 : null,
    showSeeMore: isHome
  });
}

function applyServiceAreas(areas) {
  const target = document.querySelector("[data-service-area-list]");
  if (!target || !areas.length) return;
  target.innerHTML = areas.map((area) => `
    <article class="card service-area-card">
      <h3>${escapeHtml(area.name)}</h3>
      ${area.region ? `<p class="service-area-region">${escapeHtml(area.region)}</p>` : ""}
      ${area.localSeoCopy ? `<p>${escapeHtml(area.localSeoCopy)}</p>` : ""}
      ${area.nearbyAreas?.length ? `
        <ul class="feature-list">${area.nearbyAreas.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      ` : ""}
    </article>
  `).join("");
}
