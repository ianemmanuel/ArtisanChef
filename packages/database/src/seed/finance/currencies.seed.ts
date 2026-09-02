import { prisma } from '../../index'
import { CURRENCIES } from './data/currencies.data'

/*
 * Idempotent. `status` is deliberately left untouched on update — same
 * reasoning as payment-methods.seed.ts / vendor-types.seed.ts: re-running
 * the seed must not silently re-activate a currency an admin deactivated.
 * `name`/`symbol`/`minorUnitDigits` ARE refreshed — those are reference
 * facts, not operational state, and the data file is their source of truth.
 */
export async function seedCurrencies(): Promise<number> {
  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, minorUnitDigits: c.minorUnitDigits },
      create: { code: c.code, name: c.name, symbol: c.symbol, minorUnitDigits: c.minorUnitDigits },
    })
  }
  return CURRENCIES.length
}
