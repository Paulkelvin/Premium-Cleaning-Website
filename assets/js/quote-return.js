// Brings customers back to where they left off:
//  - /book?quote=<id>        "Continue to booking" link from the quote emails
//  - /quote                  "Welcome back" prompt when a saved quote exists
//  - /pay-booking?booking=<id> "Complete your payment" link from the booking email
(function () {
  const config = window.CLEANCO_CONFIG || {};
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const PHONE = "240-823-4466";

  function functionHeaders() {
    const apiKey = config.supabaseFunctionKey || config.supabaseAnonKey;
    const headers = { "Content-Type": "application/json", apikey: apiKey };
    if (typeof apiKey === "string" && apiKey.startsWith("eyJ")) headers.Authorization = `Bearer ${apiKey}`;
    return headers;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? `$${amount.toFixed(2)}` : "";
  }

  function pagePath() {
    return String(window.location.pathname || "").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  }

  // ---------- /book?quote=<id> ----------
  function initResumeFromEmail() {
    if (pagePath() !== "/book") return;
    const params = new URLSearchParams(window.location.search);
    const quoteId = String(params.get("quote") || "").trim();
    if (!quoteId) {
      checkSavedQuoteStillOpen();
      return;
    }

    const cleanUrl = "/book";
    const existing = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    if (existing?.quote_id === quoteId) {
      window.history.replaceState(null, "", cleanUrl);
      return;
    }

    const root = document.documentElement;
    root.classList.add("is-resuming-quote");

    const showProblem = (title, message) => {
      root.classList.remove("is-resuming-quote");
      window.history.replaceState(null, "", cleanUrl);
      const gate = document.getElementById("bookNoQuoteGate");
      if (!gate) return;
      const note = document.createElement("div");
      note.className = "quote-return-note";
      note.setAttribute("role", "status");
      note.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
      gate.prepend(note);
    };

    if (!UUID_RE.test(quoteId) || !config.supabaseUrl) {
      document.addEventListener("DOMContentLoaded", () =>
        showProblem("We couldn't find that quote.", "Please start a new quote below. It only takes a minute."));
      return;
    }

    fetch(`${config.supabaseUrl}/functions/v1/resume-quote`, {
      method: "POST",
      headers: functionHeaders(),
      body: JSON.stringify({ quote_id: quoteId }),
    })
      .then((response) => response.json().catch(() => ({})).then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (response.ok && data.status === "ok" && data.quote) {
          const quote = data.quote;
          const sizeMode = quote.bedrooms ? "beds_baths" : quote.square_feet ? "sqft" : "beds_baths";
          // Answers left in this tab from another quote must not replace the
          // emailed quote when the customer taps "Edit quote".
          try { sessionStorage.removeItem("rs_cleaning_quote_draft"); } catch {}
          window.saveQuoteSession({
            full_name: quote.full_name || "",
            email: quote.email || "",
            phone: quote.phone || "",
            service_type: quote.service_type || "",
            property_type: quote.property_type || "",
            bedrooms: quote.bedrooms || "",
            bathrooms: quote.bathrooms || "",
            square_feet: quote.square_feet || "",
            add_ons: quote.add_ons || "",
            frequency: quote.frequency || "",
            preferred_contact: quote.preferred_contact || "",
            consent: true,
            quote_id: quote.id,
            estimated_total: Number(quote.estimated_total) || 0,
            travel_fee: 0,
            size_input_mode: sizeMode,
          });
          window.location.replace(cleanUrl);
          return;
        }
        const status = data.status || "";
        const ready = () => {
          if (status === "booked") {
            showProblem("This quote has already been booked.", `Need to change your booking? Reply to your confirmation email or call us at ${PHONE}.`);
          } else if (status === "expired") {
            showProblem("This quote link has expired.", "Prices can change, so please start a fresh quote below. It only takes a minute.");
          } else {
            showProblem("We couldn't load your saved quote.", `Please start a new quote below, or call us at ${PHONE}.`);
          }
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
        else ready();
      })
      .catch(() => {
        const ready = () => showProblem("We couldn't load your saved quote.", `Please check your connection and try again, or call us at ${PHONE}.`);
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
        else ready();
      });
  }

  // A quote saved on this device may have been booked elsewhere (another device,
  // or a newer quote). Older saved quotes are re-checked quietly; if the server
  // says it's booked, reuse the email-link flow to show "already booked".
  function checkSavedQuoteStillOpen() {
    const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    const quoteId = String(session?.quote_id || "");
    const savedAt = new Date(session?.savedAt || 0).getTime();
    if (!UUID_RE.test(quoteId) || !config.supabaseUrl || Date.now() - savedAt < 60 * 60 * 1000) return;
    fetch(`${config.supabaseUrl}/functions/v1/resume-quote`, {
      method: "POST",
      headers: functionHeaders(),
      body: JSON.stringify({ quote_id: quoteId }),
    })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (data.status === "booked" || data.status === "expired") {
          window.clearQuoteSession();
          window.location.replace(`/book?quote=${encodeURIComponent(quoteId)}`);
        }
      })
      .catch(() => {});
  }

  // ---------- /quote: welcome back ----------
  function initWelcomeBack() {
    if (pagePath() !== "/quote") return;
    const session = typeof window.loadQuoteSession === "function" ? window.loadQuoteSession() : null;
    const total = formatMoney(session?.estimated_total);
    if (!session || !total) return;

    const card = document.getElementById("quoteAssistantCard");
    if (!card || document.querySelector(".quote-resume-banner")) return;

    const service = String(session.service_type || "cleaning").trim();
    const banner = document.createElement("div");
    banner.className = "quote-resume-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Your saved quote");
    banner.innerHTML = `
      <div class="quote-resume-copy">
        <strong>Welcome back! Your quote is saved.</strong>
        <span>${escapeHtml(service)} · estimate ${escapeHtml(total)}</span>
      </div>
      <div class="quote-resume-actions">
        <a class="button small" href="/book">Continue to booking</a>
        <button type="button" class="button ghost small" data-quote-resume-dismiss>Start a new quote</button>
      </div>`;
    card.parentNode.insertBefore(banner, card);
    banner.querySelector("[data-quote-resume-dismiss]").addEventListener("click", () => {
      if (typeof window.clearQuoteSession === "function") window.clearQuoteSession();
      // The form below is showing the saved answers; reload for a blank quote.
      window.location.replace("/quote");
    });
  }

  // ---------- /pay-booking?booking=<id> ----------
  function initPayBooking() {
    const root = document.querySelector("[data-pay-booking]");
    if (!root) return;
    const bookingId = String(new URLSearchParams(window.location.search).get("booking") || "").trim();
    const button = root.querySelector("[data-pay-booking-button]");
    const status = root.querySelector("[data-pay-booking-status]");

    const setStatus = (type, message) => {
      status.hidden = false;
      status.className = `form-state ${type}`;
      status.textContent = message;
    };

    if (!UUID_RE.test(bookingId)) {
      button.hidden = true;
      setStatus("error", `We couldn't find this booking. Please use the button in your booking email, or call us at ${PHONE}.`);
      return;
    }

    button.addEventListener("click", async () => {
      if (typeof window.createSquareCheckout !== "function") {
        setStatus("error", `Online payment isn't available right now. Please call us at ${PHONE}.`);
        return;
      }
      button.disabled = true;
      setStatus("loading", "Opening secure checkout…");
      try {
        const url = await window.createSquareCheckout(bookingId);
        if (typeof window.rsTrack === "function") window.rsTrack("payment_link_opened", {});
        window.location.assign(url);
      } catch (err) {
        const message = String(err?.message || "");
        button.disabled = false;
        if (/already paid/i.test(message)) {
          button.hidden = true;
          setStatus("success", "Good news: this booking is already paid. There's nothing else to do. We'll confirm your appointment details shortly.");
        } else if (/not set up for online payment/i.test(message)) {
          button.hidden = true;
          setStatus("success", "This booking is set to pay at your appointment, so there's nothing to pay online.");
        } else if (/not found/i.test(message)) {
          button.hidden = true;
          setStatus("error", `We couldn't find this booking. Please call us at ${PHONE}.`);
        } else {
          setStatus("error", `We couldn't open checkout right now. Please try again in a moment, or call us at ${PHONE}.`);
        }
      }
    });
  }

  initResumeFromEmail();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initWelcomeBack();
      initPayBooking();
    });
  } else {
    initWelcomeBack();
    initPayBooking();
  }
})();
