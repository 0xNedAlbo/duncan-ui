import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface TestTokenData {
  id?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  chain?: string;
  address?: string;
  logoUrl?: string;
  isVerified?: boolean;
}

export interface TestUserTokenData {
  userId: string;
  tokenId?: string;
  userLabel?: string;
  notes?: string;
  isHidden?: boolean;
  lastUsedAt?: Date;
}

/**
 * Token factory for test data creation
 */
export class TokenFactory {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create test token with proper defaults
   */
  async createToken(data: TestTokenData = {}) {
    const tokenId = data.id || `token-${randomBytes(4).toString('hex')}`;
    
    return await this.prisma.token.create({
      data: {
        id: tokenId,
        symbol: data.symbol || 'TEST',
        name: data.name || 'Test Token',
        decimals: data.decimals || 18,
        chain: data.chain || 'ethereum',
        address: data.address || `0x${randomBytes(20).toString('hex')}`,
        logoUrl: data.logoUrl,
        verified: data.isVerified ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Create user token relationship (requires existing user and token)
   */
  async createUserToken(data: TestUserTokenData) {
    let tokenId = data.tokenId;
    
    // If no tokenId provided, create a test token
    if (!tokenId) {
      const token = await this.createToken();
      tokenId = token.id;
    }

    return await this.prisma.userToken.create({
      data: {
        userId: data.userId,
        tokenId: tokenId,
        userLabel: data.userLabel,
        notes: data.notes,
        isHidden: data.isHidden ?? false,
        lastUsedAt: data.lastUsedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        token: true
      }
    });
  }

  /**
   * Create token with user relationship in one step
   */
  async createTokenForUser(userId: string, tokenData: TestTokenData = {}, userTokenData: Omit<TestUserTokenData, 'userId' | 'tokenId'> = {}) {
    const token = await this.createToken(tokenData);
    
    const userToken = await this.createUserToken({
      userId,
      tokenId: token.id,
      ...userTokenData
    });

    return userToken;
  }

  /**
   * Create common test tokens (WETH, USDC, etc.)
   */
  async createCommonTokens(chain: string = 'ethereum') {
    const tokens = await Promise.all([
      this.createToken({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chain,
        address: chain === 'ethereum' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : 
                 chain === 'arbitrum' ? '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' :
                 '0x4200000000000000000000000000000000000006', // Base
        isVerified: true
      }),
      this.createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chain,
        address: chain === 'ethereum' ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' :
                 chain === 'arbitrum' ? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' :
                 '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base  
        isVerified: true
      })
    ]);

    return {
      WETH: tokens[0],
      USDC: tokens[1]
    };
  }

  /**
   * Create multiple user tokens for a user
   */
  async createUserTokens(userId: string, count: number) {
    const userTokens = [];
    for (let i = 0; i < count; i++) {
      const userToken = await this.createTokenForUser(userId, {
        symbol: `TEST${i}`,
        name: `Test Token ${i}`
      });
      userTokens.push(userToken);
    }
    return userTokens;
  }
}

/**
 * Factory function
 */
export function createTokenFactory(prisma: PrismaClient): TokenFactory {
  return new TokenFactory(prisma);
}