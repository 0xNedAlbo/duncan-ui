# DUNCAN API Documentation

## Overview

The DUNCAN API provides comprehensive access to Uniswap V3 liquidity position management, risk analysis, and portfolio tracking. This REST API enables developers to integrate DUNCAN's position analysis capabilities into their applications.

## Base URL

```
https://your-domain.com/api
```

## API Principles

### Authentication
- **Dual Authentication**: Supports both session-based and API key authentication
- **Protected by Default**: All endpoints require authentication except `/api/auth/*` and `/api/health`
- **API Key Format**: `duncan_[environment]_[random]` (e.g., `duncan_prod_abc123def456`)

### Data Precision
- **BigInt Values**: All token amounts, prices, and position values use BigInt precision
- **String Format**: BigInt values are serialized as strings in JSON responses
- **No Floating Point**: Never use decimal/float values for financial calculations
- **Human Display**: Convert to decimal format only for UI display

### Response Format
All API responses follow a consistent structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestedAt: string;
    [key: string]: any;
  };
}
```

### Error Handling
- **Structured Errors**: Consistent error format across all endpoints
- **HTTP Status Codes**: Proper status codes for different error types
- **Detailed Messages**: Clear, actionable error messages
- **Request Correlation**: All responses include request metadata

## Supported Chains

The API supports the following blockchain networks:

- **ethereum** - Ethereum Mainnet
- **arbitrum** - Arbitrum One
- **base** - Base

## Common Parameters

### Chain Parameter
```typescript
type SupportedChain = 'ethereum' | 'arbitrum' | 'base'
```

### NFT ID Parameter
- **Format**: Positive integer as string
- **Example**: `"123456"`
- **Validation**: Must match `^\d+$` regex pattern

### Pagination
```typescript
interface PaginationParams {
  limit?: number;    // Default: 50, Max: 100
  offset?: number;   // Default: 0
}

interface PaginationResponse {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}
```

### Sorting
```typescript
interface SortParams {
  sortBy?: 'createdAt' | 'updatedAt' | 'liquidity';
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
}
```

## Rate Limiting

- **Per IP**: 1000 requests per hour
- **Per API Key**: 5000 requests per hour
- **Per Session**: 2000 requests per hour

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Valid request, business logic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | External service unavailable |

## BigInt Handling Guidelines

### Storage Format
- Store all token amounts in smallest unit (wei for ETH, 1e6 for USDC)
- Use BigInt strings: `"1000000"` not `1.0`
- Maintain precision through all layers

### Examples
```json
{
  "currentValue": "69153795098",      // 69153.795098 USDC (6 decimals)
  "initialValue": "50000000000",      // 50000.0 USDC
  "poolPrice": "1845678900123456789", // Price in X96 format
  "liquidity": "12345678901234567890" // Liquidity amount
}
```

### Conversion
- **API**: Always return BigInt strings
- **Frontend**: Convert to decimal for display only
- **Database**: Store as string with BigInt compatibility

## Authentication Methods

### Session Authentication
Used for web interface and interactive API exploration:

```bash
# Login first
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  -c cookies.txt

# Use session cookie
curl -X GET /api/positions/uniswapv3/list \
  -b cookies.txt
```

### API Key Authentication
Used for programmatic access:

```bash
curl -X GET /api/positions/uniswapv3/list \
  -H "Authorization: Bearer duncan_prod_your_api_key_here"
```

## Example Usage

### Get All Positions
```bash
curl -X GET "/api/positions/uniswapv3/list?limit=10&chain=ethereum" \
  -H "Authorization: Bearer duncan_prod_your_api_key_here"
```

### Import NFT Position
```bash
curl -X POST /api/positions/uniswapv3/import-nft \
  -H "Authorization: Bearer duncan_prod_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"chain": "ethereum", "nftId": "123456"}'
```

### Get Position PnL
```bash
curl -X GET /api/positions/uniswapv3/ethereum/123456/pnl \
  -H "Authorization: Bearer duncan_prod_your_api_key_here"
```

## SDKs and Libraries

### TypeScript/JavaScript
Types are available in the codebase at `src/types/api.ts`:

```typescript
import type { ApiResponse, PositionListResponse } from '@/types/api';

// Example usage with fetch
const response = await fetch('/api/positions/uniswapv3/list', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

const data: PositionListResponse = await response.json();
```

## Error Examples

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized - Please sign in",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 404 Not Found
```json
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
```

## API Sections

- **[Authentication](./authentication.md)** - Login, registration, API key management
- **[Positions](./positions/)** - Uniswap V3 position management and analysis
- **[Health](./health.md)** - System health and status monitoring

## Support

For API support and questions:
- GitHub Issues: [duncan-ui repository](https://github.com/your-org/duncan-ui/issues)
- API Status: Check `/api/health` endpoint
- Rate Limits: Monitor response headers for current usage