/**
 * Shared function to get aggressive defense analysis
 * Used by both the authenticated route and the debug route
 */

import { getSupabaseAdminClient } from "@/lib/supabase";
import { findAllDefenseAngles, type DefenseAngle } from "@/lib/criminal/aggressive-defense-engine";
import { getCriminalBundleCompleteness } from "@/lib/criminal/bundle-completeness";
import { shouldShowProbabilities } from "@/lib/criminal/probability-gate";
import { buildCaseContext } from "@/lib/case-context";
import { analyzeEvidenceStrength } from "@/lib/evidence-strength-analyzer";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";
import { calibrateAngles, computeOverallFromAngles, calibrateProbability } from "@/lib/analysis/calibration";
import { getCachedLLMResult, setCachedLLMResult, generateDocSetHash } from "@/lib/llm/cache";
import { mergeCriminalDocs } from "@/lib/case-evidence/merge-criminal-docs";
import type { AggressiveDefenseAnalysis } from "@/lib/criminal/aggressive-defense-engine";
import { generateCriminalStrategies } from "@/lib/criminal/strategy-engine";
import { normalizeCriminalStrategies, checkForCivilLeakage } from "@/lib/criminal/strategy-normalizer";
import { diagnosticsFromContext } from "@/lib/api/response";

type GetAggressiveDefenseOptions = {
  caseId: string;
  orgId: string;
  userId: string; // Required for buildCaseContext
};

import type { CaseContext } from "@/lib/case-context";
import type { ApiResponse } from "@/lib/api/response";

type GetAggressiveDefenseResult = {
  ok: boolean;
  data?: any;
  banner?: {
    severity: "info" | "warning" | "error";
    title: string;
    detail?: string;
  };
  diagnostics?: ApiResponse<any>["diagnostics"];
  errors?: Array<{ code: string; message: string }>;
  status?: number;
};

export async function getAggressiveDefense({
  caseId,
  orgId,
  userId,
}: GetAggressiveDefenseOptions): Promise<GetAggressiveDefenseResult> {
  try {
    // If orgId is provided and is a valid UUID, use it directly (bypasses userId-derived org scope)
    // This ensures we use the case's actual org_id, not a fallback to solo-user_* strings
    let context: CaseContext;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isDebugUser = userId === "debug-user";
    const hasValidUuidOrgId = orgId && uuidPattern.test(orgId);
    
    if (hasValidUuidOrgId) {
      // Use provided UUID orgId (from case's actual org_id) - works for both debug and authenticated routes
      // Debug mode: use provided orgId to construct matching org scope
      const { getSupabaseAdminClient } = await import("@/lib/supabase");
      const supabase = getSupabaseAdminClient();
      
      // Query case directly with admin client using provided UUID orgId (bypasses org scope restrictions)
      const { data: caseRow } = await supabase
        .from("cases")
        .select("*")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();
      
      if (!caseRow) {
        return {
          ok: false,
          data: null,
          banner: {
            severity: "error",
            title: "Case not found",
            detail: "Case not found for the provided org_id.",
          },
          diagnostics: {
            caseId,
            orgId,
            documentCount: 0,
            documentsWithRawText: 0,
            rawCharsTotal: 0,
            jsonCharsTotal: 0,
            suspectedScanned: false,
            textThin: false,
            traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            updatedAt: new Date().toISOString(),
          },
          status: 404,
        };
      }
      
      // Query documents with admin client using case's org_id
      const { data: documents } = await supabase
        .from("documents")
        .select("id, name, created_at, raw_text, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", orgId);
      
      // Build minimal context for debug mode
      const docs = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name || "",
        created_at: doc.created_at || new Date().toISOString(),
        raw_text: doc.raw_text,
        extracted_json: doc.extracted_json,
      }));
      
      let rawCharsTotal = 0;
      let jsonCharsTotal = 0;
      for (const doc of docs) {
        const rawText = doc.raw_text ?? "";
        const textLength = typeof rawText === "string" ? rawText.length : 0;
        rawCharsTotal += textLength;
        
        if (doc.extracted_json) {
          try {
            const jsonStr = typeof doc.extracted_json === "string" ? doc.extracted_json : JSON.stringify(doc.extracted_json);
            jsonCharsTotal += jsonStr.length;
          } catch {
            // Ignore
          }
        }
      }
      
      const avgRawCharsPerDoc = docs.length > 0 ? rawCharsTotal / docs.length : 0;
      const suspectedScanned = docs.length > 0 && rawCharsTotal < 800 && jsonCharsTotal < 400;
      const textThin = rawCharsTotal < 500;
      
      context = {
        case: caseRow as any,
        orgScope: {
          orgIdResolved: orgId,
          method: "owner_override" as const,
        },
        documents: docs,
        diagnostics: {
          docCount: docs.length,
          rawCharsTotal,
          jsonCharsTotal,
          avgRawCharsPerDoc,
          suspectedScanned,
          reasonCodes: docs.length === 0 ? ["DOCS_NONE"] : [],
        },
        canGenerateAnalysis: rawCharsTotal > 0 && !suspectedScanned && !textThin,
      };
    } else {
      // Fallback: build case context using userId-derived org scope (only if no valid UUID orgId provided)
      // This should rarely happen if routes properly pass case's org_id
      context = await buildCaseContext(caseId, { userId });
    }

    if (!context.case) {
      return {
        ok: false,
        data: null,
        banner: {
          severity: "error",
          title: "Case not found",
          detail: "Case not found for your org scope.",
        },
        diagnostics: diagnosticsFromContext(caseId, context),
        status: 404,
      };
    }

    // Check analysis gate (for banner display - keep gate for safety)
    const gateResult = checkAnalysisGate(context);
    const isGated = !gateResult.ok;
    // CRITICAL: Keep gate for safety, but allow PROVISIONAL strategies with warnings
    // Gate prevents confident outputs from thin bundles - this is intentional

    const bundle = await getCriminalBundleCompleteness({ caseId, orgId });
    const gate = shouldShowProbabilities({
      practiceArea: "criminal",
      completeness: bundle.completeness,
      criticalMissingCount: bundle.criticalMissingCount,
    });

    const supabase = getSupabaseAdminClient();

    // Verify case is criminal (already checked via context.case, but double-check practice_area)
    if (context.case.practice_area !== "criminal") {
      return {
        ok: false,
        data: null,
        banner: {
          severity: "error",
          title: "Case not found",
          detail: "Case is not a criminal case",
        },
        diagnostics: diagnosticsFromContext(caseId, context),
        status: 404,
      };
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

    // CRITICAL: ALWAYS convert strategies to defense angles - strategies are PRIMARY source
    // This ensures we ALWAYS have strategies even when loopholes/angles are thin
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

    // CRITICAL: Always use strategy angles - they are the PRIMARY source
    // Merge with existing angles if they exist, but prioritize strategy angles
    if (analysis.criticalAngles && analysis.criticalAngles.length > 0) {
      // Merge: strategy angles first (primary), then existing angles
      analysis.criticalAngles = [...strategyAngles.slice(0, 3), ...analysis.criticalAngles.slice(0, 2)];
      analysis.allAngles = [...strategyAngles, ...(analysis.allAngles || [])];
    } else {
      // No existing angles - use strategy angles only
      analysis.criticalAngles = strategyAngles.slice(0, 3);
      analysis.allAngles = strategyAngles;
    }
    
    // ALWAYS set recommended strategy from first strategy (strategies are PRIMARY)
    if (strategiesResult.strategies.length > 0) {
      const primaryStrategy = strategiesResult.strategies[0];
      analysis.recommendedStrategy = {
        primaryAngle: strategyAngles[0],
        supportingAngles: strategyAngles.slice(1, 3),
        combinedProbability: primaryStrategy.provisional ? 40 : 60,
        tacticalPlan: primaryStrategy.immediateActions,
      };
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

    // CRITICAL: Normalize strategies ALWAYS (even when gated) - strategies are PRIMARY
    const normalizedStrategies = normalizeCriminalStrategies(strategiesResult.strategies);

    // Check for civil leakage
    const civilLeakageCheck = checkForCivilLeakage(
      analysis.criticalAngles?.map(a => a.title + " " + a.whyThisMatters).join(" ") || ""
    );

    if (!gate.show || isGated) {

      return {
        ok: true,
        data: {
          ...analysis,
          probabilitiesSuppressed: true,
          suppressionReason: gate.reason || (isGated ? gateResult.banner?.title : undefined),
          bundleCompleteness: bundle.completeness,
          criticalMissingCount: bundle.criticalMissingCount,
          overallWinProbability: null,
          recommendedStrategy: analysis?.recommendedStrategy
            ? { ...analysis.recommendedStrategy, combinedProbability: null }
            : analysis?.recommendedStrategy,
          criticalAngles: (analysis?.criticalAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
          allAngles: (analysis?.allAngles ?? []).map((a: any) => ({ ...a, winProbability: null })),
          cached: wasCached,
          evidenceGraph: evidenceGraph,
          strategies: normalizedStrategies, // ALWAYS include strategies
          civilLeakageBanner: civilLeakageCheck.hasLeakage ? civilLeakageCheck.banner : undefined,
        },
        banner: isGated ? {
          severity: (gateResult.banner?.severity || "warning") as "info" | "warning" | "error",
          title: gateResult.banner?.title || "Insufficient text extracted",
          detail: gateResult.banner?.detail || "Strategy generated but based on limited material. Upload more documents for enhanced analysis.",
        } : undefined,
        diagnostics: diagnosticsFromContext(caseId, context),
      };
    }

    return {
      ok: true,
      data: {
        ...analysis,
        probabilitiesSuppressed: false,
        bundleCompleteness: bundle.completeness,
        criticalMissingCount: bundle.criticalMissingCount,
        cached: wasCached,
        evidenceGraph: evidenceGraph,
        strategies: normalizedStrategies, // ALWAYS include strategies
        civilLeakageBanner: civilLeakageCheck.hasLeakage ? civilLeakageCheck.banner : undefined,
      },
      diagnostics: diagnosticsFromContext(caseId, context),
    };
  } catch (error) {
    console.error("Failed to generate aggressive defense analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate aggressive defense analysis";
    return {
      ok: false,
      data: null,
      banner: {
        severity: "error",
        title: "Error",
        detail: errorMessage,
      },
      errors: [{ code: "AGGRESSIVE_DEFENSE_ERROR", message: errorMessage }],
      diagnostics: {
        caseId,
        orgId: "",
        documentCount: 0,
        documentsWithRawText: 0,
        rawCharsTotal: 0,
        jsonCharsTotal: 0,
        suspectedScanned: false,
        textThin: false,
        traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        updatedAt: new Date().toISOString(),
      },
      status: 500,
    };
  }
}

