/**
 * Token Enrichment Service
 *
 * Handles background enrichment of token metadata using CoinGecko API
 * and on-chain RPC calls for decimals. Triggered by token pair selection
 * and position imports.
 */

import { PrismaClient } from "@prisma/client";
import type { PublicClient } from "viem";
import { CoinGeckoService, type EnrichmentData } from "../coingecko/coinGeckoService";
import { normalizeAddress } from "@/lib/utils/evm";
import type { SupportedChainsType } from "@/config/chains";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";

export interface TokenEnrichmentInput {
    chain: SupportedChainsType;
    address: string;
}

export interface TokenEnrichmentResult {
    success: boolean;
    enriched: boolean;
    message: string;
    data?: {
        symbol?: string;
        name?: string;
        decimals?: number;
        logoUrl?: string;
        marketCap?: string;
        coinGeckoId?: string;
    };
}

export class TokenEnrichmentService {
    private prisma: PrismaClient;
    private rpcClients: Map<SupportedChainsType, PublicClient>;
    private coinGeckoService: CoinGeckoService;
    private readonly enrichmentCooldown = 24 * 60 * 60 * 1000; // 24 hours

    constructor(
        requiredClients: Pick<Clients, 'prisma' | 'rpcClients'>,
        requiredServices: Pick<Services, 'coinGeckoService'>
    ) {
        this.prisma = requiredClients.prisma;
        this.rpcClients = requiredClients.rpcClients;
        this.coinGeckoService = requiredServices.coinGeckoService;
    }

    /**
     * Enrich a single token with market cap and metadata
     */
    async enrichToken(input: TokenEnrichmentInput): Promise<TokenEnrichmentResult> {
        try {
            const { chain, address } = input;
            const normalizedAddress = normalizeAddress(address);

            // Check if token exists and if enrichment is needed
            const existingToken = await this.prisma.token.findUnique({
                where: {
                    chain_address: {
                        chain,
                        address: normalizedAddress,
                    },
                },
            });

            // Skip if recently enriched
            if (existingToken?.lastEnrichedAt && this.isRecentlyEnriched(existingToken.lastEnrichedAt)) {
                return {
                    success: true,
                    enriched: false,
                    message: "Token recently enriched, skipping",
                };
            }

            // Get enrichment data from CoinGecko (only for market cap and logo)
            let enrichmentData: EnrichmentData | null = null;
            try {
                enrichmentData = await this.coinGeckoService.getTokenEnrichmentData(chain, normalizedAddress);
            } catch (error) {
                // CoinGecko enrichment failed, continue without it
            }

            // Get token metadata from on-chain (always use on-chain data for symbol, name, decimals)
            let onChainMetadata: { symbol: string; name: string; decimals: number } | null = null;
            try {
                onChainMetadata = await this.getTokenMetadata(chain, normalizedAddress);
            } catch (error) {
                // On-chain call failed, use existing data or defaults
                if (!existingToken) {
                    throw new Error('Unable to get token metadata from on-chain and no existing token found');
                }
            }

            // Update token in database
            if (existingToken) {
                const updateData: any = {
                    lastEnrichedAt: new Date(),
                };

                // Use on-chain metadata for symbol, name, decimals
                if (onChainMetadata) {
                    updateData.symbol = onChainMetadata.symbol;
                    updateData.name = onChainMetadata.name;
                    updateData.decimals = onChainMetadata.decimals;
                }

                // Use CoinGecko data for market cap and logo
                if (enrichmentData) {
                    updateData.marketCap = enrichmentData.marketCap;
                    updateData.coinGeckoId = await this.coinGeckoService.findCoinByAddress(chain, normalizedAddress);

                    // Update logo from CoinGecko (prefer CoinGecko logo over existing)
                    if (enrichmentData.logoUrl) {
                        updateData.logoUrl = enrichmentData.logoUrl;
                    }
                }

                await this.prisma.token.update({
                    where: {
                        chain_address: {
                            chain,
                            address: normalizedAddress,
                        },
                    },
                    data: updateData,
                });

                return {
                    success: true,
                    enriched: true,
                    message: "Token enriched successfully",
                    data: {
                        symbol: onChainMetadata?.symbol || existingToken.symbol,
                        name: onChainMetadata?.name || existingToken.name,
                        decimals: onChainMetadata?.decimals || existingToken.decimals,
                        logoUrl: enrichmentData?.logoUrl || existingToken.logoUrl,
                        marketCap: enrichmentData?.marketCap,
                        coinGeckoId: updateData.coinGeckoId,
                    },
                };
            }

            // Token doesn't exist, create it with enrichment data
            if (onChainMetadata || enrichmentData) {
                const coinGeckoId = enrichmentData ? await this.coinGeckoService.findCoinByAddress(chain, normalizedAddress) : null;

                // Require on-chain metadata for new tokens
                if (!onChainMetadata) {
                    throw new Error('On-chain metadata required for new token creation');
                }

                await this.prisma.token.create({
                    data: {
                        chain,
                        address: normalizedAddress,
                        symbol: onChainMetadata.symbol,
                        name: onChainMetadata.name,
                        decimals: onChainMetadata.decimals,
                        logoUrl: enrichmentData?.logoUrl || null,
                        marketCap: enrichmentData?.marketCap || null,
                        coinGeckoId,
                        lastEnrichedAt: new Date(),
                        verified: true,
                        source: enrichmentData ? "coingecko" : "contract",
                    },
                });

                return {
                    success: true,
                    enriched: true,
                    message: "New token created with enrichment data",
                    data: {
                        symbol: onChainMetadata.symbol,
                        name: onChainMetadata.name,
                        decimals: onChainMetadata.decimals,
                        logoUrl: enrichmentData?.logoUrl || undefined,
                        marketCap: enrichmentData?.marketCap,
                        coinGeckoId,
                    },
                };
            }

            return {
                success: true,
                enriched: false,
                message: "No enrichment data available",
            };

        } catch (error) {
            return {
                success: false,
                enriched: false,
                message: `Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Enrich multiple tokens (for position imports)
     */
    async enrichTokens(inputs: TokenEnrichmentInput[]): Promise<TokenEnrichmentResult[]> {
        const results: TokenEnrichmentResult[] = [];

        for (const input of inputs) {
            try {
                const result = await this.enrichToken(input);
                results.push(result);

                // Add small delay to respect rate limits
                await this.delay(200);
            } catch (error) {
                results.push({
                    success: false,
                    enriched: false,
                    message: `Batch enrichment failed for ${input.chain}:${input.address}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
            }
        }

        return results;
    }

    /**
     * Get token metadata from on-chain contract
     */
    private async getTokenMetadata(chain: SupportedChainsType, address: string): Promise<{
        symbol: string;
        name: string;
        decimals: number;
    }> {
        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        const tokenAbi = [
            {
                name: 'symbol',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'string' }],
            },
            {
                name: 'name',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'string' }],
            },
            {
                name: 'decimals',
                type: 'function',
                stateMutability: 'view',
                inputs: [],
                outputs: [{ name: '', type: 'uint8' }],
            },
        ];

        try {
            const [symbol, name, decimals] = await Promise.all([
                client.readContract({
                    address: address as `0x${string}`,
                    abi: tokenAbi,
                    functionName: 'symbol',
                }),
                client.readContract({
                    address: address as `0x${string}`,
                    abi: tokenAbi,
                    functionName: 'name',
                }),
                client.readContract({
                    address: address as `0x${string}`,
                    abi: tokenAbi,
                    functionName: 'decimals',
                }),
            ]);

            return {
                symbol: symbol as string,
                name: name as string,
                decimals: Number(decimals),
            };
        } catch (error) {
            throw new Error(`Failed to get token metadata for ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if token was recently enriched (within cooldown period)
     */
    private isRecentlyEnriched(lastEnrichedAt: Date): boolean {
        const now = Date.now();
        const lastEnriched = lastEnrichedAt.getTime();
        return (now - lastEnriched) < this.enrichmentCooldown;
    }

    /**
     * Add delay between API calls
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}