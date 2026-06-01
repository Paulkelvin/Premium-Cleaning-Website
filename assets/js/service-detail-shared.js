/** Homepage-aligned FAQs for service detail pages */
window.HOME_PAGE_FAQS = [
  {
    question: "What is the difference between standard and deep cleaning?",
    answer: "Standard cleans maintain an already-clean home. Deep cleans go further with baseboards, buildup removal, and detailed reset work."
  },
  {
    question: "Do you bring supplies and equipment?",
    answer: "Yes. We arrive with supplies and equipment, and we can use your preferred products when requested."
  },
  {
    question: "Do I need to be home during cleaning?",
    answer: "No. Most clients provide access instructions while they are out. We are fully licensed and insured for every visit."
  }
];

function renderHomeFaqs(container) {
  if (!container || !window.HOME_PAGE_FAQS?.length) return;
  container.innerHTML = window.HOME_PAGE_FAQS.map((item, index) => `
    <article class="faq-item${index === 0 ? " is-open" : ""}">
      <button class="faq-trigger" type="button">
        <span>${item.question}</span>
        <i data-lucide="chevron-down"></i>
      </button>
      <div class="faq-panel"${index === 0 ? ' style="max-height: 800px;"' : ""}>
        <p>${item.answer}</p>
      </div>
    </article>
  `).join("");
}

function initServiceDetailFaqs() {
  const list = document.querySelector("[data-home-faq-list]");
  if (!list) return;
  renderHomeFaqs(list);
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function initServiceAreaCommunities() {
  const target = document.querySelector("[data-service-area-list]");
  const areas = window.SERVICE_AREAS;
  if (!target || !areas?.length) return;

  target.innerHTML = areas.map((area) => {
    const cities = (area.cities || area.nearbyAreas || []).filter(Boolean);
    const cityList = cities.length
      ? `<ul class="service-area-cities">${cities.map((city) => `<li>${city}</li>`).join("")}</ul>`
      : "";
    return `
      <article class="card service-area-card">
        <h3>${area.name}</h3>
        ${cityList}
      </article>
    `;
  }).join("");
  if (typeof window.renderServiceAreaTownNotice === "function") {
    window.renderServiceAreaTownNotice();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initServiceDetailFaqs();
  initServiceAreaCommunities();
  if (typeof window.renderServiceAreaTownNotice === "function") {
    window.renderServiceAreaTownNotice();
  }
});
