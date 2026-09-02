import { prisma } from '../../index'
import type { PaymentProviderCapability } from '@repo/db'

/*
 * Launch-country financial configuration — Phase 1B, Slice 9.
 *
 * Seeds Kenya with a DRAFT CountryFinancialConfig and a DRAFT TEST
 * Flutterwave CountryProviderAccount, pre-linked (currency + active
 * account) so an admin's remaining steps are just: activate the provider
 * account → activate the config → enable the switches → (add payment
 * methods) → activate the country.
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
const LAUNCH_SECRET_ALIAS = 'flutterwave_ke_primary'
const LAUNCH_ENABLED_CAPABILITIES: PaymentProviderCapability[] = [
  'COLLECTION_CARD',
  'COLLECTION_MOBILE_MONEY',
  'PAYOUT_BANK',
  'BANK_ACCOUNT_RESOLUTION',
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

  const existingConfig = await prisma.countryFinancialConfig.findUnique({ where: { countryId: country.id } })
  if (existingConfig) {
    return { created: false, note: `${country.name} already has a financial config (${existingConfig.status}) — left untouched` }
  }

  // Only enable capabilities the provider actually declares (defensive —
  // the catalog seed should already include all of these).
  const supported = new Set(provider.capabilities)
  const enabled = LAUNCH_ENABLED_CAPABILITIES.filter((c) => supported.has(c))

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
      activeProviderAccountId: account.id,
      collectionsEnabled: false,
      payoutsEnabled: false,
      status: 'DRAFT',
    },
  })

  return { created: true, note: `${country.name}: DRAFT financial config + DRAFT TEST Flutterwave account (not activated)` }
}
