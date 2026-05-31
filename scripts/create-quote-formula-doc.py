"""Generate RS Cleaning quote formula handout in Downloads (.txt + .docx)."""
from pathlib import Path

try:
    from docx import Document
except ImportError:
    Document = None

DOWNLOADS = Path.home() / "Downloads"
TXT_OUT = DOWNLOADS / "RS-Cleaning-Quote-Pricing-Formula.txt"
DOCX_OUT = DOWNLOADS / "RS-Cleaning-Quote-Pricing-Formula.docx"

MIN_SQFT = 500
MIN_JOB = 125

BODY = """RS Cleaning Collective — Quote Pricing Formula

This document describes how the website quote wizard calculates estimated totals. Values come from assets/js/config.js and assets/js/quote-assistant.js (see also docs/QUOTE_PRICING.md).

Step 1 — Square footage

If the customer enters square footage, that value is used (minimum {min_sqft} sq ft when typing sq ft directly).

If square footage is not entered (beds/baths mode, or live estimate during the wizard only):

sqft = round(beds × 450 + baths × 150 + 350)

Defaults when missing: bedrooms → 2, bathrooms → 1.

Step 2 — Base price

basePrice = sqft × rate[service type]

Service type                          Rate ($ per sq ft)
Standard cleaning                     0.17
Deep cleaning                         0.28
Move-in/Move-out                      0.32
Office cleaning                       0.20

Minimum job (base): If basePrice is greater than 0 and less than ${min_job}, basePrice is set to ${min_job}.

Step 3 — Add-ons (flat fees, summed)

Add-on                                                Price
Wash and fold                                         $45
Fold laundry only                                     $25
Inside oven                                           $40
Inside fridge                                         $40
Cabinet interiors                                     $50
Interior Windows Accessible (1-10)                    $50
Interior Windows Accessible (11-20)                   $100
Bedding refresh (strip and remake beds)               $15

Step 4 — Frequency discount

Applied to base price plus add-ons:

subtotal = (basePrice + addonsPrice) × (1 − discount)

Frequency         Discount
Weekly            20%
Bi-weekly         15%
Monthly           10%
One-time          0%

Step 5 — Travel fee

Added based on ZIP / service area / booking address (flexible city, county, or ZIP match).

Charles County, St. Mary's County, Calvert County, Prince George's County    $0
Extended travel zone / outside primary counties                             $35 (default)
Other stored per-area fees                                                  See assets/js/service-areas-data.js

Step 6 — Final total

discounted = subtotal from Step 4
total = round((discounted + travelFee) × 100) / 100

Final minimum: If total is greater than 0 and less than ${min_job}, total is set to ${min_job}. (Recurring frequency discounts can otherwise bring a ${min_job} base below the job minimum.)

Pay online (Square) requires total ≥ ${min_job}.00.

Example: 1 bed, 1 bath, standard, no add-ons, one-time, in-county (Southern Maryland)

Estimated sq ft: 1×450 + 1×150 + 350 = 950
Base: 950 × 0.17 = $161.50 (above ${min_job} minimum)
Add-ons: $0 | Frequency discount: 0% | Travel (primary county): $0
Estimated total: approximately $161.50

Example: 500 sq ft typed, standard, one-time, outside primary area

Base: 500 × 0.17 = $85 → raised to ${min_job} (minimum job)
After discount: ${min_job} | Travel (extended): $35
Estimated total: approximately $160.00

Example: 500 sq ft typed, standard, weekly, in-county (no travel)

Base: 500 × 0.17 = $85 → raised to ${min_job}
After 20% weekly discount: $100 → final minimum raises total to ${min_job}
Estimated total: ${min_job}.00

A total of ${min_job} often means the calculated amount was below the minimum job floor (small sq ft, recurring discount, or both). Square footage under about 735 sq ft for standard cleaning hits the base floor before discounts.
""".format(
    min_sqft=MIN_SQFT,
    min_job=MIN_JOB,
)


def write_txt():
    TXT_OUT.write_text(BODY, encoding="utf-8")
    return TXT_OUT


def write_docx():
    if Document is None:
        raise SystemExit("python-docx required for .docx: pip install python-docx")

    doc = Document()
    for block in BODY.split("\n\n"):
        lines = block.strip().split("\n")
        if not lines:
            continue
        first = lines[0]
        if first.startswith("RS Cleaning Collective"):
            doc.add_heading(first, 0)
            for line in lines[1:]:
                if line.strip():
                    doc.add_paragraph(line)
        elif first.startswith("Step ") or first.startswith("Example:"):
            doc.add_heading(first, level=1)
            for line in lines[1:]:
                if line.strip():
                    doc.add_paragraph(line)
        else:
            doc.add_paragraph(block)

    doc.save(DOCX_OUT)
    return DOCX_OUT


if __name__ == "__main__":
    txt_path = write_txt()
    print(txt_path)
    try:
        docx_path = write_docx()
        print(docx_path)
    except SystemExit as e:
        print(e)
