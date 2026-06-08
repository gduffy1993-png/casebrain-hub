import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type EvidenceGap = {
  missingEvidence: string;
  whyItMatters: string;
  howToExploit: string;
  requestTemplate: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  requestedCount?: number;
};

type EvidenceGaps = {
  gaps: EvidenceGap[];
  criticalGaps: EvidenceGap[];
  immediateActions: string[];
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

    const gaps: EvidenceGap[] = [];

    // Extract evidence gaps from defense angles
    if (defenseAnalysis?.criticalAngles) {
      defenseAnalysis.criticalAngles.forEach((angle: any) => {
        if (angle.disclosureRequests?.length > 0) {
          angle.disclosureRequests.forEach((request: string) => {
            gaps.push({
              missingEvidence: request,
              whyItMatters: angle.whyThisMatters || "Could be exculpatory or undermine prosecution",
              howToExploit: angle.howToExploit || "Request disclosure, if not provided make stay application",
              requestTemplate: `I request disclosure of ${request} under CPIA 1996. This material is relevant to the defense case and its absence prejudices the defense.`,
              urgency: angle.severity === "CRITICAL" ? "CRITICAL" : angle.severity === "HIGH" ? "HIGH" : "MEDIUM",
            });
          });
        }

        if (angle.evidenceNeeded?.length > 0) {
          angle.evidenceNeeded.forEach((evidence: string) => {
            gaps.push({
              missingEvidence: evidence,
              whyItMatters: angle.whyThisMatters || "Needed to support defense case",
              howToExploit: angle.howToExploit || "Request disclosure",
              requestTemplate: `I request disclosure of ${evidence}. This evidence is material to the defense case.`,
              urgency: angle.severity === "CRITICAL" ? "CRITICAL" : angle.severity === "HIGH" ? "HIGH" : "MEDIUM",
            });
          });
        }
      });
    }

    // Extract from prosecution vulnerabilities
    if (defenseAnalysis?.prosecutionVulnerabilities?.evidenceGaps) {
      defenseAnalysis.prosecutionVulnerabilities.evidenceGaps.forEach((gap: string) => {
        const existing = gaps.find((g) => g.missingEvidence === gap);
        if (!existing) {
          gaps.push({
            missingEvidence: gap,
            whyItMatters: "Could be exculpatory or undermine prosecution case",
            howToExploit: "Request disclosure. If not provided, make stay application citing R v H [2004]",
            requestTemplate: `I request disclosure of ${gap} under CPIA 1996. This material is relevant and its absence prejudices the defense.`,
            urgency: "HIGH",
          });
        }
      });
    }

    // Check disclosure tracker for actual missing items
    const { data: disclosureData } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "disclosure")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (disclosureData?.analysis_json) {
      const disclosure = disclosureData.analysis_json as any;
      if (disclosure.missingItems?.length > 0) {
        disclosure.missingItems.forEach((item: any) => {
          const existing = gaps.find((g) => g.missingEvidence === item.name || g.missingEvidence === item.description);
          if (!existing) {
            gaps.push({
              missingEvidence: item.name || item.description || "Undisclosed material",
              whyItMatters: item.reason || "Could be exculpatory",
              howToExploit: "Request disclosure. If not provided, make stay application",
              requestTemplate: `I request disclosure of ${item.name || "this material"} under CPIA 1996.`,
              urgency: item.urgency === "CRITICAL" ? "CRITICAL" : item.urgency === "HIGH" ? "HIGH" : "MEDIUM",
              requestedCount: item.requestedCount || 0,
            });
          }
        });
      }
    }

    // Remove duplicates
    const uniqueGaps = gaps.filter((gap, idx, self) =>
      idx === self.findIndex((g) => g.missingEvidence === gap.missingEvidence)
    );

    // Sort by urgency
    const urgencyOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
    uniqueGaps.sort((a, b) => (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0));

    const criticalGaps = uniqueGaps.filter((g) => g.urgency === "CRITICAL" || g.urgency === "HIGH");

    // Immediate actions
    const immediateActions: string[] = [];
    if (criticalGaps.length > 0) {
      immediateActions.push("Send disclosure requests TODAY for all critical missing evidence");
      immediateActions.push("If not provided by tomorrow → make stay application");
      immediateActions.push("Cite: R v H [2004] - disclosure failures = stay");
    } else if (uniqueGaps.length > 0) {
      immediateActions.push("Send disclosure requests for missing evidence");
      immediateActions.push("Monitor responses and escalate if not provided");
    }

    const result: EvidenceGaps = {
      gaps: uniqueGaps,
      criticalGaps,
      immediateActions,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[evidence-gaps] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate evidence gaps",
      },
      { status: 500 }
    );
  }
}
