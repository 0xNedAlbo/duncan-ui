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

// Popular tokens configuration per chain with actual CoinGecko logos
const BASE_POPULAR_TOKENS = {
    ethereum: {
        base: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "WBTC",
                address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                name: "Wrapped BTC",
                logoUrl: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1696507857"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC",
                logoUrl: "https://coin-images.coingecko.com/coins/images/40143/small/cbbtc.webp?1726136727"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "USDC",
                address: "0xA0b86a33E74113e56D24A2Ecc6024C435378FFD3",
                name: "USD Coin",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            },
            {
                symbol: "USDT",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                name: "Tether USD",
                logoUrl: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png?1696501661"
            }
        ]
    },
    arbitrum: {
        base: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "WBTC",
                address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
                name: "Wrapped BTC",
                logoUrl: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1696507857"
            },
            {
                symbol: "ARB",
                address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
                name: "Arbitrum",
                logoUrl: "https://coin-images.coingecko.com/coins/images/16547/small/arb.jpg?1721358242"
            },
            {
                symbol: "GMX",
                address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
                name: "GMX",
                logoUrl: "https://coin-images.coingecko.com/coins/images/18323/small/arbit.png?1696517814"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "USDC",
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                name: "USD Coin",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            },
            {
                symbol: "USDC.e",
                address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                name: "USD Coin (Arb1)",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            }
        ]
    },
    base: {
        base: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC",
                logoUrl: "https://coin-images.coingecko.com/coins/images/40143/small/cbbtc.webp?1726136727"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "USDC",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                name: "USD Coin",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            }
        ]
    }
};

// Add development-only chains conditionally
const DEV_POPULAR_TOKENS = process.env.NODE_ENV === "development" ? {
    // Local testnet uses same token addresses as Arbitrum (since it's an Arbitrum fork)
    "arbitrum-fork-local": {
        base: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "WBTC",
                address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
                name: "Wrapped BTC",
                logoUrl: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png?1696507857"
            },
            {
                symbol: "ARB",
                address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
                name: "Arbitrum",
                logoUrl: "https://coin-images.coingecko.com/coins/images/16547/small/arb.jpg?1721358242"
            },
            {
                symbol: "GMX",
                address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
                name: "GMX",
                logoUrl: "https://coin-images.coingecko.com/coins/images/18323/small/arbit.png?1696517814"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332"
            },
            {
                symbol: "USDC",
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                name: "USD Coin",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            },
            {
                symbol: "USDC.e",
                address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                name: "USD Coin (Arb1)",
                logoUrl: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png?1696506694"
            }
        ]
    }
} : {};

// Export the combined configuration
export const POPULAR_TOKENS: Record<SupportedChainsType, PopularTokensByChain> = {
    ...BASE_POPULAR_TOKENS,
    ...DEV_POPULAR_TOKENS
} as Record<SupportedChainsType, PopularTokensByChain>;

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