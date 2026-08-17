import { prisma, GeoStatus } from '../../index'
import { COUNTRIES } from './data/countries.data'

/*
 * Idempotent by design — re-running must never reactivate a country an
 * admin deliberately deactivated, or vice versa. So `status` is set only
 * on create, never touched on update; everything else (currency, phone
 * code, timezones, ...) is treated as canonical reference data and kept
 * in sync with the static dataset on every run.
 */
export async function seedCountries(): Promise<number> {
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name          : country.name,
        slug          : country.slug,
        currency      : country.currency,
        currencySymbol: country.currencySymbol,
        phoneCode     : country.phoneCode,
        timezones     : country.timezones,
      },
      create: {
        name          : country.name,
        code          : country.code,
        slug          : country.slug,
        currency      : country.currency,
        currencySymbol: country.currencySymbol,
        phoneCode     : country.phoneCode,
        timezones     : country.timezones,
        status        : GeoStatus.INACTIVE,
      },
    })
  }

  return COUNTRIES.length
}
