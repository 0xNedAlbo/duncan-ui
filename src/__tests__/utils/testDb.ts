import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Use a separate test database to avoid conflicts
const TEST_DATABASE_URL = 'postgresql://duncan:dev123@localhost:5432/duncan_test';

let testPrisma: PrismaClient;

export function setupTestDb() {
  beforeAll(async () => {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
    });

    // Ensure database is connected
    await testPrisma.$connect();
  });

  beforeEach(async () => {
    // Clean up all test data before each test
    await testPrisma.position.deleteMany();
    await testPrisma.pool.deleteMany();
    await testPrisma.token.deleteMany();
    await testPrisma.session.deleteMany();
    await testPrisma.account.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.verificationToken.deleteMany();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await testPrisma.position.deleteMany();
    await testPrisma.pool.deleteMany();
    await testPrisma.token.deleteMany();
    await testPrisma.session.deleteMany();
    await testPrisma.account.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.verificationToken.deleteMany();
    
    await testPrisma.$disconnect();
  });

  return testPrisma;
}

export { testPrisma };