# RS Cleaning Collective — Quote & booking pricing

This document matches the live calculator in:

- `assets/js/config.js` (rates and floors)
- `assets/js/quote-assistant.js` (quote wizard and book flow)
- `supabase/functions/create-square-checkout/index.ts` (server-side verification)

Last updated: 2026-05-31

## Floors (minimums)

| Setting | Value | Applies to |
|--------|-------|------------|
| **minSqft** | **500** | Customer enters square footage directly (HTML `min` + validation) |
| **minimumJob** | **$125** | Base price after `sqft × rate`; if base is &gt; $0 and &lt; $125, base becomes **$125** |

Beds/baths mode does **not** use `minSqft`. It uses the estimator below (e.g. 1 bed / 1 bath → **950 sq ft**).

Square online checkout rejects totals below **$125.00** (12,500 cents).

---

## Step 1 — Square footage

**If the customer enters square footage:** use that number (must be ≥ **500**).

**If using bedrooms / bathrooms** (or sq ft not entered):

```
sqft = round(bedrooms × 450 + bathrooms × 150 + 350)
```

Defaults when a field is missing: bedrooms → **2**, bathrooms → **1**.

| Beds | Baths | Estimated sq ft |
|------|-------|-----------------|
| 1 | 1 | 950 |
| 2 | 1 | 1,400 |
| 2 | 2 | 1,550 |
| 3 | 2 | 2,000 |

---

## Step 2 — Base price

```
basePrice = sqft × rate[service type]
```

If `basePrice > 0` and `basePrice < minimumJob` ($125), then `basePrice = 125`.

| Service type | Rate ($/sq ft) |
|--------------|----------------|
| Standard cleaning | 0.17 |
| Deep cleaning | 0.28 |
| Move-in/Move-out | 0.32 |
| Office cleaning | 0.20 |

---

## Step 3 — Add-ons (flat fees, summed)

| Add-on | Price |
|--------|-------|
| Wash and fold | $45 |
| Fold laundry only | $25 |
| Inside oven | $40 |
| Inside fridge | $40 |
| Cabinet interiors | $50 |
| Interior Windows Accessible (1-10) | $50 |
| Interior Windows Accessible (11-20) | $100 |
| Bedding refresh (strip and remake beds) | $15 |

---

## Step 4 — Frequency discount

Applied to **base + add-ons** (before travel):

```
discounted = (basePrice + addonsPrice) × (1 − discount)
```

| Frequency | Discount |
|-----------|----------|
| Weekly | 20% |
| Bi-weekly | 15% |
| Monthly | 10% |
| One-time | 0% |

---

## Step 5 — Travel fee

From service area (ZIP/name check on Areas page, quote session, or **booking address**):

| Coverage | Typical travel fee |
|----------|-------------------|
| Charles, St. Mary's, Calvert, Prince George's counties | $0 |
| Extended / outside primary (e.g. **Extended travel zone**) | **$35** (default outside) |
| Stored per-area fees | See `assets/js/service-areas-data.js` |

Address matching is flexible: full address, ZIP, city, or county substring (see `assets/js/service-area-resolve.js`).

---

## Step 6 — Final total

```
total = round((discounted + travelFee) × 100) / 100
```

---

## Example A — 1 bed, 1 bath, standard, one-time, in-county

1. sq ft = 450 + 150 + 350 = **950**
2. Base = 950 × 0.17 = **$161.50** (above $125 minimum)
3. Add-ons: $0 → subtotal **$161.50**
4. Discount (one-time): 0% → **$161.50**
5. Travel (primary county): **$0**
6. **Total ≈ $161.50**

---

## Example B — Typed 500 sq ft, standard, one-time, outside area

1. sq ft = **500** (minimum entered size)
2. Base = 500 × 0.17 = **$85** → raised to **$125** (minimum job)
3. Discount: 0% → **$125**
4. Travel (outside): **$35**
5. **Total ≈ $160.00**

---

## Example C — Typed 400 sq ft (rejected in UI)

Validation requires at least **500** sq ft when using the square-footage field.

---

## Booking & Square

1. Quote saved → `sessionStorage` + optional `quote_requests` row.
2. Book → address resolves service area; total uses locked quote when `quote_id` present.
3. **Pay online** → `create-square-checkout` uses stored `estimated_total` (≥ $125).
4. **Pay at service** → no Square redirect.

Regenerate the Word handout (optional):

```bash
pip install python-docx
python scripts/create-quote-formula-doc.py
```

Output: `~/Downloads/RS-Cleaning-Quote-Pricing-Formula.docx`
