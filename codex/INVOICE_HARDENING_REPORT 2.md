# Invoice system hardening – deliverables report

## Goal
Ensure invoice creation uses complete supplier/client/invoice metadata and historical snapshots so no critical legal/business data is forgotten.

---

## A) Supplier data (from Settings)

**Source:** User/company settings.  
**Included in snapshot:** Company name, billing address, ICO, DIC, IC DPH, email, phone, website, **IBAN**, **SWIFT/BIC**, **company registration note** (optional).

**Schema change:** `sql/supabase_settings_supplier_fields.sql` adds to `settings`:
- `company_iban` (text, nullable)
- `company_swift_bic` (text, nullable)
- `company_registration_note` (text, nullable)

**Implementation:** `buildSupplierSnapshot(settings)` in `src/server/invoices/snapshots.ts` now includes `companyIban`, `companySwiftBic`, `companyRegistrationNote`. Settings form (`/settings`) has new fields for IBAN, SWIFT/BIC, and company registration note. PDF export renders these from snapshot when present.

---

## B) Client data (from Client billing profile)

**Source:** Client billing profile.  
**Included in snapshot:** Type (company/sole_trader/person), company/person identity, billing address, ICO, DIC, IC DPH, country, vat payer flag, tax regime default, contact person, contact email, phone, display name.

**Implementation:** Already covered by `buildClientSnapshot(client)` and `ClientSnapshot` in `src/server/invoices/snapshots.ts`. No schema change.

---

## C) Invoice meta

**Required / supported:** Invoice number, variable symbol, issue date, taxable supply date, due date, payment method, currency, vat enabled, vat rate, tax regime, legal note, internal note (optional). All are validated or normalized in `prepareInvoicePayload` in `src/server/invoices/service.ts`.

---

## D) Snapshot rule

- **At create/update:** Supplier data is copied from current Settings into `supplier_snapshot_json`; client data from Client into `client_snapshot_json`.
- **PDF and detail:** Invoice PDF and detail page use only snapshot data (`supplier_snapshot_json`, `client_snapshot_json`), not live Settings/Client.

**Implementation:** Unchanged: `createInvoiceWithItems` and `updateInvoiceWithItems` call `buildSupplierSnapshot(settings)` and `buildClientSnapshot(client)` and persist the result. PDF export reads from `invoice.supplierSnapshotJson` and `invoice.clientSnapshotJson`.

---

## E) Validation rules

**Block creation/update if missing or invalid:**
- Client identity (company name or first + last name) → `CLIENT_BILLING_IDENTITY_REQUIRED`
- Invoice number → `INVOICE_NUMBER_REQUIRED`
- Issue date, taxable supply date, due date (valid dates) → `INVALID_DATE`; due date cannot be before issue date → `DUE_DATE_BEFORE_ISSUE_DATE`
- At least one invoice item (valid unit, qty, price) → `INVOICE_ITEMS_REQUIRED`
- Totals are computed server-side from items only

**Additional:**
- Payment amount cannot exceed invoice total → `PAYMENT_EXCEEDS_TOTAL`
- Linked quote and client must belong to the same user (enforced in service/repository)
- Partial/advance invoice cannot exceed quote remaining-to-invoice → `QUOTE_REMAINING_EXCEEDED`
- All access scoped by `user_id`

**Where:** Server-side in `src/server/invoices/service.ts` (`prepareInvoicePayload`, `resolveLinkedEntities`, `hasClientBillingIdentity`, `assertQuoteAmountLimit`, `addPaymentToInvoice`). Form validation in `src/app/invoices/actions.ts` and invoice form; server is the source of truth.

---

## Files touched

| Area | Files |
|------|--------|
| Schema | `sql/supabase_settings_supplier_fields.sql` (new) |
| Snapshots | `src/server/invoices/snapshots.ts` (SupplierSnapshot + SettingsLike + buildSupplierSnapshot) |
| Settings | `src/server/db/init.ts`, `src/server/repositories/settings.repository.ts`, `src/app/settings/page.tsx`, `src/app/settings/settings-form.tsx`, `src/app/settings/actions.ts` |
| PDF | `src/server/invoices/pdf-export.ts` (supplier type + supplier lines: IBAN, SWIFT/BIC, company registration note) |
| Docs | `codex/INVOICES_LOGIC.md` (snapshot contents, validation list), `codex/INVOICE_HARDENING_REPORT.md` (this file) |

---

## Deployment note

Run the new migration so `settings` has the new columns before using the app:

```bash
# Supabase: run sql/supabase_settings_supplier_fields.sql
```

If the migration is not applied, SELECTs on `settings` that include `company_iban`, `company_swift_bic`, `company_registration_note` will fail at runtime.
