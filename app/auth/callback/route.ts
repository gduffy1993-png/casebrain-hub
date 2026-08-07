import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  finalizeRecoveryExchange,
  planRecoveryCallback,
} from "@/lib/auth/recovery-callback";
import {
  markRecoveryCodeConsumed,
  wasRecoveryCodeConsumed,
} from "@/lib/auth/recovery-code-once";

export const runtime = "nodejs";

/**
 * Supabase Auth recovery callback.
 * - Exchanges `?code=` (PKCE) or verifies `?token_hash=&type=`
 * - Writes auth cookies onto the redirect response (critical for SSR)
 * - Redirects to `/reset-password` with a live recovery session
 * Never logs code/token values.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const plan = planRecoveryCallback({
    origin,
    code,
    tokenHash,
    otpType,
    nextRaw,
    errorParam,
    errorDescription,
    codeAlreadyConsumed: code ? wasRecoveryCodeConsumed(code) : false,
  });

  if (!plan.action || plan.action.kind === "none") {
    return NextResponse.redirect(new URL(plan.redirectPath, origin));
  }

  // Build redirect first so Set-Cookie attaches to THIS response (not cookies() alone).
  const redirectResponse = NextResponse.redirect(new URL(plan.redirectPath, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let exchange: { ok: boolean; error?: { message?: string; status?: number; code?: string } | null } = {
    ok: false,
  };

  if (plan.action.kind === "exchange_code") {
    const { error } = await supabase.auth.exchangeCodeForSession(plan.action.code);
    exchange = { ok: !error, error: error ? { message: error.message, status: error.status, code: error.code } : null };
  } else if (plan.action.kind === "verify_otp") {
    const { error } = await supabase.auth.verifyOtp({
      type: plan.action.type as "recovery",
      token_hash: plan.action.tokenHash,
    });
    exchange = { ok: !error, error: error ? { message: error.message, status: error.status, code: error.code } : null };
  }

  const finalized = finalizeRecoveryExchange(plan, exchange);

  if (!finalized.ok) {
    return NextResponse.redirect(new URL(finalized.redirectPath, origin));
  }

  if (plan.markCodeConsumed) {
    markRecoveryCodeConsumed(plan.markCodeConsumed);
  }

  // Successful exchange: cookies already set on redirectResponse.
  return redirectResponse;
}
