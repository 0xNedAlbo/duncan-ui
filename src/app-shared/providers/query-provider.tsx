/**
 * React Query Provider
 * 
 * Provides React Query client configuration and DevTools
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { ApiError } from '@/app-shared/lib/api-client/apiError';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Create a new QueryClient with optimized defaults
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Global query options
        retry: (failureCount, error) => {
          // Don't retry on auth errors or client errors
          if (error instanceof ApiError) {
            if (!error.isRetryable()) {
              return false;
            }
          }
          // Retry up to 3 times for retryable errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s
          return Math.min(1000 * 2 ** attemptIndex, 30000);
        },
        
        // Cache and stale time
        staleTime: 10 * 1000, // 10 seconds - consider data fresh for this long
        gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache (formerly cacheTime)
        
        // Background refetching
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: true, // Refetch when component mounts
        refetchOnReconnect: true, // Refetch when network reconnects
        
        // Error handling
        throwOnError: false, // Don't throw errors, handle them in components
        
        // Network mode
        networkMode: 'online', // Only fetch when online
      },
      mutations: {
        // Global mutation options
        retry: (failureCount, error) => {
          // Don't retry mutations on auth errors
          if (error instanceof ApiError && error.isAuthError()) {
            return false;
          }
          // Retry once for network errors
          return failureCount < 1;
        },
        retryDelay: 1000, // 1 second delay for mutation retries
        
        // Error handling
        throwOnError: false, // Handle errors in components
        
        // Network mode
        networkMode: 'online',
      },
    },
    
    // Query cache configuration
    queryCache: undefined, // Use default query cache
    mutationCache: undefined, // Use default mutation cache
    
    // Note: logger configuration was removed as it's deprecated in React Query v5
  });
}

/**
 * Query Provider Component
 * 
 * Wraps the application with React Query client and provides DevTools in development
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create a stable QueryClient instance
  // Using useState to ensure the client is only created once
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

/**
 * Get the current QueryClient instance
 * 
 * This can be used in server-side code or for advanced use cases
 */
export function getQueryClient(): QueryClient {
  return createQueryClient();
}

/**
 * Query Client Error Handler
 * 
 * Global error handler for React Query errors
 */
export function handleQueryError(error: unknown): void {
  if (error instanceof ApiError) {
    // Handle API errors
    switch (error.code) {
      case 'UNAUTHORIZED':
        // Redirect to login or show auth modal
        console.warn('User unauthorized, consider redirecting to login');
        break;
      case 'NETWORK_ERROR':
        // Show network error toast
        console.warn('Network error occurred');
        break;
      case 'RATE_LIMITED':
        // Show rate limit warning
        console.warn('Rate limited, please wait');
        break;
      default:
        // Log other API errors
        console.error('API Error:', error.getUserMessage());
    }
  } else {
    // Handle non-API errors
    console.error('Unexpected error:', error);
  }
}

/**
 * Query Client Configuration for Testing
 * 
 * Creates a query client optimized for testing environments
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry in tests
        staleTime: 0, // Always consider stale in tests
        gcTime: 0, // Don't cache in tests
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        networkMode: 'offlineFirst', // Work offline in tests
      },
      mutations: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
    // Note: logger configuration was removed as it's deprecated in React Query v5
  });
}