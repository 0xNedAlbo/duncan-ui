export { TestDatabaseManager, createTestDatabaseManager } from './databaseFactory';
export { UserFactory, createUserFactory } from './userFactory';
export { TokenFactory, createTokenFactory } from './tokenFactory';
export { PoolFactory, createPoolFactory } from './poolFactory';
export { PositionFactory, createPositionFactory } from './positionFactory';

export type { TestUserData } from './userFactory';
export type { TestTokenData, TestUserTokenData } from './tokenFactory';
export type { TestPoolData } from './poolFactory';
export type { TestPositionData } from './positionFactory';

import { PrismaClient } from '@prisma/client';
import { TestDatabaseManager } from './databaseFactory';
import { UserFactory } from './userFactory';
import { TokenFactory } from './tokenFactory';
import { PoolFactory } from './poolFactory';
import { PositionFactory } from './positionFactory';

/**
 * Complete test factory suite
 * Provides all factories with a single prisma instance
 */
export class TestFactorySuite {
  public readonly db: TestDatabaseManager;
  public readonly users: UserFactory;
  public readonly tokens: TokenFactory;
  public readonly pools: PoolFactory;
  public readonly positions: PositionFactory;

  constructor(prisma: PrismaClient) {
    this.db = new TestDatabaseManager(prisma);
    this.users = new UserFactory(prisma);
    this.tokens = new TokenFactory(prisma);
    this.pools = new PoolFactory(prisma);
    this.positions = new PositionFactory(prisma);
  }

  /**
   * Complete cleanup of all test data
   */
  async cleanup() {
    await this.db.cleanup();
  }

  /**
   * Create a complete test scenario with user, tokens, pool, and position
   */
  async createCompleteScenario(userId?: string) {
    const { user, sessionData } = await this.users.createUserForApiTest(userId);
    const pool = await this.pools.createWethUsdcPool(user.id);
    const position = await this.positions.createActiveWethUsdcPosition(user.id);

    return {
      user,
      sessionData,
      pool,
      position,
      tokens: {
        WETH: pool.token0Ref.globalToken || pool.token0Ref.userToken,
        USDC: pool.token1Ref.globalToken || pool.token1Ref.userToken
      }
    };
  }
}

/**
 * Factory function to create complete test suite
 */
export function createTestFactorySuite(prisma: PrismaClient): TestFactorySuite {
  return new TestFactorySuite(prisma);
}