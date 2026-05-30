function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeExternalUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol === "https:") return parsed.href;
  } catch {}
  return "";
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
    "settings": *[_type == "siteSettings"][0]{
      businessName,
      logoText,
      phone,
      email,
      serviceAreaSummary,
      operatingHours,
      footerDescription,
      socialLinks,
      primaryCtaLabel,
      primaryCtaHref
    },
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
      },
      teamMembers[]{
        name,
        role,
        bio,
        "photoUrl": coalesce(photo.asset->url, photoUrl)
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
  const cfg = window.CLEANCO_CONFIG || {};
  const normalized = {
    ...settings,
    phone: settings.phone || cfg.phone,
    email: settings.email || cfg.email,
    serviceAreaSummary: settings.serviceAreaSummary || cfg.serviceArea,
  };
  document.querySelectorAll(".brand span:last-child").forEach((node) => {
    if (!node.textContent.includes("Admin")) text(node, normalized.logoText || normalized.businessName);
  });
  document.querySelectorAll("a[href^='tel:']").forEach((node) => {
    if (!normalized.phone) return;
    text(node, normalized.phone);
    attr(node, "href", `tel:${String(normalized.phone).replace(/[^+\d]/g, "")}`);
  });
  document.querySelectorAll("a[href^='mailto:']").forEach((node) => {
    if (!normalized.email) return;
    text(node, normalized.email);
    attr(node, "href", `mailto:${normalized.email}`);
  });
  document.querySelectorAll(".site-footer p").forEach((node) => {
    if (node.textContent.includes("Premium local cleaning")) text(node, normalized.footerDescription);
  });
  document.querySelectorAll("[data-sanity-service-area]").forEach((node) => {
    text(node, normalized.serviceAreaSummary);
  });
  document.querySelectorAll("[data-sanity-hours]").forEach((node) => {
    text(node, normalized.operatingHours);
  });
  if (normalized.primaryCtaLabel && normalized.primaryCtaHref) {
    document.querySelectorAll("[data-sanity-primary-cta]").forEach((node) => {
      text(node, normalized.primaryCtaLabel);
      attr(node, "href", normalized.primaryCtaHref);
    });
  }
  const socialRoot = document.querySelector("[data-sanity-social]");
  if (socialRoot && normalized.socialLinks?.length) {
    socialRoot.innerHTML = normalized.socialLinks
      .map((link) => {
        const href = safeExternalUrl(link.url);
        if (!href) return "";
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
      })
      .filter(Boolean)
      .join("");
  }
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

  applyPageBody(page);

  applyAboutOrigin(page);
  applyAboutTeam(page);
}

function applyAboutOrigin(page) {
  if (document.body.dataset.sanityPage !== "about") return;
  const section = page.sections?.[0];
  const sectionRoot = document.querySelector(".about-story-origin");
  if (!sectionRoot || !section) return;

  const heading = sectionRoot.querySelector(".heading-accent-left");
  if (heading) {
    text(heading.querySelector(".eyebrow"), section.eyebrow);
    text(heading.querySelector("h2"), section.title);
  }

  const copyRoot = sectionRoot.querySelector(".split > div:first-child");
  if (copyRoot && section.body) {
    const paragraphs = String(section.body).split(/\n+/).filter(Boolean);
    const staticPs = [...copyRoot.querySelectorAll("p")];
    paragraphs.forEach((paragraph, index) => {
      if (staticPs[index]) text(staticPs[index], paragraph);
    });
  }

  const founderImg = sectionRoot.querySelector("[data-about-founder-photo]");
  if (founderImg && section.imageUrl) {
    attr(founderImg, "src", section.imageUrl);
    attr(founderImg, "alt", section.title ? `${section.title} portrait` : "Founder portrait");
  }
}

function teamMemberInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function renderTeamMemberPhoto(member) {
  if (member.photoUrl) {
    return `<img class="team-member-photo" src="${escapeHtml(member.photoUrl)}" alt="${escapeHtml(member.name)}" width="400" height="400" decoding="async" loading="lazy">`;
  }
  return `<div class="team-member-photo team-member-photo--placeholder" aria-hidden="true"><span>${escapeHtml(teamMemberInitials(member.name))}</span></div>`;
}

function applyAboutTeam(page) {
  if (document.body.dataset.sanityPage !== "about") return;
  const list = document.querySelector("[data-about-team-list]");
  if (!list || !page.teamMembers?.length) return;

  list.innerHTML = page.teamMembers.map((member) => `
    <article class="card team-member-card fade-in-up">
      ${renderTeamMemberPhoto(member)}
      <h3 style="margin-bottom: 4px;">${escapeHtml(member.name)}</h3>
      <p class="eyebrow" style="margin-bottom: 12px;">${escapeHtml(member.role || "")}</p>
      <p style="font-size: 0.92rem; margin-bottom: 0;">${escapeHtml(member.bio || "")}</p>
    </article>
  `).join("");
}

function applyPageBody(page) {
  const root = document.querySelector("[data-sanity-page-content]");
  if (!root || !page?.sections?.length) return;
  root.innerHTML = page.sections.map((section) => {
    const body = String(section.body || "")
      .split(/\n+/)
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");
    const eyebrow = section.eyebrow ? `<p class="eyebrow">${escapeHtml(section.eyebrow)}</p>` : "";
    const title = section.title ? `<h2>${escapeHtml(section.title)}</h2>` : "";
    return `${eyebrow}${title}${body}`;
  }).join("");
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
  text(document.querySelector(".hero h1"), home.heroTitle);
  text(document.querySelector(".hero .hero-lead"), home.heroCopy);

  const heroImage = document.querySelector(".hero-bg img, .hero-image img, .hero img");
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

  text(document.querySelector(".why-choose-us-split .heading-tag-split h2"), home.whyChooseUsTitle);
  document.querySelectorAll(".why-choose-us-split .premium-features .feature-row").forEach((row, index) => {
    const item = home.whyChooseUsItems?.[index];
    if (!item) return;
    text(row.querySelector("span"), item);
  });

  text(document.querySelector(".services-editorial-section .heading-underline-gradient h2"), home.servicesOverviewTitle);

  const serviceCards = document.querySelectorAll(".service-card-horizontal");
  (home.serviceCards || []).forEach((card, index) => {
    const node = serviceCards[index];
    if (!node) return;
    text(node.querySelector("h3"), card.title);
    text(node.querySelector(".service-info-wrap > p"), card.body);
    const img = node.querySelector("img");
    attr(img, "src", card.imageUrl);
    attr(img, "alt", card.title);
    const learnLink = node.querySelector(".service-card-actions .tag:not(.tag--cta)");
    attr(learnLink, "href", card.href);
  });

  const steps = document.querySelectorAll(".grid.four.steps .step");
  (home.howItWorksSteps || []).forEach((step, index) => {
    const node = steps[index];
    if (!node) return;
    text(node.querySelector("h3"), step.title);
    text(node.querySelector("p"), step.body);
  });

  text(document.querySelector(".quote-panel h2"), home.finalCtaTitle);
  const quotePanelCopy = document.querySelector(".quote-panel > p");
  if (quotePanelCopy) text(quotePanelCopy, home.finalCtaCopy);
}

function applyService(services) {
  const slug = document.body.dataset.serviceSlug;
  if (!slug) return;
  const service = services.find((item) => item.slug === slug);
  if (!service) return;

  const hero = document.querySelector(".service-detail-hero, .page-hero");
  if (hero) {
    text(hero.querySelector(".eyebrow"), service.title);
    text(hero.querySelector("h1"), service.shortDescription || service.overviewTitle);
    text(hero.querySelector(".service-detail-for, .hero-lead, p:not(.eyebrow)"), service.overview);
    const cta = hero.querySelector(".cta-row .button, .hero-actions .button");
    if (cta && service.ctaLabel) text(cta, service.ctaLabel);
  }

  const includedList = document.querySelector(".service-detail-scope .feature-list:not(.feature-list--muted)");
  if (includedList && service.includedItems?.length) {
    includedList.innerHTML = service.includedItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  const addOnSection = document.querySelector("[data-sanity-service-addons]");
  if (addOnSection && service.recommendedAddOns?.length) {
    addOnSection.innerHTML = service.recommendedAddOns.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  }

  const factors = document.querySelector("[data-sanity-service-factors]");
  if (factors && service.estimateFactors?.length) {
    factors.innerHTML = service.estimateFactors.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  const image = document.querySelector(".service-detail-hero img, .service-detail-scope img");
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
  if (!target) return;
  const configAreas = Array.isArray(window.CLEANCO_CONFIG?.serviceAreas)
    ? window.CLEANCO_CONFIG.serviceAreas.filter(Boolean)
    : [];
  if (configAreas.length) {
    target.innerHTML = configAreas.map((name) => `
      <article class="card service-area-card">
        <h3>${escapeHtml(name)}</h3>
      </article>
    `).join("");
    return;
  }
  if (!areas.length) return;
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
