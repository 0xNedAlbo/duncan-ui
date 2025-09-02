import { Erc20Token } from "./erc20Token";
import { EvmAddress, sameAddress } from "./evmAddress";
import { EvmBlockchain } from "./evmBlockchain";

export const erc20DefaultTokenLists: Erc20Token[] = [
    // Ethereum
    {
        chainId: 1,
        address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
    },
    {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },
    {
        chainId: 1,
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
    },
    {
        chainId: 1,
        address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        symbol: "WBTC",
        name: "Wrapped BTC",
        decimals: 8,
    },
    {
        chainId: 1,
        address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        symbol: "cbBTC",
        name: "Coinbase Wrapped BTC",
        decimals: 8,
    },
    // Arbitrum
    {
        chainId: 42161,

        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
    },
    {
        chainId: 42161,
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },

    {
        chainId: 42161,
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
    },
    {
        chainId: 42161,
        address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
        symbol: "USDC.e",
        name: "Bridged USDC",
        decimals: 6,
    },
    {
        chainId: 42161,
        address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
        symbol: "WBTC",
        name: "Wrapped BTC",
        decimals: 8,
    },
    {
        chainId: 42161,
        address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        symbol: "ARB",
        name: "Arbitrum",
        decimals: 18,
    },

    // Base
    {
        chainId: 8453,
        address: "0x4200000000000000000000000000000000000006",
        symbol: "WETH",
        name: "Wrapped Ether",
        decimals: 18,
    },
    {
        chainId: 8453,
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
    },
    {
        chainId: 8453,
        address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
        symbol: "cbBTC",
        name: "Coinbase Wrapped BTC",
        decimals: 8,
    },
];

export const defaultTokensByChain = (chainId: number) =>
    erc20DefaultTokenLists.filter((token) => token.chainId == chainId);

export const findTokenInList = (tokenList: Erc20Token[], address: EvmAddress) =>
    tokenList.filter((token) => token.address == address)[0];

export const quoteTokensForChain = (chainId: number) =>
    defaultTokensByChain(chainId).filter((token) =>
        quoteTokenSymbols.find((symbol) => symbol === token.symbol)
    );

export const baseTokensForChain = (chainId: number) =>
    defaultTokensByChain(chainId).filter(
        (token) => !quoteTokenSymbols.find((symbol) => symbol === token.symbol)
    );

export const quoteTokenSymbols = ["USDC", "USDT", "USDC.e"];

// Custom token lists stored in localStorage

const CUSTOM_TOKEN_LIST_STORAGE_KEY = "customErc20Tokens:v1";

// -- Internal helpers ---------------------------------------------------------

function hasLocalStorage(): boolean {
    try {
        if (typeof window === "undefined" || !window.localStorage) return false;
        const k = "__ls_test__";
        window.localStorage.setItem(k, "1");
        window.localStorage.removeItem(k);
        return true;
    } catch {
        return false;
    }
}

let memoryFallback: Erc20Token[] = [];

function readCustomList(): Erc20Token[] {
    if (!hasLocalStorage()) return memoryFallback;
    const raw = window.localStorage.getItem(CUSTOM_TOKEN_LIST_STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as Erc20Token[];
        // Basic shape guard
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        // Corrupt storage -> reset
        return [];
    }
}

function writeCustomList(list: Erc20Token[]): void {
    if (!hasLocalStorage()) {
        memoryFallback = list;
        return;
    }
    try {
        window.localStorage.setItem(
            CUSTOM_TOKEN_LIST_STORAGE_KEY,
            JSON.stringify(list)
        );
    } catch (e) {
        throw new Error(
            `Failed to persist custom token list: ${(e as Error).message}`
        );
    }
}

// -- Public API ---------------------------------------------------------------

/**
 * Adds or updates a token in the custom list (per chainId + address).
 * Returns the updated list.
 */
export function saveTokenToCustomList(token: Erc20Token): Erc20Token[] {
    const list = readCustomList();
    const idx = list.findIndex(
        (t) =>
            t.chainId === token.chainId && sameAddress(t.address, token.address)
    );

    if (idx >= 0) {
        // Update existing
        const next = [...list];
        next[idx] = token;
        writeCustomList(next);
        return next;
    } else {
        const next = [...list, token];
        writeCustomList(next);
        return next;
    }
}

/**
 * Loads a token from the custom list by (chainId, address).
 * Returns the token or undefined if not found.
 */
export function loadTokenFromCustomList(
    chainId: number,
    address: EvmAddress
): Erc20Token | undefined {
    const list = readCustomList();
    return list.find(
        (t) => t.chainId === chainId && sameAddress(t.address, address)
    );
}

/**
 * Removes a token from the custom list by (chainId, address).
 * Returns the updated list.
 */
export function removeTokenFromCustomList(
    chainId: number,
    address: EvmAddress
): Erc20Token[] {
    const list = readCustomList();
    const next = list.filter(
        (t) => !(t.chainId === chainId && sameAddress(t.address, address))
    );
    if (next.length !== list.length) {
        writeCustomList(next);
    }
    return next;
}
