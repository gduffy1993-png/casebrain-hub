import { addDays } from "date-fns";
import { getSupabaseAdminClient } from "./supabase";
import { sendTaskNotifications, buildTaskLink } from "./notifications";
import type { Task } from "@/types";

type CreateTaskForDeadlineArgs = {
  caseId: string;
  orgId: string;
  createdBy: string;
  deadlineTitle: string;
  dueDate: Date;
};

export async function createTaskForDeadline({
  caseId,
  orgId,
  createdBy,
  deadlineTitle,
  dueDate,
}: CreateTaskForDeadlineArgs) {
  const supabase = getSupabaseAdminClient();
  const reminderDueAt = addDays(dueDate, -2);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      case_id: caseId,
      org_id: orgId,
      created_by: createdBy,
      title: `Prepare for ${deadlineTitle}`,
      description: `Deadline scheduled for ${dueDate.toLocaleDateString(
        "en-GB",
      )}. Ensure documents are ready two days prior.`,
      due_at: reminderDueAt.toISOString(),
    })
    .select("id, title")
    .maybeSingle();

  if (!error && data) {
    const link = buildTaskLink(data.id);
    await sendTaskNotifications(
      orgId,
      `New automation task queued: ${data.title}`,
      link,
    );
  }
}

export async function createTaskFromBriefing({
  orgId,
  createdBy,
  summary,
}: {
  orgId: string;
  createdBy: string;
  summary: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: orgId,
      case_id: null,
      created_by: createdBy,
      title: "Review daily briefing",
      description: summary,
      due_at: new Date().toISOString(),
    })
    .select("id, title")
    .maybeSingle();

  if (!error && data) {
    const link = buildTaskLink(data.id);
    await sendTaskNotifications(
      orgId,
      `New automation task queued: ${data.title}`,
      link,
    );
  }
}

export async function completeTask(task: Task) {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("task_log")
    .insert({
      task_id: task.id,
      org_id: task.org_id,
      actor_id: task.created_by,
      event: "completed",
    })
    .select("id")
    .single();

  await sendTaskNotifications(
    task.org_id,
    `Task completed: ${task.title}`,
    buildTaskLink(task.id),
  );
}

