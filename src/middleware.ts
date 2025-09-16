import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { DefaultServiceFactory } from "@/services/ServiceFactory"

async function checkApiKeyAuth(req: NextRequest): Promise<{ isValid: boolean; userId?: string }> {
  const authHeader = req.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return { isValid: false }
  }

  const apiKey = authHeader.replace("Bearer ", "")

  if (!apiKey.startsWith("ak_live_")) {
    return { isValid: false }
  }

  try {
    const services = DefaultServiceFactory.getInstance().getServices()
    const result = await services.apiKeyService.verifyApiKey(apiKey)

    return {
      isValid: result.isValid,
      userId: result.userId
    }
  } catch (error) {
    return { isValid: false }
  }
}

export default withAuth(
  async function middleware(req) {
    // For API routes, check API key authentication first
    if (req.nextUrl.pathname.startsWith("/api/")) {
      const apiKeyResult = await checkApiKeyAuth(req)

      if (apiKeyResult.isValid) {
        // Create a new request with user ID for API key auth
        const requestHeaders = new Headers(req.headers)
        requestHeaders.set("x-api-key-user-id", apiKeyResult.userId!)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }

    // Fallback to default NextAuth behavior
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to NextAuth API routes
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }

        // For other API routes, check if we have API key authentication
        if (req.nextUrl.pathname.startsWith("/api/")) {
          const authHeader = req.headers.get("authorization")

          // If API key is present, let the middleware handle it
          if (authHeader?.startsWith("Bearer ak_live_")) {
            return true
          }

          // Otherwise, require NextAuth token
          return !!token
        }

        // Allow access to all non-API routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}