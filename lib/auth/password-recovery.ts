/**
 * Supabase Auth password-recovery helpers.
 *
 * CaseBrain sign-in uses Supabase (`signInWithPassword`), not Clerk.
 * Clerk remains an optional layout/middleware remnant and must not drive recovery.
 */

export const NEUTRAL_RECOVERY_ACK =
  "If an account exists for that email, we sent password reset instructions. Check your inbox and spam folder.";

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordValidationFailure =
  | "password_empty"
  | "password_too_short"
  | "mismatched_password";

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; code: PasswordValidationFailure; message: string };

export type AuthRecoveryErrorCode =
  | "invalid_email"
  | "rate_limited"
  | "expired_token"
  | "invalid_token"
  | "provider_error"
  | "unauthenticated"
  | "mismatched_password"
  | "password_too_short"
  | "password_empty"
  | "current_password_invalid";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Conservative RFC-ish check — rejects obvious invalids before any provider call. */
export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  if (!value || value.length > 254) return false;
  // Disallow spaces and require a single @ with non-empty local + domain with a dot.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): PasswordValidationResult {
  if (!password) {
    return {
      ok: false,
      code: "password_empty",
      message: "Enter a new password.",
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      code: "password_too_short",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password !== confirmPassword) {
    return {
      ok: false,
      code: "mismatched_password",
      message: "Passwords do not match.",
    };
  }
  return { ok: true };
}

/**
 * Account enumeration guard: unknown and known accounts share one client message.
 * Never branch UI copy on whether the user exists.
 */
export function forgotPasswordAckMessage(_emailExists: boolean | "unknown" = "unknown"): string {
  void _emailExists;
  return NEUTRAL_RECOVERY_ACK;
}

export function resolvePublicAppOrigin(opts: {
  siteUrl?: string | null;
  vercelUrl?: string | null;
  requestOrigin?: string | null;
}): string {
  const site = opts.siteUrl?.trim().replace(/\/$/, "");
  if (site) return site;
  const vercel = opts.vercelUrl?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  const req = opts.requestOrigin?.trim().replace(/\/$/, "");
  if (req) return req;
  return "http://localhost:3000";
}

/**
 * Supabase Redirect URL allow-list match is exact on the full redirect_to string.
 * Query params (e.g. `?next=/reset-password`) cause Auth to reject the URL and
 * fall back to Site URL (www.casebrain.co.uk) — landing recovery on the homepage.
 * The `/auth/callback` route defaults `next` to `/reset-password` when absent.
 */
export function buildPasswordRecoveryRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback`;
}

export function classifyAuthRecoveryError(input: {
  message?: string | null;
  status?: number | null;
  code?: string | null;
} | null | undefined): AuthRecoveryErrorCode {
  if (!input) return "provider_error";
  const message = (input.message ?? "").toLowerCase();
  const code = (input.code ?? "").toLowerCase();
  const status = input.status ?? 0;

  if (status === 429 || code.includes("over_request") || message.includes("rate limit")) {
    return "rate_limited";
  }
  if (
    code === "otp_expired" ||
    message.includes("expired") ||
    message.includes("otp has expired")
  ) {
    return "expired_token";
  }
  if (
    code === "flow_state_expired" ||
    code === "flow_state_not_found" ||
    message.includes("invalid") && (message.includes("token") || message.includes("link") || message.includes("otp")) ||
    message.includes("auth code") ||
    message.includes("pkce")
  ) {
    return "invalid_token";
  }
  if (message.includes("invalid login credentials") || message.includes("invalid password")) {
    return "current_password_invalid";
  }
  return "provider_error";
}

export function userFacingRecoveryError(code: AuthRecoveryErrorCode): string {
  switch (code) {
    case "invalid_email":
      return "Enter a valid email address.";
    case "rate_limited":
      return "Too many requests. Please try again later.";
    case "expired_token":
      return "This reset link has expired. Request a new password reset email.";
    case "invalid_token":
      return "This reset link is invalid or has already been used. Request a new password reset email.";
    case "unauthenticated":
      return "Your reset session is missing. Open the link from your email again, or request a new reset.";
    case "mismatched_password":
      return "Passwords do not match.";
    case "password_too_short":
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "password_empty":
      return "Enter a new password.";
    case "current_password_invalid":
      return "Current password is incorrect.";
    case "provider_error":
    default:
      return "We could not complete that request just now. Please try again.";
  }
}

/** Allowed redirect targets after auth callback (open-redirect guard). */
export function sanitizeAuthNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return "/reset-password";
  }
  return next;
}
