/**
 * GET /api/criminal/[caseId]/aggressive-defense
 * 
 * Returns aggressive defense analysis - finds EVERY possible angle to win
 */

import { NextRequest } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllDefenseAngles, type DefenseAngle } from "@/lib/criminal/aggressive-defense-engine";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext } from "@/lib/case-context";
import { analyzeEvidenceStrength } from "@/lib/evidence-strength-analyzer";
import { makeOk, makeGateFail, makeNotFound, makeError, type ApiResponse } from "@/lib/api/response";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";
import { calibrateAngles, computeOverallFromAngles, calibrateProbability } from "@/lib/analysis/calibration";
import { getCachedLLMResult, setCachedLLMResult, generateDocSetHash } from "@/lib/llm/cache";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";
import type { AggressiveDefenseAnalysis } from "@/lib/criminal/aggressive-defense-engine";
import { generateCriminalStrategies } from "@/lib/criminal/strategy-engine";
import { normalizeCriminalStrategies, checkForCivilLeakage } from "@/lib/criminal/strategy-normalizer";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      // Build case context and gate analysis
      const context = await buildCaseContext(caseId, { userId });

      if (!context.case) {
        return makeNotFound<any>(context, caseId);
      }

      // Check analysis gate (hard gating)
      const gateResult = checkAnalysisGate(context);
      if (!gateResult.ok) {
        return makeGateFail<any>(
          {
            severity: gateResult.banner?.severity || "warning",
            title: gateResult.banner?.title || "Insufficient text extracted",
            detail: gateResult.banner?.detail,
          },
          context,
          caseId,
        );
      }

      const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
      const gate = shouldShowProbabilities({
        practiceArea: "criminal",
        completeness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
      });

      const supabase = getSupabaseAdminClient();

      // Verify case is criminal (already checked via context.case, but double-check practice_area)
      if (context.case.practice_area !== "criminal") {
        return makeNotFound<any>(context, caseId);
      }

      // Get extracted facts from context.documents (same source as everything else)
      // Use the first document's extracted_json as criminalMeta source
      let criminalMeta = null;
      if (context.documents.length > 0 && context.documents[0].extracted_json) {
        const extractedJson = context.documents[0].extracted_json;
        if (typeof extractedJson === "object" && extractedJson !== null) {
          criminalMeta = (extractedJson as any).criminalMeta || null;
        }
      }

      // FIX: Build evidence graph and check cache
      const evidenceGraph = mergeCriminalDocs(context);
      
      // Get charge information for strategy generation
      const { data: chargesData } = await supabase
        .from("criminal_charges")
        .select("*")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Extract charge for strategy engine
      const charge = chargesData ? {
        offence: chargesData.offence || "",
        section: chargesData.section || undefined,
        description: chargesData.description || undefined,
      } : null;

      // Generate strategies ALWAYS (even with thin bundles)
      const disclosureStatus = {
        isComplete: evidenceGraph.disclosureGaps.length === 0,
        gaps: evidenceGraph.disclosureGaps.map(g => ({ category: g.category, item: g.item })),
        mg6cDisclosed: evidenceGraph.evidenceItems.some(e => e.type === "PACE" && e.disclosureStatus === "disclosed"),
        cctvDisclosed: evidenceGraph.evidenceItems.some(e => e.type === "CCTV" && e.disclosureStatus === "disclosed"),
      };

      // Get interview stance from evidence graph or criminalMeta
      let interviewStance: "no_comment" | "answered" | "silent" | null = null;
      if (criminalMeta?.interview?.stance) {
        interviewStance = criminalMeta.interview.stance === "no_comment" ? "no_comment" :
                     criminalMeta.interview.stance === "answered" ? "answered" : "silent";
      }

      // Generate strategies (ALWAYS returns at least 2, even for thin bundles)
      const strategiesResult = generateCriminalStrategies({
        charge,
        evidenceGraph,
        disclosureStatus,
        interviewStance,
      });
      
      // Generate cache key
      const docSetHash = generateDocSetHash(context.documents);
      const cacheKey = {
        analysisName: "aggressive-defense",
        caseId,
        docSetHash,
        practiceArea: "criminal",
      };

      // Check cache first
      const cached = await getCachedLLMResult<AggressiveDefenseAnalysis>(orgId, cacheKey);
      let analysis: AggressiveDefenseAnalysis;
      let wasCached = false;

      if (cached.cached) {
        analysis = cached.data;
        wasCached = true;
      } else {
        // Get aggressive defense analysis
        // FIX: Pass documents array for LLM fallback when criminalMeta is null
        analysis = await findAllDefenseAngles(
          criminalMeta,
          caseId,
          context.documents.map((doc) => ({
            raw_text: doc.raw_text,
            extracted_json: doc.extracted_json,
            name: doc.name,
          })),
        );

        // Cache the result
        await setCachedLLMResult(orgId, caseId, cacheKey, analysis);
      }

      // FIX: If analysis has no angles or weak angles, enhance with strategy engine
      // This ensures we ALWAYS have strategies even when loopholes/angles are thin
      if (!analysis.criticalAngles || analysis.criticalAngles.length === 0) {
        // Convert strategies to defense angles format
        const strategyAngles: DefenseAngle[] = strategiesResult.strategies.map((strategy, idx) => {
          // Map strategy ID to proper DefenseAngle angleType
          let angleType: DefenseAngle["angleType"];
          if (strategy.id.includes("intent")) {
            angleType = "EVIDENCE_WEAKNESS_CHALLENGE";
          } else if (strategy.id.includes("disclosure")) {
            angleType = "DISCLOSURE_FAILURE_STAY";
          } else if (strategy.id.includes("identification")) {
            angleType = "IDENTIFICATION_CHALLENGE";
          } else if (strategy.id.includes("pace")) {
            angleType = "PACE_BREACH_EXCLUSION";
          } else if (strategy.id.includes("plea")) {
            angleType = "SENTENCING_MITIGATION";
          } else {
            angleType = "NO_CASE_TO_ANSWER";
          }

          return {
            id: strategy.id,
            angleType,
            title: strategy.title,
            severity: (strategy.provisional ? "MEDIUM" : "HIGH") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
            winProbability: strategy.provisional ? 40 : 60,
            whyThisMatters: strategy.theory,
            legalBasis: strategy.theory,
            caseLaw: [],
            prosecutionWeakness: strategy.whenToUse,
            howToExploit: strategy.immediateActions.join("; "),
            specificArguments: strategy.immediateActions,
            crossExaminationPoints: [],
            submissions: [],
            ifSuccessful: strategy.downgradeTarget ? `Downgrade to ${strategy.downgradeTarget}` : "Case dismissed or reduced",
            ifUnsuccessful: "Fallback to alternative strategy",
            combinedWith: [],
            evidenceNeeded: [],
            disclosureRequests: strategy.disclosureDependency ? strategy.immediateActions.filter(a => a.toLowerCase().includes("request") || a.toLowerCase().includes("disclosure")) : [],
            createdAt: new Date().toISOString(),
          };
        });

        // Use strategy angles as critical angles
        analysis.criticalAngles = strategyAngles.slice(0, 3);
        analysis.allAngles = strategyAngles;
        
        // Set recommended strategy from first strategy
        if (strategiesResult.strategies.length > 0) {
          const primaryStrategy = strategiesResult.strategies[0];
          analysis.recommendedStrategy = {
            primaryAngle: strategyAngles[0],
            supportingAngles: strategyAngles.slice(1),
            combinedProbability: primaryStrategy.provisional ? 40 : 60,
            tacticalPlan: primaryStrategy.immediateActions,
          };
        }
      }

      // Get key facts for evidence strength analysis
      const { data: keyFacts } = await supabase
        .from("case_analysis")
        .select("analysis_json")
        .eq("case_id", caseId)
        .eq("analysis_type", "key_facts")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Use buildCaseContext documents (same source as everything else - "One Brain")
      // This ensures we're analyzing the same documents that other endpoints use
      const documentsForAnalysis = context.documents.map((doc) => ({
        raw_text: doc.raw_text,
        extracted_facts: doc.extracted_json, // Use extracted_json as extracted_facts
        extracted_json: doc.extracted_json,
      }));

      // Analyze evidence strength for reality calibration
      const evidenceStrength = analyzeEvidenceStrength({
        documents: documentsForAnalysis,
        keyFacts: keyFacts?.analysis_json,
        aggressiveDefense: analysis,
        strategicOverview: null,
      });

      // Apply reality calibration to win probabilities (using shared calibration function)
      // Calibrate all angles (preserves DefenseAngle type)
      analysis.criticalAngles = calibrateAngles<DefenseAngle>(analysis.criticalAngles || [], evidenceStrength);
      analysis.allAngles = calibrateAngles<DefenseAngle>(analysis.allAngles || [], evidenceStrength);

      // Calibrate recommended strategy angles
      if (analysis.recommendedStrategy) {
        if (analysis.recommendedStrategy.primaryAngle) {
          analysis.recommendedStrategy.primaryAngle.winProbability = calibrateProbability(
            analysis.recommendedStrategy.primaryAngle.winProbability || 70,
            evidenceStrength,
          );
        }
        if (analysis.recommendedStrategy.supportingAngles) {
          analysis.recommendedStrategy.supportingAngles = calibrateAngles<DefenseAngle>(
            analysis.recommendedStrategy.supportingAngles,
            evidenceStrength,
          );
        }
        // Calibrate combined probability
        analysis.recommendedStrategy.combinedProbability = calibrateProbability(
          analysis.recommendedStrategy.combinedProbability || 70,
          evidenceStrength,
        );
      }

      // Compute overall from calibrated angles (ensures consistency)
      if (analysis.criticalAngles.length > 0) {
        analysis.overallWinProbability = computeOverallFromAngles(analysis.criticalAngles, "weighted");
      } else if (analysis.overallWinProbability) {
        analysis.overallWinProbability = calibrateProbability(analysis.overallWinProbability, evidenceStrength);
      }

      // Update specific arguments for disclosure stay angles (language adjustment)
      if (evidenceStrength.calibration.shouldDowngradeDisclosureStay) {
        analysis.criticalAngles = analysis.criticalAngles.map((angle: any) => {
          if (angle.angleType === "DISCLOSURE_FAILURE_STAY") {
            return {
              ...angle,
              specificArguments: angle.specificArguments?.map((arg: string) =>
                arg.includes("Consider stay/abuse of process only if disclosure failures persist after a clear chase trail")
                  ? arg
                  : arg.replace(/stay|abuse of process/gi, (match) => {
                      return match.toLowerCase() === "stay" ? "disclosure directions" : "procedural leverage";
                    })
              ) || angle.specificArguments,
            };
          }
          return angle;
        });
      }

      // Add evidence strength warnings to analysis
      analysis.evidenceStrengthWarnings = evidenceStrength.warnings;
      analysis.evidenceStrength = evidenceStrength.overallStrength;
      analysis.realisticOutcome = evidenceStrength.calibration.realisticOutcome;

      if (!gate.show) {
        // Normalize strategies even when gated
        const normalizedStrategies = normalizeCriminalStrategies(strategiesResult.strategies);

        // Check for civil leakage
        const civilLeakageCheck = checkForCivilLeakage(
          analysis.criticalAngles?.map(a => a.title + " " + a.whyThisMatters).join(" ") || ""
        );

        return makeOk(
          {
            ...analysis,
            probabilitiesSuppressed: true,
            suppressionReason: gate.reason,
            bundleCompleteness: bundle.completeness,
            criticalMissingCount: bundle.criticalMissingCount,
            overallWinProbability: null,
            recommendedStrategy: analysis?.recommendedStrategy
              ? { ...analysis.recommendedStrategy, combinedProbability: null }
              : analysis?.recommendedStrategy,
            criticalAngles: (analysis?.criticalAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
            allAngles: (analysis?.allAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
            cached: wasCached,
            evidenceGraph: evidenceGraph, // Include evidence graph
            strategies: normalizedStrategies, // Include normalized strategies even when gated
            civilLeakageBanner: civilLeakageCheck.hasLeakage ? civilLeakageCheck.banner : undefined,
          },
          context,
          caseId,
        );
      }

      return makeOk(
        {
          ...analysis,
          probabilitiesSuppressed: false,
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          cached: wasCached,
          evidenceGraph: evidenceGraph, // Include evidence graph
        },
        context,
        caseId,
      );
    } catch (error) {
      console.error("Failed to generate aggressive defense analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate aggressive defense analysis";
      try {
        const authRes = await requireAuthContextApi();
        if (authRes.ok) {
          const { userId } = authRes.context;
          const context = await buildCaseContext(caseId, { userId });
          return makeError<any>("AGGRESSIVE_DEFENSE_ERROR", errorMessage, context, caseId);
        }
      } catch {
        // Fallback
      }
      return makeError<any>(
        "AGGRESSIVE_DEFENSE_ERROR",
        errorMessage,
        {
          case: null,
          orgScope: { orgIdResolved: "", method: "solo_fallback" },
          documents: [],
          diagnostics: {
            docCount: 0,
            rawCharsTotal: 0,
            jsonCharsTotal: 0,
            avgRawCharsPerDoc: 0,
            suspectedScanned: false,
            reasonCodes: [],
          },
          canGenerateAnalysis: false,
        },
        caseId,
      );
    }
  });
}

