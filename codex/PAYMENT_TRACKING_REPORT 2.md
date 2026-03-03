# Payment tracking – deliverables report

## Payment model

Table `payments`:

- `id` (PK), `user_id`, `invoice_id` (FK → invoices), `payment_date`, `amount`, `method`, `note`, `created_at`
- One invoice has many payments. `amount_paid` and `amount_due` on the invoice are derived (see below).

## Business rules

- **amount_paid** = sum of all payments for the invoice.
- **amount_due** = `invoice.total - amount_paid` (never negative).
- **Status:**
  - `amount_paid >= total` → **paid**
  - `amount_paid > 0` and `amount_paid < total` → **partially_paid**
  - `amount_paid = 0` and due date passed → **overdue**
  - Otherwise (sent, draft, etc.) as per `resolveInvoiceStatus` in `src/lib/invoices/status.ts`.
- **Overpayment:** Adding a payment that would make `amount_paid > total` is rejected (server: `PAYMENT_EXCEEDS_TOTAL`). No overpayment handling.

## Required statuses

All supported: **draft**, **sent**, **partially_paid**, **paid**, **overdue**, **cancelled** (see `INVOICE_STATUS_OPTIONS` in `src/lib/invoices/status.ts`).

## Add Payment CTA and form

- **Invoice detail** (`/invoices/[id]`): Section “Platby” shows “Na uhradu: X” and a **Pridať platbu** button.
- **Add Payment dialog** (client): Opens from the button; fields:
  - Payment date
  - Amount (client-side: cannot exceed remaining due; server re-validates)
  - Payment method (text)
  - Note (optional)
- Submit calls server action `addPaymentAction` → `addPaymentToInvoice` → redirect back with notice.

## Payment history UI

- Same page, section **História platieb**: table with columns Dátum, Metoda, Suma, Poznámka, Akcia (Odstraniť).
- Delete calls `deletePaymentAction` → `deletePaymentFromInvoice`; invoice totals and status are recalculated.

## Automatic status recalculation

- After **add** or **delete** payment, `updateInvoicePaymentSummary` runs in the same transaction:
  - Sums payments → `amount_paid`
  - `amount_due = total - amount_paid`
  - Resolves status via `resolveStoredStatus` (which uses `resolveInvoiceStatus`: paid / partially_paid / overdue / sent / draft; cancelled unchanged)
  - Updates `invoices.amount_paid`, `amount_due`, `status`.
- `refreshOverdueInvoices` is called after payment actions so overdue state is up to date.

## Files

- **Model / SQL:** `sql/supabase_invoices_module_migration.sql` (payments table).
- **Repository:** `src/server/repositories/payment.repository.ts` (list, create, delete).
- **Service:** `src/server/invoices/service.ts` — `addPaymentToInvoice`, `deletePaymentFromInvoice`, `updateInvoicePaymentSummary`, `resolveStoredStatus`.
- **Status:** `src/lib/invoices/status.ts` — `resolveInvoiceStatus`, status labels.
- **Actions:** `src/app/invoices/actions.ts` — `addPaymentAction`, `deletePaymentAction`, error mapping (`PAYMENT_EXCEEDS_TOTAL`, etc.).
- **UI:** `src/app/invoices/[id]/add-payment-dialog.tsx` (Add Payment dialog + trigger), `src/app/invoices/[id]/page.tsx` (invoice detail: Platby section + payment history).

## Logic summary

- Payment add: validate amount &gt; 0, method required, amount ≤ remaining due → insert payment → `updateInvoicePaymentSummary` → optional quote sync.
- Payment delete: delete payment → `updateInvoicePaymentSummary`.
- No overpayment; status always derived from totals and due date.
