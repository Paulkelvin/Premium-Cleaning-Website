document.addEventListener("DOMContentLoaded", () => {
  initQuoteAssistant();
  initQuoteModalIntercept();
});

function initQuoteAssistant(formContainer = document) {
  const form = formContainer.querySelector("#quoteAssistantForm");
  if (!form) return; // Only run if the form is present

  const steps = form.querySelectorAll(".quote-step");
  const btnNext = formContainer.querySelector("#btnQuoteNext");
  const btnBack = formContainer.querySelector("#btnQuoteBack");
  const btnSubmit = formContainer.querySelector("#btnQuoteSubmit");
  const progressFill = formContainer.querySelector("#quoteProgressFill");
  const progressText = formContainer.querySelector("#quoteProgressText");
  
  // Live Summary Elements
  const liveSpace = formContainer.querySelector("#liveSpace");
  const liveService = formContainer.querySelector("#liveService");
  const liveFrequency = formContainer.querySelector("#liveFrequency");
  const liveAddons = formContainer.querySelector("#liveAddons");
  const liveScope = formContainer.querySelector("#liveScope");
  const assistantBubble = formContainer.querySelector("#assistantBubble");
  
  // Review Elements
  const reviewProperty = formContainer.querySelector("#reviewProperty");
  const reviewService = formContainer.querySelector("#reviewService");
  const reviewFrequency = formContainer.querySelector("#reviewFrequency");
  const reviewSize = formContainer.querySelector("#reviewSize");
  const reviewAddons = formContainer.querySelector("#reviewAddons");
  const reviewContact = formContainer.querySelector("#reviewContact");
  const reviewMethod = formContainer.querySelector("#reviewMethod");

  let currentStepIndex = 0;
  
  function updateUI() {
    steps.forEach((step, index) => {
      if (index === currentStepIndex) {
        step.classList.add("active");
        step.style.display = "block";
        // smooth fade in
        setTimeout(() => { step.style.opacity = "1"; step.style.transform = "translateX(0)"; }, 10);
      } else {
        step.classList.remove("active");
        step.style.opacity = "0";
        step.style.transform = "translateX(10px)";
        setTimeout(() => { if(!step.classList.contains("active")) step.style.display = "none"; }, 300);
      }
    });

    const stepNum = currentStepIndex + 1;
    if (progressFill) progressFill.style.width = `${(stepNum / steps.length) * 100}%`;
    if (progressText) progressText.textContent = `Step ${stepNum} of ${steps.length}`;

    if (btnBack) btnBack.style.display = currentStepIndex === 0 ? "none" : "inline-flex";

    if (currentStepIndex === steps.length - 1) {
      if (btnNext) btnNext.style.display = "none";
      if (btnSubmit) btnSubmit.style.display = "inline-flex";
      populateReview();
    } else {
      if (btnNext) btnNext.style.display = "inline-flex";
      if (btnSubmit) btnSubmit.style.display = "none";
    }
  }

  // Set initial styles for transitions
  steps.forEach(step => {
    step.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    if (!step.classList.contains("active")) {
      step.style.display = "none";
      step.style.opacity = "0";
      step.style.transform = "translateX(10px)";
    }
  });
  
  // Initial UI state
  updateUI();

  // Next / Back Logic
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      // Basic validation of current step before proceeding
      const currentStepEl = steps[currentStepIndex];
      const inputs = currentStepEl.querySelectorAll("input[required], select[required]");
      let valid = true;
      inputs.forEach(input => {
        if (!input.reportValidity()) {
          valid = false;
        }
      });
      if (!valid) return;

      if (currentStepIndex < steps.length - 1) {
        currentStepIndex++;
        updateUI();
        updateAssistantBubble();
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentStepIndex > 0) {
        currentStepIndex--;
        updateUI();
        updateAssistantBubble();
      }
    });
  }

  // Live Summary Logic
  form.addEventListener("change", () => {
    const data = new FormData(form);
    
    const pType = data.get("property_type") || "";
    const beds = data.get("bedrooms") || "0";
    const baths = data.get("bathrooms") || "0";
    const sType = data.get("service_type") || "Pending...";
    const freq = data.get("frequency") || "-";
    const addons = data.getAll("add_ons[]");

    let spaceText = "Pending...";
    if (pType) {
      spaceText = `${pType} • ${beds} Bed, ${baths} Bath`;
    }
    
    if (liveSpace) liveSpace.textContent = spaceText;
    if (liveService) liveService.textContent = sType;
    if (liveFrequency) liveFrequency.textContent = freq;
    if (liveAddons) liveAddons.textContent = addons.length > 0 ? `${addons.length} selected` : "0 selected";

    // Estimate Scope
    if (liveScope) {
      if (sType.includes("Deep") || sType.includes("Move")) {
        liveScope.textContent = "Heavy reset scope";
      } else if (addons.length > 2) {
        liveScope.textContent = "Detailed scope";
      } else if (pType) {
        liveScope.textContent = "Standard scope";
      }
    }
  });

  function populateReview() {
    const data = new FormData(form);
    const addons = data.getAll("add_ons[]");
    
    if (reviewProperty) reviewProperty.textContent = data.get("property_type") || "-";
    if (reviewService) reviewService.textContent = data.get("service_type") || "-";
    if (reviewFrequency) reviewFrequency.textContent = data.get("frequency") || "-";
    
    const beds = data.get("bedrooms") || "0";
    const baths = data.get("bathrooms") || "0";
    const sqft = data.get("square_feet") ? `${data.get("square_feet")} sq ft` : "Unknown size";
    if (reviewSize) reviewSize.textContent = `${beds} Bed / ${baths} Bath / ${sqft}`;
    
    if (reviewAddons) reviewAddons.textContent = addons.length > 0 ? addons.join(", ") : "None";
    
    const name = data.get("full_name") || "-";
    const phone = data.get("phone") || "-";
    const email = data.get("email") || "-";
    if (reviewContact) reviewContact.textContent = `${name} • ${phone} • ${email}`;
    if (reviewMethod) reviewMethod.textContent = data.get("preferred_contact") || "-";
  }

  function updateAssistantBubble() {
    if (!assistantBubble) return;
    const messages = [
      "Hi! Let's get your instant estimate started.",
      "Got it. What type of cleaning do you need?",
      "Good choice. Any extra tasks we can handle?",
      "Almost done! Where should we send the estimate?",
      "Perfect. Please review your details below."
    ];
    assistantBubble.style.opacity = "0";
    setTimeout(() => {
      assistantBubble.textContent = messages[currentStepIndex] || messages[0];
      assistantBubble.style.opacity = "1";
    }, 200);
  }
}

// Intercept clicks on links pointing to quote.html
function initQuoteModalIntercept() {
  // If we are already on the quote page, don't intercept.
  if (window.location.pathname.endsWith("quote.html")) return;

  document.addEventListener("click", async (e) => {
    const anchor = e.target.closest('a[href="quote.html"]');
    if (!anchor) return;

    e.preventDefault();

    // Check if modal already exists
    let modal = document.getElementById("quoteModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "quoteModal";
      modal.className = "quote-modal fade-in-up";
      modal.innerHTML = `
        <div class="quote-modal-overlay"></div>
        <div class="quote-modal-content">
          <button class="quote-modal-close" aria-label="Close quote modal"><i data-lucide="x"></i></button>
          <div class="quote-modal-body" id="quoteModalBody">
            <div style="text-align:center; padding: 40px; color:var(--muted);">Loading assistant...</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector(".quote-modal-close").addEventListener("click", () => {
        modal.classList.remove("is-open");
      });
      modal.querySelector(".quote-modal-overlay").addEventListener("click", () => {
        modal.classList.remove("is-open");
      });

      // Fetch quote.html and extract the form and side panel
      try {
        const response = await fetch("quote.html");
        if (!response.ok) throw new Error("Failed to load quote");
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const appSplit = doc.querySelector(".quote-app-split");
        
        if (appSplit) {
          const modalBody = modal.querySelector("#quoteModalBody");
          modalBody.innerHTML = "";
          modalBody.appendChild(appSplit);
          
          // Add a link to continue to the full page if they prefer
          const fullPageLink = document.createElement("div");
          fullPageLink.style.textAlign = "center";
          fullPageLink.style.marginTop = "20px";
          fullPageLink.innerHTML = '<a href="quote.html" style="font-size:0.9rem; color:var(--muted); text-decoration:underline;">Continue on full page</a>';
          appSplit.appendChild(fullPageLink);

          // Re-init lucide icons and quote assistant for the new DOM elements
          if (typeof lucide !== "undefined") {
            lucide.createIcons({ root: modalBody });
          }
          initQuoteAssistant(modalBody);
        } else {
          window.location.href = "quote.html"; // Fallback
        }
      } catch (err) {
        console.error("Error loading quote modal:", err);
        window.location.href = "quote.html"; // Fallback
      }
    }

    // Give it a tiny delay to allow CSS transitions if newly added
    setTimeout(() => {
      modal.classList.add("is-open");
    }, 10);
  });
}
