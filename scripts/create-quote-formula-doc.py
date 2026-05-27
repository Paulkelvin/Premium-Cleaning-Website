"""Generate RS Cleaning quote formula Word doc in Downloads."""
from pathlib import Path

try:
    from docx import Document
    from docx.shared import Pt
except ImportError:
    raise SystemExit("python-docx required: pip install python-docx")

OUT = Path.home() / "Downloads" / "RS-Cleaning-Quote-Pricing-Formula.docx"

doc = Document()
doc.add_heading("RS Cleaning Collective — Quote Pricing Formula", 0)
doc.add_paragraph(
    "This document describes how the website quote wizard calculates estimated totals. "
    "Values come from assets/js/config.js and assets/js/quote-assistant.js."
)

doc.add_heading("Step 1 — Square footage", level=1)
doc.add_paragraph("If the customer enters square footage, that value is used.")
doc.add_paragraph(
    "If square footage is not entered (live estimate during the wizard only):"
)
p = doc.add_paragraph()
p.add_run("sqft = round(beds × 450 + baths × 150 + 350)").bold = True
doc.add_paragraph("Defaults when missing: bedrooms → 2, bathrooms → 1.")

doc.add_heading("Step 2 — Base price", level=1)
doc.add_paragraph("basePrice = sqft × rate[service type]")
table = doc.add_table(rows=5, cols=2)
table.style = "Table Grid"
hdr = table.rows[0].cells
hdr[0].text = "Service type"
hdr[1].text = "Rate ($ per sq ft)"
rows = [
    ("Standard cleaning", "0.17"),
    ("Deep cleaning", "0.30"),
    ("Move-in/Move-out", "0.35"),
    ("Office cleaning", "0.20"),
]
for i, (a, b) in enumerate(rows, 1):
    table.rows[i].cells[0].text = a
    table.rows[i].cells[1].text = b
doc.add_paragraph(
    "Minimum job: If basePrice is greater than 0 and less than $100, basePrice is set to $100."
)

doc.add_heading("Step 3 — Add-ons (flat fees, summed)", level=1)
t2 = doc.add_table(rows=9, cols=2)
t2.style = "Table Grid"
t2.rows[0].cells[0].text = "Add-on"
t2.rows[0].cells[1].text = "Price"
addons = [
    ("Carpet cleaning", "$75"),
    ("Wash and fold", "$45"),
    ("Inside oven", "$25"),
    ("Inside fridge", "$25"),
    ("Cabinet interiors", "$30"),
    ("Interior windows", "$40"),
    ("Junk removal", "$95"),
    ("Power washing", "$120"),
]
for i, (a, b) in enumerate(addons, 1):
    t2.rows[i].cells[0].text = a
    t2.rows[i].cells[1].text = b

doc.add_heading("Step 4 — Frequency discount", level=1)
doc.add_paragraph("Applied to base price plus add-ons:")
doc.add_paragraph("subtotal = (basePrice + addonsPrice) × (1 − discount)")
t3 = doc.add_table(rows=5, cols=2)
t3.style = "Table Grid"
t3.rows[0].cells[0].text = "Frequency"
t3.rows[0].cells[1].text = "Discount"
for i, (a, b) in enumerate(
    [
        ("Weekly", "20%"),
        ("Bi-weekly", "15%"),
        ("Monthly", "10%"),
        ("One-time", "0%"),
    ],
    1,
):
    t3.rows[i].cells[0].text = a
    t3.rows[i].cells[1].text = b

doc.add_heading("Step 5 — Travel fee", level=1)
doc.add_paragraph(
    "Added based on ZIP / service area (primary areas $0; extended $15–$25; outside up to $45). "
    "See assets/js/service-areas-data.js."
)

doc.add_heading("Step 6 — Final total", level=1)
p2 = doc.add_paragraph()
p2.add_run("total = round((subtotal + travelFee) × 100) / 100").bold = True

doc.add_heading("Example: 1 bed, 1 bath, standard, no add-ons, one-time, Austin", level=1)
doc.add_paragraph("Estimated sq ft: 1×450 + 1×150 + 350 = 950")
doc.add_paragraph("Base: 950 × 0.17 = $161.50 (above $100 minimum)")
doc.add_paragraph("Add-ons: $0 | Frequency discount: 0% | Travel (primary): $0")
doc.add_paragraph("Estimated total: approximately $161.50")
doc.add_paragraph(
    "A total of $100 means the calculated base was below the $100 minimum "
    "(square footage under about 588 for standard cleaning), or a lower square footage was entered."
)

doc.save(OUT)
print(str(OUT))
