# List Positions

Get a paginated list of user's Uniswap V3 positions with filtering and sorting options.

## Endpoint

```
GET /api/positions/uniswapv3/list
```

## Authentication

Requires authentication via session or API key.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| chain | string | No | - | Filter by blockchain network |
| status | string | No | `active` | Filter by position status |
| limit | number | No | `50` | Number of results per page (max: 100) |
| offset | number | No | `0` | Results offset for pagination |
| sortBy | string | No | `createdAt` | Sort field |
| sortOrder | string | No | `desc` | Sort direction |

### Parameter Details

#### chain
- **Values**: `ethereum`, `arbitrum`, `base`
- **Effect**: Only return positions from specified blockchain
- **Example**: `?chain=ethereum`

#### status
- **Values**: `active`, `closed`, `archived`, `all`
- **Default**: `active` (positions with liquidity > 0)
- **Special**: `all` returns positions regardless of status
- **Example**: `?status=all`

#### limit
- **Range**: 1-100
- **Default**: 50
- **Validation**: Returns 400 error if out of range
- **Example**: `?limit=25`

#### offset
- **Range**: 0 or greater
- **Default**: 0
- **Use**: Pagination offset
- **Example**: `?offset=50`

#### sortBy
- **Values**: `createdAt`, `updatedAt`, `liquidity`
- **Default**: `createdAt`
- **Effect**: Field used for sorting results
- **Example**: `?sortBy=liquidity`

#### sortOrder
- **Values**: `asc`, `desc`
- **Default**: `desc`
- **Effect**: Sort direction (ascending/descending)
- **Example**: `?sortOrder=asc`

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "positions": [
      {
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
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 50,
      "offset": 0,
      "hasMore": false,
      "nextOffset": null
    }
  },
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z",
    "filters": {
      "status": "active",
      "chain": null,
      "sortBy": "createdAt",
      "sortOrder": "desc"
    },
    "dataQuality": {
      "subgraphPositions": 25,
      "snapshotPositions": 0,
      "upgradedPositions": 0
    }
  }
}
```

### Response Fields

#### positions Array
Array of `BasicPosition` objects (see [Positions Overview](./README.md#basic-position-object) for full schema).

#### pagination Object
| Field | Type | Description |
|-------|------|-------------|
| total | number | Total number of positions matching filters |
| limit | number | Requested page size |
| offset | number | Current offset |
| hasMore | boolean | Whether more results are available |
| nextOffset | number \| null | Offset for next page, null if no more |

#### meta Object
| Field | Type | Description |
|-------|------|-------------|
| requestedAt | string | ISO timestamp of request |
| filters | object | Applied filters for debugging |
| dataQuality | object | Data source breakdown |

### Error Responses

#### 400 Bad Request - Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid limit parameter. Must be between 1 and 100.",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

#### 400 Bad Request - Invalid Chain
```json
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized - Please sign in",
  "meta": {
    "requestedAt": "2024-01-15T12:35:00.000Z"
  }
}
```

#### 500 Internal Server Error
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
curl -X GET "/api/positions/uniswapv3/list" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

### Filtered Request
```bash
curl -X GET "/api/positions/uniswapv3/list?chain=ethereum&status=active&limit=20" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

### Pagination
```bash
# First page
curl -X GET "/api/positions/uniswapv3/list?limit=10&offset=0" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"

# Second page
curl -X GET "/api/positions/uniswapv3/list?limit=10&offset=10" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

### Sorting
```bash
# Sort by liquidity, highest first
curl -X GET "/api/positions/uniswapv3/list?sortBy=liquidity&sortOrder=desc" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here"
```

## JavaScript Examples

### Basic Fetch
```typescript
async function getPositions() {
  const response = await fetch('/api/positions/uniswapv3/list', {
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

### With Query Parameters
```typescript
interface PositionListParams {
  chain?: 'ethereum' | 'arbitrum' | 'base';
  status?: 'active' | 'closed' | 'archived' | 'all';
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'liquidity';
  sortOrder?: 'asc' | 'desc';
}

async function getPositions(params: PositionListParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });

  const url = `/api/positions/uniswapv3/list?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Usage
const activeEthereumPositions = await getPositions({
  chain: 'ethereum',
  status: 'active',
  sortBy: 'liquidity',
  sortOrder: 'desc'
});
```

### React Query Integration
```typescript
import { useQuery } from '@tanstack/react-query';

function usePositions(params: PositionListParams = {}) {
  return useQuery({
    queryKey: ['positions', 'list', params],
    queryFn: () => getPositions(params),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Usage in component
function PositionsList() {
  const { data, isLoading, error } = usePositions({
    status: 'active',
    limit: 20
  });

  if (isLoading) return <div>Loading positions...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.positions.map(position => (
        <div key={`${position.chain}-${position.nftId}`}>
          {position.pool.token0.symbol}/{position.pool.token1.symbol}
        </div>
      ))}
    </div>
  );
}
```

### Pagination Helper
```typescript
async function getAllPositions(params: Omit<PositionListParams, 'offset'> = {}) {
  const allPositions = [];
  let offset = 0;
  const limit = 100; // Maximum page size

  while (true) {
    const response = await getPositions({ ...params, limit, offset });

    allPositions.push(...response.positions);

    if (!response.pagination.hasMore) {
      break;
    }

    offset = response.pagination.nextOffset!;
  }

  return allPositions;
}
```

## Rate Limiting

This endpoint has the following rate limits:
- **Per IP**: 60 requests per minute
- **Per API Key**: 120 requests per minute
- **Per Session**: 100 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 1640995200
```

## Caching

Response caching:
- **Cache-Control**: `public, max-age=30`
- **ETag**: Included for conditional requests
- **Stale-while-revalidate**: 60 seconds

Use conditional requests for better performance:
```bash
curl -X GET "/api/positions/uniswapv3/list" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here" \
  -H "If-None-Match: \"abc123def456\""
```

## Performance Notes

- **Large result sets**: Use pagination with smaller page sizes
- **Frequent polling**: Consider WebSocket connections for real-time updates
- **Filtering**: Apply filters to reduce response size
- **Sorting**: Database-level sorting is more efficient than client-side sorting