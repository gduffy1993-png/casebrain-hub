/**
 * Behavioural contracts for Supabase password-recovery session completion.
 * Run: node --import tsx --test scripts/auth-password-recovery-session-contracts.test.ts
 *
 * Does not log or embed real auth codes/tokens.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
  validateNewPassword,
  buildPasswordRecoveryRedirectTo,
  classifyAuthRecoveryError,
} from "@/lib/auth/password-recovery";
import {
  buildStableVercelBranchAlias,
  finalizeRecoveryExchange,
  isAuthRecoveryPublicPath,
  parseRecoveryHashParams,
  planRecoveryCallback,
  resolveRecoveryOrigin,
  extractImplicitSessionFromHash,
} from "@/lib/auth/recovery-callback";
import {
  __resetConsumedRecoveryCodesForTests,
  markRecoveryCodeConsumed,
  wasRecoveryCodeConsumed,
} from "@/lib/auth/recovery-code-once";

describe("valid recovery code → session plan → reset form path", () => {
  it("plans exchange_code and redirects to /reset-password without error query", () => {
    const plan = planRecoveryCallback({
      origin: "https://preview.example",
      code: "opaque-test-code",
      tokenHash: null,
      otpType: null,
      nextRaw: "/reset-password",
      errorParam: null,
      errorDescription: null,
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.redirectPath, "/reset-password");
    assert.equal(plan.action?.kind, "exchange_code");
    const finalized = finalizeRecoveryExchange(plan, { ok: true, error: null });
    assert.equal(finalized.ok, true);
    assert.equal(finalized.redirectPath, "/reset-password");
    assert.equal(finalized.redirectPath.includes("error="), false);
  });

  it("also accepts token_hash + type=recovery (verifyOtp path)", () => {
    const plan = planRecoveryCallback({
      origin: "https://preview.example",
      code: null,
      tokenHash: "opaque-hash",
      otpType: "recovery",
      nextRaw: "/reset-password",
      errorParam: null,
      errorDescription: null,
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.action?.kind, "verify_otp");
  });
});

describe("valid matching passwords → update success shape", () => {
  it("accepts matching strong passwords", () => {
    const r = validateNewPassword("CorrectHorse1", "CorrectHorse1");
    assert.equal(r.ok, true);
  });
});

describe("mismatch", () => {
  it("rejects mismatched confirm password", () => {
    const r = validateNewPassword("CorrectHorse1", "CorrectHorse2");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "mismatched_password");
  });
});

describe("weak password", () => {
  it("rejects passwords shorter than minimum", () => {
    const r = validateNewPassword("short", "short");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "password_too_short");
  });
});

describe("expired/invalid code", () => {
  it("maps provider expired/invalid failures to reset error states", () => {
    const plan = planRecoveryCallback({
      origin: "https://preview.example",
      code: "opaque-test-code",
      tokenHash: null,
      otpType: null,
      nextRaw: "/reset-password",
      errorParam: null,
      errorDescription: null,
    });
    const expired = finalizeRecoveryExchange(plan, {
      ok: false,
      error: { message: "Email link is invalid or has expired", code: "otp_expired" },
    });
    assert.equal(expired.ok, false);
    assert.equal(expired.redirectPath, "/reset-password?error=expired");

    const invalid = finalizeRecoveryExchange(plan, {
      ok: false,
      error: { message: "invalid flow state / pkce", code: "flow_state_not_found" },
    });
    assert.equal(invalid.redirectPath, "/reset-password?error=invalid_or_expired");
    assert.equal(classifyAuthRecoveryError({ message: "expired token" }), "expired_token");
  });
});

describe("missing session", () => {
  it("plans invalid_or_expired when callback has no code/token and no provider error", () => {
    const plan = planRecoveryCallback({
      origin: "https://preview.example",
      code: null,
      tokenHash: null,
      otpType: null,
      nextRaw: "/reset-password",
      errorParam: null,
      errorDescription: null,
    });
    assert.equal(plan.ok, false);
    assert.equal(plan.redirectPath, "/reset-password?error=invalid_or_expired");
  });

  it("detects recovery hash presence without requiring server round-trip", () => {
    const parsed = parseRecoveryHashParams(
      "#access_token=aaa&refresh_token=bbb&type=recovery",
    );
    assert.equal(parsed.isRecovery, true);
    const session = extractImplicitSessionFromHash(
      "#access_token=aaa&refresh_token=bbb&type=recovery",
    );
    assert.ok(session);
    assert.equal(session?.access_token.length && session?.refresh_token.length ? true : false, true);
  });
});

describe("middleware does not block recovery routes", () => {
  it("marks recovery paths public", () => {
    assert.equal(isAuthRecoveryPublicPath("/auth/callback"), true);
    assert.equal(isAuthRecoveryPublicPath("/reset-password"), true);
    assert.equal(isAuthRecoveryPublicPath("/forgot-password"), true);
    assert.equal(isAuthRecoveryPublicPath("/sign-in"), true);
    assert.equal(isAuthRecoveryPublicPath("/settings"), false);
    assert.equal(isAuthRecoveryPublicPath("/cases/abc"), false);
  });
});

describe("callback cannot be reused", () => {
  beforeEach(() => {
    __resetConsumedRecoveryCodesForTests();
  });

  it("flags a code as consumed after first success mark", () => {
    const code = "opaque-one-time-code";
    assert.equal(wasRecoveryCodeConsumed(code), false);
    markRecoveryCodeConsumed(code);
    assert.equal(wasRecoveryCodeConsumed(code), true);

    const plan = planRecoveryCallback({
      origin: "https://preview.example",
      code,
      tokenHash: null,
      otpType: null,
      nextRaw: "/reset-password",
      errorParam: null,
      errorDescription: null,
      codeAlreadyConsumed: true,
    });
    assert.equal(plan.ok, false);
    assert.equal(plan.redirectPath, "/reset-password?error=invalid_or_expired");
  });
});

describe("stable recovery redirect origin", () => {
  it("prefers AUTH_RECOVERY_ORIGIN / branch alias over ephemeral VERCEL_URL", () => {
    const alias = buildStableVercelBranchAlias({
      projectName: "casebrain",
      branch: "programme/real-pdf-live-pilot-v1",
      teamSlug: "gduffy1993-pngs-projects",
    });
    assert.equal(
      alias,
      "https://casebrain-git-programme-real-pdf-live-pilot-v1-gduffy1993-pngs-projects.vercel.app",
    );
    const origin = resolveRecoveryOrigin({
      authRecoveryOrigin: null,
      siteUrl: "https://casebrainhub.com",
      vercelUrl: "casebrain-ephemeral-123-gduffy1993-pngs-projects.vercel.app",
      vercelEnv: "preview",
      branchAliasHost: alias,
      requestOrigin: "https://casebrain-ephemeral-123-gduffy1993-pngs-projects.vercel.app",
    });
    assert.equal(origin, alias);
    assert.equal(
      buildPasswordRecoveryRedirectTo(origin),
      `${alias}/auth/callback?next=%2Freset-password`,
    );
  });
});
