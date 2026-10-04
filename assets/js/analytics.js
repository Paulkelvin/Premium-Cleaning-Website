// Google Analytics 4. Stays completely inactive until a measurement ID
// (e.g. "G-XXXXXXXXXX") is set as gaMeasurementId in config.js.
(function () {
  const id = String(window.CLEANCO_CONFIG?.gaMeasurementId || "").trim();
  if (!/^G-[A-Z0-9]+$/i.test(id)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  // Lead events fired from the quote, booking, and contact forms.
  window.rsTrack = function rsTrack(eventName, params) {
    try {
      window.gtag("event", eventName, params || {});
    } catch (error) {
      // Analytics must never interfere with the page.
    }
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="tel:"], a[href^="mailto:"], a[href^="sms:"]');
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const kind = href.startsWith("tel:") ? "phone_click" : href.startsWith("sms:") ? "text_click" : "email_click";
    window.rsTrack(kind, { link_url: href });
  });
})();
