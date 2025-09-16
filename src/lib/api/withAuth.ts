/**
 * API Route Authentication Wrapper
 *
 * Higher-order function that adds authentication to Next.js API routes
 * Similar to withLogging but focused on authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, type AuthUser } from '@/lib/auth/getAuthUser';

export interface AuthContext {
    user: AuthUser;
}

export interface AuthLoggingContext {
    user: AuthUser;
    log: any; // Logger type from withLogging
}

export type AuthenticatedApiHandler<T = any> = (
    request: NextRequest,
    context: AuthContext,
    params?: any
) => Promise<NextResponse<T>>;

export type AuthenticatedLoggingApiHandler<T = any> = (
    request: NextRequest,
    context: AuthLoggingContext,
    params?: any
) => Promise<NextResponse<T>>;

export type RouteParams = {
    params?: Promise<any> | any;
};

/**
 * Wrap an API route handler with authentication
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = any>(
    handler: AuthenticatedApiHandler<T>
): (request: NextRequest, context?: RouteParams) => Promise<NextResponse<T>> {
    return async (request: NextRequest, context?: RouteParams) => {
        try {
            // Check authentication (supports both session and API key)
            const authUser = await getAuthUser(request);
            if (!authUser) {
                return NextResponse.json(
                    { success: false, error: 'Unauthorized - Please sign in' },
                    { status: 401 }
                );
            }

            // Resolve params if they're a promise (Next.js 15 pattern)
            const resolvedParams =
                context?.params && typeof context.params.then === "function"
                    ? await context.params
                    : context?.params;

            // Execute the handler with authenticated user
            return await handler(
                request,
                { user: authUser },
                resolvedParams
            );
        } catch (error) {
            console.error("Authentication error:", error);

            return NextResponse.json(
                { success: false, error: 'Internal server error' },
                { status: 500 }
            );
        }
    };
}

/**
 * Combined withAuth and withLogging wrapper
 *
 * Use this when you want both authentication and logging
 */
export function withAuthAndLogging<T = any>(
    handler: AuthenticatedLoggingApiHandler<T>
) {
    // Import withLogging here to avoid circular dependencies
    const { withLogging } = require('./withLogging');

    return withLogging<T>(async (request: NextRequest, { log }, params?: any) => {
        // Check authentication
        const authUser = await getAuthUser(request);
        if (!authUser) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        log.debug({ userId: authUser.userId, authMethod: authUser.authMethod }, 'Authenticated request');

        // Execute the handler with authenticated user and logger
        return await handler(
            request,
            { user: authUser, log },
            params
        );
    });
}