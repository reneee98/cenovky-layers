# Product Spec — Quote Builder (PDF-first)

## Goal
A web application that allows a single user to create professional pricing quotes quickly and export them to branded PDFs.

## Primary user outcome
Create and export a quote in 3–7 minutes, with consistent structure, accurate totals, and reusable templates/catalog items.

## Core entities
- Client
- Quote
- QuoteItem
- ScopeChecklist selection (per Quote)
- Template (QuoteTemplate)
- Snippets (Intro/Terms)
- Settings (company, defaults, VAT rate, numbering)
- QuoteVersion (PDF export snapshot)

## Key workflows
1) Create quote (blank or from template)
2) Select client (billing details)
3) Configure quote: language, currency, validity date, VAT toggle
4) Build scope: click checklist items (categorized)
5) Add quote items: from catalog, edit qty/unit/price/discount
6) Apply total discount (optional)
7) Export PDF -> create immutable QuoteVersion snapshot
8) Manually update status as the process moves forward

## Quote states
- Draft: editable
- Sent: exported and sent externally
- Accepted / Rejected: manual update
- Invoiced: manual update

## Non-goals (MVP)
- No emailing from app
- No online share link / acceptance button / e-signature
- No view tracking
- No attachments
- No per-item internal notes
- No variant pricing (Good/Better/Best)

## Supported units
- hour (h)
- day
- piece (pcs)
- package (pkg)

## Discounts
- Per-line discount (%)
- Optional total quote discount (% or fixed amount)