import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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