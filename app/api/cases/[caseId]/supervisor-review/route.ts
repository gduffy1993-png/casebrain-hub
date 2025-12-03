import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logCaseEvent } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { userId, orgId } = await requireAuthContext();

    const supabase = getSupabaseAdminClient();

    // Try to fetch with supervisor review columns, but handle gracefully if they don't exist
    let caseRecord: any = null;
    let error: any = null;

    // First try to get the case
    const { data: caseCheck, error: checkError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (checkError || !caseCheck) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Try to fetch with supervisor columns, but handle missing columns gracefully
    const { data, error: fetchError } = await supabase
      .from("cases")
      .select(
        "supervisor_reviewed, supervisor_reviewed_at, supervisor_reviewer_id, supervisor_review_note"
      )
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    // If columns don't exist, return defaults
    if (fetchError && fetchError.code === "42703") {
      // Column doesn't exist - return defaults
      caseRecord = {
        supervisor_reviewed: false,
        supervisor_reviewed_at: null,
        supervisor_reviewer_id: null,
        supervisor_review_note: null,
      };
    } else if (fetchError) {
      console.error("[supervisor-review] Error fetching case:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch supervisor review status" },
        { status: 500 }
      );
    } else {
      caseRecord = data;
      error = fetchError;
    }

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({
      supervisorReviewed: caseRecord.supervisor_reviewed ?? false,
      supervisorReviewedAt: caseRecord.supervisor_reviewed_at,
      supervisorReviewerId: caseRecord.supervisor_reviewer_id,
      supervisorReviewNote: caseRecord.supervisor_review_note,
    });
  } catch (err) {
    console.error("[supervisor-review] Unexpected error:", err);
    // Return defaults instead of error
    return NextResponse.json({
      supervisorReviewed: false,
      supervisorReviewedAt: null,
      supervisorReviewerId: null,
      supervisorReviewNote: null,
    }, { status: 200 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { userId, orgId } = await requireAuthContext();

    const body = await request.json();
    const { reviewed, note } = body as {
      reviewed: boolean;
      note?: string;
    };

    const supabase = getSupabaseAdminClient();

    // Check case exists and belongs to org
    const { data: existingCase, error: checkError } = await supabase
      .from("cases")
      .select("id, title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (checkError || !existingCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("cases")
      .update({
        supervisor_reviewed: reviewed,
        supervisor_reviewed_at: reviewed ? now : null,
        supervisor_reviewer_id: reviewed ? userId : null,
        supervisor_review_note: note ?? null,
      })
      .eq("id", caseId);

    if (updateError) {
      // If columns don't exist (code 42703), log warning but don't fail
      if (updateError.code === "42703") {
        console.warn("[supervisor-review] Supervisor review columns not found. Migration may need to be applied.");
        // Return success anyway since this is a non-critical feature
        return NextResponse.json({
          success: true,
          supervisorReviewed: reviewed,
          supervisorReviewedAt: reviewed ? now : null,
          supervisorReviewerId: reviewed ? userId : null,
          supervisorReviewNote: note ?? null,
          warning: "Supervisor review columns not found. Please run migration 0031_enterprise_features.sql",
        });
      }
      console.error("[supervisor-review] Error updating case:", updateError);
      return NextResponse.json(
        { error: "Failed to save supervisor review" },
        { status: 500 }
      );
    }

    // Log audit event
    await logCaseEvent({
      caseId,
      eventType: "SUPERVISOR_REVIEWED",
      userId,
      meta: {
        reviewed,
        note: note ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      supervisorReviewed: reviewed,
      supervisorReviewedAt: reviewed ? now : null,
      supervisorReviewerId: reviewed ? userId : null,
      supervisorReviewNote: note ?? null,
    });
  } catch (err) {
    console.error("[supervisor-review] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

