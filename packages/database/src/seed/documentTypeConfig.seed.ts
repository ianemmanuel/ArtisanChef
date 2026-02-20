// packages/db/src/seed/documentTypeConfig.seed.ts
import 'dotenv/config';
import {prisma} from '../index';
import { DocumentScope } from '../../generated/prisma/client'; // ✅ import enum

async function seedDocumentTypeConfig() {
  const kenya = await prisma.country.findUnique({ where: { code: 'KE' } });
  const uae = await prisma.country.findUnique({ where: { code: 'AE' } });
  const usa = await prisma.country.findUnique({ where: { code: 'US' } });

  if (!kenya || !uae || !usa) {
    throw new Error('Countries missing');
  }

  const documents = [
    // Kenya
    { name: 'Business Permit', code: 'BUSINESS_PERMIT', scope: DocumentScope.VENDOR, countryId: kenya.id, isRequired: true },
    { name: 'Food Handling Certificate', code: 'FOOD_HANDLING', scope: DocumentScope.VENDOR, countryId: kenya.id, isRequired: true },
    { name: 'KEBS Certification', code: 'KEBS', scope: DocumentScope.OUTLET, countryId: kenya.id, isRequired: false },

    // UAE
    { name: 'Trade License', code: 'TRADE_LICENSE', scope: DocumentScope.VENDOR, countryId: uae.id, isRequired: true },
    { name: 'Food Safety Certificate', code: 'FOOD_SAFETY', scope: DocumentScope.VENDOR, countryId: uae.id, isRequired: true },
    { name: 'Halal Certification', code: 'HALAL', scope: DocumentScope.OUTLET, countryId: uae.id, isRequired: false },

    // USA
    { name: 'Food Establishment Permit', code: 'FOOD_ESTABLISHMENT', scope: DocumentScope.VENDOR, countryId: usa.id, isRequired: true },
    { name: 'Health Department Permit', code: 'HEALTH_DEPT', scope: DocumentScope.VENDOR, countryId: usa.id, isRequired: true },
    { name: 'FDA Registration', code: 'FDA', scope: DocumentScope.OUTLET, countryId: usa.id, isRequired: false },
  ];

  for (const doc of documents) {
    const exists = await prisma.documentTypeConfig.findFirst({
      where: {
        code: doc.code,
        countryId: doc.countryId,
      },
    });

    if (!exists) {
      await prisma.documentTypeConfig.create({ data: doc });
    }
  }

  console.log('✅ DocumentTypeConfig seeded');
}

seedDocumentTypeConfig()
  .catch(console.error)
  .finally(() => prisma.$disconnect());