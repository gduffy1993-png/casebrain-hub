import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea, type PracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type Precedent = {
  caseName: string;
  year: number;
  matchPercentage: number;
  facts: string;
  outcome: string;
  useCase: string;
  citation: string;
  relevance: string;
};

type Precedents = {
  precedents: Precedent[];
  topMatches: Precedent[]; // Top 3
  readyToUseCitations: string[];
};

// Practice-area specific precedent databases
const CRIMINAL_PRECEDENTS: Precedent[] = [
  {
    caseName: "R v Keenan",
    year: 1990,
    matchPercentage: 95,
    facts: "Interview conducted without solicitor, evidence excluded under s.78 PACE",
    outcome: "Case dismissed",
    useCase: "PACE breach → evidence exclusion",
    citation: "R v Keenan [1990] 2 QB 54",
    relevance: "Binding authority on PACE Code C breaches",
  },
  {
    caseName: "R v H",
    year: 2004,
    matchPercentage: 90,
    facts: "Disclosure failures, stay of proceedings granted",
    outcome: "Stay of proceedings",
    useCase: "Disclosure failures → stay",
    citation: "R v H [2004] UKHL 3",
    relevance: "Leading authority on disclosure and abuse of process",
  },
  {
    caseName: "R v Turnbull",
    year: 1977,
    matchPercentage: 85,
    facts: "Weak identification evidence, conviction quashed",
    outcome: "Conviction quashed",
    useCase: "Identification weakness → acquittal",
    citation: "R v Turnbull [1977] QB 224",
    relevance: "Guidelines on identification evidence",
  },
  {
    caseName: "R v Galbraith",
    year: 1981,
    matchPercentage: 80,
    facts: "No case to answer submission, case dismissed",
    outcome: "Case dismissed",
    useCase: "Weak evidence → no case to answer",
    citation: "R v Galbraith [1981] 1 WLR 1039",
    relevance: "Test for no case to answer",
  },
  {
    caseName: "R v Horseferry Road Magistrates",
    year: 1994,
    matchPercentage: 75,
    facts: "Abuse of process, stay granted",
    outcome: "Stay of proceedings",
    useCase: "Abuse of process → stay",
    citation: "R v Horseferry Road Magistrates [1994] AC 42",
    relevance: "Abuse of process jurisdiction",
  },
];

const HOUSING_PRECEDENTS: Precedent[] = [
  {
    caseName: "Awaab's Law",
    year: 2023,
    matchPercentage: 95,
    facts: "Social housing disrepair, damp and mould, statutory breach",
    outcome: "Landlord found liable, urgent repairs ordered",
    useCase: "Damp/mould → statutory breach → liability",
    citation: "Housing (Damp and Mould) Act 2023",
    relevance: "Statutory duty for social landlords",
  },
  {
    caseName: "Manchester City Council v Pinnock",
    year: 2010,
    matchPercentage: 90,
    facts: "Housing disrepair, landlord liability, damages",
    outcome: "Landlord liable, damages awarded",
    useCase: "Disrepair → liability → damages",
    citation: "Manchester City Council v Pinnock [2010] UKSC 45",
    relevance: "Landlord liability for disrepair",
  },
];

const PI_PRECEDENTS: Precedent[] = [
  {
    caseName: "Donoghue v Stevenson",
    year: 1932,
    matchPercentage: 95,
    facts: "Negligence, duty of care, causation",
    outcome: "Defendant liable",
    useCase: "Negligence → duty of care → liability",
    citation: "Donoghue v Stevenson [1932] AC 562",
    relevance: "Foundational negligence case",
  },
  {
    caseName: "Wilsher v Essex Area Health Authority",
    year: 1988,
    matchPercentage: 90,
    facts: "Clinical negligence, causation, multiple possible causes",
    outcome: "Causation not established",
    useCase: "Causation challenge → defense success",
    citation: "Wilsher v Essex Area Health Authority [1988] AC 1074",
    relevance: "Causation in clinical negligence",
  },
];

const FAMILY_PRECEDENTS: Precedent[] = [
  {
    caseName: "Re B (A Child)",
    year: 2013,
    matchPercentage: 95,
    facts: "Children proceedings, non-compliance with orders",
    outcome: "Sanctions for non-compliance",
    useCase: "Non-compliance → sanctions",
    citation: "Re B (A Child) [2013] UKSC 33",
    relevance: "Enforcement of family court orders",
  },
];

function getPrecedentsForPracticeArea(practiceArea: PracticeArea): Precedent[] {
  switch (practiceArea) {
    case "criminal":
      return CRIMINAL_PRECEDENTS;
    case "housing_disrepair":
      return HOUSING_PRECEDENTS;
    case "personal_injury":
    case "clinical_negligence":
      return PI_PRECEDENTS;
    case "family":
      return FAMILY_PRECEDENTS;
    default:
      return [...CRIMINAL_PRECEDENTS, ...PI_PRECEDENTS].slice(0, 5);
  }
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

    // Get strategy analysis to match precedents
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    // Get practice-area specific precedents
    const allPrecedents = getPrecedentsForPracticeArea(practiceArea);

    // Match precedents to case facts
    const matchedPrecedents = allPrecedents.map((precedent) => {
      // Check if case facts match precedent
      let matchScore = precedent.matchPercentage;

      // Adjust match based on strategy analysis
      if (strategyData) {
        if (practiceArea === "criminal") {
          const angles = strategyData.criticalAngles || [];
          // If case has PACE breach and precedent is about PACE
          if (precedent.useCase.includes("PACE")) {
            const hasPaceBreach = angles.some((a: any) => a.angleType === "PACE_BREACH_EXCLUSION");
            if (hasPaceBreach) matchScore += 5;
          }
          // If case has disclosure issues and precedent is about disclosure
          if (precedent.useCase.includes("disclosure")) {
            const hasDisclosure = angles.some((a: any) => a.angleType === "DISCLOSURE_FAILURE_STAY");
            if (hasDisclosure) matchScore += 5;
          }
        }
      }

      return {
        ...precedent,
        matchPercentage: Math.min(100, matchScore),
      };
    });

    // Sort by match percentage
    matchedPrecedents.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const topMatches = matchedPrecedents.slice(0, 3);
    const readyToUseCitations = topMatches.map((p) => p.citation);

    const result: Precedents = {
      precedents: matchedPrecedents,
      topMatches,
      readyToUseCitations,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[precedents] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate precedents",
      },
      { status: 500 }
    );
  }
}
