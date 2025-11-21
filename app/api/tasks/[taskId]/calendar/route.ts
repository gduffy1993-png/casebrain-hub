import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateTaskICS } from "@/lib/calendar";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { taskId: string } },
) {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*, cases(title)")
    .eq("id", params.taskId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const ics = generateTaskICS({
    task,
    caseTitle: task.cases?.title,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="task-${task.id}.ics"`,
    },
  });
}

