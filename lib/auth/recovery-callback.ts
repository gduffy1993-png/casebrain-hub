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
 * Stable PR #66 preview alias (casebrain-hub project). Prefer this over ephemeral
 * deployment hosts and never fall back to production www.casebrain.co.uk.
 */
export const PR66_STABLE_RECOVERY_ORIGIN =
  "https://casebrain-hub-git-programme-rea-33bd05-gduffy1993-pngs-projects.vercel.app";

export const PR66_STABLE_RECOVERY_CALLBACK = `${PR66_STABLE_RECOVERY_ORIGIN}/auth/callback`;

const FORBIDDEN_RECOVERY_HOSTS = new Set([
  "www.casebrain.co.uk",
  "casebrain.co.uk",
]);

export function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

/** Production marketing/app hosts must not receive recovery `?code=` landings. */
export function isForbiddenRecoveryOrigin(originOrUrl: string | null | undefined): boolean {
  if (!originOrUrl?.trim()) return false;
  try {
    const host = new URL(normalizeOrigin(originOrUrl)).hostname.toLowerCase();
    return FORBIDDEN_RECOVERY_HOSTS.has(host);
  } catch {
    return false;
  }
}

/**
 * Prefer a stable recovery origin so reset emails survive ephemeral Vercel deployment URLs.
 * Order:
 *   AUTH_RECOVERY_ORIGIN →
 *   (preview) branch alias →
 *   SITE_URL (rejected if production www) →
 *   branch alias →
 *   vercel deployment →
 *   request origin (rejected if production www) →
 *   PR66 stable alias
 *
 * Never returns www.casebrain.co.uk / casebrain.co.uk.
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
  fallbackStableOrigin?: string | null;
}): string {
  const stable = normalizeOrigin(
    opts.fallbackStableOrigin?.trim() ||
      opts.authRecoveryOrigin?.trim() ||
      PR66_STABLE_RECOVERY_ORIGIN,
  );

  const pick = (value: string | null | undefined): string | null => {
    if (!value?.trim()) return null;
    const origin = normalizeOrigin(value);
    if (isForbiddenRecoveryOrigin(origin)) return null;
    return origin;
  };

  const explicit = pick(opts.authRecoveryOrigin);
  if (explicit) return explicit;

  const branchAlias = pick(opts.branchAliasHost);
  const isPreview = (opts.vercelEnv || "").toLowerCase() === "preview";
  if (isPreview && branchAlias) return branchAlias;

  const site = pick(opts.siteUrl);
  if (site) return site;

  if (branchAlias) return branchAlias;

  const vercel = opts.vercelUrl?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (vercel) {
    const fromVercel = pick(`https://${vercel}`);
    if (fromVercel) return fromVercel;
  }

  const req = pick(opts.requestOrigin);
  if (req) return req;

  return stable;
}

/**
 * Browser-side redirectTo selection for resetPasswordForEmail.
 * Rejects production www fallbacks; keeps PKCE on the stable PR #66 origin.
 */
export function selectBrowserRecoveryRedirectTo(opts: {
  apiRedirectTo?: string | null;
  windowOrigin: string;
  stableRecoveryOrigin?: string | null;
}): {
  redirectTo: string;
  /** When set, the page should navigate here before sending the email (PKCE). */
  mustUseOrigin: string | null;
  rejectedProductionFallback: boolean;
} {
  const stable = normalizeOrigin(
    opts.stableRecoveryOrigin?.trim() || PR66_STABLE_RECOVERY_ORIGIN,
  );
  const stableRedirect = `${stable}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
  const windowOrigin = normalizeOrigin(opts.windowOrigin);

  if (isForbiddenRecoveryOrigin(windowOrigin)) {
    return {
      redirectTo: stableRedirect,
      mustUseOrigin: stable,
      rejectedProductionFallback: true,
    };
  }

  if (opts.apiRedirectTo?.trim()) {
    try {
      const apiUrl = new URL(opts.apiRedirectTo);
      if (!isForbiddenRecoveryOrigin(apiUrl.origin)) {
        // Prefer API suggestion when it matches the page origin (PKCE cookie host).
        if (apiUrl.origin === windowOrigin) {
          return {
            redirectTo: opts.apiRedirectTo,
            mustUseOrigin: null,
            rejectedProductionFallback: false,
          };
        }
        // Force stable preview callback when API points at the known PR alias.
        if (apiUrl.origin === stable && windowOrigin === stable) {
          return {
            redirectTo: opts.apiRedirectTo,
            mustUseOrigin: null,
            rejectedProductionFallback: false,
          };
        }
      }
    } catch {
      /* ignore malformed */
    }
  }

  // Already on an allowed preview/local origin: keep PKCE on this host.
  if (windowOrigin === stable) {
    return {
      redirectTo: stableRedirect,
      mustUseOrigin: null,
      rejectedProductionFallback: false,
    };
  }

  // Ephemeral preview host: keep same-origin for PKCE, but never production.
  return {
    redirectTo: `${windowOrigin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    mustUseOrigin: null,
    rejectedProductionFallback: false,
  };
}

/** Pure helper: apply auth cookies onto a redirect response cookie jar. */
export function attachAuthCookiesToRedirect(
  cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
  setCookie: (name: string, value: string, options?: Record<string, unknown>) => void,
): number {
  for (const { name, value, options } of cookiesToSet) {
    setCookie(name, value, options);
  }
  return cookiesToSet.length;
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
