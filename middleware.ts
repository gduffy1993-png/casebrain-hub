import { clerkMiddleware } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEvalBypassRequest } from "@/lib/eval-auth-bypass";
import { isAuthRecoveryPublicPath } from "@/lib/auth/recovery-callback";

/**
 * Clerk: sets session / `__session` for Clerk-signed routes when Clerk keys are configured.
 * Supabase: refreshes `sb-*` cookies so existing CaseBrain auth keeps working.
 *
 * Auth recovery routes (`/auth/callback`, `/reset-password`, `/forgot-password`) must never be
 * redirected to sign-in here — CaseBrain gatekeeping lives in `(protected)/layout.tsx` only.
 *
 * Eval runner (`scripts/run-eval.mts`) sends `x-eval: 1`; skipping `getUser()` here avoids one
 * Supabase Auth API call per request (middleware runs on almost every path). Dev-only — production
 * never treats requests as eval bypass (`lib/eval-auth-bypass`).
 */
export default clerkMiddleware(async (_auth, request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith("/api/debug")) {
    return NextResponse.next();
  }

  // Explicit allow: recovery paths stay public even if Clerk middleware is active.
  const recoveryPath = isAuthRecoveryPublicPath(request.nextUrl.pathname);

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
    },
  );

  // On the PKCE callback itself, skip getUser() so we do not race the code exchange
  // in the route handler (which writes the recovery session cookies).
  const isCallback = request.nextUrl.pathname === "/auth/callback";
  if (!isEvalBypassRequest(request) && !isCallback) {
    await supabase.auth.getUser();
  }

  // Never redirect recovery routes — attach any refreshed cookies and continue.
  if (recoveryPath) {
    return response;
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|mp4|css|js|map|json|txt|xml|webmanifest)).*)",
  ],
};
