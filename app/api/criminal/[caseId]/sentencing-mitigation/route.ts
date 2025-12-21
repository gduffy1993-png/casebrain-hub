import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type SentencingMitigation = {
  personalMitigation: string[];
  legalMitigation: string[];
  reductionFactors: string[];
  readyToUseSubmission: string;
  authorities: string[];
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

    // Get case details
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("title, criminal_meta")
      .eq("id", caseId)
      .maybeSingle();

    const criminalMeta = (caseRecord?.criminal_meta as any) || null;

    const personalMitigation: string[] = [];
    const legalMitigation: string[] = [];
    const reductionFactors: string[] = [];

    // Personal mitigation (generic - would be enhanced with client info)
    personalMitigation.push("Defendant has shown remorse");
    personalMitigation.push("Defendant has taken steps to address underlying issues");
    personalMitigation.push("Defendant has strong family support");
    personalMitigation.push("Defendant has no previous similar convictions");

    // Legal mitigation
    legalMitigation.push("Early guilty plea (if applicable) - up to 1/3 reduction");
    legalMitigation.push("Cooperation with authorities");
    legalMitigation.push("Time spent on remand (if applicable)");
    legalMitigation.push("Mitigating circumstances surrounding the offense");

    // Reduction factors
    reductionFactors.push("Good character (if applicable)");
    reductionFactors.push("Age and maturity of defendant");
    reductionFactors.push("Impact of sentence on dependents");
    reductionFactors.push("Prospects of rehabilitation");

    // Get charges for sentencing guidelines
    const charges = criminalMeta?.charges || [];
    const primaryCharge = charges[0]?.charge || "Offense";

    const authorities = [
      "Sentencing Act 2020",
      "Sentencing Guidelines Council Guidelines",
    ];

    // Generate ready-to-use submission
    const readyToUseSubmission = `MITIGATION SUBMISSION

PERSONAL MITIGATION:
${personalMitigation.map((m, i) => `${i + 1}. ${m}`).join("\n")}

LEGAL MITIGATION:
${legalMitigation.map((m, i) => `${i + 1}. ${m}`).join("\n")}

REDUCTION FACTORS:
${reductionFactors.map((f, i) => `${i + 1}. ${f}`).join("\n")}

AUTHORITIES:
${authorities.join("\n")}

I submit that in light of the personal and legal mitigation set out above, and the reduction factors identified, a sentence at the lower end of the range (or a community order/suspended sentence) would be appropriate.`;

    const result: SentencingMitigation = {
      personalMitigation,
      legalMitigation,
      reductionFactors,
      readyToUseSubmission,
      authorities,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[sentencing-mitigation] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate sentencing mitigation",
      },
      { status: 500 }
    );
  }
}
