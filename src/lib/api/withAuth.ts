/**
 * API Route Authentication Wrapper
 *
 * Higher-order function that adds authentication to Next.js API routes
 * Similar to withLogging but focused on authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, type AuthUser } from "@/lib/auth/getAuthUser";
import { createServiceLogger } from "@/lib/logging/loggerFactory";
import type { NextRouteContext } from './types';

export interface AuthContext {
    user: AuthUser;
}

export interface AuthLoggingContext {
    user: AuthUser;
    log: any; // Logger type from withLogging
}

export type AuthenticatedApiHandler<T = any> = (
    // eslint-disable-next-line no-unused-vars
    request: NextRequest,
    // eslint-disable-next-line no-unused-vars
    context: AuthContext,
    // eslint-disable-next-line no-unused-vars
    params?: any
) => Promise<NextResponse<T>>;

export type AuthenticatedLoggingApiHandler<T = any> = (
    // eslint-disable-next-line no-unused-vars
    request: NextRequest,
    // eslint-disable-next-line no-unused-vars
    context: AuthLoggingContext,
    // eslint-disable-next-line no-unused-vars
    params?: any
) => Promise<NextResponse<T>>;


/**
 * Wrap an API route handler with authentication
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with authentication
 */
const logger = createServiceLogger("WithAuthService");

export function withAuth<T = any>(
    handler: AuthenticatedApiHandler<T>
): (
    // eslint-disable-next-line no-unused-vars
    request: NextRequest,
    // eslint-disable-next-line no-unused-vars
    context: NextRouteContext
) => Promise<NextResponse<T | { success: boolean; error: string }>> {
    return async (request: NextRequest, context: NextRouteContext) => {
        try {
            // Check authentication (supports both session and API key)
            const authUser = await getAuthUser(request);
            if (!authUser) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized - Please sign in" },
                    { status: 401 }
                );
            }

            // Resolve params (Next.js 15 pattern - always a promise)
            const resolvedParams = await context.params;

            // Execute the handler with authenticated user
            return await handler(request, { user: authUser }, resolvedParams);
        } catch (error) {
            logger.error(
                { error: error instanceof Error ? error.message : error },
                "Authentication error"
            );

            return NextResponse.json(
                { success: false, error: "Internal server error" },
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
    return async (request: NextRequest, context: NextRouteContext) => {
        // Check authentication first
        const authUser = await getAuthUser(request);
        if (!authUser) {
            // For unauthenticated requests, still log with no user info
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { withLogging } = require("./withLogging");
            const unauthenticatedHandler = withLogging(
                async (_req: NextRequest, { log }: { log: any }) => {
                    log.warn("Unauthenticated request");
                    return NextResponse.json(
                        {
                            success: false,
                            error: "Unauthorized - Please sign in",
                        },
                        { status: 401 }
                    );
                }
            );
            return unauthenticatedHandler(request, context);
        }

        // Import withLogging here to avoid circular dependencies
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { withLogging } = require("./withLogging");

        // Create authenticated logging wrapper with user info
        const authenticatedHandler = withLogging(
            async (req: NextRequest, { log }: { log: any }, params?: any) => {
                log.debug(
                    {
                        userId: authUser.userId,
                        authMethod: authUser.authMethod,
                    },
                    "Authenticated request"
                );

                // Execute the handler with authenticated user and logger
                return await handler(req, { user: authUser, log }, params);
            },
            authUser
        ); // Pass authUser to withLogging

        return authenticatedHandler(request, context);
    };
}
