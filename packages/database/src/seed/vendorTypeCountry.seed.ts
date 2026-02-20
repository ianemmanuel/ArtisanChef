// packages/db/src/seed/vendorTypeCountry.seed.ts
import 'dotenv/config';
import {prisma} from '../index';

const vendorTypeIds = {
  restaurant: '243a52fb-13bf-4321-8482-dc2a925f17b0',
  commercialKitchen: '37dabae5-ab98-4aec-bb5f-4c21cbb8d71f',
  bakery: '07269aee-ffc5-4cb3-97d9-3878a3a3b1a8',
  cafe: '4506b648-abca-458b-bb62-3f01292ecf65',
  catering: 'e0ed11f5-1795-4025-aa9b-08c8a854a9c3',
  mealPrep: 'd0bc49b4-c9ba-429e-baf3-55d1fd523f35',
  foodTruck: '5186aad7-003a-403f-96fe-41c134da21eb',
  juiceBar: '879419e5-571c-41cb-8c99-57dc82c63c44',
  butchery: '4b1d0c7b-1a43-4669-94ef-9eb4899bf3b5',
  specialty: '925e20c1-885b-4189-8dc0-22b9b362f54d',
};

async function seedVendorTypeCountry() {
  const kenya = await prisma.country.findUnique({ where: { code: 'KE' } });
  const uae = await prisma.country.findUnique({ where: { code: 'AE' } });
  const usa = await prisma.country.findUnique({ where: { code: 'US' } });

  if (!kenya || !uae || !usa) {
    throw new Error('Countries must be seeded first');
  }

  const mappings = [
    // Kenya
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.restaurant },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.commercialKitchen },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.bakery },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.cafe },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.catering },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.mealPrep },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.foodTruck },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.juiceBar },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.butchery },
    { countryId: kenya.id, vendorTypeId: vendorTypeIds.specialty },

    // UAE
    { countryId: uae.id, vendorTypeId: vendorTypeIds.restaurant },
    { countryId: uae.id, vendorTypeId: vendorTypeIds.commercialKitchen },
    { countryId: uae.id, vendorTypeId: vendorTypeIds.bakery },
    { countryId: uae.id, vendorTypeId: vendorTypeIds.cafe },
    { countryId: uae.id, vendorTypeId: vendorTypeIds.catering },
    { countryId: uae.id, vendorTypeId: vendorTypeIds.mealPrep },

    // USA
    { countryId: usa.id, vendorTypeId: vendorTypeIds.restaurant },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.commercialKitchen },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.bakery },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.cafe },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.catering },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.mealPrep },
    { countryId: usa.id, vendorTypeId: vendorTypeIds.foodTruck },
  ];

  for (const mapping of mappings) {
    const exists = await prisma.vendorTypeCountry.findFirst({
      where: {
        countryId: mapping.countryId,
        vendorTypeId: mapping.vendorTypeId,
      },
    });

    if (!exists) {
      await prisma.vendorTypeCountry.create({ data: mapping });
    }
  }

  console.log('✅ VendorTypeCountry seeded');
}

seedVendorTypeCountry()
  .catch(console.error)
  .finally(() => prisma.$disconnect());