import { prisma } from '../../index'
import { VENDOR_TYPES } from './data/vendor-types.data'

/*
 * Idempotent — status is deliberately left untouched on update, same
 * reasoning as countries.seed.ts: re-running the seed must not silently
 * re-activate a vendor type an admin deliberately suspended.
 */
export async function seedVendorTypes(): Promise<number> {
  for (const vendorType of VENDOR_TYPES) {
    await prisma.vendorType.upsert({
      where : { name: vendorType.name },
      update: { description: vendorType.description },
      create: { name: vendorType.name, description: vendorType.description },
    })
  }

  return VENDOR_TYPES.length
}
