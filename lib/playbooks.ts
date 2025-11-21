import { getSupabaseAdminClient } from "./supabase";
import { generateLetterDraft } from "./ai";
import { createTaskForDeadline } from "./tasks";

type PlaybookStep =
  | { type: "task"; title: string; description?: string; dueAfterDays?: number }
  | { type: "letter"; templateId: string; notes?: string; actingFor?: "claimant" | "defendant" }
  | { type: "briefing" };

export type PlaybookDefinition = {
  key: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
};

export const BUILTIN_PLAYBOOKS: PlaybookDefinition[] = [
  {
    key: "disclosure_follow_up",
    name: "Disclosure follow-up",
    description: "Tasks and letters for chasing outstanding disclosure bundles.",
    steps: [
      { type: "task", title: "Review disclosure list", dueAfterDays: 1 },
      { type: "task", title: "Schedule witness review meeting", dueAfterDays: 3 },
      { type: "letter", templateId: "disclosure-chaser", notes: "Polite but firm reminder." },
    ],
  },
  {
    key: "pre_trial_bundle",
    name: "Pre-trial bundle preparation",
    description: "Ensure all documents are prepared and deadlines covered.",
    steps: [
      { type: "task", title: "Confirm bundle index", dueAfterDays: 2 },
      { type: "task", title: "Coordinate with counsel", dueAfterDays: 5 },
      { type: "briefing" },
    ],
  },
];

export async function runPlaybook({
  playbook,
  caseId,
  orgId,
  userId,
}: {
  playbook: PlaybookDefinition;
  caseId: string;
  orgId: string;
  userId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const logs: string[] = [];

  for (const step of playbook.steps) {
    if (step.type === "task") {
      const dueDate = step.dueAfterDays
        ? (() => {
            const date = new Date();
            date.setDate(date.getDate() + step.dueAfterDays);
            return date.toISOString();
          })()
        : null;
      await supabase.from("tasks").insert({
        org_id: orgId,
        case_id: caseId,
        title: step.title,
        description: step.description ?? playbook.description,
        created_by: userId,
        due_at: dueDate,
      });
      logs.push(`Task queued: ${step.title}`);
    }

    if (step.type === "letter") {
      const { data: caseRecord } = await supabase
        .from("cases")
        .select("summary")
        .eq("id", caseId)
        .maybeSingle();
      const { data: template } = await supabase
        .from("letterTemplates")
        .select("id, name, body_template, variables")
        .eq("id", step.templateId)
        .maybeSingle();
      if (!template) {
        logs.push(`Template ${step.templateId} not found`);
        continue;
      }
      const draft = await generateLetterDraft({
        template: {
          id: template.id,
          name: template.name,
          bodyTemplate: template.body_template,
          variables: template.variables ?? [],
        },
        facts: {
          parties: [],
          dates: [],
          amounts: [],
          claimType: "",
          summary: caseRecord?.summary ?? "",
          keyIssues: [],
          timeline: [],
        },
        notes: step.notes,
        actingFor: step.actingFor ?? "claimant",
      });
      await supabase.from("letters").insert({
        case_id: caseId,
        template_id: template.id,
        body: draft.body,
        created_by: userId,
      });
      logs.push(`Letter drafted using template ${template.name}`);
    }

    if (step.type === "briefing") {
      await supabase.from("builder_jobs").insert({
        org_id: orgId,
        created_by: userId,
        prompt: `Run daily briefing playbook for case ${caseId}`,
      });
      logs.push("Briefing job queued via builder.");
    }
  }

  return logs;
}

