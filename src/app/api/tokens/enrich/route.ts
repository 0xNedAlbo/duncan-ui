import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { DefaultClientsFactory } from "@/services/ClientsFactory";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { TokenEnrichmentService } from "@/services/tokens/tokenEnrichmentService";
import { isValidAddress } from "@/lib/utils/evm";
import { SUPPORTED_CHAINS, type SupportedChainsType } from "@/config/chains";

interface TokenEnrichmentRequest {
    tokens: Array<{
        chain: SupportedChainsType;
        address: string;
    }>;
}

interface TokenEnrichmentResponse {
    success: boolean;
    enrichedCount: number;
    results: Array<{
        chain: string;
        address: string;
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
    }>;
}

interface TokenEnrichmentError {
    error: string;
    message: string;
}

export const POST = withAuthAndLogging<TokenEnrichmentResponse | TokenEnrichmentError>(
    async (request: NextRequest, { user, log }) => {
        try {
            const body: TokenEnrichmentRequest = await request.json();

            log.debug(
                { userId: user.userId, tokenCount: body.tokens?.length },
                'Token enrichment request'
            );

            // Validate request body
            if (!body.tokens || !Array.isArray(body.tokens)) {
                return NextResponse.json(
                    { error: 'Invalid request', message: 'tokens array is required' },
                    { status: 400 }
                );
            }

            if (body.tokens.length === 0) {
                return NextResponse.json({
                    success: true,
                    enrichedCount: 0,
                    results: [],
                });
            }

            if (body.tokens.length > 10) {
                return NextResponse.json(
                    { error: 'Too many tokens', message: 'Maximum 10 tokens per request' },
                    { status: 400 }
                );
            }

            // Validate each token
            for (const token of body.tokens) {
                if (!token.chain || !token.address) {
                    return NextResponse.json(
                        { error: 'Invalid token', message: 'Each token must have chain and address' },
                        { status: 400 }
                    );
                }

                if (!SUPPORTED_CHAINS.includes(token.chain)) {
                    return NextResponse.json(
                        { error: 'Invalid chain', message: `Unsupported chain: ${token.chain}. Supported: ${SUPPORTED_CHAINS.join(', ')}` },
                        { status: 400 }
                    );
                }

                if (!isValidAddress(token.address)) {
                    return NextResponse.json(
                        { error: 'Invalid address', message: `Invalid address format: ${token.address}` },
                        { status: 400 }
                    );
                }
            }

            // Initialize services
            const clientsFactory = DefaultClientsFactory.getInstance();
            const servicesFactory = DefaultServiceFactory.getInstance();

            const { prisma, rpcClients } = clientsFactory.getClients();
            const { coinGeckoService } = servicesFactory.getServices();

            const enrichmentService = new TokenEnrichmentService(
                { prisma, rpcClients },
                { coinGeckoService }
            );

            // Enrich tokens
            const enrichmentResults = await enrichmentService.enrichTokens(body.tokens);

            // Count successful enrichments
            const enrichedCount = enrichmentResults.filter(result => result.enriched).length;

            log.debug(
                {
                    userId: user.userId,
                    totalTokens: body.tokens.length,
                    enrichedCount,
                    successCount: enrichmentResults.filter(r => r.success).length
                },
                'Token enrichment completed'
            );

            return NextResponse.json({
                success: true,
                enrichedCount,
                results: enrichmentResults.map((result, index) => ({
                    chain: body.tokens[index].chain,
                    address: body.tokens[index].address,
                    success: result.success,
                    enriched: result.enriched,
                    message: result.message,
                    data: result.data ? {
                        symbol: result.data.symbol,
                        name: result.data.name,
                        decimals: result.data.decimals,
                        logoUrl: result.data.logoUrl,
                        marketCap: result.data.marketCap,
                        coinGeckoId: result.data.coinGeckoId,
                    } : undefined,
                })),
            });

        } catch (error) {
            log.error({ error, userId: user.userId }, 'Token enrichment failed');

            return NextResponse.json(
                {
                    error: 'Enrichment failed',
                    message: 'An error occurred while enriching tokens'
                },
                { status: 500 }
            );
        }
    }
);