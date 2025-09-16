/* eslint-disable no-unused-vars */
/**
 * API Route Logging Wrapper
 *
 * Higher-order function that adds structured logging to Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { initRequestLogging } from "./httpLogger";
import type { Logger } from "./logger";

export interface LoggingContext {
    log: Logger;
    reqId: string;
}

export type ApiHandler<T = any> = (
    request: NextRequest,
    context: LoggingContext,
    params?: any
) => Promise<NextResponse<T>>;

export type RouteParams = {
    params?: Promise<any> | any;
};

/**
 * Wrap an API route handler with structured logging
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with logging capabilities
 */
export function withLogging<T = any>(
    handler: ApiHandler<T>
): (request: NextRequest, context?: RouteParams) => Promise<NextResponse<T>> {
    return async (request: NextRequest, context?: RouteParams) => {
        const { reqId, log, logAccess } = initRequestLogging(request);

        const startTime = Date.now();
        let statusCode = 200;

        try {
            // Log incoming request
            log.debug(
                {
                    method: request.method,
                    url: new URL(request.url).pathname,
                    headers: Object.fromEntries(request.headers.entries()),
                },
                "Incoming API request"
            );

            // Resolve params if they're a promise (Next.js 15 pattern)
            const resolvedParams =
                context?.params && typeof context.params.then === "function"
                    ? await context.params
                    : context?.params;

            // Execute the handler
            const response = await handler(
                request,
                { log, reqId },
                resolvedParams
            );

            statusCode = response.status;

            // Log successful response
            log.debug(
                {
                    statusCode,
                    responseTime: Date.now() - startTime,
                },
                "API request completed successfully"
            );

            // Create response with request ID header
            const headers = logAccess(statusCode);
            const newHeaders = new Headers(response.headers);
            headers.forEach((value: any, key: any) => {
                newHeaders.set(key, value);
            });

            return new NextResponse(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        } catch (error) {
            statusCode = 500;

            // Log error with full stack trace in DEBUG level
            log.debug(
                {
                    error: error instanceof Error ? error.stack : String(error),
                    responseTime: Date.now() - startTime,
                },
                "Service error in API handler"
            );

            // Log access for error case
            const headers = logAccess(statusCode);

            // Return generic error response
            return new NextResponse(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: statusCode,
                    headers: {
                        "Content-Type": "application/json",
                        ...Object.fromEntries(headers.entries()),
                    },
                }
            );
        }
    };
}

/**
 * Utility function for manual error logging in handlers
 *
 * Use this when you want to log specific errors but handle them differently
 */
export function logError(
    log: Logger,
    error: unknown,
    context?: Record<string, any>
) {
    log.debug(
        {
            error: error instanceof Error ? error.stack : String(error),
            ...context,
        },
        "Service error logged manually"
    );
}
