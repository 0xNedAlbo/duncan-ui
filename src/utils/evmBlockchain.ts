import { Erc20Token } from "./erc20Token";
import { EvmAddress } from "./evmAddress";

export type EvmBlockchain = {
    id: number;
    nativeCurrency: string;
    nativeCurrencyDecimals: number;
    wrappedNativeCurrency: EvmAddress;
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
        wrappedNativeCurrency: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        name: "Ethereum",
        slug: "mainnet",
        explorerUrl: "https://etherscan.io",
    },
    {
        id: 42161,
        nativeCurrency: "ETH",
        nativeCurrencyDecimals: 18,
        wrappedNativeCurrency: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        name: "Arbitrum",
        slug: "arbitrum",
        explorerUrl: "https://arbiscan.io",
    },
    {
        id: 8453,
        nativeCurrency: "ETH",
        nativeCurrencyDecimals: 18,
        wrappedNativeCurrency: "0x4200000000000000000000000000000000000006",
        name: "Base",
        slug: "base",
        explorerUrl: "https://basescan.org",
    },
];

export function wrappedEthForChain(chainId: number): EvmAddress {
    const chain = evmChainlist.find((chain) => chain.id === chainId);
    if (!chain) throw new Error("nativeCurrencyForChain(): chain not found");
    const wETH = chain.wrappedNativeCurrency;
    if (!wETH)
        throw new Error(
            "wrappedEthForChain(): no wrapped native currency address for chain " +
                chainId
        );
    return wETH as EvmAddress;
}
