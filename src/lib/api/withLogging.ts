/* eslint-disable no-unused-vars */
/**
 * API Route Logging Wrapper
 *
 * Higher-order function that adds structured logging to Next.js API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { beginRequestLog } from "./httpLogger";
import type { Logger } from "./logger";
import type { AuthUser } from "@/lib/auth/getAuthUser";

export interface LoggingContext {
    log: Logger;
    reqId: string;
}

export type ApiHandler<T = any> = (
    request: NextRequest,
    context: LoggingContext,
    params?: any
) => Promise<NextResponse<T>>;

import type { NextRouteContext } from './types';

/**
 * Wrap an API route handler with structured logging
 *
 * @param handler - The API route handler function
 * @param authUser - Optional authenticated user for access logging
 * @returns Wrapped handler with logging capabilities
 */
export function withLogging<T = any>(
    handler: ApiHandler<T>,
    authUser?: AuthUser
): (request: NextRequest, context: NextRouteContext) => Promise<NextResponse<T>> {
    return async (request: NextRequest, context: NextRouteContext) => {
        const { reqId, headers, access, log } = beginRequestLog(request, authUser);

        try {
            // Log incoming request
            log.debug(
                {
                    method: request.method,
                    url: new URL(request.url).pathname,
                    headers,
                },
                "Incoming API request"
            );

            // Resolve params (Next.js 15 pattern - always a promise)
            const resolvedParams = await context.params;

            // Execute the handler
            const response = await handler(
                request,
                { log, reqId },
                resolvedParams
            );

            // Log access line with actual status code
            access(response.status);

            // Log successful response
            log.debug(
                {
                    statusCode: response.status,
                },
                "API request completed successfully"
            );

            // Add request ID header to response
            const newHeaders = new Headers(response.headers);
            newHeaders.set('x-request-id', reqId);

            return new NextResponse(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        } catch (error) {
            // Log error with full stack trace in DEBUG level
            log.debug(
                {
                    error: error instanceof Error ? error.stack : String(error),
                },
                "Service error in API handler"
            );

            // Log access for error case
            access(500);

            // Return generic error response
            return new NextResponse(
                JSON.stringify({ error: "Internal server error" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "x-request-id": reqId,
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
