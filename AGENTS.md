# AGENTS.md — Quote Builder (PDF-first)

## Read these first (source of truth)
Before doing any work, read:
- codex/README.md
- codex/SPEC.md
- codex/MVP_SCOPE.md
- codex/DATA_MODEL.md
- codex/UX_UI.md
- codex/PDF_SPEC.md
- codex/API_SPEC.md
- codex/TASKS.md

If there is a conflict, the order above is the priority order.

## Product decisions (non-negotiables)
- Single-user app (solo). No teams/roles in MVP.
- PDF export only. No emailing from app. No share links. No “viewed” tracking.
- Manual quote statuses: Draft / Sent / Accepted / Rejected / Invoiced.
- Quotes support SK/EN + multi-currency per quote.
- VAT/DPH is a per-quote GLOBAL toggle (on/off). One VAT rate comes from Settings.
- Scope is built via categorized checklist selections (not freeform as primary).
- Items come from a catalog (categories + tags + default unit + price + optional description).
- Templates exist (6). No Good/Better/Best variants in MVP.
- Each PDF export creates an immutable QuoteVersion snapshot.
- No attachments. No per-item internal notes.

## Engineering rules
- Do not add features outside codex/MVP_SCOPE.md.
- Optimize UX for speed: minimal clicks, inline editing in items table, autosave in builder.
- Keep logic deterministic and simple.
- Every PDF export must be reproducible from the stored QuoteVersion snapshot.

## How to work
1) Propose a short implementation plan (3–8 bullets).
2) Implement with small, reviewable changes.
3) Run the project’s checks (lint/tests/build) if available.
4) Summarize what changed and what files were touched.

## Setup / commands (EDIT to your stack)
- Install: `npm install`
- Dev: `npm run dev`
- Tests: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`

If commands differ, discover them from package.json and update this file.