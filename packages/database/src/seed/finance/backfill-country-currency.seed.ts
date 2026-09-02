import { prisma } from '../../index'

/*
 * Migration-safe backfill for Country.currencyCode (the new FK into the
 * Currency reference table). The legacy Country.currency plain string is
 * left completely untouched.
 *
 * For every country whose existing `currency` string matches a seeded
 * Currency row and whose `currencyCode` isn't set yet, point the FK at it.
 * Countries whose currency we haven't seeded yet keep currencyCode = null
 * and continue to rely on the `currency` string — nothing breaks.
 *
 * Idempotent: only fills nulls, never overwrites an already-linked country.
 * Run this AFTER seedCurrencies().
 */
export async function backfillCountryCurrency(): Promise<number> {
  const currencies = await prisma.currency.findMany({ select: { code: true } })
  const known = new Set(currencies.map((c) => c.code))

  const countries = await prisma.country.findMany({
    where: { currencyCode: null },
    select: { id: true, currency: true },
  })

  let linked = 0
  for (const country of countries) {
    const code = country.currency?.trim().toUpperCase()
    if (!code || !known.has(code)) continue
    await prisma.country.update({ where: { id: country.id }, data: { currencyCode: code } })
    linked++
  }
  return linked
}
