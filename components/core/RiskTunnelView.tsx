"use client";

import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  Flag,
  FileText,
  Users,
  Scale,
  Gavel,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { 
  CaseHeatmap, 
  MissingEvidenceItem, 
  RiskFlag, 
  LimitationInfo,
  NextStep,
  ComplianceGap,
} from "@/lib/types/casebrain";

type RiskTunnelViewProps = {
  caseId: string;
  practiceArea: string;
  stage?: string;
  heatmap?: CaseHeatmap;
  limitationInfo?: LimitationInfo;
  missingEvidence: MissingEvidenceItem[];
  riskFlags: RiskFlag[];
  complianceGaps: ComplianceGap[];
  nextStep?: NextStep;
};

type TunnelStage = {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "complete" | "current" | "warning" | "danger" | "pending";
  issues: string[];
};

export function RiskTunnelView({
  caseId,
  practiceArea,
  stage,
  heatmap,
  limitationInfo,
  missingEvidence,
  riskFlags,
  complianceGaps,
  nextStep,
}: RiskTunnelViewProps) {
  // Build tunnel stages based on practice area
  const stages = buildTunnelStages({
    practiceArea,
    currentStage: stage,
    limitationInfo,
    missingEvidence,
    riskFlags,
    complianceGaps,
  });

  const statusColors = {
    complete: "bg-success border-success text-success",
    current: "bg-primary border-primary text-primary",
    warning: "bg-warning border-warning text-warning",
    danger: "bg-danger border-danger text-danger",
    pending: "bg-accent/20 border-accent/30 text-accent-muted",
  };

  const statusIcons = {
    complete: <CheckCircle className="h-5 w-5" />,
    current: <ArrowRight className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    danger: <XCircle className="h-5 w-5" />,
    pending: <Clock className="h-5 w-5" />,
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          Case Lifecycle Tunnel
        </div>
      }
      description="Visual progress through case stages with risk indicators"
    >
      {/* Limitation Warning */}
      {limitationInfo && limitationInfo.daysRemaining <= 90 && (
        <div className={`mb-4 rounded-xl p-3 ${
          limitationInfo.daysRemaining <= 30 
            ? "bg-danger/10 border border-danger/30" 
            : "bg-warning/10 border border-warning/30"
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${
              limitationInfo.daysRemaining <= 30 ? "text-danger" : "text-warning"
            }`} />
            <span className={`text-sm font-semibold ${
              limitationInfo.daysRemaining <= 30 ? "text-danger" : "text-warning"
            }`}>
              {limitationInfo.daysRemaining <= 0 
                ? "LIMITATION EXPIRED"
                : `${limitationInfo.daysRemaining} days to limitation`}
            </span>
          </div>
        </div>
      )}

      {/* Tunnel Visualization */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-accent/20 to-accent/5" />

        {/* Stages */}
        <div className="space-y-4">
          {stages.map((stageItem, index) => (
            <div key={stageItem.id} className="relative flex items-start gap-4">
              {/* Stage Indicator */}
              <div
                className={`relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  stageItem.status === "complete" ? "bg-success/20 border-success" :
                  stageItem.status === "current" ? "bg-primary/20 border-primary" :
                  stageItem.status === "warning" ? "bg-warning/20 border-warning" :
                  stageItem.status === "danger" ? "bg-danger/20 border-danger" :
                  "bg-surface-muted border-accent/30"
                }`}
              >
                <span className={
                  stageItem.status === "complete" ? "text-success" :
                  stageItem.status === "current" ? "text-primary" :
                  stageItem.status === "warning" ? "text-warning" :
                  stageItem.status === "danger" ? "text-danger" :
                  "text-accent-muted"
                }>
                  {stageItem.icon}
                </span>
              </div>

              {/* Stage Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-accent">{stageItem.label}</h4>
                  <Badge 
                    variant={
                      stageItem.status === "complete" ? "success" :
                      stageItem.status === "danger" ? "danger" :
                      stageItem.status === "warning" ? "warning" :
                      stageItem.status === "current" ? "primary" :
                      "outline"
                    }
                    size="sm"
                  >
                    {stageItem.status === "complete" ? "Done" :
                     stageItem.status === "current" ? "Current" :
                     stageItem.status === "danger" ? "Risk" :
                     stageItem.status === "warning" ? "Warning" :
                     "Pending"}
                  </Badge>
                </div>

                {/* Issues */}
                {stageItem.issues.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {stageItem.issues.map((issue, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          stageItem.status === "danger" ? "bg-danger" :
                          stageItem.status === "warning" ? "bg-warning" :
                          "bg-accent-muted"
                        }`} />
                        <span className="text-accent-soft">{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Step Indicator */}
      {nextStep && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <ArrowRight className="h-4 w-4" />
            Recommended Next Step
          </div>
          <p className="mt-2 text-sm font-medium text-accent">{nextStep.title}</p>
          <p className="mt-1 text-xs text-accent-soft">{nextStep.reason}</p>
        </div>
      )}
    </Card>
  );
}

function buildTunnelStages(params: {
  practiceArea: string;
  currentStage?: string;
  limitationInfo?: LimitationInfo;
  missingEvidence: MissingEvidenceItem[];
  riskFlags: RiskFlag[];
  complianceGaps: ComplianceGap[];
}): TunnelStage[] {
  const { practiceArea, currentStage, limitationInfo, missingEvidence, riskFlags, complianceGaps } = params;

  // Common stages across practice areas
  const baseStages: TunnelStage[] = [
    {
      id: "intake",
      label: "Intake & Onboarding",
      icon: <Users className="h-5 w-5" />,
      status: "complete",
      issues: [],
    },
    {
      id: "investigation",
      label: "Investigation",
      icon: <FileText className="h-5 w-5" />,
      status: "pending",
      issues: [],
    },
    {
      id: "evidence",
      label: "Evidence Gathering",
      icon: <FileText className="h-5 w-5" />,
      status: "pending",
      issues: [],
    },
    {
      id: "pre_action",
      label: "Pre-Action Protocol",
      icon: <Scale className="h-5 w-5" />,
      status: "pending",
      issues: [],
    },
    {
      id: "litigation",
      label: "Litigation",
      icon: <Gavel className="h-5 w-5" />,
      status: "pending",
      issues: [],
    },
  ];

  // Mark current stage and previous as complete
  const stageOrder = ["intake", "investigation", "evidence", "pre_action", "litigation"];
  const currentIndex = stageOrder.indexOf(currentStage ?? "intake");

  baseStages.forEach((stage, index) => {
    if (index < currentIndex) {
      stage.status = "complete";
    } else if (index === currentIndex) {
      stage.status = "current";
    }
  });

  // Add compliance gap issues
  const criticalGaps = complianceGaps.filter(g => g.severity === "CRITICAL");
  if (criticalGaps.length > 0) {
    baseStages[0].status = "danger";
    baseStages[0].issues = criticalGaps.map(g => g.label);
  }

  // Add missing evidence issues
  const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING");
  if (criticalMissing.length > 0) {
    const evidenceStage = baseStages.find(s => s.id === "evidence");
    if (evidenceStage) {
      evidenceStage.status = evidenceStage.status === "complete" ? "warning" : evidenceStage.status;
      evidenceStage.issues = criticalMissing.map(e => e.label);
    }
  }

  // Add risk flag issues
  const criticalRisks = riskFlags.filter(r => r.severity === "CRITICAL" && r.status === "outstanding");
  if (criticalRisks.length > 0) {
    const currentStageObj = baseStages.find(s => s.status === "current");
    if (currentStageObj) {
      currentStageObj.status = "danger";
      currentStageObj.issues.push(...criticalRisks.map(r => r.title));
    }
  }

  // Add limitation warning
  if (limitationInfo && limitationInfo.daysRemaining <= 90 && limitationInfo.daysRemaining > 0) {
    const litigationStage = baseStages.find(s => s.id === "litigation");
    if (litigationStage && litigationStage.status === "pending") {
      litigationStage.status = "warning";
      litigationStage.issues.push(`Limitation in ${limitationInfo.daysRemaining} days`);
    }
  }

  return baseStages;
}

