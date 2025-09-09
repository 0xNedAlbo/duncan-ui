import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    vi,
    beforeAll,
    afterAll,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { PoolService } from "./poolService";
import { mockTokens } from "../../__tests__/fixtures/tokens";
import {
    mockPools,
    mockUserTokens,
    mockFactoryResponses,
} from "../../__tests__/fixtures/pools";
import { server } from "../../__tests__/mocks/server";
import { mockViemCalls } from "../../__tests__/mocks/poolHandlers";
import { createTestFactorySuite } from "../../__tests__/factories";

// Mock viem functions
vi.mock("viem", () => ({
    createPublicClient: vi.fn(() => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        readContract: vi.fn((params: any) => {
            const { functionName, address, args } = params;

            switch (functionName) {
                case "getPool":
                    return mockViemCalls.mockGetPool(args[0], args[1], args[2]);
                case "slot0":
                    return mockViemCalls.mockSlot0(address);
                case "liquidity":
                    return mockViemCalls.mockLiquidity(address);
                case "token0":
                    return mockViemCalls.mockToken0(address);
                case "token1":
                    return mockViemCalls.mockToken1(address);
                case "fee":
                    return mockViemCalls.mockFee(address);
                case "tickSpacing":
                    return mockViemCalls.mockTickSpacing(address);
                case "name":
                    return mockViemCalls.mockTokenName(address);
                case "symbol":
                    return mockViemCalls.mockTokenSymbol(address);
                case "decimals":
                    return mockViemCalls.mockTokenDecimals(address);
                default:
                    throw new Error(`Unknown function: ${functionName}`);
            }
        }),
    })),
    http: vi.fn(),
}));

vi.mock("viem/chains", () => ({
    mainnet: { id: 1, name: "Ethereum" },
    arbitrum: { id: 42161, name: "Arbitrum" },
    base: { id: 8453, name: "Base" },
}));

describe("PoolService", () => {
    let testPrisma: PrismaClient;
    let factories: ReturnType<typeof createTestFactorySuite>;
    let service: PoolService;
    let testUserId: string;

    beforeAll(async () => {
        server.listen();
        
        // Set up test database
        testPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: "postgresql://duncan:dev123@localhost:5432/duncan_test",
                },
            },
        });

        await testPrisma.$connect();
        
        // Initialize factories
        factories = createTestFactorySuite(testPrisma);
    });

    afterAll(async () => {
        server.close();
        await factories.cleanup();
        await testPrisma.$disconnect();
    });

    beforeEach(async () => {
        // Clean up database before each test
        await factories.cleanup();
        
        // Create test user
        const { user } = await factories.users.createUserForApiTest('pool-test-user');
        testUserId = user.id;
        
        // Create service with test database
        service = new PoolService(testPrisma);
        
        // Seed common tokens
        await factories.tokens.createCommonTokens('ethereum');
        
        server.resetHandlers();
    });

    afterEach(async () => {
        await service.disconnect();
    });

    describe("findOrCreatePool", () => {
        it("should return existing pool if found", async () => {
            const result = await service.findOrCreatePool(
                "ethereum",
                mockTokens.WETH_ETHEREUM.address,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            // Call again to test finding existing pool
            const result2 = await service.findOrCreatePool(
                "ethereum",
                mockTokens.WETH_ETHEREUM.address,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            expect(result.id).toBe(result2.id);
            expect(result.fee).toBe(3000);
            expect(result.token0Data.symbol).toBe("USDC");
            expect(result.token1Data.symbol).toBe("WETH");
        });

        it("should create new pool if not found", async () => {
            const result = await service.findOrCreatePool(
                "ethereum",
                mockTokens.WETH_ETHEREUM.address,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            expect(result.poolAddress).toBe(
                mockFactoryResponses.WETH_USDC_3000
            );
            expect(result.fee).toBe(3000);
            expect(result.tickSpacing).toBe(60);
            expect(result.token0Data.type).toBe("global");
            expect(result.token1Data.type).toBe("global");

            // Verify pool was created in database
            const createdPool = await testPrisma.pool.findUnique({
                where: { id: result.id },
            });
            expect(createdPool).not.toBeNull();
        });

        it("should sort token addresses correctly", async () => {
            // Pass tokens in reverse order (USDC, WETH)
            const result = await service.findOrCreatePool(
                "ethereum",
                mockTokens.USDC_ETHEREUM.address,
                mockTokens.WETH_ETHEREUM.address,
                3000,
                testUserId
            );

            // Should still result in USDC as token0 (lower address)
            expect(result.token0Address.toLowerCase()).toBe(
                mockTokens.USDC_ETHEREUM.address.toLowerCase()
            );
            expect(result.token1Address.toLowerCase()).toBe(
                mockTokens.WETH_ETHEREUM.address.toLowerCase()
            );
        });

        it("should throw error for invalid fee tier", async () => {
            await expect(
                service.findOrCreatePool(
                    "ethereum",
                    mockTokens.WETH_ETHEREUM.address,
                    mockTokens.USDC_ETHEREUM.address,
                    1234, // Invalid fee
                    testUserId
                )
            ).rejects.toThrow("Invalid fee tier: 1234");
        });

        it("should throw error if pool does not exist on-chain", async () => {
            // Mock a non-existent pool
            const nonExistentToken =
                "0x1111111111111111111111111111111111111111";

            await expect(
                service.findOrCreatePool(
                    "ethereum",
                    mockTokens.WETH_ETHEREUM.address,
                    nonExistentToken,
                    3000,
                    testUserId
                )
            ).rejects.toThrow("Pool does not exist on-chain");
        });

        it("should create pool with custom tokens", async () => {
            // Add custom token for user using factory
            const { userToken: customToken } = await factories.tokens.createTokenForUser(
                testUserId,
                {
                    id: 'pool-custom-token',
                    chain: 'ethereum',
                    address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                    symbol: 'CUSTOM',
                    name: 'Custom Token',
                    decimals: 18,
                    isVerified: false
                },
                {
                    userLabel: 'My Custom Token',
                    source: 'manual'
                }
            );

            const result = await service.findOrCreatePool(
                "ethereum",
                customToken.address,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            expect(result.ownerId).toBe(testUserId);
            expect(result.token0Data.type).toBe("global"); // Global USDC (lower address)
            expect(result.token1Data.type).toBe("user"); // Custom token (higher address)
        });
    });

    describe("getPoolById", () => {
        it("should return pool with token data", async () => {
            // Create pool using factory which will create tokens and references properly
            const pool = await factories.pools.createWethUsdcPool(testUserId);

            const result = await service.getPoolById(pool.id);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(pool.id);
            expect(result!.token0Data.symbol).toBe("WETH");
            expect(result!.token1Data.symbol).toBe("USDC");
        });

        it("should return null for non-existent pool", async () => {
            const result = await service.getPoolById("non-existent-id");
            expect(result).toBeNull();
        });
    });

    describe("getPoolsForTokenPair", () => {
        beforeEach(async () => {
            // Create multiple pools with different fees using factory pattern
            await factories.pools.createWethUsdcPool(testUserId, 'ethereum');
            
            // Create a second pool with different fee using factory with custom data
            const commonTokens = await factories.tokens.createCommonTokens('ethereum');
            await factories.pools.createPoolWithTokens(testUserId, commonTokens.WETH.id, commonTokens.USDC.id, {
                fee: 500,
                tickSpacing: 10,
                poolAddress: mockPools.WETH_USDC_500.poolAddress
            });
        });

        it("should return all pools for token pair", async () => {
            const results = await service.getPoolsForTokenPair(
                "ethereum",
                mockTokens.WETH_ETHEREUM.address,
                mockTokens.USDC_ETHEREUM.address
            );

            expect(results).toHaveLength(2);
            expect(results.map((r) => r.fee)).toEqual([500, 3000]);
            expect(results[0].token0Data.symbol).toBe("USDC");
        });

        it("should handle reversed token order", async () => {
            // Search with reversed token order
            const results = await service.getPoolsForTokenPair(
                "ethereum",
                mockTokens.USDC_ETHEREUM.address, // Reversed
                mockTokens.WETH_ETHEREUM.address // Reversed
            );

            expect(results).toHaveLength(2); // Should find both pools
            expect(results.map((r) => r.fee)).toEqual([500, 3000]);
        });

        it("should return empty array for non-existent token pair", async () => {
            const results = await service.getPoolsForTokenPair(
                "ethereum",
                "0x1111111111111111111111111111111111111111",
                "0x2222222222222222222222222222222222222222"
            );

            expect(results).toHaveLength(0);
        });
    });

    describe("searchPools", () => {
        beforeEach(async () => {
            // Create multiple test pools using factory
            const userPool = await factories.pools.createWethUsdcPool(testUserId, 'ethereum');
            
            // Create additional pools for testing
            const commonTokens = await factories.tokens.createCommonTokens('ethereum');
            
            // Create additional pools with different configurations
            await factories.pools.createPoolWithTokens(testUserId, commonTokens.WETH.id, commonTokens.USDC.id, {
                fee: 500,
                tickSpacing: 10,
                poolAddress: mockPools.WETH_USDC_500.poolAddress,
                ownerId: null // Global pool
            });
            
            // Create a second user pool
            await factories.pools.createPoolWithTokens(testUserId, commonTokens.USDC.id, commonTokens.WETH.id, {
                fee: 10000,
                tickSpacing: 200,
                poolAddress: mockPools.CUSTOM_TOKEN_POOL.poolAddress,
                ownerId: testUserId // User pool
            });
        });

        it("should search pools by chain", async () => {
            const results = await service.searchPools({
                chain: "ethereum",
            });

            expect(results.length).toBeGreaterThan(0);
            expect(results.every((r) => r.chain === "ethereum")).toBe(true);
        });

        it("should search pools by single token", async () => {
            const results = await service.searchPools({
                token0: mockTokens.WETH_ETHEREUM.address,
            });

            expect(results.length).toBeGreaterThan(0);
            expect(
                results.every(
                    (r) =>
                        r.token0Address.toLowerCase() === mockTokens.WETH_ETHEREUM.address.toLowerCase() ||
                        r.token1Address.toLowerCase() === mockTokens.WETH_ETHEREUM.address.toLowerCase()
                )
            ).toBe(true);
        });

        it("should search pools by token pair", async () => {
            const results = await service.searchPools({
                token0: mockTokens.WETH_ETHEREUM.address,
                token1: mockTokens.USDC_ETHEREUM.address,
            });

            expect(results.length).toBeGreaterThanOrEqual(2); // Both 500 and 3000 fee pools
        });

        it("should exclude user pools by default", async () => {
            const results = await service.searchPools({
                includeUserPools: false,
            });

            expect(results.every((r) => r.ownerId === null)).toBe(true);
        });

        it("should include user pools when requested", async () => {
            const results = await service.searchPools({
                includeUserPools: true,
                userId: testUserId,
            });

            const hasUserPools = results.some((r) => r.ownerId === testUserId);
            expect(hasUserPools).toBe(true);
        });
    });

    describe("updatePoolState", () => {
        it("should update pool state from blockchain", async () => {
            // Create pool using factory and then reset its state
            const createdPool = await factories.pools.createWethUsdcPool(testUserId, 'ethereum');
            
            // Update the pool to have null current state for testing
            const pool = await testPrisma.pool.update({
                where: { id: createdPool.id },
                data: {
                    currentPrice: null,
                    currentTick: null,
                    sqrtPriceX96: null,
                },
            });

            await service.updatePoolState(pool.id);

            const updatedPool = await testPrisma.pool.findUnique({
                where: { id: pool.id },
            });

            expect(updatedPool!.currentPrice).not.toBeNull();
            expect(updatedPool!.currentTick).not.toBeNull();
            expect(updatedPool!.sqrtPriceX96).not.toBeNull();
        });

        it("should throw error for non-existent pool", async () => {
            await expect(
                service.updatePoolState("non-existent-id")
            ).rejects.toThrow("Pool not found");
        });
    });

    describe("edge cases and error handling", () => {
        it("should handle address normalization", async () => {
            const upperCaseAddress =
                mockTokens.WETH_ETHEREUM.address.toUpperCase();

            const result = await service.findOrCreatePool(
                "ethereum",
                upperCaseAddress,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            expect(result.token0Address).toBe(
                mockTokens.USDC_ETHEREUM.address.toLowerCase()
            );
        });

        it("should handle unsupported chain", async () => {
            await expect(
                service.findOrCreatePool(
                    "unsupported-chain",
                    mockTokens.WETH_ETHEREUM.address,
                    mockTokens.USDC_ETHEREUM.address,
                    3000,
                    testUserId
                )
            ).rejects.toThrow("Unsupported chain");
        });

        it("should handle identical token addresses", async () => {
            await expect(
                service.findOrCreatePool(
                    "ethereum",
                    mockTokens.WETH_ETHEREUM.address,
                    mockTokens.WETH_ETHEREUM.address, // Same token
                    3000,
                    testUserId
                )
            ).rejects.toThrow();
        });

        it("should limit search results", async () => {
            // Create many pools (would exceed limit in real scenario)
            const results = await service.searchPools({});

            expect(results.length).toBeLessThanOrEqual(50); // Limit defined in service
        });
    });

    describe("integration with TokenReferenceService", () => {
        it("should resolve both global and custom tokens correctly", async () => {
            // Add custom token using factory
            const { userToken: customToken } = await factories.tokens.createTokenForUser(
                testUserId,
                {
                    id: 'integration-custom-token',
                    chain: 'ethereum',
                    address: '0xcccccccccccccccccccccccccccccccccccccccc',
                    symbol: 'INTEG',
                    name: 'Integration Token',
                    decimals: 18,
                    isVerified: false
                },
                {
                    userLabel: 'My Test Token',
                    source: 'manual'
                }
            );

            const result = await service.findOrCreatePool(
                "ethereum",
                customToken.address,
                mockTokens.USDC_ETHEREUM.address,
                3000,
                testUserId
            );

            expect(result.token0Data.type).toBe("global"); // Global USDC (lower address)
            expect(result.token1Data.type).toBe("user"); // Custom token (higher address)
            expect(result.token1Data.userLabel).toBe("My Test Token");
        });
    });
});
