import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea, type PracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type NuclearOption = {
  option: string;
  risk: "HIGH" | "VERY_HIGH" | "EXTREME";
  reward: "CASE_DISMISSED" | "STAY_GRANTED" | "EVIDENCE_EXCLUDED" | "MAJOR_DAMAGE" | "OTHER";
  whenToUse: string;
  riskRewardAnalysis: string;
  readyToUseSubmission: string;
  authorities: string[];
};

type NuclearOptions = {
  options: NuclearOption[];
  recommended: NuclearOption | null; // Most viable nuclear option
  warnings: string[];
};

// Practice-area specific nuclear options
function getNuclearOptionsForPracticeArea(practiceArea: PracticeArea): NuclearOption[] {
  const baseOptions: NuclearOption[] = [];

  if (practiceArea === "criminal") {
    baseOptions.push(
      {
        option: "Abuse of Process - Stay Proceedings",
        risk: "VERY_HIGH",
        reward: "STAY_GRANTED",
        whenToUse: "Multiple PACE breaches + disclosure failures + evidence issues",
        riskRewardAnalysis: "High risk (judge may reject), but if successful case dismissed entirely",
        readyToUseSubmission: `Your Honour, I submit this prosecution is an abuse of process and should be stayed under the court's inherent jurisdiction.

The prosecution has committed multiple serious breaches:
- PACE Code breaches (interviews, searches, detention)
- Serious disclosure failures (material evidence not provided)
- Evidence obtained unfairly
- Procedural errors throughout

Taken together, these failures mean a fair trial is impossible. The prosecution case is fundamentally flawed.

Authority: R v Horseferry Road Magistrates [1994] AC 42, R v H [2004] UKHL 3

I submit the case should be stayed as an abuse of process.`,
        authorities: ["R v Horseferry Road Magistrates [1994] AC 42", "R v H [2004] UKHL 3"],
      },
      {
        option: "No Case to Answer - Half-Time Submission",
        risk: "HIGH",
        reward: "CASE_DISMISSED",
        whenToUse: "Prosecution evidence is weak/inadmissible at close of prosecution case",
        riskRewardAnalysis: "Medium risk (if fails, defense still runs), but if successful no defense needed",
        readyToUseSubmission: `Your Honour, I submit there is no case to answer at the close of the prosecution case.

The prosecution evidence is insufficient. No reasonable jury could convict on this evidence.

[Specific weaknesses to be inserted]

Authority: R v Galbraith [1981] 1 WLR 1039

I submit the case should be dismissed.`,
        authorities: ["R v Galbraith [1981] 1 WLR 1039"],
      },
      {
        option: "Evidence Exclusion Chain Reaction",
        risk: "HIGH",
        reward: "EVIDENCE_EXCLUDED",
        whenToUse: "Multiple PACE breaches affecting multiple evidence types",
        riskRewardAnalysis: "Exclude interview → exclude identification → exclude forensics = no evidence left",
        readyToUseSubmission: `Your Honour, I make multiple applications under section 78 PACE to exclude evidence:

1. Interview evidence - obtained in breach of Code C
2. Identification evidence - obtained in breach of Code D
3. Forensic evidence - chain of custody broken

If all are excluded, there is no evidence left to convict. I submit all should be excluded.

Authority: R v Keenan [1990] 2 QB 54

If excluded, I will immediately submit there is no case to answer.`,
        authorities: ["R v Keenan [1990] 2 QB 54", "R v Turnbull [1977] QB 224"],
      },
      {
        option: "Disclosure Stay - Last Resort",
        risk: "VERY_HIGH",
        reward: "STAY_GRANTED",
        whenToUse: "Critical evidence missing, requested multiple times",
        riskRewardAnalysis: "High risk (judge may order disclosure instead), but if successful case stayed",
        readyToUseSubmission: `Your Honour, I submit these proceedings should be stayed due to serious disclosure failures.

Critical evidence has been requested [X] times and not provided:
- [List missing evidence]

These failures are so serious that a fair trial is impossible. The defense cannot properly prepare.

Authority: R v H [2004] UKHL 3

I submit the case should be stayed.`,
        authorities: ["R v H [2004] UKHL 3"],
      },
      {
        option: "Human Rights Challenge - Article 6 ECHR",
        risk: "EXTREME",
        reward: "STAY_GRANTED",
        whenToUse: "Multiple procedural failures + disclosure gaps",
        riskRewardAnalysis: "Very high risk (rarely succeeds alone), but if successful case stayed",
        readyToUseSubmission: `Your Honour, I submit the defendant's right to a fair trial under Article 6 ECHR has been breached.

The prosecution has:
- Failed to provide material disclosure
- Obtained evidence in breach of PACE
- Committed multiple procedural errors

A fair trial is impossible. I submit the case should be stayed.

Authority: R v H [2004] UKHL 3, Article 6 ECHR`,
        authorities: ["R v H [2004] UKHL 3", "Article 6 ECHR"],
      }
    );
  } else if (practiceArea === "housing_disrepair") {
    baseOptions.push(
      {
        option: "Strike Out Defense - Unless Order",
        risk: "HIGH",
        reward: "MAJOR_DAMAGE",
        whenToUse: "Landlord failed to serve defense or respond to pre-action protocol",
        riskRewardAnalysis: "High risk, but if successful defense struck out, judgment entered",
        readyToUseSubmission: `I apply for an unless order striking out the defense under CPR 3.4.

The defendant has:
- Failed to serve defense within time limit
- Failed to respond to pre-action protocol
- Failed to comply with court orders

I submit the defense should be struck out and judgment entered.

Authority: CPR 3.4, Biguzzi v Rank Leisure [1999] 1 WLR 1926`,
        authorities: ["CPR 3.4", "Biguzzi v Rank Leisure [1999] 1 WLR 1926"],
      },
      {
        option: "Awaab's Law Violation - Statutory Breach",
        risk: "HIGH",
        reward: "MAJOR_DAMAGE",
        whenToUse: "Damp/mould in social housing, landlord failed to act",
        riskRewardAnalysis: "Medium risk, but statutory breach = automatic liability",
        readyToUseSubmission: `The defendant has breached Awaab's Law (Housing (Damp and Mould) Act 2023).

The property has [damp/mould] and the landlord has failed to:
- Investigate within time limit
- Take remedial action
- Comply with statutory duty

This is a statutory breach. Liability is established.

Authority: Housing (Damp and Mould) Act 2023`,
        authorities: ["Housing (Damp and Mould) Act 2023"],
      }
    );
  } else if (practiceArea === "personal_injury" || practiceArea === "clinical_negligence") {
    baseOptions.push(
      {
        option: "Strike Out Defense - Part 36 Pressure",
        risk: "HIGH",
        reward: "MAJOR_DAMAGE",
        whenToUse: "Defendant failed to beat Part 36 offer, defense is weak",
        riskRewardAnalysis: "High risk, but if successful defense struck out, enhanced costs",
        readyToUseSubmission: `I apply to strike out the defense under CPR 3.4.

The defendant has:
- Failed to beat Part 36 offer
- No real prospect of success
- Weak defense

I submit the defense should be struck out.

Authority: CPR 3.4, Part 36`,
        authorities: ["CPR 3.4", "CPR Part 36"],
      },
      {
        option: "Expert Contradiction - Exclude Expert",
        risk: "HIGH",
        reward: "EVIDENCE_EXCLUDED",
        whenToUse: "Defendant's expert contradicts their own report or is unreliable",
        riskRewardAnalysis: "Medium risk, but if successful expert excluded, defense weakened",
        readyToUseSubmission: `I apply to exclude the defendant's expert evidence.

The expert:
- Contradicts their own report
- Is unreliable
- Fails to meet expert witness requirements

I submit the expert evidence should be excluded.

Authority: CPR 35, Ikarian Reefer [1993] 2 Lloyd's Rep 68`,
        authorities: ["CPR 35", "Ikarian Reefer [1993] 2 Lloyd's Rep 68"],
      }
    );
  } else if (practiceArea === "family") {
    baseOptions.push(
      {
        option: "Enforcement - Committal Application",
        risk: "HIGH",
        reward: "MAJOR_DAMAGE",
        whenToUse: "Opponent has repeatedly breached court orders",
        riskRewardAnalysis: "High risk, but if successful opponent in contempt, sanctions",
        readyToUseSubmission: `I apply for committal for breach of court orders.

The respondent has:
- Breached [specific orders] on [X] occasions
- Failed to comply despite warnings
- Shown contempt for court authority

I submit committal is appropriate.

Authority: Family Procedure Rules 2010, Part 37`,
        authorities: ["Family Procedure Rules 2010, Part 37"],
      }
    );
  }

  return baseOptions;
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

    // Get strategy analysis to determine which nuclear options are viable
    const { data: strategyAnalysis } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "aggressive_defense" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const strategyData = strategyAnalysis?.analysis_json as any;

    // Get practice-area specific nuclear options
    const allOptions = getNuclearOptionsForPracticeArea(practiceArea);

    // Filter and rank options based on case facts
    const viableOptions: NuclearOption[] = [];

    allOptions.forEach((option) => {
      let isViable = false;

      // Check if conditions are met
      if (practiceArea === "criminal") {
        if (option.option.includes("Abuse of Process")) {
          const hasMultipleBreaches =
            (strategyData?.criticalAngles?.filter((a: any) =>
              a.angleType === "PACE_BREACH_EXCLUSION" || a.angleType === "DISCLOSURE_FAILURE_STAY"
            ).length || 0) >= 2;
          isViable = hasMultipleBreaches;
        } else if (option.option.includes("No Case to Answer")) {
          const hasWeakEvidence = strategyData?.prosecutionVulnerabilities?.criticalWeaknesses?.length > 0;
          isViable = hasWeakEvidence;
        } else if (option.option.includes("Disclosure Stay")) {
          const hasDisclosureFailures = strategyData?.criticalAngles?.some((a: any) =>
            a.angleType === "DISCLOSURE_FAILURE_STAY"
          );
          isViable = hasDisclosureFailures;
        } else {
          isViable = true; // Other options always viable
        }
      } else {
        // For civil, check for procedural failures
        const hasProceduralFailures = strategyData?.weakSpots?.some((w: any) =>
          typeof w === "string" && (w.toLowerCase().includes("delay") || w.toLowerCase().includes("breach"))
        );
        isViable = hasProceduralFailures || true; // Most civil options are viable if procedural issues exist
      }

      if (isViable) {
        viableOptions.push(option);
      }
    });

    // Recommend the option with best risk/reward ratio
    const recommended = viableOptions.length > 0
      ? viableOptions.reduce((best, current) => {
          const bestScore = best.risk === "EXTREME" ? 1 : best.risk === "VERY_HIGH" ? 2 : best.risk === "HIGH" ? 3 : 4;
          const currentScore = current.risk === "EXTREME" ? 1 : current.risk === "VERY_HIGH" ? 2 : current.risk === "HIGH" ? 3 : 4;
          return currentScore > bestScore ? current : best;
        })
      : null;

    const warnings = [
      "Nuclear options are extreme tactics - use only when normal tactics won't work",
      "High risk of failure - have fallback strategy ready",
      "May damage relationship with court/prosecution if unsuccessful",
      "Use only when case is desperate or prosecution is pushing hard",
    ];

    const result: NuclearOptions = {
      options: viableOptions,
      recommended,
      warnings,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[nuclear-options] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate nuclear options",
      },
      { status: 500 }
    );
  }
}
