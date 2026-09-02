import { prisma } from '../../index'
import { PAYMENT_PROVIDERS } from './data/payment-providers.data'
import type { PaymentProviderCapability, PaymentMethodType } from '@repo/db'

/*
 * Idempotent. `status` untouched on update (same reasoning as
 * currencies.seed.ts). Declared capabilities/methodTypes/currencies ARE
 * refreshed from the data file.
 */
export async function seedPaymentProviders(): Promise<number> {
  for (const p of PAYMENT_PROVIDERS) {
    const data = {
      name: p.name,
      capabilities: p.capabilities as PaymentProviderCapability[],
      methodTypes: p.methodTypes as PaymentMethodType[],
      supportedCurrencies: p.supportedCurrencies,
      description: p.description,
    }
    await prisma.paymentProvider.upsert({
      where: { code: p.code },
      update: data,
      create: { code: p.code, ...data },
    })
  }
  return PAYMENT_PROVIDERS.length
}
