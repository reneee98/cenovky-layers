# Codex Context — Quote Builder (PDF-first)

This folder contains the canonical product and engineering specs for the Quote Builder web app.
When generating code or making changes, treat these documents as the source of truth.

## Product profile (fixed decisions)
- Single-user app (solo). No roles/teams in MVP.
- Quotes are sent outside the app: PDF export only.
- No email sending, no tracking "viewed".
- Manual statuses: Draft / Sent / Accepted / Rejected / Invoiced.
- Quotes support SK/EN language and multi-currency.
- VAT (DPH) is a per-quote global toggle (on/off) using one VAT rate configured in settings.
- Scope is built via modular checklist (clickable items).
- Items come primarily from a catalog (categories + tags + default unit + price + description).
- Templates (6) bootstrap common quote types.
- Each PDF export creates an immutable Quote Version snapshot.

## Working rules
- Prefer simple deterministic behavior over complex features.
- Optimize for speed: minimal clicks, inline editing, keyboard-friendly table.
- Do not add features not explicitly included in MVP_SCOPE.md.
- Keep UI clean and consistent with UX_UI.md.