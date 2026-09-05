import { prisma } from "@repo/db"
import { ApiError } from "@/middleware/error"

/*
 * Minimal reference lookup: the active cities a vendor may register an
 * outlet in — always their own registered country (VendorAccount.countryId
 * is set at approval and never changes). Read-only, no geometry — the
 * boundary / zone / operational-area surface is a separate future initiative.
 * The outlet create path (vendor.outlet.service.createOutlet) re-validates
 * the chosen city's country + active status and remains authoritative.
 */
export interface VendorCityOption {
  id  : string
  name: string
  code: string | null
}

export async function listActiveCitiesForVendor(vendorId: string): Promise<VendorCityOption[]> {
  const vendor = await prisma.vendorAccount.findUnique({
    where : { id: vendorId },
    select: { countryId: true },
  })
  if (!vendor) throw new ApiError(404, "Vendor account not found", "NOT_FOUND")

  return prisma.city.findMany({
    where  : { countryId: vendor.countryId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select : { id: true, name: true, code: true },
  })
}
