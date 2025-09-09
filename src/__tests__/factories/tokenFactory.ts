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
  chain?: string;
  address?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  logoUrl?: string;
  source?: string;
  userLabel?: string;
  notes?: string;
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
   * Create user token with new schema (direct fields)
   */
  async createUserToken(data: TestUserTokenData) {
    return await this.prisma.userToken.create({
      data: {
        userId: data.userId,
        chain: data.chain || 'ethereum',
        address: data.address || `0x${randomBytes(20).toString('hex')}`,
        symbol: data.symbol || 'TEST',
        name: data.name || 'Test Token',
        decimals: data.decimals || 18,
        logoUrl: data.logoUrl,
        source: data.source || 'manual',
        userLabel: data.userLabel,
        notes: data.notes,
        lastUsedAt: data.lastUsedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Create user token directly (no separate Token entity needed)
   */
  async createTokenForUser(userId: string, tokenData: TestTokenData = {}, userTokenData: Omit<TestUserTokenData, 'userId'> = {}) {
    const userToken = await this.createUserToken({
      userId,
      chain: tokenData.chain,
      address: tokenData.address,
      symbol: tokenData.symbol,
      name: tokenData.name,
      decimals: tokenData.decimals,
      logoUrl: tokenData.logoUrl,
      ...userTokenData
    });

    return { userToken };
  }

  /**
   * Create or get common test tokens (WETH, USDC, etc.)
   */
  async createCommonTokens(chain: string = 'ethereum') {
    const wethAddress = chain === 'ethereum' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : 
                       chain === 'arbitrum' ? '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' :
                       '0x4200000000000000000000000000000000000006'; // Base
    const usdcAddress = chain === 'ethereum' ? '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' :
                       chain === 'arbitrum' ? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' :
                       '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base

    // Try to find existing tokens first
    let weth = await this.prisma.token.findUnique({
      where: { chain_address: { chain, address: wethAddress } }
    });
    let usdc = await this.prisma.token.findUnique({
      where: { chain_address: { chain, address: usdcAddress } }
    });

    // Create only if they don't exist
    if (!weth) {
      weth = await this.createToken({
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chain,
        address: wethAddress,
        isVerified: true
      });
    }

    if (!usdc) {
      usdc = await this.createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chain,
        address: usdcAddress,
        isVerified: true
      });
    }

    return {
      WETH: weth,
      USDC: usdc
    };
  }

  /**
   * Create multiple user tokens for a user
   */
  async createUserTokens(userId: string, count: number) {
    const userTokens = [];
    for (let i = 0; i < count; i++) {
      const { userToken } = await this.createTokenForUser(userId, {
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