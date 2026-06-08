import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea, type PracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type Technicality = {
  technicality: string;
  status: "NOT_APPLICABLE" | "EXPLOITABLE" | "CHECK_REQUIRED";
  description: string;
  howToExploit: string | null;
  authority: string | null;
};

type Technicalities = {
  technicalities: Technicality[];
  exploitable: Technicality[];
  readyToUseArguments: string[];
};

function getTechnicalitiesForPracticeArea(practiceArea: PracticeArea): Technicality[] {
  const base: Technicality[] = [];

  if (practiceArea === "criminal") {
    base.push(
      {
        technicality: "Statute of Limitations",
        status: "CHECK_REQUIRED",
        description: "Check if charge is time-barred",
        howToExploit: "If time-barred, charge is invalid",
        authority: "Relevant statute of limitations",
      },
      {
        technicality: "Double Jeopardy",
        status: "CHECK_REQUIRED",
        description: "Check if client has been tried for this before",
        howToExploit: "If double jeopardy applies, case must be dismissed",
        authority: "Double Jeopardy principle",
      },
      {
        technicality: "Jurisdiction",
        status: "CHECK_REQUIRED",
        description: "Check if court has jurisdiction",
        howToExploit: "If wrong jurisdiction, case must be transferred/dismissed",
        authority: "Criminal Procedure Rules",
      },
      {
        technicality: "Charge Duplication",
        status: "CHECK_REQUIRED",
        description: "Check if same facts charged multiple times",
        howToExploit: "If duplication, charges should be merged/dismissed",
        authority: "R v Kidd [1998] 1 WLR 604",
      },
      {
        technicality: "PACE Code Breaches",
        status: "EXPLOITABLE",
        description: "PACE Code C/D breaches",
        howToExploit: "Exclude evidence under s.78 PACE",
        authority: "R v Keenan [1990] 2 QB 54",
      },
      {
        technicality: "Disclosure Failures",
        status: "EXPLOITABLE",
        description: "CPIA 1996 disclosure failures",
        howToExploit: "Stay proceedings or exclude evidence",
        authority: "R v H [2004] UKHL 3",
      },
      {
        technicality: "Evidence Admissibility",
        status: "EXPLOITABLE",
        description: "Evidence obtained unfairly",
        howToExploit: "Exclude under s.78 PACE or common law",
        authority: "R v Sang [1980] AC 402",
      },
      {
        technicality: "Procedural Errors",
        status: "EXPLOITABLE",
        description: "Procedural errors in investigation/prosecution",
        howToExploit: "Use errors to stay proceedings or exclude evidence",
        authority: "R v Horseferry Road Magistrates [1994] AC 42",
      }
    );
  } else {
    // Civil technicalities
    base.push(
      {
        technicality: "Limitation Period",
        status: "EXPLOITABLE",
        description: "Check if claim is time-barred",
        howToExploit: "If time-barred, claim must be dismissed",
        authority: "Limitation Act 1980",
      },
      {
        technicality: "Pre-Action Protocol",
        status: "EXPLOITABLE",
        description: "Check if pre-action protocol followed",
        howToExploit: "If not followed, apply for sanctions/strike-out",
        authority: "CPR Pre-Action Protocols",
      },
      {
        technicality: "Service of Documents",
        status: "EXPLOITABLE",
        description: "Check if documents properly served",
        howToExploit: "If not properly served, set aside",
        authority: "CPR 6",
      },
      {
        technicality: "Jurisdiction",
        status: "CHECK_REQUIRED",
        description: "Check if court has jurisdiction",
        howToExploit: "If wrong jurisdiction, transfer/dismiss",
        authority: "CPR 11",
      }
    );
  }

  return base;
}

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

    // Get strategy analysis to check which technicalities are exploitable
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    // Get practice-area specific technicalities
    const allTechnicalities = getTechnicalitiesForPracticeArea(practiceArea);

    // Update status based on case facts
    const technicalities: Technicality[] = allTechnicalities.map((tech) => {
      if (tech.status === "EXPLOITABLE") {
        // Check if this technicality exists in the case
        if (practiceArea === "criminal") {
          if (tech.technicality === "PACE Code Breaches") {
            const hasPaceBreach = strategyData?.criticalAngles?.some((a: any) =>
              a.angleType === "PACE_BREACH_EXCLUSION"
            );
            return { ...tech, status: (hasPaceBreach ? "EXPLOITABLE" : "CHECK_REQUIRED") as Technicality["status"] };
          }
          if (tech.technicality === "Disclosure Failures") {
            const hasDisclosure = strategyData?.criticalAngles?.some((a: any) =>
              a.angleType === "DISCLOSURE_FAILURE_STAY"
            );
            return { ...tech, status: (hasDisclosure ? "EXPLOITABLE" : "CHECK_REQUIRED") as Technicality["status"] };
          }
        }
      }
      return tech;
    });

    const exploitable = technicalities.filter((t) => t.status === "EXPLOITABLE");
    const readyToUseArguments = exploitable.map((t) =>
      t.howToExploit ? `${t.technicality}: ${t.howToExploit} (${t.authority})` : t.technicality
    );

    const result: Technicalities = {
      technicalities,
      exploitable,
      readyToUseArguments,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[technicalities] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate technicalities",
      },
      { status: 500 }
    );
  }
}
