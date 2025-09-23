import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { DefaultClientsFactory } from "@/services/ClientsFactory";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { OnChainTokenService } from "@/services/tokens/onChainTokenService";
import { isValidAddress } from "@/lib/utils/evm";
import { getPopularTokens, findPopularToken } from "@/lib/config/popularTokens";
import type { SupportedChainsType } from "@/config/chains";

interface TokenSearchResponse {
    results: Array<{
        address?: string;
        symbol: string;
        name: string;
        decimals: number;
        verified: boolean;
        logoUrl?: string;
        source: 'popular' | 'database' | 'alchemy' | 'onchain' | 'coingecko';
    }>;
    query: string;
    chain: string;
    type?: 'base' | 'quote';
}

interface TokenSearchError {
    error: string;
    message: string;
}

export const GET = withAuthAndLogging<TokenSearchResponse | TokenSearchError>(
    async (request: NextRequest, { user, log }) => {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query')?.trim() || '';
        const chain = searchParams.get('chain') as SupportedChainsType;
        const type = searchParams.get('type') as 'base' | 'quote' | undefined;
        const limit = parseInt(searchParams.get('limit') || '20');

        log.debug(
            { userId: user.userId, query, chain, type, limit },
            'Token search request'
        );

        // Validate required parameters
        if (!chain) {
            return NextResponse.json(
                { error: 'Missing required parameter', message: 'Chain parameter is required' },
                { status: 400 }
            );
        }

        if (!['ethereum', 'arbitrum', 'base'].includes(chain)) {
            return NextResponse.json(
                { error: 'Invalid chain', message: 'Supported chains: ethereum, arbitrum, base' },
                { status: 400 }
            );
        }

        try {
            const clientsFactory = DefaultClientsFactory.getInstance();
            const servicesFactory = DefaultServiceFactory.getInstance();

            const { rpcClients } = clientsFactory.getClients();
            const { tokenService, alchemyTokenService, coinGeckoService } = servicesFactory.getServices();

            const onChainService = new OnChainTokenService(rpcClients);

            const results: TokenSearchResponse['results'] = [];

            // If no query, return popular tokens for the requested type
            if (!query) {
                const popularTokens = type ? getPopularTokens(chain, type) : [];

                // Fetch logos from Alchemy for popular tokens
                const popularTokensWithLogos = await Promise.all(
                    popularTokens.map(async (token) => {
                        try {
                            const alchemyToken = await alchemyTokenService.getTokenMetadata(chain, token.address);
                            return {
                                address: token.address,
                                symbol: token.symbol,
                                name: token.name,
                                decimals: alchemyToken.decimals || 18,
                                verified: true,
                                logoUrl: alchemyToken.logo || undefined,
                                source: 'popular' as const,
                            };
                        } catch {
                            // Fallback to basic token info if Alchemy fails
                            return {
                                address: token.address,
                                symbol: token.symbol,
                                name: token.name,
                                decimals: 18,
                                verified: true,
                                source: 'popular' as const,
                            };
                        }
                    })
                );

                results.push(...popularTokensWithLogos);

                log.debug(
                    { userId: user.userId, popularTokensCount: results.length },
                    'Returning popular tokens with logos'
                );

                return NextResponse.json({
                    results: results.slice(0, limit),
                    query,
                    chain,
                    type,
                });
            }

            // Check if query is an address
            const isAddress = isValidAddress(query);

            if (isAddress) {
                log.debug({ userId: user.userId, address: query }, 'Address-based search');

                // 1. Try to find in popular tokens first
                const popularToken = Object.values(getPopularTokens(chain, 'base'))
                    .concat(Object.values(getPopularTokens(chain, 'quote')))
                    .find(token => token.address.toLowerCase() === query.toLowerCase());

                if (popularToken) {
                    try {
                        // Fetch logo from Alchemy for popular token
                        const alchemyToken = await alchemyTokenService.getTokenMetadata(chain, popularToken.address);
                        results.push({
                            address: popularToken.address,
                            symbol: popularToken.symbol,
                            name: popularToken.name,
                            decimals: alchemyToken.decimals || 18,
                            verified: true,
                            logoUrl: alchemyToken.logo || undefined,
                            source: 'popular',
                        });
                    } catch {
                        // Fallback to basic token info if Alchemy fails
                        results.push({
                            address: popularToken.address,
                            symbol: popularToken.symbol,
                            name: popularToken.name,
                            decimals: 18,
                            verified: true,
                            source: 'popular',
                        });
                    }
                }

                // 2. Try database
                if (results.length === 0) {
                    try {
                        const dbToken = await tokenService.findOrCreateToken(chain, query);
                        if (dbToken) {
                            results.push({
                                address: dbToken.address,
                                symbol: dbToken.symbol || 'UNKNOWN',
                                name: dbToken.name || 'Unknown Token',
                                decimals: dbToken.decimals || 18,
                                verified: dbToken.verified || false,
                                logoUrl: dbToken.logoUrl || undefined,
                                source: 'database',
                            });
                        }
                    } catch (error) {
                        log.debug({ error }, 'Database token lookup failed, trying other sources');
                    }
                }

                // 3. Try Alchemy
                if (results.length === 0) {
                    try {
                        const alchemyToken = await alchemyTokenService.getTokenMetadata(chain, query);
                        results.push({
                            address: query,
                            symbol: alchemyToken.symbol,
                            name: alchemyToken.name,
                            decimals: alchemyToken.decimals,
                            verified: true,
                            logoUrl: alchemyToken.logo || undefined,
                            source: 'alchemy',
                        });
                    } catch (error) {
                        log.debug({ error }, 'Alchemy token lookup failed, trying on-chain');
                    }
                }

                // 4. Try on-chain as fallback
                if (results.length === 0) {
                    try {
                        const onChainToken = await onChainService.getTokenInfo(chain, query);
                        results.push({
                            address: onChainToken.address,
                            symbol: onChainToken.symbol,
                            name: onChainToken.name,
                            decimals: onChainToken.decimals,
                            verified: false,
                            source: 'onchain',
                        });
                    } catch (error) {
                        log.debug({ error }, 'On-chain token lookup failed');

                        return NextResponse.json(
                            {
                                error: 'Token not found',
                                message: 'Could not find token information for this address'
                            },
                            { status: 404 }
                        );
                    }
                }
            } else {
                // Symbol/name search
                log.debug({ userId: user.userId, symbol: query }, 'Symbol-based search');

                // 1. Check popular tokens first
                const popularToken = findPopularToken(chain, query);
                if (popularToken) {
                    try {
                        // Fetch logo from Alchemy for popular token
                        const alchemyToken = await alchemyTokenService.getTokenMetadata(chain, popularToken.address);
                        results.push({
                            address: popularToken.address,
                            symbol: popularToken.symbol,
                            name: popularToken.name,
                            decimals: alchemyToken.decimals || 18,
                            verified: true,
                            logoUrl: alchemyToken.logo || undefined,
                            source: 'popular',
                        });
                    } catch {
                        // Fallback to basic token info if Alchemy fails
                        results.push({
                            address: popularToken.address,
                            symbol: popularToken.symbol,
                            name: popularToken.name,
                            decimals: 18,
                            verified: true,
                            source: 'popular',
                        });
                    }
                }

                // 2. Search database
                try {
                    const dbTokens = await tokenService.searchTokens({
                        chain,
                        query,
                        limit,
                        verifiedOnly: false,
                    });

                    results.push(...dbTokens.map((token: any) => ({
                        address: token.address,
                        symbol: token.symbol || 'UNKNOWN',
                        name: token.name || 'Unknown Token',
                        decimals: token.decimals || 18,
                        verified: token.verified || false,
                        logoUrl: token.logoUrl || undefined,
                        source: 'database' as const,
                    })));
                } catch (error) {
                    log.debug({ error }, 'Database token search failed');
                }

                // 3. Search CoinGecko for additional token matches
                try {
                    const coinGeckoTokens = await coinGeckoService.searchTokens(query, chain, Math.max(5, limit - results.length));

                    results.push(...coinGeckoTokens.map(token => ({
                        address: token.address, // Contract address for the specific chain
                        symbol: token.symbol,
                        name: token.name,
                        decimals: 18, // Default to 18 decimals for CoinGecko tokens
                        verified: token.verified,
                        logoUrl: token.logoUrl,
                        source: token.source,
                    })));
                } catch (error) {
                    log.debug({ error }, 'CoinGecko token search failed');
                }
            }

            // Remove duplicates by address (case-insensitive)
            const uniqueResults = results.filter((token, index, array) =>
                array.findIndex(t =>
                    t.address && token.address &&
                    t.address.toLowerCase() === token.address.toLowerCase()
                ) === index
            );

            log.debug(
                {
                    userId: user.userId,
                    query,
                    chain,
                    resultCount: uniqueResults.length,
                    sources: uniqueResults.map(r => r.source)
                },
                'Token search completed'
            );

            return NextResponse.json({
                results: uniqueResults.slice(0, limit),
                query,
                chain,
                type,
            });

        } catch (error) {
            log.error({ error, userId: user.userId, query, chain }, 'Token search failed');

            return NextResponse.json(
                {
                    error: 'Search failed',
                    message: 'An error occurred while searching for tokens'
                },
                { status: 500 }
            );
        }
    }
);