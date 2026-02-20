import 'dotenv/config';
import {prisma} from '../index';

async function seedVendorTypes() {
  const vendorTypes = [
    {
      name: 'Restaurant',
      description: 'Full-service and quick-service restaurants',
    },
    {
      name: 'Commercial Kitchen',
      description: 'Cloud kitchens and shared production kitchens',
    },
    {
      name: 'Bakery',
      description: 'Bread, pastry, and baked goods vendors',
    },
    {
      name: 'Cafe',
      description: 'Coffee shops and light-meal cafes',
    },
    {
      name: 'Catering Service',
      description: 'Event and corporate catering vendors',
    },
    {
      name: 'Meal Prep Service',
      description: 'Healthy, diet, and subscription meal providers',
    },
    {
      name: 'Food Truck',
      description: 'Mobile food vendors and street food operations',
    },
    {
      name: 'Juice & Smoothie Bar',
      description: 'Juice, smoothie, and wellness drink vendors',
    },
    {
      name: 'Butchery',
      description: 'Meat suppliers and protein-focused vendors',
    },
    {
      name: 'Specialty Food Store',
      description: 'Organic, gourmet, and specialty food providers',
    },
  ];

  for (const vendorType of vendorTypes) {
    await prisma.vendorType.upsert({
      where: { name: vendorType.name },
      update: {
        description: vendorType.description,
      },
      create: vendorType,
    });
  }

  console.log('✅ Vendor types seeded successfully');
}

seedVendorTypes()
  .catch((err) => {
    console.error('❌ Vendor types seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });