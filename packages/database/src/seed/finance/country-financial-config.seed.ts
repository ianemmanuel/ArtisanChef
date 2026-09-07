import { prisma } from '../../index'
import type { PaymentProviderCapability } from '@repo/db'

/*
 * Launch-country financial configuration — Phase 1B, Slice 9.
 *
 * Seeds Kenya with a DRAFT CountryFinancialConfig and a DRAFT TEST
 * Flutterwave CountryProviderAccount, pre-linked (currency + the
 * bank-account-verification routing binding) so an admin's remaining steps
 * are just: activate the provider account → activate the config → enable
 * the switches → add payment methods and wire each to a provider account →
 * activate the country.
 *
 * Provider routing is capability-scoped now — there is no single "active
 * provider account". The seed only pre-binds the country-global
 * bank-verification capability (the Flutterwave sandbox account supports
 * BANK_ACCOUNT_RESOLUTION + BANK_LIST); collection/payout routing is per
 * payment method (CountryPaymentMethod.countryProviderAccountId) and stays
 * a deliberate admin action, same as adding the methods themselves.
 *
 * Deliberately does NOT activate anything — activation is an explicit
 * administrative operation. Both rows stay DRAFT.
 *
 * Fully idempotent: creates each row only if missing; if a row already
 * exists it is left untouched (an admin may have progressed it).
 */

const LAUNCH_COUNTRY_SLUG = 'ke'
const LAUNCH_PROVIDER_CODE = 'FLUTTERWAVE'
const LAUNCH_CURRENCY = 'KES'
// Derived-alias convention (provider_country_environment) — matches
// deriveProviderSecretAlias in the finance module. Credentials live under
// FINANCE_PROVIDER_SECRET__FLUTTERWAVE_KE_TEST__* .
const LAUNCH_SECRET_ALIAS = 'flutterwave_ke_test'
const LAUNCH_ENABLED_CAPABILITIES: PaymentProviderCapability[] = [
  // Business capabilities (an admin's choice).
  'COLLECTION_CARD',
  'COLLECTION_MOBILE_MONEY',
  'PAYOUT_BANK',
  // Integration capabilities — auto-merged for a real account, seeded
  // explicitly here so the DRAFT row matches what activation would produce.
  'BANK_ACCOUNT_RESOLUTION',
  'BANK_LIST',
  'WEBHOOKS',
]

export async function seedCountryFinancialConfig(): Promise<{ created: boolean; note: string }> {
  const [country, provider, currency] = await Promise.all([
    prisma.country.findUnique({ where: { slug: LAUNCH_COUNTRY_SLUG }, select: { id: true, name: true } }),
    prisma.paymentProvider.findUnique({ where: { code: LAUNCH_PROVIDER_CODE }, select: { id: true, capabilities: true } }),
    prisma.currency.findUnique({ where: { code: LAUNCH_CURRENCY }, select: { code: true } }),
  ])

  if (!country) return { created: false, note: `launch country "${LAUNCH_COUNTRY_SLUG}" not found — run the geography seed first` }
  if (!provider) return { created: false, note: `provider "${LAUNCH_PROVIDER_CODE}" not found — run the finance provider seed first` }
  if (!currency) return { created: false, note: `currency "${LAUNCH_CURRENCY}" not found — run the currency seed first` }

  // Only enable capabilities the provider actually declares (defensive —
  // the catalog seed should already include all of these).
  const supported = new Set(provider.capabilities)
  const enabled = LAUNCH_ENABLED_CAPABILITIES.filter((c) => supported.has(c))

  const existingConfig = await prisma.countryFinancialConfig.findUnique({ where: { countryId: country.id } })
  if (existingConfig) {
    // Heal a provider account whose enabledCapabilities predate a capability
    // the provider catalog has since gained (e.g. BANK_LIST) — mirrors the
    // heal-on-activate in activateProviderAccount, so a plain `db:seed` is
    // enough to unblock the ERP Supported-banks control + Vendor 1E without
    // forcing an activate/re-activate cycle first. Only ever ADDS caps, and
    // now covers an already-ACTIVE account too (activation can't re-run on
    // it). Integration caps (BANK_LIST/WEBHOOKS) also bypass this list at
    // the gateway now — this just keeps the stored list honest for display.
    const acct = await prisma.countryProviderAccount.findFirst({
      where: { countryId: country.id, paymentProviderId: provider.id, environment: 'TEST', status: { not: 'DISABLED' } },
      select: { id: true, status: true, enabledCapabilities: true },
    })
    if (acct) {
      const merged = [...new Set([...acct.enabledCapabilities, ...enabled])]
      if (merged.length !== acct.enabledCapabilities.length) {
        await prisma.countryProviderAccount.update({
          where: { id: acct.id },
          data: { enabledCapabilities: merged },
        })
        return { created: false, note: `${country.name} already has a financial config (${existingConfig.status}) — healed ${acct.status} account capabilities (+${merged.length - acct.enabledCapabilities.length})` }
      }
    }
    return { created: false, note: `${country.name} already has a financial config (${existingConfig.status}) — left untouched` }
  }

  let account = await prisma.countryProviderAccount.findFirst({
    where: { countryId: country.id, paymentProviderId: provider.id, environment: 'TEST' },
  })
  if (!account) {
    account = await prisma.countryProviderAccount.create({
      data: {
        countryId: country.id,
        paymentProviderId: provider.id,
        environment: 'TEST',
        secretAlias: LAUNCH_SECRET_ALIAS,
        enabledCapabilities: enabled,
        accountLabel: 'Flutterwave Kenya (primary, sandbox)',
        status: 'DRAFT',
      },
    })
  }

  await prisma.countryFinancialConfig.create({
    data: {
      countryId: country.id,
      currencyCode: currency.code,
      bankVerificationProviderAccountId: account.id,
      collectionsEnabled: false,
      payoutsEnabled: false,
      status: 'DRAFT',
    },
  })

  return { created: true, note: `${country.name}: DRAFT financial config + DRAFT TEST Flutterwave account (not activated)` }
}
