import { NextRequest } from 'next/server';

export interface TestRequestOptions {
  method?: string;
  body?: any;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
}

export function createTestRequest(url: string, options: TestRequestOptions = {}): NextRequest {
  const { method = 'GET', body, searchParams, headers } = options;

  // Build URL with search params
  const fullUrl = new URL(url, 'http://localhost:3000');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl.toString(), requestInit);
}