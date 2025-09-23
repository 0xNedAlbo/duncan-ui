import type { SupportedChainsType } from "@/config/chains";

export interface PopularToken {
    symbol: string;
    address: string;
    name: string;
    logoUrl?: string;
}


export interface PopularTokensByChain {
    base: PopularToken[];
    quote: PopularToken[];
}

// Popular tokens configuration per chain
export const POPULAR_TOKENS: Record<SupportedChainsType, PopularTokensByChain> = {
    ethereum: {
        base: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether"
            },
            {
                symbol: "WBTC",
                address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                name: "Wrapped BTC"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether"
            },
            {
                symbol: "USDC",
                address: "0xA0b86a33E74113e56D24A2Ecc6024C435378FFD3",
                name: "USD Coin"
            },
            {
                symbol: "USDT",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                name: "Tether USD"
            }
        ]
    },
    arbitrum: {
        base: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether"
            },
            {
                symbol: "WBTC",
                address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
                name: "Wrapped BTC"
            },
            {
                symbol: "ARB",
                address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
                name: "Arbitrum"
            },
            {
                symbol: "GMX",
                address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
                name: "GMX"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether"
            },
            {
                symbol: "USDC",
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                name: "USD Coin"
            },
            {
                symbol: "USDC.e",
                address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                name: "USD Coin (Arb1)"
            }
        ]
    },
    base: {
        base: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether"
            },
            {
                symbol: "USDC",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                name: "USD Coin"
            }
        ]
    }
};

/**
 * Get popular tokens for a specific chain and type
 */
export function getPopularTokens(
    chain: SupportedChainsType,
    type: 'base' | 'quote'
): PopularToken[] {
    return POPULAR_TOKENS[chain]?.[type] || [];
}

/**
 * Find a popular token by symbol and chain
 */
export function findPopularToken(
    chain: SupportedChainsType,
    symbol: string
): PopularToken | null {
    const baseTokens = POPULAR_TOKENS[chain]?.base || [];
    const quoteTokens = POPULAR_TOKENS[chain]?.quote || [];

    const allTokens = [...baseTokens, ...quoteTokens];
    return allTokens.find(token =>
        token.symbol.toLowerCase() === symbol.toLowerCase()
    ) || null;
}

/**
 * Check if a token is in the popular list for a chain
 */
export function isPopularToken(
    chain: SupportedChainsType,
    address: string
): boolean {
    const baseTokens = POPULAR_TOKENS[chain]?.base || [];
    const quoteTokens = POPULAR_TOKENS[chain]?.quote || [];

    const allTokens = [...baseTokens, ...quoteTokens];
    return allTokens.some(token =>
        token.address.toLowerCase() === address.toLowerCase()
    );
}

/**
 * Get all unique popular tokens for a chain (deduplicated)
 */
export function getAllPopularTokens(chain: SupportedChainsType): PopularToken[] {
    const baseTokens = POPULAR_TOKENS[chain]?.base || [];
    const quoteTokens = POPULAR_TOKENS[chain]?.quote || [];

    const allTokens = [...baseTokens, ...quoteTokens];

    // Deduplicate by address (case-insensitive)
    const uniqueTokens = allTokens.filter((token, index, array) =>
        array.findIndex(t => t.address.toLowerCase() === token.address.toLowerCase()) === index
    );

    return uniqueTokens;
}