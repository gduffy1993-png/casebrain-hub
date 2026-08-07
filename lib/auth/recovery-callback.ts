/**
 * Recovery callback orchestration (testable; no token/code values logged).
 * CaseBrain recovery uses Supabase Auth PKCE / OTP — not Clerk.
 */
import type { AuthRecoveryErrorCode } from "@/lib/auth/password-recovery";
import {
  classifyAuthRecoveryError,
  sanitizeAuthNextPath,
} from "@/lib/auth/password-recovery";

export const RECOVERY_PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
] as const;

export function isAuthRecoveryPublicPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  return (RECOVERY_PUBLIC_PATHS as readonly string[]).some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export type RecoveryExchangeResult = {
  ok: boolean;
  error?: { message?: string | null; status?: number | null; code?: string | null } | null;
};

export type RecoveryCallbackInput = {
  origin: string;
  code: string | null;
  tokenHash: string | null;
  otpType: string | null;
  nextRaw: string | null;
  errorParam: string | null;
  errorDescription: string | null;
  /** True when this exact auth code was already successfully consumed in-process. */
  codeAlreadyConsumed?: boolean;
};

export type RecoveryCallbackPlan = {
  ok: boolean;
  redirectPath: string;
  errorCode?: AuthRecoveryErrorCode;
  /** Present when a provider exchange/verify should run. */
  action?:
    | { kind: "exchange_code"; code: string }
    | { kind: "verify_otp"; tokenHash: string; type: string }
    | { kind: "none" };
  markCodeConsumed?: string;
};

export function planRecoveryCallback(input: RecoveryCallbackInput): RecoveryCallbackPlan {
  const next = sanitizeAuthNextPath(input.nextRaw);

  if (input.errorParam) {
    const errorCode = classifyAuthRecoveryError({
      message: input.errorDescription ?? input.errorParam,
      code: input.errorParam,
    });
    const q = errorCode === "expired_token" ? "expired" : "invalid_or_expired";
    return {
      ok: false,
      redirectPath: `/reset-password?error=${q}`,
      errorCode,
      action: { kind: "none" },
    };
  }

  if (input.code && input.codeAlreadyConsumed) {
    return {
      ok: false,
      redirectPath: "/reset-password?error=invalid_or_expired",
      errorCode: "invalid_token",
      action: { kind: "none" },
    };
  }

  if (input.code) {
    return {
      ok: true,
      redirectPath: next,
      action: { kind: "exchange_code", code: input.code },
      markCodeConsumed: input.code,
    };
  }

  if (input.tokenHash && input.otpType) {
    return {
      ok: true,
      redirectPath: next,
      action: { kind: "verify_otp", tokenHash: input.tokenHash, type: input.otpType },
    };
  }

  return {
    ok: false,
    redirectPath: "/reset-password?error=invalid_or_expired",
    errorCode: "invalid_token",
    action: { kind: "none" },
  };
}

export function finalizeRecoveryExchange(
  plan: RecoveryCallbackPlan,
  result: RecoveryExchangeResult,
): RecoveryCallbackPlan {
  if (!plan.ok || plan.action?.kind === "none" || !plan.action) {
    return plan;
  }
  if (result.ok) {
    return { ...plan, ok: true, redirectPath: plan.redirectPath, errorCode: undefined };
  }
  const errorCode = classifyAuthRecoveryError(result.error);
  const q = errorCode === "expired_token" ? "expired" : "invalid_or_expired";
  return {
    ok: false,
    redirectPath: `/reset-password?error=${q}`,
    errorCode,
    action: { kind: "none" },
  };
}

/** Detect implicit-flow hash payload shape without reading secret values in logs. */
export function parseRecoveryHashParams(hash: string): {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  type: string | null;
  isRecovery: boolean;
} {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const type = params.get("type");
  const hasAccessToken = Boolean(params.get("access_token"));
  const hasRefreshToken = Boolean(params.get("refresh_token"));
  return {
    hasAccessToken,
    hasRefreshToken,
    type,
    isRecovery: type === "recovery" && hasAccessToken && hasRefreshToken,
  };
}

export function extractImplicitSessionFromHash(hash: string): {
  access_token: string;
  refresh_token: string;
} | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");
  if (type !== "recovery" || !access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

/**
 * Prefer a stable recovery origin so reset emails survive ephemeral Vercel deployment URLs.
 * Order:
 *   AUTH_RECOVERY_ORIGIN →
 *   (preview) branch alias →
 *   SITE_URL →
 *   branch alias →
 *   vercel deployment →
 *   request origin
 */
export function resolveRecoveryOrigin(opts: {
  authRecoveryOrigin?: string | null;
  siteUrl?: string | null;
  vercelUrl?: string | null;
  vercelGitCommitRef?: string | null;
  vercelEnv?: string | null;
  vercelProjectProductionUrl?: string | null;
  requestOrigin?: string | null;
  branchAliasHost?: string | null;
}): string {
  const normalize = (value: string) => {
    const trimmed = value.trim().replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  };

  const explicit = opts.authRecoveryOrigin?.trim();
  if (explicit) return normalize(explicit);

  const branchAlias = opts.branchAliasHost?.trim();
  const isPreview = (opts.vercelEnv || "").toLowerCase() === "preview";
  if (isPreview && branchAlias) return normalize(branchAlias);

  const site = opts.siteUrl?.trim();
  if (site) return normalize(site);

  if (branchAlias) return normalize(branchAlias);

  const vercel = opts.vercelUrl?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  const req = opts.requestOrigin?.trim().replace(/\/$/, "");
  if (req) return req;
  return "http://localhost:3000";
}

export function buildStableVercelBranchAlias(opts: {
  projectName?: string | null;
  branch?: string | null;
  teamSlug?: string | null;
}): string | null {
  const project = opts.projectName?.trim();
  const branch = opts.branch?.trim();
  const team = opts.teamSlug?.trim();
  if (!project || !branch || !team) return null;
  const branchSlug = branch
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!branchSlug) return null;
  return `https://${project}-git-${branchSlug}-${team}.vercel.app`;
}
