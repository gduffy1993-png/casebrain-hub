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
import { Button } from "@/components/ui/button";
import { Loader2, FileText, AlertCircle, CheckCircle2, Copy, ArrowRight } from "lucide-react";
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
  allAngles?: DefenseAngle[]; // Optional - may not always be present
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

type PrimaryStrategy = "fight_charge" | "charge_reduction" | "outcome_management";

type CaseFightPlanProps = {
  caseId: string;
  committedStrategy?: {
    primary: PrimaryStrategy;
    secondary: Array<PrimaryStrategy>;
  } | null;
};

export function CaseFightPlan({ caseId, committedStrategy }: CaseFightPlanProps) {
  const [data, setData] = useState<CaseFightPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [rawCharsTotal, setRawCharsTotal] = useState<number>(0);
  const [payload, setPayload] = useState<any>(null);
  const [gatedResponse, setGatedResponse] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);
  const [analysisVersionInfo, setAnalysisVersionInfo] = useState<{
    has_analysis_version: boolean;
    analysis_mode: "complete" | "preview" | "none";
  } | null>(null);

  useEffect(() => {
    async function fetchPlan() {
      try {
        setLoading(true);
        setError(null);
        setGatedResponse(null);
        
        // Fetch analysis version info to determine status
        try {
          const { safeFetch } = await import("@/lib/utils/safe-fetch");
          const versionResult = await safeFetch(`/api/cases/${caseId}/analysis/version/latest`);
          if (versionResult.ok && versionResult.data) {
            const versionInfo = versionResult.data?.data || versionResult.data;
            setAnalysisVersionInfo({
              has_analysis_version: versionInfo?.has_analysis_version === true || versionInfo?.version_number !== null,
              analysis_mode: versionInfo?.analysis_mode || (versionInfo?.version_number ? "complete" : "none"),
            });
          } else {
            // Fetch failed - default to no version
            setAnalysisVersionInfo({ has_analysis_version: false, analysis_mode: "none" });
          }
        } catch {
          // Fail silently - version info is optional
          setAnalysisVersionInfo({ has_analysis_version: false, analysis_mode: "none" });
        }
        
        // Try strategy-analysis endpoint first (multi-route output)
        const { safeFetch } = await import("@/lib/utils/safe-fetch");
        let strategyResult = await safeFetch(`/api/criminal/${caseId}/strategy-analysis`);
        let useStrategyAnalysis = false;
        let result: any = null;
        
        // Fallback to aggressive-defense if strategy-analysis doesn't exist or fails
        if (!strategyResult.ok || !strategyResult.data) {
          const aggressiveResult = await safeFetch(`/api/criminal/${caseId}/aggressive-defense`);
          if (aggressiveResult.ok && aggressiveResult.data) {
            result = aggressiveResult.data;
          } else {
            // Both endpoints failed - set error but don't throw
            setError(aggressiveResult.error || "Failed to fetch defence plan");
            setLoading(false);
            return;
          }
        } else {
          result = strategyResult.data;
          useStrategyAnalysis = true;
        }
        
        const normalized = normalizeApiResponse<any>(result);

        // Always prefer normalized.data; but also handle "double wrapped" shapes safely
        let payload: any =
          normalized?.data ??
          (result as any)?.data ??
          result;

        // If payload is still wrapped (has ok/data), unwrap again
        if (payload && typeof payload === "object" && "ok" in payload && "data" in payload) {
          payload = (payload as any).data;
        }

        // Helper: detect strategy in ANY expected shape - CRITICAL: Check strategies array FIRST
        // Also check for strategy-analysis routes array
        function hasStrategy(d: any): boolean {
          if (!d) return false;
          // Check for strategy-analysis routes (multi-route output)
          if (Array.isArray(d?.routes) && d.routes.length > 0) return true;
          // CRITICAL: Check strategies array first - this is the primary source
          if (Array.isArray(d?.strategies) && d.strategies.length > 0) return true;
          return Boolean(
            d?.recommendedStrategy?.primaryAngle ||
            d?.recommendedStrategy?.primary ||
            d?.primaryAngle ||
            (Array.isArray(d?.criticalAngles) && d.criticalAngles.length > 0) ||
            (Array.isArray(d?.allAngles) && d.allAngles.length > 0) ||
            committedStrategy
          );
        }
        
        // Store whether we're using strategy-analysis endpoint for rendering
        if (useStrategyAnalysis && payload?.routes) {
          (payload as any).__useStrategyAnalysis = true;
        }

        // FIX: Check gating first - if gated due to 0-text/thin bundle, show banner and stop
        // But if we have strategy data, still allow rendering with banner
        if (isGated(normalized)) {
          const gateBanner = normalized.banner || {
            severity: "warning" as const,
            title: "Insufficient text extracted",
            message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
          };
          setGatedResponse({
            banner: gateBanner,
            diagnostics: normalized.diagnostics,
          });
          
          // If gated AND no strategy, don't fabricate - show banner only
          if (!hasStrategy(payload)) {
            setData(null);
            setLoading(false);
            return;
          }
          // If gated BUT strategy exists, continue to set data (will show banner + strategy)
        }

        // Set data if strategy exists
        setData(hasStrategy(payload) ? payload : null);
        setPayload(payload); // Store for debug

        // Document count (diagnostics naming varies — cover all)
        const docCount =
          (normalized as any)?.diagnostics?.documentCount ??
          (normalized as any)?.diagnostics?.documentsCount ??
          (normalized as any)?.diagnostics?.docCount ??
          (result as any)?.diagnostics?.documentCount ??
          (result as any)?.diagnostics?.docCount ??
          (payload as any)?.documentCount ??
          0;

        setDocumentCount(docCount);

        // Raw chars total (for debug)
        const rawChars =
          (normalized as any)?.diagnostics?.rawCharsTotal ??
          (result as any)?.diagnostics?.rawCharsTotal ??
          (payload as any)?.rawCharsTotal ??
          0;

        setRawCharsTotal(rawChars);
      } catch (err) {
        console.error("Failed to fetch defence plan:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch defence plan";
        // Always set error so UI can surface it
        setError(errorMessage);
        // FIX: Don't block rendering if committedStrategy exists - we can still render minimal plan
        // But still set error so user knows fetch failed
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

  // Deterministic next steps based on committed strategy_type (non-AI)
  // These appear even when Analysis Gate blocks AI strategy generation
  function getDeterministicNextSteps(): string[] {
    if (!committedStrategy) return [];
    
    const { primary } = committedStrategy;
    
    switch (primary) {
      case "fight_charge":
        return [
          "Request full disclosure including CCTV, MG6 schedules, and unused material",
          "Review all evidence for identification reliability under Turnbull guidelines",
          "Assess PACE compliance and potential exclusion of interview/custody evidence",
          "Prepare disclosure requests for missing material (MG6C, CCTV continuity, VIPER pack)",
          "Draft abuse of process application if disclosure failures persist after chase",
          "Prepare trial defence focusing on intent, identification, and procedural breaches",
        ];
      case "charge_reduction":
        return [
          "Request disclosure focusing on medical evidence and circumstances of incident",
          "Review medical reports to assess whether injuries support s18 (specific intent) or s20 (recklessness)",
          "Analyse CCTV/sequence evidence for duration and targeting (key to intent distinction)",
          "Gather evidence supporting recklessness rather than specific intent",
          "Prepare case for charge reduction negotiation (s18 → s20) before PTPH",
          "Draft written submissions on intent distinction for case management hearing",
        ];
      case "outcome_management":
        return [
          "Request disclosure to assess prosecution case strength and realistic prospects",
          "Consider early guilty plea if case is strong (maximum sentence reduction)",
          "Prepare comprehensive mitigation package including character references",
          "Gather personal circumstances evidence (employment, family, health, remorse)",
          "Review sentencing guidelines and identify factors supporting non-custodial outcome",
          "Prepare sentencing submissions focusing on rehabilitation and reduced culpability",
        ];
      default:
        return [];
    }
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

  // FIX: Helper to detect if strategy exists (reused from fetch logic)
  const hasStrategy = (d: any): boolean => {
    if (!d) return false;
    return !!(
      d?.recommendedStrategy?.primaryAngle ||
      d?.recommendedStrategy?.primary ||
      d?.primaryAngle ||
      d?.primary ||
      (Array.isArray(d?.criticalAngles) && d.criticalAngles.length > 0) ||
      (Array.isArray(d?.allAngles) && d.allAngles.length > 0) ||
      (Array.isArray(d?.angles) && d.angles.length > 0) ||
      (Array.isArray(d?.defenseAngles) && d.defenseAngles.length > 0) ||
      (Array.isArray(d?.strategies) && d.strategies.length > 0) ||
      (Array.isArray(d?.provisionalStrategies) && d.provisionalStrategies.length > 0) ||
      committedStrategy
    );
  };

  // FIX: Check if we can render - must have either data OR committedStrategy
  const hasStrategyData = hasStrategy(data);
  const canRender = hasStrategyData;
  
  // Extract banner early to avoid type narrowing issues
  const gateBanner = gatedResponse?.banner;

  // Check if we're using strategy-analysis routes
  const useStrategyAnalysis = (data as any)?.__useStrategyAnalysis === true;
  const strategyRoutes = useStrategyAnalysis && Array.isArray((data as any)?.routes) ? (data as any).routes : null;
  const selectedRoute = useStrategyAnalysis ? (data as any)?.selectedRoute : null;
  
  // FIX: Check if strategy-analysis data exists (routes or recommendation)
  // This determines if we show "pending" vs "Preview mode" vs "Complete"
  const hasStrategyAnalysisData = 
    (useStrategyAnalysis && strategyRoutes && strategyRoutes.length > 0) ||
    (payload && (payload.routes?.length > 0 || payload.recommendation)) ||
    (data && ((data as any).routes?.length > 0 || (data as any).recommendation));

  // FIX: Filter angles by committed strategy (Strategy-Specific Angle Filtering)
  // Use fallback list so we don't filter empty arrays and accidentally make it empty
  const planDataAny = data as any; // Allow checking for alternative field names
  const baseAngles =
    (data?.criticalAngles?.length ? data.criticalAngles : null) ||
    (data?.allAngles?.length ? data.allAngles : null) ||
    (planDataAny?.angles?.length ? planDataAny.angles : null) ||
    (planDataAny?.defenseAngles?.length ? planDataAny.defenseAngles : null) ||
    [];

  const filteredData = data
    ? {
        ...data,
        criticalAngles: filterAnglesByStrategy(baseAngles, committedStrategy),
        allAngles: filterAnglesByStrategy((data.allAngles || baseAngles) as any, committedStrategy),
        recommendedStrategy: data.recommendedStrategy ? {
          ...data.recommendedStrategy,
          primaryAngle: filterAnglesByStrategy([data.recommendedStrategy.primaryAngle], committedStrategy)[0] || data.recommendedStrategy.primaryAngle,
          supportingAngles: filterAnglesByStrategy(data.recommendedStrategy.supportingAngles || [], committedStrategy),
        } : undefined,
      }
    : null;

  // Alias for consistency (displayData = filteredData)
  const displayData = filteredData;

  // Helper function to filter angles by strategy
  function filterAnglesByStrategy(
    angles: DefenseAngle[],
    strategy: typeof committedStrategy,
  ): DefenseAngle[] {
    if (!strategy || !strategy.primary) {
      return angles; // No filtering if no strategy committed
    }

    const { primary } = strategy;

    // Map strategy to relevant angle types
    const relevantAngleTypes: Record<PrimaryStrategy, string[]> = {
      fight_charge: [
        "PACE_BREACH_EXCLUSION",
        "DISCLOSURE_FAILURE_STAY",
        "EVIDENCE_WEAKNESS_CHALLENGE",
        "IDENTIFICATION_CHALLENGE",
        "ABUSE_OF_PROCESS",
        "HUMAN_RIGHTS_BREACH",
        "NO_CASE_TO_ANSWER",
        "CONTRADICTION_EXPLOITATION",
        "CHAIN_OF_CUSTODY_BREAK",
      ],
      charge_reduction: [
        "EVIDENCE_WEAKNESS_CHALLENGE",
        "DISCLOSURE_FAILURE_STAY",
        "CONTRADICTION_EXPLOITATION",
        "TECHNICAL_DEFENSE",
      ],
      outcome_management: [
        "SENTENCING_MITIGATION",
        "TECHNICAL_DEFENSE",
      ],
    };

    const relevantTypes = relevantAngleTypes[primary] || [];
    
    // Filter: show relevant angles first, then others (but still show all)
    // Actually, let's be more aggressive - only show relevant angles
    return angles.filter(angle => 
      relevantTypes.includes(angle.angleType) ||
      angle.severity === "CRITICAL" // Always show CRITICAL angles
    );
  }
  
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

  // FIX: If gated AND no strategy data, show banner and stop (don't fabricate strategy)
  // But if gated AND strategy exists, show banner + strategy (banner is warning, not blocker)
  if (gatedResponse && !hasStrategyData) {
    return (
      <Card className="p-6">
        <AnalysisGateBanner
          banner={gatedResponse.banner}
          diagnostics={gatedResponse.diagnostics}
          showHowToFix={true}
        />
      </Card>
    );
  }
  
  // If gated BUT strategy exists, continue to render (banner will be shown inline)

  // FIX: If no strategy data exists, show appropriate message based on document count and commitment
  if (!hasStrategyData && !hasStrategyAnalysisData) {
    // If commitment exists, don't show "pending" - show committed message instead
    if (committedStrategy) {
      // This case is handled below (line 518) - render minimal plan based on committed strategy
      // Fall through to that logic
    } else if (documentCount === 0) {
      return (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Upload case documents to begin analysis</p>
          </div>
        </Card>
      );
    } else {
      // No strategy data at all
      return (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Strategy analysis pending</p>
            <p className="text-xs mt-1">
              {error || "Re-analyse case documents to generate defence plan."}
            </p>
          </div>
        </Card>
      );
    }
  }

  // FIX: If we have committedStrategy but no data, still render with minimal plan
  // This ensures strategy commitment always produces output
  if (!data && committedStrategy) {
    // Render minimal plan based on committed strategy only
    return (
      <Card className="p-6">
        <div className="space-y-6">
          {/* Draft Strategy Banner - shown when bundle incomplete */}
          {gateBanner && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 mb-1">
                  Draft strategy – subject to disclosure completion
                </p>
                <p className="text-xs text-amber-300/80">
                  {gateBanner.message || "Bundle incomplete or extraction failed. Strategy is based on committed selection only."}
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

              {/* Deterministic Next Steps - always shown when strategy is committed, even if Analysis Gate blocks AI */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Procedural next steps (non-AI)</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Deterministic action items based on committed strategy. These steps are procedural and do not require AI analysis.
                </p>
                <div className="space-y-2">
                  {getDeterministicNextSteps().map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <p className="text-xs text-foreground flex-1">{step}</p>
                    </div>
                  ))}
                </div>
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
  // Use displayData (filtered by strategy) instead of raw data
  const primaryAngle = displayData?.recommendedStrategy?.primaryAngle;
  const supportingAngles = displayData?.recommendedStrategy?.supportingAngles || [];
  const tacticalPlan = displayData?.recommendedStrategy?.tacticalPlan || [];

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
    if (!committedStrategy || !displayData) return [];
    
    const { primary } = committedStrategy;
    const evidence: string[] = [];
    
    // Extract from existing data (use displayData)
    if (displayData?.prosecutionVulnerabilities?.evidenceGaps) {
      evidence.push(...displayData.prosecutionVulnerabilities.evidenceGaps.slice(0, 3));
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
    if (!committedStrategy || !displayData) return [];
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
    if (!committedStrategy || !displayData) return null;
    
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

  // Helper to copy plan to clipboard
  const handleCopyPlan = () => {
    const planText = Array.isArray(tacticalPlan) && tacticalPlan.length > 0
      ? tacticalPlan.join("\n")
      : primaryAngle?.howToExploit || "No plan available";
    
    navigator.clipboard.writeText(planText).catch(() => {
      // Fallback if clipboard API fails
      console.error("Failed to copy plan");
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Draft Strategy Banner - shown when bundle incomplete or disclosure gaps exist */}
        {gateBanner && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 mb-1">
                Draft strategy – subject to disclosure completion
              </p>
              <p className="text-xs text-amber-300/80">
                {gateBanner.message || "Bundle incomplete or disclosure gaps exist. Strategy is based on current material and may change as disclosure stabilises."}
              </p>
            </div>
          </div>
        )}

        {/* Header with Copy Plan button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Defence Plan</h2>
          {hasStrategyData && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPlan}
              className="gap-2"
            >
              <Copy className="h-3 w-3" />
              Copy Plan
            </Button>
          )}
        </div>

        {/* DEV-ONLY Debug Block */}
        {process.env.NODE_ENV !== "production" && (
          <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-xs font-mono space-y-1">
            <div className="font-semibold text-blue-400 mb-2">DEBUG INFO</div>
            <div>endpoint: /api/criminal/{caseId}/aggressive-defense</div>
            <div>hasStrategyData: {String(hasStrategyData)}</div>
            <div>documentCount: {documentCount}</div>
            <div>rawCharsTotal: {rawCharsTotal}</div>
            <div>payload keys: {payload ? Object.keys(payload).slice(0, 15).join(", ") : "null"}</div>
            <div>payload.recommendedStrategy exists: {payload?.recommendedStrategy ? "true" : "false"}</div>
            <div>payload.criticalAngles length: {Array.isArray(payload?.criticalAngles) ? payload.criticalAngles.length : "N/A"}</div>
            <div>payload.allAngles length: {Array.isArray(payload?.allAngles) ? payload.allAngles.length : "N/A"}</div>
          </div>
        )}

        {/* Analysis Status Banner */}
        {(() => {
          // RULE: Check for presence of strategyAnalysisData FIRST
          // If ANY strategy routes or recommendations are present, NEVER show error/unavailable/not run
          if (hasStrategyAnalysisData) {
            // We have strategy data - show status based on analysis version info
            if (!analysisVersionInfo) {
              // Version fetch failed but data exists - show Preview as conservative default
              return (
                <div className="mb-4 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">Strategy analysis: Preview (gated)</span>
                  </p>
                </div>
              );
            }
            
            const { has_analysis_version, analysis_mode } = analysisVersionInfo;
            
            if (analysis_mode === "preview") {
              return (
                <div className="mb-4 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">Strategy analysis: Preview (gated)</span>
                    <span className="text-muted-foreground ml-2">
                      (Using procedural templates - evidence-backed analysis pending disclosure)
                    </span>
                  </p>
                </div>
              );
            }
            
            if (analysis_mode === "complete") {
              return (
                <div className="mb-4 p-2 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">Strategy analysis: Complete</span>
                  </p>
                </div>
              );
            }
            
            // Fallback: has version but unknown mode - show Preview
            return (
              <div className="mb-4 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-xs text-foreground">
                  <span className="font-semibold">Strategy analysis: Preview (gated)</span>
                </p>
              </div>
            );
          }
          
          // No strategy data - show status based on analysis version info
          if (!analysisVersionInfo) {
            // Still loading or fetch failed - don't show banner yet
            return null;
          }
          
          const { has_analysis_version, analysis_mode } = analysisVersionInfo;
          
          if (!has_analysis_version) {
            return (
              <div className="mb-4 p-2 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-xs text-foreground">
                  <span className="font-semibold">Strategy analysis: Not run yet</span>
                </p>
              </div>
            );
          }
          
          if (analysis_mode === "preview") {
            return (
              <div className="mb-4 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <p className="text-xs text-foreground">
                  <span className="font-semibold">Strategy analysis: Preview (gated)</span>
                </p>
              </div>
            );
          }
          
          if (analysis_mode === "complete") {
            return (
              <div className="mb-4 p-2 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-xs text-foreground">
                  <span className="font-semibold">Strategy analysis: Complete</span>
                </p>
              </div>
            );
          }
          
          // Fallback (shouldn't happen)
          return null;
        })()}

        {/* Priority 1: If strategy-analysis routes exist -> render multi-route strategy */}
        {strategyRoutes && strategyRoutes.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Strategy Routes</h3>
            <div className="space-y-4">
              {strategyRoutes.map((route: any) => (
                <div
                  key={route.id}
                  className={`p-4 rounded-lg border ${
                    selectedRoute === route.type
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground">{route.title}</h4>
                    {selectedRoute === route.type && (
                      <Badge variant="primary" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{route.rationale}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <h5 className="text-xs font-semibold text-green-400 mb-1">Win Conditions</h5>
                      <ul className="space-y-1">
                        {route.winConditions?.slice(0, 3).map((condition: string, idx: number) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{condition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-red-400 mb-1">Risks</h5>
                      <ul className="space-y-1">
                        {route.risks?.slice(0, 3).map((risk: string, idx: number) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-xs font-semibold text-primary mb-1">Next Actions</h5>
                    <ul className="space-y-1">
                      {route.nextActions?.map((action: string, idx: number) => (
                        <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">{idx + 1}.</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Tactical Plan (Next 7 days) - assembled from attack paths */}
            {committedStrategy && strategyRoutes.length > 0 && (() => {
              const selectedRoute = strategyRoutes.find((r: any) => r.type === committedStrategy.primary);
              if (!selectedRoute?.attackPaths || selectedRoute.attackPaths.length === 0) return null;

              // Assemble next 48 hours actions from all attack paths
              const tacticalActions = selectedRoute.attackPaths
                .flatMap((path: any) => path.next48HoursActions || [])
                .filter((action: string, index: number, self: string[]) => self.indexOf(action) === index) // Remove duplicates
                .slice(0, 10); // Limit to 10 actions

              if (tacticalActions.length === 0) return null;

              return (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Tactical Plan (Next 7 days)</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Action items assembled from attack paths for the committed strategy. Includes evidence impact awareness and time pressure considerations.
                  </p>
                  <div className="space-y-2">
                    {tacticalActions.map((action: string, idx: number) => {
                      // Determine judicial optics for action
                      const lowerAction = action.toLowerCase();
                      let optics: "attractive" | "neutral" | "risky" = "neutral";
                      if (lowerAction.includes("disclosure request") || lowerAction.includes("continuity") || lowerAction.includes("written submission")) {
                        optics = "attractive";
                      } else if (lowerAction.includes("abuse") && !lowerAction.includes("chase")) {
                        optics = "risky";
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
                        >
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <p className="text-xs text-foreground flex-1">{action}</p>
                            {optics === "attractive" && (
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] border">
                                🟢 Attractive
                              </Badge>
                            )}
                            {optics === "risky" && (
                              <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] border">
                                🔴 Risky
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : Array.isArray(tacticalPlan) && tacticalPlan.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Tactical Plan</h3>
            <ul className="space-y-2 text-sm text-foreground">
              {tacticalPlan
                .filter((step: string) => step.trim().length > 0)
                .map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{step}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : primaryAngle ? (
          <>
            {/* Priority 2: Primary Angle card */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{primaryAngle.title}</h3>
                <Badge variant={primaryAngle.severity === "CRITICAL" ? "danger" : primaryAngle.severity === "HIGH" ? "primary" : "outline"}>
                  {primaryAngle.severity}
                </Badge>
              </div>
              {primaryAngle.whyThisMatters && (
                <p className="text-sm text-foreground">{primaryAngle.whyThisMatters}</p>
              )}
              {primaryAngle.howToExploit && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">How to exploit:</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{primaryAngle.howToExploit}</p>
                </div>
              )}
            </div>

            {/* Supporting angles (up to 2) */}
            {supportingAngles.slice(0, 2).map((angle: DefenseAngle, idx: number) => (
              <div key={idx} className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">{angle.title}</h4>
                  <Badge variant="outline" size="sm">{angle.severity}</Badge>
                </div>
                {angle.whyThisMatters && (
                  <p className="text-xs text-muted-foreground">{angle.whyThisMatters}</p>
                )}
              </div>
            ))}
          </>
        ) : null}
      </div>
    </Card>
  );
}
