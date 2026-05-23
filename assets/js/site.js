const yearNode = document.querySelector("[data-year]");
if (yearNode) yearNode.textContent = new Date().getFullYear();

if (!document.querySelector(".site-footer") && !document.body.classList.contains("admin-shell")) {
  const prefix = location.pathname.includes("/services/") ? "../" : "";
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="section-inner footer-grid">
      <div><a class="brand" href="${prefix}index.html"><span class="brand-mark">P</span><span>PristinePro</span></a><p>Premium local cleaning for homes, rentals, and workplaces.</p><a class="button secondary" href="${prefix}quote.html">Request quote</a></div>
      <div><h3>Quick links</h3><ul><li><a href="${prefix}about.html">About</a></li><li><a href="${prefix}services.html">Services</a></li><li><a href="${prefix}gallery.html">Gallery</a></li><li><a href="${prefix}contact.html">Contact</a></li></ul></div>
      <div><h3>Services</h3><ul><li><a href="${prefix}services/standard-cleaning.html">Standard cleaning</a></li><li><a href="${prefix}services/deep-cleaning.html">Deep cleaning</a></li><li><a href="${prefix}services/move-in-out-cleaning.html">Move-in/out</a></li><li><a href="${prefix}services/office-cleaning.html">Office cleaning</a></li></ul></div>
      <div><h3>Contact</h3><ul><li><a href="tel:+15550147820">(555) 014-7820</a></li><li><a href="mailto:hello@pristineprocleaning.com">hello@pristineprocleaning.com</a></li><li>Austin, TX</li><li>Mon-Sat, 8am-6pm</li></ul></div>
      <div><h3>Areas</h3><ul><li>Austin</li><li>Round Rock</li><li>Cedar Park</li><li>Pflugerville</li><li>Lakeway</li><li><a href="#">Instagram</a> · <a href="#">Facebook</a></li></ul></div>
    </div>
    <div class="section-inner footer-bottom"><span>© <span data-year></span> PristinePro Cleaning.</span><span><a href="${prefix}privacy.html">Privacy Policy</a> · <a href="${prefix}terms.html">Terms of Service</a> · <a href="${prefix}admin-login.html">Admin</a></span></div>
  `;
  document.body.appendChild(footer);
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll("[data-copy-config]").forEach((node) => {
  const key = node.getAttribute("data-copy-config");
  if (window.CLEANCO_CONFIG?.[key]) node.textContent = window.CLEANCO_CONFIG[key];
});

document.querySelectorAll("details.faq-item").forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    document.querySelectorAll("details.faq-item[open]").forEach((other) => {
      if (other !== detail) other.open = false;
    });
  });
});
