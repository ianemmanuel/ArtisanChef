/**
 * FINANCE REFERENCE DATA SEED
 * Idempotent — safe to run multiple times.
 *
 * Seeds the global payment-method catalog only (M-Pesa, Bank Transfer,
 * ...). Deliberately NOT seeded here: CountryPaymentMethod (which methods
 * are actually offered in which country, for which direction, with our
 * own collection/disbursement account details) — that's a live business
 * decision per market, belongs behind the admin payment-method endpoints,
 * not baked into a seed file. See payment-methods.data.ts.
 *
 * This file is dual-purpose:
 *   - Run directly:      `tsx src/seed/finance/index.ts`
 *   - Imported by root:  `import { seedFinance } from './finance'`
 * It only connects/disconnects Prisma and calls process.exit when run
 * directly — when imported, the caller owns the Prisma lifecycle.
 */
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { prisma } from '../../index'
import { seedPaymentMethods } from './payment-methods.seed'

export async function seedFinance() {
  console.log("🌱 Seeding DailyBread finance reference data...\n")

  console.log("  [1/1] Payment methods...")
  const paymentMethodCount = await seedPaymentMethods()
  console.log(`        ✓ ${paymentMethodCount} payment methods`)

  console.log("\n✅ Finance seed complete.")
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  seedFinance()
    .catch((err) => { console.error("❌ Finance seed failed:", err); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
