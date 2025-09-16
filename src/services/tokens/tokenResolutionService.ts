import { PrismaClient, UserToken } from "@prisma/client";
import { createPublicClient, http } from "viem";
import { mainnet, arbitrum, base } from "viem/chains";
import { AlchemyTokenService } from "../alchemy/tokenMetadata";
import { TokenService } from "./tokenService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import {
    ERC20_ABI,
    TokenMetadata,
    normalizeAddress,
    generatePlaceholderSymbol,
    generatePlaceholderName,
} from "@/lib/contracts/erc20";

// Chain configuration for viem clients
const CHAIN_CONFIG = {
    ethereum: { chain: mainnet },
    arbitrum: { chain: arbitrum },
    base: { chain: base },
};

export interface TokenInfo {
    id: string;
    chain: string;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string | null;
    isGlobal: boolean; // true = Global Token, false = UserToken
    isVerified: boolean; // true = from Alchemy, false = from contract/placeholder
    source?: string; // "alchemy", "contract", "placeholder", "manual"
    userLabel?: string | null; // nur für UserTokens
    notes?: string | null; // nur für UserTokens
}

export class TokenResolutionService {
    private prisma: PrismaClient;
    private tokenService: TokenService;
    private alchemyService: AlchemyTokenService;

    constructor(
        requiredClients: Pick<Clients, 'prisma'>,
        requiredServices: Pick<Services, 'tokenService' | 'alchemyTokenService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.tokenService = requiredServices.tokenService;
        this.alchemyService = requiredServices.alchemyTokenService;
    }

    /**
     * Resolve a token by chain and address for a specific user
     * Returns global token if verified, otherwise user's custom token
     */
    async resolveToken(
        chain: string,
        address: string,
        userId: string
    ): Promise<TokenInfo> {
        const normalizedAddress = normalizeAddress(address);

        // 1. Check global verified tokens first
        const globalToken = await this.tokenService.getToken(
            chain,
            normalizedAddress
        );
        if (globalToken && globalToken.verified) {
            return {
                ...globalToken,
                isGlobal: true,
                isVerified: true,
                source: "alchemy",
            };
        }

        // 2. Check user's custom tokens
        const userToken = await this.prisma.userToken.findUnique({
            where: {
                userId_chain_address: {
                    userId,
                    chain,
                    address: normalizedAddress,
                },
            },
        });

        if (userToken) {
            // Update last used timestamp
            await this.prisma.userToken.update({
                where: { id: userToken.id },
                data: { lastUsedAt: new Date() },
            });

            return {
                ...userToken,
                isGlobal: false,
                isVerified: false,
            };
        }

        // 3. Token not found - fetch and store in appropriate place
        return await this.addNewToken(userId, chain, normalizedAddress);
    }

    /**
     * Resolve multiple tokens efficiently
     */
    async resolveTokens(
        tokens: { chain: string; address: string }[],
        userId: string
    ): Promise<TokenInfo[]> {
        const results: TokenInfo[] = [];

        for (const { chain, address } of tokens) {
            const tokenInfo = await this.resolveToken(chain, address, userId);
            results.push(tokenInfo);
        }

        return results;
    }

    /**
     * Add a new token - try to store globally if Alchemy recognizes it,
     * otherwise store in user's custom list
     */
    private async addNewToken(
        userId: string,
        chain: string,
        address: string
    ): Promise<TokenInfo> {
        // Try Alchemy first
        try {
            const metadata = await this.alchemyService.getTokenMetadata(
                chain,
                address
            );

            // If Alchemy has good data, store as global token
            if (
                metadata.symbol &&
                metadata.name &&
                metadata.symbol !== "UNKNOWN" &&
                metadata.name !== "Unknown Token"
            ) {
                const globalToken = await this.tokenService.upsertToken({
                    chain,
                    address,
                    symbol: metadata.symbol,
                    name: metadata.name,
                    decimals: metadata.decimals,
                    logoUrl: metadata.logo ?? undefined,
                    verified: true,
                });

                return {
                    ...globalToken,
                    isGlobal: true,
                    isVerified: true,
                    source: "alchemy",
                };
            }
        } catch {
            // Alchemy fetch failed, will try contract call
        }

        // Try contract call
        try {
            const contractData = await this.fetchTokenFromContract(
                chain,
                address
            );

            if (contractData.symbol && contractData.name) {
                const userToken = await this.prisma.userToken.create({
                    data: {
                        userId,
                        chain,
                        address,
                        symbol: contractData.symbol,
                        name: contractData.name,
                        decimals: contractData.decimals,
                        source: "contract",
                    },
                });

                return {
                    ...userToken,
                    isGlobal: false,
                    isVerified: false,
                };
            }
        } catch {
            // Contract call failed
        }

        // Fallback: placeholder in user's custom list
        const placeholder = await this.prisma.userToken.create({
            data: {
                userId,
                chain,
                address,
                symbol: generatePlaceholderSymbol(address),
                name: generatePlaceholderName(address),
                decimals: 18, // Default for most ERC-20 tokens
                source: "placeholder",
            },
        });

        return {
            ...placeholder,
            isGlobal: false,
            isVerified: false,
        };
    }

    /**
     * Fetch token metadata directly from the contract
     */
    private async fetchTokenFromContract(
        chain: string,
        address: string
    ): Promise<TokenMetadata> {
        const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
        if (!chainConfig) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(),
        });

        try {
            // Call contract functions in parallel
            const [name, symbol, decimals] = await Promise.all([
                publicClient.readContract({
                    address: address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "name",
                }) as Promise<string>,
                publicClient.readContract({
                    address: address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "symbol",
                }) as Promise<string>,
                publicClient.readContract({
                    address: address as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                }) as Promise<number>,
            ]);

            return {
                name: name || "Unknown Token",
                symbol: symbol || "UNKNOWN",
                decimals: decimals || 18,
            };
        } catch (error) {
            // Contract metadata fetch failed
            throw new Error(`Contract call failed: ${error}`);
        }
    }

    /**
     * Get user's custom tokens
     */
    async getUserTokens(userId: string, chain?: string): Promise<UserToken[]> {
        const where: any = { userId };
        if (chain) {
            where.chain = chain;
        }

        return await this.prisma.userToken.findMany({
            where,
            orderBy: [{ lastUsedAt: "desc" }, { symbol: "asc" }],
        });
    }

    /**
     * Add a custom token manually
     */
    async addCustomToken(
        userId: string,
        tokenData: {
            chain: string;
            address: string;
            symbol: string;
            name: string;
            decimals: number;
            logoUrl?: string;
            userLabel?: string;
            notes?: string;
        }
    ): Promise<UserToken> {
        const normalizedAddress = normalizeAddress(tokenData.address);

        // Check if already exists
        const existing = await this.prisma.userToken.findUnique({
            where: {
                userId_chain_address: {
                    userId,
                    chain: tokenData.chain,
                    address: normalizedAddress,
                },
            },
        });

        if (existing) {
            throw new Error("Token already exists in your custom list");
        }

        return await this.prisma.userToken.create({
            data: {
                userId,
                chain: tokenData.chain,
                address: normalizedAddress,
                symbol: tokenData.symbol,
                name: tokenData.name,
                decimals: tokenData.decimals,
                logoUrl: tokenData.logoUrl,
                userLabel: tokenData.userLabel,
                notes: tokenData.notes,
                source: "manual",
            },
        });
    }

    /**
     * Update user token (label, notes, etc.)
     */
    async updateUserToken(
        userId: string,
        tokenId: string,
        updates: {
            userLabel?: string;
            notes?: string;
        }
    ): Promise<UserToken> {
        // Verify ownership
        const existing = await this.prisma.userToken.findFirst({
            where: {
                id: tokenId,
                userId,
            },
        });

        if (!existing) {
            throw new Error("Token not found or not owned by user");
        }

        return await this.prisma.userToken.update({
            where: { id: tokenId },
            data: {
                ...updates,
                lastUsedAt: new Date(),
            },
        });
    }

    /**
     * Remove a user's custom token
     */
    async removeUserToken(userId: string, tokenId: string): Promise<void> {
        // Check if token is used in any pools
        const poolCount = await this.prisma.pool.count({
            where: {
                ownerId: userId,
                OR: [
                    {
                        token0Address: {
                            in: [await this.getTokenAddress(tokenId)],
                        },
                    },
                    {
                        token1Address: {
                            in: [await this.getTokenAddress(tokenId)],
                        },
                    },
                ],
            },
        });

        if (poolCount > 0) {
            throw new Error("Cannot remove token that is used in pools");
        }

        await this.prisma.userToken.deleteMany({
            where: {
                id: tokenId,
                userId,
            },
        });
    }

    private async getTokenAddress(tokenId: string): Promise<string> {
        const userToken = await this.prisma.userToken.findUnique({
            where: { id: tokenId },
        });
        return userToken?.address || "";
    }

    /**
     * Attempt to upgrade custom tokens to global if they become available in Alchemy
     */
    async enrichUserTokens(userId: string): Promise<number> {
        const userTokens = await this.prisma.userToken.findMany({
            where: {
                userId,
                source: { in: ["placeholder", "contract"] },
            },
        });

        let enrichedCount = 0;

        for (const userToken of userTokens) {
            try {
                const metadata = await this.alchemyService.getTokenMetadata(
                    userToken.chain,
                    userToken.address
                );

                if (
                    metadata.symbol &&
                    metadata.name &&
                    metadata.symbol !== "UNKNOWN"
                ) {
                    // Create global token
                    await this.tokenService.upsertToken({
                        chain: userToken.chain,
                        address: userToken.address,
                        symbol: metadata.symbol,
                        name: metadata.name,
                        decimals: metadata.decimals,
                        logoUrl: metadata.logo ?? undefined,
                        verified: true,
                    });

                    // Remove from user's custom list
                    await this.prisma.userToken.delete({
                        where: { id: userToken.id },
                    });

                    enrichedCount++;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                // Token still not in Alchemy
                continue;
            }
        }

        return enrichedCount;
    }

    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}
