import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type ChainReaction = {
  triggerPoint: string;
  chain: Array<{
    step: number;
    action: string;
    result: string;
  }>;
  finalOutcome: string;
  exploitationPlan: string[];
  readyToUseSequence: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { userId } = await requireAuthContext();
    const { caseId } = await params;

    const context = await buildCaseContext(caseId, { userId });

    if (!context.case) {
      return NextResponse.json(
        { ok: false, data: null, banner: context.banner, diagnostics: context.diagnostics },
        { status: 404 }
      );
    }

    try {
      guardAnalysis(context);
    } catch (error: any) {
      if (error.name === "AnalysisGateError") {
        return NextResponse.json({
          ok: false,
          data: null,
          banner: error.banner,
          diagnostics: error.diagnostics,
        });
      }
      throw error;
    }

    const practiceArea = normalizePracticeArea(context.case.practice_area as string | null);
    const supabase = getSupabaseAdminClient();

    // Get strategy analysis
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    let triggerPoint = "Review case for trigger point";
    let chain: ChainReaction["chain"] = [];
    let finalOutcome = "Case outcome pending";

    if (practiceArea === "criminal") {
      const angles = strategyData?.criticalAngles || [];
      
      // Find PACE breach as trigger
      const paceBreach = angles.find((a: any) => a.angleType === "PACE_BREACH_EXCLUSION");
      if (paceBreach) {
        triggerPoint = paceBreach.title || "PACE Code C Breach (Interview without solicitor)";
        
        chain = [
          {
            step: 1,
            action: "Interview excluded (s.78 PACE)",
            result: "No admissions/evidence from interview",
          },
          {
            step: 2,
            action: "No interview evidence",
            result: "Identification evidence weakened (no interview confirmation)",
          },
          {
            step: 3,
            action: "Prosecution case relies on weak identification alone",
            result: "Identification challenged (Code D breach)",
          },
          {
            step: 4,
            action: "Identification excluded/undermined",
            result: "No evidence left",
          },
          {
            step: 5,
            action: "No evidence left",
            result: "NO CASE TO ANSWER → CASE DISMISSED",
          },
        ];

        finalOutcome = "Case dismissed - no evidence left";
      } else {
        // Disclosure failure as trigger
        const disclosureFailure = angles.find((a: any) => a.angleType === "DISCLOSURE_FAILURE_STAY");
        if (disclosureFailure) {
          triggerPoint = disclosureFailure.title || "Disclosure Failure";
          
          chain = [
            {
              step: 1,
              action: "Make stay application (disclosure failures)",
              result: "Stay granted OR disclosure ordered",
            },
            {
              step: 2,
              action: "If stay granted",
              result: "CASE DISMISSED",
            },
            {
              step: 3,
              action: "If disclosure ordered but not provided",
              result: "Stay application renewed → granted",
            },
            {
              step: 4,
              action: "Stay granted",
              result: "CASE DISMISSED",
            },
          ];

          finalOutcome = "Case stayed/dismissed";
        }
      }
    } else {
      // Civil chain reactions
      const weaknesses = strategyData?.weakSpots || [];
      
      if (weaknesses.length > 0) {
        triggerPoint = weaknesses[0] || "Procedural failure";
        
        chain = [
          {
            step: 1,
            action: "Highlight procedural failure",
            result: "Defense credibility undermined",
          },
          {
            step: 2,
            action: "Use failure to challenge other evidence",
            result: "Multiple elements weakened",
          },
          {
            step: 3,
            action: "Apply for strike-out/unless order",
            result: "Defense struck out OR major sanctions",
          },
          {
            step: 4,
            action: "If struck out",
            result: "JUDGMENT ENTERED",
          },
        ];

        finalOutcome = "Defense struck out / judgment entered";
      }
    }

    // If no chain found, create generic one
    if (chain.length === 0) {
      triggerPoint = "Identify primary weakness";
      chain = [
        {
          step: 1,
          action: "Attack primary weakness",
          result: "First element destroyed",
        },
        {
          step: 2,
          action: "Use destruction to weaken other elements",
          result: "Multiple elements weakened",
        },
        {
          step: 3,
          action: "Case collapses",
          result: "CASE DISMISSED / JUDGMENT ENTERED",
        },
      ];
      finalOutcome = "Case outcome favorable";
    }

    const exploitationPlan = [
      "1. Start with strongest attack (trigger point)",
      "2. Use exclusion/destruction to weaken other evidence",
      "3. Chain multiple weaknesses together",
      "4. Result: Case collapses entirely",
    ];

    const readyToUseSequence = `CHAIN REACTION STRATEGY:

TRIGGER POINT: ${triggerPoint}

CHAIN REACTION:
${chain.map((c) => `${c.step}. ${c.action}\n   ↓\n   ${c.result}`).join("\n\n")}

FINAL OUTCOME: ${finalOutcome}

EXPLOITATION:
${exploitationPlan.join("\n")}

READY-TO-USE SEQUENCE:
${chain.map((c, idx) => `${idx + 1}. ${c.action}`).join("\n")}`;

    const result: ChainReaction = {
      triggerPoint,
      chain,
      finalOutcome,
      exploitationPlan,
      readyToUseSequence,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[chain-reaction] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate chain reaction",
      },
      { status: 500 }
    );
  }
}
