/**
 * API Key Management API
 *
 * Handles CRUD operations for user API keys
 * Requires session-based authentication (not API key auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/lib/api/withLogging";
import { getAuthUser } from "@/lib/auth/getAuthUser";
import { ApiServiceFactory } from "@/lib/api/ApiServiceFactory";

export const runtime = "nodejs";

// GET /api/auth/api-keys - List user's API keys
export const GET = withLogging<{ apiKeys: any[] } | { error: string }>(
    async (request: NextRequest, { log }) => {
        const authUser = await getAuthUser(request);

        if (!authUser) {
            log.debug("Unauthorized request to list API keys");
            return NextResponse.json(
                { error: "Unauthorized - Please sign in" },
                { status: 401 }
            );
        }

        // Only allow session-based auth for API key management
        if (authUser.authMethod !== "session") {
            log.debug(
                "API key authentication not allowed for API key management"
            );
            return NextResponse.json(
                {
                    error: "Session authentication required for API key management",
                },
                { status: 403 }
            );
        }

        try {
            const apiServices = ApiServiceFactory.getInstance();
            const apiKeys = await apiServices.apiKeyService.listUserApiKeys(
                authUser.userId
            );

            log.debug(
                { apiKeyCount: apiKeys.length },
                "Retrieved user API keys"
            );

            return NextResponse.json({
                apiKeys,
            });
        } catch (error) {
            throw error; // Let withLogging handle the error
        }
    }
);

// POST /api/auth/api-keys - Create new API key
export const POST = withLogging<
    | {
          id: string;
          name: string;
          key: string;
          prefix: string;
          scopes: any[];
          message: string;
      }
    | { error: string }
>(async (request: NextRequest, { log }) => {
    const authUser = await getAuthUser(request);

    if (!authUser) {
        log.debug("Unauthorized request to create API key");
        return NextResponse.json(
            { error: "Unauthorized - Please sign in" },
            { status: 401 }
        );
    }

    // Only allow session-based auth for API key management
    if (authUser.authMethod !== "session") {
        log.debug("API key authentication not allowed for API key management");
        return NextResponse.json(
            { error: "Session authentication required for API key management" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { name, scopes = [] } = body;

        if (!name || typeof name !== "string") {
            log.debug("Invalid API key name provided");
            return NextResponse.json(
                { error: "Name is required and must be a string" },
                { status: 400 }
            );
        }

        if (
            !Array.isArray(scopes) ||
            scopes.some((scope) => typeof scope !== "string")
        ) {
            log.debug("Invalid scopes provided");
            return NextResponse.json(
                { error: "Scopes must be an array of strings" },
                { status: 400 }
            );
        }

        const apiServices = ApiServiceFactory.getInstance();
        const generatedKey = await apiServices.apiKeyService.createApiKey(
            authUser.userId,
            name,
            scopes
        );

        log.debug(
            {
                keyId: generatedKey.id,
                keyName: name,
                scopeCount: scopes.length,
            },
            "Created new API key"
        );

        return NextResponse.json(
            {
                id: generatedKey.id,
                name,
                key: generatedKey.plaintext,
                prefix: generatedKey.prefix,
                scopes,
                message:
                    "API key created successfully. Save this key securely - it won't be shown again.",
            },
            { status: 201 }
        );
    } catch (error) {
        throw error; // Let withLogging handle the error
    }
});

// DELETE /api/auth/api-keys - Revoke API key
export const DELETE = withLogging<{ message: string } | { error: string }>(
    async (request: NextRequest, { log }) => {
        const authUser = await getAuthUser(request);

        if (!authUser) {
            log.debug("Unauthorized request to revoke API key");
            return NextResponse.json(
                { error: "Unauthorized - Please sign in" },
                { status: 401 }
            );
        }

        // Only allow session-based auth for API key management
        if (authUser.authMethod !== "session") {
            log.debug(
                "API key authentication not allowed for API key management"
            );
            return NextResponse.json(
                {
                    error: "Session authentication required for API key management",
                },
                { status: 403 }
            );
        }

        try {
            const { searchParams } = new URL(request.url);
            const keyId = searchParams.get("keyId");

            if (!keyId) {
                log.debug("No keyId provided for API key revocation");
                return NextResponse.json(
                    { error: "keyId parameter is required" },
                    { status: 400 }
                );
            }

            const apiServices = ApiServiceFactory.getInstance();
            const revoked = await apiServices.apiKeyService.revokeApiKey(
                authUser.userId,
                keyId
            );

            if (!revoked) {
                log.debug({ keyId }, "API key not found or already revoked");
                return NextResponse.json(
                    { error: "API key not found or already revoked" },
                    { status: 404 }
                );
            }

            log.debug({ keyId }, "Revoked API key");

            return NextResponse.json({
                message: "API key revoked successfully",
            });
        } catch (error) {
            throw error; // Let withLogging handle the error
        }
    }
);
