import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateSupervisionPack } from "@/lib/housing/supervision-pack";
import { getSupabaseAdminClient } from "@/lib/supabase";
// formatHandoverPackAsMarkdown is not exported, so we'll create our own

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { userId, orgId } = await requireAuthContext();
  const { caseId } = params;

  try {
    const pack = await generateSupervisionPack(caseId, orgId);

    // Convert to markdown for export
    const markdown = formatSupervisionPackAsMarkdown(pack);

    // Save to database
    const supabase = getSupabaseAdminClient();
    const { error: saveError } = await supabase
      .from("supervisor_pack")
      .insert({
        case_id: caseId,
        org_id: orgId,
        generated_by: userId,
        pack_json: pack as any,
        pack_markdown: markdown,
      });

    if (saveError) {
      console.error("[supervision-generate] Failed to save pack", saveError);
      // Continue even if save fails
    }

    return NextResponse.json({
      pack,
      markdown,
      disclaimer:
        "This supervision pack is generated from extracted evidence and case data. It is procedural guidance only and does not constitute legal advice. All facts, dates, and recommendations should be verified independently by a qualified legal professional.",
    });
  } catch (error) {
    console.error("[supervision-generate] Error generating supervision pack", {
      error,
      caseId,
      orgId,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate supervision pack",
        disclaimer:
          "This is procedural guidance only and does not constitute legal advice.",
      },
      { status: 500 },
    );
  }
}

/**
 * Format supervision pack as markdown
 */
function formatSupervisionPackAsMarkdown(pack: any): string {
  let md = `# Supervision Pack: ${pack.caseTitle}\n\n`;
  md += `**Case ID:** ${pack.caseId}\n`;
  md += `**Generated:** ${new Date(pack.generatedAt).toLocaleDateString("en-GB")}\n\n`;

  md += `## Case Summary\n\n`;
  md += `**Practice Area:** ${pack.summary.practiceArea}\n`;
  md += `**Stage:** ${pack.summary.stage}\n`;
  md += `**Priority:** ${pack.summary.priority.toUpperCase()} (Score: ${pack.summary.priorityScore}/100)\n\n`;
  md += `**Facts:** ${pack.summary.facts}\n\n`;

  md += `## Limitation Position\n\n`;
  if (pack.limitation.limitationDate) {
    md += `**Limitation Date:** ${new Date(pack.limitation.limitationDate).toLocaleDateString("en-GB")}\n`;
    md += `**Days Remaining:** ${pack.limitation.daysRemaining ?? "N/A"}\n`;
  } else {
    md += `**Status:** Limitation date not yet calculated\n`;
  }
  md += `**Severity:** ${pack.limitation.severity.toUpperCase()}\n`;
  md += `**Status:** ${pack.limitation.status.toUpperCase()}\n`;
  md += `**Explanation:** ${pack.limitation.explanation}\n\n`;

  md += `## Hazard Position\n\n`;
  md += `**Category 1 Hazards:** ${pack.hazards.category1Hazards.join(", ") || "None"}\n`;
  md += `**Category 2 Hazards:** ${pack.hazards.category2Hazards.join(", ") || "None"}\n`;
  md += `**Unfit for Habitation:** ${pack.hazards.unfitForHabitation ? "Yes" : "No"}\n`;
  md += `**Overall Severity:** ${pack.hazards.overallSeverity.toUpperCase()}\n\n`;

  if (pack.awaabsLaw.applicable) {
    md += `## Awaab's Law Status\n\n`;
    md += `${pack.awaabsLaw.status}\n\n`;
    if (pack.awaabsLaw.enforcementChecklist.length > 0) {
      md += `**Enforcement Checklist:**\n`;
      pack.awaabsLaw.enforcementChecklist.forEach((item: any) => {
        md += `- [${item.status === "completed" ? "x" : " "}] ${item.item}${item.deadline ? ` (Deadline: ${item.deadline})` : ""}\n`;
      });
      md += `\n`;
    }
  }

  md += `## Vulnerability & Priority\n\n`;
  if (pack.vulnerability.factors.length > 0) {
    md += `**Vulnerability Factors:**\n`;
    pack.vulnerability.factors.forEach((factor: any) => {
      md += `- ${factor.description} (${factor.severity.toUpperCase()})\n`;
    });
    md += `\n`;
  }
  md += `**Cross-Risk:** ${pack.vulnerability.crossRisk ? "Yes - Health vulnerability combined with relevant hazard" : "No"}\n`;
  md += `**Recommended Urgency:** ${pack.vulnerability.recommendedUrgency.toUpperCase()}\n\n`;

  md += `## Timeline (Key Events)\n\n`;
  md += `| Date | Event | Source | Significance |\n`;
  md += `|------|-------|--------|--------------|\n`;
  pack.timeline.slice(0, 20).forEach((event: any) => {
    md += `| ${event.date} | ${event.event} | ${event.source} | ${event.significance} |\n`;
  });
  md += `\n`;

  md += `## Risk Alerts\n\n`;
  if (pack.riskAlerts.length > 0) {
    pack.riskAlerts.forEach((alert: any) => {
      md += `### ${alert.title} (${alert.severity.toUpperCase()})\n`;
      md += `${alert.message}\n\n`;
    });
  } else {
    md += `No risk alerts detected.\n\n`;
  }

  md += `## Recommended Actions\n\n`;
  pack.recommendedActions.forEach((action: any) => {
    md += `- **[${action.priority.toUpperCase()}]** ${action.action}${action.deadline ? ` (Due: ${action.deadline})` : ""}\n`;
  });
  md += `\n`;

  md += `## Outstanding Tasks\n\n`;
  if (pack.outstandingTasks.length > 0) {
    pack.outstandingTasks.forEach((task: any) => {
      md += `- ${task.task}${task.assigned ? ` (Assigned: ${task.assigned})` : ""}${task.dueDate ? ` (Due: ${task.dueDate})` : ""}\n`;
    });
  } else {
    md += `No outstanding tasks.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `**Disclaimer:** ${pack.disclaimer}\n`;

  return md;
}

