import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { completeTask } from "@/lib/tasks";
import type { Task } from "@/types";

export const runtime = "nodejs";

type UpdateTaskPayload = {
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  assignedTo?: string;
  priority?: "low" | "medium" | "high" | "urgent";
};

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } },
) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`tasks:update:${userId}`, { limit: 30, windowMs: 60_000 });

  const payload = (await request.json()) as UpdateTaskPayload;
  
  if (!payload.status && !payload.assignedTo && !payload.priority) {
    return NextResponse.json({ error: "At least one field to update is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  
  const updateData: Record<string, unknown> = {};
  if (payload.status) updateData.status = payload.status;
  if (payload.assignedTo !== undefined) updateData.assigned_to = payload.assignedTo || null;
  if (payload.priority) updateData.priority = payload.priority;

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", params.taskId)
    .eq("org_id", orgId)
    .select("*")
    .maybeSingle();

  if (error || !task) {
    return NextResponse.json(
      { error: error?.message ?? "Task not found" },
      { status: 404 },
    );
  }

  if (payload.status === "completed") {
    await completeTask(task as Task);
  }

  return NextResponse.json({ task });
}

