# Get Position PnL

Retrieve comprehensive profit and loss analysis for a specific Uniswap V3 position.

## Endpoint

```
GET /api/positions/uniswapv3/[chain]/[nft]/pnl
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
    "initialValue": "50000000000",
    "currentValue": "52500000000",
    "totalPnL": "2500000000",
    "unrealizedPnL": "1000000000",
    "realizedPnL": "1500000000",
    "feesCollected0": "250000",
    "feesCollected1": "1000000000000000000",
    "feeValueInQuote": "1500000000",
    "unclaimedFees0": "50000",
    "unclaimedFees1": "200000000000000000",
    "unclaimedValueInQuote": "300000000",
    "calculatedAt": "2024-01-15T12:35:00.000Z",
    "quoteToken": {
      "address": "0xa0b86a33e6c6b5e6bf0b7c34c8a37c8c6b5e6bf0",
      "symbol": "USDC",
      "decimals": 6
    }
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

#### Core PnL Values (All in Quote Token BigInt)
| Field | Type | Description |
|-------|------|-------------|
| initialValue | string | Position value when first created/imported |
| currentValue | string | Current position value (tokens + unclaimed fees) |
| totalPnL | string | Overall profit/loss (currentValue - initialValue) |
| unrealizedPnL | string | PnL from position value changes |
| realizedPnL | string | PnL from collected fees |

#### Fee Breakdown
| Field | Type | Description |
|-------|------|-------------|
| feesCollected0 | string | Token0 fees collected historically |
| feesCollected1 | string | Token1 fees collected historically |
| feeValueInQuote | string | Total collected fees value in quote token |
| unclaimedFees0 | string | Token0 fees earned but not collected |
| unclaimedFees1 | string | Token1 fees earned but not collected |
| unclaimedValueInQuote | string | Unclaimed fees value in quote token |

#### Metadata
| Field | Type | Description |
|-------|------|-------------|
| calculatedAt | string | Timestamp when PnL was calculated |
| quoteToken | object | Quote token used for value calculations |

### PnL Calculation Logic
```
totalPnL = currentValue - initialValue
unrealizedPnL = (current position tokens value) - initialValue
realizedPnL = feeValueInQuote (collected fees)
currentValue = (position tokens value) + unclaimedValueInQuote
```

### Value Examples

#### Profitable Position
```json
{
  "initialValue": "10000000000",    // $10,000 USDC
  "currentValue": "12500000000",    // $12,500 USDC
  "totalPnL": "2500000000",         // +$2,500 USDC (+25%)
  "unrealizedPnL": "1000000000",    // +$1,000 USDC from position
  "realizedPnL": "1500000000"       // +$1,500 USDC from fees
}
```

#### Loss-making Position
```json
{
  "initialValue": "10000000000",    // $10,000 USDC
  "currentValue": "8500000000",     // $8,500 USDC
  "totalPnL": "-1500000000",        // -$1,500 USDC (-15%)
  "unrealizedPnL": "-2000000000",   // -$2,000 USDC from position
  "realizedPnL": "500000000"        // +$500 USDC from fees
}
```

## Error Responses

### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "error": "Chain and NFT ID are required",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

### 400 Bad Request - Invalid Chain
```json
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

### 400 Bad Request - Invalid NFT ID
```json
{
  "success": false,
  "error": "Invalid NFT ID format. Must be a positive integer.",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
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
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

### 422 Unprocessable Entity - No PnL Available
```json
{
  "success": false,
  "error": "PnL calculation not available for this position type",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

### 503 Service Unavailable - Blockchain Data
```json
{
  "success": false,
  "error": "Blockchain data temporarily unavailable",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

### 503 Service Unavailable - Pool Data
```json
{
  "success": false,
  "error": "Pool data temporarily unavailable",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "chain": "",
    "protocol": "",
    "nftId": ""
  }
}
```

## Usage Examples

### Basic Request
```bash
curl -X GET "/api/positions/uniswapv3/ethereum/123456/pnl" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

### Multiple Positions
```bash
# Check PnL for multiple positions
for nftId in 123456 789012 345678; do
  echo "Position $nftId PnL:"
  curl -s -X GET "/api/positions/uniswapv3/ethereum/$nftId/pnl" \
    -H "Authorization: Bearer midcurve_prod_your_api_key_here" | \
    jq '.data.totalPnL'
done
```

### Portfolio PnL Summary
```bash
#!/bin/bash
API_KEY="midcurve_prod_your_api_key_here"
CHAIN="ethereum"

# Get all positions
positions=$(curl -s -X GET "/api/positions/uniswapv3/list?chain=$CHAIN" \
  -H "Authorization: Bearer $API_KEY" | \
  jq -r '.data.positions[].nftId')

total_pnl=0

for nftId in $positions; do
  pnl=$(curl -s -X GET "/api/positions/uniswapv3/$CHAIN/$nftId/pnl" \
    -H "Authorization: Bearer $API_KEY" | \
    jq -r '.data.totalPnL')

  total_pnl=$((total_pnl + pnl))
  echo "Position $nftId: $pnl"
done

echo "Total Portfolio PnL: $total_pnl"
```

## JavaScript Examples

### Basic Fetch
```typescript
async function getPositionPnL(chain: string, nftId: string) {
  const response = await fetch(`/api/positions/uniswapv3/${chain}/${nftId}/pnl`, {
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

### With Formatted Display
```typescript
interface PnLBreakdown {
  initialValue: string;
  currentValue: string;
  totalPnL: string;
  unrealizedPnL: string;
  realizedPnL: string;
  feesCollected0: string;
  feesCollected1: string;
  feeValueInQuote: string;
  unclaimedFees0: string;
  unclaimedFees1: string;
  unclaimedValueInQuote: string;
  calculatedAt: string;
  quoteToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

function formatPnLValue(value: string, decimals: number): string {
  const valueBN = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const wholePart = valueBN / divisor;
  const fractionalPart = valueBN % divisor;

  if (fractionalPart === 0n) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${wholePart}.${fractionalStr}`;
}

function calculatePnLPercentage(totalPnL: string, initialValue: string): number {
  const pnlBN = BigInt(totalPnL);
  const initialBN = BigInt(initialValue);

  if (initialBN === 0n) return 0;

  return Number(pnlBN * 10000n / initialBN) / 100; // Percentage with 2 decimal precision
}

async function getFormattedPnL(chain: string, nftId: string) {
  const pnl = await getPositionPnL(chain, nftId);

  const formatted = {
    initialValue: formatPnLValue(pnl.initialValue, pnl.quoteToken.decimals),
    currentValue: formatPnLValue(pnl.currentValue, pnl.quoteToken.decimals),
    totalPnL: formatPnLValue(pnl.totalPnL, pnl.quoteToken.decimals),
    unrealizedPnL: formatPnLValue(pnl.unrealizedPnL, pnl.quoteToken.decimals),
    realizedPnL: formatPnLValue(pnl.realizedPnL, pnl.quoteToken.decimals),
    feeValue: formatPnLValue(pnl.feeValueInQuote, pnl.quoteToken.decimals),
    unclaimedValue: formatPnLValue(pnl.unclaimedValueInQuote, pnl.quoteToken.decimals),
    pnlPercentage: calculatePnLPercentage(pnl.totalPnL, pnl.initialValue),
    quoteSymbol: pnl.quoteToken.symbol
  };

  return formatted;
}

// Usage
const pnl = await getFormattedPnL('ethereum', '123456');
console.log(`Initial: ${pnl.initialValue} ${pnl.quoteSymbol}`);
console.log(`Current: ${pnl.currentValue} ${pnl.quoteSymbol}`);
console.log(`Total PnL: ${pnl.totalPnL} ${pnl.quoteSymbol} (${pnl.pnlPercentage.toFixed(2)}%)`);
console.log(`Unrealized: ${pnl.unrealizedPnL} ${pnl.quoteSymbol}`);
console.log(`Realized: ${pnl.realizedPnL} ${pnl.quoteSymbol}`);
```

### React Component
```typescript
import { useQuery } from '@tanstack/react-query';

function usePnL(chain: string, nftId: string) {
  return useQuery({
    queryKey: ['position', 'pnl', chain, nftId],
    queryFn: () => getPositionPnL(chain, nftId),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(chain && nftId),
  });
}

function PnLDisplay({ chain, nftId }: { chain: string; nftId: string }) {
  const { data: pnl, isLoading, error } = usePnL(chain, nftId);

  if (isLoading) return <div>Loading PnL...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!pnl) return <div>PnL data not available</div>;

  const formatted = formatPnLValue(pnl.totalPnL, pnl.quoteToken.decimals);
  const percentage = calculatePnLPercentage(pnl.totalPnL, pnl.initialValue);
  const isProfit = BigInt(pnl.totalPnL) >= 0n;

  return (
    <div className={`pnl-display ${isProfit ? 'profit' : 'loss'}`}>
      <h3>Position PnL</h3>

      <div className="pnl-summary">
        <span className="total-pnl">
          {isProfit ? '+' : ''}{formatted} {pnl.quoteToken.symbol}
        </span>
        <span className="pnl-percentage">
          ({isProfit ? '+' : ''}{percentage.toFixed(2)}%)
        </span>
      </div>

      <div className="pnl-breakdown">
        <div className="pnl-row">
          <span>Initial Value:</span>
          <span>{formatPnLValue(pnl.initialValue, pnl.quoteToken.decimals)} {pnl.quoteToken.symbol}</span>
        </div>

        <div className="pnl-row">
          <span>Current Value:</span>
          <span>{formatPnLValue(pnl.currentValue, pnl.quoteToken.decimals)} {pnl.quoteToken.symbol}</span>
        </div>

        <div className="pnl-row">
          <span>Unrealized PnL:</span>
          <span>{formatPnLValue(pnl.unrealizedPnL, pnl.quoteToken.decimals)} {pnl.quoteToken.symbol}</span>
        </div>

        <div className="pnl-row">
          <span>Realized PnL (Fees):</span>
          <span>{formatPnLValue(pnl.realizedPnL, pnl.quoteToken.decimals)} {pnl.quoteToken.symbol}</span>
        </div>

        <div className="pnl-row">
          <span>Unclaimed Fees:</span>
          <span>{formatPnLValue(pnl.unclaimedValueInQuote, pnl.quoteToken.decimals)} {pnl.quoteToken.symbol}</span>
        </div>
      </div>

      <div className="pnl-timestamp">
        Calculated at: {new Date(pnl.calculatedAt).toLocaleString()}
      </div>
    </div>
  );
}
```

### Portfolio PnL Aggregation
```typescript
async function getPortfolioPnL(chain?: string) {
  // Get all positions
  const positionsResponse = await fetch(`/api/positions/uniswapv3/list${chain ? `?chain=${chain}` : ''}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const positionsData = await positionsResponse.json();
  const positions = positionsData.data.positions;

  // Get PnL for each position
  const pnlPromises = positions.map(position =>
    getPositionPnL(position.chain, position.nftId).catch(() => null)
  );

  const pnlResults = await Promise.all(pnlPromises);

  // Aggregate by quote token
  const aggregatedPnL = new Map<string, {
    totalPnL: bigint;
    unrealizedPnL: bigint;
    realizedPnL: bigint;
    initialValue: bigint;
    currentValue: bigint;
    positionCount: number;
    quoteToken: { symbol: string; decimals: number };
  }>();

  pnlResults.forEach(pnl => {
    if (!pnl) return;

    const symbol = pnl.quoteToken.symbol;
    const existing = aggregatedPnL.get(symbol) || {
      totalPnL: 0n,
      unrealizedPnL: 0n,
      realizedPnL: 0n,
      initialValue: 0n,
      currentValue: 0n,
      positionCount: 0,
      quoteToken: pnl.quoteToken
    };

    aggregatedPnL.set(symbol, {
      totalPnL: existing.totalPnL + BigInt(pnl.totalPnL),
      unrealizedPnL: existing.unrealizedPnL + BigInt(pnl.unrealizedPnL),
      realizedPnL: existing.realizedPnL + BigInt(pnl.realizedPnL),
      initialValue: existing.initialValue + BigInt(pnl.initialValue),
      currentValue: existing.currentValue + BigInt(pnl.currentValue),
      positionCount: existing.positionCount + 1,
      quoteToken: pnl.quoteToken
    });
  });

  return aggregatedPnL;
}

// Usage
const portfolioPnL = await getPortfolioPnL('ethereum');

portfolioPnL.forEach((pnl, symbol) => {
  const totalFormatted = formatPnLValue(pnl.totalPnL.toString(), pnl.quoteToken.decimals);
  const percentage = calculatePnLPercentage(pnl.totalPnL.toString(), pnl.initialValue.toString());

  console.log(`${symbol}: ${totalFormatted} (${percentage.toFixed(2)}%) from ${pnl.positionCount} positions`);
});
```

## Rate Limiting

This endpoint has the following rate limits:
- **Per IP**: 60 requests per minute
- **Per API Key**: 100 requests per minute
- **Per Session**: 80 requests per minute

## Caching

Response caching:
- **Cache-Control**: `public, max-age=30`
- **ETag**: Included for conditional requests
- **Stale-while-revalidate**: 60 seconds

PnL data is cached for 30 seconds due to frequent price changes affecting calculations.

## Performance Notes

- **Calculation time**: 100-500ms (includes blockchain queries)
- **Real-time updates**: Data reflects current market prices
- **Quote token consistency**: All values in same token for easy comparison
- **Historical accuracy**: Fees and events tracked from position creation