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
import { scanResidualAttacks } from "@/lib/criminal/residual-attack-scanner";
import { buildStrategyCoordinator } from "@/lib/criminal/strategy-coordinator";
import { computeProceduralSafety } from "@/lib/criminal/procedural-safety";
import { resolveOffence } from "@/lib/criminal/offence-resolution";
import { OFFENCE_TYPE_LABELS, normaliseOffenceType } from "@/lib/criminal/strategy-suggest/constants";

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
      const { userId, orgId: authOrgId } = authRes.context;

      // Use buildCaseContext as the SINGLE source for case + documents (same as Case Files and rest of app).
      // Pass authOrgId so document lookup uses same org as Case Files / upload (fixes 0 docs in strategy).
      const context = await buildCaseContext(caseId, { userId, orgIdHint: authOrgId });

      if (!context.case) {
        return NextResponse.json(
          {
            ok: false,
            error: "Case not found",
            details: context.banner?.message ?? "Case not found for your organisation",
          },
          { status: 404 }
        );
      }

      const documents = context.documents ?? [];
      const docCount = context.diagnostics.docCount;
      const rawCharsTotal = context.diagnostics.rawCharsTotal;
      const suspectedScanned = context.diagnostics.suspectedScanned;
      const textThin = docCount > 0 && rawCharsTotal < 800;
      const reasonCodes = context.diagnostics.reasonCodes ?? [];

      // PHASE 2 FIX: Lower threshold for strategy generation
      const allowStrategyGeneration = rawCharsTotal >= 800 && !suspectedScanned;
      const canGenerateAnalysis = context.canGenerateAnalysis ?? false;

      // Log case resolution (same source as Case Files)
      console.log("[strategy-analysis] case resolved", {
        caseIdParam: caseId,
        orgId: context.orgScope?.orgIdResolved,
        foundCaseId: context.case?.id,
        documentCount: docCount,
        rawCharsTotal,
        allowStrategyGeneration,
        canGenerateAnalysis,
      });

      const supabase = getSupabaseAdminClient();
      const orgIdForQueries = context.case?.org_id ?? context.orgScope?.orgIdResolved ?? "";

      // PHASE 2 FIX: Only block if truly insufficient (rawCharsTotal < 800 or scanned)
      // Use allowStrategyGeneration instead of strict canGenerateAnalysis gate
      if (!allowStrategyGeneration) {
        return makeGateFail<StrategyAnalysisResponse>(
          {
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
        .eq("org_id", orgIdForQueries)
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

      // Resolve offence (charges + matter + bundle) before routes so strategy content can vary by offence type
      const { data: charges } = await supabase
        .from("criminal_charges")
        .select("section, offence")
        .eq("case_id", caseId)
        .eq("org_id", orgIdForQueries);

      const { data: matterRow } = await supabase
        .from("criminal_cases")
        .select("alleged_offence, offence_override")
        .eq("id", caseId)
        .eq("org_id", orgIdForQueries)
        .maybeSingle();
      const matter = matterRow as { alleged_offence?: string; offence_override?: string | null } | null;
      const offenceOverride = matter?.offence_override?.trim() || null;

      const resolvedOffence = offenceOverride
        ? {
            offenceType: normaliseOffenceType(offenceOverride),
            label: OFFENCE_TYPE_LABELS[normaliseOffenceType(offenceOverride)],
            source: "override" as const,
          }
        : resolveOffence({
            charges: (charges ?? []).map((c: { offence?: string; section?: string | null }) => ({ offence: c?.offence ?? "", section: c?.section ?? null })),
            allegedOffence: matter?.alleged_offence ?? null,
            bundleSnippet: documents
              .map((d) => (typeof d.raw_text === "string" ? d.raw_text : ""))
              .join(" ")
              .slice(0, 2000) || undefined,
          });

      // PHASE 3 FIX: Generate routes with allowStrategyGeneration (not strict canGenerateAnalysis)
      // This ensures routes are generated when evidence allows, even if confidence is capped
      // canGenerateAnalysis is only used for confidence labels/warnings
      const routes = routeTypes.map((routeType) =>
        generateStrategyRoute(
          routeType,
          allowStrategyGeneration, // Use allowStrategyGeneration instead of canGenerateAnalysis
          {
            docCount: context.diagnostics.docCount,
            rawCharsTotal: context.diagnostics.rawCharsTotal,
            suspectedScanned: context.diagnostics.suspectedScanned,
            textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
          },
          {
            caseTitle: caseData?.title || undefined,
            offenceType: resolvedOffence.offenceType,
          }
        )
      );

      // Generate evidence impact for all routes
      const evidenceImpact = routeTypes.flatMap((routeType) => generateEvidenceImpact(routeType));

      // Extract evidence signals and generate recommendation
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

      // Build procedural_safety from coordinator (same source as Safety panel) for at-a-glance bar
      let procedural_safety: StrategyAnalysisResponse["procedural_safety"];
      try {
        const [caseResult, timelineResult, positionResult] = await Promise.all([
          supabase.from("criminal_cases").select("declared_dependencies, irreversible_decisions").eq("id", caseId).eq("org_id", orgIdForQueries).maybeSingle(),
          supabase.from("criminal_disclosure_timeline").select("item, action, action_date, note").eq("case_id", caseId).order("action_date", { ascending: false }),
          supabase.from("case_positions").select("position_text").eq("case_id", caseId).eq("org_id", orgIdForQueries).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        const criminalCase = caseResult?.data as { declared_dependencies?: unknown[]; irreversible_decisions?: unknown[] } | null | undefined;
        const declaredDependencies = Array.isArray(criminalCase?.declared_dependencies) ? criminalCase.declared_dependencies.filter(Boolean) : [];
        const irreversibleDecisions = Array.isArray(criminalCase?.irreversible_decisions) ? criminalCase.irreversible_decisions.filter(Boolean) : [];
        const timelineData = Array.isArray(timelineResult?.data) ? timelineResult.data : [];
        const disclosureTimeline = timelineData.map((e: { item?: string; action?: string; action_date?: string; note?: string }) => ({
          item: e?.item ?? "",
          action: e?.action ?? "",
          date: e?.action_date ?? "",
          note: e?.note,
        }));
        const positionData = positionResult?.data as { position_text?: string } | null | undefined;
        const recordedPosition = positionData?.position_text
          ? { position_type: "recorded" as const, position_text: positionData.position_text, primary: undefined }
          : undefined;
        const coordinatorResult = buildStrategyCoordinator({
          caseId,
          extracted: null,
          charges: (charges || []).map((c: any) => ({ offence: c?.offence, section: c?.section, count: c?.count })),
          disclosureTimeline,
          declaredDependencies: declaredDependencies.map((d: any) => {
            const raw = (d?.status as string) || "required";
            const status = raw === "helpful" || raw === "not_needed" ? raw : "required";
            return { id: d?.id ?? "", label: d?.label ?? "", status, note: d?.note };
          }),
          irreversibleDecisions: irreversibleDecisions.map((d: any) => {
            const raw = (d?.status as string) || "not_yet";
            const status = raw === "completed" || raw === "planned" ? raw : "not_yet";
            return { id: d?.id ?? "", label: d?.label ?? "", status, updated_at: d?.updated_at };
          }),
          recordedPosition,
          evidenceImpactMap,
        });
        procedural_safety = coordinatorResult?.plugin_constraints?.procedural_safety ?? undefined;
      } catch (coordErr) {
        console.warn("[strategy-analysis] Coordinator for procedural_safety failed (non-fatal):", coordErr);
        try {
          const fallback = computeProceduralSafety(evidenceImpactMap);
          procedural_safety = { status: fallback.status, explanation: fallback.explanation, outstandingItems: fallback.outstandingItems ?? [], reasons: fallback.reasons };
        } catch {
          procedural_safety = undefined;
        }
      }

      // Build time pressure state
      const { data: hearings } = await supabase
        .from("criminal_hearings")
        .select("hearing_date, hearing_type")
        .eq("case_id", caseId)
        .eq("org_id", orgIdForQueries)
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

      // PHASE 3 FIX: Scan residual attacks for each route (after recommendation is available)
      // Use allowStrategyGeneration instead of canGenerateAnalysis to ensure residual scanning runs
      const routesWithResidual = routes.map((route, idx) => {
        const routeType = routeTypes[idx];
        const routeConfidence = confidenceStates[routeType]?.current || "MEDIUM";
        
        const residual = scanResidualAttacks({
          evidenceSignals,
          routeType,
          existingAttackPaths: route.attackPaths,
          routeConfidence,
          canGenerateAnalysis: allowStrategyGeneration, // Use allowStrategyGeneration
        });

        return {
          ...route,
          residual,
        };
      });

      // Generate residual summary
      const exhaustedRoutes = routesWithResidual
        .filter(r => r.residual?.status === "EXHAUSTED")
        .map(r => r.type);
      
      const residualSummary = {
        exhaustedRoutes,
        notes: exhaustedRoutes.length > 0
          ? `${exhaustedRoutes.length} route(s) exhausted - no further viable attacks without new disclosure`
          : "All routes have residual attack angles available",
      };

      // PHASE 3 FIX: Generate artifacts for committed route (if any) - AFTER recommendation is generated
      // Use allowStrategyGeneration to ensure artifacts are generated when evidence allows
      const artifacts = commitment?.primary_strategy
        ? generateArtifacts(
            commitment.primary_strategy as "fight_charge" | "charge_reduction" | "outcome_management",
            allowStrategyGeneration, // Use allowStrategyGeneration instead of canGenerateAnalysis
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
        diagnostics.orgId = orgIdForQueries;
      }

      // PHASE 3 FIX: Ensure all attack plan outputs are included in response
      // Routes already include: attackPaths, cpsResponses, killSwitches, pivotPlan (from generateStrategyRoute)
      const response: StrategyAnalysisResponse = {
        routes: routesWithResidual, // Contains attackPaths, cpsResponses, killSwitches, pivotPlan, residual
        selectedRoute: commitment?.primary_strategy || undefined,
        artifacts,
        evidenceImpact,
        canGenerateAnalysis, // This is for confidence caps/warnings (not visibility)
        recommendation,
        evidenceImpactMap,
        timePressure,
        confidenceStates,
        decisionCheckpoints,
        residualSummary,
        procedural_safety,
        resolvedOffence: { offenceType: resolvedOffence.offenceType, label: resolvedOffence.label, source: resolvedOffence.source },
      };

      return NextResponse.json({
        ok: true,
        data: response,
        diagnostics: diagnostics || {
          caseId,
          orgId: orgIdForQueries,
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

