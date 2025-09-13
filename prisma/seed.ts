import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
  const testEmail = 'test@testmann.kk';
  
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', existingUser.id);
  } else {
    const hashedPassword = await bcrypt.hash('test123456', 10);
    
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Testmann',
        email: testEmail,
        password: hashedPassword,
      },
    });

    console.log('✅ Test user created:', testUser.id);
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