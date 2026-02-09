"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Infinity, Shield, Brain, FileText, Mail, Phone, Calendar, CreditCard, BarChart3, Clock, TrendingUp, Users, Star, X, Loader2 } from "lucide-react";
import Link from "next/link";

export default function UpgradePage() {
  const [loading, setLoading] = useState<"pro" | "starter" | null>(null);

  const handleSubscribePro = async () => {
    setLoading("pro");
    try {
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
          Choose Your CaseBrain Plan
        </h1>
        <p className="text-xl text-muted-foreground">
          AI-powered litigation management designed for UK solicitors
        </p>
      </div>

      {/* ROI Explanation */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-primary/10 to-cyan-500/10 border-primary/30">
        <h3 className="text-xl font-semibold mb-4 text-center">How CaseBrain Pays for Itself</h3>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">10-15 hours</div>
            <p className="text-sm text-muted-foreground">Saved per case with AI automation</p>
            <p className="text-xs text-muted-foreground mt-2">(Document extraction, timeline building, risk analysis)</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">£500-750</div>
            <p className="text-sm text-muted-foreground">Value of time saved per case</p>
            <p className="text-xs text-muted-foreground mt-2">(At £50/hour solicitor rate)</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">1 case</div>
            <p className="text-sm text-muted-foreground">One case win = 5-7 months subscription</p>
            <p className="text-xs text-muted-foreground mt-2">Pro (£99/month) pays for itself in weeks</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-background/50 rounded-lg border border-primary/20">
          <p className="text-sm text-center text-foreground">
            <strong>Example:</strong> If you handle 10 cases/month on Pro (£99/month), you save 100-150 hours = <strong>£5,000-7,500 value</strong>. 
            The subscription costs £99. <strong>ROI: 50-75x</strong>
          </p>
        </div>
      </Card>

      {/* Pricing Tiers */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Free Tier */}
        <Card className="p-6 border-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <p className="text-muted-foreground text-sm">Try CaseBrain risk-free</p>
            <div className="mt-3">
              <span className="text-3xl font-bold">£0</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Limits</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                <span>15 case uploads (lifetime)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                <span>20 AI analysis runs (lifetime)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-muted-foreground">•</span>
                <span>3 Case Pack exports (lifetime)</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">What You Get</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Basic case management</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">AI document extraction (facts, parties, dates)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Timeline building</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Risk alerts & deadline tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Document storage</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-red-400 uppercase mb-2">Not Included</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Strategic Intelligence</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Aggressive Defense Engine</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Time tracking or invoicing</span>
              </li>
            </ul>
          </div>

          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Starter Tier */}
        <Card className="p-6 border-2 border-primary/30 relative">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">Starter</h2>
              <Badge variant="outline" className="text-xs">Solo Practitioner</Badge>
            </div>
            <p className="text-muted-foreground text-sm">Perfect for solo solicitors</p>
            <div className="mt-3">
              <span className="text-3xl font-bold">£49</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">£490/year (save 2 months)</p>
          </div>
          
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Monthly Limits</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <span className="font-medium">50 case uploads/month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <span className="font-medium">100 AI analysis runs/month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <span className="font-medium">20 Case Pack exports/month</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Enough for 10-15 active cases</p>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-primary uppercase mb-2">What You Get</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Everything in Free</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Strategic Intelligence</strong> - Case momentum, leverage points, weak spots</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Aggressive Defense Engine</strong> - Find every defense angle (all practice areas)</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>All practice areas</strong> - Criminal, Housing, PI, Clinical Neg, Family</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Time tracking & invoicing</strong> - Track billable hours, generate invoices</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Email integration</strong> - Send/receive emails linked to cases</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Bundle Navigator</strong> - Find contradictions, missing evidence</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-red-400 uppercase mb-2">Not Included</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">SMS/WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">Trust accounting</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">WIP Recovery, Profitability tracking</span>
              </li>
            </ul>
          </div>

          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-1">Value for Solo Practitioners</p>
            <p className="text-xs text-muted-foreground">
              Handle 10-15 cases/month. Saves 5-10 hours/week = <strong>£250-500/week value</strong>. 
              Costs £49/month. <strong>ROI: 20-40x</strong>
            </p>
          </div>

          <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
            Upgrade to Starter
          </Button>
        </Card>

        {/* Pro Tier */}
        <Card className="p-6 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-cyan-500/5 relative">
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-white">MOST POPULAR</Badge>
          </div>
          
          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-2xl font-bold">Pro</h2>
              <Star className="h-5 w-5 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">For growing firms</p>
            <div className="mt-3">
              <span className="text-3xl font-bold text-primary">£99</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">£990/year (save 2 months)</p>
          </div>
          
          <div className="mb-4">
            <p className="text-xs font-semibold text-primary uppercase mb-2">Unlimited</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Infinity className="h-4 w-4 text-primary" />
                <span className="font-medium">Unlimited case uploads</span>
              </li>
              <li className="flex items-center gap-2">
                <Infinity className="h-4 w-4 text-primary" />
                <span className="font-medium">Unlimited AI analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <Infinity className="h-4 w-4 text-primary" />
                <span className="font-medium">Unlimited exports</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold text-primary uppercase mb-2">Everything in Starter, Plus:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>SMS/WhatsApp</strong> - Send messages to clients</span>
              </li>
              <li className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Trust accounting</strong> - SRA-compliant client money handling</span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Calendar sync</strong> - Google Calendar/Outlook integration</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>E-signatures</strong> - DocuSign integration</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>WIP Recovery Optimizer</strong> - Find unbilled time, suggest invoices</span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Opponent Behavior Profiler</strong> - Track opponent patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Profitability tracking</strong> - See which cases make money</span>
              </li>
              <li className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Settlement Calculator</strong> - Optimal settlement recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Custom reports</strong> - Build your own reports</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Document version control</strong> - Track changes, restore versions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm"><strong>Priority support</strong> - Get help when you need it</span>
              </li>
            </ul>
          </div>

          <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-1">Value for Growing Firms</p>
            <p className="text-xs text-muted-foreground">
              Handle 20+ cases/month. Saves 10-15 hours/week = <strong>£500-750/week value</strong>. 
              Costs £99/month. <strong>ROI: 20-30x</strong>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
              onClick={handleSubscribePro}
              disabled={loading !== null}
            >
              {loading === "pro" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {loading === "pro" ? "Redirecting…" : "Upgrade to Pro"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              <a href="mailto:sales@casebrain.com" className="text-primary hover:underline">Contact sales</a> for 5+ users or enterprise pricing
            </p>
          </div>
        </Card>
      </div>

      {/* Simple Comparison */}
      <Card className="p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-center">What You Actually Get</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Free</div>
            <div className="text-sm text-muted-foreground mb-4">£0/month</div>
            <div className="space-y-2 text-left">
              <p className="text-sm"><strong>You get:</strong></p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Basic case management</li>
                <li>• AI document extraction</li>
                <li>• Timeline & risk alerts</li>
                <li>• 15 uploads to test</li>
              </ul>
              <p className="text-sm mt-3"><strong>You DON'T get:</strong></p>
              <ul className="text-xs space-y-1 text-red-400">
                <li>✗ Strategic Intelligence</li>
                <li>✗ Aggressive Defense</li>
                <li>✗ Time tracking</li>
              </ul>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Starter</div>
            <div className="text-sm text-muted-foreground mb-4">£49/month</div>
            <div className="space-y-2 text-left">
              <p className="text-sm"><strong>You get:</strong></p>
              <ul className="text-xs space-y-1">
                <li>• Everything in Free</li>
                <li>• <strong>Strategic Intelligence</strong> (find leverage, weak spots)</li>
                <li>• <strong>Aggressive Defense Engine</strong> (win more cases)</li>
                <li>• <strong>Time tracking & invoicing</strong></li>
                <li>• <strong>Email integration</strong></li>
                <li>• 50 uploads/month (10-15 cases)</li>
              </ul>
              <p className="text-sm mt-3 text-muted-foreground"><strong>Value:</strong> Saves 5-10 hours/week = £250-500/week. Costs £49/month. <strong>ROI: 20-40x</strong></p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Pro</div>
            <div className="text-sm text-muted-foreground mb-4">£99/month</div>
            <div className="space-y-2 text-left">
              <p className="text-sm"><strong>You get:</strong></p>
              <ul className="text-xs space-y-1">
                <li>• Everything in Starter</li>
                <li>• <strong>Unlimited</strong> uploads/analysis/exports</li>
                <li>• <strong>SMS/WhatsApp</strong></li>
                <li>• <strong>Trust accounting</strong> (SRA compliant)</li>
                <li>• <strong>WIP Recovery</strong> (find unbilled time)</li>
                <li>• <strong>Profitability tracking</strong></li>
                <li>• <strong>All advanced features</strong></li>
              </ul>
              <p className="text-sm mt-3 text-muted-foreground"><strong>Value:</strong> Saves 10-15 hours/week = £500-750/week. Costs £99/month. <strong>ROI: 20-30x</strong></p>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA Section */}
      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          Ready to unlock the full power of CaseBrain?
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
              Upgrade to Starter - £49/month
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
              onClick={handleSubscribePro}
              disabled={loading !== null}
            >
              {loading === "pro" ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
              {loading === "pro" ? "Redirecting…" : "Upgrade to Pro - £99/month"}
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = "mailto:sales@casebrain.com?subject=Enterprise Inquiry"}>
              Contact Sales
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            All plans include 14-day money-back guarantee • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
