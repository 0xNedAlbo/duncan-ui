import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { TokenFactory, createTokenFactory } from './tokenFactory';

export interface TestPoolData {
  id?: string;
  chain?: string;
  poolAddress?: string;
  fee?: number;
  tickSpacing?: number;
  currentPrice?: string;
  currentTick?: number;
  token0Address?: string;
  token1Address?: string;
  token0RefId?: string;
  token1RefId?: string;
}

/**
 * Pool factory for test data creation
 */
export class PoolFactory {
  private prisma: PrismaClient;
  private tokenFactory: TokenFactory;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.tokenFactory = createTokenFactory(prisma);
  }

  /**
   * Create test pool with token dependencies
   */
  async createPool(userId: string, data: TestPoolData = {}) {
    const poolId = data.id || `pool-${randomBytes(4).toString('hex')}`;
    const chain = data.chain || 'ethereum';
    
    // Create tokens if not provided
    let token0RefId = data.token0RefId;
    let token1RefId = data.token1RefId;
    let token0Address = data.token0Address;
    let token1Address = data.token1Address;

    if (!token0RefId) {
      const token0 = await this.tokenFactory.createToken({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chain,
        address: token0Address || `0x${randomBytes(20).toString('hex')}`
      });
      token0Address = token0.address;
      
      // Create TokenReference for token0
      const token0Ref = await this.prisma.tokenReference.create({
        data: {
          tokenType: 'global',
          globalTokenId: token0.id,
          chain,
          address: token0Address,
          symbol: token0.symbol
        }
      });
      token0RefId = token0Ref.id;
    }

    if (!token1RefId) {
      const token1 = await this.tokenFactory.createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chain,
        address: token1Address || `0x${randomBytes(20).toString('hex')}`
      });
      token1Address = token1.address;
      
      // Create TokenReference for token1
      const token1Ref = await this.prisma.tokenReference.create({
        data: {
          tokenType: 'global',
          globalTokenId: token1.id,
          chain,
          address: token1Address,
          symbol: token1.symbol
        }
      });
      token1RefId = token1Ref.id;
    }

    return await this.prisma.pool.create({
      data: {
        id: poolId,
        chain,
        poolAddress: data.poolAddress || `0x${randomBytes(20).toString('hex')}`,
        fee: data.fee || 3000,
        tickSpacing: data.tickSpacing || 60,
        currentPrice: data.currentPrice,
        currentTick: data.currentTick,
        token0Address: token0Address!,
        token1Address: token1Address!,
        token0RefId: token0RefId!,
        token1RefId: token1RefId!,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        token0Ref: true,
        token1Ref: true
      }
    });
  }

  /**
   * Create WETH/USDC pool (common test scenario)
   */
  async createWethUsdcPool(userId: string, chain: string = 'ethereum') {
    const commonTokens = await this.tokenFactory.createCommonTokens(chain);
    
    // Create token references for the common tokens
    const token0Ref = await this.prisma.tokenReference.create({
      data: {
        tokenType: 'global',
        globalTokenId: commonTokens.WETH.id,
        chain,
        address: commonTokens.WETH.address,
        symbol: commonTokens.WETH.symbol
      }
    });

    const token1Ref = await this.prisma.tokenReference.create({
      data: {
        tokenType: 'global',
        globalTokenId: commonTokens.USDC.id,
        chain,
        address: commonTokens.USDC.address,
        symbol: commonTokens.USDC.symbol
      }
    });

    return await this.createPool(userId, {
      chain,
      fee: 3000,
      tickSpacing: 60, // Standard for 0.3% fee tier
      token0RefId: token0Ref.id,
      token1RefId: token1Ref.id,
      token0Address: commonTokens.WETH.address,
      token1Address: commonTokens.USDC.address,
      currentPrice: '2000.50',
      currentTick: 201000
    });
  }

  /**
   * Create multiple test pools for a user
   */
  async createPools(userId: string, count: number, chain: string = 'ethereum') {
    const pools = [];
    for (let i = 0; i < count; i++) {
      const pool = await this.createPool(userId, {
        chain,
        fee: 3000 + (i * 500), // Different fee tiers
        currentPrice: `${2000 + i * 100}.00`
      });
      pools.push(pool);
    }
    return pools;
  }

  /**
   * Create pool with existing tokens
   */
  async createPoolWithTokens(userId: string, token0Id: string, token1Id: string, data: Partial<TestPoolData> = {}) {
    const token0 = await this.prisma.token.findUniqueOrThrow({ where: { id: token0Id } });
    const token1 = await this.prisma.token.findUniqueOrThrow({ where: { id: token1Id } });

    // Find or create token references
    let token0Ref = await this.prisma.tokenReference.findFirst({
      where: {
        tokenType: 'global',
        globalTokenId: token0Id
      }
    });
    
    if (!token0Ref) {
      token0Ref = await this.prisma.tokenReference.create({
        data: {
          tokenType: 'global',
          globalTokenId: token0Id,
          chain: token0.chain,
          address: token0.address,
          symbol: token0.symbol
        }
      });
    }

    let token1Ref = await this.prisma.tokenReference.findFirst({
      where: {
        tokenType: 'global',
        globalTokenId: token1Id
      }
    });
    
    if (!token1Ref) {
      token1Ref = await this.prisma.tokenReference.create({
        data: {
          tokenType: 'global',
          globalTokenId: token1Id,
          chain: token1.chain,
          address: token1.address,
          symbol: token1.symbol
        }
      });
    }

    return await this.createPool(userId, {
      ...data,
      token0RefId: token0Ref.id,
      token1RefId: token1Ref.id,
      token0Address: token0.address,
      token1Address: token1.address
    });
  }
}

/**
 * Factory function
 */
export function createPoolFactory(prisma: PrismaClient): PoolFactory {
  return new PoolFactory(prisma);
}