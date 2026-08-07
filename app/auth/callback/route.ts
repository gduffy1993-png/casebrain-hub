import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  classifyAuthRecoveryError,
  sanitizeAuthNextPath,
} from "@/lib/auth/password-recovery";

export const runtime = "nodejs";

/**
 * Supabase Auth PKCE / email-link callback.
 * Exchanges `?code=` for a recovery session, then sends the user to `/reset-password`
 * (or a sanitized `next` path). Invalid/expired links land on a clear error state.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const next = sanitizeAuthNextPath(url.searchParams.get("next"));
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorParam) {
    const codeClass = classifyAuthRecoveryError({
      message: errorDescription ?? errorParam,
      code: errorParam,
    });
    const q =
      codeClass === "expired_token" ? "expired" : "invalid_or_expired";
    return NextResponse.redirect(`${origin}/reset-password?error=${q}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const codeClass = classifyAuthRecoveryError({
      message: error.message,
      status: error.status,
      code: error.code,
    });
    const q =
      codeClass === "expired_token" ? "expired" : "invalid_or_expired";
    return NextResponse.redirect(`${origin}/reset-password?error=${q}`);
  }

  return NextResponse.redirect(`${origin}/reset-password?error=invalid_or_expired`);
}
