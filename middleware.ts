import { authMiddleware, redirectToSignIn } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  publicRoutes: ["/", "/api/webhooks(.*)"],
  afterAuth(auth, req, evt) {
    // If the user is logged in and trying to access a protected route, allow them
    if (auth.userId && !auth.isPublicRoute) {
      // User is authenticated and accessing a protected route
      // We'll initialize the user in the database in the API route or page component
      return NextResponse.next()
    }

    // If the user is not logged in and trying to access a protected route, redirect them to sign in
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url })
    }

    // Allow public routes
    return NextResponse.next()
  },
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
} 


