import { prisma } from "@repo/db"
import type { FinancialReadiness } from "@repo/types/backend"
import {
  computeFinancialReadiness,
  type ReadinessInputs,
  type ReadinessAccountSnapshot,
  type ReadinessMethodInput,
} from "./finance.readiness.compute"
import { hasProviderAdapter } from "../providers/provider.registry"
import { providerSecretsResolver } from "../secrets/provider-secrets.resolver"

/*
 * Financial readiness — the reusable predicates that answer "can DailyBread
 * actually operate financially in this country?". Consumed by:
 *   - the Admin ERP finance-config view
 *   - country activation / launch-readiness (admin.country.service.ts)
 *   - (later) vendor payout onboarding, customer checkout
 *
 * There is exactly ONE readiness system — this one. The decision rules are
 * in finance.readiness.compute.ts (pure, unit-tested); this file only
 * loads the inputs from the DB.
 *
 * Routing is capability-scoped: collection/payout readiness resolves each
 * payment method's OWN wired provider account; bank-verification readiness
 * resolves the country-global bankVerificationProviderAccount. No "the
 * country's active account" — there is none.
 */

export {
  computeFinancialReadiness,
  describeFinancialReadinessReasons,
  FINANCIAL_READINESS_REASON_LABELS,
  type ReadinessInputs,
} from "./finance.readiness.compute"

type AccountRow = {
  id: string
  status: string
  environment: string
  secretAlias: string
  enabledCapabilities: string[]
  paymentProvider: { code: string; status: string } | null
}

/**
 * Turn a provider-account row into the pure snapshot the compute layer
 * needs. `credentialsResolvable` is a no-network "does the alias resolve to
 * any credential keys" check — memoised per alias across the call.
 */
async function snapshotAccount(
  row: AccountRow | null,
  credCache: Map<string, Promise<boolean>>,
): Promise<ReadinessAccountSnapshot | null> {
  if (!row) return null
  let credPromise = credCache.get(row.secretAlias)
  if (!credPromise) {
    credPromise = providerSecretsResolver.has(row.secretAlias)
    credCache.set(row.secretAlias, credPromise)
  }
  return {
    status: row.status,
    providerStatus: row.paymentProvider?.status ?? null,
    environment: row.environment,
    enabledCapabilities: row.enabledCapabilities,
    adapterAvailable: hasProviderAdapter(row.paymentProvider?.code ?? ""),
    credentialsResolvable: await credPromise,
  }
}

export async function loadReadinessInputs(countryId: string): Promise<ReadinessInputs> {
  const ACCOUNT_SELECT = {
    id: true,
    status: true,
    environment: true,
    secretAlias: true,
    enabledCapabilities: true,
    paymentProvider: { select: { code: true, status: true } },
  } as const

  const [country, config, methods] = await Promise.all([
    // Currency is owned by the country (Country.currencyCode) — the config
    // mirrors it, but fall back to the country's own value so readiness is
    // correct even before the config has been synced.
    prisma.country.findUnique({
      where: { id: countryId },
      select: { currencyCode: true, currencyRef: { select: { status: true } } },
    }),
    prisma.countryFinancialConfig.findUnique({
      where: { countryId },
      include: {
        currency: { select: { status: true } },
        bankVerificationProviderAccount: { select: ACCOUNT_SELECT },
      },
    }),
    prisma.countryPaymentMethod.findMany({
      where: { countryId, status: "ACTIVE" },
      select: {
        direction: true,
        paymentMethod: { select: { type: true } },
        countryProviderAccount: { select: ACCOUNT_SELECT },
      },
    }),
  ])

  const credCache = new Map<string, Promise<boolean>>()

  const toMethod = async (m: (typeof methods)[number]): Promise<ReadinessMethodInput> => ({
    type: m.paymentMethod.type,
    account: await snapshotAccount(m.countryProviderAccount, credCache),
  })

  const [inboundMethods, outboundMethods, bankVerificationAccount] = await Promise.all([
    Promise.all(methods.filter((m) => m.direction === "INBOUND").map(toMethod)),
    Promise.all(methods.filter((m) => m.direction === "OUTBOUND").map(toMethod)),
    snapshotAccount(config?.bankVerificationProviderAccount ?? null, credCache),
  ])

  const effectiveCurrencyCode = config?.currencyCode ?? country?.currencyCode ?? null
  const effectiveCurrency = config?.currency ?? country?.currencyRef ?? null

  return {
    config: config
      ? {
          status: config.status,
          currencyCode: effectiveCurrencyCode,
          collectionsEnabled: config.collectionsEnabled,
          payoutsEnabled: config.payoutsEnabled,
        }
      : null,
    currency: effectiveCurrency ? { status: effectiveCurrency.status } : null,
    inboundMethods,
    outboundMethods,
    bankVerificationAccount,
  }
}

export async function getFinancialReadiness(countryId: string): Promise<FinancialReadiness> {
  const inputs = await loadReadinessInputs(countryId)
  return computeFinancialReadiness(countryId, inputs)
}

export async function isCollectionReady(countryId: string): Promise<boolean> {
  return (await getFinancialReadiness(countryId)).collection.ready
}
export async function isPayoutReady(countryId: string): Promise<boolean> {
  return (await getFinancialReadiness(countryId)).payout.ready
}
export async function isBankVerificationReady(countryId: string): Promise<boolean> {
  return (await getFinancialReadiness(countryId)).bankVerification.ready
}
export async function isFinanciallyReady(countryId: string): Promise<boolean> {
  return (await getFinancialReadiness(countryId)).financiallyReady
}
