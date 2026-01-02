/**
 * GET /api/criminal/[caseId]/strategy-analysis
 * 
 * Returns deterministic multi-route strategy analysis
 * Only runs if Analysis Gate is open (canGenerateAnalysis: true)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { makeOk, makeGateFail, makeNotFound, makeError, diagnosticsFromContext, type ApiResponse } from "@/lib/api/response";
import { buildCaseContext } from "@/lib/case-context";
import { checkAnalysisGate } from "@/lib/analysis/text-gate";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateStrategyRoute, generateArtifacts, generateEvidenceImpact } from "@/lib/criminal/strategy-fight-generators";
import type { StrategyAnalysisData, RouteType } from "@/lib/criminal/strategy-fight-types";
import { extractEvidenceSignals, generateStrategyRecommendation } from "@/lib/criminal/strategy-recommendation-engine";
import type { StrategyRecommendation } from "@/lib/criminal/strategy-recommendation-engine";
import { mapEvidenceImpact, getCommonMissingEvidence } from "@/lib/criminal/evidence-impact-mapper";
import { buildTimePressureState } from "@/lib/criminal/time-pressure-engine";
import { calculateConfidenceDrift } from "@/lib/criminal/confidence-drift-engine";
import { generateDecisionCheckpoints } from "@/lib/criminal/decision-checkpoints";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type StrategyAnalysisResponse = StrategyAnalysisData;


export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      // Get case's org_id directly from database (same pattern as strategy-commitment route)
      // SAFETY: cases.id is the PRIMARY KEY (confirmed by FK references in migrations)
      // Using .single() is safe because caseId from URL is the UUID PK - exactly one row expected
      // This matches the pattern used in: strategy-commitment, phase2-strategy-plan, aggressive-defense
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      // Case not found - return 404
      if (caseError || !caseRow) {
        return NextResponse.json(
          {
            ok: false,
            error: "Case not found",
            details: caseError ? caseError.message : "Case not found in database",
          },
          { status: 404 }
        );
      }

      // Validate case has org_id
      if (!caseRow.org_id || caseRow.org_id.trim() === "") {
        return NextResponse.json(
          {
            ok: false,
            error: "Case has no org_id",
          },
          { status: 500 }
        );
      }

      // Fetch documents directly using case's org_id (same pattern as other criminal routes)
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("id, name, created_at, raw_text, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("created_at", { ascending: false });

      if (documentsError) {
        console.error("[strategy-analysis] Error fetching documents:", documentsError);
        return NextResponse.json(
          {
            ok: false,
            error: "Failed to fetch documents",
            details: documentsError.message,
          },
          { status: 500 }
        );
      }

      // Compute diagnostics from documents (same as buildCaseContext does)
      let rawCharsTotal = 0;
      let jsonCharsTotal = 0;
      for (const doc of documents || []) {
        const rawText = doc.raw_text ?? "";
        const textLength = typeof rawText === "string" ? rawText.length : 0;
        rawCharsTotal += textLength;

        const extractedJson = doc.extracted_json;
        if (extractedJson) {
          try {
            const jsonStr = typeof extractedJson === "string" ? extractedJson : JSON.stringify(extractedJson);
            jsonCharsTotal += jsonStr.length;
          } catch {
            // Ignore JSON stringify errors
          }
        }
      }

      const docCount = (documents || []).length;
      const avgRawCharsPerDoc = docCount > 0 ? Math.floor(rawCharsTotal / docCount) : 0;
      const suspectedScanned = docCount > 0 && rawCharsTotal < 800 && jsonCharsTotal < 400;
      const textThin = docCount > 0 && rawCharsTotal < 800;

      const reasonCodes: string[] = [];
      if (suspectedScanned) {
        reasonCodes.push("SCANNED_SUSPECTED");
      } else if (textThin) {
        reasonCodes.push("TEXT_THIN");
      }
      if (reasonCodes.length === 0 && docCount > 0) {
        reasonCodes.push("OK");
      } else if (reasonCodes.length === 0 && docCount === 0) {
        reasonCodes.push("DOCS_NONE");
      }

      const canGenerateAnalysis = rawCharsTotal > 0 && !suspectedScanned && !textThin && reasonCodes.includes("OK");

      // Build case context for Analysis Gate check
      // We'll override diagnostics with our computed values to ensure accuracy
      const context = await buildCaseContext(caseId, { userId });
      
      // Ensure context.case is set (should match caseRow we found)
      if (!context.case) {
        // If buildCaseContext didn't find the case, create a minimal case object
        context.case = {
          id: caseRow.id,
          org_id: caseRow.org_id,
        } as any;
      }
      
      // Override context with our directly-fetched data (ensures accuracy)
      context.documents = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name || "",
        created_at: doc.created_at || new Date().toISOString(),
        raw_text: doc.raw_text,
        extracted_json: doc.extracted_json,
      }));
      context.diagnostics = {
        docCount,
        rawCharsTotal,
        jsonCharsTotal,
        avgRawCharsPerDoc,
        suspectedScanned,
        reasonCodes,
      };
      context.canGenerateAnalysis = canGenerateAnalysis;
      
      // Update orgScope to use the case's actual org_id
      context.orgScope = {
        orgIdResolved: caseRow.org_id,
        method: "org_uuid" as const,
      };

      // Log case resolution (as requested)
      console.log("[strategy-analysis] case resolved", {
        caseIdParam: caseId,
        orgId: caseRow.org_id,
        foundCaseId: caseRow.id,
        documentCount: docCount,
      });

      // Enforce Analysis Gate - only run if canGenerateAnalysis is true
      const gateResult = checkAnalysisGate(context);
      if (!gateResult.ok) {
        return makeGateFail<StrategyAnalysisResponse>(
          gateResult.banner || {
            severity: "warning",
            title: "Insufficient text extracted",
            detail: "Not enough extractable text to generate reliable strategy analysis. Upload text-based PDFs or run OCR, then re-analyse.",
          },
          context,
          caseId,
        );
      }

      // Check if strategy is committed
      const { data: commitment } = await supabase
        .from("case_strategy_commitments")
        .select("primary_strategy")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get case facts for artifacts
      const { data: caseData } = await supabase
        .from("cases")
        .select("title")
        .eq("id", caseId)
        .single();

      // Generate routes with all layers using new generators
      const routeTypes: Array<"fight_charge" | "charge_reduction" | "outcome_management"> = [
        "fight_charge",
        "charge_reduction",
        "outcome_management",
      ];

      const routes = routeTypes.map((routeType) =>
        generateStrategyRoute(
          routeType,
          canGenerateAnalysis,
          {
            docCount: context.diagnostics.docCount,
            rawCharsTotal: context.diagnostics.rawCharsTotal,
            suspectedScanned: context.diagnostics.suspectedScanned,
            textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          },
          {
            caseTitle: caseData?.title || undefined,
          }
        )
      );

      // Generate evidence impact for all routes
      const evidenceImpact = routeTypes.flatMap((routeType) => generateEvidenceImpact(routeType));

      // Extract evidence signals and generate recommendation
      const { data: charges } = await supabase
        .from("criminal_charges")
        .select("section, offence")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id);

      const evidenceSignals = extractEvidenceSignals(
        {
          docCount: context.diagnostics.docCount,
          rawCharsTotal: context.diagnostics.rawCharsTotal,
          suspectedScanned: context.diagnostics.suspectedScanned,
          textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          canGenerateAnalysis,
        },
        documents,
        charges || []
      );

      const recommendation = generateStrategyRecommendation(
        evidenceSignals,
        {
          docCount: context.diagnostics.docCount,
          rawCharsTotal: context.diagnostics.rawCharsTotal,
          suspectedScanned: context.diagnostics.suspectedScanned,
          textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          canGenerateAnalysis,
        },
        routeTypes
      );

      // Build evidence impact map
      const missingEvidence = getCommonMissingEvidence(
        evidenceSignals.cctvSequence !== "missing",
        false, // BWV - would need to check
        evidenceSignals.disclosureCompleteness === "complete",
        evidenceSignals.interviewEvidence,
        evidenceSignals.custodyEvidence,
        evidenceSignals.medicalEvidence !== "unknown",
        false // VIPER - would need to check
      );

      const evidenceImpactMap = mapEvidenceImpact(
        missingEvidence,
        routes.flatMap(r => r.attackPaths),
        routeTypes
      );

      // Build time pressure state
      const { data: hearings } = await supabase
        .from("criminal_hearings")
        .select("hearing_date, hearing_type")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("hearing_date", { ascending: true })
        .limit(1);

      const ptphDate = hearings && hearings.length > 0 && hearings[0].hearing_type?.toLowerCase().includes("ptph")
        ? new Date(hearings[0].hearing_date)
        : null;

      const timePressure = buildTimePressureState(ptphDate, null); // Disclosure deadline would come from case data

      // Calculate confidence states for each route
      const confidenceStates: Record<RouteType, any> = {} as any;
      for (const routeType of routeTypes) {
        confidenceStates[routeType] = calculateConfidenceDrift(
          routeType,
          evidenceSignals
        );
      }

      // Generate decision checkpoints
      const decisionCheckpoints = recommendation
        ? generateDecisionCheckpoints(
            recommendation.recommended,
            evidenceSignals.disclosureCompleteness === "gaps",
            evidenceSignals.paceCompliance === "breaches",
            ptphDate ? (ptphDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 14 : false
          )
        : [];

      // Generate artifacts for committed route (if any) - AFTER recommendation is generated
      const artifacts = commitment?.primary_strategy
        ? generateArtifacts(
            commitment.primary_strategy as "fight_charge" | "charge_reduction" | "outcome_management",
            canGenerateAnalysis,
            {
              caseTitle: caseData?.title || undefined,
            },
            {
              recommendation: recommendation ? {
                confidence: recommendation.confidence,
                rationale: recommendation.rationale,
                flipConditions: recommendation.flipConditions,
              } : undefined,
              timePressure: timePressure ? {
                currentLeverage: timePressure.currentLeverage,
                leverageExplanation: timePressure.leverageExplanation,
              } : undefined,
              evidenceImpact: evidenceImpactMap.map(eim => ({
                evidenceItem: eim.evidenceItem,
                impactOnDefence: eim.impactOnDefence,
              })),
            }
          )
        : undefined;

      // Build response
      const diagnostics = diagnosticsFromContext(caseId, context);
      if (diagnostics) {
        diagnostics.orgId = caseRow.org_id;
      }

      const response: StrategyAnalysisResponse = {
        routes,
        selectedRoute: commitment?.primary_strategy || undefined,
        artifacts,
        evidenceImpact,
        canGenerateAnalysis,
        recommendation,
        evidenceImpactMap,
        timePressure,
        confidenceStates,
        decisionCheckpoints,
      };

      return NextResponse.json({
        ok: true,
        data: response,
        diagnostics: diagnostics || {
          caseId,
          orgId: caseRow.org_id,
          documentCount: context.diagnostics.docCount,
          documentsWithRawText: context.documents.filter(d => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0).length,
          rawCharsTotal: context.diagnostics.rawCharsTotal,
          jsonCharsTotal: context.diagnostics.jsonCharsTotal,
          suspectedScanned: context.diagnostics.suspectedScanned,
          textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          traceId: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to generate strategy analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate strategy analysis";
      try {
        const authRes = await requireAuthContextApi();
        if (authRes.ok) {
          const { userId } = authRes.context;
          const context = await buildCaseContext(caseId, { userId });
          return makeError<StrategyAnalysisResponse>("STRATEGY_ANALYSIS_ERROR", errorMessage, context, caseId);
        }
      } catch {
        // Fallback
        try {
          const fallbackContext = await buildCaseContext(caseId, { userId: "error-fallback" });
          return makeError<StrategyAnalysisResponse>("STRATEGY_ANALYSIS_ERROR", errorMessage, fallbackContext, caseId);
        } catch {
          return NextResponse.json(
            {
              ok: false,
              data: null,
              banner: {
                severity: "error",
                title: "Error",
                detail: errorMessage,
              },
              errors: [{ code: "STRATEGY_ANALYSIS_ERROR", message: errorMessage }],
            },
            { status: 500 }
          );
        }
      }
    }
  });
}

