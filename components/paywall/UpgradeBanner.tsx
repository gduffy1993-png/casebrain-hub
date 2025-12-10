"use client";

import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";
import Link from "next/link";

/**
 * Subtle, ChatGPT-style upgrade banner
 * Only shows when user has used 80%+ of quota
 * Non-blocking, informational only
 */
export function UpgradeBanner() {
  const { 
    plan, 
    uploadCount, 
    uploadLimit, 
    analysisCount, 
    analysisLimit, 
    exportCount, 
    exportLimit,
    loading 
  } = usePaywallStatus();

  if (loading || plan === "pro") {
    return null;
  }

  // Only show when user has actually used 80%+ of their quota
  const uploadThreshold = Math.ceil(uploadLimit * 0.8);
  const analysisThreshold = Math.ceil(analysisLimit * 0.8);
  const exportThreshold = Math.ceil(exportLimit * 0.8);
  
  const hasLowQuota = 
    (uploadCount >= uploadThreshold && uploadLimit < Infinity) ||
    (analysisCount >= analysisThreshold && analysisLimit < Infinity) ||
    (exportCount >= exportThreshold && exportLimit < Infinity);

  if (!hasLowQuota) {
    return null;
  }

  const uploadsRemaining = Math.max(0, uploadLimit - uploadCount);
  const analysesRemaining = Math.max(0, analysisLimit - analysisCount);
  const exportsRemaining = Math.max(0, exportLimit - exportCount);

  // Subtle, non-blocking banner (ChatGPT-style)
  return (
    <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span>
            {uploadsRemaining <= 1 && uploadLimit < Infinity && (
              <span>{uploadsRemaining} upload{uploadsRemaining !== 1 ? "s" : ""} remaining this month</span>
            )}
            {analysesRemaining <= 1 && analysisLimit < Infinity && (
              <span>{analysesRemaining} analysis{analysesRemaining !== 1 ? "es" : ""} remaining this month</span>
            )}
            {exportsRemaining === 0 && exportLimit < Infinity && (
              <span>Export limit reached</span>
            )}
          </span>
        </div>
        <Link href="/upgrade">
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
            Upgrade
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
