"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NEUTRAL_RECOVERY_ACK } from "@/lib/auth/password-recovery";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "We could not complete that request just now.");
        setIsLoading(false);
        return;
      }
      setDone(true);
      setIsLoading(false);
    } catch {
      setError("We could not complete that request just now. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the work email you use to sign in to CaseBrain.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground">
                {NEUTRAL_RECOVERY_ACK}
              </div>
              <p className="text-xs text-muted-foreground">
                Delivery depends on your mail provider. This screen does not confirm that a message
                was received.
              </p>
              <Link href="/sign-in" className="text-sm text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send reset email"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/sign-in" className="text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
