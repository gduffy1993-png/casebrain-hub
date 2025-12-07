"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Calendar,
  AlertTriangle,
  Search,
  Briefcase,
  Download,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <RedirectToDashboard />
      </SignedIn>
      <SignedOut>
        <MarketingHomepage />
      </SignedOut>
    </>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <p className="text-sm text-slate-400">Redirecting to dashboard...</p>
    </div>
  );
}

function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                CaseBrain Hub – AI paralegal for modern litigation teams
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                Upload your case bundle and let CaseBrain build the chronology, key issues, risk flags and deadlines automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-in">
                  <Button
                    variant="primary"
                    size="lg"
                    className="text-base w-full sm:w-auto"
                  >
                    Start free – upload your first case
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-base w-full sm:w-auto"
                  >
                    Already using CaseBrain? Sign in
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Screenshot Card */}
            <div className="relative">
              <div className="rounded-xl bg-card border border-border shadow-xl shadow-black/40 p-2">
                <div className="rounded-lg bg-muted/50 aspect-video flex items-center justify-center border border-border/50">
                  {/* Placeholder for dashboard screenshot */}
                  <div className="text-center space-y-4 p-8">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dashboard Screenshot
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Replace with actual screenshot at /public/dashboard-screenshot.png
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-transparent to-slate-950/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            How it Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Upload your bundle
              </h3>
              <p className="text-muted-foreground">
                Drop in your PDFs – statements, emails, medical records, tenancy documents.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                CaseBrain reads everything
              </h3>
              <p className="text-muted-foreground">
                We extract facts, dates, issues and risks across housing, PI and clinical negligence.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Get a structured case file
              </h3>
              <p className="text-muted-foreground">
                Chronology, key issues, risk alerts, Awaab's Law deadlines, missing evidence and next-step prompts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            Everything you need to manage cases
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Full-file PDF reading
              </h3>
              <p className="text-sm text-muted-foreground">
                CaseBrain processes entire bundles, not short prompts.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Automatic chronology & limitation
              </h3>
              <p className="text-sm text-muted-foreground">
                Timeline built from all documents, including minors and hybrid calculations.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Awaab's Law & risk engine
              </h3>
              <p className="text-sm text-muted-foreground">
                Flags hazards, under-5s, symptoms and compliance failures with CRITICAL / HIGH / MEDIUM status.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Missing Evidence Finder
              </h3>
              <p className="text-sm text-muted-foreground">
                Identifies gaps such as missing tenancy docs, medicals or engineer reports.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Multi-practice packs
              </h3>
              <p className="text-sm text-muted-foreground">
                Housing, PI and Clinical Neg – all powered by one engine.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bundle-ready outputs
              </h3>
              <p className="text-sm text-muted-foreground">
                Export summaries and key issues into templates (coming soon).
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-slate-950/50 to-transparent">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <h2 className="text-2xl lg:text-3xl font-semibold text-foreground">
            Built for Housing, PI, Clinical Negligence & General Litigation teams.
          </h2>
          <p className="text-lg text-muted-foreground">
            Designed for firms drowning in PDFs, deadlines and compliance pressure.
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Ready to bring order to your case files?
          </h2>
          <Link href="/sign-in">
            <Button
              variant="primary"
              size="lg"
              className="text-base"
            >
              Start free – upload your first case
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                CB
              </div>
              <span className="text-sm font-semibold text-foreground">
                CaseBrain Hub
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="mailto:support@casebrainhub.com"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} CaseBrain Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
