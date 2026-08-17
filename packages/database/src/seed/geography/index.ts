/**
 * GEOGRAPHY REFERENCE DATA SEED
 * Idempotent — safe to run multiple times.
 *
 * Seeds the canonical country dataset only. Regions and cities are
 * deliberately NOT seeded here:
 *   - Regions are optional grouping (Country.regionId is nullable) and
 *     assigning a country to one is an ongoing admin decision, not
 *     reference data.
 *   - Cities are created per-country by an admin via the existing
 *     createCity() operation once a country is activated — there is no
 *     canonical "starter" city list the way there is for countries.
 *
 * Every seeded country starts status: INACTIVE. Existing in the database
 * is not the same as DailyBread operating there — an authorized admin
 * activates a country via the existing admin.country.service activation
 * flow before it becomes vendor-visible.
 *
 * This file is dual-purpose:
 *   - Run directly:      `tsx src/seed/geography/index.ts`
 *   - Imported by root:  `import { seedGeography } from './geography'`
 * It only connects/disconnects Prisma and calls process.exit when run
 * directly — when imported, the caller owns the Prisma lifecycle.
 */
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { prisma } from '../../index'
import { seedCountries } from './countries.seed'

export async function seedGeography() {
  console.log("🌱 Seeding DailyBread geography reference data...\n")

  console.log("  [1/1] Countries...")
  const countryCount = await seedCountries()
  console.log(`        ✓ ${countryCount} countries (seeded INACTIVE)`)

  console.log("\n✅ Geography seed complete.")
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  seedGeography()
    .catch((err) => { console.error("❌ Geography seed failed:", err); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
