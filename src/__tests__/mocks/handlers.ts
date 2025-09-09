import { http, HttpResponse } from 'msw'
import { 
  createAlchemySuccessResponse, 
  createAlchemyBatchSuccessResponse,
  createAlchemyErrorResponse,
} from '../fixtures/alchemy'
import { TOKEN_ADDRESSES } from '../fixtures/tokens'
import { poolHandlers } from './poolHandlers'
import { subgraphHandlers } from './subgraphHandlers'

export const handlers = [
  // Alchemy API mocks
  http.post('https://eth-mainnet.g.alchemy.com/v2/*', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.method === 'alchemy_getTokenMetadata') {
      const [address] = body.params;
      
      // Mock known tokens (case-insensitive)
      const normalizedAddress = address.toLowerCase();
      const knownAddress = Object.values(TOKEN_ADDRESSES.ethereum)
        .find(addr => addr.toLowerCase() === normalizedAddress);
      
      if (knownAddress) {
        return HttpResponse.json(createAlchemySuccessResponse(knownAddress));
      }
      
      // Mock token not found
      return HttpResponse.json(createAlchemyErrorResponse('Token not found'));
    }
    
    if (body.method === 'alchemy_getTokenMetadataBatch') {
      const [addresses] = body.params;
      
      // Check if all addresses are known (case-insensitive)
      const validAddresses = addresses.filter((addr: string) => {
        const normalizedAddr = addr.toLowerCase();
        return Object.values(TOKEN_ADDRESSES.ethereum)
          .some(knownAddr => knownAddr.toLowerCase() === normalizedAddr);
      });
      
      if (validAddresses.length === addresses.length) {
        // Map to original known addresses for response
        const knownAddresses = addresses.map((addr: string) => {
          const normalizedAddr = addr.toLowerCase();
          return Object.values(TOKEN_ADDRESSES.ethereum)
            .find(knownAddr => knownAddr.toLowerCase() === normalizedAddr) || addr;
        });
        return HttpResponse.json(createAlchemyBatchSuccessResponse(knownAddresses));
      }
      
      return HttpResponse.json(createAlchemyErrorResponse('One or more tokens not found'));
    }
    
    return HttpResponse.json(createAlchemyErrorResponse('Unknown method'));
  }),
  
  http.post('https://arb-mainnet.g.alchemy.com/v2/*', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.method === 'alchemy_getTokenMetadata') {
      const [address] = body.params;
      
      // Mock known tokens (case-insensitive)
      const normalizedAddress = address.toLowerCase();
      const knownAddress = Object.values(TOKEN_ADDRESSES.arbitrum)
        .find(addr => addr.toLowerCase() === normalizedAddress);
      
      if (knownAddress) {
        return HttpResponse.json(createAlchemySuccessResponse(knownAddress));
      }
      
      return HttpResponse.json(createAlchemyErrorResponse('Token not found'));
    }
    
    if (body.method === 'alchemy_getTokenMetadataBatch') {
      const [addresses] = body.params;
      
      const validAddresses = addresses.filter((addr: string) => {
        const normalizedAddr = addr.toLowerCase();
        return Object.values(TOKEN_ADDRESSES.arbitrum)
          .some(knownAddr => knownAddr.toLowerCase() === normalizedAddr);
      });
      
      if (validAddresses.length === addresses.length) {
        // Map to original known addresses for response
        const knownAddresses = addresses.map((addr: string) => {
          const normalizedAddr = addr.toLowerCase();
          return Object.values(TOKEN_ADDRESSES.arbitrum)
            .find(knownAddr => knownAddr.toLowerCase() === normalizedAddr) || addr;
        });
        return HttpResponse.json(createAlchemyBatchSuccessResponse(knownAddresses));
      }
      
      return HttpResponse.json(createAlchemyErrorResponse('One or more tokens not found'));
    }
    
    return HttpResponse.json(createAlchemyErrorResponse('Unknown method'));
  }),
  
  http.post('https://base-mainnet.g.alchemy.com/v2/*', async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.method === 'alchemy_getTokenMetadata') {
      const [address] = body.params;
      
      // Mock known tokens (case-insensitive)
      const normalizedAddress = address.toLowerCase();
      const knownAddress = Object.values(TOKEN_ADDRESSES.base)
        .find(addr => addr.toLowerCase() === normalizedAddress);
      
      if (knownAddress) {
        return HttpResponse.json(createAlchemySuccessResponse(knownAddress));
      }
      
      return HttpResponse.json(createAlchemyErrorResponse('Token not found'));
    }
    
    if (body.method === 'alchemy_getTokenMetadataBatch') {
      const [addresses] = body.params;
      
      const validAddresses = addresses.filter((addr: string) => {
        const normalizedAddr = addr.toLowerCase();
        return Object.values(TOKEN_ADDRESSES.base)
          .some(knownAddr => knownAddr.toLowerCase() === normalizedAddr);
      });
      
      if (validAddresses.length === addresses.length) {
        // Map to original known addresses for response
        const knownAddresses = addresses.map((addr: string) => {
          const normalizedAddr = addr.toLowerCase();
          return Object.values(TOKEN_ADDRESSES.base)
            .find(knownAddr => knownAddr.toLowerCase() === normalizedAddr) || addr;
        });
        return HttpResponse.json(createAlchemyBatchSuccessResponse(knownAddresses));
      }
      
      return HttpResponse.json(createAlchemyErrorResponse('One or more tokens not found'));
    }
    
    return HttpResponse.json(createAlchemyErrorResponse('Unknown method'));
  }),
  
  // Include pool-specific handlers
  ...poolHandlers,
  
  // Include subgraph-specific handlers
  ...subgraphHandlers,
]