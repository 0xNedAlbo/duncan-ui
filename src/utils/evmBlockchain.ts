import { NativeCurrency } from "@uniswap/sdk-core";

export type EvmBlockchain = {
    id: number;
    nativeCurrency: string;
    nativeCurrencyDecimals: number;
    name: string;
    slug: string;
    explorerUrl: string;
};

export type EvmBlockchainList = EvmBlockchain[];

export const evmChainlist: EvmBlockchain[] = [
    {
        id: 1,
        nativeCurrency: "ETH",
        nativeCurrencyDecimals: 18,
        name: "Ethereum",
        slug: "mainnet",
        explorerUrl: "https://etherscan.io",
    },
    {
        id: 42161,
        nativeCurrency: "ETH",
        nativeCurrencyDecimals: 18,
        name: "Arbitrum",
        slug: "arbitrum",
        explorerUrl: "https://arbiscan.io",
    },
    {
        id: 8453,
        nativeCurrency: "ETH",
        nativeCurrencyDecimals: 18,
        name: "Base",
        slug: "base",
        explorerUrl: "https://basescan.org",
    },
];
