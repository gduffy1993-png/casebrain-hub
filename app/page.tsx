"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const WORKSPACE_PATH = "/cases";

export default function HomePage() {
  const router = useRouter();

  // Redirect signed-in users immediately
  useEffect(() => {
    // This will be handled by SignedIn component, but we can also use router
  }, [router]);

  return (
    <>
      <SignedIn>
        <RedirectToWorkspace />
      </SignedIn>
      <SignedOut>
        <LoginPage />
      </SignedOut>
    </>
  );
}

function RedirectToWorkspace() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace(WORKSPACE_PATH);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-accent/60">Redirecting to workspace...</p>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-sm">
            CB
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide uppercase text-slate-900">
              CaseBrain Hub
            </span>
            <span className="text-xs text-slate-500">
              AI paralegal for modern litigation teams
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section with Login Form */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Tagline */}
          <div className="text-center space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-4 py-1.5 text-xs font-medium text-cyan-700">
              Trusted AI paralegal for litigation teams
            </p>
            
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Enter Workspace
            </h1>
            
            <p className="text-sm text-slate-600">
              Sign in to access your cases, documents, and AI-powered insights
            </p>
          </div>

          {/* Clerk SignIn Form */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
            <SignIn 
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              appearance={{
                baseTheme: undefined, // Use light theme for this page
                variables: {
                  colorPrimary: "#06B6D4",
                  colorBackground: "#FFFFFF",
                  colorInputBackground: "#F8FAFC",
                  colorText: "#1E293B",
                  colorInputText: "#1E293B",
                },
                elements: {
                  rootBox: "mx-auto",
                  card: "shadow-none bg-transparent",
                },
              }}
            />
          </div>

          {/* Small Explainer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center">
            <p className="text-xs text-slate-600">
              <span className="font-medium">Secure access:</span> All data is encrypted and 
              isolated per organization. Hosted on Vercel • Supabase • OpenAI
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-8 py-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} CaseBrain Hub.</span>
        <span>Hosted on Vercel • Supabase • OpenAI</span>
      </footer>
    </main>
  );
}
