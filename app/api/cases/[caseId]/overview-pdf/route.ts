import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateCaseOverviewPdf, type CaseOverviewData } from "@/lib/pdf/case-overview-pdf";
import { logCaseEvent, getRecentCaseEvents } from "@/lib/audit";
import { buildAnalysisMeta } from "@/lib/versioning";
import { getPackForPracticeArea } from "@/lib/packs";
import type { PracticeArea } from "@/lib/types/casebrain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { userId, orgId } = await requireAuthContext();

  try {
    const supabase = getSupabaseAdminClient();

    // Fetch case with all relevant data
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select(`
        id,
        title,
        practice_area,
        created_at,
        supervisor_reviewed,
        supervisor_reviewed_at,
        supervisor_review_note,
        current_analysis
      `)
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      console.error("[overview-pdf] Case error:", caseError);
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch risks
    const { data: risks } = await supabase
      .from("risk_flags")
      .select("label, severity, resolved")
      .eq("case_id", caseId)
      .eq("resolved", false);

    // Fetch documents
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    // Fetch missing evidence
    const { data: missingEvidence } = await supabase
      .from("missing_evidence")
      .select("label")
      .eq("case_id", caseId);

    // Fetch compliance gaps (using the case's current_analysis if available)
    const complianceGaps: string[] = [];
    const currentAnalysis = caseRecord.current_analysis as Record<string, unknown> | null;
    if (currentAnalysis?.complianceGaps) {
      const gaps = currentAnalysis.complianceGaps as Array<unknown>;
      for (const gap of gaps) {
        if (typeof gap === "string") {
          complianceGaps.push(gap);
        } else if (gap && typeof gap === "object" && "label" in gap) {
          complianceGaps.push((gap as { label: string }).label);
        }
      }
    }

    // Fetch key issues
    const { data: keyIssues } = await supabase
      .from("key_issues")
      .select("label")
      .eq("case_id", caseId);

    // Fetch limitation
    const { data: limitationData } = await supabase
      .from("limitation_info")
      .select("primary_limitation_date, days_remaining")
      .eq("case_id", caseId)
      .maybeSingle();

    // Fetch parties
    const { data: parties } = await supabase
      .from("parties")
      .select("name, role")
      .eq("case_id", caseId);

    // Fetch next steps
    const { data: nextSteps } = await supabase
      .from("next_steps")
      .select("action")
      .eq("case_id", caseId)
      .eq("completed", false)
      .order("priority", { ascending: true })
      .limit(5);

    // Fetch audit events
    const auditEvents = await getRecentCaseEvents(caseId, 15);

    // Build overview data
    type PartyRecord = { name: string; role: string | null };
    const clientParty = (parties as PartyRecord[] | null)?.find(
      (p) => p.role?.toLowerCase() === "claimant" || p.role?.toLowerCase() === "client"
    );
    const opponentParty = (parties as PartyRecord[] | null)?.find(
      (p) => p.role?.toLowerCase() === "defendant" || p.role?.toLowerCase() === "opponent"
    );

    type RiskRecord = { label: string; severity: string; resolved: boolean };
    const criticalRisks = ((risks as RiskRecord[] | null) ?? [])
      .filter((r) => r.severity === "critical" || r.severity === "high")
      .map((r) => r.label);

    const practiceArea = (caseRecord.practice_area ?? "other_litigation") as PracticeArea;
    const pack = getPackForPracticeArea(practiceArea);
    const versionInfo = buildAnalysisMeta({
      packId: pack.id,
      packVersion: pack.version,
      userId,
    });

    type KeyIssueRecord = { label: string };
    type NextStepRecord = { action: string };

    const overviewData: CaseOverviewData = {
      caseId,
      title: caseRecord.title ?? "Untitled Case",
      practiceArea: caseRecord.practice_area ?? "other_litigation",
      createdAt: caseRecord.created_at,
      clientName: clientParty?.name,
      opponentName: opponentParty?.name,

      meta: versionInfo,

      supervisorReviewed: caseRecord.supervisor_reviewed ?? false,
      supervisorReviewedAt: caseRecord.supervisor_reviewed_at ?? undefined,
      supervisorReviewNote: caseRecord.supervisor_review_note ?? undefined,

      riskCount: (risks as RiskRecord[] | null)?.length ?? 0,
      criticalRisks,
      keyIssues: ((keyIssues as KeyIssueRecord[] | null) ?? []).map((i) => i.label),
      missingEvidenceCount: (missingEvidence as Array<unknown> | null)?.length ?? 0,
      complianceGaps,
      limitationDaysRemaining: (limitationData as { days_remaining?: number } | null)?.days_remaining,
      limitationDate: (limitationData as { primary_limitation_date?: string } | null)?.primary_limitation_date,

      nextSteps: ((nextSteps as NextStepRecord[] | null) ?? []).map((s) => s.action),

      auditEvents: auditEvents.map((e) => ({
        eventType: e.eventType,
        timestamp: e.timestamp,
        userId: e.userId ?? undefined,
      })),

      documentCount: (documents as Array<unknown> | null)?.length ?? 0,
      lastDocumentDate: (documents as Array<{ created_at: string }> | null)?.[0]?.created_at,

      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    };

    // Generate PDF
    const pdfBuffer = await generateCaseOverviewPdf(overviewData);

    // Log audit event
    await logCaseEvent({
      caseId,
      eventType: "OVERVIEW_PDF_EXPORTED",
      userId,
      meta: { practiceArea: caseRecord.practice_area },
    });

    // Create filename
    const safeTitle = (caseRecord.title ?? "Case")
      .replace(/[^a-z0-9]/gi, "_")
      .slice(0, 40);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `CaseOverview_${safeTitle}_${dateStr}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[overview-pdf] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate case overview PDF" },
      { status: 500 }
    );
  }
}
