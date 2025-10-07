# Import NFT Position

Import an existing Uniswap V3 NFT position into the user's portfolio for tracking and analysis.

## Endpoint

```
POST /api/positions/uniswapv3/import-nft
```

## Authentication

Requires authentication via session or API key.

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chain | string | Yes | Blockchain network |
| nftId | string | Yes | NFT token ID |

### Field Details

#### chain
- **Values**: `ethereum`, `arbitrum`, `base`
- **Validation**: Must be supported chain
- **Example**: `"ethereum"`

#### nftId
- **Format**: Positive integer as string
- **Pattern**: Must match `^\d+$` regex
- **Example**: `"123456"`

### Request Example
```json
{
  "chain": "ethereum",
  "nftId": "123456"
}
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "position": {
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
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "nftId": "123456",
    "dataSource": "onchain"
  }
}
```

### Response Fields

#### data.position
Complete `BasicPosition` object (see [Positions Overview](./README.md#basic-position-object) for full schema).

#### meta Object
| Field | Type | Description |
|-------|------|-------------|
| requestedAt | string | ISO timestamp of request |
| chain | string | Blockchain network |
| nftId | string | NFT token ID |
| dataSource | string | Always "onchain" for imports |

## Error Responses

### 400 Bad Request - Missing Fields
```json
{
  "success": false,
  "error": "Missing required fields: chain, nftId",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "",
    "nftId": "",
    "dataSource": "onchain"
  }
}
```

### 400 Bad Request - Invalid Chain
```json
{
  "success": false,
  "error": "Invalid chain parameter. Supported chains: ethereum, arbitrum, base",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "invalid_chain",
    "nftId": "123456",
    "dataSource": "onchain"
  }
}
```

### 400 Bad Request - Invalid NFT ID
```json
{
  "success": false,
  "error": "Invalid NFT ID format. Must be a positive integer.",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "nftId": "abc123",
    "dataSource": "onchain"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized - Please sign in",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "",
    "nftId": "",
    "dataSource": "onchain"
  }
}
```

### 404 Not Found - NFT Does Not Exist
```json
{
  "success": false,
  "error": "NFT position not found on blockchain",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "nftId": "999999",
    "dataSource": "onchain"
  }
}
```

### 409 Conflict - Position Already Imported
```json
{
  "success": false,
  "error": "Position already imported. This NFT position already exists in your portfolio.",
  "data": {
    "existingPosition": {
      "chain": "ethereum",
      "protocol": "uniswapv3",
      "nftId": "123456",
      "poolAddress": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
      "token0Symbol": "USDC",
      "token1Symbol": "WETH",
      "status": "active",
      "createdAt": "2024-01-10T10:30:00.000Z"
    }
  },
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "nftId": "123456",
    "dataSource": "database"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "meta": {
    "requestedAt": "2024-01-15T10:30:00.000Z",
    "chain": "ethereum",
    "nftId": "123456",
    "dataSource": "onchain"
  }
}
```

## Import Process

### Steps Performed
1. **Validation** - Verify request parameters
2. **Duplicate Check** - Ensure position not already imported
3. **Blockchain Query** - Fetch NFT position data from contract
4. **Pool Data** - Retrieve pool information and token details
5. **Database Storage** - Store position with relationships
6. **PnL Calculation** - Calculate initial PnL breakdown
7. **Response** - Return complete position data

### Data Sources
- **On-chain**: Direct blockchain queries for current data
- **Subgraph**: Historical events and transaction data
- **Token Lists**: Token metadata (symbols, names, decimals)

### Automatic Features
After successful import, the system automatically:
- Calculates initial position value
- Sets up PnL tracking
- Generates curve data (if applicable)
- Fetches historical events
- Determines quote token designation

## Usage Examples

### Basic Import
```bash
curl -X POST "/api/positions/uniswapv3/import-nft" \
  -H "Authorization: Bearer midcurve_prod_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"chain": "ethereum", "nftId": "123456"}'
```

### With Error Handling
```bash
#!/bin/bash
API_KEY="midcurve_prod_your_api_key_here"
CHAIN="ethereum"
NFT_ID="123456"

response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X POST "/api/positions/uniswapv3/import-nft" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"chain\": \"$CHAIN\", \"nftId\": \"$NFT_ID\"}")

# Extract body and status
body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ $status -eq 200 ]; then
  echo "Import successful:"
  echo $body | jq '.'
elif [ $status -eq 409 ]; then
  echo "Position already exists:"
  echo $body | jq '.data.existingPosition'
else
  echo "Import failed (HTTP $status):"
  echo $body | jq '.error'
fi
```

## JavaScript Examples

### Basic Import
```typescript
async function importNFTPosition(chain: string, nftId: string) {
  const response = await fetch('/api/positions/uniswapv3/import-nft', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chain, nftId })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data.position;
}
```

### With Comprehensive Error Handling
```typescript
interface ImportError extends Error {
  status: number;
  code: string;
  existingPosition?: any;
}

async function importNFTPosition(chain: string, nftId: string) {
  try {
    const response = await fetch('/api/positions/uniswapv3/import-nft', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chain, nftId })
    });

    const data = await response.json();

    if (!data.success) {
      const error = new Error(data.error) as ImportError;
      error.status = response.status;

      switch (response.status) {
        case 400:
          error.code = 'INVALID_PARAMETERS';
          break;
        case 404:
          error.code = 'NFT_NOT_FOUND';
          break;
        case 409:
          error.code = 'POSITION_EXISTS';
          error.existingPosition = data.data?.existingPosition;
          break;
        default:
          error.code = 'UNKNOWN_ERROR';
      }

      throw error;
    }

    return data.data.position;
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new Error('Network error: Unable to connect to API');
    }
    throw error;
  }
}

// Usage with error handling
try {
  const position = await importNFTPosition('ethereum', '123456');
  console.log('Position imported successfully:', position);
} catch (error) {
  const importError = error as ImportError;

  switch (importError.code) {
    case 'POSITION_EXISTS':
      console.log('Position already exists:', importError.existingPosition);
      break;
    case 'NFT_NOT_FOUND':
      console.error('NFT does not exist on the blockchain');
      break;
    case 'INVALID_PARAMETERS':
      console.error('Invalid chain or NFT ID format');
      break;
    default:
      console.error('Import failed:', importError.message);
  }
}
```

### React Mutation
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useImportNFTPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chain, nftId }: { chain: string; nftId: string }) =>
      importNFTPosition(chain, nftId),

    onSuccess: (position) => {
      // Invalidate positions list to show new position
      queryClient.invalidateQueries({ queryKey: ['positions', 'list'] });

      // Add position to cache
      queryClient.setQueryData(
        ['position', position.chain, position.nftId],
        position
      );
    },

    onError: (error: ImportError) => {
      if (error.code === 'POSITION_EXISTS') {
        // Handle duplicate gracefully
        console.log('Position already tracked');
      } else {
        // Show error to user
        console.error('Import failed:', error.message);
      }
    }
  });
}

// Usage in component
function ImportForm() {
  const importMutation = useImportNFTPosition();

  const handleSubmit = (chain: string, nftId: string) => {
    importMutation.mutate({ chain, nftId });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      handleSubmit(
        formData.get('chain') as string,
        formData.get('nftId') as string
      );
    }}>
      <select name="chain">
        <option value="ethereum">Ethereum</option>
        <option value="arbitrum">Arbitrum</option>
        <option value="base">Base</option>
      </select>
      <input name="nftId" placeholder="NFT ID" required />
      <button type="submit" disabled={importMutation.isPending}>
        {importMutation.isPending ? 'Importing...' : 'Import Position'}
      </button>

      {importMutation.error && (
        <div className="error">
          {importMutation.error.message}
        </div>
      )}
    </form>
  );
}
```

## Rate Limiting

This endpoint has strict rate limits due to resource intensity:
- **Per IP**: 10 requests per minute
- **Per API Key**: 20 requests per minute
- **Per Session**: 15 requests per minute

Import operations require blockchain queries and can take 2-5 seconds to complete.

## Performance Notes

- **Import time**: 2-5 seconds for blockchain data fetching
- **Concurrent imports**: Limited to prevent API overload
- **Duplicate prevention**: Automatic detection prevents wasted resources
- **Retry logic**: Implement exponential backoff for temporary failures

## Security Considerations

- **NFT Ownership**: System validates NFT ownership on-chain
- **User Association**: Imported positions are tied to authenticated user
- **Data Integrity**: All imported data is verified against blockchain
- **Access Control**: Users can only access their own imported positions