/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `VendorType` will be added.
  - Added the required column `slug` to the `VendorType` table — backfilled from `name` below rather than
    assuming the table is empty (unlike City/Country's original slug migration), since VendorType is
    seeded data (see seed/vendor/vendor-types.seed.ts) and is expected to already have rows.

*/
-- AlterTable (nullable first — backfilled below, then locked down)
ALTER TABLE "VendorType" ADD COLUMN "slug" TEXT;

-- Backfill: lowercase name, collapse non-alphanumeric runs to a single
-- hyphen, trim leading/trailing hyphens — matches the slugify() helper
-- used by admin.region.service.ts / admin.city.service.ts.
UPDATE "VendorType"
SET "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

-- Defensive de-duplication — name is already unique, but two distinct
-- names could theoretically normalize to the same slug (e.g. punctuation-
-- only differences). Appends a numeric suffix to any collision.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
  FROM "VendorType"
)
UPDATE "VendorType" v
SET "slug" = v."slug" || '-' || ranked.rn
FROM ranked
WHERE v."id" = ranked."id" AND ranked.rn > 1;

-- AlterTable
ALTER TABLE "VendorType" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VendorType_slug_key" ON "VendorType"("slug");
