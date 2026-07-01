"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TestAuth from "@/components/TestAuth";
import { createClient } from "@/lib/supabase/browser";
import {
  Upload,
  FileText,
  Calendar,
  AlertTriangle,
  Search,
  Briefcase,
  Download,
  ArrowRight,
  Menu,
  X,
  Play,
  Shield,
  Lock,
  CheckCircle2,
  Clock,
  Users,
  Gavel,
  Scale,
} from "lucide-react";
import { getPostLoginPath, isCriminalPilotMode } from "@/lib/pilot-mode";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        router.replace(getPostLoginPath({ email: user.email }));
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Redirecting to your workspace…</p>
      </div>
    );
  }

  return isCriminalPilotMode() ? <PilotMarketingHomepage /> : <MarketingHomepage />;
}

function PilotMarketingHomepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                CB
              </div>
              <span className="text-lg font-semibold text-foreground">CaseBrain Hub</span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="primary" size="sm">
                  Start pilot
                </Button>
              </Link>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/50 py-4 space-y-2">
              <Link href="/sign-in" className="block">
                <Button variant="ghost" size="sm" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-in" className="block">
                <Button variant="primary" size="sm" className="w-full">
                  Start pilot
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      <section className="px-4 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Criminal defence control room for evidence-heavy cases.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Upload case papers and surface the allegation, disclosure gaps, missing evidence, risk
            points, safe court line and next actions — with solicitor review.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="primary" size="lg" className="text-base w-full sm:w-auto">
                Start pilot
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Evidence-linked · conditional · solicitor review required · UK criminal defence
          </p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/80 border-border/60">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Court Today</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Court diary for pilot matters — hearings, risk flags, and missing evidence at a glance.
            </p>
          </Card>
          <Card className="p-6 bg-card/80 border-border/60">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <Gavel className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Control Room</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Evidence-linked strategy workspace — pressure routes, hearing line, and next actions.
            </p>
          </Card>
          <Card className="p-6 bg-card/80 border-border/60">
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Disclosure Chase</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track served and outstanding material — MG6 rows, CCTV, and continuity gaps.
            </p>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border bg-card/50 px-4 py-10">
        <div className="mx-auto max-w-5xl text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Provisional, evidence-linked outputs · solicitor review required · not legal advice
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/security" className="hover:text-foreground">
              Security
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CaseBrain Hub
          </p>
        </div>
      </footer>
    </div>
  );
}

function MarketingHomepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            CB
          </div>
              <span className="text-lg font-semibold text-foreground">CaseBrain Hub</span>
        </div>

            {/* Center: Links (Desktop) */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Product
              </Link>
              <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How it works
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
          </Link>
              <Link href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Security
          </Link>
            </div>

            {/* Right: CTAs (Desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="primary" size="sm">
                  Start free pilot
                </Button>
          </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/50 py-4 space-y-4">
              <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground">
                Product
              </Link>
              <Link href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">
                How it works
              </Link>
              <Link href="/pricing" className="block text-sm text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
              <Link href="#security" className="block text-sm text-muted-foreground hover:text-foreground">
                Security
              </Link>
              <div className="pt-4 border-t border-border/50 space-y-2">
                <Link href="/sign-in" className="block">
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-in" className="block">
                  <Button variant="primary" size="sm" className="w-full">
                    Start free pilot
                  </Button>
            </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 lg:py-32">
        {/* Background gradient - can be replaced with /public/images/legal-team-hero.jpg */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-slate-950/80 to-slate-900/50">
          {/* Uncomment and use when you have the hero image:
          <Image
            src="/images/legal-team-hero.jpg"
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
          */}
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight">
                Criminal defence control room for evidence-heavy cases.
          </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                Upload the bundle, map disclosure gaps, and keep strategy conditional on served source material — with solicitor review at every step.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-in">
                  <Button variant="primary" size="lg" className="text-base w-full sm:w-auto">
                    Start free pilot
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#demo">
                  <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">
                    <Play className="mr-2 h-5 w-5" />
                    Watch demo
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                No credit card needed. Built for UK criminal defence teams.
              </p>
            </div>

            {/* Right: Criminal control room preview (no housing / other practice areas) */}
            <div className="relative">
              <div className="rounded-2xl bg-card border border-border shadow-2xl shadow-black/60 overflow-hidden">
                <div className="border-b border-border/60 bg-slate-900/90 px-4 py-3 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-200">Court Today · Control Room</span>
                </div>
                <div className="p-5 space-y-3 bg-gradient-to-b from-slate-900/40 to-card">
                  <div className="rounded-lg border border-border/50 bg-background/80 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Today&apos;s hearing</p>
                    <p className="text-sm font-semibold text-foreground">R v Client — GBH / disclosure chase</p>
                    <p className="text-xs text-muted-foreground">MG6 rows outstanding · strategy route conditional</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-2">
                      <Gavel className="h-4 w-4 mx-auto text-primary mb-1" />
                      <p className="text-[10px] text-muted-foreground">War Room</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-2">
                      <Search className="h-4 w-4 mx-auto text-primary mb-1" />
                      <p className="text-[10px] text-muted-foreground">Disclosure</p>
                    </div>
                    <div className="rounded-md border border-border/40 bg-muted/30 px-2 py-2">
                      <FileText className="h-4 w-4 mx-auto text-primary mb-1" />
                      <p className="text-[10px] text-muted-foreground">Documents</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Evidence-linked · provisional · solicitor review required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built For Strip */}
      <section className="px-4 py-8 bg-muted/30 border-y border-border/50">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-muted-foreground">
            Built for: <span className="text-foreground font-medium">Criminal defence solicitors</span> · <span className="text-foreground font-medium">Police station teams</span> · <span className="text-foreground font-medium">Crown Court preparation</span>
          </p>
        </div>
      </section>

      {/* Demo Video Section */}
      <section id="demo" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              See CaseBrain in action
            </h2>
            <p className="text-lg text-muted-foreground">
              See criminal bundle extraction, disclosure blockers, and strategy flow in action
            </p>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-card shadow-xl">
            <video
              src="/casebrain-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              className="w-full max-h-[520px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            What CaseBrain does for your team
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Bundle-grounded extraction
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Extracts accused, witnesses, MG sections, exhibits, and key dates from uploaded bundle text.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Strategy timeline
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tracks doing now, waiting for disclosure, next steps, and pivot risks in one timeline.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Procedural safety blockers
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Flags unsafe-to-proceed gaps and what must be resolved before hearing strategy can be relied on.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Missing disclosure finder
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Surfaces missing CCTV windows, continuity records, interview materials, and other key disclosure items.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Source text vs AI clarity
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Keeps extracted text beside AI outputs so solicitors can verify names, hooks, and MG references quickly.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Practical solicitor outputs
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Supports defence planning, client-safe wording, and concise solicitor-controlled exports.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-transparent to-muted/20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            Designed around real criminal defence roles
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Criminal Defence Solicitor
              </h3>
              <p className="text-sm text-muted-foreground italic">
                &ldquo;CaseBrain helps me spot disclosure gaps quickly and keeps strategy grounded in what is actually in the bundle.&rdquo;
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Gavel className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Police Station Representative
              </h3>
              <p className="text-sm text-muted-foreground italic">
                &ldquo;I can structure instructions faster and see what evidence we still need before interview and first hearing.&rdquo;
              </p>
            </Card>

            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Scale className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Crown Court Prep Team
              </h3>
              <p className="text-sm text-muted-foreground italic">
                &ldquo;MG sections, disclosure blockers, and strategy timeline in one place make trial prep far less fragmented.&rdquo;
              </p>
            </Card>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Photos are illustrative; CaseBrain is designed for teams like these.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</span>
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Upload the bundle
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload criminal bundle PDFs and supporting documents. CaseBrain extracts source text for strategy work.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</span>
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                CaseBrain reads the file
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                We extract case facts, MG references, chronology points, and disclosure blockers from uploaded material.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center relative">
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</span>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Your team reviews & acts
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Review source text against AI outputs, update strategy, and run next hearing/disclosure actions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section id="security" className="px-4 py-20 bg-gradient-to-b from-muted/20 to-transparent">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            Built for regulated work
          </h2>
          <Card className="p-8 bg-card/50 border-border/50">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Hosted on modern, security-focused cloud infrastructure (<Link href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Vercel</Link> + <Link href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase</Link>).
                </p>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Encrypted in transit (HTTPS) and at rest. All data is encrypted using industry-standard protocols.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Access controlled with <Link href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clerk authentication</Link>. Multi-tenant isolation ensures your firm's data is separate.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Your firm remains the data controller; CaseBrain acts as a data processor. See our <Link href="/terms" className="text-primary hover:underline">Terms</Link>, <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, and <Link href="/security" className="text-primary hover:underline">Security</Link> pages.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  CaseBrain does not provide legal advice; it structures criminal case materials for qualified professionals. All outputs should be reviewed by a qualified solicitor.
                </p>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
            Ready to see your own cases in CaseBrain?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-in">
              <Button variant="primary" size="lg" className="text-base w-full sm:w-auto">
                Start free pilot
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="mailto:support@casebrainhub.com?subject=Book Walkthrough">
              <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">
                Book a quick walkthrough
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Left: Logo + Blurb */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                  CB
                </div>
                <span className="text-lg font-semibold text-foreground">CaseBrain Hub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Criminal-defence workspace that helps UK teams structure bundle evidence and act faster with solicitor control.
              </p>
            </div>

            {/* Middle: Product Links */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
              <nav className="space-y-2">
                <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link href="/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
                <Link href="#security" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Security
                </Link>
                <Link href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  How it works
                </Link>
              </nav>
            </div>

            {/* Right: Legal Links */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
              <nav className="space-y-2">
                <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
                <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/cookies" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cookie Policy
                </Link>
                <Link href="/dpa" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  DPA
                </Link>
              </nav>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} CaseBrain Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {process.env.NEXT_PUBLIC_SHOW_CLERK_TEST === "1" && (
        <div className="border-t border-border/50 bg-slate-900/50 px-4 py-6">
          <div className="mx-auto max-w-4xl">
            <TestAuth />
          </div>
        </div>
      )}
    </div>
  );
}
