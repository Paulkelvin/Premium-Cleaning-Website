(function () {
  const config = window.CLEANCO_CONFIG || {};

  function isSquareCheckoutEnabled() {
    return Boolean(
      config.squareCheckoutEnabled &&
      config.supabaseUrl &&
      config.supabaseAnonKey
    );
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
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Could not start Square checkout");
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

  window.isSquareCheckoutEnabled = isSquareCheckoutEnabled;
  window.createSquareCheckout = createSquareCheckout;
  window.initPaymentReturnBanner = initPaymentReturnBanner;
})();
