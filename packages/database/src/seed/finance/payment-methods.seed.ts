import { prisma } from '../../index'
import { PAYMENT_METHODS } from './data/payment-methods.data'

/*
 * Idempotent — isActive is deliberately left untouched on update, same
 * reasoning as vendor-types.seed.ts and countries.seed.ts: re-running the
 * seed must not silently re-activate a payment method an admin
 * deliberately deactivated.
 */
export async function seedPaymentMethods(): Promise<number> {
  for (const method of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where : { code: method.code },
      update: { name: method.name, type: method.type, direction: method.direction, description: method.description },
      create: { code: method.code, name: method.name, type: method.type, direction: method.direction, description: method.description },
    })
  }

  return PAYMENT_METHODS.length
}
