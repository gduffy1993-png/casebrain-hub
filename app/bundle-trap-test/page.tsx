"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  XCircle,
  FileWarning,
  ArrowRight,
} from "lucide-react";

const FEATURED_TRAP = {
  hook: "Can your current workflow spot this before court?",
  bundleExcerpt: `INDEX — Document | Pages | Note
Screenshot and message pack | 7-8 | Served
MG6C disclosure schedule | 4 |

MG6C/002 — Screenshot and message pack RM/01 — served on bundle.
MG6C/004 — Full phone download / source export — outstanding — not on bundle.
MG6C/003 — Subscriber/account data — outstanding — not on bundle.

Police note: handset seized. Attribution asserted — subscriber data not served.`,
  looksServed: [
    "Screenshot and message pack on the bundle",
    "Phone extraction summary on the papers",
    "Draft complainant account",
  ],
  actuallyMissing: [
    "Full phone download / source export",
    "Subscriber / account data",
    "Final signed MG11",
  ],
  referredOnly: ["Device metadata export — referred on MG6C, not attached"],
  caseBrainLabels: {
    served: ["Screenshot / message pack", "Phone extraction summary"],
    referredOnly: ["Device metadata"],
    missing: ["Full phone download", "Subscriber / account data", "Final signed MG11"],
    notSafeToSay: [
      "Defendant sent the messages",
      "Attribution is proved from screenshots alone",
      "MG11 is final and signed",
    ],
  },
  refused: [
    "Do not state sender identity from screenshots alone",
    "Do not import BWV or CAD material not on this bundle",
    "Do not treat handset seizure as subscriber proof",
  ],
};

export default function BundleTrapTestPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm">CB</span>
            CaseBrain
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-slate-400 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
            >
              Request access
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        {/* 1. Hook */}
        <section className="mb-12 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-amber-400/90">
            Controlled fictional demo
          </p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {FEATURED_TRAP.hook}
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-400 sm:text-lg">
            A solicitor challenge — not a sales page. This fictional bundle excerpt shows how easy it is to
            overstate served material before a hearing.
          </p>
        </section>

        {/* 2. Trap */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <FileWarning className="h-5 w-5 text-amber-400" />
            The trap
          </h2>
          <Card className="overflow-hidden border-slate-700/60 bg-slate-900/80 p-0">
            <div className="border-b border-slate-700/60 bg-slate-800/50 px-4 py-2 text-xs text-slate-500">
              Fictional prosecution bundle excerpt — harassment / digital
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-300 sm:text-sm">
              {FEATURED_TRAP.bundleExcerpt}
            </pre>
          </Card>
          <p className="mt-3 text-sm text-slate-500">
            No real client data. Controlled demo for professional review only. Not legal advice.
          </p>
        </section>

        {/* 3–4. Served vs missing */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              What looks served
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              {FEATURED_TRAP.looksServed.map((item) => (
                <li key={item} className="flex gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              What is actually missing / referred
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              {FEATURED_TRAP.actuallyMissing.map((item) => (
                <li key={item} className="flex gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                  <span className="text-amber-400">—</span>
                  {item}
                </li>
              ))}
              {FEATURED_TRAP.referredOnly.map((item) => (
                <li key={item} className="flex gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2">
                  <span className="text-slate-400">↗</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 5. CaseBrain result */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Shield className="h-5 w-5 text-primary" />
            CaseBrain result
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabelBlock title="Served" items={FEATURED_TRAP.caseBrainLabels.served} tone="served" />
            <LabelBlock title="Referred only" items={FEATURED_TRAP.caseBrainLabels.referredOnly} tone="referred" />
            <LabelBlock title="Missing" items={FEATURED_TRAP.caseBrainLabels.missing} tone="missing" />
            <LabelBlock title="Not safe to say" items={FEATURED_TRAP.caseBrainLabels.notSafeToSay} tone="unsafe" />
          </div>
        </section>

        {/* 6. Refused */}
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <XCircle className="h-5 w-5 text-red-400" />
            What CaseBrain refused to say
          </h2>
          <ul className="space-y-2">
            {FEATURED_TRAP.refused.map((line) => (
              <li
                key={line}
                className="rounded-lg border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm text-slate-300"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* 7–8. CTA + lead form */}
        <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 sm:p-8">
          <h2 className="mb-2 text-xl font-bold text-white">Request the 10-trap demo pack</h2>
          <p className="mb-6 text-sm text-slate-400">
            BWV, CCTV, phone, co-def, custody, MG11, Encro, charge mismatch, OCR traps — all fictional,
            all solicitor-safe. No engine internals exposed.
          </p>

          {submitted ? (
            <p className="rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
              Thanks — we&apos;ll be in touch. This form is a placeholder until CRM is wired.
            </p>
          ) : (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <Field label="Name" name="name" placeholder="Your name" />
              <Field label="Firm" name="firm" placeholder="Firm name" />
              <Field label="Email" name="email" type="email" placeholder="you@firm.co.uk" />
              <Field label="Role" name="role" placeholder="Partner / associate / paralegal" />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">Main pain</label>
                <textarea
                  name="pain"
                  rows={3}
                  placeholder="e.g. thin disclosure, attribution gaps, hearing prep under time pressure"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" className="w-full sm:w-auto">
                  Request demo pack
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}
        </section>

        <footer className="mt-12 border-t border-slate-800 pt-8 text-center text-xs text-slate-600">
          <p>CaseBrain — controlled fictional demo. Not legal advice. Not a claim of real-world audited accuracy.</p>
          <p className="mt-2">
            <Link href="/privacy" className="hover:text-slate-400">
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="hover:text-slate-400">
              Terms
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function LabelBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "served" | "referred" | "missing" | "unsafe";
}) {
  const border =
    tone === "served"
      ? "border-emerald-900/40"
      : tone === "referred"
        ? "border-slate-600"
        : tone === "missing"
          ? "border-amber-900/40"
          : "border-red-900/40";
  return (
    <div className={`rounded-lg border ${border} bg-slate-950/50 p-4`}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="space-y-1.5 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={name === "email" || name === "name"}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
