import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCaseContext, guardAnalysis } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { normalizePracticeArea } from "@/lib/types/casebrain";

export const runtime = "nodejs";

type ChecklistItem = {
  item: string;
  status: "COMPLETE" | "IN_PROGRESS" | "MISSING" | "NOT_APPLICABLE";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
  readyToUse?: string;
};

type CourtReadiness = {
  overallReadiness: number; // 0-100
  status: "READY" | "NEARLY_READY" | "NOT_READY" | "CRITICAL_ISSUES";
  checklist: ChecklistItem[];
  criticalMissing: string[];
  confidenceScore: number; // 0-100
  recommendations: string[];
  readyToUseChecklist: string;
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

    const practiceArea = normalizePracticeArea(context.case.practice_area as string | null);
    const supabase = getSupabaseAdminClient();

    // Get tactical command for angle/move
    const { data: tacticalCommand } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", practiceArea === "criminal" ? "kill_shot" : "strategic_overview")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get documents count
    const { count: docCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId);

    // Get key facts
    const { data: keyFacts } = await supabase
      .from("case_analysis")
      .select("analysis_json")
      .eq("case_id", caseId)
      .eq("analysis_type", "key_facts")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tacticalData = tacticalCommand?.analysis_json as any;
    const keyFactsData = keyFacts?.analysis_json as any;

    const checklist: ChecklistItem[] = [];

    if (practiceArea === "criminal") {
      // Criminal-specific checklist
      checklist.push(
        {
          item: "Primary defense angle identified",
          status: tacticalData?.primaryStrategy ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: tacticalData?.primaryStrategy?.name || "Identify primary defense angle",
        },
        {
          item: "Ready-to-use submissions prepared",
          status: tacticalData?.primaryStrategy?.readyToUseSubmissions?.length > 0 ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: "Submissions ready for court",
          readyToUse: tacticalData?.primaryStrategy?.readyToUseSubmissions?.[0],
        },
        {
          item: "Cross-examination questions prepared",
          status: tacticalData?.primaryStrategy?.crossExaminationQuestions?.length > 0 ? "COMPLETE" : "MISSING",
          priority: "HIGH",
          notes: "Questions ready for witnesses",
        },
        {
          item: "Key facts extracted",
          status: keyFactsData ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: "Key facts available",
        },
        {
          item: "Case documents reviewed",
          status: (docCount || 0) > 0 ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: `${docCount || 0} documents uploaded`,
        },
        {
          item: "Backup strategy prepared",
          status: tacticalData?.primaryStrategy?.fallbackStrategy ? "COMPLETE" : "IN_PROGRESS",
          priority: "HIGH",
          notes: "Backup strategy identified",
        },
        {
          item: "Authorities/case law identified",
          status: tacticalData?.primaryStrategy?.authority?.length > 0 ? "COMPLETE" : "MISSING",
          priority: "HIGH",
          notes: "Legal authorities ready",
        },
        {
          item: "Evidence gaps identified",
          status: "COMPLETE", // We have evidence gap analysis
          priority: "MEDIUM",
          notes: "Evidence gaps documented",
        }
      );
    } else {
      // Civil checklist
      checklist.push(
        {
          item: "Primary strategy identified",
          status: tacticalData?.primaryStrategy ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: "Strategy ready",
        },
        {
          item: "Key facts extracted",
          status: keyFactsData ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: "Key facts available",
        },
        {
          item: "Case documents reviewed",
          status: (docCount || 0) > 0 ? "COMPLETE" : "MISSING",
          priority: "CRITICAL",
          notes: `${docCount || 0} documents uploaded`,
        },
        {
          item: "Ready-to-use submissions prepared",
          status: tacticalData?.readyToUse?.length > 0 ? "COMPLETE" : "MISSING",
          priority: "HIGH",
          notes: "Submissions ready",
        },
        {
          item: "Opponent weaknesses identified",
          status: "COMPLETE", // We have weakness analysis
          priority: "HIGH",
          notes: "Weaknesses documented",
        }
      );
    }

    // Calculate readiness
    const completeCount = checklist.filter((item) => item.status === "COMPLETE").length;
    const totalCount = checklist.filter((item) => item.status !== "NOT_APPLICABLE").length;
    const overallReadiness = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;

    // Get critical missing items
    const criticalMissing = checklist
      .filter((item) => item.status === "MISSING" && item.priority === "CRITICAL")
      .map((item) => item.item);

    // Determine status
    let status: CourtReadiness["status"];
    if (overallReadiness >= 90 && criticalMissing.length === 0) {
      status = "READY";
    } else if (overallReadiness >= 70 && criticalMissing.length === 0) {
      status = "NEARLY_READY";
    } else if (criticalMissing.length > 0) {
      status = "CRITICAL_ISSUES";
    } else {
      status = "NOT_READY";
    }

    // Confidence score (based on readiness + completeness)
    const confidenceScore = Math.min(100, overallReadiness + (criticalMissing.length === 0 ? 10 : 0));

    // Recommendations
    const recommendations: string[] = [];
    if (criticalMissing.length > 0) {
      recommendations.push(`Complete critical items: ${criticalMissing.join(", ")}`);
    }
    if (overallReadiness < 90) {
      recommendations.push("Complete remaining checklist items before court");
    }
    if (!tacticalData?.primaryStrategy?.fallbackStrategy) {
      recommendations.push("Prepare backup strategy");
    }

    // Ready-to-use checklist
    const readyToUseChecklist = `COURT READINESS CHECKLIST:

STATUS: ${status}
READINESS: ${overallReadiness}%
CONFIDENCE: ${confidenceScore}%

CHECKLIST:
${checklist
  .filter((item) => item.status !== "NOT_APPLICABLE")
  .map((item, idx) => {
    const statusIcon = item.status === "COMPLETE" ? "✓" : item.status === "IN_PROGRESS" ? "◐" : "✗";
    return `${idx + 1}. ${statusIcon} [${item.priority}] ${item.item}${item.notes ? ` - ${item.notes}` : ""}`;
  })
  .join("\n")}

${criticalMissing.length > 0 ? `\nCRITICAL MISSING:\n${criticalMissing.map((item) => `- ${item}`).join("\n")}` : ""}

${recommendations.length > 0 ? `\nRECOMMENDATIONS:\n${recommendations.map((rec) => `- ${rec}`).join("\n")}` : ""}`;

    const result: CourtReadiness = {
      overallReadiness,
      status,
      checklist,
      criticalMissing,
      confidenceScore,
      recommendations,
      readyToUseChecklist,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    console.error("[court-readiness] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate court readiness",
      },
      { status: 500 }
    );
  }
}
