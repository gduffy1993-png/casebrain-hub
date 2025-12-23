"use client";

/**
 * CaseFightPlan Component - Criminal Defence Plan Renderer
 * 
 * FIX LOGIC BUG (Dec 2024):
 * Previous bug: Component returned "Defence plan unavailable" when:
 *   - Bundle was incomplete (gated response)
 *   - Data was null (even if committedStrategy existed)
 *   - Multiple strategies were selected
 * 
 * Root cause: Hard gating logic blocked rendering instead of showing warnings.
 * 
 * Fix applied:
 * 1. Always render if we have EITHER data OR committedStrategy (not both required)
 * 2. Show banner "Draft strategy – subject to disclosure completion" when gated, but continue rendering
 * 3. Only block rendering if NO data AND NO committedStrategy AND NO charges exist
 * 4. Use committedStrategy to build minimal plan even when data is null
 * 5. Remove phase-based blocking - all phases can show defence plans with appropriate warnings
 * 
 * Result: Defence plans now render in all phases with appropriate warnings, never blocked by:
 *   - Thin bundle
 *   - Missing MG6C
 *   - Disclosure gaps
 *   - Non-trial-ready status
 *   - Multiple strategies (uses primary)
 */

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
  committedStrategy?: {
    primary: "fight_charge" | "charge_reduction" | "outcome_management";
    secondary: Array<"fight_charge" | "charge_reduction" | "outcome_management">;
  } | null;
};

export function CaseFightPlan({ caseId, committedStrategy }: CaseFightPlanProps) {
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
        
        // FIX: Always extract data even if gated - gating should show banner, not block rendering
        // Previous bug: setData(null) and return prevented rendering even when committedStrategy exists
        if (isGated(normalized)) {
          setGatedResponse({
            banner: normalized.banner || {
              severity: "warning",
              title: "Insufficient text extracted",
              message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
            },
            diagnostics: normalized.diagnostics,
          });
          // FIX: Still set data if available - gating is a warning, not a blocker
          // This allows rendering with banner when committedStrategy exists
          const planData = normalized.data || result;
          if (planData && (planData.recommendedStrategy?.primaryAngle || planData.criticalAngles?.length > 0)) {
            setData(planData);
          }
          // Don't return early - continue to render with banner
        } else {
          const planData = normalized.data || result;
          setData(planData);
        }
      } catch (err) {
        console.error("Failed to fetch defence plan:", err);
        // FIX: Don't set error if committedStrategy exists - we can still render
        // Only set error if we have no data AND no committed strategy
        if (!committedStrategy) {
          setError("Defence plan not available yet.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [caseId, committedStrategy]);

  // FIX: Define helper functions BEFORE any early returns to avoid "used before declaration" errors
  // Using function declarations (not const arrow functions) so they're hoisted and available everywhere
  // Build directive strategy text based on committed strategy
  function getDirectiveStrategyText(): string | null {
    if (!committedStrategy) return null;
    
    const { primary } = committedStrategy;
    
    if (primary === "fight_charge") {
      return "Primary objective is to challenge the prosecution case at trial. Target: acquittal or dismissal. Defence aims to challenge evidence, intent, and identification. This is a full trial strategy.";
    }
    if (primary === "charge_reduction") {
      return "Primary objective is to undermine intent and aim for charge reduction from s18 to s20 or lesser offence. Defence accepts harm occurred but challenges the intent threshold. Target: reduced charge or alternative offence.";
    }
    if (primary === "outcome_management") {
      return "Primary objective is to manage sentencing outcome through mitigation and character evidence. Focus is on reduced sentence or non-custodial outcome. Target: sentencing position rather than acquittal.";
    }
    return null;
  }

  // Build win/loss conditions based on committed strategy and evidence
  // FIX: Handle null primaryAngle gracefully - use committedStrategy even if data is null
  function getWinConditions(): string[] {
    if (!committedStrategy) return [];
    
    const { primary } = committedStrategy;
    const conditions: string[] = [];
    
    if (primary === "fight_charge") {
      conditions.push("Prosecution fails to prove intent beyond reasonable doubt");
      conditions.push("Identification evidence is successfully challenged or excluded");
      // FIX: Only check primaryAngle if data exists - don't block rendering if null
      if (data?.recommendedStrategy?.primaryAngle?.angleType === "DISCLOSURE_FAILURE_STAY") {
        conditions.push("Disclosure failures result in stay or material exclusion, but only if failures persist after a clear chase trail and directions/timetable");
      }
      if (data?.recommendedStrategy?.primaryAngle?.angleType === "PACE_BREACH_EXCLUSION") {
        conditions.push("PACE breaches result in exclusion of interview or custody evidence");
      }
      conditions.push("Evidence gaps prevent prosecution from establishing case to answer");
    } else if (primary === "charge_reduction") {
      conditions.push("Prosecution cannot articulate s18 intent beyond reasonable doubt");
      conditions.push("Medical evidence shows injuries consistent with single/brief blow (not sustained/targeted)");
      conditions.push("CCTV/sequence evidence shows no prolonged or targeted conduct");
      conditions.push("Weapon use lacks duration/targeting to prove specific intent");
      conditions.push("Court accepts proportional downgrade to s20 under case management");
    } else if (primary === "outcome_management") {
      conditions.push("Mitigation evidence reduces sentence length");
      conditions.push("Character references and personal circumstances support non-custodial outcome");
      conditions.push("Early plea credit and cooperation reduce sentence");
      conditions.push("Sentencing guidelines applied favourably");
    }
    
    return conditions;
  }

  function getLossConditions(): string[] {
    if (!committedStrategy) return [];
    
    const { primary } = committedStrategy;
    const conditions: string[] = [];
    
    if (primary === "fight_charge") {
      conditions.push("Prosecution establishes intent and identification beyond reasonable doubt");
      conditions.push("Evidence gaps are filled by further disclosure or prosecution evidence");
      conditions.push("Disclosure/PACE challenges fail and evidence is admitted");
      conditions.push("Trial proceeds with strong prosecution case");
    } else if (primary === "charge_reduction") {
      conditions.push("Prosecution maintains s18 and evidences specific intent with sustained/targeted conduct");
      conditions.push("Medical evidence supports repeated or targeted blows");
      conditions.push("CCTV/sequence evidence shows prolonged or deliberate attack");
      conditions.push("Weapon use demonstrates targeting/duration supporting intent");
      conditions.push("Court declines proportional downgrade after hearing intent theory");
    } else if (primary === "outcome_management") {
      conditions.push("Mitigation fails to reduce sentence significantly");
      conditions.push("Sentencing guidelines require custodial sentence");
      conditions.push("Character evidence is insufficient or contradicted");
      conditions.push("Court imposes maximum or near-maximum sentence");
    }
    
    return conditions;
  }

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

  // FIX: Check if we can render - must have either data OR committedStrategy
  // Previous bug: !data check blocked rendering even when committedStrategy exists
  const canRender = data || committedStrategy;
  
  // FIX: Only show concrete error if we have no data AND no committed strategy AND no charges
  // Check for charges to determine if case is valid
  const [hasCharges, setHasCharges] = useState<boolean | null>(null);
  useEffect(() => {
    async function checkCharges() {
      try {
        const res = await fetch(`/api/criminal/${caseId}/charges`);
        if (res.ok) {
          const result = await res.json();
          const charges = result.data?.charges || result.charges || [];
          setHasCharges(charges.length > 0);
        } else {
          setHasCharges(null); // Unknown
        }
      } catch {
        setHasCharges(null); // Unknown
      }
    }
    checkCharges();
  }, [caseId]);

  // FIX: Only block rendering if we have NO data, NO committed strategy, AND NO charges
  // Previous bug: Blocked rendering when data was null even if committedStrategy existed
  if (!canRender && !committedStrategy && hasCharges === false) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Defence plan not available. No charges or strategy data found."}
        </p>
      </Card>
    );
  }

  // FIX: If we have committedStrategy but no data, still render with minimal plan
  // This ensures strategy commitment always produces output
  if (!data && committedStrategy) {
    // Render minimal plan based on committed strategy only
    return (
      <Card className="p-6">
        <div className="space-y-6">
          {/* Draft Strategy Banner - shown when bundle incomplete */}
          {gatedResponse && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Draft strategy – subject to disclosure completion
                </p>
                <p className="text-xs text-amber-300/80">
                  {gatedResponse.banner?.message || "Bundle incomplete or extraction failed. Strategy is based on committed selection only."}
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">MODE: {committedStrategy.primary === "fight_charge" ? "FIGHT CHARGE" : committedStrategy.primary === "charge_reduction" ? "CHARGE REDUCTION" : "OUTCOME MANAGEMENT"}</Badge>
              <Badge variant="primary">COMMITTED: {committedStrategy.primary === "fight_charge" ? "Fight Charge" : committedStrategy.primary === "charge_reduction" ? "Charge Reduction" : "Outcome Management"}</Badge>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Primary Defence Strategy</h2>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              {getDirectiveStrategyText() || "Strategy committed but analysis data not yet available. Upload documents and re-analyse to generate full plan."}
            </p>
          </div>

          {/* Show win/loss conditions even without full data */}
          {committedStrategy && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                  <h3 className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wide">Win Conditions</h3>
                  <ul className="space-y-1.5">
                    {getWinConditions().map((condition, idx) => (
                      <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                  <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">Loss Conditions</h3>
                  <ul className="space-y-1.5">
                    {getLossConditions().map((condition, idx) => (
                      <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded bg-amber-950/20 border border-amber-800/30">
                <p className="text-xs font-medium text-amber-300 mb-1">Readiness Gate</p>
                <p className="text-xs text-amber-200/90">
                  Not trial-ready until disclosure position stabilised and primary evidence integrity confirmed.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>
    );
  }

  // FIX: If gated but we have data, show banner but continue rendering
  // Previous bug: Early return prevented rendering even when data existed

  // FIX: Handle null data gracefully - use committedStrategy to build minimal plan if needed
  // Previous bug: Assumed data always exists, causing crashes when data was null
  const primaryAngle = data?.recommendedStrategy?.primaryAngle;
  const supportingAngles = data?.recommendedStrategy?.supportingAngles || [];
  const tacticalPlan = data?.recommendedStrategy?.tacticalPlan || [];

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

  // FIX: getWinConditions and getLossConditions are already defined above (lines 161-219), removed duplicate code

  const getEvidenceThatMatters = (): string[] => {
    if (!committedStrategy || !data) return [];
    
    const { primary } = committedStrategy;
    const evidence: string[] = [];
    
    // Extract from existing data
    if (data.prosecutionVulnerabilities?.evidenceGaps) {
      evidence.push(...data.prosecutionVulnerabilities.evidenceGaps.slice(0, 3));
    }
    
    if (primary === "fight_charge") {
      if (primaryAngle?.angleType === "IDENTIFICATION_CHALLENGE") {
        evidence.push("Full unedited CCTV footage and continuity logs");
        evidence.push("Witness identification procedures and first account consistency");
      }
      if (primaryAngle?.angleType === "DISCLOSURE_FAILURE_STAY") {
        evidence.push("MG6 schedules and disclosure compliance timeline");
        evidence.push("Missing material and service dates");
      }
      if (primaryAngle?.angleType === "PACE_BREACH_EXCLUSION") {
        evidence.push("Custody record and interview recording/log");
        evidence.push("PACE compliance timeline and breach evidence");
      }
      evidence.push("Forensic methodology and chain of custody");
      evidence.push("Medical causation and intent indicators");
    } else if (primary === "charge_reduction") {
      evidence.push("Medical evidence: injury severity (non-determinative) and mechanism (determinative for intent)");
      evidence.push("Sequence/duration evidence from CCTV or witnesses (brief vs sustained conduct)");
      evidence.push("Weapon recovery and manner of use (duration, targeting, escalation)");
      evidence.push("Defendant's actions before and after incident (planning vs reactive)");
    } else if (primary === "outcome_management") {
      evidence.push("Character references and personal circumstances");
      evidence.push("Remorse and cooperation evidence");
      evidence.push("Previous convictions and pattern of offending");
      evidence.push("Sentencing guidelines and comparable cases");
    }
    
    // Remove duplicates and limit
    return Array.from(new Set(evidence)).slice(0, 5);
  };

  const getProceduralActions = (): string[] => {
    if (!committedStrategy || !data) return [];
    const actions: string[] = [];

    if (primaryAngle?.angleType === "DISCLOSURE_FAILURE_STAY") {
      actions.push("Chase outstanding disclosure with clear timetable as proportional case management and record responses");
      actions.push("Document missing items and seek directions if timetable slips (stay/abuse only if failures persist after clear chase trail and directions/timetable)");
    }
    if (primaryAngle?.angleType === "PACE_BREACH_EXCLUSION") {
      actions.push("Request full custody record and interview recording/log; diarise follow-up");
      actions.push("Prepare admissibility challenge if gaps remain after formal chase");
    }
    if (primaryAngle?.angleType === "IDENTIFICATION_CHALLENGE") {
      actions.push("Request full CCTV set with continuity; log service dates and gaps");
      actions.push("Seek clarification on identification procedure and first accounts");
    }

    // General procedural steps if none captured
    if (actions.length === 0) {
      actions.push("Confirm disclosure position and service dates");
      actions.push("Record chase trail and timetable for any outstanding material");
    }

    return Array.from(new Set(actions)).slice(0, 4);
  };

  const getRealisticOutcomeRange = (): { best: string; middle: string; worst: string; factors: string[] } | null => {
    if (!committedStrategy || !data) return null;
    
    const { primary } = committedStrategy;
    const factors: string[] = [];
    
    if (primary === "fight_charge") {
      return {
        best: "Acquittal or dismissal. Identification successfully challenged or excluded; prosecution case collapses; evidence gaps prevent case to answer.",
        middle: "Charge reduction or alternative offence. Identification admitted but heavily qualified; intent not proven; case proceeds on reduced basis.",
        worst: "Conviction on full charge. Identification and intent established; evidence gaps filled; strong prosecution case proceeds to verdict.",
        factors: [
          "Identification reliability and Turnbull compliance",
          "Evidence strength and disclosure completeness",
          "Intent threshold and medical/sequence evidence",
          "Forensic weight and continuity",
          "Procedural leverage success (disclosure/PACE challenges)"
        ]
      };
    } else if (primary === "charge_reduction") {
      return {
        best: "Charge reduction to s20 or alternative lesser offence. Intent not proven at s18 threshold; court accepts proportional downgrade under case management.",
        middle: "Charge reduction with negotiation. Prosecution accepts s20 or alternative; case proceeds on reduced basis with sentencing considerations.",
        worst: "Conviction on s18. Intent established beyond reasonable doubt; medical/sequence evidence supports sustained/targeted conduct; court rejects downgrade.",
        factors: [
          "Medical mechanism evidence (single vs sustained action)",
          "CCTV/sequence duration and targeting evidence",
          "Weapon use manner, duration, and targeting",
          "Prosecution's ability to articulate intent theory",
          "Court's assessment of proportional case management"
        ]
      };
    } else if (primary === "outcome_management") {
      return {
        best: "Non-custodial sentence or suspended sentence. Strong mitigation; character evidence; early plea credit; favourable sentencing guidelines.",
        middle: "Reduced custodial sentence. Mitigation partially successful; some credit for cooperation; sentence below guidelines midpoint.",
        worst: "Maximum or near-maximum custodial sentence. Mitigation fails; sentencing guidelines require custody; limited credit for cooperation.",
        factors: [
          "Strength of character references and personal circumstances",
          "Remorse and cooperation evidence",
          "Previous convictions and pattern of offending",
          "Sentencing guidelines and comparable cases",
          "Early plea credit and timing"
        ]
      };
    }
    
    return null;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Draft Strategy Banner - shown when bundle incomplete or disclosure gaps exist */}
        {/* FIX: Show banner but don't block rendering - previous bug prevented rendering when gated */}
        {gatedResponse && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 mb-1">
                Draft strategy – subject to disclosure completion
              </p>
              <p className="text-xs text-amber-300/80">
                {gatedResponse.banner?.message || "Bundle incomplete or disclosure gaps exist. Strategy is based on current material and may change as disclosure stabilises."}
              </p>
            </div>
          </div>
        )}

        {/* Header with Strategy Mode */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">
              MODE: {strategyMode}
            </Badge>
            {committedStrategy && (
              <Badge variant="primary">
                COMMITTED: {committedStrategy.primary === "fight_charge" ? "Fight Charge" : 
                           committedStrategy.primary === "charge_reduction" ? "Charge Reduction" : 
                           "Outcome Management"}
              </Badge>
            )}
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Primary Defence Strategy</h2>
          {committedStrategy && getDirectiveStrategyText() ? (
            <p className="text-sm text-foreground font-medium leading-relaxed">
              {getDirectiveStrategyText()}
            </p>
          ) : data?.realisticOutcome ? (
            <p className="text-sm text-muted-foreground italic">
              {data.realisticOutcome}
            </p>
          ) : null}
        </div>

        {/* Win Conditions / Loss Conditions / Evidence & Actions (only when committed) */}
        {committedStrategy && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Win Conditions */}
              <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <h3 className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wide">
                  Win Conditions
                </h3>
                <ul className="space-y-1.5">
                  {getWinConditions().map((condition, idx) => (
                    <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Loss Conditions */}
              <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                  Loss Conditions
                </h3>
                <ul className="space-y-1.5">
                  {getLossConditions().map((condition, idx) => (
                    <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evidence That Matters Most Now */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                  Priority Evidence
                </h3>
                <ul className="space-y-1.5">
                  {getEvidenceThatMatters().map((item, idx) => (
                    <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                      <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Procedural Actions (kept distinct from evidence) */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                Procedural Actions
              </h3>
              <ul className="space-y-1.5">
                {getProceduralActions().map((item, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                    <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Realistic Outcome Range (Based on Current Evidence) */}
            {getRealisticOutcomeRange() && (
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <h3 className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wide">
                  Realistic Outcome Range (Based on Current Evidence)
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1">Best Case:</p>
                    <p className="text-xs text-foreground">{getRealisticOutcomeRange()?.best}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-400 mb-1">Middle Case:</p>
                    <p className="text-xs text-foreground">{getRealisticOutcomeRange()?.middle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">Worst Case:</p>
                    <p className="text-xs text-foreground">{getRealisticOutcomeRange()?.worst}</p>
                  </div>
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs font-medium text-foreground mb-2">Factors That Shift Outcome:</p>
                    <ul className="space-y-1">
                      {getRealisticOutcomeRange()?.factors.map((factor, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* What Would Flip The Outcome (if evidence is borderline) */}
            {data && committedStrategy && (
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">
                  What Would Flip The Outcome
                </h3>
                <p className="text-xs text-foreground mb-2">
                  {data.evidenceStrengthWarnings && data.evidenceStrengthWarnings.length > 0
                    ? "Evidence is borderline. The following would decisively change the outcome:"
                    : "If evidence remains borderline, the following would decisively change the outcome:"
                  }
                </p>
                <ul className="space-y-1.5">
                  {committedStrategy.primary === "fight_charge" && (
                    <>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Full unedited CCTV showing sequence of events and intent indicators</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Forensic evidence that clearly links or excludes the defendant from the weapon or scene</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Multiple independent witnesses with consistent accounts of intent</span>
                      </li>
                    </>
                  )}
                  {committedStrategy.primary === "charge_reduction" && (
                    <>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Medical evidence showing sustained or targeted attack pattern (multiple blows, prolonged incident)</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>CCTV/sequence evidence showing prolonged or deliberate attack</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Weapon use demonstrating targeting/duration supporting specific intent</span>
                      </li>
                    </>
                  )}
                  {committedStrategy.primary === "outcome_management" && (
                    <>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Strong character references and evidence of rehabilitation</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Early guilty plea and cooperation with prosecution</span>
                      </li>
                      <li className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>Personal circumstances supporting non-custodial sentence</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Where this case is vulnerable (procedural leverage points) */}
        {primaryAngle && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {committedStrategy ? "Where this case is vulnerable" : "Procedural leverage points"}
            </h3>
            <p className={`text-sm leading-relaxed ${
              committedStrategy ? "text-foreground font-medium" : "text-foreground"
            }`}>
              {committedStrategy 
                ? `The prosecution case is vulnerable at: ${primaryAngle.prosecutionWeakness || primaryAngle.whyThisMatters}`
                : primaryAngle.whyThisMatters || primaryAngle.prosecutionWeakness
              }
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
                    // Clean up step text and make directive if committed
                    let cleanStep = step
                      .replace(/^(Step \d+:|Argument:|Question:)\s*/i, "")
                      .replace(/^Primary Strategy:\s*/i, "")
                      .replace(/^Supporting Strategies?:/i, "")
                      .trim();
                    
                    // Make language solicitor-safe and directive if strategy is committed
                    if (committedStrategy) {
                      // Apply replacements in order to avoid duplicates
                      cleanStep = cleanStep
                        .replace(/\bmust\b/gi, "should")
                        .replace(/\bwill\b/gi, "aims to")
                        .replace(/\bexecute\b/gi, "pursue")
                        .replace(/\boptions include\b/gi, "pursue")
                        .replace(/\bfocus on\b/gi, "should focus on")
                        .replace(/\bconsider\b/gi, "should consider")
                        // Avoid creating "should be considered be considered" - only replace standalone "should" if not already part of a phrase
                        .replace(/\bshould\s+(?!be\s+considered|focus|consider|aims)/gi, "should consider");
                      // Clean up any accidental duplicates
                      cleanStep = cleanStep.replace(/\bshould be considered be considered\b/gi, "should be considered");
                      cleanStep = cleanStep.replace(/\bshould consider be considered\b/gi, "should consider");
                    }
                    
                    return (
                      <li key={idx} className="flex gap-3">
                        <span className={`min-w-[2rem] ${committedStrategy ? "font-semibold text-primary" : "font-medium text-muted-foreground"}`}>
                          {idx + 1}.
                        </span>
                        <span className={`leading-relaxed ${committedStrategy ? "font-medium" : ""}`}>
                          {cleanStep}
                        </span>
                      </li>
                    );
                  })}
              </ol>
            ) : primaryAngle?.howToExploit ? (
              <div className={`text-sm leading-relaxed whitespace-pre-line ${
                committedStrategy ? "text-foreground font-medium" : "text-foreground"
              }`}>
                {committedStrategy 
                  ? (() => {
                      let text = primaryAngle.howToExploit;
                      // Apply solicitor-safe replacements
                      text = text
                        .replace(/\bmust\b/gi, "should")
                        .replace(/\bwill\b/gi, "aims to")
                        .replace(/\bexecute\b/gi, "pursue")
                        .replace(/\bfocus on\b/gi, "should focus on")
                        .replace(/\bconsider\b/gi, "should consider");
                      // Clean up duplicates
                      text = text.replace(/\bshould be considered be considered\b/gi, "should be considered");
                      text = text.replace(/\bshould consider be considered\b/gi, "should consider");
                      return text;
                    })()
                  : primaryAngle.howToExploit
                }
              </div>
            ) : null}
          </div>
        )}

        {/* What this forces the prosecution to do */}
        {primaryAngle && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              {committedStrategy ? "What the prosecution should now do" : "What this asks the prosecution to do"}
            </h3>
            <ul className="text-sm text-foreground space-y-1.5">
              {primaryAngle.angleType === "DISCLOSURE_FAILURE_STAY" ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Confirm existence of material or explain absence; raises concern that relevant material has not yet been disclosed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Provide service timetable to stabilise disclosure position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Explain retention/continuity gaps to restore confidence in trial readiness</span>
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
                    <span>Confirm compliance with PACE Codes to maintain admissibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Narrow time windows and confirm integrity to address admissibility concerns</span>
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
                    <span>Confirm continuity and time windows to address Turnbull fairness</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>Explain first-account consistency to support identification reliability</span>
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
        {data?.evidenceStrengthWarnings && data.evidenceStrengthWarnings.length > 0 && (
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
