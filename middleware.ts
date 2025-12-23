import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/pricing",
  "/api/webhooks(.*)", // Webhooks might be public
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Always bypass Next.js static assets and static files
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname.startsWith("/_next/webpack-hmr") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    // Match any file with an extension (e.g., .js, .css, .png, etc.)
    /\.(js|css|map|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|mp4|json|webmanifest)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // FIX: Call auth() to ensure Clerk processes the request
  // This prevents "auth() was called but Clerk can't detect usage of clerkMiddleware()" errors
  // Even if we don't use the result, calling it ensures Clerk middleware runs
  await auth();

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in for protected routes
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - files with extensions (js, css, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};

