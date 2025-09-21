// Blockchain Configuration mit Wrapped Native Token Adressen

import { mainnet, arbitrum, base, type Chain } from "viem/chains";
import { normalizeAddress } from "@/lib/utils/evm";

export type FinalityConfig =
    | { type: "blockTag" }
    | { type: "blockHeight"; minBlockHeight: number };

export interface ChainConfig {
    chainId: number;
    name: string;
    shortName: string;
    slug: string;
    rpcUrl?: string;
    viemChain: Chain;
    wrappedNativeToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    explorer: string;
    finality: FinalityConfig;
}

// Wrapped Native Token Adressen für unterstützte Chains
const CHAIN_CONFIG: Record<string, ChainConfig> = {
    ethereum: {
        chainId: 1,
        name: "Ethereum Mainnet",
        shortName: "Ethereum",
        slug: "ethereum",
        viemChain: mainnet,
        wrappedNativeToken: {
            address: normalizeAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://etherscan.io",
        finality: { type: "blockTag" },
    },
    arbitrum: {
        chainId: 42161,
        name: "Arbitrum One",
        shortName: "Arbitrum",
        slug: "arbitrum",
        viemChain: arbitrum,
        wrappedNativeToken: {
            address: normalizeAddress("0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1"),
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://arbiscan.io",
        finality: { type: "blockTag" },
    },
    base: {
        chainId: 8453,
        name: "Base",
        shortName: "Base",
        slug: "base",
        viemChain: base,
        wrappedNativeToken: {
            address: normalizeAddress("0x4200000000000000000000000000000000000006"),
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        explorer: "https://basescan.org",
        finality: { type: "blockTag" },
    },
};

let isInitialized = false;

// Helper Functions
export function getChainConfig(chain: string): ChainConfig {
    if (!isInitialized) {
        Object.keys(CHAIN_CONFIG).forEach((chainName) => {
            switch (chainName) {
                case "ethereum":
                    CHAIN_CONFIG[chainName].rpcUrl =
                        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
                    break;
                case "arbitrum":
                    CHAIN_CONFIG[chainName].rpcUrl =
                        process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL;
                    break;
                case "base":
                    CHAIN_CONFIG[chainName].rpcUrl =
                        process.env.NEXT_PUBLIC_BASE_RPC_URL;
                    break;
                default:
                    throw new Error("Unknown chain name: " + chainName);
            }
            if (!CHAIN_CONFIG[chainName])
                throw new Error(
                    `Missing NEXT_PUBLIC_[chainName]_RPC_URL for chain: ${chainName}`
                );
            isInitialized = true;
        });
    }
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

/**
 * Get chain ID for a supported chain
 */
export function getChainId(chain: SupportedChainsType): number {
    const config = CHAIN_CONFIG[chain];
    if (!config) {
        throw new Error(`Unsupported chain: ${chain}`);
    }
    return config.chainId;
}

/**
 * Get supported chains
 */
export function getSupportedChains(): SupportedChainsType[] {
    return Object.keys(CHAIN_CONFIG) as SupportedChainsType[];
}

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

/**
 * Get finality configuration for a chain
 */
export function getFinalityConfig(chain: SupportedChainsType): FinalityConfig {
    const config = getChainConfig(chain);
    if (!config) {
        throw new Error(`Unsupported chain: ${chain}`);
    }
    return config.finality;
}
