# PDF Specification (MVP)

## Format
- A4
- Professional brand layout: logo + typography hierarchy + clear tables.
- No images/attachments in MVP (besides logo).

## Pages / Sections
### Page 1
- Header: Company logo + company info (name, address, email, phone, website)
- Title: "Cenová ponuka" / "Quote"
- Quote meta: number, date created, valid until
- Client block: billing details + contact person
- Intro text (2–4 lines recommended)

### Page 2
- Scope of work:
  - grouped by category
  - bullet list per category

### Page 3
- Pricing table (items)
- Totals summary:
  - subtotal
  - total discount (if any)
  - VAT (if enabled)
  - grand total
- Revisions line:
  - SK: "V cene sú zahrnuté N kolá revízií."
  - EN: "N revision rounds are included."
- Terms text (short)
- Footer: "Pripravil / Prepared by" + company contact

## Snapshot rule
Each export creates QuoteVersion with a snapshot JSON used to generate the PDF.
Re-exporting an old version must reproduce the exact PDF content.