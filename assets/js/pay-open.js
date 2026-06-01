(function () {
  const MIN_AMOUNT = 1;

  function initOpenPaymentForm(form) {
    const stateEl = form.querySelector("[data-pay-form-state]");
    const submitBtn = form.querySelector("[data-pay-submit]");

    function setState(message, type = "") {
      if (!stateEl) return;
      stateEl.textContent = message || "";
      stateEl.className = "form-state";
      if (type) stateEl.classList.add(type);
    }

    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      submitBtn.setAttribute("aria-busy", loading ? "true" : "false");
      submitBtn.innerHTML = loading
        ? `Opening checkout… <i data-lucide="loader-circle"></i>`
        : `Pay now <i data-lucide="lock"></i>`;
      if (typeof lucide !== "undefined") lucide.createIcons({ root: submitBtn.parentElement || form });
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
        setState("Please enter your name.", "error");
        form.querySelector('[name="full_name"]')?.focus();
        return;
      }
      if (!email) {
        setState("Please enter your email.", "error");
        form.querySelector('[name="email"]')?.focus();
        return;
      }
      if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
        setState(`Please enter an amount of at least $${MIN_AMOUNT.toFixed(2)}.`, "error");
        form.querySelector('[name="amount"]')?.focus();
        return;
      }

      if (typeof window.createOpenPayment !== "function") {
        setState("Online payment is not available right now. Please call us.", "error");
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
        setState(err?.message || "Could not open checkout. Please try again or call us.", "error");
        setLoading(false);
      }
    });
  }

  function initAllOpenPaymentForms() {
    document.querySelectorAll("[data-open-payment-form]").forEach(initOpenPaymentForm);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllOpenPaymentForms);
  } else {
    initAllOpenPaymentForms();
  }
})();
