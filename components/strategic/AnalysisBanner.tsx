"use client";

import { AlertTriangle, Info, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SolicitorRole } from "@/lib/strategic/practice-area-viability";

type AnalysisBannerProps = {
  severity: "warning" | "info" | "error";
  title: string;
  message: string;
  reasons?: string[];
  suggestedRole?: SolicitorRole;
  onSwitchRole?: (role: SolicitorRole) => void;
};

const ROLE_LABELS: Record<SolicitorRole, string> = {
  criminal_solicitor: "Criminal Defence",
  clinical_neg_solicitor: "Clinical Negligence",
  housing_solicitor: "Housing Disrepair",
  pi_solicitor: "Personal Injury",
  family_solicitor: "Family",
  general_litigation_solicitor: "General Litigation",
};

export function AnalysisBanner({
  severity,
  title,
  message,
  reasons,
  suggestedRole,
  onSwitchRole,
}: AnalysisBannerProps) {
  const getIcon = () => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (severity) {
      case "error":
        return "border-red-500/50 bg-red-500/10";
      case "warning":
        return "border-yellow-500/50 bg-yellow-500/10";
      case "info":
        return "border-blue-500/50 bg-blue-500/10";
    }
  };

  const getTextColor = () => {
    switch (severity) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "info":
        return "text-blue-400";
    }
  };

  return (
    <Card className={`border-2 ${getBorderColor()} p-4`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <h3 className={`font-semibold ${getTextColor()} mb-1`}>{title}</h3>
            <p className="text-sm text-foreground">{message}</p>
          </div>
        </div>

        {/* Reasons */}
        {reasons && reasons.length > 0 && (
          <div className="ml-8 space-y-1">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Helper text */}
        <div className="ml-8 text-xs text-muted-foreground italic">
          Strategy is paused until documents match the selected solicitor role.
        </div>

        {/* Switch Role Button */}
        {suggestedRole && onSwitchRole && (
          <div className="ml-8 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSwitchRole(suggestedRole)}
              className="text-xs"
            >
              Switch to {ROLE_LABELS[suggestedRole]}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

