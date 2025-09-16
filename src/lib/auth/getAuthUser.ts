import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verify } from '@node-rs/argon2';

export type AuthUser = {
  userId: string;
  authMethod: 'session' | 'api-key';
};

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // Check for API key authentication first (from middleware)
  const apiKeyUserId = request.headers.get("x-api-key-user-id");

  if (apiKeyUserId) {
    return {
      userId: apiKeyUserId,
      authMethod: 'api-key',
    };
  }

  // Check for API key in Authorization header (direct validation)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);

    try {
      // Extract prefix for lookup (first 8 characters)
      const prefix = apiKey.substring(0, 8);

      // Find API key record by prefix and active status
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: {
          prefix: prefix,
          revokedAt: null  // Not revoked (active)
        },
        select: { userId: true, hash: true }
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
            authMethod: 'api-key',
          };
        }
      }
    } catch (error) {
      console.error("API key validation error in getAuthUser:", error);
    }
  }

  // Fall back to session authentication
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      authMethod: 'session',
    };
  }

  return null;
}