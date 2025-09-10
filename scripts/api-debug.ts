#!/usr/bin/env node

/**
 * DUNCAN API Debug Script
 * 
 * This script helps debug the API by managing authentication and providing
 * helper functions for common API operations.
 * 
 * Usage:
 *   npx tsx scripts/api-debug.ts
 *   
 * Environment Variables:
 *   - TEST_USER: Email for test user
 *   - TEST_PASSWORD: Password for test user
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.error('Failed to load .env.local file:', error);
    process.exit(1);
  }
}

// Load environment variables
loadEnvFile();

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_USER || !TEST_PASSWORD) {
  console.error('❌ Missing TEST_USER or TEST_PASSWORD in .env.local');
  process.exit(1);
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  headers: Record<string, string>;
}

class ApiDebugger {
  private cookies: string[] = [];
  private sessionToken?: string;

  constructor() {
    console.log(`🚀 DUNCAN API Debugger`);
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`👤 Test User: ${TEST_USER}`);
    console.log('');
  }

  /**
   * Extract cookies from response headers
   */
  private extractCookies(response: Response) {
    const setCookies = response.headers.get('set-cookie');
    if (setCookies) {
      const cookies = setCookies.split(',').map(cookie => cookie.trim());
      this.cookies = [...this.cookies, ...cookies];
      
      // Extract session token
      cookies.forEach(cookie => {
        if (cookie.includes('next-auth.session-token') || cookie.includes('__Secure-next-auth.session-token')) {
          const tokenMatch = cookie.match(/=([^;]+)/);
          if (tokenMatch) {
            this.sessionToken = tokenMatch[1];
          }
        }
      });
    }
  }

  /**
   * Get cookie header string
   */
  private getCookieHeader(): string {
    return this.cookies.map(cookie => cookie.split(';')[0]).join('; ');
  }

  /**
   * Authenticate with the API and store session
   */
  async authenticate(): Promise<boolean> {
    console.log('🔐 Authenticating...');
    
    try {
      // First, get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();
      this.extractCookies(csrfResponse);
      
      console.log(`📝 CSRF Token: ${csrfData.csrfToken}`);

      // Sign in with credentials
      const signInResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.getCookieHeader()
        },
        body: new URLSearchParams({
          email: TEST_USER,
          password: TEST_PASSWORD,
          csrfToken: csrfData.csrfToken,
          callbackUrl: BASE_URL,
          json: 'true'
        }),
        redirect: 'manual' // Don't follow redirects
      });

      this.extractCookies(signInResponse);
      
      if (signInResponse.status === 200 || signInResponse.status === 302) {
        console.log('✅ Authentication successful');
        console.log(`🍪 Session Token: ${this.sessionToken ? 'Set' : 'Not found'}`);
        return true;
      } else {
        console.log('❌ Authentication failed:', signInResponse.status);
        console.log('Response:', await signInResponse.text());
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return false;
    }
  }

  /**
   * Make authenticated API request
   */
  async apiRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': this.getCookieHeader(),
      ...options.headers
    };

    console.log(`🌐 ${options.method || 'GET'} ${endpoint}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      const result: ApiResponse<T> = {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined,
        status: response.status,
        headers: responseHeaders
      };

      // Log result
      if (result.success) {
        console.log(`✅ ${response.status} Success`);
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.log(`❌ ${response.status} Error`);
        console.log('Error:', result.error);
      }
      
      console.log(''); // Empty line for readability
      
      return result;
    } catch (error) {
      console.error(`❌ Request failed:`, error);
      console.log(''); // Empty line for readability
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 0,
        headers: {}
      };
    }
  }

  /**
   * Helper methods for common HTTP operations
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.apiRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.apiRequest<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Run example API calls for testing
   */
  async runExamples() {
    console.log('🧪 Running example API calls...\n');

    // Test session endpoint
    await this.get('/api/auth/session');

    // Test tokens endpoint
    await this.get('/api/tokens');

    // Test specific token
    await this.get('/api/tokens/ethereum/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');

    // Test positions endpoint (new Uniswap V3 route)
    await this.get('/api/positions/uniswapv3/list');

    // Test positions with pagination
    await this.get('/api/positions/uniswapv3/list?page=1&limit=10');

    console.log('🏁 Example runs completed!');
  }

  /**
   * Interactive mode for manual testing
   */
  async interactive() {
    console.log('🎮 Interactive mode - you can now call methods manually');
    console.log('Available methods:');
    console.log('  - debugger.get(endpoint)');
    console.log('  - debugger.post(endpoint, data)');
    console.log('  - debugger.put(endpoint, data)');
    console.log('  - debugger.delete(endpoint)');
    console.log('  - debugger.apiRequest(endpoint, options)');
    console.log('');
    console.log('Examples:');
    console.log('  await debugger.get("/api/tokens")');
    console.log('  await debugger.get("/api/positions/uniswapv3/list")');
    console.log('');
  }
}

/**
 * Main execution
 */
async function main() {
  const apiDebugger = new ApiDebugger();

  // Authenticate first
  const authenticated = await apiDebugger.authenticate();
  if (!authenticated) {
    console.log('❌ Failed to authenticate. Exiting.');
    process.exit(1);
  }

  console.log('');

  // Check if we should run examples or go interactive
  const args = process.argv.slice(2);
  
  if (args.includes('--examples') || args.includes('-e')) {
    await apiDebugger.runExamples();
  } else {
    await apiDebugger.interactive();
    
    // Make debugger available globally for interactive use
    (global as any).debugger = apiDebugger;
    
    // Keep process alive for interactive use
    process.stdin.resume();
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { ApiDebugger };