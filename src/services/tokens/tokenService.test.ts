import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { TokenService } from "./tokenService";
import {
    TOKEN_ADDRESSES,
    INVALID_ADDRESSES,
} from "../../__tests__/fixtures/tokens";

describe("TokenService", () => {
    let service: TokenService;
    let testPrisma: PrismaClient;

    beforeAll(async () => {
        // Set up test environment
        process.env.ALCHEMY_TOKEN_API_KEY = "test-api-key";

        // Use test database
        testPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: "postgresql://duncan:dev123@localhost:5432/duncan_test",
                },
            },
        });

        await testPrisma.$connect();
        service = new TokenService(testPrisma);
    });

    beforeEach(async () => {
        // Clean up database before each test
        await testPrisma.position.deleteMany();
        await testPrisma.pool.deleteMany();
        await testPrisma.token.deleteMany();
        await testPrisma.user.deleteMany();
    });

    afterAll(async () => {
        // Clean up and disconnect
        await testPrisma.position.deleteMany();
        await testPrisma.pool.deleteMany();
        await testPrisma.token.deleteMany();
        await testPrisma.user.deleteMany();
        await testPrisma.$disconnect();
        await service.disconnect();
    });

    describe("findOrCreateToken", () => {
        it("should create new token when it does not exist", async () => {
            const token = await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            expect(token.chain).toBe("ethereum");
            expect(token.address).toBe(
                TOKEN_ADDRESSES.ethereum.WETH.toLowerCase()
            );
            expect(token.symbol).toBe("WETH");
            expect(token.name).toBe("Wrapped Ether");
            expect(token.decimals).toBe(18);
            expect(token.verified).toBe(true);
            expect(token.logoUrl).toBeTruthy();
        });

        it("should return existing token when it already exists", async () => {
            // Create token first
            const firstToken = await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            // Call again - should return same token
            const secondToken = await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            expect(secondToken.id).toBe(firstToken.id);
            expect(secondToken.createdAt).toEqual(firstToken.createdAt);
        });

        it("should normalize address to lowercase", async () => {
            const upperCaseAddress =
                TOKEN_ADDRESSES.ethereum.WETH.toUpperCase();
            const token = await service.findOrCreateToken(
                "ethereum",
                upperCaseAddress
            );

            expect(token.address).toBe(
                TOKEN_ADDRESSES.ethereum.WETH.toLowerCase()
            );
        });

        it("should handle Alchemy API errors gracefully", async () => {
            // Use non-existent token address
            const nonExistentToken =
                "0x1234567890123456789012345678901234567890";
            const token = await service.findOrCreateToken(
                "ethereum",
                nonExistentToken
            );

            expect(token.address).toBe(nonExistentToken);
            expect(token.symbol).toBe("UNKNOWN");
            expect(token.name).toBe("Unknown Token");
            expect(token.decimals).toBe(18);
            expect(token.verified).toBe(false);
        });

        it("should throw error for invalid chain", async () => {
            await expect(
                service.findOrCreateToken(
                    "invalid-chain",
                    TOKEN_ADDRESSES.ethereum.WETH
                )
            ).rejects.toThrow("Unsupported chain");
        });

        it("should throw error for invalid address", async () => {
            for (const invalidAddress of INVALID_ADDRESSES) {
                await expect(
                    service.findOrCreateToken("ethereum", invalidAddress)
                ).rejects.toThrow();
            }
        });
    });

    describe("upsertToken", () => {
        it("should create new token with provided data", async () => {
            const tokenData = {
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
                symbol: "WETH",
                name: "Wrapped Ether",
                decimals: 18,
                logoUrl: "https://example.com/logo.png",
                verified: true,
            };

            const token = await service.upsertToken(tokenData);

            expect(token.chain).toBe("ethereum");
            expect(token.address).toBe(
                TOKEN_ADDRESSES.ethereum.WETH.toLowerCase()
            );
            expect(token.symbol).toBe("WETH");
            expect(token.verified).toBe(true);
        });

        it("should update existing token", async () => {
            const address = TOKEN_ADDRESSES.ethereum.WETH;

            // Create initial token
            await service.upsertToken({
                chain: "ethereum",
                address,
                symbol: "OLD_SYMBOL",
                name: "Old Name",
                decimals: 6,
            });

            // Update with new data
            const updatedToken = await service.upsertToken({
                chain: "ethereum",
                address,
                symbol: "NEW_SYMBOL",
                name: "New Name",
                decimals: 18,
                verified: true,
            });

            expect(updatedToken.symbol).toBe("NEW_SYMBOL");
            expect(updatedToken.name).toBe("New Name");
            expect(updatedToken.decimals).toBe(18);
            expect(updatedToken.verified).toBe(true);
        });

        it("should use defaults for missing fields", async () => {
            const token = await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
            });

            expect(token.symbol).toBe("UNKNOWN");
            expect(token.name).toBe("Unknown Token");
            expect(token.decimals).toBe(18);
            expect(token.verified).toBe(false);
        });
    });

    describe("getToken", () => {
        it("should return token if it exists", async () => {
            // Create token first
            const createdToken = await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            // Get token
            const foundToken = await service.getToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            expect(foundToken).toBeTruthy();
            expect(foundToken!.id).toBe(createdToken.id);
        });

        it("should return null if token does not exist", async () => {
            const token = await service.getToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.USDC
            );
            expect(token).toBeNull();
        });

        it("should handle case-insensitive address lookup", async () => {
            // Create with lowercase
            await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            // Find with uppercase
            const token = await service.getToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH.toUpperCase()
            );
            expect(token).toBeTruthy();
        });
    });

    describe("searchTokens", () => {
        beforeEach(async () => {
            // Create test tokens
            await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
                symbol: "WETH",
                name: "Wrapped Ether",
                verified: true,
            });

            await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.USDC,
                symbol: "USDC",
                name: "USD Coin",
                verified: true,
            });

            await service.upsertToken({
                chain: "arbitrum",
                address: TOKEN_ADDRESSES.arbitrum.WETH,
                symbol: "WETH",
                name: "Wrapped Ether",
                verified: false,
            });
        });

        it("should search tokens by symbol", async () => {
            const tokens = await service.searchTokens({ query: "WETH" });
            expect(tokens.length).toBeGreaterThanOrEqual(1);
            expect(tokens.every((token) => token.symbol.includes("WETH"))).toBe(
                true
            );
        });

        it("should search tokens by name", async () => {
            const tokens = await service.searchTokens({ query: "Wrapped" });
            expect(tokens.length).toBeGreaterThanOrEqual(1);
            expect(
                tokens.every((token) => token.name.includes("Wrapped"))
            ).toBe(true);
        });

        it("should filter by chain", async () => {
            const ethereumTokens = await service.searchTokens({
                chain: "ethereum",
            });
            expect(
                ethereumTokens.every((token) => token.chain === "ethereum")
            ).toBe(true);
        });

        it("should filter verified tokens only", async () => {
            const verifiedTokens = await service.searchTokens({
                verifiedOnly: true,
            });
            expect(
                verifiedTokens.every((token) => token.verified === true)
            ).toBe(true);
        });

        it("should apply limit and offset", async () => {
            const firstPage = await service.searchTokens({
                limit: 1,
                offset: 0,
            });
            const secondPage = await service.searchTokens({
                limit: 1,
                offset: 1,
            });

            expect(firstPage.length).toBe(1);
            expect(secondPage.length).toBeLessThanOrEqual(1);

            if (secondPage.length > 0) {
                expect(firstPage[0].id).not.toBe(secondPage[0].id);
            }
        });

        it("should prioritize verified tokens", async () => {
            const tokens = await service.searchTokens({});

            // Find indices of verified and unverified tokens
            const firstUnverifiedIndex = tokens.findIndex(
                (token) => !token.verified
            );
            const lastVerifiedIndex = tokens.reduce(
                (lastIndex, token, index) =>
                    token.verified ? index : lastIndex,
                -1
            );

            if (firstUnverifiedIndex !== -1 && lastVerifiedIndex !== -1) {
                expect(lastVerifiedIndex).toBeLessThan(firstUnverifiedIndex);
            }
        });
    });

    describe("getTokensByAddresses", () => {
        it("should return tokens for given addresses", async () => {
            // Create tokens
            await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );
            await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.USDC
            );

            const addresses = [
                TOKEN_ADDRESSES.ethereum.WETH,
                TOKEN_ADDRESSES.ethereum.USDC,
            ];
            const tokens = await service.getTokensByAddresses(
                "ethereum",
                addresses
            );

            expect(tokens).toHaveLength(2);
            expect(tokens.map((t) => t.address.toLowerCase()).sort()).toEqual(
                addresses.map((a) => a.toLowerCase()).sort()
            );
        });

        it("should return empty array for empty addresses", async () => {
            const tokens = await service.getTokensByAddresses("ethereum", []);
            expect(tokens).toEqual([]);
        });

        it("should filter by chain correctly", async () => {
            // Create tokens on different chains
            await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );
            await service.findOrCreateToken(
                "arbitrum",
                TOKEN_ADDRESSES.arbitrum.WETH
            );

            const ethereumTokens = await service.getTokensByAddresses(
                "ethereum",
                [TOKEN_ADDRESSES.ethereum.WETH]
            );
            expect(ethereumTokens).toHaveLength(1);
            expect(ethereumTokens[0].chain).toBe("ethereum");
        });
    });

    describe("createTokensFromAddresses", () => {
        it("should create new tokens and return all tokens", async () => {
            const addresses = [
                TOKEN_ADDRESSES.ethereum.WETH,
                TOKEN_ADDRESSES.ethereum.USDC,
            ];
            const tokens = await service.createTokensFromAddresses(
                "ethereum",
                addresses
            );

            expect(tokens).toHaveLength(2);
            expect(tokens.every((token) => token.chain === "ethereum")).toBe(
                true
            );
        });

        it("should reuse existing tokens and create only new ones", async () => {
            // Create one token first
            const existingToken = await service.findOrCreateToken(
                "ethereum",
                TOKEN_ADDRESSES.ethereum.WETH
            );

            const addresses = [
                TOKEN_ADDRESSES.ethereum.WETH,
                TOKEN_ADDRESSES.ethereum.USDC,
            ];
            const tokens = await service.createTokensFromAddresses(
                "ethereum",
                addresses
            );

            expect(tokens).toHaveLength(2);

            // Check that existing token was reused
            const wethToken = tokens.find(
                (t) => t.address === TOKEN_ADDRESSES.ethereum.WETH.toLowerCase()
            );
            expect(wethToken!.id).toBe(existingToken.id);
        });

        it("should return empty array for empty addresses", async () => {
            const tokens = await service.createTokensFromAddresses(
                "ethereum",
                []
            );
            expect(tokens).toEqual([]);
        });
    });

    describe("isMetadataStale", () => {
        it("should return true for token with no lastUpdatedAt", async () => {
            const token = await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
            });

            // Clear lastUpdatedAt
            const tokenWithoutUpdate = { ...token, lastUpdatedAt: null };
            expect(service.isMetadataStale(tokenWithoutUpdate)).toBe(true);
        });

        it("should return true for old token", async () => {
            const token = await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
            });

            // Set lastUpdatedAt to 8 days ago
            const oldToken = {
                ...token,
                lastUpdatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            };

            expect(service.isMetadataStale(oldToken)).toBe(true);
        });

        it("should return false for fresh token", async () => {
            const token = await service.upsertToken({
                chain: "ethereum",
                address: TOKEN_ADDRESSES.ethereum.WETH,
            });

            // Token was just created, should be fresh
            expect(service.isMetadataStale(token)).toBe(false);
        });
    });

    describe("validation", () => {
        it("should validate chain parameter", async () => {
            await expect(
                service.getToken("", TOKEN_ADDRESSES.ethereum.WETH)
            ).rejects.toThrow("Invalid chain");

            await expect(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                service.getToken(null as any, TOKEN_ADDRESSES.ethereum.WETH)
            ).rejects.toThrow("Invalid chain");
        });

        it("should validate address parameter", async () => {
            await expect(service.getToken("ethereum", "")).rejects.toThrow(
                "Invalid address"
            );

            await expect(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                service.getToken("ethereum", null as any)
            ).rejects.toThrow("Invalid address");
        });

        it("should validate address format", async () => {
            await expect(
                service.getToken("ethereum", "invalid-address")
            ).rejects.toThrow("Invalid Ethereum address format");
        });

        it("should validate supported chains", async () => {
            await expect(
                service.getToken(
                    "unsupported-chain",
                    TOKEN_ADDRESSES.ethereum.WETH
                )
            ).rejects.toThrow("Unsupported chain");
        });
    });
});
