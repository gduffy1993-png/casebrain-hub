import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type CourtScript = {
  openingSubmissions: Array<{
    type: "PACE_APPLICATION" | "DISCLOSURE_APPLICATION" | "STAY_APPLICATION" | "NO_CASE_TO_ANSWER" | "GENERIC";
    title: string;
    script: string;
    caseLaw: string[];
  }>;
  crossExaminationQuestions: Array<{
    witness: string;
    questions: string[];
  }>;
  closingSubmissions: Array<{
    type: "NO_CASE_TO_ANSWER" | "NOT_GUILTY" | "GENERIC";
    title: string;
    script: string;
  }>;
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

    // Get aggressive defense analysis
    const { data: aggressiveDefense } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "aggressive_defense")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const defenseAnalysis = aggressiveDefense?.analysis_json as any;

    if (!defenseAnalysis?.recommendedStrategy) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aggressive defense analysis not available. Please run analysis first.",
        },
        { status: 404 }
      );
    }

    const primaryAngle = defenseAnalysis.recommendedStrategy.primaryAngle;
    const openingSubmissions: CourtScript["openingSubmissions"] = [];
    const crossExaminationQuestions: CourtScript["crossExaminationQuestions"] = [];
    const closingSubmissions: CourtScript["closingSubmissions"] = [];

    // Generate opening submissions based on primary angle
    if (primaryAngle.angleType === "PACE_BREACH_EXCLUSION") {
      openingSubmissions.push({
        type: "PACE_APPLICATION",
        title: "s.78 PACE Application - Exclude Evidence",
        script: `Your Honour, I make an application under section 78 of the Police and Criminal Evidence Act 1984 to exclude the evidence of ${primaryAngle.title.toLowerCase()} on the grounds that it was obtained in breach of PACE Code C.

The facts are: ${primaryAngle.legalBasis || "Evidence obtained in breach of PACE"}

The breach is: ${primaryAngle.prosecutionWeakness || "PACE Code C breach"}

The prejudice to the defense is: ${primaryAngle.whyThisMatters || "Evidence obtained unfairly"}

The authority is: ${primaryAngle.caseLaw?.[0] || "R v Keenan [1990]"}

I submit that the evidence should be excluded as its admission would have such an adverse effect on the fairness of the proceedings that it ought not to be admitted.`,
        caseLaw: primaryAngle.caseLaw || ["R v Keenan [1990]"],
      });
    } else if (primaryAngle.angleType === "DISCLOSURE_FAILURE_STAY") {
      openingSubmissions.push({
        type: "STAY_APPLICATION",
        title: "Stay Application - Disclosure Failures",
        script: `Your Honour, I make an application to stay these proceedings as an abuse of process on the grounds of serious disclosure failures.

The disclosure failures are: ${primaryAngle.prosecutionWeakness || "Material evidence not disclosed"}

The prejudice to the defense is: ${primaryAngle.whyThisMatters || "Fair trial impossible"}

The authority is: ${primaryAngle.caseLaw?.[0] || "R v H [2004]"}

I submit that these disclosure failures are so serious that a fair trial is impossible and the proceedings should be stayed.`,
        caseLaw: primaryAngle.caseLaw || ["R v H [2004]"],
      });
    } else if (primaryAngle.angleType === "NO_CASE_TO_ANSWER") {
      openingSubmissions.push({
        type: "NO_CASE_TO_ANSWER",
        title: "No Case to Answer Submission",
        script: `Your Honour, I submit there is no case to answer on the following grounds:

${primaryAngle.legalBasis || "Prosecution evidence is insufficient"}

${primaryAngle.whyThisMatters || "No reasonable jury could convict"}

The authority is: ${primaryAngle.caseLaw?.[0] || "R v Galbraith [1981]"}

I submit that the prosecution has failed to establish a prima facie case and the case should be dismissed.`,
        caseLaw: primaryAngle.caseLaw || ["R v Galbraith [1981]"],
      });
    }

    // Add generic opening if needed
    if (openingSubmissions.length === 0 && primaryAngle.submissions?.[0]) {
      openingSubmissions.push({
        type: "GENERIC",
        title: "Opening Submission",
        script: primaryAngle.submissions[0],
        caseLaw: primaryAngle.caseLaw || [],
      });
    }

    // Generate cross-examination questions
    if (primaryAngle.crossExaminationPoints?.length > 0) {
      // Try to identify witness from case context
      const witnessName = "Prosecution Witness"; // Could be enhanced to extract actual witness names
      
      crossExaminationQuestions.push({
        witness: witnessName,
        questions: primaryAngle.crossExaminationPoints.slice(0, 15).map((q: string, idx: number) => 
          `${idx + 1}. ${q}`
        ),
      });
    }

    // Generate closing submissions
    if (primaryAngle.angleType === "NO_CASE_TO_ANSWER") {
      closingSubmissions.push({
        type: "NO_CASE_TO_ANSWER",
        title: "No Case to Answer - Closing Submission",
        script: `Your Honour, at the close of the prosecution case, I submit there is no case to answer.

${primaryAngle.legalBasis || "The prosecution evidence is insufficient"}

${primaryAngle.whyThisMatters || "No reasonable jury could convict on this evidence"}

The authority is: ${primaryAngle.caseLaw?.[0] || "R v Galbraith [1981]"}

I submit the case should be dismissed.`,
      });
    } else {
      closingSubmissions.push({
        type: "NOT_GUILTY",
        title: "Not Guilty - Closing Submission",
        script: `Your Honour, I submit the prosecution has failed to prove its case beyond reasonable doubt.

${primaryAngle.whyThisMatters || "The prosecution case is fundamentally flawed"}

${primaryAngle.prosecutionWeakness || "Multiple weaknesses in prosecution evidence"}

I submit the defendant is not guilty and should be acquitted.`,
      });
    }

    const scripts: CourtScript = {
      openingSubmissions,
      crossExaminationQuestions,
      closingSubmissions,
    };

    return NextResponse.json({ ok: true, data: scripts });
  } catch (error: any) {
    console.error("[court-scripts] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate court scripts",
      },
      { status: 500 }
    );
  }
}
