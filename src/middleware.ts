import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  async function middleware(req) {
    // For API routes, just pass through - let the API routes handle auth validation
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.next()
    }

    // Fallback to default NextAuth behavior for other routes
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req }) => {
        // Allow access to NextAuth API routes
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }

        // For other API routes, allow all requests - let API routes handle auth
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return true
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