-- Add supplier billing fields to settings for invoice snapshots (IBAN, SWIFT/BIC, company registration note).
-- Run after supabase_invoices_module_migration.sql.

begin;

alter table public.settings add column if not exists company_iban text;
alter table public.settings add column if not exists company_swift_bic text;
alter table public.settings add column if not exists company_registration_note text;
alter table public.settings add column if not exists company_signature_url text;

commit;
