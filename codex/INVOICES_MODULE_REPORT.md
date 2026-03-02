# Invoices module – deliverables report

## Delivered

### 1. Invoices Dashboard (`/invoices`)
- **Top cards:** Invoiced this year, Paid this year, Unpaid this year, Overdue (amount + count), Remaining to invoice from quotes.
- **Year filter:** Default = current year; user can switch year (dropdown in toolbar).
- **Calculation rules:** See INVOICES_LOGIC.md § “Yearly summary (selected year)”.

### 2. Invoices List (same page, below dashboard)
- **Columns:** Invoice number, client, linked quote, issue date, due date, total, paid, remaining due, status, actions (open, change status, delete).
- **Filters:** Year, status, client, currency, linked/unlinked to quote, search (number / variable symbol / note / client name).

### 3. Invoice Detail (`/invoices/[id]`)
- **Content:** Header/meta, supplier block (snapshot), client block (snapshot), items table, totals, payment history, amount paid/due, status, add payment, change status, delete, Export PDF.

### 4. Manual create/edit
- **Create:** `/invoices/new` — select client (required), optionally link to quote (`?quote_id=…` or `?client_id=…`), add items manually.
- **Edit:** `/invoices/[id]/edit` — same form, existing data.

## Summary calculation rules (selected year)

| Metric | Rule |
|--------|------|
| Invoiced this year | Sum of `invoice.total` where `issue_date` in year, `status <> 'cancelled'` |
| Paid this year | Sum of `payments.amount` where `payment_date` in year |
| Unpaid this year | Sum of `invoice.amount_due` where `issue_date` in year, `status <> 'cancelled'` |
| Overdue | Sum of `amount_due` for invoices in year with `status = 'overdue'`; count of such invoices |
| Remaining to invoice from quotes | Sum of `remaining_to_invoice` for quotes with status in draft/sent/accepted/invoiced (not rejected); not year-filtered |

## Files touched

- `src/app/invoices/page.tsx` — dashboard cards, year filter, list filters (client, currency, linked), list table.
- `src/server/repositories/invoice.repository.ts` — `ListInvoicesFilters`: added `currency`, `linkedToQuote`; added `listInvoiceCurrencies`.
- `src/server/invoices/quote-metrics.ts` — `listQuotesWithInvoicingMetrics(userId, { quoteStatuses })` for remaining-from-quotes by quote status.
- `codex/INVOICES_LOGIC.md` — section “Invoices module (screens and yearly rules)”.
- `codex/INVOICES_MODULE_REPORT.md` — this report.

## Existing (unchanged)

- Invoice detail page, PDF export, create/edit form, payment add/delete, status/delete actions were already in place; no structural changes.
