// Blockchain Configuration mit Wrapped Native Token Adressen

export interface ChainConfig {
    chainId: number;
    name: string;
    shortName: string;
    slug: string;
    wrappedNativeToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    explorer: string;
}

// Wrapped Native Token Adressen für unterstützte Chains
export const CHAIN_CONFIG: Record<string, ChainConfig> = {
    ethereum: {
        chainId: 1,
        name: "Ethereum Mainnet",
        shortName: "Ethereum",
        slug: "ethereum",
        wrappedNativeToken: {
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://etherscan.io",
    },
    arbitrum: {
        chainId: 42161,
        name: "Arbitrum One",
        shortName: "Arbitrum",
        slug: "arbitrum",
        wrappedNativeToken: {
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://arbiscan.io",
    },
    base: {
        chainId: 8453,
        name: "Base",
        shortName: "Base",
        slug: "base",
        wrappedNativeToken: {
            address: "0x4200000000000000000000000000000000000006",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://basescan.org",
    },
};

// Helper Functions
export function getChainConfig(chain: string): ChainConfig | null {
    return CHAIN_CONFIG[chain.toLowerCase()] || null;
}

export function getWrappedNativeTokenAddress(chain: string): string | null {
    const config = getChainConfig(chain);
    return config?.wrappedNativeToken.address || null;
}

export function getWrappedNativeTokenSymbol(chain: string): string | null {
    const config = getChainConfig(chain);
    return config?.wrappedNativeToken.symbol || null;
}

export function isWrappedNativeToken(address: string, chain: string): boolean {
    const wrappedAddress = getWrappedNativeTokenAddress(chain);
    return wrappedAddress
        ? address.toLowerCase() === wrappedAddress.toLowerCase()
        : false;
}

// Unterstützte Chains
export const SUPPORTED_CHAINS = Object.keys(CHAIN_CONFIG);

export type SupportedChainsType = "ethereum" | "arbitrum" | "base";

// Chain ID Mapping
export const CHAIN_ID_TO_NAME: Record<number, string> = {
    1: "ethereum",
    42161: "arbitrum",
    8453: "base",
};

export function getChainFromId(chainId: number): string | null {
    return CHAIN_ID_TO_NAME[chainId] || null;
}

// Helper function to validate chain slug
export function isValidChainSlug(slug: string): boolean {
    return SUPPORTED_CHAINS.includes(slug.toLowerCase());
}

// Get chain config by slug
export function getChainConfigBySlug(slug: string): ChainConfig | null {
    return getChainConfig(slug);
}
