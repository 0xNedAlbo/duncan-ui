import { PrismaClient, Token } from "@prisma/client";
import { AlchemyTokenService } from "../alchemy/tokenMetadata";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";

export interface TokenSearchOptions {
    chain?: string;
    query?: string;
    limit?: number;
    offset?: number;
    verifiedOnly?: boolean;
}

export interface TokenCreateInput {
    chain: string;
    address: string;
    symbol?: string;
    name?: string;
    decimals?: number;
    logoUrl?: string;
    verified?: boolean;
}

export class TokenService {
    private prisma: PrismaClient;
    private alchemyService: AlchemyTokenService;

    constructor(
        requiredClients: Pick<Clients, 'prisma'>,
        requiredServices: Pick<Services, 'alchemyTokenService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.alchemyService = requiredServices.alchemyTokenService;
    }

    /**
     * Find a token by chain and address, or create it if it doesn't exist
     */
    async findOrCreateToken(chain: string, address: string): Promise<Token> {
        this.validateInput(chain, address);

        // Normalize address to lowercase for consistency
        const normalizedAddress = address.toLowerCase();

        // Try to find existing token
        const existingToken = await this.prisma.token.findUnique({
            where: {
                chain_address: {
                    chain,
                    address: normalizedAddress,
                },
            },
        });

        if (existingToken) {
            return existingToken;
        }

        // Token doesn't exist, fetch from Alchemy and create
        try {
            const metadata = await this.alchemyService.getTokenMetadata(
                chain,
                normalizedAddress
            );

            return await this.prisma.token.create({
                data: {
                    chain,
                    address: normalizedAddress,
                    symbol: metadata.symbol,
                    name: metadata.name,
                    decimals: metadata.decimals,
                    logoUrl: metadata.logo,
                    verified: true,
                    lastUpdatedAt: new Date(),
                },
            });
        } catch (error) {
            // If Alchemy fails, create with minimal data
            // Alchemy fetch failed - will create with minimal data

            return await this.prisma.token.create({
                data: {
                    chain,
                    address: normalizedAddress,
                    symbol: "UNKNOWN",
                    name: "Unknown Token",
                    decimals: 18, // Default for most ERC-20 tokens
                    verified: false,
                },
            });
        }
    }

    /**
     * Create or update a token with provided data
     */
    async upsertToken(data: TokenCreateInput): Promise<Token> {
        this.validateInput(data.chain, data.address);

        const normalizedAddress = data.address.toLowerCase();

        return await this.prisma.token.upsert({
            where: {
                chain_address: {
                    chain: data.chain,
                    address: normalizedAddress,
                },
            },
            update: {
                symbol: data.symbol,
                name: data.name,
                decimals: data.decimals,
                logoUrl: data.logoUrl,
                verified: data.verified,
                lastUpdatedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                chain: data.chain,
                address: normalizedAddress,
                symbol: data.symbol || "UNKNOWN",
                name: data.name || "Unknown Token",
                decimals: data.decimals || 18,
                logoUrl: data.logoUrl,
                verified: data.verified || false,
                lastUpdatedAt: new Date(),
            },
        });
    }

    /**
     * Update token metadata from Alchemy
     */
    async updateTokenMetadata(chain: string, address: string): Promise<Token> {
        this.validateInput(chain, address);

        const normalizedAddress = address.toLowerCase();

        // Fetch fresh metadata from Alchemy
        const metadata = await this.alchemyService.getTokenMetadata(
            chain,
            normalizedAddress
        );

        // Update in database
        return await this.prisma.token.update({
            where: {
                chain_address: {
                    chain,
                    address: normalizedAddress,
                },
            },
            data: {
                symbol: metadata.symbol,
                name: metadata.name,
                decimals: metadata.decimals,
                logoUrl: metadata.logo,
                verified: true,
                lastUpdatedAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Search tokens by symbol or name
     */
    async searchTokens(options: TokenSearchOptions = {}): Promise<Token[]> {
        const {
            chain,
            query,
            limit = 20,
            offset = 0,
            verifiedOnly = false,
        } = options;

        const where: any = {};

        if (chain) {
            where.chain = chain;
        }

        if (query) {
            where.OR = [
                {
                    symbol: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    name: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ];
        }

        if (verifiedOnly) {
            where.verified = true;
        }

        return await this.prisma.token.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: [
                { verified: "desc" }, // Verified tokens first
                { symbol: "asc" }, // Then by symbol alphabetically
            ],
        });
    }

    /**
     * Get token by chain and address
     */
    async getToken(chain: string, address: string): Promise<Token | null> {
        this.validateInput(chain, address);

        const normalizedAddress = address.toLowerCase();

        return await this.prisma.token.findUnique({
            where: {
                chain_address: {
                    chain,
                    address: normalizedAddress,
                },
            },
        });
    }

    /**
     * Get multiple tokens by their addresses (same chain)
     */
    async getTokensByAddresses(
        chain: string,
        addresses: string[]
    ): Promise<Token[]> {
        if (!chain || addresses.length === 0) {
            return [];
        }

        const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

        return await this.prisma.token.findMany({
            where: {
                chain,
                address: {
                    in: normalizedAddresses,
                },
            },
            orderBy: {
                symbol: "asc",
            },
        });
    }

    /**
     * Batch create tokens from addresses using Alchemy
     */
    async createTokensFromAddresses(
        chain: string,
        addresses: string[]
    ): Promise<Token[]> {
        if (addresses.length === 0) {
            return [];
        }

        const normalizedAddresses = addresses.map((addr) => addr.toLowerCase());

        // Check which tokens already exist
        const existingTokens = await this.getTokensByAddresses(
            chain,
            normalizedAddresses
        );
        const existingAddresses = new Set(
            existingTokens.map((token) => token.address)
        );

        // Filter out existing tokens
        const newAddresses = normalizedAddresses.filter(
            (addr) => !existingAddresses.has(addr)
        );

        if (newAddresses.length === 0) {
            return existingTokens;
        }

        // Fetch metadata for new tokens from Alchemy
        try {
            const metadataList =
                await this.alchemyService.getTokenMetadataBatchLarge(
                    chain,
                    newAddresses
                );

            // Create new tokens
            const newTokens: Token[] = [];

            for (let i = 0; i < newAddresses.length; i++) {
                const address = newAddresses[i];
                const metadata = metadataList[i];

                if (metadata) {
                    const token = await this.prisma.token.create({
                        data: {
                            chain,
                            address,
                            symbol: metadata.symbol,
                            name: metadata.name,
                            decimals: metadata.decimals,
                            logoUrl: metadata.logo,
                            verified: true,
                            lastUpdatedAt: new Date(),
                        },
                    });
                    newTokens.push(token);
                } else {
                    // Create with minimal data if Alchemy failed for this specific token
                    const token = await this.prisma.token.create({
                        data: {
                            chain,
                            address,
                            symbol: "UNKNOWN",
                            name: "Unknown Token",
                            decimals: 18,
                            verified: false,
                        },
                    });
                    newTokens.push(token);
                }
            }

            return [...existingTokens, ...newTokens];
        } catch (error) {
            // Batch fetch from Alchemy failed

            // Fallback: create tokens with minimal data
            const fallbackTokens: Token[] = [];

            for (const address of newAddresses) {
                const token = await this.prisma.token.create({
                    data: {
                        chain,
                        address,
                        symbol: "UNKNOWN",
                        name: "Unknown Token",
                        decimals: 18,
                        verified: false,
                    },
                });
                fallbackTokens.push(token);
            }

            return [...existingTokens, ...fallbackTokens];
        }
    }

    /**
     * Check if metadata is stale and needs updating
     */
    isMetadataStale(
        token: Token,
        maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
    ): boolean {
        if (!token.lastUpdatedAt) {
            return true; // Never updated
        }

        const age = Date.now() - token.lastUpdatedAt.getTime();
        return age > maxAgeMs;
    }

    /**
     * Refresh stale token metadata
     */
    async refreshStaleTokens(chain?: string): Promise<void> {
        const where: any = {
            verified: true, // Only refresh verified tokens
        };

        if (chain) {
            where.chain = chain;
        }

        // Find tokens that haven't been updated in the last week
        const staleTokens = await this.prisma.token.findMany({
            where: {
                ...where,
                OR: [
                    { lastUpdatedAt: null },
                    {
                        lastUpdatedAt: {
                            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                        },
                    },
                ],
            },
            take: 100, // Limit to avoid rate limits
        });

        // Update each token
        for (const token of staleTokens) {
            try {
                await this.updateTokenMetadata(token.chain, token.address);

                // Add small delay to respect rate limits
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                // Failed to refresh individual token
            }
        }
    }

    private validateInput(chain: string, address: string): void {
        if (!chain || typeof chain !== "string") {
            throw new Error("Invalid chain: must be a non-empty string");
        }

        if (!address || typeof address !== "string") {
            throw new Error("Invalid address: must be a non-empty string");
        }

        // Basic Ethereum address validation (case-insensitive)
        if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
            throw new Error(`Invalid Ethereum address format: ${address}`);
        }

        // Check if chain is supported by Alchemy
        if (!this.alchemyService.isChainSupported(chain)) {
            throw new Error(
                `Unsupported chain: ${chain}. Supported chains: ${this.alchemyService
                    .getSupportedChains()
                    .join(", ")}`
            );
        }
    }

    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}
