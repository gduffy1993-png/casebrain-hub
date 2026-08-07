"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import {
  userFacingRecoveryError,
  validateNewPassword,
} from "@/lib/auth/password-recovery";
import { extractImplicitSessionFromHash } from "@/lib/auth/recovery-callback";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [checking, setChecking] = useState(true);

  const bannerError = useMemo(() => {
    if (linkError === "expired") return userFacingRecoveryError("expired_token");
    if (linkError === "invalid_or_expired") return userFacingRecoveryError("invalid_token");
    return null;
  }, [linkError]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function establishSession() {
      if (linkError) {
        if (!cancelled) {
          setSessionMissing(true);
          setChecking(false);
        }
        return;
      }

      // Implicit-flow fallback: tokens arrive in the URL hash (never sent to the server).
      if (typeof window !== "undefined" && window.location.hash) {
        const implicit = extractImplicitSessionFromHash(window.location.hash);
        if (implicit) {
          const { error: setErr } = await supabase.auth.setSession(implicit);
          // Clear hash so refresh does not re-process tokens / leak them in history.
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          if (setErr) {
            if (!cancelled) {
              setSessionMissing(true);
              setChecking(false);
            }
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        setSessionReady(true);
        setSessionMissing(false);
        setChecking(false);
        return;
      }

      // Brief wait for cookie hydration after PKCE redirect.
      await new Promise((r) => setTimeout(r, 250));
      const again = await supabase.auth.getUser();
      if (cancelled) return;
      if (again.data.user) {
        setSessionReady(true);
        setSessionMissing(false);
      } else {
        setSessionMissing(true);
      }
      setChecking(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.user
      ) {
        setSessionReady(true);
        setSessionMissing(false);
        setChecking(false);
      }
    });

    void establishSession();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [linkError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateNewPassword(password, confirmPassword);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || userFacingRecoveryError("provider_error"));
        setIsLoading(false);
        return;
      }

      // Clear recovery session before returning to sign-in.
      await supabase.auth.signOut();
      router.push("/sign-in?reset=success");
      router.refresh();
    } catch {
      setError(userFacingRecoveryError("provider_error"));
      setIsLoading(false);
    }
  };

  const blocked = Boolean(bannerError) || sessionMissing;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      {(bannerError || error) && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-red-200">
          {error ?? bannerError}
        </div>
      )}

      {blocked ? (
        <div className="space-y-4">
          {!bannerError && sessionMissing && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-red-200">
              {userFacingRecoveryError("unauthenticated")}
            </div>
          )}
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Request a new reset email
          </Link>
          <div>
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : checking || !sessionReady ? (
        <p className="text-sm text-muted-foreground">Checking reset session…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
            {isLoading ? "Saving…" : "Save new password"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            After saving, you will return to sign in with the new password.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
              Loading…
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
