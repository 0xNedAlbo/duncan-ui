import { NextRequest, NextResponse } from "next/server";
import { withAuthAndLogging } from "@/app-shared/lib/api/withAuth";
import { DefaultServiceFactory } from "@/services/ServiceFactory";
import { isValidAddress } from "@/lib/utils/evm";
import { SUPPORTED_CHAINS, type SupportedChainsType } from "@/config/chains";

interface TokenCreateRequest {
    chain: SupportedChainsType;
    address: string;
}

interface TokenCreateResponse {
    success: boolean;
    token: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoUrl?: string;
        marketCap?: string;
        coinGeckoId?: string;
        verified: boolean;
        source: string;
    };
}

interface TokenCreateError {
    error: string;
    message: string;
}

export const POST = withAuthAndLogging<TokenCreateResponse | TokenCreateError>(
    async (request: NextRequest, { user, log }) => {
        try {
            const body: TokenCreateRequest = await request.json();

            log.debug(
                {
                    userId: user.userId,
                    chain: body.chain,
                    address: body.address,
                },
                "Token creation request"
            );

            // Validate request body
            if (!body.chain || !body.address) {
                return NextResponse.json(
                    {
                        error: "Invalid request",
                        message: "chain and address are required",
                    },
                    { status: 400 }
                );
            }

            if (!SUPPORTED_CHAINS.includes(body.chain)) {
                return NextResponse.json(
                    {
                        error: "Invalid chain",
                        message: `Unsupported chain: ${
                            body.chain
                        }. Supported: ${SUPPORTED_CHAINS.join(", ")}`,
                    },
                    { status: 400 }
                );
            }

            if (!isValidAddress(body.address)) {
                return NextResponse.json(
                    {
                        error: "Invalid address",
                        message: `Invalid address format: ${body.address}`,
                    },
                    { status: 400 }
                );
            }

            // Initialize services
            const servicesFactory = DefaultServiceFactory.getInstance();
            const { tokenService } = servicesFactory.getServices();

            // Create token with enrichment
            const createdToken = await tokenService.findOrCreateToken(
                body.chain,
                body.address
            );

            log.debug(
                {
                    userId: user.userId,
                    tokenAddress: createdToken.address,
                    tokenSymbol: createdToken.symbol,
                    source: createdToken.source,
                },
                "Token created successfully"
            );

            return NextResponse.json({
                success: true,
                token: {
                    address: createdToken.address,
                    symbol: createdToken.symbol,
                    name: createdToken.name,
                    decimals: createdToken.decimals,
                    logoUrl: createdToken.logoUrl || undefined,
                    marketCap: createdToken.marketCap || undefined,
                    coinGeckoId: createdToken.coinGeckoId || undefined,
                    verified: createdToken.verified,
                    source: createdToken.source,
                },
            });
        } catch (error) {
            log.error({ error, userId: user.userId }, "Token creation failed");

            return NextResponse.json(
                {
                    error: "Token creation failed",
                    message: "An error occurred while creating the token",
                },
                { status: 500 }
            );
        }
    }
);
