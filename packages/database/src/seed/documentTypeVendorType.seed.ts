import 'dotenv/config';
import {prisma} from '../index';

async function seedDocumentTypeVendorType() {
  const docs = await prisma.documentTypeConfig.findMany();
  const vendorTypes = await prisma.vendorType.findMany();

  const docByName = Object.fromEntries(docs.map(d => [d.name, d.id]));
  const vendorByName = Object.fromEntries(vendorTypes.map(v => [v.name, v.id]));

  const mappings = [
    // Restaurants
    { doc: 'Business Permit', vendor: 'Restaurant' },
    { doc: 'Food Handling Certificate', vendor: 'Restaurant' },

    // Bakery
    { doc: 'Food Handling Certificate', vendor: 'Bakery' },

    // Catering
    { doc: 'Food Safety Certificate', vendor: 'Catering Service' },

    // Meal prep
    { doc: 'Health Department Permit', vendor: 'Meal Prep Service' },

    // Butchery
    { doc: 'Health Department Permit', vendor: 'Butchery' },
  ];

  for (const m of mappings) {
    const docId = docByName[m.doc];
    const vendorId = vendorByName[m.vendor];

    if (!docId || !vendorId) continue;

    await prisma.documentTypeVendorType.upsert({
      where: {
        documentTypeId_vendorTypeId: {
          documentTypeId: docId,
          vendorTypeId: vendorId,
        },
      },
      update: {},
      create: {
        documentTypeId: docId,
        vendorTypeId: vendorId,
      },
    });
  }

  console.log('✅ DocumentTypeVendorType seeded');
}

seedDocumentTypeVendorType()
  .catch(console.error)
  .finally(() => prisma.$disconnect());