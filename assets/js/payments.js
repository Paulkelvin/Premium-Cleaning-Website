(function () {
  const config = window.CLEANCO_CONFIG || {};

  function isSquareCheckoutEnabled() {
    return Boolean(
      config.squareCheckoutEnabled &&
      config.supabaseUrl &&
      config.supabaseAnonKey
    );
  }

  function getFunctionAuthHeaders() {
    // Edge Functions need the legacy anon JWT (eyJ...) in Authorization when JWT verify is on.
    // When JWT verify is OFF, apikey alone is enough — do not send Bearer with sb_publishable_ keys.
    const apiKey = config.supabaseFunctionKey || config.supabaseAnonKey;
    const headers = {
      "Content-Type": "application/json",
      apikey: apiKey,
    };
    if (typeof apiKey === "string" && apiKey.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  async function createSquareCheckout(bookingId) {
    if (!bookingId) {
      throw new Error("Missing booking id");
    }
    if (!isSquareCheckoutEnabled()) {
      throw new Error("Square checkout is not enabled");
    }

    const response = await fetch(`${config.supabaseUrl}/functions/v1/create-square-checkout`, {
      method: "POST",
      headers: getFunctionAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.error || data.message || `Could not start Square checkout (${response.status})`;
      throw new Error(detail);
    }
    if (!data.checkout_url) {
      throw new Error("Square checkout URL was not returned");
    }
    return data.checkout_url;
  }

  function initPaymentReturnBanner() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "complete" && !params.get("booking")) return;

    const banner = document.createElement("div");
    banner.className = "payment-return-banner";
    banner.innerHTML = `
      <p><strong>Thank you!</strong> If you completed payment, we'll confirm your appointment shortly.</p>
    `;
    document.body.prepend(banner);
  }

  async function confirmSquarePayment(bookingId) {
    if (!bookingId) {
      throw new Error("Missing booking id");
    }
    if (!isSquareCheckoutEnabled()) {
      throw new Error("Square checkout is not enabled");
    }

    const response = await fetch(`${config.supabaseUrl}/functions/v1/confirm-square-payment`, {
      method: "POST",
      headers: getFunctionAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not confirm payment");
    }
    return data;
  }

  window.isSquareCheckoutEnabled = isSquareCheckoutEnabled;
  window.createSquareCheckout = createSquareCheckout;
  window.confirmSquarePayment = confirmSquarePayment;
  window.initPaymentReturnBanner = initPaymentReturnBanner;
})();
