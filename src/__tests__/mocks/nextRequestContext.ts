/**
 * Comprehensive Next.js request context mocking
 * Solves "headers was called outside a request scope" errors
 */

import { vi } from 'vitest';

/**
 * Mock Next.js AsyncLocalStorage and request store
 */
class MockAsyncLocalStorage {
  private store: any = {};

  run<T>(store: any, callback: () => T): T {
    const oldStore = this.store;
    this.store = store;
    try {
      return callback();
    } finally {
      this.store = oldStore;
    }
  }

  getStore() {
    return this.store;
  }

  exit<T>(callback: () => T): T {
    return callback();
  }

  enterWith(store: any): void {
    this.store = store;
  }

  disable(): void {
    this.store = {};
  }
}

/**
 * Mock request store with headers and cookies
 */
const createMockRequestStore = (options: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}) => {
  const mockHeaders = new Map(Object.entries({
    'content-type': 'application/json',
    'user-agent': 'test-user-agent',
    'host': 'localhost:3000',
    'accept': 'application/json',
    ...options.headers,
  }));

  const mockCookies = new Map(Object.entries({
    'next-auth.session-token': 'mock-session-token',
    'next-auth.csrf-token': 'mock-csrf-token',
    ...options.cookies,
  }));

  return {
    headers: mockHeaders,
    cookies: mockCookies,
    // Add other request properties as needed
    url: 'http://localhost:3000',
    method: 'GET',
    nextUrl: {
      pathname: '/',
      search: '',
      hash: '',
    },
  };
};

/**
 * Global mock setup for Next.js server components and API routes
 */
export function setupNextRequestContextMocks() {
  const mockAsyncLocalStorage = new MockAsyncLocalStorage();
  const mockRequestStore = createMockRequestStore();

  // Initialize the store
  mockAsyncLocalStorage.enterWith(mockRequestStore);

  // Mock the Next.js server request storage
  vi.mock('next/dist/server/app-render/work-unit-async-storage.external', () => ({
    workUnitAsyncStorage: mockAsyncLocalStorage,
    workAsyncStorage: mockAsyncLocalStorage,
  }));

  // Mock next/headers
  vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
      const store = mockAsyncLocalStorage.getStore();
      if (!store?.headers) {
        // Return a default headers object if no store
        const defaultHeaders = new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'test-user-agent'],
        ]);
        
        return {
          get: vi.fn((key: string) => defaultHeaders.get(key) || null),
          has: vi.fn((key: string) => defaultHeaders.has(key)),
          entries: vi.fn(() => defaultHeaders.entries()),
          forEach: vi.fn((callback: (value: string, key: string) => void) => {
            defaultHeaders.forEach(callback);
          }),
          keys: vi.fn(() => defaultHeaders.keys()),
          values: vi.fn(() => defaultHeaders.values()),
          [Symbol.iterator]: vi.fn(() => defaultHeaders[Symbol.iterator]()),
        };
      }
      
      return {
        get: vi.fn((key: string) => store.headers.get(key) || null),
        has: vi.fn((key: string) => store.headers.has(key)),
        entries: vi.fn(() => store.headers.entries()),
        forEach: vi.fn((callback: (value: string, key: string) => void) => {
          store.headers.forEach(callback);
        }),
        keys: vi.fn(() => store.headers.keys()),
        values: vi.fn(() => store.headers.values()),
        [Symbol.iterator]: vi.fn(() => store.headers[Symbol.iterator]()),
      };
    }),

    cookies: vi.fn(() => {
      const store = mockAsyncLocalStorage.getStore();
      if (!store?.cookies) {
        // Return empty cookies if no store
        const defaultCookies = new Map();
        
        return {
          get: vi.fn(() => undefined),
          has: vi.fn(() => false),
          getAll: vi.fn(() => []),
          set: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          [Symbol.iterator]: vi.fn(() => defaultCookies[Symbol.iterator]()),
        };
      }

      return {
        get: vi.fn((key: string) => {
          const value = store.cookies.get(key);
          return value ? { name: key, value } : undefined;
        }),
        has: vi.fn((key: string) => store.cookies.has(key)),
        getAll: vi.fn(() => {
          return Array.from(store.cookies.entries()).map(([name, value]) => ({ name, value }));
        }),
        set: vi.fn((key: string, value: string) => {
          store.cookies.set(key, value);
        }),
        delete: vi.fn((key: string) => {
          store.cookies.delete(key);
        }),
        clear: vi.fn(() => {
          store.cookies.clear();
        }),
        [Symbol.iterator]: vi.fn(() => store.cookies[Symbol.iterator]()),
      };
    }),

    // Mock other Next.js headers functions
    draftMode: vi.fn(() => ({
      isEnabled: false,
      enable: vi.fn(),
      disable: vi.fn(),
    })),

    notFound: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),

    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT: ${url}`);
    }),
  }));

  // Mock NextAuth getServerSession to use mocked headers
  vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn((authOptions?: any) => {
      // Return a mock session that doesn't rely on headers
      return Promise.resolve({
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }),
  }));

  return {
    mockAsyncLocalStorage,
    setRequestContext: (options: {
      headers?: Record<string, string>;
      cookies?: Record<string, string>;
      method?: string;
      url?: string;
    } = {}) => {
      const newStore = createMockRequestStore(options);
      mockAsyncLocalStorage.enterWith(newStore);
    },
    getRequestContext: () => mockAsyncLocalStorage.getStore(),
  };
}

/**
 * Setup auth-specific mocks that work with the request context
 */
export function setupAuthContextMocks() {
  // Mock @/lib/auth
  vi.mock('@/lib/auth', () => ({
    authOptions: {
      providers: [],
      callbacks: {},
      pages: {},
    },
    getSession: vi.fn(() => {
      return Promise.resolve({
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }),
  }));
}

/**
 * Complete setup for API route testing
 */
export function setupApiRouteTestEnvironment() {
  const requestContext = setupNextRequestContextMocks();
  setupAuthContextMocks();
  
  return {
    ...requestContext,
    cleanup: () => {
      vi.clearAllMocks();
    },
  };
}

/**
 * Setup for specific test that needs custom auth session
 */
export function mockAuthSession(session: any) {
  // Re-mock getServerSession with custom session
  vi.mocked(vi.importActual('next-auth/next')).getServerSession = vi.fn(() => 
    Promise.resolve(session)
  );
}

/**
 * Utility to run a test within request context
 */
export async function withRequestContext<T>(
  options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    method?: string;
    url?: string;
  },
  callback: () => Promise<T>
): Promise<T> {
  const { mockAsyncLocalStorage } = setupNextRequestContextMocks();
  const store = createMockRequestStore(options);
  
  return mockAsyncLocalStorage.run(store, callback);
}