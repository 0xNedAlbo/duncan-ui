import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verify } from '@node-rs/argon2';
import { createServiceLogger } from "@/lib/logging/loggerFactory";

export type AuthUser = {
  userId: string;
  username: string;
  authMethod: 'session' | 'api-key';
};

const logger = createServiceLogger('AuthUserService');

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Check for API key authentication first (from middleware)
  const apiKeyUserId = request.headers.get("x-api-key-user-id");

  if (apiKeyUserId) {
    // Fetch address for API key authentication
    const user = await prisma.user.findUnique({
      where: { id: apiKeyUserId },
      select: { address: true, name: true }
    });

    return {
      userId: apiKeyUserId,
      username: user?.address || user?.name || apiKeyUserId,
      authMethod: 'api-key',
    };
  }

  // Check for API key in Authorization header (direct validation)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);

    try {
      // Extract prefix for lookup (first 16 characters to match unique prefixes)
      const prefix = apiKey.substring(0, 16);

      // Find API key record by prefix and active status
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: {
          prefix: prefix,
          revokedAt: null  // Not revoked (active)
        },
        select: {
          userId: true,
          hash: true,
          user: {
            select: { address: true, name: true }
          }
        }
      });

      if (apiKeyRecord) {
        // Verify the full API key against the stored hash
        const isValid = await verify(apiKeyRecord.hash, apiKey, {
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });

        if (isValid) {
          return {
            userId: apiKeyRecord.userId,
            username: apiKeyRecord.user.address || apiKeyRecord.user.name || apiKeyRecord.userId,
            authMethod: 'api-key',
          };
        }
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : error }, "API key validation error in getAuthUser");
    }
  }

  // Fall back to session authentication
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      username: session.user.address || session.user.name || session.user.id,
      authMethod: 'session',
    };
  }

  return null;
}