/**
 * POST /api/cases/[caseId]/analysis/rebuild
 * 
 * Rebuilds analysis with selected documents and creates a new version
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateCaseMomentum } from "@/lib/strategic/momentum-engine";
import { generateStrategyPaths } from "@/lib/strategic/strategy-paths";
import { detectOpponentWeakSpots } from "@/lib/strategic/weak-spots";
import { detectProceduralLeveragePoints } from "@/lib/strategic/procedural-leverage";
import { findMissingEvidence } from "@/lib/missing-evidence";
import { computeAnalysisDelta } from "@/lib/strategic/compute-analysis-delta";
import { detectCaseRole } from "@/lib/strategic/role-detection";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = await params;
    const body = await request.json();
    const { document_ids } = body as { document_ids: string[] };

    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: "document_ids array is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Verify case access
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .single();

    if (caseError || !caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 },
      );
    }

    // Get selected documents (use document_ids from request)
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .in("id", document_ids);

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: "Documents not found" },
        { status: 404 },
      );
    }

    // Get timeline
    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, description")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });

    // Get letters and deadlines for momentum calculation
    const { data: letters } = await supabase
      .from("letters")
      .select("id, created_at, template_id")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    const { data: deadlines } = await supabase
      .from("deadlines")
      .select("id, title, due_date, status, category")
      .eq("case_id", caseId)
      .order("due_date", { ascending: false });

    // Detect case role
    let caseRole: "claimant" | "defendant";
    try {
      caseRole = await detectCaseRole({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as any,
        documents: documents ?? [],
        timeline: timeline ?? [],
      });
    } catch (error) {
      console.warn("[rebuild-analysis] Failed to detect case role, defaulting to claimant:", error);
      caseRole = "claimant";
    }

    // Calculate momentum
    const momentum = await calculateCaseMomentum({
      caseId,
      orgId,
      practiceArea: caseRecord.practice_area as any,
      documents: documents ?? [],
      timeline: timeline ?? [],
      bundleId: undefined,
      letters: letters ?? [],
      deadlines: deadlines ?? [],
      caseRole,
    });

    // Build missing evidence
    const docsForEvidence = documents.map((d) => ({
      name: d.name,
      type: undefined,
      extracted_json: undefined,
    }));
    const missingEvidence = findMissingEvidence(
      caseId,
      caseRecord.practice_area || "other_litigation",
      docsForEvidence,
    );

    // Get previous version
    const { data: prevVersion } = await supabase
      .from("case_analysis_versions")
      .select("risk_rating, summary, key_issues, timeline, missing_evidence")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get next version number
    const { data: latestVersion } = await supabase
      .from("case_analysis_versions")
      .select("version_number")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersionNumber = latestVersion ? (latestVersion as any).version_number + 1 : 1;

    // Format data for version record
    const missingEvidenceFormatted = missingEvidence.map((item) => ({
      area: mapCategoryToArea(item.category),
      label: item.label,
      priority: item.priority,
      notes: item.reason,
    }));

    const keyIssues: Array<{
      type: string;
      label: string;
      severity: string;
      notes?: string;
    }> = [];

    if (momentum.shifts) {
      for (const shift of momentum.shifts) {
        if (shift.impact === "NEGATIVE") {
          let issueType = "procedural";
          const factorLower = shift.factor.toLowerCase();
          if (factorLower.includes("breach") || factorLower.includes("negligence")) {
            issueType = "breach";
          } else if (factorLower.includes("causation") || factorLower.includes("caused")) {
            issueType = "causation";
          } else if (factorLower.includes("harm") || factorLower.includes("injury")) {
            issueType = "harm";
          }

          keyIssues.push({
            type: issueType,
            label: shift.factor,
            severity: "HIGH",
            notes: shift.description,
          });
        }
      }
    }

    const timelineFormatted = (timeline ?? []).map((event) => ({
      date: event.event_date,
      description: event.description,
    }));

    const riskRating = mapMomentumToRiskRating(momentum.state);
    const summary = buildVersionSummary(momentum, missingEvidence);

    const currentSnapshot = {
      risk_rating: riskRating,
      summary,
      key_issues: keyIssues,
      timeline: timelineFormatted,
      missing_evidence: missingEvidenceFormatted,
    };

    const delta = computeAnalysisDelta(prevVersion, currentSnapshot);

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from("case_analysis_versions")
      .insert({
        case_id: caseId,
        org_id: orgId,
        version_number: nextVersionNumber,
        document_ids: document_ids,
        risk_rating: riskRating,
        summary,
        key_issues: keyIssues,
        timeline: timelineFormatted,
        missing_evidence: missingEvidenceFormatted,
        analysis_delta: delta,
        created_by: userId,
      })
      .select("version_number, summary, risk_rating, missing_evidence, analysis_delta, document_ids")
      .single();

    if (insertError) {
      console.error("[rebuild-analysis] Failed to insert version:", insertError);
      return NextResponse.json(
        { error: "Failed to create analysis version" },
        { status: 500 },
      );
    }

    // Update case with latest version number
    await supabase
      .from("cases")
      .update({ latest_analysis_version: nextVersionNumber })
      .eq("id", caseId);

    // Log rebuild
    console.log(`[rebuild-analysis] Created version ${nextVersionNumber} for case ${caseId}, momentum: ${momentum.state}, documents: ${document_ids.length}`);

    return NextResponse.json({
      success: true,
      version_number: newVersion.version_number,
      summary: newVersion.summary,
      momentum: newVersion.risk_rating,
      missing_evidence: newVersion.missing_evidence,
      analysis_delta: newVersion.analysis_delta,
      document_ids: newVersion.document_ids,
    });
  } catch (error) {
    console.error("[rebuild-analysis] Error:", error);
    return NextResponse.json(
      { error: "Failed to rebuild analysis" },
      { status: 500 },
    );
  }
}

/**
 * Map momentum state to risk rating string
 */
function mapMomentumToRiskRating(state: string): string {
  const mapping: Record<string, string> = {
    WEAK: "WEAK",
    BALANCED: "BALANCED",
    "STRONG (Expert Pending)": "STRONG_PENDING",
    STRONG: "STRONG",
  };
  return mapping[state] || "BALANCED";
}

/**
 * Map evidence category to area
 */
function mapCategoryToArea(category: string): string {
  const mapping: Record<string, string> = {
    LIABILITY: "medical_records",
    CAUSATION: "expert",
    QUANTUM: "witness",
    PROCEDURE: "admin",
    HOUSING: "other",
  };
  return mapping[category] || "other";
}

/**
 * Build version summary (3-5 lines)
 */
function buildVersionSummary(
  momentum: Awaited<ReturnType<typeof calculateCaseMomentum>>,
  missingEvidence: Array<{ label: string; priority: string }>,
): string {
  const lines: string[] = [];
  
  lines.push(momentum.explanation || `Case momentum is ${momentum.state.toLowerCase()}.`);

  if (momentum.shifts && momentum.shifts.length > 0) {
    const positiveShifts = momentum.shifts.filter((s) => s.impact === "POSITIVE").slice(0, 2);
    const negativeShifts = momentum.shifts.filter((s) => s.impact === "NEGATIVE").slice(0, 2);
    
    if (positiveShifts.length > 0) {
      lines.push(`Key strengths: ${positiveShifts.map((s) => s.factor).join(", ")}.`);
    }
    if (negativeShifts.length > 0) {
      lines.push(`Areas of concern: ${negativeShifts.map((s) => s.factor).join(", ")}.`);
    }
  }

  const criticalMissing = missingEvidence.filter((m) => m.priority === "CRITICAL" || m.priority === "HIGH");
  if (criticalMissing.length > 0) {
    lines.push(`Missing evidence: ${criticalMissing.slice(0, 3).map((m) => m.label).join(", ")}.`);
  }

  return lines.join(" ");
}

