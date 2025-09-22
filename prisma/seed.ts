import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  // Only seed test data in development environment
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  if (isProduction) {
    console.log('🚫 Skipping seed data in production environment');
    return;
  }

  if (!isDevelopment) {
    console.log('🚫 Skipping seed data - not in development environment');
    return;
  }

  console.log('🌱 Seeding development database...');

  // Create test user if it doesn't exist
  const testAddress = '0x742d35Cc6635C0532925a3b8D85162c6bF8d9d0c';

  let testUser = await prisma.user.findUnique({
    where: { address: testAddress }
  });

  if (testUser) {
    console.log('✅ Test user already exists:', testUser.id);
  } else {
    testUser = await prisma.user.create({
      data: {
        name: 'Test Testmann',
        address: testAddress,
      },
    });

    console.log('✅ Test user created:', testUser.id);
  }

  // Create test API key if it doesn't exist
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      userId: testUser.id,
      name: 'Debug Scripts'
    }
  });

  if (existingApiKey) {
    console.log('✅ Test API key already exists:', existingApiKey.id);
  } else {
    // Create the exact same API key used in debug script
    const apiKeyPlaintext = 'ak_live_zIdCcBStkntsCI_mVXqYUuNz5-VMSeGI-W8XWHn_C4A';
    const prefix = apiKeyPlaintext.substring(0, 8); // 'ak_live_'

    const hashedApiKey = await hash(apiKeyPlaintext, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: testUser.id,
        name: 'Debug Scripts',
        prefix: prefix,
        hash: hashedApiKey,
        scopes: [],
      },
    });

    console.log('✅ Test API key created:', apiKey.id);
  }

  console.log('🌱 Development database seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });