"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  AlertTriangle, 
  XCircle, 
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ComplianceGap, Severity } from "@/lib/types/casebrain";

type ComplianceGapsPanelProps = {
  caseId: string;
  gaps: ComplianceGap[];
  onGapResolved?: (gapType: string) => void;
};

const severityConfig: Record<Severity, { color: string; icon: React.ReactNode }> = {
  CRITICAL: { 
    color: "bg-danger/10 border-danger/30 text-danger",
    icon: <XCircle className="h-4 w-4" />,
  },
  HIGH: { 
    color: "bg-warning/10 border-warning/30 text-warning",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  MEDIUM: { 
    color: "bg-primary/10 border-primary/30 text-primary",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  LOW: { 
    color: "bg-accent/10 border-accent/30 text-accent-soft",
    icon: <CheckCircle className="h-4 w-4" />,
  },
};

export function ComplianceGapsPanel({ caseId, gaps, onGapResolved }: ComplianceGapsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalGaps = gaps.filter(g => g.severity === "CRITICAL");
  const highGaps = gaps.filter(g => g.severity === "HIGH");
  const otherGaps = gaps.filter(g => g.severity !== "CRITICAL" && g.severity !== "HIGH");

  const hasUrgentGaps = criticalGaps.length > 0 || highGaps.length > 0;

  if (gaps.length === 0) {
    return (
      <Card className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/20">
            <FileCheck className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-success">Compliance Complete</h3>
            <p className="text-sm text-accent-soft">
              All SRA compliance items verified for this case
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-warning" />
          Compliance Gaps
          {hasUrgentGaps && (
            <Badge variant="danger" size="sm" glow>
              {criticalGaps.length + highGaps.length} urgent
            </Badge>
          )}
        </div>
      }
      description="SRA protection - critical items that need attention"
    >
      <div className="space-y-3">
        {/* Critical & High Priority Gaps - Always visible */}
        {[...criticalGaps, ...highGaps].map((gap) => (
          <GapItem key={gap.type} gap={gap} />
        ))}

        {/* Other Gaps - Collapsible */}
        {otherGaps.length > 0 && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between rounded-lg bg-surface-muted/50 px-3 py-2 text-xs font-medium text-accent-soft hover:bg-surface-muted transition-colors"
            >
              <span>
                {otherGaps.length} other item{otherGaps.length > 1 ? "s" : ""} to review
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-2 animate-fade-in">
                {otherGaps.map((gap) => (
                  <GapItem key={gap.type} gap={gap} compact />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function GapItem({ gap, compact = false }: { gap: ComplianceGap; compact?: boolean }) {
  const config = severityConfig[gap.severity];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${config.color}`}>
        {config.icon}
        <span className="text-sm font-medium">{gap.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{gap.label}</h4>
            <Badge 
              variant={gap.severity === "CRITICAL" ? "danger" : gap.severity === "HIGH" ? "warning" : "primary"} 
              size="sm"
            >
              {gap.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm opacity-80">{gap.suggestion}</p>
        </div>
      </div>
    </div>
  );
}

