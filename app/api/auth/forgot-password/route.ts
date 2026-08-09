import { NextResponse } from "next/server";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  buildPasswordRecoveryRedirectTo,
  forgotPasswordAckMessage,
  isValidEmail,
  normalizeEmail,
  userFacingRecoveryError,
} from "@/lib/auth/password-recovery";
import {
  PR66_STABLE_RECOVERY_ORIGIN,
  buildStableVercelBranchAlias,
  isForbiddenRecoveryOrigin,
  resolveRecoveryOrigin,
} from "@/lib/auth/recovery-callback";

export const runtime = "nodejs";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Rate-limit + compute redirectTo for browser-side `resetPasswordForEmail`.
 * PKCE code verifier MUST be created in the browser — do not call
 * resetPasswordForEmail on the server (that broke recovery-session completion).
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

  const branchAlias = buildStableVercelBranchAlias({
    // Vercel project for PR #66 is casebrain-hub (not the older casebrain slug).
    projectName: process.env.VERCEL_PROJECT_NAME || "casebrain-hub",
    branch:
      process.env.VERCEL_GIT_COMMIT_REF ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ||
      "programme/real-pdf-live-pilot-v1",
    teamSlug:
      process.env.NEXT_PUBLIC_VERCEL_TEAM_SLUG || "gduffy1993-pngs-projects",
  });

  // Prefer explicit env, then the known truncated PR #66 alias (authoritative for this pilot).
  // Strip CRLF — Windows `vercel env add` can embed \r\n and break Supabase allow-list match.
  const authRecoveryOrigin =
    process.env.NEXT_PUBLIC_AUTH_RECOVERY_ORIGIN?.replace(/[\r\n]+/g, "").trim() ||
    PR66_STABLE_RECOVERY_ORIGIN;

  let origin = resolveRecoveryOrigin({
    authRecoveryOrigin,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    vercelEnv: process.env.VERCEL_ENV,
    requestOrigin: new URL(request.url).origin,
    branchAliasHost: branchAlias,
    fallbackStableOrigin: PR66_STABLE_RECOVERY_ORIGIN,
  });

  if (isForbiddenRecoveryOrigin(origin)) {
    origin = PR66_STABLE_RECOVERY_ORIGIN;
  }

  const redirectTo = buildPasswordRecoveryRedirectTo(origin);

  return NextResponse.json({
    ok: true,
    code: "ready",
    message: forgotPasswordAckMessage("unknown"),
    redirectTo,
    recoveryOrigin: origin,
    // Client must call browser supabase.auth.resetPasswordForEmail next.
    clientMustSendResetEmail: true,
  });
}
