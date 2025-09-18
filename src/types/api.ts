/**
 * API Types Definition
 * 
 * Shared types for API requests and responses across the application
 */

import type { BasicPosition } from '@/services/positions/positionService';
import type { ParsedNFTPosition } from '@/services/uniswap/nftPosition';
import type { PnlBreakdown } from '@/services/positions/positionPnLService';
import type { AprBreakdown } from '@/services/positions/positionAprService';
import type { CurveData } from '@/components/charts/mini-pnl-curve';

// Enhanced position interface for API responses (includes PnL data)
export interface PositionWithPnL extends BasicPosition {
  initialValue: string;
  currentValue: string;
  unrealizedPnL: string;
  realizedPnL: string;
  totalPnL: string;
  feesCollected0: string;
  feesCollected1: string;
  feeValueInQuote: string;
}

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

// Sorting and filtering
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  status?: 'active' | 'closed' | 'archived';
  chain?: string;
}

// Position API Types
export type PositionListParams = PaginationParams & SortParams & FilterParams;

export interface PositionListData {
  positions: BasicPosition[];
  pagination: PaginationResponse;
}

// Position Events API Types
export interface PositionEvent {
  id: string;
  eventType: 'CREATE' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'CLOSE';
  timestamp: string; // ISO string
  blockNumber: number;
  transactionHash: string;
  liquidityDelta: string; // BigInt as string
  token0Delta: string; // BigInt as string
  token1Delta: string; // BigInt as string
  collectedFee0?: string; // BigInt as string, COLLECT events only
  collectedFee1?: string; // BigInt as string, COLLECT events only
  poolPrice: string; // BigInt as string
  tick: number;
  valueInQuote: string; // BigInt as string
  feeValueInQuote?: string; // BigInt as string, COLLECT events only
  source: 'subgraph' | 'onchain' | 'manual';
  confidence: 'exact' | 'estimated';
  createdAt: string; // ISO string
}

export interface PositionEventsParams extends PaginationParams {
  eventType?: PositionEvent['eventType'];
  sortOrder?: 'asc' | 'desc';
}

export interface PositionEventsData {
  events: PositionEvent[];
  pagination: PaginationResponse;
}

export interface PositionEventsResponse extends ApiResponse<PositionEventsData> {
  meta: {
    requestedAt: string;
    protocol: 'uniswapv3';
    chain: string;
    nftId: string;
    filters: {
      eventType: string | null;
      sortOrder: string;
    };
  };
}

export interface PositionListResponse extends ApiResponse<PositionListData> {
  meta: {
    requestedAt: string;
    filters: {
      status: string;
      chain: string | null;
      sortBy: string;
      sortOrder: string;
    };
    dataQuality: {
      subgraphPositions: number;
      snapshotPositions: number;
      upgradedPositions: number;
    };
  };
}

export interface PositionDetailsResponse extends ApiResponse<PositionWithPnL> {
  data?: PositionWithPnL;
}

export interface PositionRefreshResponse extends ApiResponse<{ position: BasicPosition | null; pnlBreakdown: PnlBreakdown; aprBreakdown?: AprBreakdown; curveData?: CurveData }> {
  meta: {
    requestedAt: string;
    positionId: string;
    refreshedAt: string;
  };
}

export interface PositionPnlResponse extends ApiResponse<PnlBreakdown> {
  meta: {
    requestedAt: string;
    positionId: string;
  };
}

// NFT Import Types
export interface ImportNFTRequest {
  chain: string;
  nftId: string;
}

export interface ImportNFTResponse extends ApiResponse<{ position: ParsedNFTPosition }> {
  position?: ParsedNFTPosition; // Legacy field for backward compatibility
  meta: {
    requestedAt: string;
    chain: string;
    nftId: string;
    dataSource: string;
  };
}

// Token API Types
export interface TokenSearchParams {
  query: string;
  chain?: string;
  limit?: number;
}

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  verified?: boolean;
  chainId: number;
}

export interface TokenSearchResponse extends ApiResponse<TokenData[]> {
  meta: {
    requestedAt: string;
    query: string;
    chain?: string;
    resultCount: number;
  };
}

export interface TokenBatchRequest {
  addresses: string[];
  chain: string;
}

export interface TokenBatchResponse extends ApiResponse<TokenData[]> {
  meta: {
    requestedAt: string;
    chain: string;
    requestedAddresses: string[];
    foundCount: number;
    notFoundAddresses: string[];
  };
}

export interface TokenDetailsResponse extends ApiResponse<TokenData> {
  data?: TokenData;
}

// Authentication API Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse extends ApiResponse<{ message: string }> {
  data?: { message: string };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<{ message: string }> {
  data?: { message: string };
}

// User API Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse extends ApiResponse<UserProfile> {
  data?: UserProfile;
}

export interface UpdateUserProfileRequest {
  name?: string;
  email?: string;
}

export interface UpdateUserProfileResponse extends ApiResponse<UserProfile> {
  data?: UserProfile;
}

// Settings API Types
export interface UserSettings {
  language: 'en' | 'de';
  theme: 'dark' | 'light';
  notifications: {
    email: boolean;
    browser: boolean;
    positionAlerts: boolean;
  };
  defaultChain: string;
  defaultCurrency: string;
}

export interface UserSettingsResponse extends ApiResponse<UserSettings> {
  data?: UserSettings;
}

export type UpdateUserSettingsRequest = Partial<UserSettings>;

export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {
  data?: UserSettings;
}

// Error response types
export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  details?: ValidationError | ValidationError[];
  data?: never;
}

// Query keys for React Query
export const QUERY_KEYS = {
  // Positions
  positions: ['positions'] as const,
  positionsList: (params: PositionListParams) => ['positions', 'list', params] as const,
  positionDetails: (id: string) => ['positions', 'details', id] as const,
  positionEvents: (chain: string, nftId: string, params: PositionEventsParams) => 
    ['positions', 'events', chain, nftId, params] as const,
  
  // Tokens
  tokens: ['tokens'] as const,
  tokenSearch: (params: TokenSearchParams) => ['tokens', 'search', params] as const,
  tokenBatch: (addresses: string[], chain: string) => ['tokens', 'batch', addresses, chain] as const,
  tokenDetails: (address: string, chain: string) => ['tokens', 'details', address, chain] as const,
  
  // User
  user: ['user'] as const,
  userProfile: ['user', 'profile'] as const,
  userSettings: ['user', 'settings'] as const,
} as const;

// Mutation keys for React Query
export const MUTATION_KEYS = {
  // Positions
  importNFT: ['positions', 'import-nft'] as const,
  refreshPosition: ['positions', 'refresh'] as const,
  
  // Authentication
  register: ['auth', 'register'] as const,
  login: ['auth', 'login'] as const,
  logout: ['auth', 'logout'] as const,
  
  // User
  updateProfile: ['user', 'update-profile'] as const,
  updateSettings: ['user', 'update-settings'] as const,
} as const;

// React Query options
export const QUERY_OPTIONS = {
  // Position queries
  positions: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  positionDetails: {
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
  positionEvents: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Token queries
  tokenSearch: {
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
  tokenDetails: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // User queries
  userProfile: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  userSettings: {
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
} as const;