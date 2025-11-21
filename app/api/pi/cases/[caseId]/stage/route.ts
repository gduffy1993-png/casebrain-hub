import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PiCaseStage } from "@/types";
import { evaluatePiRisks } from "@/lib/pi/risk";

export const runtime = "nodejs";

type StagePayload = {
  stage: PiCaseStage;
};

const ALLOWED_STAGES: PiCaseStage[] = [
  "intake",
  "investigation",
  "liability",
  "quantum",
  "settlement",
  "closed",
];

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { caseId: string };
  },
) {
  const { caseId } = params;
  const { orgId, userId } = await requireRole(["owner", "solicitor", "paralegal"]);
  const body = (await request.json()) as StagePayload;

  if (!ALLOWED_STAGES.includes(body.stage)) {
    return NextResponse.json(
      { error: "Invalid stage supplied." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("pi_cases")
    .update({ stage: body.stage })
    .eq("id", caseId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:stage] Failed to update stage", { error, caseId, stage: body.stage });
    return NextResponse.json(
      { error: "Unable to update stage." },
      { status: 500 },
    );
  }

  await evaluatePiRisks({ caseId, orgId, userId, trigger: "stage_update" });

  return NextResponse.json({ ok: true });
}


