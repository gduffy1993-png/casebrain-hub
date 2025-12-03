/**
 * Client Update Generator
 * 
 * Generates professional client update emails using existing case data:
 * - Tasks completed
 * - Letters sent
 * - Documents added
 * - Risks resolved/raised
 * - Next steps
 * - Limitation status
 */

import { getSupabaseAdminClient } from "./supabase";
import type { ClientUpdateDraft } from "./types/casebrain";

type CaseActivityData = {
  caseId: string;
  caseTitle: string;
  clientName?: string;
  practiceArea: string;
  // Activity counts
  tasksCompleted: Array<{ title: string; completedAt: string }>;
  lettersSent: Array<{ subject: string; sentAt: string; recipient: string }>;
  documentsAdded: Array<{ name: string; addedAt: string }>;
  // Risk changes
  risksResolved: Array<{ title: string }>;
  risksRaised: Array<{ title: string; severity: string }>;
  // Key dates
  limitationDate?: string;
  limitationDays?: number;
  nextStep?: string;
  nextStepDue?: string;
  // Previous update
  lastUpdateDate?: string;
};

/**
 * Gather all activity data for generating a client update
 */
async function gatherCaseActivity(
  caseId: string,
  orgId: string,
  sinceDays: number = 30
): Promise<CaseActivityData | null> {
  const supabase = getSupabaseAdminClient();
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);
  const sinceDateISO = sinceDate.toISOString();

  // Get case details
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, practice_area, client_update_last_generated_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!caseData) return null;

  // Get completed tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, completed_at")
    .eq("case_id", caseId)
    .eq("is_complete", true)
    .gte("completed_at", sinceDateISO)
    .order("completed_at", { ascending: false });

  // Get sent letters
  const { data: letters } = await supabase
    .from("letters")
    .select("template_id, created_at")
    .eq("case_id", caseId)
    .gte("created_at", sinceDateISO)
    .order("created_at", { ascending: false });

  // Get recently added documents
  const { data: documents } = await supabase
    .from("documents")
    .select("name, created_at")
    .eq("case_id", caseId)
    .gte("created_at", sinceDateISO)
    .order("created_at", { ascending: false });

  // Get risk flags (resolved vs new)
  const { data: resolvedRisks } = await supabase
    .from("risk_flags")
    .select("flag_type, description")
    .eq("case_id", caseId)
    .eq("resolved", true)
    .gte("resolved_at", sinceDateISO);

  const { data: newRisks } = await supabase
    .from("risk_flags")
    .select("flag_type, description, severity")
    .eq("case_id", caseId)
    .eq("resolved", false)
    .gte("detected_at", sinceDateISO);

  return {
    caseId,
    caseTitle: caseData.title,
    practiceArea: caseData.practice_area ?? "general",
    tasksCompleted: (tasks ?? []).map(t => ({
      title: t.title,
      completedAt: t.completed_at,
    })),
    lettersSent: (letters ?? []).map(l => ({
      subject: l.template_id ?? "Letter",
      sentAt: l.created_at,
      recipient: "Opponent",
    })),
    documentsAdded: (documents ?? []).map(d => ({
      name: d.name,
      addedAt: d.created_at,
    })),
    risksResolved: (resolvedRisks ?? []).map(r => ({
      title: r.description ?? r.flag_type,
    })),
    risksRaised: (newRisks ?? []).map(r => ({
      title: r.description ?? r.flag_type,
      severity: r.severity,
    })),
    lastUpdateDate: caseData.client_update_last_generated_at,
  };
}

/**
 * Build the client update email using AI
 */
export async function buildClientUpdate(
  caseId: string,
  orgId: string,
): Promise<ClientUpdateDraft> {
  const activity = await gatherCaseActivity(caseId, orgId);

  if (!activity) {
    throw new Error("Case not found or access denied");
  }

  // Build the update content
  const emailBody = generateUpdateEmail(activity);

  return {
    caseId,
    subject: `Update on your case: ${activity.caseTitle}`,
    body: emailBody,
    generatedAt: new Date().toISOString(),
    dataUsed: {
      tasksCompleted: activity.tasksCompleted.length,
      lettersSent: activity.lettersSent.length,
      documentsAdded: activity.documentsAdded.length,
      risksResolved: activity.risksResolved.length,
      risksRaised: activity.risksRaised.length,
    },
  };
}

/**
 * Generate the email content (template-based, no AI call needed for V1)
 */
function generateUpdateEmail(activity: CaseActivityData): string {
  const lines: string[] = [];
  const now = new Date();
  const monthYear = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  // Header
  lines.push(`Dear Client,`);
  lines.push(``);
  lines.push(`Please find below an update on your matter: ${activity.caseTitle}.`);
  lines.push(``);

  // Progress section
  const hasProgress = 
    activity.tasksCompleted.length > 0 || 
    activity.lettersSent.length > 0 || 
    activity.documentsAdded.length > 0;

  if (hasProgress) {
    lines.push(`**Progress This Month**`);
    lines.push(``);

    if (activity.tasksCompleted.length > 0) {
      lines.push(`We have completed ${activity.tasksCompleted.length} action(s) on your file:`);
      activity.tasksCompleted.slice(0, 5).forEach(t => {
        lines.push(`• ${t.title}`);
      });
      if (activity.tasksCompleted.length > 5) {
        lines.push(`• ...and ${activity.tasksCompleted.length - 5} more`);
      }
      lines.push(``);
    }

    if (activity.lettersSent.length > 0) {
      lines.push(`We have sent ${activity.lettersSent.length} correspondence(s) on your behalf.`);
      lines.push(``);
    }

    if (activity.documentsAdded.length > 0) {
      lines.push(`We have received and reviewed ${activity.documentsAdded.length} new document(s) for your file.`);
      lines.push(``);
    }
  } else {
    lines.push(`**Current Status**`);
    lines.push(``);
    lines.push(`Your case continues to progress. We are monitoring the matter and will be in touch with any significant developments.`);
    lines.push(``);
  }

  // Risk updates
  if (activity.risksResolved.length > 0) {
    lines.push(`**Positive Developments**`);
    lines.push(``);
    lines.push(`We have successfully addressed ${activity.risksResolved.length} issue(s) that were previously of concern.`);
    lines.push(``);
  }

  if (activity.risksRaised.length > 0) {
    lines.push(`**Matters Requiring Attention**`);
    lines.push(``);
    lines.push(`We have identified ${activity.risksRaised.length} new matter(s) that we are actively managing. We will discuss these with you at our next review if necessary.`);
    lines.push(``);
  }

  // Limitation reminder if applicable
  if (activity.limitationDays !== undefined && activity.limitationDays <= 180) {
    lines.push(`**Important Date**`);
    lines.push(``);
    if (activity.limitationDays <= 90) {
      lines.push(`Please note that there is a time limit on your claim. We have ${activity.limitationDays} days remaining before the deadline. We are taking appropriate steps to protect your position.`);
    } else {
      lines.push(`For your information, the time limit for your claim falls in approximately ${activity.limitationDays} days. There is no immediate concern, but we wanted to keep you informed.`);
    }
    lines.push(``);
  }

  // Next steps
  if (activity.nextStep) {
    lines.push(`**Next Steps**`);
    lines.push(``);
    lines.push(`Our next action will be: ${activity.nextStep}`);
    if (activity.nextStepDue) {
      lines.push(`We expect to complete this by ${new Date(activity.nextStepDue).toLocaleDateString("en-GB")}.`);
    }
    lines.push(``);
  }

  // Closing
  lines.push(`If you have any questions about the above or wish to discuss your case, please do not hesitate to contact us.`);
  lines.push(``);
  lines.push(`Kind regards,`);
  lines.push(``);
  lines.push(`[Your name]`);
  lines.push(`[Firm name]`);

  return lines.join("\n");
}

