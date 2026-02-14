# Build Tasks (MVP) — Implementation Order

## Phase 1 — Foundations
1) Project setup (auth omitted for MVP if local-only)
2) Database + migrations for DATA_MODEL.md
3) Settings screen (company + defaults + numbering seed)

## Phase 2 — CRUD
4) Clients CRUD UI
5) Catalog CRUD UI
6) Snippets CRUD UI (intro/terms)
7) Templates CRUD UI (basic presets)

## Phase 3 — Quotes
8) Quotes list + filters + actions
9) Quote builder:
   - header fields
   - scope checklist
   - items table + totals
   - autosave

## Phase 4 — PDF
10) PDF generator per PDF_SPEC.md
11) QuoteVersion snapshot + history list + re-download

## Phase 5 — Polish
12) Keyboard UX for items table
13) Validation + empty states + loading states