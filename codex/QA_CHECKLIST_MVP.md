# MVP QA Checklist

## 1) Dashboard
- [ ] Dashboard page loads without errors.
- [ ] Left navigation links to Quotes, Clients, Catalog, Templates, Settings.

## 2) Settings
- [ ] Settings page loads even on fresh DB (singleton row auto-created).
- [ ] Required fields validate (`company_name`, `address`, `email`, `phone`, `default_language`, `default_currency`, `vat_rate`, numbering fields).
- [ ] Email validation shows error on invalid email.
- [ ] `vat_rate` validation shows error for non-numeric input.
- [ ] `default_language` supports `sk` and `en`.
- [ ] Numbering section shows `numbering_year` and `numbering_counter`.
- [ ] "Reset for new year" is visible only when stored year differs from current year.
- [ ] Reset action sets year to current year and counter to `0`.

## 3) Clients
- [ ] Clients list loads with empty state when no records exist.
- [ ] Search by client name works.
- [ ] Create client form validates required fields + email.
- [ ] Edit client form saves changes.
- [ ] Delete action asks for confirmation and removes client when allowed.

## 4) Catalog
- [ ] Catalog list loads with empty state when no records exist.
- [ ] Search by name/description works.
- [ ] Filters by category and tag work.
- [ ] Create/edit validates required fields + numeric unit price.
- [ ] Delete action asks for confirmation and removes item.

## 5) Snippets
- [ ] Snippets list loads with empty state when no records exist.
- [ ] Filters by type and language work.
- [ ] Create/edit validates required fields.
- [ ] Delete action asks for confirmation and removes snippet.

## 6) Templates
- [ ] Templates list loads with empty state when no records exist.
- [ ] Template editor supports:
  - [ ] name, language, default currency, VAT default
  - [ ] intro/terms snippet selection
  - [ ] scope preset CRUD
  - [ ] items preset CRUD and CatalogPicker add
- [ ] 6 starter templates exist after init.

## 7) Quotes List
- [ ] Quotes list loads with empty state when no records exist.
- [ ] Filters work: status, client, currency, date range, search.
- [ ] Table columns are present: number, title, client, status, created_at, valid_until, total, currency.
- [ ] Actions work: Open, Duplicate, Export PDF, Change status, Delete.
- [ ] Status is manually editable and persists.

## 8) Quote Builder
- [ ] Header fields exist: number (readonly), title, client, language, currency, valid_until, VAT toggle, status.
- [ ] Scope checklist is categorized and searchable.
- [ ] Items table supports:
  - [ ] add from CatalogPicker
  - [ ] inline edit name/unit/qty/unit price/discount
  - [ ] line total calculation
- [ ] Totals block shows subtotal, total discount, VAT amount, grand total.
- [ ] Autosave persists quote + items + scope selections.
- [ ] Duplicate quote creates new quote with new number and copied content.

## 9) Numbering
- [ ] Quote number format is `YYYY-###`.
- [ ] Number increments by counter.
- [ ] On year reset in Settings, next quote starts from `YYYY-001`.

## 10) PDF Export + Versions
- [ ] Export creates a new QuoteVersion row (`version_number` increments per quote).
- [ ] Quote detail shows versions list with download links.
- [ ] Download endpoint returns a PDF file.
- [ ] If stored PDF is missing, download regenerates PDF from `snapshot_json`.
- [ ] Re-generated PDF matches content from snapshot (same quote data, items, scope, totals).

## 11) Exclusions (must NOT be present)
- [ ] No emailing from app.
- [ ] No share links.
- [ ] No viewed tracking.
- [ ] No acceptance workflow / e-sign.
- [ ] No attachments.
- [ ] No advanced VAT regimes (reverse charge, per-line VAT exceptions).
- [ ] No bundle/nested package line items.
- [ ] No complex schedule/milestones section.
