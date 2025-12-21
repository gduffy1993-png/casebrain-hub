import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type ProsecutionWeakness = {
  weakness: string;
  exploitability: number; // 0-100
  description: string;
  attackStrategy: string;
  readyToUseAttack: string;
  caseLaw?: string[];
};

type ProsecutionWeaknesses = {
  weaknesses: ProsecutionWeakness[];
  rankedByExploitability: ProsecutionWeakness[];
  top3Attacks: string[];
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

    if (!defenseAnalysis) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aggressive defense analysis not available. Please run analysis first.",
        },
        { status: 404 }
      );
    }

    const weaknesses: ProsecutionWeakness[] = [];

    // Extract weaknesses from prosecution vulnerabilities
    if (defenseAnalysis.prosecutionVulnerabilities) {
      const vulns = defenseAnalysis.prosecutionVulnerabilities;

      // Critical weaknesses
      if (vulns.criticalWeaknesses?.length > 0) {
        vulns.criticalWeaknesses.forEach((weakness: string, idx: number) => {
          weaknesses.push({
            weakness,
            exploitability: 90 - (idx * 5), // Top weaknesses are most exploitable
            description: `Critical prosecution weakness: ${weakness}`,
            attackStrategy: "Attack this weakness immediately - it's the most exploitable",
            readyToUseAttack: `"The prosecution case suffers from ${weakness.toLowerCase()}. This is a fundamental flaw that undermines the entire case."`,
            caseLaw: ["R v H [2004]", "R v Keenan [1990]"],
          });
        });
      }

      // Evidence gaps
      if (vulns.evidenceGaps?.length > 0) {
        vulns.evidenceGaps.forEach((gap: string, idx: number) => {
          weaknesses.push({
            weakness: `Evidence Gap: ${gap}`,
            exploitability: 85 - (idx * 5),
            description: `Missing or weak evidence: ${gap}`,
            attackStrategy: "Highlight absence of evidence as creating reasonable doubt",
            readyToUseAttack: `"The prosecution has failed to provide ${gap.toLowerCase()}. This absence creates reasonable doubt."`,
            caseLaw: ["R v Turnbull [1977]"],
          });
        });
      }

      // Procedural errors
      if (vulns.proceduralErrors?.length > 0) {
        vulns.proceduralErrors.forEach((error: string, idx: number) => {
          weaknesses.push({
            weakness: `Procedural Error: ${error}`,
            exploitability: 80 - (idx * 5),
            description: `Procedural breach: ${error}`,
            attackStrategy: "Use procedural error to exclude evidence or stay proceedings",
            readyToUseAttack: `"The prosecution has committed a procedural error: ${error.toLowerCase()}. This breach requires exclusion/stay."`,
            caseLaw: ["R v Horseferry Road Magistrates [1994]"],
          });
        });
      }
    }

    // Extract weaknesses from defense angles
    if (defenseAnalysis.criticalAngles?.length > 0) {
      defenseAnalysis.criticalAngles.forEach((angle: any) => {
        if (angle.prosecutionWeakness) {
          const existing = weaknesses.find((w) => w.weakness === angle.prosecutionWeakness);
          if (!existing) {
            weaknesses.push({
              weakness: angle.prosecutionWeakness,
              exploitability: angle.winProbability || 75,
              description: angle.whyThisMatters || "Prosecution weakness identified",
              attackStrategy: angle.howToExploit || "Follow recommended exploitation plan",
              readyToUseAttack: angle.specificArguments?.[0] || angle.legalBasis || "Attack this weakness",
              caseLaw: angle.caseLaw || [],
            });
          }
        }
      });
    }

    // Rank by exploitability
    const rankedByExploitability = [...weaknesses].sort(
      (a, b) => b.exploitability - a.exploitability
    );

    // Top 3 attacks
    const top3Attacks = rankedByExploitability.slice(0, 3).map((w) => w.readyToUseAttack);

    const result: ProsecutionWeaknesses = {
      weaknesses,
      rankedByExploitability,
      top3Attacks,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[prosecution-weaknesses] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate prosecution weaknesses",
      },
      { status: 500 }
    );
  }
}
