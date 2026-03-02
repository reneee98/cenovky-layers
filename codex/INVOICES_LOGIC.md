# Invoices Logic and Formulas

## Core entities
- `Invoice`
- `InvoiceItem`
- `Payment`

## Snapshot rule
When an invoice is created or edited, these snapshots are persisted on the invoice row:
- **supplier_snapshot_json** from current `Settings`: company name, billing address, ICO, DIC, IC DPH, email, phone, website, IBAN, SWIFT/BIC, company registration note (optional).
- **client_snapshot_json** from current `Client` billing profile: type (company/sole_trader/person), company/person identity, billing address, ICO, DIC, IC DPH, country, vat payer flag, tax regime default, contact person, contact email, phone, display name.

PDF export and invoice detail render from snapshot data only; live settings/client are not used for existing invoices.

## Server-side totals (authoritative)
All totals are recalculated on the server from `InvoiceItem[]`. Client-sent totals are ignored.

### Per line
For each item:
- `line_subtotal = qty * unit_price`
- `line_discount = line_subtotal * (discount_pct / 100)`
- `line_tax_base = max(line_subtotal - line_discount, 0)`
- `line_vat = vat_enabled ? line_tax_base * (vat_rate / 100) : 0`
- `line_total = line_tax_base + line_vat`

Rounded to 2 decimals.

### Invoice totals
- `subtotal = sum(line_subtotal)`
- `discount_total = sum(line_discount)`
- `tax_base_total = sum(line_tax_base)`
- `vat_total = sum(line_vat)`
- `total = tax_base_total + vat_total`
- `amount_paid = sum(payments.amount)`
- `amount_due = max(total - amount_paid, 0)`

## Invoice status
Statuses:
- `draft`
- `sent`
- `partially_paid`
- `paid`
- `overdue`
- `cancelled`

Rules:
- `cancelled` stays cancelled until manually changed.
- `paid` when `amount_paid >= total`.
- `partially_paid` when `0 < amount_paid < total`.
- `overdue` when due date is in the past and amount due is positive (for sent invoices).
- `sent` when unpaid and not overdue.
- `draft` is manual pre-send state.

## Quote invoicing metrics
For a quote, linked invoices are considered except `cancelled` invoices.

- `invoiced_amount = sum(linked_invoice.total)`
- `remaining_to_invoice = max(quote_grand_total - invoiced_amount, 0)`

`quote_grand_total` is derived from quote items + quote discounts + quote VAT.

Quote invoicing states:
- `not_invoiced` when invoiced amount is 0
- `partially_invoiced` when `0 < invoiced_amount < quote_grand_total`
- `fully_invoiced` when `invoiced_amount >= quote_grand_total`

## Validation rules enforced
**Blocking invoice creation/update if missing or invalid:**
- **Client identity** — client must have billing identity (company name or first name + last name); otherwise `CLIENT_BILLING_IDENTITY_REQUIRED`.
- **Invoice number** — required, non-empty (`INVOICE_NUMBER_REQUIRED`).
- **Issue date, taxable supply date, due date** — required, valid dates; `DUE_DATE_BEFORE_ISSUE_DATE` if due &lt; issue.
- **At least one invoice item** — required, valid unit/qty/price (`INVOICE_ITEMS_REQUIRED`).
- **Totals** — derived server-side from items; no client-sent totals used.

**Additional validations:**
- Payment amount cannot exceed invoice total (`PAYMENT_EXCEEDS_TOTAL`).
- Linked quote and client must belong to the same authenticated user (enforced in `resolveLinkedEntities` and repository).
- Partial/advance invoice total cannot exceed quote `remaining_to_invoice` (`QUOTE_REMAINING_EXCEEDED`).
- All reads/writes scoped by `user_id`.

## Create Invoice from Quote (quote detail)

**Entry:** Quote detail page → primary CTA “Vytvorit fakturu” opens a dialog.

**Flow:**
1. User clicks “Vytvorit fakturu” on quote detail.
2. Dialog shows: quote total, invoiced amount, remaining to invoice; invoice type (full / partial / advance); issue date, taxable supply date, due date; suggested invoice number (read-only); variable symbol; payment method; note.
3. **Full invoice:** All quote items are copied to the new invoice; total = remaining to invoice.
4. **Partial / advance:** User enters an amount; one line is created (“Čiastková faktúra k ponuke #X” or “Zálohová faktúra…”); amount is capped at remaining to invoice.
5. On submit, server action `createInvoiceFromQuoteAction` builds items, reserves invoice number, calls `createInvoiceWithItems` (which runs `assertQuoteAmountLimit` and `syncQuoteInvoicingState`), then redirects to the new invoice.

**Prefill sources:** Items from quote; client from quote’s client; supplier from settings (inside `createInvoiceWithItems`); currency, VAT from quote; payment method and default due days from client.

**Validations (server):** Quote exists and belongs to user; remaining to invoice &gt; 0; for partial/advance, amount &gt; 0 and ≤ remaining; dates valid; due ≥ issue. Existing checks in `createInvoiceWithItems`: client billing identity, quote remaining limit.

**Files:** `src/app/quotes/actions.ts` (`createInvoiceFromQuoteAction`), `src/app/quotes/[id]/create-invoice-dialog.tsx` (dialog + trigger), `src/app/quotes/[id]/page.tsx` (wire trigger and prefills).

---

## Invoices module (screens and yearly rules)

### Routes
- **Dashboard + list:** `GET /invoices` — dashboard cards, year filter, list with filters.
- **Detail:** `GET /invoices/[id]` — header/meta, supplier and client snapshots, items table, totals, payment history, amount paid/due, status, PDF export.
- **Create:** `GET /invoices/new` — manual create; optional `?quote_id=…` or `?client_id=…`; client required; optional link to quote; manual items.
- **Edit:** `GET /invoices/[id]/edit` — edit existing invoice (same form as create).

### Yearly summary (selected year)

- **Invoiced this year** = sum of `invoice.total` for invoices where `issue_date` falls in the selected year and `status <> 'cancelled'`. (Mixed currencies; UI shows a single number.)
- **Paid this year** = sum of `payments.amount` where `payment_date` falls in the selected year. (When the payment was recorded, not when the invoice was issued.)
- **Unpaid this year** = sum of `invoice.amount_due` for invoices with `issue_date` in the selected year and `status <> 'cancelled'`. (Outstanding balance of invoices issued that year.)
- **Overdue** = sum of `invoice.amount_due` for invoices with `issue_date` in the selected year and `status = 'overdue'`; card also shows count of such invoices.
- **Remaining to invoice from quotes** = sum of `remaining_to_invoice` over all quotes with status in `draft`, `sent`, `accepted`, `invoiced` (i.e. excluding only `rejected`). Not filtered by year; it is the current total remaining to be invoiced from quotes.

### Dashboard cards (top)
1. Fakturované tento rok (invoiced this year)  
2. Uhradené tento rok (paid this year)  
3. Neuhradené tento rok (unpaid this year)  
4. Po splatnosti (overdue amount + count)  
5. Zostáva fakturovať z ponúk (remaining to invoice from quotes)

### List filters
- **Year** — issue date year (default: current year).  
- **Status** — draft / sent / partially_paid / paid / overdue / cancelled.  
- **Client** — dropdown (all clients).  
- **Currency** — dropdown (currencies that appear on at least one invoice).  
- **Linked to quote** — all / with quote / without quote.  
- **Search** — invoice number, variable symbol, note, client name (ILIKE).

### List columns
Invoice number, client (company or name), linked quote (link or “-”), issue date, due date, total, paid, remaining due, status, actions (open, change status, delete).

### Detail page
Shows: meta (number, variable symbol, dates, payment method, currency, status, kind, tax regime, VAT, linked quote); supplier block (snapshot); client block (snapshot); items table with totals; payment history; add payment form; amount paid / amount due; change status; delete; Export PDF.

### Manual create/edit
User can create an invoice from scratch: choose client (required), optionally link to a quote, add items manually. Edit reuses the same form with existing data. Client must have billing identity for create.

### Invoice PDF export (premium layout)
- **Source:** Snapshot data only (`supplier_snapshot_json`, `client_snapshot_json`, invoice meta and items).
- **Blocks (order):** 1) Title “FAKTÚRA” + accent line; 2) Supplier (left) and Client (right) with labels DODÁVATEĽ / ODBERATEĽ; 3) Invoice meta (number, VS, dates, payment method, currency); 4) Items table with header (Položka, Množ., j., Cena/j., Zľava %, DPH %, Spolu); 5) Totals right-aligned (medzisúčet, zľava, základ dane, DPH, spolu, uhradené, zostáva na úhradu); 6) Platobné inštrukcie (VS, suma k úhrade, IBAN, SWIFT/BIC from supplier snapshot when present); 7) Právna poznámka if set; 8) Poznámka (internal) if set; 9) Footer on every page (line, “Cenovka”, Strana X / Y).
- **Table:** Header repeated on each new page; long item names/descriptions wrapped; multi-page supported.
- **Style:** Slate-like grays, blue accent, Helvetica, consistent spacing and hierarchy.
