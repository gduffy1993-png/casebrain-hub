import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default clerkMiddleware((auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Always bypass Next.js static assets and static files
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname.startsWith("/_next/webpack-hmr") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    // Match any file with an extension (e.g., .js, .css, .png, etc.)
    /\.(js|css|map|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|mp4|json)$/.test(pathname)
  ) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};

