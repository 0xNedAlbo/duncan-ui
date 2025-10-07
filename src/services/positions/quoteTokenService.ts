// Quote Token Bestimmung für Position PnL Berechnung

import { isWrappedNativeToken } from "@/config/chains";

const STABLE_COINS = ["USDC", "USDT", "DAI", "FRAX", "BUSD", "LUSD"];

export interface QuoteTokenResult {
    token0IsQuote: boolean;
    quoteSymbol: string;
    baseSymbol: string;
}

export class QuoteTokenService {
    /**
     * Bestimmt welcher Token der Quote Asset ist basierend auf Midcurve Philosophie:
     * 1. Stablecoins haben höchste Priorität als Quote
     * 2. Wrapped Native Token der Chain (WETH) als Quote
     * 3. Fallback: Token0 als Quote (Uniswap Convention)
     */
    determineQuoteToken(
        token0Symbol: string,
        token0Address: string,
        token1Symbol: string,
        token1Address: string,
        chain: string
    ): QuoteTokenResult {
        // Priorität 1: Stablecoins sind immer Quote
        if (STABLE_COINS.includes(token0Symbol.toUpperCase())) {
            return {
                token0IsQuote: true,
                quoteSymbol: token0Symbol,
                baseSymbol: token1Symbol,
            };
        }

        if (STABLE_COINS.includes(token1Symbol.toUpperCase())) {
            return {
                token0IsQuote: false,
                quoteSymbol: token1Symbol,
                baseSymbol: token0Symbol,
            };
        }

        // Priorität 2: Wrapped Native Token der Chain als Quote
        if (isWrappedNativeToken(token0Address, chain)) {
            return {
                token0IsQuote: true,
                quoteSymbol: token0Symbol,
                baseSymbol: token1Symbol,
            };
        }

        if (isWrappedNativeToken(token1Address, chain)) {
            return {
                token0IsQuote: false,
                quoteSymbol: token1Symbol,
                baseSymbol: token0Symbol,
            };
        }

        // Fallback: Token0 als Quote (Uniswap Convention)
        return {
            token0IsQuote: true,
            quoteSymbol: token0Symbol,
            baseSymbol: token1Symbol,
        };
    }

    /**
     * Formatiert Token Pair im Base/Quote Format
     * Beispiel: WETH/USDC → "WETH/USDC" (WETH=Base, USDC=Quote)
     */
    formatTokenPair(
        token0Symbol: string,
        token1Symbol: string,
        token0IsQuote: boolean
    ): string {
        if (token0IsQuote) {
            // Token0 ist Quote → Token1/Token0
            return `${token1Symbol}/${token0Symbol}`;
        } else {
            // Token1 ist Quote → Token0/Token1
            return `${token0Symbol}/${token1Symbol}`;
        }
    }
}

/**
 * Beispiele für Quote Token Bestimmung
 */
export const QUOTE_TOKEN_EXAMPLES = [
    // Stablecoins als Quote (höchste Priorität)
    {
        token0: {
            symbol: "WETH",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        },
        token1: {
            symbol: "USDC",
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        chain: "ethereum",
        expected: { token0IsQuote: false, quote: "USDC", base: "WETH" },
    },
    {
        token0: {
            symbol: "USDC",
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        token1: {
            symbol: "LINK",
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        },
        chain: "ethereum",
        expected: { token0IsQuote: true, quote: "USDC", base: "LINK" },
    },

    // Wrapped Native Token als Quote (zweite Priorität)
    {
        token0: {
            symbol: "LINK",
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        },
        token1: {
            symbol: "WETH",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        },
        chain: "ethereum",
        expected: { token0IsQuote: false, quote: "WETH", base: "LINK" },
    },
    {
        token0: {
            symbol: "WETH",
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
        },
        token1: {
            symbol: "ARB",
            address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        },
        chain: "arbitrum",
        expected: { token0IsQuote: true, quote: "WETH", base: "ARB" },
    },

    // Fallback zu Token0 (wenn weder Stablecoin noch WETH)
    {
        token0: {
            symbol: "UNI",
            address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        },
        token1: {
            symbol: "LINK",
            address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        },
        chain: "ethereum",
        expected: { token0IsQuote: true, quote: "UNI", base: "LINK" },
    },
];
