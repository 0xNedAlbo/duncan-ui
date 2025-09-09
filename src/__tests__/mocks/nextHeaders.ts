/**
 * Mock Next.js headers and cookies for testing
 * Fixes "headers was called outside a request scope" errors
 */

import { vi } from 'vitest';

/**
 * Mock headers object
 */
export const mockHeaders = new Map([
  ['content-type', 'application/json'],
  ['user-agent', 'test-user-agent'],
  ['host', 'localhost:3000'],
  ['accept', 'application/json'],
]);

/**
 * Mock cookies object
 */
export const mockCookies = new Map([
  ['next-auth.session-token', 'mock-session-token'],
  ['next-auth.csrf-token', 'mock-csrf-token'],
]);

/**
 * Setup Next.js headers and cookies mocks
 */
export function setupNextHeadersMocks() {
  // Mock next/headers
  vi.mock('next/headers', () => ({
    headers: vi.fn(() => {
      return {
        get: vi.fn((key: string) => mockHeaders.get(key) || null),
        has: vi.fn((key: string) => mockHeaders.has(key)),
        entries: vi.fn(() => mockHeaders.entries()),
        forEach: vi.fn((callback: (value: string, key: string) => void) => {
          mockHeaders.forEach(callback);
        }),
        keys: vi.fn(() => mockHeaders.keys()),
        values: vi.fn(() => mockHeaders.values()),
        [Symbol.iterator]: vi.fn(() => mockHeaders[Symbol.iterator]()),
      };
    }),
    
    cookies: vi.fn(() => {
      return {
        get: vi.fn((key: string) => {
          const value = mockCookies.get(key);
          return value ? { name: key, value } : undefined;
        }),
        has: vi.fn((key: string) => mockCookies.has(key)),
        getAll: vi.fn(() => {
          return Array.from(mockCookies.entries()).map(([name, value]) => ({ name, value }));
        }),
        set: vi.fn((key: string, value: string) => {
          mockCookies.set(key, value);
        }),
        delete: vi.fn((key: string) => {
          mockCookies.delete(key);
        }),
        clear: vi.fn(() => {
          mockCookies.clear();
        }),
        [Symbol.iterator]: vi.fn(() => mockCookies[Symbol.iterator]()),
      };
    }),
  }));
}

/**
 * Setup NextAuth session mocks
 * This mocks getServerSession to avoid header context issues
 */
export function setupNextAuthMocks() {
  // Mock next-auth/next
  vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(() => {
      return Promise.resolve({
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      });
    }),
  }));

  // Also mock the auth config if needed
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
 * Create a mock request object with headers
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) {
  const {
    method = 'GET',
    url = 'http://localhost:3000',
    headers = {},
    body = null,
  } = options;

  return {
    method,
    url,
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      'user-agent': 'test-user-agent',
      ...headers,
    })),
    body,
    json: vi.fn(() => Promise.resolve(body)),
    text: vi.fn(() => Promise.resolve(JSON.stringify(body))),
  };
}

/**
 * Create a mock response object
 */
export function createMockResponse(data: any = {}, options: {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
} = {}) {
  const {
    status = 200,
    statusText = 'OK',
    headers = {},
  } = options;

  return {
    status,
    statusText,
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      ...headers,
    })),
    json: vi.fn(() => Promise.resolve(data)),
    text: vi.fn(() => Promise.resolve(JSON.stringify(data))),
    ok: status >= 200 && status < 300,
  };
}

/**
 * Setup complete mock environment for API route testing
 */
export function setupApiTestEnvironment() {
  setupNextHeadersMocks();
  setupNextAuthMocks();
  
  // Mock console to reduce test noise
  const originalConsoleError = console.error;
  console.error = vi.fn();
  
  return {
    cleanup: () => {
      console.error = originalConsoleError;
      vi.clearAllMocks();
    },
  };
}

/**
 * Utility to set custom headers for tests
 */
export function setMockHeaders(headers: Record<string, string>) {
  mockHeaders.clear();
  Object.entries(headers).forEach(([key, value]) => {
    mockHeaders.set(key, value);
  });
}

/**
 * Utility to set custom cookies for tests
 */
export function setMockCookies(cookies: Record<string, string>) {
  mockCookies.clear();
  Object.entries(cookies).forEach(([key, value]) => {
    mockCookies.set(key, value);
  });
}

/**
 * Reset all mocks to default state
 */
export function resetAllMocks() {
  mockHeaders.clear();
  mockCookies.clear();
  
  // Reset to default headers
  setMockHeaders({
    'content-type': 'application/json',
    'user-agent': 'test-user-agent',
    'host': 'localhost:3000',
    'accept': 'application/json',
  });
  
  // Reset to default cookies
  setMockCookies({
    'next-auth.session-token': 'mock-session-token',
    'next-auth.csrf-token': 'mock-csrf-token',
  });
}