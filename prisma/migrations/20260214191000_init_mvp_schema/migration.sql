-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "company_name" TEXT NOT NULL,
    "company_address" TEXT NOT NULL,
    "company_ico" TEXT,
    "company_dic" TEXT,
    "company_icdph" TEXT,
    "company_email" TEXT NOT NULL,
    "company_phone" TEXT NOT NULL,
    "company_website" TEXT,
    "logo_url" TEXT,
    "default_language" TEXT NOT NULL DEFAULT 'sk',
    "default_currency" TEXT NOT NULL DEFAULT 'EUR',
    "vat_rate" DECIMAL NOT NULL DEFAULT 20,
    "numbering_year" INTEGER NOT NULL,
    "numbering_counter" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_address_line1" TEXT NOT NULL,
    "billing_address_line2" TEXT,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "ico" TEXT,
    "dic" TEXT,
    "icdph" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_unit" TEXT NOT NULL,
    "default_unit_price" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "snippets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "default_currency" TEXT NOT NULL,
    "default_vat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "intro_snippet_id" TEXT,
    "terms_snippet_id" TEXT,
    "scope_preset" JSONB NOT NULL,
    "items_preset" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "templates_intro_snippet_id_fkey" FOREIGN KEY ("intro_snippet_id") REFERENCES "snippets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "templates_terms_snippet_id_fkey" FOREIGN KEY ("terms_snippet_id") REFERENCES "snippets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "client_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "valid_until" DATETIME NOT NULL,
    "vat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "vat_rate" DECIMAL NOT NULL,
    "intro_content_markdown" TEXT NOT NULL DEFAULT '',
    "terms_content_markdown" TEXT NOT NULL DEFAULT '',
    "revisions_included" INTEGER NOT NULL DEFAULT 1,
    "total_discount_type" TEXT NOT NULL DEFAULT 'none',
    "total_discount_value" DECIMAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quote_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "qty" DECIMAL NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "discount_pct" DECIMAL NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scope_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quote_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "scope_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quote_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quote_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "exported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_json" JSONB NOT NULL,
    "pdf_file_url" TEXT NOT NULL,
    CONSTRAINT "quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "catalog_items_category_idx" ON "catalog_items"("category");

-- CreateIndex
CREATE INDEX "catalog_items_name_idx" ON "catalog_items"("name");

-- CreateIndex
CREATE INDEX "snippets_type_language_idx" ON "snippets"("type", "language");

-- CreateIndex
CREATE INDEX "templates_name_idx" ON "templates"("name");

-- CreateIndex
CREATE INDEX "templates_language_idx" ON "templates"("language");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");

-- CreateIndex
CREATE INDEX "quotes_currency_idx" ON "quotes"("currency");

-- CreateIndex
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at");

-- CreateIndex
CREATE INDEX "quote_items_quote_id_sort_order_idx" ON "quote_items"("quote_id", "sort_order");

-- CreateIndex
CREATE INDEX "scope_items_quote_id_category_idx" ON "scope_items"("quote_id", "category");

-- CreateIndex
CREATE INDEX "scope_items_quote_id_sort_order_idx" ON "scope_items"("quote_id", "sort_order");

-- CreateIndex
CREATE INDEX "quote_versions_quote_id_idx" ON "quote_versions"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_versions_quote_id_version_number_key" ON "quote_versions"("quote_id", "version_number");
