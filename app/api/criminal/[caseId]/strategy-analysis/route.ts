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

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type StrategyRoute = {
  id: string;
  type: "fight_charge" | "charge_reduction" | "outcome_management";
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
};

type StrategyAnalysisResponse = {
  routes: StrategyRoute[];
  selectedRoute?: string; // If strategy is committed, this is the primary_strategy
};

/**
 * Generate deterministic multi-route strategy analysis
 * Returns 3 routes: fight_charge, charge_reduction, outcome_management
 */
function generateStrategyRoutes(): StrategyRoute[] {
  return [
    {
      id: "fight_charge",
      type: "fight_charge",
      title: "Fight Charge (Full Trial Strategy)",
      rationale: "Challenge the prosecution case at trial. Target acquittal or dismissal by attacking evidence, intent, and identification. This strategy requires strong disclosure position and evidence gaps to succeed.",
      winConditions: [
        "Prosecution fails to prove intent beyond reasonable doubt",
        "Identification evidence is successfully challenged or excluded under Turnbull guidelines",
        "Disclosure failures result in stay or material exclusion (only if failures persist after clear chase trail)",
        "PACE breaches result in exclusion of interview or custody evidence",
        "Evidence gaps prevent prosecution from establishing case to answer",
      ],
      risks: [
        "If disclosure gaps are filled, prosecution case may strengthen",
        "Identification evidence may be strong and withstand challenge",
        "Full trial preparation required (time and cost)",
        "Risk of conviction if prosecution case is strong",
      ],
      nextActions: [
        "Request full disclosure including CCTV, MG6 schedules, and unused material",
        "Review all evidence for identification reliability under Turnbull guidelines",
        "Assess PACE compliance and potential exclusion of interview/custody evidence",
        "Prepare disclosure requests for missing material (MG6C, CCTV continuity, VIPER pack)",
        "Draft abuse of process application if disclosure failures persist after chase",
      ],
    },
    {
      id: "charge_reduction",
      type: "charge_reduction",
      title: "Charge Reduction (s18 → s20)",
      rationale: "Accept harm occurred but challenge intent threshold. Target reduction from s18 (specific intent) to s20 (recklessness) or lesser offence. This strategy focuses on medical evidence, sequence/duration, and intent distinction.",
      winConditions: [
        "Prosecution cannot articulate s18 intent beyond reasonable doubt",
        "Medical evidence shows injuries consistent with single/brief blow (not sustained/targeted)",
        "CCTV/sequence evidence shows no prolonged or targeted conduct",
        "Weapon use lacks duration/targeting to prove specific intent",
        "Court accepts proportional downgrade to s20 under case management",
      ],
      risks: [
        "Medical evidence may support sustained/targeted conduct",
        "CCTV/sequence may show prolonged attack supporting intent",
        "Prosecution may maintain s18 charge if intent is strong",
        "Court may decline downgrade if evidence supports specific intent",
      ],
      nextActions: [
        "Request disclosure focusing on medical evidence and circumstances of incident",
        "Review medical reports to assess whether injuries support s18 (specific intent) or s20 (recklessness)",
        "Analyse CCTV/sequence evidence for duration and targeting (key to intent distinction)",
        "Gather evidence supporting recklessness rather than specific intent",
        "Prepare case for charge reduction negotiation (s18 → s20) before PTPH",
      ],
    },
    {
      id: "outcome_management",
      type: "outcome_management",
      title: "Outcome Management (Plea / Mitigation)",
      rationale: "Focus on sentencing position and mitigation. Target reduced sentence or non-custodial outcome. This strategy accepts conviction risk but minimizes sentence through early plea, mitigation, and character evidence.",
      winConditions: [
        "Mitigation evidence reduces sentence length",
        "Character references and personal circumstances support non-custodial outcome",
        "Early plea credit and cooperation reduce sentence",
        "Sentencing guidelines applied favourably",
      ],
      risks: [
        "Mitigation may fail to reduce sentence significantly",
        "Sentencing guidelines may require custodial sentence",
        "Character evidence may be insufficient or contradicted",
        "Court may impose maximum or near-maximum sentence",
      ],
      nextActions: [
        "Request disclosure to assess prosecution case strength and realistic prospects",
        "Consider early guilty plea if case is strong (maximum sentence reduction)",
        "Prepare comprehensive mitigation package including character references",
        "Gather personal circumstances evidence (employment, family, health, remorse)",
        "Review sentencing guidelines and identify factors supporting non-custodial outcome",
      ],
    },
  ];
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId } = authRes.context;

      // IMPORTANT: org_id must come from cases table, never from user/org context
      const supabase = getSupabaseAdminClient();
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      // Case not found - return 404
      if (caseError || !caseRow) {
        const fallbackContext = await buildCaseContext(caseId, { userId });
        return makeGateFail<StrategyAnalysisResponse>(
          {
            severity: "error",
            title: "Case not found",
            detail: "Case not found in database.",
          },
          fallbackContext,
          caseId,
        );
      }

      // Validate case has org_id
      if (!caseRow.org_id || caseRow.org_id.trim() === "") {
        const fallbackContext = await buildCaseContext(caseId, { userId });
        return NextResponse.json(
          {
            ok: false,
            data: null,
            banner: {
              severity: "error",
              title: "Case has no org_id",
              detail: "Case exists but has no org_id. This is a data integrity issue.",
            },
            diagnostics: diagnosticsFromContext(caseId, fallbackContext),
          },
          { status: 500 }
        );
      }

      // Build case context
      const context = await buildCaseContext(caseId, { userId });

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

      // Generate deterministic routes
      const routes = generateStrategyRoutes();

      // Build response
      const diagnostics = diagnosticsFromContext(caseId, context);
      if (diagnostics) {
        diagnostics.orgId = caseRow.org_id;
      }

      const response: StrategyAnalysisResponse = {
        routes,
        selectedRoute: commitment?.primary_strategy || undefined,
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

