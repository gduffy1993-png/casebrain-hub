import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  classifyAuthRecoveryError,
  userFacingRecoveryError,
  validateNewPassword,
} from "@/lib/auth/password-recovery";

export const runtime = "nodejs";

type Body = {
  password?: unknown;
  confirmPassword?: unknown;
  currentPassword?: unknown;
  mode?: unknown;
};

/**
 * Sets a new password for the current Supabase session.
 * - mode "recovery": recovery/session link flow (no current password)
 * - mode "change": authenticated Settings change (requires current password)
 */
export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const mode = body.mode === "change" ? "change" : "recovery";

  const validation = validateNewPassword(password, confirmPassword);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: validation.code,
        error: validation.message,
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return NextResponse.json(
      {
        ok: false,
        code: "unauthenticated",
        error: userFacingRecoveryError("unauthenticated"),
      },
      { status: 401 },
    );
  }

  try {
    assertRateLimit(`auth:update-password:${user.id}`, {
      limit: 10,
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

  if (mode === "change") {
    if (!currentPassword) {
      return NextResponse.json(
        {
          ok: false,
          code: "current_password_invalid",
          error: "Enter your current password.",
        },
        { status: 400 },
      );
    }
    const reauth = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauth.error) {
      const code = classifyAuthRecoveryError({
        message: reauth.error.message,
        status: reauth.error.status,
        code: reauth.error.code,
      });
      return NextResponse.json(
        {
          ok: false,
          code:
            code === "current_password_invalid"
              ? "current_password_invalid"
              : "provider_error",
          error: userFacingRecoveryError(
            code === "current_password_invalid"
              ? "current_password_invalid"
              : "provider_error",
          ),
        },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const code = classifyAuthRecoveryError({
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return NextResponse.json(
      {
        ok: false,
        code,
        error: userFacingRecoveryError(code),
      },
      { status: 400 },
    );
  }

  if (mode === "recovery") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({
    ok: true,
    code: "password_updated",
    redirectTo: mode === "recovery" ? "/sign-in?reset=success" : null,
  });
}
