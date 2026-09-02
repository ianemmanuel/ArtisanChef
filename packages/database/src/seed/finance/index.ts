/**
 * FINANCE REFERENCE DATA SEED
 * Idempotent — safe to run multiple times.
 *
 * Seeds:
 *   1. Currency reference table (ISO-4217 + real minor-unit digits).
 *   2. Country.currencyCode backfill from the legacy `currency` string
 *      (only fills nulls; the `currency` string is left untouched).
 *   3. Payment-method catalog (M-Pesa, Bank Transfer, …).
 *   4. Payment-provider CATALOG (Flutterwave, Stripe) — declarations of
 *      which provider implementations exist + their expected capabilities.
 *      NOT integrations.
 *   5. Launch country (Kenya): a DRAFT CountryFinancialConfig + a DRAFT
 *      TEST Flutterwave CountryProviderAccount, pre-linked but NOT
 *      activated — activation stays an explicit admin operation.
 *
 * Deliberately NOT seeded: CountryPaymentMethod (which methods a country
 * actually offers is a live admin decision), and nothing here is ever
 * activated.
 *
 * Dual-purpose:
 *   - Run directly:      `tsx src/seed/finance/index.ts`
 *   - Imported by root:  `import { seedFinance } from './finance'`
 */
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { prisma } from '../../index'
import { seedCurrencies } from './currencies.seed'
import { backfillCountryCurrency } from './backfill-country-currency.seed'
import { seedPaymentMethods } from './payment-methods.seed'
import { seedPaymentProviders } from './payment-providers.seed'
import { seedCountryFinancialConfig } from './country-financial-config.seed'

export async function seedFinance() {
  console.log("🌱 Seeding DailyBread finance reference data...\n")

  console.log("  [1/5] Currencies...")
  const currencyCount = await seedCurrencies()
  console.log(`        ✓ ${currencyCount} currencies`)

  console.log("  [2/5] Country → currency backfill...")
  const linked = await backfillCountryCurrency()
  console.log(`        ✓ ${linked} country(ies) linked to a Currency row`)

  console.log("  [3/5] Payment methods...")
  const paymentMethodCount = await seedPaymentMethods()
  console.log(`        ✓ ${paymentMethodCount} payment methods`)

  console.log("  [4/5] Payment providers (catalog)...")
  const providerCount = await seedPaymentProviders()
  console.log(`        ✓ ${providerCount} payment providers`)

  console.log("  [5/5] Launch-country financial config (DRAFT, not activated)...")
  const cfg = await seedCountryFinancialConfig()
  console.log(`        ${cfg.created ? "✓" : "•"} ${cfg.note}`)

  console.log("\n✅ Finance seed complete.")
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  seedFinance()
    .catch((err) => { console.error("❌ Finance seed failed:", err); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
