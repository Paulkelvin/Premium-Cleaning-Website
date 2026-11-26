(function () {
  const MIN_AMOUNT = 1;

  function initOpenPaymentForm(form) {
    const stateEl = form.querySelector("[data-pay-form-state]");
    const submitBtn = form.querySelector("[data-pay-submit]");

    function setState(message, type = "") {
      if (!stateEl) return;
      stateEl.textContent = message || "";
      stateEl.className = "form-state pay-now-state";
      if (type) stateEl.classList.add(type);
    }

    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading
        ? "Opening…"
        : 'Pay now <i data-lucide="lock"></i>';
      if (typeof lucide !== "undefined") lucide.createIcons({ root: form });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setState("");

      const data = new FormData(form);
      const full_name = String(data.get("full_name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const amount = Number(data.get("amount"));
      const note = String(data.get("note") || "").trim();

      if (!full_name) {
        setState("Enter your name.", "error");
        form.querySelector('[name="full_name"]')?.focus();
        return;
      }
      if (!email) {
        setState("Enter your email.", "error");
        form.querySelector('[name="email"]')?.focus();
        return;
      }
      if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
        setState("Minimum $1.00.", "error");
        form.querySelector('[name="amount"]')?.focus();
        return;
      }
      if (typeof window.createOpenPayment !== "function") {
        setState("Unavailable — call us.", "error");
        return;
      }

      setLoading(true);
      try {
        const checkoutUrl = await window.createOpenPayment({
          full_name,
          email,
          amount,
          note,
        });
        window.location.assign(checkoutUrl);
      } catch (err) {
        setState(err?.message || "Could not open checkout.", "error");
        setLoading(false);
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-open-payment-form]").forEach(initOpenPaymentForm);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
