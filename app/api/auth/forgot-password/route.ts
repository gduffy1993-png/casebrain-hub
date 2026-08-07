import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  buildPasswordRecoveryRedirectTo,
  forgotPasswordAckMessage,
  isValidEmail,
  normalizeEmail,
  resolvePublicAppOrigin,
  userFacingRecoveryError,
} from "@/lib/auth/password-recovery";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Always returns the same neutral acknowledgement (no account enumeration).
 * Issues a real Supabase `resetPasswordForEmail` when the email shape is valid
 * and rate limits allow — provider errors are swallowed from the client body.
 */
export async function POST(request: Request) {
  let body: { email?: unknown } = {};
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    body = {};
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_email",
        error: userFacingRecoveryError("invalid_email"),
      },
      { status: 400 },
    );
  }

  try {
    assertRateLimit(`auth:forgot:ip:${clientIp(request)}`, {
      limit: 8,
      windowMs: 15 * 60_000,
    });
    assertRateLimit(`auth:forgot:email:${email}`, {
      limit: 4,
      windowMs: 15 * 60_000,
    });
  } catch (err) {
    const retryAfter =
      (err as Error & { retryAfter?: number }).retryAfter ?? 60;
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        error: userFacingRecoveryError("rate_limited"),
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const origin = resolvePublicAppOrigin({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    requestOrigin: new URL(request.url).origin,
  });
  const redirectTo = buildPasswordRecoveryRedirectTo(origin);

  try {
    const supabase = await createClient();
    // Fire-and-forget semantics for the client: never reveal whether the user exists.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      // Log server-side only; client still gets neutral ack (except rate limits already handled).
      console.error("[auth] resetPasswordForEmail failed:", {
        code: error.code,
        status: error.status,
      });
    }
  } catch {
    // Provider/network failure — still return neutral ack to avoid enumeration.
  }

  return NextResponse.json({
    ok: true,
    code: "accepted",
    message: forgotPasswordAckMessage("unknown"),
  });
}
