"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Menu,
  X,
  Play,
  Shield,
  Lock,
  CheckCircle2,
  Clock,
  Users,
  Home,
  Heart,
  Stethoscope,
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
                AI paralegal for modern litigation teams.
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                Upload your case bundle and let CaseBrain extract facts, build chronologies, flag risks, and identify missing evidence automatically.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-in">
                  <Button variant="primary" size="lg" className="text-base w-full sm:w-auto">
                    Start free pilot
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button variant="outline" size="lg" className="text-base w-full sm:w-auto">
                    <Play className="mr-2 h-5 w-5" />
                    Watch 90-second demo
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                No credit card needed. Designed for UK litigation teams.
              </p>
            </div>

            {/* Right: Video/Screenshot Card */}
            <div className="relative">
              <div className="rounded-2xl bg-card border border-border shadow-2xl shadow-black/60 overflow-hidden">
                {/* Fake app header strip */}
                <div className="h-12 bg-muted border-b border-border flex items-center gap-2 px-4">
                  <div className="h-2 w-2 rounded-full bg-red-500/60"></div>
                  <div className="h-2 w-2 rounded-full bg-amber-500/60"></div>
                  <div className="h-2 w-2 rounded-full bg-green-500/60"></div>
                  <div className="ml-auto h-6 w-32 rounded bg-border/50"></div>
                </div>
                
                {/* Video or placeholder */}
                <div className="aspect-video bg-muted/30 flex items-center justify-center relative">
                  {/* Try to load video, fallback to placeholder */}
                  <video
                    className="w-full h-full object-cover"
                    controls
                    poster="/casebrain-demo-poster.jpg"
                  >
                    <source src="/casebrain-demo.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Placeholder if video doesn't exist */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/30">
                    <div className="text-center space-y-4 p-8">
                      <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <Play className="h-10 w-10 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        CaseBrain demo video goes here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add /public/casebrain-demo.mp4 to show video
                      </p>
                    </div>
                  </div>
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
            Built for: <span className="text-foreground font-medium">Housing disrepair</span> · <span className="text-foreground font-medium">Personal injury</span> · <span className="text-foreground font-medium">Clinical negligence</span> · <span className="text-foreground font-medium">General litigation</span>
          </p>
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
                Full fact extraction
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CaseBrain processes entire bundles, extracting parties, dates, events, and key facts across all document types.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Automatic limitation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Timeline built from all documents with automatic limitation calculations, including minors and hybrid cases.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Awaab's Law alerts
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Flags hazards, under-5s, symptoms and compliance failures with CRITICAL / HIGH / MEDIUM status and deadline tracking.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Missing Evidence Finder
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identifies gaps such as missing tenancy docs, medical reports, engineer surveys, or witness statements.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Case Heatmap
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Visual RAG assessment across liability, causation, quantum, evidence completeness, and procedural compliance.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                One-click bundles & letters
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Export summaries, key issues, and draft letters into templates ready for review and sending.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="px-4 py-20 bg-gradient-to-b from-transparent to-muted/20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground text-center mb-12">
            Designed around real litigation roles
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Housing Solicitor */}
            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                {/* Placeholder - replace with /images/role-housing.jpg */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Home className="h-10 w-10 text-primary" />
                </div>
                {/* Uncomment when you have the image:
                <Image
                  src="/images/role-housing.jpg"
                  alt="Housing Solicitor"
                  fill
                  className="object-cover"
                />
                */}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Senior Housing Solicitor
              </h3>
              <p className="text-sm text-muted-foreground italic">
                "I use CaseBrain to quickly identify Awaab's Law triggers and missing evidence in disrepair cases. It saves me hours on each file."
              </p>
            </Card>

            {/* PI Litigator */}
            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Stethoscope className="h-10 w-10 text-primary" />
                </div>
                {/* Uncomment when you have the image:
                <Image
                  src="/images/role-pi.jpg"
                  alt="PI Litigator"
                  fill
                  className="object-cover"
                />
                */}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                PI Litigator
              </h3>
              <p className="text-sm text-muted-foreground italic">
                "CaseBrain's limitation calculations and risk flags help me spot issues early. The case heatmap gives me instant visibility."
              </p>
            </Card>

            {/* Clinical Negligence Paralegal */}
            <Card className="p-6 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Heart className="h-10 w-10 text-primary" />
                </div>
                {/* Uncomment when you have the image:
                <Image
                  src="/images/role-clinical.jpg"
                  alt="Clinical Negligence Paralegal"
                  fill
                  className="object-cover"
                />
                */}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Clinical Negligence Paralegal
              </h3>
              <p className="text-sm text-muted-foreground italic">
                "The automatic chronology and missing evidence finder help me prepare bundles faster. Everything is structured and ready for review."
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
                Drop in your PDFs, emails, letters, medical records, and tenancy documents. CaseBrain accepts multiple file types.
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
                We extract facts, dates, limitation triggers, risk flags, and compliance issues across housing, PI, and clinical negligence.
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
                Edit, export, and send. Everything is structured and ready for qualified professionals to review and act on.
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
                  CaseBrain does not provide legal advice; it structures the file for qualified professionals. All outputs should be reviewed by a qualified solicitor.
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
                AI paralegal platform that helps UK litigation teams automate case document workflows safely.
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
    </div>
  );
}
