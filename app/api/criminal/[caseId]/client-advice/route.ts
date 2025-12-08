import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * GET /api/criminal/[caseId]/client-advice
 * Generate client advice based on case analysis
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    // Fetch case data to generate advice
    const { data: criminalCase } = await supabase
      .from("criminal_cases")
      .select("get_off_probability, risk_level, recommended_strategy")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    const { data: loopholes } = await supabase
      .from("criminal_loopholes")
      .select("severity")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .eq("severity", "CRITICAL")
      .limit(1);

    const probability = criminalCase?.get_off_probability ?? 50;
    const hasCriticalLoopholes = (loopholes?.length ?? 0) > 0;

    // Generate advice based on probability and loopholes
    const doActions: string[] = [];
    const dontActions: string[] = [];
    const risks: string[] = [];

    if (probability >= 70) {
      doActions.push("Maintain not guilty plea");
      doActions.push("Challenge weak prosecution evidence");
      doActions.push("Request full disclosure");
      if (hasCriticalLoopholes) {
        doActions.push("Exploit identified loopholes");
      }
      dontActions.push("Admit to anything");
      dontActions.push("Speak to police without solicitor");
    } else if (probability >= 40) {
      doActions.push("Consider defense strategy carefully");
      doActions.push("Request disclosure on weak charges");
      dontActions.push("Admit to strong charges without advice");
      risks.push("Mixed evidence - some charges stronger than others");
    } else {
      doActions.push("Consider early guilty plea for sentence reduction");
      doActions.push("Focus on mitigation");
      risks.push("Prosecution evidence is strong");
      risks.push("Early plea may result in 1/3 sentence reduction");
    }

    const overallAdvice =
      probability >= 70
        ? "Prosecution case has significant weaknesses. Maintain not guilty plea and challenge evidence."
        : probability >= 40
          ? "Mixed evidence. Consider strategic approach - challenge weak charges, consider plea on strong charges."
          : "Prosecution evidence is strong. Consider early guilty plea for sentence reduction, or focus on mitigation.";

    return NextResponse.json({
      doActions,
      dontActions,
      risks,
      overallAdvice,
    });
  } catch (error) {
    console.error("[criminal/client-advice] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate client advice" },
      { status: 500 },
    );
  }
}

