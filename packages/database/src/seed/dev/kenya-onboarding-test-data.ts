/**
 * DEV/TEST-ONLY DATA — NOT part of the seed chain (not imported by
 * seed/index.ts), and deliberately not run in CI or on deploy.
 *
 * Activating a country and linking vendor types to it are live
 * business/regulatory decisions in production — normally done through the
 * admin endpoints (PATCH /admin/v1/countries/:id/activate,
 * POST /admin/v1/countries/:id/vendor-types), not baked into a seed file.
 * See seed/geography/index.ts and seed/vendor/index.ts for that reasoning.
 *
 * This script exists purely so the onboarding flow can be exercised
 * end-to-end on a local dev database without going through the admin
 * dashboard first. Idempotent — safe to run multiple times.
 *
 * Run: tsx src/seed/dev/kenya-onboarding-test-data.ts
 */
import 'dotenv/config'
import { prisma, GeoStatus } from '../../index'

const KENYA_COUNTRY_ID = '72df6abd-e8c8-42e3-b238-5a8e97e0429e'

const VENDOR_TYPE_IDS = [
  'f80ceda2-01d6-4c73-bd53-addb79baab2c',
  'ca6ec0c7-a670-441e-af71-4f43a9836fa8',
  'd006c0e5-6219-4220-b5cc-3bbd605d78de',
]

async function run() {
  const country = await prisma.country.findUnique({ where: { id: KENYA_COUNTRY_ID } })
  if (!country) {
    throw new Error(`Country ${KENYA_COUNTRY_ID} not found — check the id`)
  }

  if (country.status !== GeoStatus.ACTIVE) {
    await prisma.country.update({
      where: { id: KENYA_COUNTRY_ID },
      data: { status: GeoStatus.ACTIVE },
    })
    console.log(`✓ Activated country: ${country.name}`)
  } else {
    console.log(`  Country already active: ${country.name}`)
  }

  const vendorTypes = await prisma.vendorType.findMany({
    where: { id: { in: VENDOR_TYPE_IDS } },
  })

  const foundIds = new Set(vendorTypes.map((v) => v.id))
  const missing = VENDOR_TYPE_IDS.filter((id) => !foundIds.has(id))
  if (missing.length) {
    throw new Error(`Vendor type id(s) not found: ${missing.join(', ')}`)
  }

  for (const vt of vendorTypes) {
    await prisma.vendorTypeCountry.upsert({
      where: { countryId_vendorTypeId: { countryId: KENYA_COUNTRY_ID, vendorTypeId: vt.id } },
      update: { status: GeoStatus.ACTIVE },
      create: { countryId: KENYA_COUNTRY_ID, vendorTypeId: vt.id, status: GeoStatus.ACTIVE },
    })
    console.log(`✓ Linked vendor type: ${vt.name} (${vt.status})`)
  }

  console.log('\n✅ Kenya onboarding test data ready.')
}

run()
  .catch((err) => { console.error('❌ Failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
