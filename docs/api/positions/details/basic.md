# Get Position Details

Retrieve basic information for a specific Uniswap V3 position.

## Endpoint

```
GET /api/positions/uniswapv3/[chain]/[nft]
```

## Authentication

Requires authentication via session or API key.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| chain | string | Yes | Blockchain network |
| nft | string | Yes | NFT token ID |

### Parameter Details

#### chain
- **Values**: `ethereum`, `arbitrum`, `base`
- **Validation**: Must be supported chain
- **Example**: `ethereum`

#### nft
- **Format**: Positive integer as string
- **Pattern**: Must match `^\d+$` regex
- **Example**: `123456`

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "chain": "ethereum",
    "protocol": "uniswapv3",
    "nftId": "123456",
    "liquidity": "12345678901234567890",
    "tickLower": -276320,
    "tickUpper": -276310,
    "status": "active",
    "token0IsQuote": false,
    "pool": {
      "poolAddress": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
      "chain": "ethereum",
      "fee": 500,
      "tick": -276315,
      "sqrtPriceX96": "1845678900123456789012345678901234567890",
      "token0": {
        "address": "0xa0b86a33e6c6b5e6bf0b7c34c8a37c8c6b5e6bf0",
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": 6
      },
      "token1": {
        "address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "symbol": "WETH",
        "name": "Wrapped Ether",
        "decimals": 18
      }
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  },
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "ethereum",
    "protocol": "uniswapv3",
    "nftId": "123456"
  }
}
```

### Response Fields

#### Position Data
| Field | Type | Description |
|-------|------|-------------|
| userId | string | User who owns the position |
| chain | string | Blockchain network |
| protocol | string | Always "uniswapv3" |
| nftId | string | NFT token ID |
| liquidity | string | Current liquidity amount (BigInt) |
| tickLower | number | Lower price tick of the range |
| tickUpper | number | Upper price tick of the range |
| status | string | Position status (active, closed, archived) |
| token0IsQuote | boolean | Whether token0 is the quote token |

#### Pool Information
| Field | Type | Description |
|-------|------|-------------|
| poolAddress | string | Uniswap V3 pool contract address |
| chain | string | Blockchain network |
| fee | number | Pool fee tier (500, 3000, 10000) |
| tick | number | Current pool tick |
| sqrtPriceX96 | string | Current pool price in X96 format (BigInt) |

#### Token Details
Each token (token0, token1) includes:
| Field | Type | Description |
|-------|------|-------------|
| address | string | Token contract address |
| symbol | string | Token symbol (e.g., "USDC", "WETH") |
| name | string | Full token name |
| decimals | number | Token decimal places |

### Price Range Calculation
```typescript
// Convert ticks to human-readable price range
const price0 = 1.0001 ** tickLower;
const price1 = 1.0001 ** tickUpper;

// Price range in terms of token1/token0
console.log(`Price range: ${price0.toFixed(4)} - ${price1.toFixed(4)}`);
```

### Current Price Calculation
```typescript
// Convert sqrtPriceX96 to human-readable price
const sqrtPrice = BigInt(sqrtPriceX96);
const price = Number(sqrtPrice) ** 2 / (2 ** 192);

// Adjust for token decimals
const token0Decimals = pool.token0.decimals;
const token1Decimals = pool.token1.decimals;
const adjustedPrice = price * (10 ** (token0Decimals - token1Decimals));

console.log(`Current price: ${adjustedPrice.toFixed(6)} ${pool.token1.symbol}/${pool.token0.symbol}`);
```

## Error Responses

### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "error": "Chain and NFT ID are required",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

### 400 Bad Request - Invalid Chain
```json
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

### 400 Bad Request - Invalid NFT ID
```json
{
  "success": false,
  "error": "Invalid NFT ID format. Must be a positive integer.",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized - Please sign in",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Position not found",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

## Usage Examples

### Basic Request
```bash
curl -X GET "/api/positions/uniswapv3/ethereum/123456" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

### Multiple Chains
```bash
# Ethereum position
curl -X GET "/api/positions/uniswapv3/ethereum/123456" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"

# Arbitrum position
curl -X GET "/api/positions/uniswapv3/arbitrum/789012" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"

# Base position
curl -X GET "/api/positions/uniswapv3/base/345678" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

## JavaScript Examples

### Basic Fetch
```typescript
async function getPosition(chain: string, nftId: string) {
  const response = await fetch(`/api/positions/uniswapv3/${chain}/${nftId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}
```

### With Error Handling
```typescript
interface PositionError extends Error {
  status: number;
  code: string;
}

async function getPosition(chain: string, nftId: string) {
  try {
    const response = await fetch(`/api/positions/uniswapv3/${chain}/${nftId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success) {
      const error = new Error(data.error) as PositionError;
      error.status = response.status;

      switch (response.status) {
        case 400:
          error.code = 'INVALID_PARAMETERS';
          break;
        case 404:
          error.code = 'POSITION_NOT_FOUND';
          break;
        default:
          error.code = 'UNKNOWN_ERROR';
      }

      throw error;
    }

    return data.data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Unable to connect to API');
    }
    throw error;
  }
}

// Usage with error handling
try {
  const position = await getPosition('ethereum', '123456');
  console.log('Position details:', position);
} catch (error) {
  const positionError = error as PositionError;

  switch (positionError.code) {
    case 'POSITION_NOT_FOUND':
      console.error('Position not found in your portfolio');
      break;
    case 'INVALID_PARAMETERS':
      console.error('Invalid chain or NFT ID format');
      break;
    default:
      console.error('Failed to fetch position:', positionError.message);
  }
}
```

### React Query Integration
```typescript
import { useQuery } from '@tanstack/react-query';

function usePosition(chain: string, nftId: string) {
  return useQuery({
    queryKey: ['position', chain, nftId],
    queryFn: () => getPosition(chain, nftId),
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: Boolean(chain && nftId), // Only run if both params provided
  });
}

// Usage in component
function PositionDetails({ chain, nftId }: { chain: string; nftId: string }) {
  const { data: position, isLoading, error } = usePosition(chain, nftId);

  if (isLoading) return <div>Loading position...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!position) return <div>Position not found</div>;

  return (
    <div>
      <h2>{position.pool.token0.symbol}/{position.pool.token1.symbol}</h2>
      <p>Liquidity: {formatLiquidity(position.liquidity)}</p>
      <p>Fee Tier: {position.pool.fee / 10000}%</p>
      <p>Status: {position.status}</p>
    </div>
  );
}
```

### Utility Functions
```typescript
// Format liquidity for display
function formatLiquidity(liquidity: string): string {
  const liquidityBN = BigInt(liquidity);

  if (liquidityBN === 0n) return '0';

  // Convert to human readable format
  const liquidityNumber = Number(liquidityBN);

  if (liquidityNumber >= 1e9) {
    return `${(liquidityNumber / 1e9).toFixed(2)}B`;
  } else if (liquidityNumber >= 1e6) {
    return `${(liquidityNumber / 1e6).toFixed(2)}M`;
  } else if (liquidityNumber >= 1e3) {
    return `${(liquidityNumber / 1e3).toFixed(2)}K`;
  } else {
    return liquidityNumber.toFixed(0);
  }
}

// Calculate price range from ticks
function calculatePriceRange(tickLower: number, tickUpper: number, token0Decimals: number, token1Decimals: number) {
  const price0 = 1.0001 ** tickLower;
  const price1 = 1.0001 ** tickUpper;

  // Adjust for token decimals
  const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);

  return {
    lower: price0 * decimalAdjustment,
    upper: price1 * decimalAdjustment
  };
}

// Check if position is in range
function isPositionInRange(currentTick: number, tickLower: number, tickUpper: number): boolean {
  return currentTick >= tickLower && currentTick <= tickUpper;
}

// Usage
const position = await getPosition('ethereum', '123456');
const priceRange = calculatePriceRange(
  position.tickLower,
  position.tickUpper,
  position.pool.token0.decimals,
  position.pool.token1.decimals
);
const inRange = isPositionInRange(position.pool.tick, position.tickLower, position.tickUpper);

console.log(`Price range: ${priceRange.lower.toFixed(4)} - ${priceRange.upper.toFixed(4)}`);
console.log(`Position is ${inRange ? 'in range' : 'out of range'}`);
```

### Type Definitions
```typescript
interface BasicPosition {
  userId: string;
  chain: 'ethereum' | 'arbitrum' | 'base';
  protocol: 'uniswapv3';
  nftId: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  status: 'active' | 'closed' | 'archived';
  token0IsQuote: boolean;
  pool: {
    poolAddress: string;
    chain: string;
    fee: number;
    tick: number;
    sqrtPriceX96: string;
    token0: Token;
    token1: Token;
  };
  createdAt: string;
  updatedAt: string;
}

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface PositionResponse {
  success: boolean;
  data: BasicPosition;
  meta: {
    requestedAt: string;
    chain: string;
    protocol: string;
    nftId: string;
  };
}
```

## Rate Limiting

This endpoint has the following rate limits:
- **Per IP**: 120 requests per minute
- **Per API Key**: 200 requests per minute
- **Per Session**: 150 requests per minute

## Caching

Response caching:
- **Cache-Control**: `public, max-age=60`
- **ETag**: Included for conditional requests
- **Stale-while-revalidate**: 120 seconds

Position data is cached for 1 minute as it changes relatively infrequently.

## Performance Notes

- **Response time**: Typically 50-200ms (database query)
- **Data freshness**: Updated when position is modified or refreshed
- **Concurrent requests**: Unlimited for read operations
- **Conditional requests**: Use ETags to minimize bandwidth