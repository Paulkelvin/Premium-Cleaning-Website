(function initServiceAreaCheck() {
  const widget = document.querySelector("[data-area-check]");
  if (!widget || !window.SERVICE_AREAS) return;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const input = widget.querySelector("[data-area-check-input]");
  const submitBtn = widget.querySelector("[data-area-check-submit]");
  const resultEl = widget.querySelector("[data-area-check-result]");
  const suggestEl = widget.querySelector("[data-area-check-suggest]");
  const continueBtn = widget.querySelector("[data-area-check-continue]");
  let lastMatch = null;

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/,?\s*(md|maryland)\.?$/i, "")
      .replace(/\s+/g, " ");
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  function matchByZip(query) {
    const digits = query.replace(/\D/g, "");
    if (digits.length < 5) return null;
    const zip = digits.slice(0, 5);
    const exact = window.SERVICE_AREAS.find((area) => area.zips?.includes(zip));
    if (exact) return exact;
    return window.SERVICE_AREAS.find((area) =>
      area.zipPrefixes?.some((prefix) => zip.startsWith(prefix))
    ) || null;
  }

  function matchByName(query) {
    const q = normalize(query);
    if (!q) return null;

    const exact = window.SERVICE_AREAS.find((area) => {
      const names = [area.name, ...(area.aliases || []), ...(area.cities || [])].map(normalize);
      return names.some((name) => {
        if (!name) return false;
        return name === q || q.includes(name) || name.includes(q);
      });
    });
    if (exact) return { area: exact, fuzzy: false };

    let best = null;
    let bestScore = Infinity;
    window.SERVICE_AREAS.forEach((area) => {
      [area.name, ...(area.aliases || []), ...(area.cities || [])].forEach((label) => {
        const score = levenshtein(q, normalize(label));
        if (score < bestScore) {
          bestScore = score;
          best = area;
        }
      });
    });
    if (best && bestScore <= 3) return { area: best, fuzzy: true, score: bestScore };
    return null;
  }

  function resolveMatch(raw) {
    const zipMatch = matchByZip(raw);
    if (zipMatch) return { area: zipMatch, type: "zip" };

    const nameMatch = matchByName(raw);
    if (nameMatch) return { ...nameMatch, type: "name" };
    return null;
  }

  function saveMeta(area) {
    const meta = {
      name: area.name,
      tier: area.tier,
      travelFee: area.travelFee || 0
    };
    try {
      sessionStorage.setItem(window.SERVICE_AREA_META_KEY, JSON.stringify(meta));
    } catch {}
    lastMatch = meta;
  }

  function renderResult(match, raw) {
    if (!resultEl) return;
    resultEl.hidden = false;
    suggestEl.hidden = true;
    continueBtn.hidden = true;

    if (!match) {
      const outside = window.OUTSIDE_AREA_DEFAULT;
      saveMeta(outside);
      resultEl.className = "area-check-result area-check-result--outside";
      resultEl.innerHTML = `<strong>Outside primary coverage</strong><p>We can still serve you — a travel fee of <strong>$${outside.travelFee}</strong> will be added to your quote. Final distance is confirmed before service.</p>`;
      continueBtn.hidden = false;
      return;
    }

    if (match.fuzzy && match.score <= 2) {
      suggestEl.hidden = false;
      suggestEl.innerHTML = `Did you mean <button type="button" class="area-check-suggest-btn" data-suggest="${escapeHtml(match.area.name)}">${escapeHtml(match.area.name)}</button>?`;
      resultEl.className = "area-check-result area-check-result--suggest";
      resultEl.innerHTML = `<strong>Almost matched</strong><p>We found a close match for “${escapeHtml(raw)}”. Tap the suggestion or try your ZIP code.</p>`;
      return;
    }

    const { area } = match;
    saveMeta(area);
    const feeNote = area.travelFee > 0
      ? `Includes a <strong>$${area.travelFee}</strong> travel fee in your quote.`
      : "No travel fee for this area.";
    const tierClass = area.tier === "primary" ? "area-check-result--ok" : "area-check-result--extended";
    resultEl.className = `area-check-result ${tierClass}`;
    resultEl.innerHTML = `<strong>${escapeHtml(area.name)} — we serve your area</strong><p>${feeNote}</p>`;
    continueBtn.hidden = false;
  }

  function runCheck() {
    const raw = input?.value?.trim();
    if (!raw) {
      resultEl.hidden = false;
      resultEl.className = "area-check-result area-check-result--error";
      resultEl.innerHTML = "<strong>Enter a ZIP or area name</strong><p>Try “Charles County” or “Mechanicsville”.</p>";
      suggestEl.hidden = true;
      continueBtn.hidden = true;
      return;
    }

    renderResult(resolveMatch(raw), raw);
  }

  submitBtn?.addEventListener("click", runCheck);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCheck();
    }
  });

  suggestEl?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-suggest]");
    if (!btn) return;
    const name = btn.dataset.suggest;
    const area = window.SERVICE_AREAS.find((item) => item.name === name);
    if (!area) return;
    if (input) input.value = area.name;
    renderResult({ area, type: "name" }, area.name);
  });

  continueBtn?.addEventListener("click", () => {
    if (!lastMatch) runCheck();
    window.location.href = "quote.html";
  });
})();
