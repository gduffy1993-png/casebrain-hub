import { clerkMiddleware } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEvalBypassRequest } from "@/lib/eval-auth-bypass";

/**
 * Clerk: sets session / `__session` for Clerk-signed routes when Clerk keys are configured.
 * Supabase: refreshes `sb-*` cookies so existing CaseBrain auth keeps working.
 *
 * Eval runner (`scripts/run-eval.mts`) sends `x-eval: 1`; skipping `getUser()` here avoids one
 * Supabase Auth API call per request (middleware runs on almost every path). Dev-only — production
 * never treats requests as eval bypass (`lib/eval-auth-bypass`).
 */
export default clerkMiddleware(async (_auth, request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith("/api/debug")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );

  if (!isEvalBypassRequest(request)) {
    await supabase.auth.getUser();
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|mp4|css|js|map|json|txt|xml|webmanifest)).*)",
  ],
};
