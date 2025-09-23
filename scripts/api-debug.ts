#!/usr/bin/env node

/**
 * DUNCAN API Debug Script
 *
 * This script helps debug the API by using API key authentication and providing
 * helper functions for common API operations.
 *
 * Usage:
 *   npx tsx scripts/debug/api-debug.ts
 *
 * Uses hardcoded API key for test@testmann.kk user
 */

import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
function loadEnvFile() {
    try {
        const envPath = join(process.cwd(), ".env.local");
        const envContent = readFileSync(envPath, "utf8");

        envContent.split("\n").forEach((line) => {
            const [key, ...valueParts] = line.split("=");
            if (key && valueParts.length > 0) {
                const value = valueParts
                    .join("=")
                    .replace(/^["'](.*)["']$/, "$1");
                process.env[key.trim()] = value.trim();
            }
        });
    } catch (error) {
        console.error("Failed to load .env.local file:", error);
        process.exit(1);
    }
}

// Load environment variables
loadEnvFile();

const DEFAULT_BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// Hardcoded API key for test user (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
const API_KEY = "ak_live_052M-swUT3I8JMIhibi0wwUG1lS5Kt6hhQMo7gUHPUM";

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    status: number;
    headers: Record<string, string>;
}

class ApiDebugger {
    private apiKey: string;
    private baseUrl: string;

    constructor(baseUrl?: string) {
        this.apiKey = API_KEY;
        this.baseUrl = baseUrl || DEFAULT_BASE_URL;
        console.log(`🚀 DUNCAN API Debugger`);
        console.log(`📍 Base URL: ${this.baseUrl}`);
        console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
        console.log("");
    }

    /**
     * Authenticate using API key - no actual authentication needed
     */
    async authenticate(): Promise<boolean> {
        console.log("🔑 Using API key authentication...");
        console.log("✅ Ready to make API requests");
        return true;
    }

    /**
     * Make authenticated API request using API key
     */
    async apiRequest<T = any>(
        urlOrEndpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        // Determine if input is a full URL or just an endpoint
        const url = this.buildUrl(urlOrEndpoint);
        const displayPath = this.getDisplayPath(urlOrEndpoint);

        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...options.headers,
        };

        console.log(`🌐 ${options.method || "GET"} ${displayPath}`);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            let data: T;
            const contentType = response.headers.get("content-type");

            if (contentType?.includes("application/json")) {
                data = await response.json();
            } else {
                data = (await response.text()) as any;
            }

            const result: ApiResponse<T> = {
                success: response.ok,
                data: response.ok ? data : undefined,
                error: !response.ok
                    ? typeof data === "string"
                        ? data
                        : JSON.stringify(data)
                    : undefined,
                status: response.status,
                headers: responseHeaders,
            };

            // Log result
            if (result.success) {
                console.log(`✅ ${response.status} Success`);
                console.log("Response:", JSON.stringify(data, null, 2));
            } else {
                console.log(`❌ ${response.status} Error`);
                console.log("Error:", result.error);
            }

            console.log(""); // Empty line for readability

            return result;
        } catch (error) {
            console.error(`❌ Request failed:`, error);
            console.log(""); // Empty line for readability

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                status: 0,
                headers: {},
            };
        }
    }

    /**
     * Build full URL from endpoint or return URL if already full
     */
    private buildUrl(urlOrEndpoint: string): string {
        // Check if it's already a full URL
        if (
            urlOrEndpoint.startsWith("http://") ||
            urlOrEndpoint.startsWith("https://")
        ) {
            return urlOrEndpoint;
        }

        // It's an endpoint, prepend base URL
        return `${this.baseUrl}${
            urlOrEndpoint.startsWith("/") ? "" : "/"
        }${urlOrEndpoint}`;
    }

    /**
     * Get display path for logging (show full URL for external, path for local)
     */
    private getDisplayPath(urlOrEndpoint: string): string {
        if (
            urlOrEndpoint.startsWith("http://") ||
            urlOrEndpoint.startsWith("https://")
        ) {
            // For full URLs, show the full URL
            return urlOrEndpoint;
        }

        // For endpoints, show just the path
        return urlOrEndpoint.startsWith("/")
            ? urlOrEndpoint
            : `/${urlOrEndpoint}`;
    }

    /**
     * Helper methods for common HTTP operations
     */
    async get<T = any>(urlOrEndpoint: string): Promise<ApiResponse<T>> {
        return this.apiRequest<T>(urlOrEndpoint, { method: "GET" });
    }

    async post<T = any>(
        urlOrEndpoint: string,
        data?: any
    ): Promise<ApiResponse<T>> {
        return this.apiRequest<T>(urlOrEndpoint, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T = any>(
        urlOrEndpoint: string,
        data?: any
    ): Promise<ApiResponse<T>> {
        return this.apiRequest<T>(urlOrEndpoint, {
            method: "PUT",
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T = any>(urlOrEndpoint: string): Promise<ApiResponse<T>> {
        return this.apiRequest<T>(urlOrEndpoint, { method: "DELETE" });
    }

    /**
     * Run example API calls for testing
     */
    async runExamples() {
        console.log("🧪 Running example API calls...\n");

        // Test health endpoint
        await this.get("/api/health");

        // Test positions endpoint (new Uniswap V3 route)
        await this.get("/api/positions/uniswapv3/list");

        // Test positions with pagination
        await this.get("/api/positions/uniswapv3/list?page=1&limit=10");

        console.log("🏁 Example runs completed!");
    }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]) {
    const parsed: {
        method?: string;
        endpoint?: string;
        body?: any;
        examples?: boolean;
        help?: boolean;
        baseUrl?: string;
    } = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--method":
            case "-m":
                parsed.method = args[++i]?.toUpperCase();
                break;
            case "--endpoint":
            case "--url":
            case "-e":
            case "-u":
                parsed.endpoint = args[++i];
                break;
            case "--body":
            case "-b":
                try {
                    parsed.body = JSON.parse(args[++i]);
                } catch {
                    console.error("❌ Invalid JSON body provided");
                    process.exit(1);
                }
                break;
            case "--base-url":
            case "--base":
                parsed.baseUrl = args[++i];
                break;
            case "--examples":
                parsed.examples = true;
                break;
            case "--help":
            case "-h":
                parsed.help = true;
                break;
        }
    }

    return parsed;
}

/**
 * Show help message
 */
function showHelp() {
    console.log(`
🚀 DUNCAN API Debugger

Usage:
  npx tsx scripts/debug/api-debug.ts [options]

Options:
  -m, --method <METHOD>     HTTP method (GET, POST, PUT, DELETE)
  -e, --endpoint <PATH>     API endpoint path (e.g., /api/positions/uniswapv3/list)
  -u, --url <URL>          Full URL (e.g., http://localhost:3001/api/tokens)
  -b, --body <JSON>         Request body as JSON string
  --base-url <URL>          Base URL for endpoints (default: NEXTAUTH_URL or http://localhost:3000)
  --examples                Run predefined example calls
  -h, --help                Show this help message

Examples:
  # GET request to local endpoint
  npx tsx scripts/debug/api-debug.ts -m GET -e "/api/positions/uniswapv3/list"

  # GET request to different port
  npx tsx scripts/debug/api-debug.ts -m GET -u "http://localhost:3001/api/positions/uniswapv3/list"

  # GET request to remote server
  npx tsx scripts/debug/api-debug.ts -m GET -u "https://api.example.com/api/positions/uniswapv3/list"

  # GET with query parameters
  npx tsx scripts/debug/api-debug.ts -m GET -e "/api/positions/uniswapv3/list?limit=5&chain=ethereum"

  # POST request with body to remote URL
  npx tsx scripts/debug/api-debug.ts -m POST -u "https://api.example.com/api/positions/uniswapv3/list" -b '{"chain":"ethereum"}'

  # Using custom base URL for multiple endpoints
  npx tsx scripts/debug/api-debug.ts --base-url "http://localhost:3001" -m GET -e "/api/positions/uniswapv3/list"

  # Run examples
  npx tsx scripts/debug/api-debug.ts --examples

`);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const parsed = parseArgs(args);

    if (parsed.help) {
        showHelp();
        return;
    }

    const apiDebugger = new ApiDebugger(parsed.baseUrl);

    // Authenticate first
    const authenticated = await apiDebugger.authenticate();
    if (!authenticated) {
        console.log("❌ Failed to authenticate. Exiting.");
        process.exit(1);
    }

    console.log("");

    if (parsed.examples) {
        await apiDebugger.runExamples();
    } else if (parsed.method && parsed.endpoint) {
        // Command line mode with method and endpoint
        let result;

        switch (parsed.method) {
            case "GET":
                result = await apiDebugger.get(parsed.endpoint);
                break;
            case "POST":
                result = await apiDebugger.post(parsed.endpoint, parsed.body);
                break;
            case "PUT":
                result = await apiDebugger.put(parsed.endpoint, parsed.body);
                break;
            case "DELETE":
                result = await apiDebugger.delete(parsed.endpoint);
                break;
            default:
                console.error(`❌ Unsupported method: ${parsed.method}`);
                console.error("Supported methods: GET, POST, PUT, DELETE");
                process.exit(1);
        }

        // Output result as JSON for script automation
        console.log("=== SCRIPT OUTPUT ===");
        if (result.success) {
            console.log(JSON.stringify(result.data, null, 2));
        } else {
            console.error(JSON.stringify({ error: result.error }, null, 2));
            process.exit(1);
        }
    } else {
        // Default: show help and exit
        console.log(
            "❌ Please specify either --examples or provide --method and --endpoint"
        );
        console.log("Use --help for usage information.");
        process.exit(1);
    }
}

// Only run main if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

export { ApiDebugger };
