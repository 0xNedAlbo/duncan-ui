#!/usr/bin/env node

/**
 * Fetch CoinGecko logos for popular tokens
 *
 * This script fetches the actual logo URLs from CoinGecko API
 * for all hardcoded popular tokens and outputs the updated configuration.
 */

// Token ID mappings to CoinGecko IDs
const TOKEN_TO_COINGECKO_ID: Record<string, string> = {
  // Ethereum
  'WETH': 'weth',
  'WBTC': 'wrapped-bitcoin',
  'cbBTC': 'coinbase-wrapped-btc',
  'USDC': 'usd-coin',
  'USDT': 'tether',

  // Arbitrum
  'ARB': 'arbitrum',
  'GMX': 'gmx',

  // Base - same tokens as above
};

interface CoinGeckoResponse {
  id: string;
  symbol: string;
  name: string;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
}

async function fetchCoinGeckoLogo(coinId: string): Promise<{ logoUrl: string; symbol: string; name: string } | null> {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);

    if (!response.ok) {
      console.error(`Failed to fetch ${coinId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: CoinGeckoResponse = await response.json();

    return {
      logoUrl: data.image.small,
      symbol: data.symbol.toUpperCase(),
      name: data.name
    };
  } catch (error) {
    console.error(`Error fetching ${coinId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🔍 Fetching CoinGecko logos for popular tokens...\n');

  const results: Record<string, { logoUrl: string; symbol: string; name: string }> = {};

  // Fetch all unique coin IDs
  const uniqueCoinIds = [...new Set(Object.values(TOKEN_TO_COINGECKO_ID))];

  for (const coinId of uniqueCoinIds) {
    console.log(`Fetching ${coinId}...`);
    const result = await fetchCoinGeckoLogo(coinId);

    if (result) {
      // Map back to token symbols
      const tokenSymbols = Object.keys(TOKEN_TO_COINGECKO_ID).filter(
        symbol => TOKEN_TO_COINGECKO_ID[symbol] === coinId
      );

      for (const symbol of tokenSymbols) {
        results[symbol] = result;
      }

      console.log(`✅ ${result.symbol}: ${result.logoUrl}`);
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📋 Results:');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n🔧 Updated popularTokens.ts configuration:');

  // Generate the updated configuration
  const updatedConfig = `
// Updated popular tokens with CoinGecko logos
export const POPULAR_TOKENS: Record<SupportedChainsType, PopularTokensByChain> = {
    ethereum: {
        base: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "WBTC",
                address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                name: "Wrapped BTC",
                logoUrl: "${results.WBTC?.logoUrl || ''}"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC",
                logoUrl: "${results.cbBTC?.logoUrl || ''}"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "USDC",
                address: "0xA0b86a33E74113e56D24A2Ecc6024C435378FFD3",
                name: "USD Coin",
                logoUrl: "${results.USDC?.logoUrl || ''}"
            },
            {
                symbol: "USDT",
                address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                name: "Tether USD",
                logoUrl: "${results.USDT?.logoUrl || ''}"
            }
        ]
    },
    arbitrum: {
        base: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "WBTC",
                address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
                name: "Wrapped BTC",
                logoUrl: "${results.WBTC?.logoUrl || ''}"
            },
            {
                symbol: "ARB",
                address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
                name: "Arbitrum",
                logoUrl: "${results.ARB?.logoUrl || ''}"
            },
            {
                symbol: "GMX",
                address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
                name: "GMX",
                logoUrl: "${results.GMX?.logoUrl || ''}"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBAb1",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "USDC",
                address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                name: "USD Coin",
                logoUrl: "${results.USDC?.logoUrl || ''}"
            },
            {
                symbol: "USDC.e",
                address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
                name: "USD Coin (Arb1)",
                logoUrl: "${results.USDC?.logoUrl || ''}"
            }
        ]
    },
    base: {
        base: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "cbBTC",
                address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
                name: "Coinbase Wrapped BTC",
                logoUrl: "${results.cbBTC?.logoUrl || ''}"
            }
        ],
        quote: [
            {
                symbol: "WETH",
                address: "0x4200000000000000000000000000000000000006",
                name: "Wrapped Ether",
                logoUrl: "${results.WETH?.logoUrl || ''}"
            },
            {
                symbol: "USDC",
                address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                name: "USD Coin",
                logoUrl: "${results.USDC?.logoUrl || ''}"
            }
        ]
    }
};`;

  console.log(updatedConfig);
}

main().catch(console.error);