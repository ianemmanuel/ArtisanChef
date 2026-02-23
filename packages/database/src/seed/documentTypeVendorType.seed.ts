import 'dotenv/config';
import { prisma } from '../index';

async function seedDocumentTypeVendorType() {
  const docs = await prisma.documentTypeConfig.findMany();
  const vendorTypes = await prisma.vendorType.findMany();

  // Key by code (unique) instead of name (not guaranteed unique across countries)
  const docByCode = Object.fromEntries(docs.map(d => [d.code, d.id]));
  const vendorByName = Object.fromEntries(vendorTypes.map(v => [v.name, v.id]));

  // Helper to warn on missing lookups instead of silently skipping
  function resolve(code: string, vendor: string, isRequired: boolean) {
    const documentTypeId = docByCode[code];
    const vendorTypeId = vendorByName[vendor];
    if (!documentTypeId) console.warn(`⚠️  No doc found for code: ${code}`);
    if (!vendorTypeId)   console.warn(`⚠️  No vendor type found for: ${vendor}`);
    if (!documentTypeId || !vendorTypeId) return null;
    return { documentTypeId, vendorTypeId, isRequired };
  }

  const allVendorTypes = [
    'Restaurant', 'Commercial Kitchen', 'Bakery', 'Cafe',
    'Catering Service', 'Meal Prep Service', 'Food Truck',
    'Juice & Smoothie Bar', 'Butchery', 'Specialty Food Store',
  ];

  const foodHandlingTypes = [
    'Restaurant', 'Commercial Kitchen', 'Bakery', 'Cafe',
    'Catering Service', 'Meal Prep Service', 'Food Truck', 'Juice & Smoothie Bar',
  ];

  const mappings = [
    // ── Kenya ──────────────────────────────────────────────────────
    ...allVendorTypes.map(v =>
      resolve('BUSINESS_PERMIT', v, true)
    ),
    ...allVendorTypes.map(v =>
      resolve('FOOD_HANDLING', v, foodHandlingTypes.includes(v))
    ),
    ...allVendorTypes.map(v =>
      resolve('KEBS', v, ['Restaurant','Commercial Kitchen','Bakery','Cafe','Catering Service','Meal Prep Service'].includes(v))
    ),

    // ── UAE ────────────────────────────────────────────────────────
    ...['Restaurant','Commercial Kitchen','Bakery','Cafe','Catering Service','Meal Prep Service'].flatMap(v => [
      resolve('TRADE_LICENSE', v, true),
      resolve('FOOD_SAFETY',   v, foodHandlingTypes.includes(v)),
      resolve('HALAL',         v, false),
    ]),

    // ── US ─────────────────────────────────────────────────────────
    ...['Restaurant','Commercial Kitchen','Bakery','Cafe','Catering Service','Meal Prep Service','Food Truck'].flatMap(v => [
      resolve('FOOD_ESTABLISHMENT', v, true),
      resolve('HEALTH_DEPT',        v, foodHandlingTypes.includes(v)),
      resolve('FDA',                v, true),
    ]),
  ].filter(Boolean) as { documentTypeId: string; vendorTypeId: string; isRequired: boolean }[];

  console.log(`🌱 Seeding ${mappings.length} entries...`);

  for (const entry of mappings) {
    await prisma.documentTypeVendorType.upsert({
      where: {
        documentTypeId_vendorTypeId: {
          documentTypeId: entry.documentTypeId,
          vendorTypeId:   entry.vendorTypeId,
        },
      },
      update:  { isRequired: entry.isRequired },
      create: entry,
    });
  }

  console.log('✅ DocumentTypeVendorType seeded');
}

seedDocumentTypeVendorType()
  .catch(console.error)
  .finally(() => prisma.$disconnect());