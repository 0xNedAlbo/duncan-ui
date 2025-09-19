/**
 * Central API Client
 *
 * Provides unified HTTP client with authentication, error handling,
 * retries, interceptors, and request cancellation
 */

import { getSession } from "next-auth/react";
import { ApiError, ApiErrorCode } from "./apiError";

// Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: {
        requestedAt: string;
        [key: string]: any;
    };
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    skipAuth?: boolean;
    params?: Record<string, any>;
    body?: any;
}

export interface ApiClientConfig {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    skipAuthForRoutes?: string[];
}

// Interceptor types
export type RequestInterceptor = (
    // eslint-disable-next-line no-unused-vars
    url: string,
    // eslint-disable-next-line no-unused-vars
    options: RequestInit
) =>
    | Promise<{ url: string; options: RequestInit }>
    | { url: string; options: RequestInit };

export type ResponseInterceptor = (
    // eslint-disable-next-line no-unused-vars
    response: Response,
    // eslint-disable-next-line no-unused-vars
    url: string,
    // eslint-disable-next-line no-unused-vars
    options: RequestInit
) => Promise<Response> | Response;

export type ErrorInterceptor = (
    // eslint-disable-next-line no-unused-vars
    error: ApiError,
    // eslint-disable-next-line no-unused-vars
    url: string,
    // eslint-disable-next-line no-unused-vars
    options: RequestInit
) => Promise<ApiError> | ApiError;

/**
 * Central API Client Class
 */
export class ApiClient {
    private config: Required<ApiClientConfig>;
    private requestInterceptors: RequestInterceptor[] = [];
    private responseInterceptors: ResponseInterceptor[] = [];
    private errorInterceptors: ErrorInterceptor[] = [];

    constructor(config: ApiClientConfig = {}) {
        this.config = {
            baseURL: config.baseURL || "",
            timeout: config.timeout || 30000, // 30 seconds
            retries: config.retries || 3,
            retryDelay: config.retryDelay || 1000, // 1 second
            skipAuthForRoutes: config.skipAuthForRoutes || ["/api/auth"],
        };
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): void {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): void {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * Add error interceptor
     */
    addErrorInterceptor(interceptor: ErrorInterceptor): void {
        this.errorInterceptors.push(interceptor);
    }

    /**
     * Get authentication headers from NextAuth session
     */
    private async getAuthHeaders(): Promise<HeadersInit> {
        try {
            const session = await getSession();
            // For session-based auth, the session cookie is automatically included
            // NextAuth sessions don't have accessToken by default, they use HTTP-only cookies
            if (session && 'accessToken' in session && session.accessToken) {
                return {
                    Authorization: `Bearer ${session.accessToken}`,
                };
            }
            // For session-based auth, the session cookie is automatically included
            return {};
        } catch (error) {
            console.warn("Failed to get auth session:", error);
            return {};
        }
    }

    /**
     * Check if route should skip authentication
     */
    private shouldSkipAuth(url: string): boolean {
        return this.config.skipAuthForRoutes.some((route) =>
            url.startsWith(route)
        );
    }

    /**
     * Build URL with query parameters
     */
    private buildUrl(endpoint: string, params?: Record<string, any>): string {
        const baseUrl = endpoint.startsWith("http")
            ? endpoint
            : `${this.config.baseURL}${endpoint}`;

        if (!params || Object.keys(params).length === 0) {
            return baseUrl;
        }

        const url = new URL(
            baseUrl,
            typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost"
        );

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });

        return url.toString();
    }

    /**
     * Apply request interceptors
     */
    private async applyRequestInterceptors(
        url: string,
        options: RequestInit
    ): Promise<{ url: string; options: RequestInit }> {
        let result = { url, options };

        for (const interceptor of this.requestInterceptors) {
            result = await interceptor(result.url, result.options);
        }

        return result;
    }

    /**
     * Apply response interceptors
     */
    private async applyResponseInterceptors(
        response: Response,
        url: string,
        options: RequestInit
    ): Promise<Response> {
        let result = response;

        for (const interceptor of this.responseInterceptors) {
            result = await interceptor(result, url, options);
        }

        return result;
    }

    /**
     * Apply error interceptors
     */
    private async applyErrorInterceptors(
        error: ApiError,
        url: string,
        options: RequestInit
    ): Promise<ApiError> {
        let result = error;

        for (const interceptor of this.errorInterceptors) {
            result = await interceptor(result, url, options);
        }

        return result;
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private getRetryDelay(attempt: number, baseDelay: number): number {
        return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
    }

    /**
     * Main request method with all features
     */
    async request<T = any>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const {
            timeout = this.config.timeout,
            retries = this.config.retries,
            retryDelay = this.config.retryDelay,
            skipAuth = false,
            params,
            body,
            ...fetchOptions
        } = options;

        // Build URL with parameters
        let url = this.buildUrl(endpoint, params);
        let requestOptions: RequestInit = {
            ...fetchOptions,
            headers: {
                "Content-Type": "application/json",
                ...fetchOptions.headers,
            },
        };

        // Add authentication headers if not skipped
        if (!skipAuth && !this.shouldSkipAuth(endpoint)) {
            const authHeaders = await this.getAuthHeaders();
            requestOptions.headers = {
                ...requestOptions.headers,
                ...authHeaders,
            };
        }

        // Serialize body if present
        if (body !== undefined) {
            if (body instanceof FormData) {
                // Remove Content-Type for FormData (browser sets it with boundary)
                const headers = { ...requestOptions.headers } as Record<
                    string,
                    string
                >;
                delete headers["Content-Type"];
                requestOptions.headers = headers;
                requestOptions.body = body;
            } else {
                requestOptions.body = JSON.stringify(body);
            }
        }

        // Apply request interceptors
        const interceptedRequest = await this.applyRequestInterceptors(
            url,
            requestOptions
        );
        url = interceptedRequest.url;
        requestOptions = interceptedRequest.options;

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        requestOptions.signal = controller.signal;

        let lastError: ApiError | undefined;

        // Retry loop
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                console.log(
                    `[API] ${requestOptions.method || "GET"} ${url}${
                        attempt > 0 ? ` (attempt ${attempt + 1})` : ""
                    }`
                );

                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);

                // Apply response interceptors
                const interceptedResponse =
                    await this.applyResponseInterceptors(
                        response,
                        url,
                        requestOptions
                    );

                // Handle HTTP errors
                if (!interceptedResponse.ok) {
                    const apiError = await ApiError.fromResponse(
                        interceptedResponse
                    );

                    // Don't retry auth errors or client errors (4xx except rate limiting)
                    if (!apiError.isRetryable() || attempt === retries) {
                        const finalError = await this.applyErrorInterceptors(
                            apiError,
                            url,
                            requestOptions
                        );
                        throw finalError;
                    }

                    lastError = apiError;

                    // Wait before retry with exponential backoff
                    if (attempt < retries) {
                        const delay = this.getRetryDelay(attempt, retryDelay);
                        console.log(
                            `[API] Retrying in ${delay}ms due to:`,
                            apiError.message
                        );
                        await this.sleep(delay);
                    }

                    continue;
                }

                // Parse response
                let responseData: any;
                const contentType =
                    interceptedResponse.headers.get("content-type");

                if (contentType?.includes("application/json")) {
                    responseData = await interceptedResponse.json();
                } else {
                    responseData = await interceptedResponse.text();
                }

                console.log(
                    `[API] ✓ ${requestOptions.method || "GET"} ${url} (${
                        interceptedResponse.status
                    })`
                );

                return responseData;
            } catch (error) {
                clearTimeout(timeoutId);

                // Convert to ApiError if not already
                const apiError =
                    error instanceof ApiError
                        ? error
                        : ApiError.fromClientError(error);

                // Don't retry non-retryable errors or on final attempt
                if (!apiError.isRetryable() || attempt === retries) {
                    const finalError = await this.applyErrorInterceptors(
                        apiError,
                        url,
                        requestOptions
                    );
                    console.error(
                        `[API] ✗ ${requestOptions.method || "GET"} ${url}:`,
                        finalError.message
                    );
                    throw finalError;
                }

                lastError = apiError;

                // Wait before retry
                if (attempt < retries) {
                    const delay = this.getRetryDelay(attempt, retryDelay);
                    console.log(
                        `[API] Retrying in ${delay}ms due to:`,
                        apiError.message
                    );
                    await this.sleep(delay);
                }
            }
        }

        // This should never be reached, but just in case
        throw (
            lastError ||
            new ApiError(
                ApiErrorCode.UNKNOWN_ERROR,
                "Request failed after all retries"
            )
        );
    }

    /**
     * Convenience methods for different HTTP verbs
     */
    async get<T = any>(
        endpoint: string,
        options: Omit<RequestOptions, "method"> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "GET" });
    }

    async post<T = any>(
        endpoint: string,
        data?: any,
        options: Omit<RequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "POST",
            body: data,
        });
    }

    async put<T = any>(
        endpoint: string,
        data?: any,
        options: Omit<RequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: data,
        });
    }

    async patch<T = any>(
        endpoint: string,
        data?: any,
        options: Omit<RequestOptions, "method" | "body"> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "PATCH",
            body: data,
        });
    }

    async delete<T = any>(
        endpoint: string,
        options: Omit<RequestOptions, "method"> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "DELETE" });
    }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient({
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    skipAuthForRoutes: ["/api/auth"],
});

// Add default logging interceptor
apiClient.addRequestInterceptor((url, options) => {
    // Log request details in development
    if (process.env.NODE_ENV === "development") {
        console.log(`[API Request] ${options.method || "GET"} ${url}`, {
            headers: options.headers,
            body: options.body,
        });
    }
    return { url, options };
});

apiClient.addResponseInterceptor((response, url, options) => {
    // Log response details in development
    if (process.env.NODE_ENV === "development") {
        console.log(
            `[API Response] ${options.method || "GET"} ${url} (${
                response.status
            })`,
            {
                headers: Object.fromEntries(response.headers.entries()),
            }
        );
    }
    return response;
});

// Add error logging interceptor
apiClient.addErrorInterceptor((error, url, options) => {
    // Log errors
    console.error(`[API Error] ${options.method || "GET"} ${url}:`, {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
    });
    return error;
});

export default apiClient;
