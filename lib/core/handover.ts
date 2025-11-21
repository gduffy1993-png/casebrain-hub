"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildChronology } from "./timeline";
import { generateGuidance } from "./guidance";
import type { ExtractedCaseFacts } from "@/types";

/**
 * Core Litigation Brain - Handover Pack Export
 * 
 * Generates structured case brain export for fee-earner/counsel handovers.
 * Includes summary, chronology, statement of case draft, disclosure list, next steps.
 */

export type HandoverPack = {
  caseId: string;
  caseTitle: string;
  summary: {
    facts: string;
    issues: string[];
    risks: string[];
    confidence: "high" | "medium" | "low";
  };
  chronology: Array<{
    date: string;
    event: string;
    source: string;
    significance: string;
  }>;
  statementOfCase: {
    draft: string;
    confidence: "high" | "medium" | "low";
    missingElements: string[];
  };
  disclosureList: Array<{
    document: string;
    description: string;
    relevance: string;
  }>;
  nextSteps: Array<{
    step: string;
    priority: "urgent" | "high" | "medium" | "low";
    deadline?: string;
  }>;
  taskList: Array<{
    task: string;
    assigned?: string;
    dueDate?: string;
  }>;
  disclaimer: string;
};

/**
 * Generate handover pack for a case
 */
export async function generateHandoverPack(
  caseId: string,
  orgId: string,
): Promise<HandoverPack> {
  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: documents },
    { data: tasks },
    { data: riskFlags },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, name, extracted_json")
      .eq("case_id", caseId),
    supabase
      .from("tasks")
      .select("title, due_at, created_by")
      .eq("case_id", caseId)
      .eq("status", "pending"),
    supabase
      .from("risk_flags")
      .select("flag_type, severity, description")
      .eq("case_id", caseId)
      .eq("resolved", false),
  ]);

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  // Extract facts from first document
  const firstExtraction = documents?.[0]?.extracted_json as
    | ExtractedCaseFacts
    | null
    | undefined;

  if (!firstExtraction) {
    throw new Error("No extracted facts available");
  }

  // Build chronology
  const chronologyEvents = await buildChronology(caseId, orgId);

  // Generate guidance
  const guidance = generateGuidance(
    firstExtraction,
    firstExtraction.timeline,
    caseRecord.practice_area ?? undefined,
  );

  // Build statement of case draft
  const statementOfCase = buildStatementOfCase(firstExtraction, caseRecord.practice_area);

  // Build disclosure list
  const disclosureList =
    documents?.map((doc) => ({
      document: doc.name,
      description: (doc.extracted_json as { summary?: string })?.summary ?? "",
      relevance: "high" as const,
    })) ?? [];

  return {
    caseId: caseRecord.id,
    caseTitle: caseRecord.title,
    summary: {
      facts: firstExtraction.summary,
      issues: firstExtraction.keyIssues,
      risks: riskFlags?.map((f) => `${f.flag_type}: ${f.description}`) ?? [],
      confidence: guidance.confidence,
    },
    chronology: chronologyEvents.map((e) => ({
      date: e.date.toLocaleDateString("en-GB"),
      event: e.event,
      source: e.source.documentName ?? e.source.type,
      significance: e.issueSignificance ?? "",
    })),
    statementOfCase,
    disclosureList,
    nextSteps: guidance.nextSteps.map((s) => ({
      step: s.step,
      priority: s.priority,
      deadline: s.deadline?.toLocaleDateString("en-GB"),
    })),
    taskList:
      tasks?.map((t) => ({
        task: t.title,
        assigned: t.created_by ?? undefined,
        dueDate: t.due_at ? new Date(t.due_at).toLocaleDateString("en-GB") : undefined,
      })) ?? [],
    disclaimer:
      "This handover pack is generated from extracted evidence and does not replace professional legal judgment. All facts, dates, and recommendations should be verified independently. This is not legal advice.",
  };
}

/**
 * Build statement of case draft from extracted facts
 */
function buildStatementOfCase(
  facts: ExtractedCaseFacts,
  practiceArea?: string | null,
): HandoverPack["statementOfCase"] {
  const parties = facts.parties.map((p) => `${p.name} (${p.role})`).join(", ");
  const keyDates = facts.dates
    .map((d) => `${d.label}: ${new Date(d.isoDate).toLocaleDateString("en-GB")}`)
    .join("; ");

  let draft = `STATEMENT OF CASE\n\n`;
  draft += `Parties: ${parties}\n\n`;
  draft += `Key Dates: ${keyDates}\n\n`;
  draft += `Summary of Facts:\n${facts.summary}\n\n`;
  draft += `Key Issues:\n${facts.keyIssues.map((i) => `- ${i}`).join("\n")}\n\n`;

  if (practiceArea === "housing_disrepair") {
    draft += `[Housing Disrepair specific elements to be added]\n`;
  } else if (practiceArea === "pi" || practiceArea === "clinical_negligence") {
    draft += `[PI/Clinical Neg specific elements to be added]\n`;
  }

  const missingElements: string[] = [];
  if (!facts.parties.find((p) => p.role === "defendant")) {
    missingElements.push("Defendant details");
  }
  if (facts.amounts.length === 0) {
    missingElements.push("Quantum/damages");
  }

  return {
    draft,
    confidence: missingElements.length === 0 ? "high" : "medium",
    missingElements,
  };
}

/**
 * Export handover pack as JSON (can be converted to PDF/Word later)
 */
export async function exportHandoverPack(
  caseId: string,
  orgId: string,
  format: "json" | "markdown" = "json",
): Promise<string> {
  const pack = await generateHandoverPack(caseId, orgId);

  if (format === "markdown") {
    return formatHandoverPackAsMarkdown(pack);
  }

  return JSON.stringify(pack, null, 2);
}

function formatHandoverPackAsMarkdown(pack: HandoverPack): string {
  let md = `# Case Handover Pack: ${pack.caseTitle}\n\n`;
  md += `**Case ID:** ${pack.caseId}\n\n`;

  md += `## Summary\n\n`;
  md += `**Facts:** ${pack.summary.facts}\n\n`;
  md += `**Key Issues:**\n${pack.summary.issues.map((i) => `- ${i}`).join("\n")}\n\n`;
  md += `**Risks:**\n${pack.summary.risks.map((r) => `- ${r}`).join("\n")}\n\n`;

  md += `## Chronology\n\n`;
  md += `| Date | Event | Source | Significance |\n`;
  md += `|------|-------|--------|--------------|\n`;
  pack.chronology.forEach((e) => {
    md += `| ${e.date} | ${e.event} | ${e.source} | ${e.significance} |\n`;
  });
  md += `\n`;

  md += `## Statement of Case (Draft)\n\n`;
  md += `\`\`\`\n${pack.statementOfCase.draft}\n\`\`\`\n\n`;
  if (pack.statementOfCase.missingElements.length > 0) {
    md += `**Missing Elements:** ${pack.statementOfCase.missingElements.join(", ")}\n\n`;
  }

  md += `## Disclosure List\n\n`;
  pack.disclosureList.forEach((d) => {
    md += `- **${d.document}**: ${d.description}\n`;
  });
  md += `\n`;

  md += `## Next Steps\n\n`;
  pack.nextSteps.forEach((s) => {
    md += `- **[${s.priority.toUpperCase()}]** ${s.step}${s.deadline ? ` (Due: ${s.deadline})` : ""}\n`;
  });
  md += `\n`;

  md += `## Task List\n\n`;
  pack.taskList.forEach((t) => {
    md += `- ${t.task}${t.assigned ? ` (Assigned: ${t.assigned})` : ""}${t.dueDate ? ` (Due: ${t.dueDate})` : ""}\n`;
  });
  md += `\n`;

  md += `---\n\n`;
  md += `**Disclaimer:** ${pack.disclaimer}\n`;

  return md;
}

