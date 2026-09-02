import { prisma } from "@repo/db"
import type { FinancialReadiness } from "@repo/types/backend"
import { computeFinancialReadiness, type ReadinessInputs } from "./finance.readiness.compute"
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
 */

export {
  computeFinancialReadiness,
  describeFinancialReadinessReasons,
  FINANCIAL_READINESS_REASON_LABELS,
  type ReadinessInputs,
} from "./finance.readiness.compute"

export async function loadReadinessInputs(countryId: string): Promise<ReadinessInputs> {
  const [config, methods] = await Promise.all([
    prisma.countryFinancialConfig.findUnique({
      where: { countryId },
      include: {
        currency: { select: { status: true } },
        activeProviderAccount: {
          select: {
            status: true,
            environment: true,
            enabledCapabilities: true,
            secretAlias: true,
            paymentProvider: { select: { code: true, status: true } },
          },
        },
      },
    }),
    prisma.countryPaymentMethod.findMany({
      where: { countryId, status: "ACTIVE" },
      select: { direction: true, countryProviderAccountId: true, paymentMethod: { select: { type: true } } },
    }),
  ])

  const activeAccountId = config?.activeProviderAccountId ?? null
  const account = config?.activeProviderAccount ?? null

  const providerAccount = account
    ? {
        status: account.status,
        environment: account.environment,
        enabledCapabilities: account.enabledCapabilities,
        providerStatus: account.paymentProvider?.status ?? null,
        adapterAvailable: hasProviderAdapter(account.paymentProvider?.code ?? ""),
        // A no-network check: does the alias resolve to *any* credential keys.
        credentialsResolvable: await providerSecretsResolver.has(account.secretAlias),
      }
    : null

  const toMethod = (m: (typeof methods)[number]) => ({
    type: m.paymentMethod.type,
    wiredToActiveAccount: !!activeAccountId && m.countryProviderAccountId === activeAccountId,
  })

  return {
    config: config
      ? {
          status: config.status,
          currencyCode: config.currencyCode,
          collectionsEnabled: config.collectionsEnabled,
          payoutsEnabled: config.payoutsEnabled,
        }
      : null,
    currency: config?.currency ? { status: config.currency.status } : null,
    providerAccount,
    inboundMethods: methods.filter((m) => m.direction === "INBOUND").map(toMethod),
    outboundMethods: methods.filter((m) => m.direction === "OUTBOUND").map(toMethod),
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
