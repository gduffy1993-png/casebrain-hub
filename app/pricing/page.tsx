import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you're ready for unlimited power
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* FREE Plan */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Free</h2>
              <div className="text-3xl font-bold text-foreground mb-1">£0</div>
              <p className="text-sm text-muted-foreground">Perfect for trying CaseBrain</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">30 PDFs per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">10 active cases</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">All core features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Email support</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full" disabled>
              Current Plan
            </Button>
          </Card>

          {/* SOLO_MONTHLY Plan */}
          <Card className="p-6 border-primary/30">
            <div className="mb-6">
              <div className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-2">
                MOST POPULAR
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Solo Monthly</h2>
              <div className="text-3xl font-bold text-foreground mb-1">£39</div>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Unlimited PDFs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Unlimited active cases</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">All core features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Advanced analytics</span>
              </li>
            </ul>

            <Button
              className="w-full"
              onClick={() => {
                window.location.href = "/api/upgrade/placeholder?plan=PAID_MONTHLY";
              }}
            >
              Upgrade Monthly
            </Button>
          </Card>

          {/* SOLO_YEARLY Plan */}
          <Card className="p-6">
            <div className="mb-6">
              <div className="inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400 mb-2">
                BEST VALUE
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Solo Yearly</h2>
              <div className="text-3xl font-bold text-foreground mb-1">£390</div>
              <p className="text-sm text-muted-foreground">per year (2 months free)</p>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Unlimited PDFs</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Unlimited active cases</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">All core features</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">Advanced analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <span className="text-sm text-green-400 font-semibold">Save £78 per year</span>
              </li>
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/upgrade/placeholder?plan=PAID_YEARLY";
              }}
            >
              Upgrade Yearly
            </Button>
          </Card>
        </div>

        {/* Contact Sales */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need a custom plan for your firm?
          </p>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "mailto:support@casebrainhub.com?subject=Custom Plan Inquiry";
            }}
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
}

