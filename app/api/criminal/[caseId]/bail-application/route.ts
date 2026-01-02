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
  evidenceBasis?: string[]; // Which extracted fields were used
  solicitorInputRequired?: string[]; // Fields that need solicitor input
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

    // Get criminal meta and extracted facts for bail info
    const [{ data: caseRecord }, { data: documents }] = await Promise.all([
      supabase
        .from("cases")
        .select("criminal_meta")
        .eq("id", caseId)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("extracted_json")
        .eq("case_id", caseId)
        .limit(10),
    ]);

    const criminalMeta = (caseRecord?.criminal_meta as any) || null;
    const bailHistory = criminalMeta?.bail || [];

    // Extract evidence from documents
    const extractedEvidence: {
      defendantName?: string;
      address?: string;
      employment?: string;
      family?: string[];
      ties?: string[];
      antecedents?: string[];
      bailConditions?: string[];
    } = {};

    // Extract from criminalMeta in documents
    for (const doc of documents || []) {
      const extracted = doc.extracted_json as any;
      if (extracted?.criminalMeta) {
        const meta = extracted.criminalMeta;
        if (meta.defendantName && !extractedEvidence.defendantName) {
          extractedEvidence.defendantName = meta.defendantName;
        }
        if (meta.bailConditions && !extractedEvidence.bailConditions) {
          extractedEvidence.bailConditions = meta.bailConditions;
        }
      }
      // Extract from parties
      if (extracted?.parties) {
        const client = extracted.parties.find((p: any) => p.role === "client" || p.role === "defendant");
        if (client?.name && !extractedEvidence.defendantName) {
          extractedEvidence.defendantName = client.name;
        }
      }
    }

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
    const evidenceBasis: string[] = [];
    const solicitorInputRequired: string[] = [];

    // Ground 1: Strong defense case (only if evidence exists)
    if (defenseAnalysis?.overallWinProbability && defenseAnalysis.overallWinProbability > 50) {
      grounds.push("Strong defence case");
      bailArguments.push(
        `The defence case has a ${defenseAnalysis.overallWinProbability}% probability of success. The prosecution case is weak with multiple identified weaknesses including ${defenseAnalysis.prosecutionVulnerabilities?.criticalWeaknesses?.[0] || "evidence issues"}.`
      );
      evidenceBasis.push("Defence analysis probability");
    } else if (defenseAnalysis) {
      grounds.push("Defence case pending full analysis");
      bailArguments.push("The defence case is being prepared and shows promise.");
      evidenceBasis.push("Defence analysis (pending)");
    } else {
      grounds.push("Defence case pending full analysis");
      bailArguments.push("[Defence case analysis not yet available - solicitor input required]");
      solicitorInputRequired.push("Defence case strength assessment");
    }

    // Ground 2: No risk of absconding (use extracted evidence or placeholders)
    grounds.push("No risk of absconding");
    if (extractedEvidence.address) {
      bailArguments.push(`The defendant has strong ties to the area, stable address at ${extractedEvidence.address}, and no history of absconding.`);
      evidenceBasis.push("Defendant address");
    } else if (extractedEvidence.ties && extractedEvidence.ties.length > 0) {
      bailArguments.push(`The defendant has strong ties to the area (${extractedEvidence.ties.join(", ")}), and no history of absconding.`);
      evidenceBasis.push("Ties to area");
    } else {
      bailArguments.push("The defendant has strong ties to the area, stable address [ADDRESS - SOLICITOR INPUT REQUIRED], and no history of absconding [CONFIRM FROM ANTECEDENTS - SOLICITOR INPUT REQUIRED].");
      solicitorInputRequired.push("Defendant address");
      solicitorInputRequired.push("Ties to area");
      solicitorInputRequired.push("History of absconding");
    }

    // Ground 3: No risk of reoffending (use extracted evidence or placeholders)
    grounds.push("No risk of reoffending");
    if (extractedEvidence.antecedents && extractedEvidence.antecedents.length > 0) {
      const hasSimilar = extractedEvidence.antecedents.some((a: string) => 
        /similar|same|related/i.test(a)
      );
      if (!hasSimilar) {
        bailArguments.push("The defendant has no previous similar convictions and poses no risk to the public.");
        evidenceBasis.push("Antecedents (no similar convictions)");
      } else {
        bailArguments.push("[ANTECEDENTS REVIEW REQUIRED - SOLICITOR INPUT REQUIRED: Review previous convictions to assess reoffending risk]");
        solicitorInputRequired.push("Antecedents review");
      }
    } else {
      bailArguments.push("The defendant has no previous similar convictions [ANTECEDENTS CHECK REQUIRED - SOLICITOR INPUT REQUIRED] and poses no risk to the public.");
      solicitorInputRequired.push("Antecedents check");
    }

    // Ground 4: Disclosure failures (only if evidence exists)
    if (defenseAnalysis?.prosecutionVulnerabilities?.proceduralErrors?.some((e: string) => 
      e.toLowerCase().includes("disclosure")
    )) {
      grounds.push("Disclosure failures prejudice defence");
      bailArguments.push("Serious disclosure failures mean the defence cannot properly prepare, making bail more appropriate.");
      evidenceBasis.push("Disclosure failure indicators");
    }

    // Proposed conditions (use extracted or placeholders)
    if (extractedEvidence.bailConditions && extractedEvidence.bailConditions.length > 0) {
      conditionsProposed.push(...extractedEvidence.bailConditions);
      evidenceBasis.push("Existing bail conditions");
    } else {
      conditionsProposed.push("Reside at [ADDRESS - SOLICITOR INPUT REQUIRED]");
      conditionsProposed.push("Report to police station [STATION NAME - SOLICITOR INPUT REQUIRED] weekly");
      conditionsProposed.push("Surrender passport [IF HELD - SOLICITOR INPUT REQUIRED]");
      conditionsProposed.push("Not to contact prosecution witnesses");
      conditionsProposed.push("Not to leave the jurisdiction");
      solicitorInputRequired.push("Bail conditions details");
    }

    const authorities = [
      "Bail Act 1976",
      "R v H [2004] UKHL 3",
    ];

    // Generate ready-to-use application with placeholders clearly marked
    const readyToUseApplication = `BAIL APPLICATION

GROUNDS:
${grounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}

ARGUMENTS:
${bailArguments.map((a, i) => `${i + 1}. ${a}`).join("\n\n")}

CONDITIONS PROPOSED:
${conditionsProposed.map((c, i) => `${i + 1}. ${c}`).join("\n")}

AUTHORITIES:
${authorities.join("\n")}

${solicitorInputRequired.length > 0 ? `\nSOLICITOR INPUT REQUIRED:\n${solicitorInputRequired.map((item, i) => `${i + 1}. ${item}`).join("\n")}\n` : ""}
${evidenceBasis.length > 0 ? `\nEVIDENCE BASIS:\n${evidenceBasis.map((item, i) => `${i + 1}. ${item}`).join("\n")}\n` : ""}

I submit that bail should be granted on the grounds set out above, with the conditions proposed.`;

    const result: BailApplication = {
      grounds,
      bailArguments,
      conditionsProposed,
      authorities,
      readyToUseApplication,
      evidenceBasis: evidenceBasis.length > 0 ? evidenceBasis : undefined,
      solicitorInputRequired: solicitorInputRequired.length > 0 ? solicitorInputRequired : undefined,
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
