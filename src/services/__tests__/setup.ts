import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll } from 'vitest';
import { createTestFactorySuite, TestFactorySuite } from '../../__tests__/factories';
import { server } from '../../__tests__/mocks/server';

// Singleton test database instance
let sharedTestPrisma: PrismaClient | null = null;
let sharedFactories: TestFactorySuite | null = null;

/**
 * Get or create shared test database instance
 * This ensures all service tests use the same database connection
 */
export function getSharedTestPrisma(): PrismaClient {
  if (!sharedTestPrisma) {
    sharedTestPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://duncan:dev123@localhost:5432/duncan_test'
        }
      }
    });
  }
  return sharedTestPrisma;
}

/**
 * Get or create shared test factories
 */
export function getSharedFactories(): TestFactorySuite {
  if (!sharedFactories) {
    sharedFactories = createTestFactorySuite(getSharedTestPrisma());
  }
  return sharedFactories;
}

/**
 * Setup shared test environment for service layer tests
 * Call this in beforeAll() of each service test file
 */
export async function setupServiceTestEnvironment() {
  // Start MSW server if not already started
  if (!server.listenerCount('request')) {
    server.listen();
  }
  
  // Connect to database
  await getSharedTestPrisma().$connect();
  
  // Do initial cleanup to ensure clean state
  await getSharedFactories().cleanup();
}

/**
 * Cleanup shared test environment
 * Call this in afterAll() of each service test file
 */
export async function cleanupServiceTestEnvironment() {
  // Clean up all data
  if (sharedFactories) {
    await sharedFactories.cleanup();
  }
  
  // Note: Don't close MSW server or disconnect database here
  // They will be handled by the global afterAll hook
}

/**
 * Global setup - runs once for all service tests
 */
beforeAll(async () => {
  // This will run once for the entire test suite
  console.log('[SHARED SETUP] Initializing service test environment');
});

/**
 * Global cleanup - runs once after all service tests
 */
afterAll(async () => {
  console.log('[SHARED CLEANUP] Cleaning up service test environment');
  
  // Final cleanup and disconnect
  if (sharedFactories) {
    await sharedFactories.cleanup();
  }
  
  if (sharedTestPrisma) {
    await sharedTestPrisma.$disconnect();
    sharedTestPrisma = null;
  }
  
  sharedFactories = null;
});

/**
 * Create unique user ID for each test file to avoid conflicts
 */
export function createTestFileUserId(testFileName: string): string {
  // Extract just the filename without path and extension
  const fileName = testFileName.split('/').pop()?.replace('.test.ts', '') || 'unknown';
  return `${fileName}-user-${Date.now()}`;
}