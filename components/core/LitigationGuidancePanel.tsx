"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

type LitigationGuidance = {
  currentStage: string;
  confidence: "high" | "medium" | "low";
  nextSteps: Array<{
    step: string;
    description: string;
    priority: "urgent" | "high" | "medium" | "low";
    deadline?: string; // ISO string from API
    sourceEvidence?: string[];
    uncertainty?: string;
  }>;
  riskFlags: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    evidence: string[];
    recommendedAction: string;
  }>;
  recommendedTemplates: string[];
  disclaimer: string;
};

type LitigationGuidancePanelProps = {
  caseId: string;
};

export function LitigationGuidancePanel({ caseId }: LitigationGuidancePanelProps) {
  const [guidance, setGuidance] = useState<LitigationGuidance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuidance();
  }, [caseId]);

  const fetchGuidance = async () => {
    try {
      const response = await fetch(`/api/guidance/${caseId}`);
      if (!response.ok) throw new Error("Failed to load guidance");
      const data = await response.json();
      setGuidance(data);
    } catch (error) {
      console.error("Failed to load guidance", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card title="Litigation Guidance">
        <p className="text-sm text-accent/60">Loading...</p>
      </Card>
    );
  }

  if (!guidance) {
    return (
      <Card title="Litigation Guidance">
        <p className="text-sm text-accent/60">No guidance available yet.</p>
      </Card>
    );
  }

  return (
    <Card
      title="Litigation Guidance"
      description="AI-generated procedural guidance based on extracted evidence. This is guidance only and does not constitute legal advice. Always verify with qualified legal counsel."
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-accent/50">Current Stage</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="primary" className="text-sm">
              {guidance.currentStage.replace(/_/g, " ").toUpperCase()}
            </Badge>
            <Badge
              variant={
                guidance.confidence === "high"
                  ? "primary"
                  : guidance.confidence === "medium"
                    ? "warning"
                    : "danger"
              }
              className="text-xs"
            >
              {guidance.confidence.toUpperCase()} CONFIDENCE
            </Badge>
          </div>
        </div>

        {guidance.riskFlags.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">
              Risk Flags
            </p>
            <div className="space-y-3">
              {guidance.riskFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 text-sm ${
                    flag.severity === "critical"
                      ? "border-danger/30 bg-danger/10"
                      : flag.severity === "high"
                        ? "border-danger/20 bg-danger/5"
                        : flag.severity === "medium"
                          ? "border-warning/20 bg-warning/5"
                          : "border-primary/10 bg-surface-muted/70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            flag.severity === "critical"
                              ? "text-danger"
                              : flag.severity === "high"
                                ? "text-danger"
                                : flag.severity === "medium"
                                  ? "text-warning"
                                  : "text-primary"
                          }`}
                        />
                        <p className="font-semibold text-accent">{flag.type}</p>
                        <Badge
                          variant={
                            flag.severity === "critical"
                              ? "danger"
                              : flag.severity === "high"
                                ? "danger"
                                : flag.severity === "medium"
                                  ? "warning"
                                  : "secondary"
                          }
                        >
                          {flag.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-accent/80 leading-relaxed">
                        {flag.description}
                      </p>
                      {flag.evidence && flag.evidence.length > 0 && (
                        <p className="mt-1 text-xs text-accent/50">
                          Evidence: {flag.evidence.join(", ")}
                        </p>
                      )}
                      {flag.recommendedAction && (
                        <p className="mt-2 text-xs font-medium text-accent/70">
                          Action: {flag.recommendedAction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {guidance.nextSteps.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">
              Recommended Next Steps
            </p>
            <div className="space-y-2">
              {guidance.nextSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-surface-muted/70 p-3"
                >
                  <div className="mt-1">
                    {step.priority === "urgent" ? (
                      <AlertTriangle className="h-5 w-5 text-danger" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-accent">{step.step}</p>
                      <Badge
                        variant={
                          step.priority === "urgent"
                            ? "danger"
                            : step.priority === "high"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {step.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-accent/70">{step.description}</p>
                    {step.deadline && (
                      <p className="mt-1 text-xs text-accent/60">
                        Deadline: {step.deadline}
                      </p>
                    )}
                    {step.uncertainty && (
                      <p className="mt-1 text-xs text-warning">
                        ⚠️ {step.uncertainty}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {guidance.recommendedTemplates.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">
              Recommended Templates
            </p>
            <div className="flex flex-wrap gap-2">
              {guidance.recommendedTemplates.map((template, idx) => (
                <Badge key={idx} variant="secondary">
                  {template}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs">
            <p className="font-semibold text-warning">⚠️ Guidance Only - Not Legal Advice</p>
            <p className="mt-1 text-accent/80">
              This guidance is generated from extracted evidence and does not constitute legal
              advice. All recommendations, deadlines, and risk assessments should be verified
              independently with qualified legal counsel. CaseBrain provides procedural guidance
              only and cannot replace professional legal judgment.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-accent/70">
            <p className="font-semibold">Confidence: {guidance.confidence.toUpperCase()}</p>
            <p className="mt-1">
              {guidance.confidence === "high"
                ? "High confidence based on complete evidence extraction."
                : guidance.confidence === "medium"
                  ? "Medium confidence - some evidence may be incomplete or require verification."
                  : "Low confidence - significant evidence gaps detected. Manual review required."}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

