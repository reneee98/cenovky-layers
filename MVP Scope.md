# MVP Scope

## Must-have screens
1. Dashboard
2. Quotes list
3. Quote builder (detail)
4. Clients list + client form
5. Catalog list + catalog item form
6. Templates list + template editor (basic)
7. Settings

## Must-have features
- CRUD Clients
- CRUD Quotes
- Quote builder:
  - header: number, title, client, language, currency, validity date, VAT toggle
  - scope checklist: categorized checkboxes
  - items table: add from catalog, edit inline, units, qty, price, per-line discount
  - totals: subtotal, total discount, VAT (on/off), grand total
  - autosave
- Quote numbering:
  - format: YYYY-### (reset each year)
- Manual status updates
- PDF export:
  - branded layout per PDF_SPEC.md
  - export creates QuoteVersion snapshot with timestamp
  - allow listing previous versions and re-download

## Nice-to-have (explicitly excluded from MVP unless added later)
- Shareable links, tracking, emailing, acceptance workflow
- Advanced VAT regimes (reverse charge), per-line VAT exceptions
- Packages/bundles with nested line items
- Complex schedule/milestones section