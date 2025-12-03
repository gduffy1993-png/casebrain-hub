"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Droplets,
  Heart,
  Clock,
  Shield,
  AlertOctagon,
  Baby,
  Stethoscope,
  FileWarning,
} from "lucide-react";
import {
  buildHousingHazardSummary,
  type HousingHazardSummary,
} from "@/lib/packs/housingHazard";
import type { Severity } from "@/lib/types/casebrain";

interface HousingHazardPanelProps {
  caseTitle: string;
  documents: Array<{ name: string; type?: string; extractedText?: string }>;
  notes?: string;
  landlordType?: "social" | "private" | "unknown";
  firstComplaintDate?: string;
  hasChildOccupant?: boolean;
  hasElderlyOccupant?: boolean;
  hasDisabledOccupant?: boolean;
  className?: string;
}

export function HousingHazardPanel({
  caseTitle,
  documents,
  notes,
  landlordType,
  firstComplaintDate,
  hasChildOccupant,
  hasElderlyOccupant,
  hasDisabledOccupant,
  className = "",
}: HousingHazardPanelProps) {
  const summary = useMemo(() => {
    return buildHousingHazardSummary({
      caseTitle,
      documents,
      notes,
      landlordType,
      firstComplaintDate,
      hasChildOccupant,
      hasElderlyOccupant,
      hasDisabledOccupant,
    });
  }, [
    caseTitle,
    documents,
    notes,
    landlordType,
    firstComplaintDate,
    hasChildOccupant,
    hasElderlyOccupant,
    hasDisabledOccupant,
  ]);

  // Don't show if no hazards detected
  if (
    !summary.dampMouldDetected &&
    !summary.vulnerableOccupantsDetected &&
    !summary.hhsrsCategory &&
    !summary.awaabApplies
  ) {
    return null;
  }

  return (
    <Card
      className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Shield className="h-4 w-4 text-amber-400" />
            Housing Hazard Assessment
          </CardTitle>
          <SeverityBadge severity={summary.overallRiskLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Action Banner */}
        {summary.urgentAction && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5">
            <AlertOctagon className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-400">
                Urgent Action Required
              </p>
              <p className="text-[11px] text-white/60 mt-0.5">
                This case shows indicators requiring immediate attention.
              </p>
            </div>
          </div>
        )}

        {/* Hazard Indicators Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Damp & Mould */}
          {summary.dampMouldDetected && (
            <HazardCard
              icon={Droplets}
              title="Damp & Mould"
              severity={summary.dampMouldSeverity}
              items={summary.dampMouldIndicators}
            />
          )}

          {/* Vulnerable Occupants */}
          {summary.vulnerableOccupantsDetected && (
            <HazardCard
              icon={Baby}
              title="Vulnerable Occupants"
              severity={summary.vulnerabilitySeverity}
              items={summary.vulnerableFactors}
            />
          )}

          {/* Health Symptoms */}
          {summary.healthSymptomsDetected && (
            <HazardCard
              icon={Stethoscope}
              title="Health Impact"
              severity="HIGH"
              items={summary.symptoms}
            />
          )}

          {/* Landlord Delays */}
          {summary.delayPatternsDetected && (
            <HazardCard
              icon={Clock}
              title="Landlord Delay"
              severity="MEDIUM"
              items={summary.delayFactors}
            />
          )}
        </div>

        {/* HHSRS Section */}
        {summary.hhsrsCategory && (
          <div
            className={`rounded-lg border p-2.5 ${
              summary.hhsrsCategory === "1"
                ? "border-red-500/30 bg-red-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileWarning
                className={`h-4 w-4 ${
                  summary.hhsrsCategory === "1"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}
              />
              <div>
                <p
                  className={`text-xs font-medium ${
                    summary.hhsrsCategory === "1"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  HHSRS Category {summary.hhsrsCategory} Hazard
                </p>
                <p className="text-[11px] text-white/60">
                  {summary.hhsrsCategory === "1"
                    ? "Category 1 hazards require mandatory local authority action."
                    : "Category 2 hazards should be monitored and addressed."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Awaab's Law Section */}
        {summary.awaabApplies && (
          <div
            className={`rounded-lg border p-2.5 ${
              summary.awaabBreachRisk === "CRITICAL"
                ? "border-red-500/30 bg-red-500/10"
                : summary.awaabBreachRisk === "HIGH"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-purple-500/30 bg-purple-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart
                  className={`h-4 w-4 ${
                    summary.awaabBreachRisk === "CRITICAL"
                      ? "text-red-400"
                      : summary.awaabBreachRisk === "HIGH"
                        ? "text-amber-400"
                        : "text-purple-400"
                  }`}
                />
                <div>
                  <p className="text-xs font-medium text-white/90">
                    Awaab&apos;s Law Applies
                  </p>
                  <p className="text-[11px] text-white/60">
                    Social landlord with damp/mould concerns
                  </p>
                </div>
              </div>
              {summary.awaabDeadlineDays !== undefined && (
                <Badge
                  className={
                    summary.awaabDeadlineDays <= 7
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : summary.awaabDeadlineDays <= 14
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-green-500/20 text-green-400 border-green-500/30"
                  }
                >
                  {summary.awaabDeadlineDays} days to deadline
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              Recommendations
            </p>
            <ul className="space-y-1">
              {summary.recommendations.slice(0, 4).map((rec, i) => (
                <li key={i} className="text-[11px] text-white/60 flex gap-1.5">
                  <span className="text-purple-400">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[9px] text-white/30 pt-2 border-t border-white/5">
          This assessment is based on document analysis and may not reflect all
          conditions. Professional surveyor assessment is recommended.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function SeverityBadge({ severity }: { severity: Severity }) {
  const colors = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
    HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LOW: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <Badge className={colors[severity] ?? colors.LOW}>
      {severity} Risk
    </Badge>
  );
}

function HazardCard({
  icon: Icon,
  title,
  severity,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  severity: Severity;
  items: string[];
}) {
  const borderColor = {
    CRITICAL: "border-red-500/20",
    HIGH: "border-amber-500/20",
    MEDIUM: "border-yellow-500/20",
    LOW: "border-green-500/20",
  }[severity];

  const iconColor = {
    CRITICAL: "text-red-400",
    HIGH: "text-amber-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-green-400",
  }[severity];

  return (
    <div className={`rounded-lg border bg-white/[0.02] p-2 ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span className="text-xs font-medium text-white/80">{title}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 3).map((item, i) => (
          <span
            key={i}
            className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50"
          >
            {item}
          </span>
        ))}
        {items.length > 3 && (
          <span className="text-[9px] text-white/30">+{items.length - 3}</span>
        )}
      </div>
    </div>
  );
}

