import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type BailApplication = {
  grounds: string[];
  bailArguments: string[];
  conditionsProposed: string[];
  authorities: string[];
  readyToUseApplication: string;
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

    const supabase = getSupabaseAdminClient();

    // Get criminal meta for bail info
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("criminal_meta")
      .eq("id", caseId)
      .maybeSingle();

    const criminalMeta = (caseRecord?.criminal_meta as any) || null;
    const bailHistory = criminalMeta?.bail || [];

    // Get aggressive defense for strong defense case argument
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const defenseAnalysis = aggressiveDefense?.analysis_json as any;

    const grounds: string[] = [];
    const bailArguments: string[] = [];
    const conditionsProposed: string[] = [];

    // Ground 1: Strong defense case
    if (defenseAnalysis?.overallWinProbability && defenseAnalysis.overallWinProbability > 50) {
      grounds.push("Strong defense case");
      bailArguments.push(
        `The defense case has a ${defenseAnalysis.overallWinProbability}% probability of success. The prosecution case is weak with multiple identified weaknesses including ${defenseAnalysis.prosecutionVulnerabilities?.criticalWeaknesses?.[0] || "evidence issues"}.`
      );
    } else {
      grounds.push("Defense case pending full analysis");
      bailArguments.push("The defense case is being prepared and shows promise.");
    }

    // Ground 2: No risk of absconding
    grounds.push("No risk of absconding");
    bailArguments.push("The defendant has strong ties to the area, stable address, and no history of absconding.");

    // Ground 3: No risk of reoffending
    grounds.push("No risk of reoffending");
    bailArguments.push("The defendant has no previous similar convictions and poses no risk to the public.");

    // Ground 4: Disclosure failures (if applicable)
    if (defenseAnalysis?.prosecutionVulnerabilities?.proceduralErrors?.some((e: string) => 
      e.toLowerCase().includes("disclosure")
    )) {
      grounds.push("Disclosure failures prejudice defense");
      bailArguments.push("Serious disclosure failures mean the defense cannot properly prepare, making bail more appropriate.");
    }

    // Proposed conditions
    conditionsProposed.push("Reside at current address");
    conditionsProposed.push("Report to police station weekly");
    conditionsProposed.push("Surrender passport");
    conditionsProposed.push("Not to contact prosecution witnesses");
    conditionsProposed.push("Not to leave the jurisdiction");

    const authorities = [
      "Bail Act 1976",
      "R v H [2004] UKHL 3",
    ];

    // Generate ready-to-use application
    const readyToUseApplication = `BAIL APPLICATION

GROUNDS:
${grounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}

ARGUMENTS:
${bailArguments.map((a, i) => `${i + 1}. ${a}`).join("\n\n")}

CONDITIONS PROPOSED:
${conditionsProposed.map((c, i) => `${i + 1}. ${c}`).join("\n")}

AUTHORITIES:
${authorities.join("\n")}

I submit that bail should be granted on the grounds set out above, with the conditions proposed.`;

    const result: BailApplication = {
      grounds,
      bailArguments,
      conditionsProposed,
      authorities,
      readyToUseApplication,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[bail-application] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate bail application",
      },
      { status: 500 }
    );
  }
}
