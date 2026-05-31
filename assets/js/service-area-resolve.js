(function initServiceAreaResolve() {
  if (!window.SERVICE_AREAS) return;

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
    const digits = String(query || "").replace(/\D/g, "");
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

  function areaToMeta(area, matched) {
    return {
      name: area.name,
      tier: area.tier || "primary",
      travelFee: Math.max(0, Number(area.travelFee) || 0),
      matched: Boolean(matched)
    };
  }

  function outsideMeta() {
    const outside = window.OUTSIDE_AREA_DEFAULT || {
      name: "Extended travel zone",
      tier: "outside",
      travelFee: 35
    };
    return {
      name: outside.name,
      tier: outside.tier || "outside",
      travelFee: Math.max(0, Number(outside.travelFee) || 35),
      matched: false
    };
  }

  function extractZipFromText(text) {
    const match = String(text || "").match(/\b(\d{5})(?:-\d{4})?\b/);
    return match ? match[1] : null;
  }

  function buildLookupAttempts(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return [];
    const attempts = [trimmed];
    const zip = extractZipFromText(trimmed);
    if (zip) attempts.push(zip);
    trimmed.split(",").map((part) => part.trim()).filter(Boolean).forEach((part) => {
      attempts.push(part);
    });
    return [...new Set(attempts)];
  }

  function resolveServiceAreaFromText(raw) {
    const attempts = buildLookupAttempts(raw);
    if (!attempts.length) return null;

    for (const attempt of attempts) {
      const zipArea = matchByZip(attempt);
      if (zipArea) return areaToMeta(zipArea, true);

      const nameMatch = matchByName(attempt);
      if (nameMatch?.area) return areaToMeta(nameMatch.area, true);
    }

    return outsideMeta();
  }

  window.resolveServiceAreaFromText = resolveServiceAreaFromText;
  window.matchServiceAreaByZip = matchByZip;
})();
