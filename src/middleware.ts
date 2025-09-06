import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Middleware logic can be added here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to NextAuth API routes
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }
        
        // Require authentication for all other API routes
        if (req.nextUrl.pathname.startsWith("/api/")) {
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