import { EvmAddress } from "./evmAddress";

type TokenListItem = {
    address: EvmAddress;
    symbol: string;
    name: string;
    decimals: number;
};

type TokenListByChain = {
    [chainId: number]: TokenListItem[];
};
export const tokenList: TokenListByChain = {
    // Ethereum
    1: [
        {
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
        },
        {
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            symbol: "USDT",
            name: "Tether USD",
            decimals: 6,
        },
        {
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        {
            address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
            symbol: "WBTC",
            name: "Wrapped BTC",
            decimals: 8,
        },
        {
            address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
            symbol: "cbBTC",
            name: "Coinbase Wrapped BTC",
            decimals: 8,
        },
    ],
    // Arbitrum
    42161: [
        {
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
        },
        {
            address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            symbol: "USDT",
            name: "Tether USD",
            decimals: 6,
        },
        {
            address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            symbol: "USDC.e",
            name: "Bridged USDC",
            decimals: 6,
        },
        {
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        {
            address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
            symbol: "WBTC",
            name: "Wrapped BTC",
            decimals: 8,
        },
        {
            address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
            symbol: "ARB",
            name: "Arbitrum",
            decimals: 18,
        },
    ],
    // Base
    8453: [
        {
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
        },
        {
            address: "0x4200000000000000000000000000000000000006",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
        },
        {
            address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
            symbol: "cbBTC",
            name: "Coinbase Wrapped BTC",
            decimals: 8,
        },
    ],
};

export const quoteTokenSymbols = ["USDC", "USDT", "USDC.e"];
