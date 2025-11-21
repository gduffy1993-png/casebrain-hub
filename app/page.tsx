import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-white via-slate-50 to-indigo-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            CB
          </div>
          <div>
            <p className="text-lg font-semibold text-accent">CaseBrain Hub</p>
            <p className="text-xs text-accent/60 uppercase tracking-wide">
              AI Paralegal for Modern Firms
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium text-accent/70">
          <Link href="#features" className="hover:text-primary">
            Features
          </Link>
          <Link href="#security" className="hover:text-primary">
            Security
          </Link>
          <Link href="#workflows" className="hover:text-primary">
            Workflows
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Enter Workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-white px-5 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/10">
                Sign In
              </span>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-16 px-6 py-12 lg:flex-row lg:items-center">
        <div className="max-w-xl space-y-6">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            Trusted AI Drafting for Litigation Teams
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-accent sm:text-5xl">
            Automate document handling and letters without sacrificing control.
          </h1>
          <p className="text-lg text-accent/70">
            CaseBrain Hub ingests disclosure packs, extracts key facts, drafts
            compliant letters, and keeps your case timeline audit-ready—designed
            for solicitors and paralegals operating under SRA guidance.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <span className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90">
                  Book a Demo
                </span>
              </SignInButton>
            </SignedOut>
            <Link
              href="#security"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:border-primary"
            >
              Security Overview
            </Link>
          </div>
        </div>

        <div className="glass-card relative w-full max-w-lg rounded-3xl p-8 shadow-card ring-1 ring-primary/10">
          <div className="absolute right-8 top-8 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
            Audit Protected
          </div>
          <h2 className="text-lg font-semibold text-accent">
            Litigation Case Snapshot
          </h2>
          <p className="mt-2 text-sm text-accent/60">
            Auto-generated summary created 2 mins ago
          </p>
          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-widest text-accent/50">
                Parties
              </p>
              <p className="mt-2 font-medium text-accent">
                Jane Matthews (Claimant) vs. Northbound Transport Ltd.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-widest text-accent/50">
                Next Deadline
              </p>
              <p className="mt-2 font-medium text-accent">
                Disclosure list due in 12 working days (CPR 31.10)
              </p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs uppercase tracking-widest text-accent/50">
                Draft Letter
              </p>
              <p className="mt-2 font-medium text-accent">
                Liability acknowledgement ready for partner approval.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
