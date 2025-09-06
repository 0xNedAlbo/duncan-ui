import type { AlchemyResponse, AlchemyBatchResponse } from '@/services/alchemy/tokenMetadata';
import { TOKEN_ADDRESSES, mockAlchemyResponses } from './tokens';

export const createAlchemySuccessResponse = (address: string): AlchemyResponse => {
  const metadata = mockAlchemyResponses[address];
  if (!metadata) {
    throw new Error(`No mock data for address: ${address}`);
  }

  return {
    jsonrpc: '2.0',
    id: 1,
    result: metadata,
  };
};

export const createAlchemyErrorResponse = (message: string, code = -32000): AlchemyResponse => {
  return {
    jsonrpc: '2.0',
    id: 1,
    error: {
      code,
      message,
    },
  };
};

export const createAlchemyBatchSuccessResponse = (addresses: string[]): AlchemyBatchResponse => {
  const results = addresses.map(address => {
    const metadata = mockAlchemyResponses[address];
    if (!metadata) {
      throw new Error(`No mock data for address: ${address}`);
    }
    return metadata;
  });

  return {
    jsonrpc: '2.0',
    id: 1,
    result: results,
  };
};

export const createAlchemyBatchErrorResponse = (message: string, code = -32000): AlchemyBatchResponse => {
  return {
    jsonrpc: '2.0',
    id: 1,
    error: {
      code,
      message,
    },
  };
};

// Common test scenarios
export const alchemyTestScenarios = {
  success: {
    single: createAlchemySuccessResponse(TOKEN_ADDRESSES.ethereum.WETH),
    batch: createAlchemyBatchSuccessResponse([
      TOKEN_ADDRESSES.ethereum.WETH,
      TOKEN_ADDRESSES.ethereum.USDC,
    ]),
  },
  error: {
    tokenNotFound: createAlchemyErrorResponse('Token not found'),
    rateLimited: createAlchemyErrorResponse('Rate limit exceeded', 429),
    invalidParams: createAlchemyErrorResponse('Invalid parameters', -32602),
  },
};