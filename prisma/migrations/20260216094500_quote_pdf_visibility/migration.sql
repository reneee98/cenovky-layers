ALTER TABLE "quotes"
  ADD COLUMN "show_client_details_in_pdf" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "quotes"
  ADD COLUMN "show_company_details_in_pdf" BOOLEAN NOT NULL DEFAULT true;
