import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

/**
 * TestDatabaseManager - Centralized database test infrastructure
 * Handles user creation, cleanup, and ensures proper FK relationships
 */
export class TestDatabaseManager {
  private prisma: PrismaClient;
  private createdUserIds: Set<string> = new Set();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a test user with all necessary setup for FK relationships
   */
  async createTestUser(
    id?: string, 
    email?: string, 
    password?: string,
    name?: string
  ) {
    const userId = id || `test-user-${randomBytes(8).toString('hex')}`;
    const userEmail = email || `${userId}@example.com`;
    const userPassword = password || 'hashed-password-123';
    const userName = name || 'Test User';

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: userEmail,
        password: userPassword,
        name: userName,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    this.createdUserIds.add(userId);
    return user;
  }

  /**
   * Get or create test user (idempotent)
   */
  async getOrCreateTestUser(id: string, email?: string) {
    try {
      const existing = await this.prisma.user.findUnique({ where: { id } });
      if (existing) return existing;
      
      return await this.createTestUser(id, email);
    } catch (error) {
      // If user exists but we couldn't find it due to race conditions, try once more
      return await this.prisma.user.findUniqueOrThrow({ where: { id } });
    }
  }

  /**
   * Create test user with session setup for authentication tests
   */
  async createTestUserWithSession(id?: string, email?: string) {
    const user = await this.createTestUser(id, email);
    
    // Create a session for the user (if needed by tests)
    const session = {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      }
    };

    return { user, session };
  }

  /**
   * Clean up all test data - maintains FK order
   */
  async cleanup() {
    // Delete in FK dependency order (most dependent first)
    await this.prisma.position.deleteMany();
    await this.prisma.pool.deleteMany();
    await this.prisma.userToken.deleteMany();
    await this.prisma.token.deleteMany();
    await this.prisma.session.deleteMany();
    await this.prisma.account.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.verificationToken.deleteMany();
    
    this.createdUserIds.clear();
  }

  /**
   * Clean up specific user and all related data
   */
  async cleanupUser(userId: string) {
    await this.prisma.position.deleteMany({ where: { userId } });
    await this.prisma.userToken.deleteMany({ where: { userId } });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.account.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });
    
    this.createdUserIds.delete(userId);
  }

  /**
   * Get all created user IDs for reference
   */
  getCreatedUserIds(): string[] {
    return Array.from(this.createdUserIds);
  }

  /**
   * Setup transaction for test isolation
   */
  async withTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(fn);
  }
}

/**
 * Factory function to create TestDatabaseManager
 */
export function createTestDatabaseManager(prisma: PrismaClient): TestDatabaseManager {
  return new TestDatabaseManager(prisma);
}