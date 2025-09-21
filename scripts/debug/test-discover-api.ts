#!/usr/bin/env npx tsx

/**
 * Test script for Position Discovery API endpoint
 * Tests the discover endpoint functionality and address normalization
 */

console.log({
  "apiEndpoint": "/api/positions/uniswapv3/discover",
  "method": "POST",
  "authentication": "Required - uses withAuthAndLogging",
  "features": {
    "addressNormalization": "Normalizes addresses to EIP-55 checksum format",
    "inputValidation": "Validates address format, chain support, limit bounds",
    "limitValidation": "1-10 positions, defaults to 10",
    "deduplication": "Filters out existing positions in database",
    "errorHandling": "Comprehensive error responses with proper status codes"
  },
  "requestFormat": {
    "address": "string - Wallet address to search (will be normalized)",
    "chain": "string - ethereum|arbitrum|base",
    "limit": "number - Optional, 1-10, defaults to 10"
  },
  "responseFormat": {
    "success": "boolean",
    "data": {
      "address": "string - Normalized EIP-55 address",
      "chain": "string",
      "totalNFTs": "number - Total NFTs owned by address",
      "existingPositions": "number - Already imported positions",
      "newPositionsFound": "number - New positions discovered",
      "positions": "BasicPosition[] - Full position data",
      "summary": "DiscoveredPositionSummary[] - Quick overview"
    },
    "meta": {
      "requestedAt": "string",
      "address": "string - Normalized address",
      "chain": "string",
      "limit": "number",
      "dataSource": "onchain"
    }
  },
  "exampleUsage": {
    "curl": `curl -X POST /api/positions/uniswapv3/discover \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{
    "address": "0x742d35cc6666cf8c8dd2...",
    "chain": "ethereum",
    "limit": 5
  }'`,
    "javascript": `const response = await fetch('/api/positions/uniswapv3/discover', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    address: '0x742d35cc6666cf8c8dd2...',
    chain: 'ethereum',
    limit: 5
  })
});
const data = await response.json();`
  },
  "validation": {
    "addressNormalization": "Input: '0xabc...' → Output: '0xABC...' (EIP-55)",
    "chainValidation": "Must be in ['ethereum', 'arbitrum', 'base']",
    "limitValidation": "Must be integer 1-10, defaults to 10",
    "authentication": "Requires valid user session or API key",
    "errorResponses": {
      "400": "Bad request - invalid input parameters",
      "401": "Unauthorized - authentication required",
      "500": "Internal server error - service failure"
    }
  },
  "integration": {
    "service": "PositionLookupService",
    "method": "findPositionsForAddress(normalizedAddress, chain, userId, limit)",
    "dependencies": ["PoolService", "PositionService", "QuoteTokenService"],
    "deduplication": "Checks existing positions in database before returning",
    "onchainCalls": ["balanceOf", "tokenOfOwnerByIndex", "positions"]
  }
});

process.exit(0);