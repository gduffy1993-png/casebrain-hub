import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logCaseEvent } from "@/lib/audit";
import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteParams,
) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const { caseId } = await params;
    const supabase = getSupabaseAdminClient();

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { practiceArea } = body as { practiceArea?: string };

    // Validate practice area
    if (!practiceArea) {
      return NextResponse.json(
        { error: "practiceArea is required" },
        { status: 400 },
      );
    }

    const validPracticeAreas = PRACTICE_AREA_OPTIONS.map((opt) => opt.value);
    if (!validPracticeAreas.includes(practiceArea as PracticeArea)) {
      return NextResponse.json(
        { error: `Invalid practice area. Must be one of: ${validPracticeAreas.join(", ")}` },
        { status: 400 },
      );
    }

    // Verify case exists and user has access
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id, practice_area, org_id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError) {
      console.error("[practice-area] Error fetching case:", caseError);
      return NextResponse.json(
        { error: "Failed to fetch case" },
        { status: 500 },
      );
    }

    if (!caseRecord) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 },
      );
    }

    const oldPracticeArea = caseRecord.practice_area;

    // Update practice area
    const { data: updatedCase, error: updateError } = await supabase
      .from("cases")
      .update({
        practice_area: practiceArea,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("org_id", orgId)
      .select("id, practice_area")
      .single();

    if (updateError) {
      console.error("[practice-area] Error updating case:", updateError);
      return NextResponse.json(
        { error: "Failed to update practice area" },
        { status: 500 },
      );
    }

    // Log audit event
    await logCaseEvent({
      caseId,
      eventType: "PRACTICE_AREA_UPDATED",
      userId,
      meta: {
        from: oldPracticeArea ?? null,
        to: practiceArea,
      },
    });

    return NextResponse.json({
      success: true,
      practiceArea: updatedCase.practice_area,
    });
  } catch (error) {
    console.error("[practice-area] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
