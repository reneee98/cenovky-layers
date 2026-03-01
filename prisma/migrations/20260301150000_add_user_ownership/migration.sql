-- SQLite-oriented migration for local tests/development.
-- Production Supabase migration is in sql/supabase_auth_owner_migration.sql.

ALTER TABLE "settings" ADD COLUMN "user_id" TEXT;
ALTER TABLE "clients" ADD COLUMN "user_id" TEXT;
ALTER TABLE "catalog_items" ADD COLUMN "user_id" TEXT;
ALTER TABLE "snippets" ADD COLUMN "user_id" TEXT;
ALTER TABLE "quotes" ADD COLUMN "user_id" TEXT;
ALTER TABLE "quote_items" ADD COLUMN "user_id" TEXT;
ALTER TABLE "scope_items" ADD COLUMN "user_id" TEXT;
ALTER TABLE "quote_versions" ADD COLUMN "user_id" TEXT;

UPDATE "settings" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;
UPDATE "clients" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;
UPDATE "catalog_items" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;
UPDATE "snippets" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;
UPDATE "quotes" SET "user_id" = 'legacy-user' WHERE "user_id" IS NULL;

UPDATE "quote_items"
SET "user_id" = (
  SELECT "q"."user_id"
  FROM "quotes" AS "q"
  WHERE "q"."id" = "quote_items"."quote_id"
)
WHERE "user_id" IS NULL;

UPDATE "scope_items"
SET "user_id" = (
  SELECT "q"."user_id"
  FROM "quotes" AS "q"
  WHERE "q"."id" = "scope_items"."quote_id"
)
WHERE "user_id" IS NULL;

UPDATE "quote_versions"
SET "user_id" = (
  SELECT "q"."user_id"
  FROM "quotes" AS "q"
  WHERE "q"."id" = "quote_versions"."quote_id"
)
WHERE "user_id" IS NULL;

DROP INDEX IF EXISTS "quotes_number_key";

CREATE UNIQUE INDEX IF NOT EXISTS "settings_user_id_key" ON "settings"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "clients_id_user_id_key" ON "clients"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_items_id_user_id_key" ON "catalog_items"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "snippets_id_user_id_key" ON "snippets"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_id_user_id_key" ON "quotes"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_user_id_number_key" ON "quotes"("user_id", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_items_id_user_id_key" ON "quote_items"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "scope_items_id_user_id_key" ON "scope_items"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_versions_id_user_id_key" ON "quote_versions"("id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quote_versions_user_id_quote_id_version_number_key" ON "quote_versions"("user_id", "quote_id", "version_number");

CREATE INDEX IF NOT EXISTS "settings_user_id_idx" ON "settings"("user_id");
CREATE INDEX IF NOT EXISTS "clients_user_id_name_idx" ON "clients"("user_id", "name");
CREATE INDEX IF NOT EXISTS "catalog_items_user_id_category_idx" ON "catalog_items"("user_id", "category");
CREATE INDEX IF NOT EXISTS "catalog_items_user_id_name_idx" ON "catalog_items"("user_id", "name");
CREATE INDEX IF NOT EXISTS "snippets_user_id_type_language_idx" ON "snippets"("user_id", "type", "language");
CREATE INDEX IF NOT EXISTS "quotes_user_id_status_idx" ON "quotes"("user_id", "status");
CREATE INDEX IF NOT EXISTS "quotes_user_id_client_id_idx" ON "quotes"("user_id", "client_id");
CREATE INDEX IF NOT EXISTS "quotes_user_id_currency_idx" ON "quotes"("user_id", "currency");
CREATE INDEX IF NOT EXISTS "quotes_user_id_created_at_idx" ON "quotes"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "quote_items_user_id_quote_id_sort_order_idx" ON "quote_items"("user_id", "quote_id", "sort_order");
CREATE INDEX IF NOT EXISTS "scope_items_user_id_quote_id_category_idx" ON "scope_items"("user_id", "quote_id", "category");
CREATE INDEX IF NOT EXISTS "scope_items_user_id_quote_id_sort_order_idx" ON "scope_items"("user_id", "quote_id", "sort_order");
CREATE INDEX IF NOT EXISTS "quote_versions_user_id_quote_id_idx" ON "quote_versions"("user_id", "quote_id");
