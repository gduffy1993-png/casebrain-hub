/**
 * Auth password-recovery contracts (Supabase Auth — not Clerk).
 * Run: node --import tsx --test scripts/auth-password-recovery-contracts.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NEUTRAL_RECOVERY_ACK,
  buildPasswordRecoveryRedirectTo,
  classifyAuthRecoveryError,
  forgotPasswordAckMessage,
  isValidEmail,
  normalizeEmail,
  resolvePublicAppOrigin,
  sanitizeAuthNextPath,
  userFacingRecoveryError,
  validateNewPassword,
} from "@/lib/auth/password-recovery";

describe("auth password recovery — positive", () => {
  it("accepts a normal work email and builds a recovery redirect", () => {
    assert.equal(isValidEmail("gduffy1993@gmail.com"), true);
    assert.equal(normalizeEmail("  Ged@Example.COM "), "ged@example.com");
    const origin = resolvePublicAppOrigin({
      siteUrl: null,
      vercelUrl: "casebrain-hub-git-preview.vercel.app",
      requestOrigin: "http://localhost:3000",
    });
    assert.equal(origin, "https://casebrain-hub-git-preview.vercel.app");
    assert.equal(
      buildPasswordRecoveryRedirectTo(origin),
      "https://casebrain-hub-git-preview.vercel.app/auth/callback?next=%2Freset-password",
    );
    const passwords = validateNewPassword("securePass1", "securePass1");
    assert.equal(passwords.ok, true);
  });
});

describe("auth password recovery — invalid-email", () => {
  it("rejects malformed emails before any provider call", () => {
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail("a@b."), false);
    assert.equal(isValidEmail("spaces @example.com"), false);
  });
});

describe("auth password recovery — unknown-account (no enumeration)", () => {
  it("returns the same neutral ack whether the account exists or not", () => {
    assert.equal(forgotPasswordAckMessage(true), NEUTRAL_RECOVERY_ACK);
    assert.equal(forgotPasswordAckMessage(false), NEUTRAL_RECOVERY_ACK);
    assert.equal(forgotPasswordAckMessage("unknown"), NEUTRAL_RECOVERY_ACK);
    assert.notEqual(NEUTRAL_RECOVERY_ACK.toLowerCase().includes("no account"), true);
    assert.notEqual(NEUTRAL_RECOVERY_ACK.toLowerCase().includes("not found"), true);
  });
});

describe("auth password recovery — expired-token", () => {
  it("classifies expired OTP / link errors", () => {
    assert.equal(
      classifyAuthRecoveryError({ message: "Email link is invalid or has expired", code: "otp_expired" }),
      "expired_token",
    );
    assert.match(userFacingRecoveryError("expired_token"), /expired/i);
  });
});

describe("auth password recovery — mismatched-password", () => {
  it("rejects confirm mismatch and empty/short passwords", () => {
    const mismatch = validateNewPassword("securePass1", "securePass2");
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) assert.equal(mismatch.code, "mismatched_password");

    const empty = validateNewPassword("", "");
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.code, "password_empty");

    const short = validateNewPassword("short", "short");
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.code, "password_too_short");
  });
});

describe("auth password recovery — provider-error", () => {
  it("maps unknown provider failures to provider_error without leaking internals", () => {
    assert.equal(
      classifyAuthRecoveryError({ message: "Unexpected upstream 502 from auth", status: 502 }),
      "provider_error",
    );
    assert.equal(
      classifyAuthRecoveryError({ message: "Invalid login credentials", status: 400 }),
      "current_password_invalid",
    );
    assert.match(userFacingRecoveryError("provider_error"), /could not complete/i);
    assert.equal(sanitizeAuthNextPath("https://evil.example"), "/reset-password");
    assert.equal(sanitizeAuthNextPath("//evil.example"), "/reset-password");
    assert.equal(sanitizeAuthNextPath("/settings"), "/settings");
  });
});
