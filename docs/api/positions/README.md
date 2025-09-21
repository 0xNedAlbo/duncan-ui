# Positions API

## Overview

The Positions API provides comprehensive management and analysis capabilities for Uniswap V3 liquidity positions. This includes importing NFT positions, calculating PnL and APR, generating visualization data, and tracking position events.

## Core Concepts

### Position Identification
Positions are uniquely identified by a composite key:
```typescript
interface PositionId {
  userId: string;      // User who owns the position
  chain: string;       // Blockchain network (ethereum, arbitrum, base)
  protocol: string;    // Always "uniswapv3"
  nftId: string;      // NFT token ID as string
}
```

### Position Lifecycle
1. **Import** - Add existing NFT position to portfolio
2. **Track** - Monitor value, PnL, and events
3. **Analyze** - Generate curves, calculate APR
4. **Manage** - Update status, refresh data

### Data Precision
All financial values use BigInt precision:
- **Token amounts**: Stored in smallest unit (wei, 1e6 for USDC)
- **Prices**: X96 format for pool prices, scaled for display
- **Liquidity**: Raw V3 liquidity values
- **Values**: Calculated in quote token smallest unit

### Quote Token Concept
Each position has a designated "quote token" for value calculations:
- **Purpose**: Consistent value measurement and PnL calculation
- **Selection**: Usually the more stable token (USDC over ETH)
- **Field**: `token0IsQuote` boolean indicates which token serves as quote
- **Impact**: All PnL and value calculations are in quote token terms

## Position States

### Status Values
- **active** - Position has liquidity and is earning fees
- **closed** - Position has been closed (liquidity = 0)
- **archived** - User-archived for organization

### Validation Rules
- NFT ID must be positive integer
- Chain must be supported
- Position must exist on blockchain
- User must own the position

## API Endpoints

### Core Operations
- **[List Positions](./list.md)** - `GET /api/positions/uniswapv3/list`
- **[Import NFT](./import.md)** - `POST /api/positions/uniswapv3/import-nft`

### Position Details
- **[Basic Details](./details/basic.md)** - `GET /api/positions/uniswapv3/[chain]/[nft]`
- **[PnL Analysis](./details/pnl.md)** - `GET /api/positions/uniswapv3/[chain]/[nft]/pnl`
- **[Position Events](./details/events.md)** - `GET /api/positions/uniswapv3/[chain]/[nft]/events`
- **[Curve Data](./details/curve.md)** - `GET /api/positions/uniswapv3/[chain]/[nft]/curve`
- **[APR Analysis](./details/apr.md)** - `GET /api/positions/uniswapv3/[chain]/[nft]/apr`
- **[Refresh Data](./details/refresh.md)** - `POST /api/positions/uniswapv3/[chain]/[nft]/refresh`

## Common Response Patterns

### Basic Position Object
```typescript
interface BasicPosition {
  // Identity
  userId: string;
  chain: 'ethereum' | 'arbitrum' | 'base';
  protocol: 'uniswapv3';
  nftId: string;

  // Position data
  liquidity: string;           // BigInt as string
  tickLower: number;
  tickUpper: number;
  status: 'active' | 'closed' | 'archived';
  token0IsQuote: boolean;

  // Pool information
  pool: {
    poolAddress: string;
    chain: string;
    fee: number;                // Fee tier (500, 3000, 10000)
    tick: number;               // Current pool tick
    sqrtPriceX96: string;       // Current pool price

    token0: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };

    token1: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
  };

  // Metadata
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}
```

### PnL Breakdown Object
```typescript
interface PnlBreakdown {
  // Core values (all in quote token, BigInt strings)
  initialValue: string;        // Value when position created
  currentValue: string;        // Current position value
  totalPnL: string;           // Overall profit/loss

  // PnL components
  unrealizedPnL: string;      // Current position vs initial
  realizedPnL: string;        // Collected fees value

  // Fee breakdown
  feesCollected0: string;     // Token0 fees collected
  feesCollected1: string;     // Token1 fees collected
  feeValueInQuote: string;    // Total fee value in quote token

  // Unclaimed fees
  unclaimedFees0: string;     // Token0 unclaimed
  unclaimedFees1: string;     // Token1 unclaimed
  unclaimedValueInQuote: string; // Unclaimed value in quote token

  // Metadata
  calculatedAt: string;       // ISO timestamp
  quoteToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
}
```

## Error Handling

### Common Error Patterns
```typescript
// Position not found
{
  "success": false,
  "error": "Position not found",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "protocol": "uniswapv3",
    "nftId": "123456"
  }
}

// Invalid parameters
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}

// Service unavailable
{
  "success": false,
  "error": "Pool data temporarily unavailable",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "protocol": "uniswapv3",
    "nftId": "123456"
  }
}
```

### Status Code Mapping
- **400** - Invalid request parameters (chain, nftId format)
- **401** - Authentication required
- **404** - Position not found or not owned by user
- **409** - Position already exists (import duplicate)
- **422** - Valid request but business logic prevents action
- **503** - External service (blockchain, subgraph) unavailable

## BigInt Handling Examples

### Request with BigInt Values
```json
// Import position with specific parameters
{
  "chain": "ethereum",
  "nftId": "123456"
}
```

### Response with BigInt Values
```json
{
  "success": true,
  "data": {
    "liquidity": "12345678901234567890",
    "pool": {
      "sqrtPriceX96": "1845678900123456789012345678901234567890"
    }
  }
}
```

### JavaScript Conversion
```typescript
// Parse BigInt values from API response
const position = await response.json();
const liquidity = BigInt(position.data.liquidity);
const price = BigInt(position.data.pool.sqrtPriceX96);

// Convert for display (using utility function)
import { formatCompactValue } from '@/lib/utils/fraction-format';
const displayValue = formatCompactValue(liquidity, 18); // "12.35M ETH"
```

## Rate Limiting

Position endpoints have specific rate limits:
- **List positions**: 60 requests per minute
- **Import NFT**: 10 requests per minute (resource intensive)
- **Position details**: 120 requests per minute
- **Refresh operations**: 20 requests per minute

## Caching Strategy

The API implements intelligent caching:
- **Position data**: 1 minute cache for basic info
- **PnL calculations**: 30 seconds cache (frequent price changes)
- **Curve data**: 5 minutes cache (computationally expensive)
- **Events**: 2 minutes cache (relatively static)

Cache headers are included in responses:
```
Cache-Control: public, max-age=60
ETag: "abc123def456"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

## Usage Patterns

### Portfolio Management
```typescript
// Get all positions
const positions = await fetch('/api/positions/uniswapv3/list');

// Import new position
const newPosition = await fetch('/api/positions/uniswapv3/import-nft', {
  method: 'POST',
  body: JSON.stringify({ chain: 'ethereum', nftId: '123456' })
});

// Get detailed analysis
const pnl = await fetch('/api/positions/uniswapv3/ethereum/123456/pnl');
const events = await fetch('/api/positions/uniswapv3/ethereum/123456/events');
```

### Real-time Updates
```typescript
// Refresh position data from blockchain
const refreshed = await fetch('/api/positions/uniswapv3/ethereum/123456/refresh', {
  method: 'POST'
});

// Poll for updates
setInterval(async () => {
  const pnl = await fetch('/api/positions/uniswapv3/ethereum/123456/pnl');
  updateUI(await pnl.json());
}, 30000); // Every 30 seconds
```

## Integration Examples

### React Hook
```typescript
import { useQuery } from '@tanstack/react-query';

function usePosition(chain: string, nftId: string) {
  return useQuery({
    queryKey: ['position', chain, nftId],
    queryFn: async () => {
      const response = await fetch(`/api/positions/uniswapv3/${chain}/${nftId}`);
      if (!response.ok) throw new Error('Failed to fetch position');
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### Error Handling
```typescript
async function handlePositionFetch(chain: string, nftId: string) {
  try {
    const response = await fetch(`/api/positions/uniswapv3/${chain}/${nftId}`);
    const data = await response.json();

    if (!data.success) {
      switch (response.status) {
        case 404:
          throw new Error('Position not found in your portfolio');
        case 503:
          throw new Error('Blockchain data temporarily unavailable');
        default:
          throw new Error(data.error || 'Unknown error');
      }
    }

    return data.data;
  } catch (error) {
    console.error('Position fetch failed:', error);
    throw error;
  }
}
```