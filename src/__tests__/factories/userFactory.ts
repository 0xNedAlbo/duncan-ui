import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface TestUserData {
  id?: string;
  email?: string;
  password?: string;
  name?: string;
}

/**
 * User factory for test data creation
 */
export class UserFactory {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create test user with proper defaults
   */
  async createUser(data: TestUserData = {}) {
    const userId = data.id || `test-user-${randomBytes(4).toString('hex')}`;
    const userEmail = data.email || `${userId}@example.com`;
    
    return await this.prisma.user.create({
      data: {
        id: userId,
        email: userEmail,
        password: data.password || 'hashed-test-password',
        name: data.name || 'Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Create user for API tests with session data
   */
  async createUserForApiTest(id: string = 'test-user-123') {
    const user = await this.createUser({
      id,
      email: 'test@example.com',
      name: 'Test User'
    });

    const sessionData = {
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      }
    };

    return { user, sessionData };
  }

  /**
   * Create multiple test users
   */
  async createUsers(count: number, baseData: TestUserData = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const userData = {
        ...baseData,
        id: baseData.id ? `${baseData.id}-${i}` : undefined,
        email: baseData.email ? `${i}-${baseData.email}` : undefined
      };
      users.push(await this.createUser(userData));
    }
    return users;
  }
}

/**
 * Factory function
 */
export function createUserFactory(prisma: PrismaClient): UserFactory {
  return new UserFactory(prisma);
}