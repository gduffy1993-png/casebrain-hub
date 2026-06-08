"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

/** Temporary Clerk connectivity check — enable with NEXT_PUBLIC_SHOW_CLERK_TEST=1 and Clerk keys in env. */
export default function TestAuth() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div style={{ padding: 20 }} className="rounded-lg border border-border bg-card text-sm text-foreground">
      <div className="mb-2 font-medium">Clerk test (dev)</div>
      <div className="mb-2 text-muted-foreground">Loaded: {String(isLoaded)} — Signed in: {String(isSignedIn)}</div>
      <div className="flex flex-wrap gap-2">
        <SignInButton mode="modal">
          <button type="button" className="rounded bg-primary px-3 py-1.5 text-primary-foreground">
            Sign in
          </button>
        </SignInButton>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
