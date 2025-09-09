# Central API Service Implementation Plan

## Overview
This document outlines the implementation plan for a centralized API service layer for the Duncan UI frontend. The goal is to create a unified, type-safe, and maintainable approach to API communication with built-in error handling, authentication, and optimistic UI updates.

## Current State Analysis

### Problems with Current Implementation
1. **No unified API layer**: Each component makes direct `fetch()` calls
2. **Inconsistent error handling**: Each component handles errors differently  
3. **No automatic auth headers**: Components don't automatically include auth tokens
4. **No request retry logic**: Failed requests aren't retried
5. **No request/response interceptors**: No central place for logging or transforming
6. **Type safety gaps**: API responses aren't consistently typed
7. **Code duplication**: Similar fetch logic repeated across components

### Current API Usage Patterns
- **Direct fetch calls** in components:
  - `src/components/positions/position-list.tsx`: Lines 87-109, 123-150
  - `src/components/positions/create-position-dropdown.tsx`: Lines 120-163
  - `src/app/auth/signup/page.tsx`: Lines 23-48
  
- **Manual error handling** in each component
- **No centralized authentication** header injection
- **No request caching or deduplication**

## Proposed Architecture

### Core Components

#### 1. API Client Layer (`src/lib/api/`)

##### `apiClient.ts` - Core fetch wrapper
```typescript
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  // Automatic auth header injection from NextAuth
  private async getAuthHeaders(): Promise<HeadersInit>
  
  // Main request method with all features
  public async request<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>>
  
  // Convenience methods
  public async get<T>(endpoint: string, params?: any): Promise<T>
  public async post<T>(endpoint: string, data?: any): Promise<T>
  public async put<T>(endpoint: string, data?: any): Promise<T>
  public async delete<T>(endpoint: string): Promise<T>
  
  // Request/response interceptors
  public addRequestInterceptor(interceptor: RequestInterceptor): void
  public addResponseInterceptor(interceptor: ResponseInterceptor): void
}
```

##### `apiError.ts` - Standardized error handling
```typescript
enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
  }
  
  static fromResponse(response: Response): ApiError
  static isApiError(error: unknown): error is ApiError
}
```

#### 2. React Query Integration (`src/hooks/api/`)

##### `usePositions.ts` - Position management hooks
```typescript
interface UsePositionsOptions {
  status?: 'active' | 'closed' | 'archived';
  chain?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// List positions with filters
export function usePositions(options?: UsePositionsOptions) {
  return useQuery({
    queryKey: ['positions', options],
    queryFn: () => apiClient.get('/api/positions', options),
    staleTime: 30000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Single position details
export function usePosition(positionId: string) {
  return useQuery({
    queryKey: ['positions', positionId],
    queryFn: () => apiClient.get(`/api/positions/${positionId}`),
    enabled: !!positionId,
  });
}

// Import NFT mutation
export function useImportNFT() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ImportNFTRequest) => 
      apiClient.post('/api/positions/import-nft', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

// Refresh position mutation
export function useRefreshPosition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (positionId: string) => 
      apiClient.post(`/api/positions/${positionId}/refresh`),
    onSuccess: (data, positionId) => {
      queryClient.setQueryData(['positions', positionId], data);
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
```

##### `useTokens.ts` - Token management hooks
```typescript
export function useTokenSearch(query: string, chain?: string) {
  return useQuery({
    queryKey: ['tokens', 'search', query, chain],
    queryFn: () => apiClient.get('/api/tokens/search', { query, chain }),
    enabled: query.length > 2,
    staleTime: 60000, // 1 minute
  });
}

export function useTokenBatch(addresses: string[], chain: string) {
  return useQuery({
    queryKey: ['tokens', 'batch', addresses, chain],
    queryFn: () => apiClient.post('/api/tokens/batch', { addresses, chain }),
    enabled: addresses.length > 0,
  });
}
```

#### 3. Type Definitions (`src/types/api.ts`)

```typescript
// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestedAt: string;
    [key: string]: any;
  };
}

// Pagination types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationResponse {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

// Position types
export interface PositionListResponse {
  positions: PositionWithPnL[];
  pagination: PaginationResponse;
}

export interface ImportNFTRequest {
  chain: string;
  nftId: string;
}

// Add all other API types...
```

#### 4. Query Provider (`src/providers/query-provider.tsx`)

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 10000, // 10 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. **Day 1-2**: Create API client foundation
   - [ ] Implement `apiClient.ts` with basic fetch wrapper
   - [ ] Add authentication header injection using NextAuth
   - [ ] Create `apiError.ts` with standardized error types
   
2. **Day 3-4**: Add advanced features
   - [ ] Implement retry logic with exponential backoff
   - [ ] Add request/response interceptors
   - [ ] Create request cancellation support
   - [ ] Add request timeout handling

3. **Day 5**: Testing & Documentation
   - [ ] Create mock API client for testing
   - [ ] Write unit tests for API client
   - [ ] Document API client usage

### Phase 2: React Query Integration (Week 2)
1. **Day 1-2**: Setup React Query
   - [ ] Install and configure React Query
   - [ ] Create QueryProvider component
   - [ ] Configure default query options
   
2. **Day 3-4**: Create domain hooks
   - [ ] Implement position management hooks
   - [ ] Create token management hooks
   - [ ] Add authentication hooks
   
3. **Day 5**: Optimizations
   - [ ] Implement optimistic updates
   - [ ] Configure cache invalidation strategies
   - [ ] Add prefetching for common queries

### Phase 3: Migration & Testing (Week 3)
1. **Day 1-2**: Component migration
   - [ ] Migrate `PositionList` component
   - [ ] Update `CreatePositionDropdown` component
   - [ ] Convert auth pages to use new API
   
2. **Day 3-4**: Error handling & UX
   - [ ] Create error boundary component
   - [ ] Add loading skeletons
   - [ ] Implement toast notifications for errors
   
3. **Day 5**: Final testing
   - [ ] Update all existing tests
   - [ ] Integration testing
   - [ ] Performance testing

## Migration Strategy

### Step-by-step Migration Example

#### Before (Current Implementation)
```typescript
// src/components/positions/position-list.tsx
const fetchPositions = async (reset = false) => {
  try {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams({ status, limit, offset, sortBy, sortOrder });
    if (chain !== "all") params.append("chain", chain);

    const response = await fetch(`/api/positions?${params}`);
    const result: PositionListResponse = await response.json();

    if (result.success) {
      setPositions(result.data.positions);
      setHasMore(result.data.pagination.hasMore);
    } else {
      setError(result.error || "Failed to load positions");
    }
  } catch (err) {
    setError("Failed to connect to server");
  } finally {
    setLoading(false);
  }
};
```

#### After (With Central API Service)
```typescript
// src/components/positions/position-list.tsx
import { usePositions } from '@/hooks/api/usePositions';

export function PositionList() {
  const { data, error, isLoading, refetch } = usePositions({
    status,
    chain: chain !== 'all' ? chain : undefined,
    sortBy,
    sortOrder,
    limit,
    offset
  });

  // Component automatically re-renders when data changes
  // Error handling is centralized
  // Loading states are managed by React Query
}
```

## Key Benefits

### Developer Experience
- **Type Safety**: Full TypeScript coverage with auto-completion
- **DRY Principle**: No duplicate error handling or auth logic
- **Simplified Testing**: Easy to mock API client for unit tests
- **Better Debugging**: Centralized logging and error tracking
- **React Query DevTools**: Visual debugging of cache and queries

### User Experience
- **Optimistic Updates**: Instant UI feedback for mutations
- **Background Refetching**: Keep data fresh without user action
- **Request Deduplication**: Multiple components can request same data
- **Offline Support**: Cache persists across sessions
- **Better Error Messages**: Consistent, user-friendly error handling

### Performance
- **Intelligent Caching**: Reduce unnecessary API calls
- **Prefetching**: Load data before user needs it
- **Parallel Queries**: Fetch multiple resources simultaneously
- **Stale-While-Revalidate**: Show cached data while fetching fresh data
- **Request Cancellation**: Cancel in-flight requests when component unmounts

## Success Metrics

### Quantitative
- **50% reduction** in API-related code duplication
- **30% improvement** in perceived loading performance
- **90% reduction** in API-related bugs
- **100% type coverage** for API calls

### Qualitative
- Easier onboarding for new developers
- Consistent error handling across application
- Improved maintainability of API logic
- Better separation of concerns

## Dependencies

### Required Packages
```json
{
  "@tanstack/react-query": "^5.x",
  "@tanstack/react-query-devtools": "^5.x"
}
```

### Existing Dependencies Used
- `next-auth`: For authentication headers
- `typescript`: For type safety
- Existing API endpoints (no backend changes required)

## Risks & Mitigations

### Risks
1. **Migration Complexity**: Large codebase changes
   - *Mitigation*: Incremental migration, component by component

2. **Learning Curve**: Team needs to learn React Query
   - *Mitigation*: Documentation, examples, code reviews

3. **Bundle Size**: Adding React Query increases bundle
   - *Mitigation*: Tree-shaking, lazy loading where possible

4. **Cache Invalidation**: Complex cache management
   - *Mitigation*: Clear invalidation strategies, documentation

## Alternative Approaches Considered

### 1. SWR Instead of React Query
- **Pros**: Smaller bundle, simpler API
- **Cons**: Less features, weaker TypeScript support
- **Decision**: React Query for richer feature set

### 2. Redux Toolkit Query
- **Pros**: Integrated with Redux if using
- **Cons**: Requires Redux, more boilerplate
- **Decision**: Not using Redux, so unnecessary

### 3. Custom Solution
- **Pros**: Full control, minimal dependencies
- **Cons**: Reinventing the wheel, maintenance burden
- **Decision**: Use battle-tested library

## Conclusion

Implementing a central API service layer will significantly improve the maintainability, performance, and user experience of the Duncan UI application. The investment in setting up this infrastructure will pay dividends as the application grows and evolves.

The phased approach ensures minimal disruption to ongoing development while delivering incremental value. With proper testing and documentation, this migration will establish a solid foundation for future feature development.