import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

const ALLOWED_PRACTICE_AREAS = ["general", "pi", "clinical_negligence"] as const;

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { caseId: string };
  },
) {
  const { caseId } = params;
  const { orgId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const body = (await request.json()) as { practiceArea?: string };
  const practiceArea = body.practiceArea?.toLowerCase();

  if (!practiceArea || !ALLOWED_PRACTICE_AREAS.includes(practiceArea as (typeof ALLOWED_PRACTICE_AREAS)[number])) {
    return NextResponse.json(
      { error: "Invalid practice area supplied." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("cases")
    .update({ practice_area: practiceArea })
    .eq("id", caseId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[cases:practice-area] Failed to update practice area", { error, caseId });
    return NextResponse.json(
      { error: "Unable to update practice area." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, practiceArea });
}


