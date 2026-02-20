import 'dotenv/config'
import {prisma} from '../index';

async function seedCountries() {
  const countries = [
    {
      name: 'Kenya',
      code: 'KE',
      currency: 'KES',
      phoneCode: '+254',
      currencySymbol: 'KSh',
      timezones: ['Africa/Nairobi'],
    },
    {
      name: 'United Arab Emirates',
      code: 'AE',
      currency: 'AED',
      phoneCode: '+971',
      currencySymbol: 'د.إ',
      timezones: ['Asia/Dubai'],
    },
    {
      name: 'United States',
      code: 'US',
      currency: 'USD',
      phoneCode: '+1',
      currencySymbol: '$',
      timezones: ['America/New_York'],
    },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: country,
      create: country,
    });
  }

  console.log('✅ Countries seeded');
}

seedCountries()
  .catch(console.error)
  .finally(() => prisma.$disconnect());