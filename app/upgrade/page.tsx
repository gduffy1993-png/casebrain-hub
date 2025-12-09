import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Infinity, Shield, Brain, FileText, Mail, Phone, Calendar, CreditCard, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function UpgradePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
          Upgrade to CaseBrain Pro
        </h1>
        <p className="text-xl text-muted-foreground">
          Unlock unlimited AI litigation, uploads and exports.
        </p>
      </div>

      {/* Pricing Tiers */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Free Tier */}
        <Card className="p-6 border-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <p className="text-muted-foreground">Perfect for trying CaseBrain</p>
          </div>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>3 case uploads</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>5 AI analysis runs</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>1 Case Pack export</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Basic case management</span>
            </li>
          </ul>

          <Button variant="outline" className="w-full" disabled>
            Current Plan
          </Button>
        </Card>

        {/* Pro Tier */}
        <Card className="p-6 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-cyan-500/5 relative">
          <div className="absolute top-4 right-4">
            <Badge className="bg-primary text-white">RECOMMENDED</Badge>
          </div>
          
          <div className="mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-2xl font-bold">Pro</h2>
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <p className="text-muted-foreground">Everything you need to win cases</p>
          </div>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-2">
              <Infinity className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium">Unlimited uploads</span>
            </li>
            <li className="flex items-start gap-2">
              <Infinity className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium">Unlimited analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <Infinity className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span className="font-medium">Unlimited exports</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Aggressive Defence Engine</span>
            </li>
            <li className="flex items-start gap-2">
              <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Strategic Intelligence</span>
            </li>
            <li className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Multi-practice packs (Criminal, Housing, PI, Clin Neg, Family)</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Email + SMS/Scheduling</span>
            </li>
            <li className="flex items-start gap-2">
              <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Time tracking & invoicing</span>
            </li>
            <li className="flex items-start gap-2">
              <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Trust accounting</span>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Custom reports</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Priority support</span>
            </li>
          </ul>

          <Button className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90">
            <Zap className="h-4 w-4 mr-2" />
            Request Pro Access
          </Button>
        </Card>
      </div>

      {/* Feature Comparison */}
      <Card className="p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">Why Upgrade to Pro?</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Unlimited Everything</h4>
            <p className="text-sm text-muted-foreground">
              No limits on uploads, analysis, or exports. Use CaseBrain as much as you need.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Advanced AI Features</h4>
            <p className="text-sm text-muted-foreground">
              Aggressive Defence Engine and Strategic Intelligence help you win more cases.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Complete Practice Management</h4>
            <p className="text-sm text-muted-foreground">
              Time tracking, invoicing, trust accounting, and more - everything in one place.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Priority Support</h4>
            <p className="text-sm text-muted-foreground">
              Get help when you need it with priority support from our team.
            </p>
          </div>
        </div>
      </Card>

      {/* CTA Section */}
      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          Ready to unlock the full power of CaseBrain?
        </p>
        <Button size="lg" className="bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90">
          <Zap className="h-5 w-5 mr-2" />
          Request Pro Access
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Contact us to discuss pricing and get started with Pro
        </p>
      </div>
    </div>
  );
}

