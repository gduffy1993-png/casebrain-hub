"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type DefenseAngle = {
  id: string;
  angleType: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  winProbability: number | null;
  whyThisMatters: string;
  legalBasis: string;
  caseLaw: string[];
  prosecutionWeakness: string;
  howToExploit: string;
  specificArguments: string[];
  submissions?: string[]; // Optional - may not always be present
  disclosureRequests: string[];
};

type CaseFightPlanData = {
  overallWinProbability: number | null;
  criticalAngles: DefenseAngle[];
  recommendedStrategy: {
    primaryAngle: DefenseAngle;
    supportingAngles: DefenseAngle[];
    combinedProbability: number | null;
    tacticalPlan: string[];
  };
  prosecutionVulnerabilities: {
    criticalWeaknesses: string[];
    evidenceGaps: string[];
    proceduralErrors: string[];
  };
  evidenceStrengthWarnings?: string[];
  realisticOutcome?: string;
};

type CaseFightPlanProps = {
  caseId: string;
};

export function CaseFightPlan({ caseId }: CaseFightPlanProps) {
  const [data, setData] = useState<CaseFightPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        setLoading(true);
        setError(null);
        setGatedResponse(null);
        const response = await fetch(`/api/criminal/${caseId}/aggressive-defense`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch defence plan");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<CaseFightPlanData>(result);
        
        if (isGated(normalized)) {
          setGatedResponse({
            banner: normalized.banner || {
              severity: "warning",
              title: "Insufficient text extracted",
              message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
            },
            diagnostics: normalized.diagnostics,
          });
          setData(null);
          return;
        }

        const planData = normalized.data || result;
        setData(planData);
      } catch (err) {
        console.error("Failed to fetch defence plan:", err);
        setError("Defence plan not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Preparing defence plan…</span>
        </div>
      </Card>
    );
  }

  // Safe degradation when extraction fails - show disclosure-first fallback strategy
  if (gatedResponse) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">MODE: DISCLOSURE-FIRST (early stage / incomplete bundle)</Badge>
            <h2 className="text-lg font-semibold text-foreground mb-2">Primary Defence Strategy</h2>
            <p className="text-sm text-muted-foreground italic mb-4">
              Bundle incomplete / extraction failed. Strategy is disclosure-first: request MG6 schedules, custody record, interview recording, continuity logs. Do not lock a narrative until disclosure stabilises.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              How to apply pressure (in order)
            </h3>
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="font-medium text-muted-foreground min-w-[2rem]">1.</span>
                <span className="leading-relaxed">Request MG6A/MG6C disclosure schedules and disclosure management documents. Ask for confirmation of what exists, in what format, and when it will be served.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-muted-foreground min-w-[2rem]">2.</span>
                <span className="leading-relaxed">Request custody record (including reviews and legal advice log) and interview recording with transcript/log.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-muted-foreground min-w-[2rem]">3.</span>
                <span className="leading-relaxed">Request continuity statements and exhibit logs for all primary evidence (CCTV, BWV, exhibits).</span>
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">What this forces the prosecution to do</h3>
            <ul className="text-sm text-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                <span>Confirm existence of material or explain absence</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                <span>Provide service timetable or face case management directions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground mt-1">•</span>
                <span>Explain retention/continuity gaps or risk credibility damage</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30">
            <p className="text-xs font-medium text-amber-300 mb-1">Readiness Gate</p>
            <p className="text-xs text-amber-200/90">
              Not trial-ready until MG6 schedules + primary media integrity confirmed.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Defence plan not available yet."}
        </p>
      </Card>
    );
  }

  const primaryAngle = data.recommendedStrategy?.primaryAngle;
  const supportingAngles = data.recommendedStrategy?.supportingAngles || [];
  const tacticalPlan = data.recommendedStrategy?.tacticalPlan || [];

  // Extract disclosure requests and ready-to-use arguments from primary angle
  const disclosureRequests = primaryAngle?.disclosureRequests || [];
  const readyToUseArguments = primaryAngle?.specificArguments || [];
  const readyToUseSubmissions = (primaryAngle as any)?.submissions || []; // submissions may not be in type but exists in API response

  // Determine Strategy Mode from primary angle type
  const getStrategyMode = (angleType: string | undefined): string => {
    if (!angleType) return "DISCLOSURE-FIRST";
    const modeMap: Record<string, string> = {
      "DISCLOSURE_FAILURE_STAY": "DISCLOSURE-FIRST",
      "PACE_BREACH_EXCLUSION": "INTERVIEW / ADMISSIBILITY",
      "IDENTIFICATION_CHALLENGE": "IDENTIFICATION ATTACK",
      "NO_CASE_TO_ANSWER": "NO CASE TO ANSWER PREP",
      "EVIDENCE_WEAKNESS_CHALLENGE": "EVIDENCE CHALLENGE",
      "CHAIN_OF_CUSTODY_BREAK": "CONTINUITY / INTEGRITY",
    };
    return modeMap[angleType] || "DISCLOSURE-FIRST";
  };

  const strategyMode = getStrategyMode(primaryAngle?.angleType);
  
  // Build readiness gate sentence based on primary angle
  const getReadinessGate = (angle: DefenseAngle | undefined): string => {
    if (!angle) return "Not trial-ready until disclosure position stabilised.";
    if (angle.angleType === "DISCLOSURE_FAILURE_STAY") {
      return "Not trial-ready until MG6 schedules + primary media integrity confirmed.";
    }
    if (angle.angleType === "PACE_BREACH_EXCLUSION") {
      return "Not trial-ready until custody record + interview recording/log obtained and reviewed.";
    }
    if (angle.angleType === "IDENTIFICATION_CHALLENGE") {
      return "Not trial-ready until full CCTV + identification evidence reviewed and continuity confirmed.";
    }
    return "Not trial-ready until primary evidence integrity and disclosure position confirmed.";
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header with Strategy Mode */}
        <div>
          <Badge variant="outline" className="mb-2">
            MODE: {strategyMode}
          </Badge>
          <h2 className="text-lg font-semibold text-foreground mb-2">Primary Defence Strategy</h2>
          {data.realisticOutcome && (
            <p className="text-sm text-muted-foreground italic">
              {data.realisticOutcome}
            </p>
          )}
        </div>

        {/* Where this case is vulnerable */}
        {primaryAngle && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Where this case is vulnerable
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {primaryAngle.whyThisMatters || primaryAngle.prosecutionWeakness}
            </p>
            {primaryAngle.legalBasis && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Legal basis:</span> {primaryAngle.legalBasis}
              </p>
            )}
          </div>
        )}

        {/* How to apply pressure */}
        {(tacticalPlan.length > 0 || primaryAngle?.howToExploit) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              How to apply pressure (in order)
            </h3>
            {tacticalPlan.length > 0 ? (
              <ol className="space-y-3 text-sm text-foreground">
                {tacticalPlan
                  .filter((step: string) => !step.includes("Win Probability") && !step.includes("%")) // Remove percentage lines
                  .filter((step: string) => step.trim().length > 0) // Remove empty lines
                  .slice(0, 5) // Max 5 steps
                  .map((step: string, idx: number) => {
                    // Clean up step text (remove "Step 1:", "Argument:", "Question:" prefixes if redundant)
                    const cleanStep = step
                      .replace(/^(Step \d+:|Argument:|Question:)\s*/i, "")
                      .replace(/^Primary Strategy:\s*/i, "")
                      .replace(/^Supporting Strategies?:/i, "")
                      .trim();
                    return (
                      <li key={idx} className="flex gap-3">
                        <span className="font-medium text-muted-foreground min-w-[2rem]">{idx + 1}.</span>
                        <span className="leading-relaxed">{cleanStep}</span>
                      </li>
                    );
                  })}
              </ol>
            ) : primaryAngle?.howToExploit ? (
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {primaryAngle.howToExploit}
              </div>
            ) : null}
          </div>
        )}

        {/* What this forces the prosecution to do */}
        {primaryAngle && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">What this forces the prosecution to do</h3>
            <ul className="text-sm text-foreground space-y-1.5">
              {primaryAngle.angleType === "DISCLOSURE_FAILURE_STAY" ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Confirm existence of material or explain absence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Provide service timetable or face case management directions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Explain retention/continuity gaps or risk credibility damage</span>
                  </li>
                </>
              ) : primaryAngle.angleType === "PACE_BREACH_EXCLUSION" ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Produce custody record and interview recording/log or explain absence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Confirm compliance with PACE Codes or face exclusion application</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Narrow time windows and confirm integrity or risk admissibility challenge</span>
                  </li>
                </>
              ) : primaryAngle.angleType === "IDENTIFICATION_CHALLENGE" ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Produce full CCTV footage and identification evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Confirm continuity and time windows or face Turnbull challenge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Explain first-account consistency or risk identification exclusion</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Confirm existence of material or explain absence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Provide service timetable or face case management directions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Explain retention/continuity gaps or risk credibility damage</span>
                  </li>
                </>
              )}
            </ul>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Either way, this forces clarity and stabilises trial readiness.
            </p>
          </div>
        )}

        {/* Secondary angles (collapsed by default) */}
        {supportingAngles.length > 0 && (
          <details className="space-y-2">
            <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              Secondary angles to prepare (do not lead with)
            </summary>
            <ul className="text-sm text-foreground space-y-2 mt-2 ml-4">
              {supportingAngles.slice(0, 3).map((angle: DefenseAngle, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <span className="font-medium">{angle.title}</span>
                    {angle.whyThisMatters && (
                      <span className="text-muted-foreground"> — {angle.whyThisMatters}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Words to send today - MANDATORY (use submissions/arguments if disclosureRequests empty) */}
        {(disclosureRequests.length > 0 || readyToUseSubmissions.length > 0 || readyToUseArguments.length > 0) && (
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Words to send today
            </h3>
            {disclosureRequests.length > 0 && (
              <div className="space-y-2">
                {disclosureRequests.slice(0, 3).map((request, idx) => (
                  <div key={idx} className="p-3 rounded bg-muted/20 border border-border/30">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {request}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {readyToUseSubmissions.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-medium text-muted-foreground">Ready-to-use submissions:</p>
                {readyToUseSubmissions.slice(0, 2).map((submission: string, idx: number) => (
                  <div key={idx} className="p-3 rounded bg-muted/20 border border-border/30">
                    <p className="text-xs text-foreground leading-relaxed">
                      {submission}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {readyToUseArguments.length > 0 && disclosureRequests.length === 0 && readyToUseSubmissions.length === 0 && (
              <div className="space-y-2">
                {readyToUseArguments.slice(0, 2).map((arg: string, idx: number) => (
                  <div key={idx} className="p-3 rounded bg-muted/20 border border-border/30">
                    <p className="text-xs text-foreground leading-relaxed">
                      {arg}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground italic mt-2">
              Ready to adapt and use. For full letter templates, use the letter draft feature.
            </p>
          </div>
        )}

        {/* Readiness Gate - MANDATORY */}
        <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30">
          <p className="text-xs font-medium text-amber-300 mb-1">Readiness Gate</p>
          <p className="text-xs text-amber-200/90">
            {getReadinessGate(primaryAngle)}
          </p>
        </div>

        {/* Professional judgment warnings */}
        {data.evidenceStrengthWarnings && data.evidenceStrengthWarnings.length > 0 && (
          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30">
            <p className="text-xs font-medium text-amber-300 mb-1.5">Professional Judgment</p>
            <ul className="text-xs text-amber-200/90 space-y-1">
              {data.evidenceStrengthWarnings.map((warning: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
