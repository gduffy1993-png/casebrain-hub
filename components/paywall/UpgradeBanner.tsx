"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap, ArrowRight } from "lucide-react";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";
import Link from "next/link";

export function UpgradeBanner() {
  const { plan, uploadsRemaining, analysesRemaining, exportsRemaining, loading } = usePaywallStatus();

  if (loading) {
    return null;
  }

  if (plan === "pro") {
    return null; // Don't show banner for pro users
  }

  const hasLowQuota = uploadsRemaining <= 1 || analysesRemaining <= 1 || exportsRemaining <= 0;

  if (!hasLowQuota) {
    return null; // Only show when quotas are low
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-amber-950/30 to-orange-950/30 border-amber-800/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-amber-200">You're on the free plan</h4>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Free
              </Badge>
            </div>
            <p className="text-sm text-amber-200/80 mb-2">
              {uploadsRemaining <= 1 && (
                <span className="block">• {uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining</span>
              )}
              {analysesRemaining <= 1 && (
                <span className="block">• {analysesRemaining} analysis{analysesRemaining !== 1 ? "es" : ""} remaining</span>
              )}
              {exportsRemaining === 0 && (
                <span className="block">• No exports remaining</span>
              )}
            </p>
            <p className="text-xs text-amber-200/60">
              Upgrade to Pro for unlimited usage and advanced AI features.
            </p>
          </div>
        </div>
        <Link href="/upgrade">
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Zap className="h-4 w-4 mr-2" />
            Upgrade
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

