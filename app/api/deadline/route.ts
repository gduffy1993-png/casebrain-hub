import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateDeadline } from "@/lib/deadlines";
import { appendAuditLog } from "@/lib/audit";
import { createTaskForDeadline } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner", "solicitor", "paralegal"]);
  assertRateLimit(`deadline:${userId}`, { limit: 20, windowMs: 60_000 });

  const body = await request.json();
  const caseId = body?.caseId as string | undefined;
  const businessDays = Number(body?.businessDays ?? 0);
  const rule = (body?.rule as string | undefined) ?? "CPR";

  if (!caseId || Number.isNaN(businessDays) || businessDays <= 0) {
    return NextResponse.json(
      { error: "caseId and businessDays are required" },
      { status: 400 },
    );
  }

  const startDate = body?.startDate
    ? new Date(body.startDate)
    : new Date();

  const calculation = calculateDeadline(startDate, businessDays, rule);

  const supabase = getSupabaseAdminClient();
  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id, org_id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { data: deadline, error } = await supabase
    .from("deadlines")
    .insert({
      case_id: caseId,
      title: body?.title ?? `Deadline (${rule})`,
      due_date: calculation.dueDate.toISOString(),
      business_days: calculation.businessDays,
    })
    .select("id, due_date, business_days")
    .maybeSingle();

  if (error || !deadline) {
    return NextResponse.json(
      { error: "Failed to create deadline" },
      { status: 500 },
    );
  }

  await appendAuditLog({
    caseId,
    userId,
    action: "deadline_created",
    details: {
      deadlineId: deadline.id,
      dueDate: deadline.due_date,
      businessDays: deadline.business_days,
    },
  });

  await createTaskForDeadline({
    caseId,
    orgId,
    createdBy: userId,
    deadlineTitle: body?.title ?? `Deadline (${rule})`,
    dueDate: calculation.dueDate,
  });

  return NextResponse.json({
    id: deadline.id,
    dueDate: deadline.due_date,
    businessDays: deadline.business_days,
  });
}

