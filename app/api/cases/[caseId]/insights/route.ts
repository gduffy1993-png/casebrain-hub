import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildCaseInsights } from "@/lib/core/insights";
import { findMissingEvidence } from "@/lib/missing-evidence";
import type { CaseInsights } from "@/lib/core/enterprise-types";
import type { LimitationInfo } from "@/lib/types/casebrain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  try {
    // Fetch case
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("id, title, summary, practice_area, status, supervisor_reviewed, created_at")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch documents with extracted_json for Awaab Law analysis
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, type, created_at, extracted_json")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    // Fetch risks
    const { data: riskFlags } = await supabase
      .from("risk_flags")
      .select("id, flag_type, severity, description, category, resolved, detected_at")
      .eq("case_id", caseId)
      .eq("resolved", false);

    // Fetch missing evidence
    const docsForEvidence = (documents ?? []).map((d) => ({
      name: d.name,
      type: d.type ?? undefined,
      extracted_json: d.extracted_json ?? undefined,
    }));
    const missingEvidence = findMissingEvidence(
      caseId,
      caseRecord.practice_area ?? "other_litigation",
      docsForEvidence,
    );

    // Fetch limitation
    const { data: limitationData } = await supabase
      .from("limitation_info")
      .select("primary_limitation_date, days_remaining, is_expired, severity")
      .eq("case_id", caseId)
      .maybeSingle();

    // Convert limitation
    const limitationInfo: LimitationInfo | undefined = limitationData ? {
      caseId,
      causeOfAction: "",
      primaryLimitationDate: limitationData.primary_limitation_date ?? "",
      daysRemaining: limitationData.days_remaining ?? 0,
      isExpired: limitationData.is_expired ?? false,
      severity: (limitationData.severity?.toUpperCase() ?? "LOW") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      practiceArea: (caseRecord.practice_area ?? "other_litigation") as any,
    } : undefined;

    // Fetch key issues
    const { data: keyIssues } = await supabase
      .from("key_issues")
      .select("id, label, description, category")
      .eq("case_id", caseId);

    // Fetch next steps
    const { data: nextSteps } = await supabase
      .from("next_steps")
      .select("id, action, priority, due_date")
      .eq("case_id", caseId)
      .eq("completed", false);

    // Fetch recent notes for days since update
    const { data: recentNotes } = await supabase
      .from("case_notes")
      .select("created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1);

    const daysSinceLastUpdate = recentNotes?.[0]?.created_at
      ? Math.floor((Date.now() - new Date(recentNotes[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Build insights - wrap in try-catch to ensure we always return something
    let insights: CaseInsights;
    try {
      insights = await buildCaseInsights({
        caseId,
        orgId,
        caseRecord: {
          id: caseRecord.id,
          title: caseRecord.title ?? "",
          summary: caseRecord.summary ?? null,
          practice_area: caseRecord.practice_area ?? null,
          status: caseRecord.status ?? null,
          created_at: caseRecord.created_at,
        },
        documents: (documents ?? []).map(d => ({
          id: d.id,
          name: d.name,
          type: d.type ?? null,
        })),
        riskFlags: (riskFlags ?? []).map(rf => ({
          id: rf.id,
          flag_type: rf.flag_type,
          severity: rf.severity,
          description: rf.description,
          category: rf.category ?? null,
          resolved: rf.resolved ?? false,
        })),
        missingEvidence,
        limitationInfo,
        keyIssues: (keyIssues ?? []).map(ki => ({
          id: ki.id,
          label: ki.label,
          category: ki.category ?? null,
        })),
        nextSteps: (nextSteps ?? []).map(ns => ({
          id: ns.id,
          action: ns.action ?? "",
          priority: ns.priority ?? null,
        })),
        supervisorReviewed: caseRecord.supervisor_reviewed ?? false,
        daysSinceLastUpdate,
      });
    } catch (buildError) {
      console.error("[insights] Error building insights:", buildError);
      // Re-throw to be caught by outer catch which will return fallback
      throw buildError;
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error("[insights] Error:", error);
    
    // Return a safe fallback instead of throwing
    const fallbackInsights: CaseInsights = {
      summary: {
        headline: "Case created – no documents uploaded",
        oneLiner: "Upload key documents to generate insights.",
        stageLabel: null,
        practiceArea: null,
        clientName: null,
        opponentName: null,
      },
      rag: {
        overallLevel: "amber",
        overallScore: 50,
        scores: [],
      },
      briefing: {
        overview: "Case data is insufficient to generate insights. Upload key documents to begin analysis.",
        keyStrengths: [],
        keyRisks: ["No documents uploaded yet."],
        urgentActions: ["Upload the core claim documents to begin analysis."],
      },
      meta: {
        caseId,
        updatedAt: new Date().toISOString(),
        hasCoreEvidence: false,
        missingCriticalCount: 0,
        missingHighCount: 0,
      },
    };

    return NextResponse.json(fallbackInsights, { status: 200 });
  }
}

