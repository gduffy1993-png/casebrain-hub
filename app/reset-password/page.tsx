"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { userFacingRecoveryError } from "@/lib/auth/password-recovery";

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

  const bannerError = useMemo(() => {
    if (linkError === "expired") return userFacingRecoveryError("expired_token");
    if (linkError === "invalid_or_expired") return userFacingRecoveryError("invalid_token");
    return null;
  }, [linkError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (linkError) {
        setSessionMissing(true);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setSessionMissing(true);
      } else {
        setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmPassword,
          mode: "recovery",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? userFacingRecoveryError("provider_error"));
        setIsLoading(false);
        return;
      }
      router.push(data.redirectTo || "/sign-in?reset=success");
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
      ) : !sessionReady ? (
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
