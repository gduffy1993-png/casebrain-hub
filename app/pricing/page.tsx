"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-accent mb-4">Pricing</h1>
          <p className="text-lg text-accent/70">
            Simple, transparent pricing for legal teams
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-1 max-w-2xl mx-auto">
          <Card className="p-8 border-2 border-primary/20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-accent mb-2">Professional</h2>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-4xl font-bold text-accent">£39</span>
                <span className="text-accent/60">per user / month</span>
              </div>
              <p className="text-sm text-accent/60">
                Everything you need to manage cases efficiently
              </p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Unlimited cases</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Unlimited document uploads</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Unlimited analysis versions</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Case pack exports</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Strategic intelligence</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <span className="text-accent">Priority support</span>
              </li>
            </ul>

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  window.location.href = "mailto:support@casebrainhub.com?subject=Upgrade Request";
                }}
              >
                Contact to Upgrade
              </Button>
              <p className="text-xs text-center text-accent/60">
                Or start with a 28-day free trial
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="text-lg font-semibold text-accent mb-3">
              28-Day Free Trial
            </h3>
            <p className="text-sm text-accent/70 mb-4">
              Try CaseBrain Hub free for 28 days. No credit card required.
            </p>
            <ul className="text-sm text-accent/60 space-y-2 text-left max-w-md mx-auto">
              <li>• 1 case</li>
              <li>• 10 documents total</li>
              <li>• Unlimited re-analysis within your case</li>
              <li>• Full export capabilities</li>
            </ul>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
