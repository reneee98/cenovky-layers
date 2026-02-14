# UX/UI Guidelines (MVP)

## UX principles
- Speed-first: create/export quote in minutes.
- Minimal friction: inline editing, minimal modals.
- Autosave in builder.
- Consistent table behavior and shortcuts.

## Navigation
- Left sidebar (or top nav) with: Dashboard, Quotes, Clients, Catalog, Templates, Settings.

## Quotes list
- Table with filters (status, client, currency, date).
- Primary actions: Open, Duplicate, Export PDF, Change status.

## Quote builder layout
- Two-column layout:
  - Left: editing (intro, scope checklist, items, revisions, terms)
  - Right: PDF preview (or export panel if preview is heavy)
- Sticky footer actions: Save, Export PDF, Duplicate

## Items table requirements
- Add item from catalog via searchable picker.
- Columns: Name, Unit, Qty, Unit Price, Discount %, Line Total.
- Total section: subtotal, total discount, VAT toggle + VAT amount, grand total.
- Keyboard friendly: Enter adds row; Tab moves cell-to-cell.

## Scope checklist
- Accordion by category.
- Search within checklist.
- Selected items shown in PDF grouped by category.

## Language/currency
- Per-quote selectors in header.
- Snippets and labels respect language.

## Visual style
- Clean, modern, minimal.
- Brand accent color only for headings/accents.
- PDF tables must be highly readable.