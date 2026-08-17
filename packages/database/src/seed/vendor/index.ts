/**
 * VENDOR REFERENCE DATA SEED
 * Idempotent — safe to run multiple times.
 *
 * Seeds global vendor type definitions only (Restaurant, Bakery, ...).
 * Deliberately NOT seeded here:
 *   - VendorTypeCountry (which types are available in which country)
 *   - DocumentTypeConfig / DocumentTypeVendorType (per-country document
 *     requirements)
 * Both are live business/regulatory decisions that differ per market —
 * they belong behind the admin vendor-type and document-type endpoints,
 * not baked into a seed file.
 *
 * This file is dual-purpose:
 *   - Run directly:      `tsx src/seed/vendor/index.ts`
 *   - Imported by root:  `import { seedVendor } from './vendor'`
 * It only connects/disconnects Prisma and calls process.exit when run
 * directly — when imported, the caller owns the Prisma lifecycle.
 */
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { prisma } from '../../index'
import { seedVendorTypes } from './vendor-types.seed'

export async function seedVendor() {
  console.log("🌱 Seeding DailyBread vendor reference data...\n")

  console.log("  [1/1] Vendor types...")
  const vendorTypeCount = await seedVendorTypes()
  console.log(`        ✓ ${vendorTypeCount} vendor types`)

  console.log("\n✅ Vendor seed complete.")
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  seedVendor()
    .catch((err) => { console.error("❌ Vendor seed failed:", err); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
