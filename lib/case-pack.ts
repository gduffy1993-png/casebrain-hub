/**
 * Case Pack Builder
 * 
 * Generates a comprehensive case pack/report by aggregating data from
 * all existing CaseBrain brains:
 * - Case details
 * - Timeline
 * - Bundle analysis (if exists)
 * - Issues map
 * - Contradictions
 * - Risk flags & limitation
 * - Next steps
 * - Opponent activity
 * - Client update draft
 */

import { getSupabaseAdminClient } from "./supabase";
import { calculateNextStep } from "./next-step";
import { buildOpponentActivitySnapshot } from "./opponent-radar";
import { buildClientUpdate } from "./client-update";
import { 
  getBundleStatus, 
  buildBundleOverview, 
  buildBundleTOC, 
  buildBundleTimeline,
  buildIssuesMap,
  findContradictions,
} from "./bundle-navigator";
import { calculateLimitation } from "./core/limitation";
import type {
  CasePackMeta,
  CasePackSection,
  CasePackSectionType,
  RiskFlag,
  Severity,
} from "./types/casebrain";

/**
 * Build a complete case pack for PDF export
 */
export async function buildCasePack(
  caseId: string,
  orgId: string,
  userId: string,
): Promise<CasePackMeta> {
  const supabase = getSupabaseAdminClient();
  const sections: CasePackSection[] = [];

  // 1. Fetch case core details
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, created_at, updated_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!caseData) {
    throw new Error("Case not found");
  }

  // 2. Fetch documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, type, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  // 3. Fetch risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("id, flag_type, severity, description, resolved, detected_at")
    .eq("case_id", caseId)
    .eq("resolved", false);

  // 4. Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, is_complete, due_at, created_at")
    .eq("case_id", caseId)
    .order("due_at", { ascending: true });

  // 5. Fetch letters
  const { data: letters } = await supabase
    .from("letters")
    .select("id, template_id, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  // === Build Sections ===

  // Section: Case Overview
  sections.push(buildOverviewSection(caseData, documents ?? [], tasks ?? [], letters ?? []));

  // Section: Timeline
  const timelineSection = await buildTimelineSection(caseId, documents ?? []);
  sections.push(timelineSection);

  // Section: Bundle (if exists)
  const bundle = await getBundleStatus(caseId, orgId);
  if (bundle && bundle.status === "completed") {
    const bundleSection = await buildBundleSection(bundle.id, bundle.bundleName);
    sections.push(bundleSection);

    // Section: Issues Map (from bundle)
    const issuesSection = await buildIssuesSection(bundle.id);
    sections.push(issuesSection);

    // Section: Contradictions (from bundle)
    const contradictionsSection = await buildContradictionsSection(bundle.id);
    sections.push(contradictionsSection);
  }

  // Section: Risks & Limitation (enhanced with Awaab analysis for housing)
  const risksSection = await buildRisksSection(caseData, riskFlags ?? [], caseId, orgId);
  sections.push(risksSection);

  // Section: Missing Evidence
  const missingEvidenceSection = await buildMissingEvidenceSection(caseId, caseData.practice_area ?? "general", documents ?? []);
  sections.push(missingEvidenceSection);

  // Section: Next Steps
  const nextStepsSection = await buildNextStepsSection(caseId, caseData, riskFlags ?? [], documents ?? []);
  sections.push(nextStepsSection);

  // Section: Opponent Activity
  try {
    const opponentSection = await buildOpponentSection(caseId, orgId);
    sections.push(opponentSection);
  } catch {
    // Opponent activity may not be available
  }

  // Section: Draft Client Update
  try {
    const clientUpdateSection = await buildClientUpdateSection(caseId, orgId);
    sections.push(clientUpdateSection);
  } catch {
    // Client update may fail if no activity
  }

  return {
    caseId,
    caseTitle: caseData.title,
    practiceArea: caseData.practice_area ?? "General",
    generatedAt: new Date().toISOString(),
    generatedByUserId: userId,
    sections: sections.filter(s => !s.isEmpty),
  };
}

// =============================================================================
// Section Builders
// =============================================================================

function buildOverviewSection(
  caseData: { title: string; summary?: string; practice_area?: string; created_at: string },
  documents: Array<{ id: string }>,
  tasks: Array<{ id: string; is_complete: boolean }>,
  letters: Array<{ id: string }>,
): CasePackSection {
  const completedTasks = tasks.filter(t => t.is_complete).length;
  const pendingTasks = tasks.filter(t => !t.is_complete).length;

  const content = `
CASE: ${caseData.title}
Practice Area: ${caseData.practice_area ?? "Not specified"}
Created: ${new Date(caseData.created_at).toLocaleDateString("en-GB")}

SUMMARY:
${caseData.summary ?? "No case summary available."}

CASE STATISTICS:
• Documents on file: ${documents.length}
• Letters drafted: ${letters.length}
• Tasks completed: ${completedTasks}
• Tasks pending: ${pendingTasks}
`.trim();

  return {
    id: "overview",
    type: "OVERVIEW",
    title: "Case Overview",
    content,
    isEmpty: false,
  };
}

async function buildTimelineSection(
  caseId: string,
  documents: Array<{ name: string; type?: string; created_at: string }>,
): Promise<CasePackSection> {
  // Extract dates from documents (simplified)
  const events: Array<{ date: string; event: string }> = [];

  documents.forEach(doc => {
    events.push({
      date: new Date(doc.created_at).toLocaleDateString("en-GB"),
      event: `Document uploaded: ${doc.name}`,
    });
  });

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  const content = events.length > 0
    ? events.map(e => `${e.date} - ${e.event}`).join("\n")
    : "No timeline events recorded.";

  return {
    id: "timeline",
    type: "TIMELINE",
    title: "Key Dates & Timeline",
    description: "Chronological events in this case",
    content,
    isEmpty: events.length === 0,
  };
}

async function buildBundleSection(bundleId: string, bundleName: string): Promise<CasePackSection> {
  const supabase = getSupabaseAdminClient();
  const overview = await buildBundleOverview(bundleId);
  const toc = await buildBundleTOC(bundleId);

  let content = `BUNDLE: ${bundleName}\n`;
  
  if (overview) {
    content += `Total Pages: ${overview.totalPages}\n`;
    content += `Status: ${overview.status}\n\n`;
    
    if (Object.keys(overview.docTypeCounts).length > 0) {
      content += "DOCUMENT TYPES:\n";
      Object.entries(overview.docTypeCounts).forEach(([type, count]) => {
        content += `• ${type}: ${count}\n`;
      });
      content += "\n";
    }

    if (overview.summary) {
      content += `SUMMARY:\n${overview.summary.slice(0, 500)}...\n\n`;
    }
  }

  if (toc.length > 0) {
    content += "\nTABLE OF CONTENTS:\n";
    toc.forEach((section, idx) => {
      content += `${idx + 1}. ${section.title} (Pages ${section.pageStart}-${section.pageEnd})\n`;
      if (section.summary) {
        content += `   ${section.summary.substring(0, 80)}...\n`;
      }
    });
  }

  // Add key statistics
  if (overview) {
    content += `\n\nKEY STATISTICS:\n`;
    content += `• Issues identified: ${overview.issueCount}\n`;
    content += `• Key dates extracted: ${overview.keyDatesCount}\n`;
    if (overview.contradictionCount > 0) {
      content += `• Contradictions found: ${overview.contradictionCount}\n`;
    }
  }

  return {
    id: "bundle",
    type: "BUNDLE",
    title: "Bundle Overview & Contents",
    description: "Analysis of the trial bundle",
    content,
    isEmpty: !overview,
  };
}

async function buildIssuesSection(bundleId: string): Promise<CasePackSection> {
  const issues = await buildIssuesMap(bundleId);

  let content = "";
  
  if (issues.length > 0) {
    issues.forEach((issue, idx) => {
      content += `${idx + 1}. ${issue.issue}\n`;
      content += `   Type: ${issue.type} | Strength: ${issue.overallStrength}\n`;
      content += `   Supporting sections: ${issue.supportingSections.length}\n\n`;
    });
  } else {
    content = "No issues extracted from bundle analysis.";
  }

  return {
    id: "issues",
    type: "ISSUES",
    title: "Issues Map",
    description: "Key legal issues identified from bundle analysis",
    content,
    isEmpty: issues.length === 0,
  };
}

async function buildContradictionsSection(bundleId: string): Promise<CasePackSection> {
  const contradictions = await findContradictions(bundleId);

  let content = "";

  if (contradictions.length > 0) {
    content += `⚠️ ${contradictions.length} POTENTIAL CONTRADICTION(S) DETECTED:\n\n`;
    
    contradictions.forEach((c, idx) => {
      content += `${idx + 1}. ${c.description}\n`;
      content += `   Confidence: ${c.confidence}\n`;
      content += `   Impact: ${c.potentialImpact}\n`;
      content += `   Sections involved:\n`;
      c.sectionsInvolved.forEach(s => {
        content += `     - Pages ${s.pageStart}-${s.pageEnd}: ${s.position}\n`;
      });
      content += "\n";
    });
  } else {
    content = "✓ No contradictions detected. Bundle appears internally consistent.";
  }

  return {
    id: "contradictions",
    type: "CONTRADICTIONS",
    title: "Potential Contradictions",
    description: "Conflicting statements identified in bundle",
    content,
    isEmpty: contradictions.length === 0,
  };
}

async function buildRisksSection(
  caseData: { practice_area?: string; created_at: string },
  riskFlags: Array<{ flag_type: string; severity: string; description: string }>,
  caseId: string,
  orgId: string,
): Promise<CasePackSection> {
  const supabase = getSupabaseAdminClient();
  // Calculate limitation
  const practiceAreaForLimitation = caseData.practice_area === "housing_disrepair" 
    ? "housing" 
    : caseData.practice_area === "pi" 
      ? "pi_rta" 
      : "other";

  const limitationResult = calculateLimitation({
    incidentDate: caseData.created_at,
    practiceArea: practiceAreaForLimitation as "housing" | "pi_rta" | "pi_general" | "clin_neg" | "other",
  });

  let content = "LIMITATION STATUS:\n";
  if (limitationResult.limitationDate) {
    content += `• Limitation Date: ${limitationResult.limitationDate}\n`;
    content += `• Days Remaining: ${limitationResult.daysRemaining ?? "Unknown"}\n`;
    content += `• Severity: ${limitationResult.severity.toUpperCase()}\n`;
    if (limitationResult.isExpired) {
      content += `⚠️ WARNING: Limitation period may have expired!\n`;
    }
  } else {
    content += "• Limitation calculation unavailable\n";
  }

  content += "\nOUTSTANDING RISK FLAGS:\n";
  
  if (riskFlags.length > 0) {
    // Group by severity
    const critical = riskFlags.filter(r => r.severity === "critical");
    const high = riskFlags.filter(r => r.severity === "high");
    const medium = riskFlags.filter(r => r.severity === "medium");
    const low = riskFlags.filter(r => r.severity === "low");

    if (critical.length > 0) {
      content += `\n🔴 CRITICAL (${critical.length}):\n`;
      critical.forEach(r => content += `  • ${r.description}\n`);
    }
    if (high.length > 0) {
      content += `\n🟠 HIGH (${high.length}):\n`;
      high.forEach(r => content += `  • ${r.description}\n`);
    }
    if (medium.length > 0) {
      content += `\n🟡 MEDIUM (${medium.length}):\n`;
      medium.forEach(r => content += `  • ${r.description}\n`);
    }
    if (low.length > 0) {
      content += `\n🟢 LOW (${low.length}):\n`;
      low.forEach(r => content += `  • ${r.description}\n`);
    }
  } else {
    content += "✓ No outstanding risk flags.\n";
  }

  // Add Awaab's Law analysis for housing cases
  if (caseData.practice_area === "housing_disrepair") {
    try {
      const { data: housingCase } = await supabase
        .from("housing_cases")
        .select("first_report_date, landlord_type")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      if (housingCase && (housingCase.landlord_type === "social" || housingCase.landlord_type === "council")) {
        const { checkAwaabsLaw } = await import("./housing/compliance");
        if (housingCase.first_report_date) {
          const firstReport = new Date(housingCase.first_report_date);
          const awaabChecks = checkAwaabsLaw(firstReport, null, null, null, true);
          
          const awaabBreaches = awaabChecks.filter(c => !c.passed);
          if (awaabBreaches.length > 0) {
            content += `\n\nAWAAB'S LAW ANALYSIS:\n`;
            content += `Social landlord detected. Awaab's Law applies.\n\n`;
            awaabBreaches.forEach(check => {
              content += `• [${check.severity.toUpperCase()}] ${check.rule}: ${check.details}\n`;
            });
            content += `\nStatutory deadlines:\n`;
            content += `- Investigation: 14 days from first report\n`;
            content += `- Work start: 7 days after investigation\n`;
            content += `- Completion: Within reasonable time (28 days urgent, 90 days standard)\n`;
          }
        }
      }
    } catch (err) {
      console.error("[case-pack] Error adding Awaab analysis:", err);
    }
  }

  return {
    id: "risks",
    type: "RISKS",
    title: "Risks & Limitation",
    description: "Risk assessment and limitation status",
    content,
    isEmpty: false,
  };
}

async function buildMissingEvidenceSection(
  caseId: string,
  practiceArea: string,
  documents: Array<{ name: string; type?: string }>,
): Promise<CasePackSection> {
  const { findMissingEvidence } = await import("./missing-evidence");
  const missingEvidence = findMissingEvidence(caseId, practiceArea, documents);

  if (missingEvidence.length === 0) {
    return {
      id: "missing-evidence",
      type: "EVIDENCE",
      title: "Missing Evidence",
      content: "All required evidence appears to be present.",
      isEmpty: false,
    };
  }

  // Group by category
  const byCategory = missingEvidence.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof missingEvidence>);

  let content = "MISSING EVIDENCE:\n\n";
  for (const [category, items] of Object.entries(byCategory)) {
    content += `${category}:\n`;
    items.forEach(item => {
      content += `• [${item.priority}] ${item.label}: ${item.reason}\n`;
      if (item.suggestedAction) {
        content += `  Suggested: ${item.suggestedAction}\n`;
      }
    });
    content += "\n";
  }

  return {
    id: "missing-evidence",
    type: "EVIDENCE",
    title: "Missing Evidence",
    content: content.trim(),
    isEmpty: false,
  };
}

async function buildNextStepsSection(
  caseId: string,
  caseData: { practice_area?: string },
  riskFlags: Array<{ severity: string; flag_type: string; description: string; resolved: boolean; detected_at: string }>,
  documents: Array<{ name: string; type?: string }>,
): Promise<CasePackSection> {
  // Convert risk flags to the format expected by calculateNextStep
  const convertedRiskFlags: RiskFlag[] = riskFlags.map(rf => ({
    id: rf.flag_type,
    caseId,
    severity: rf.severity.toUpperCase() as Severity,
    type: rf.flag_type as RiskFlag["type"],
    code: rf.flag_type.toUpperCase(),
    title: rf.flag_type.replace(/_/g, " "),
    message: rf.description,
    source: "risk_detection",
    status: rf.resolved ? "resolved" : "outstanding",
    createdAt: rf.detected_at,
  }));

  const nextStep = calculateNextStep({
    caseId,
    practiceArea: caseData.practice_area ?? "general",
    riskFlags: convertedRiskFlags,
    missingEvidence: [],
    pendingChasers: [],
    hasRecentAttendanceNote: true,
    daysSinceLastUpdate: 7,
  });

  let content = "";

  if (nextStep) {
    content += `PRIORITY ACTION:\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    content += `${nextStep.title}\n\n`;
    content += `${nextStep.description}\n\n`;
    content += `Reason: ${nextStep.reason}\n`;
    content += `Priority: ${nextStep.priority}\n`;
    if (nextStep.dueDate) {
      content += `Due: ${new Date(nextStep.dueDate).toLocaleDateString("en-GB")}\n`;
    }
  } else {
    content = "✓ No urgent actions required at this time.";
  }

  return {
    id: "next-steps",
    type: "NEXT_STEPS",
    title: "Next Steps & Actions",
    description: "Priority actions for this case",
    content,
    isEmpty: !nextStep,
  };
}

async function buildOpponentSection(caseId: string, orgId: string): Promise<CasePackSection> {
  const snapshot = await buildOpponentActivitySnapshot(caseId, orgId);

  let content = `OPPONENT ACTIVITY STATUS: ${snapshot.status.replace(/_/g, " ")}\n\n`;
  content += `${snapshot.statusMessage}\n\n`;

  if (snapshot.lastLetterSentAt) {
    content += `Last letter sent: ${new Date(snapshot.lastLetterSentAt).toLocaleDateString("en-GB")}\n`;
  }
  if (snapshot.lastOpponentReplyAt) {
    content += `Last opponent reply: ${new Date(snapshot.lastOpponentReplyAt).toLocaleDateString("en-GB")}\n`;
  }
  if (snapshot.averageResponseDays) {
    content += `Average response time: ${snapshot.averageResponseDays} days\n`;
  }
  if (snapshot.currentSilenceDays > 0) {
    content += `Current silence: ${snapshot.currentSilenceDays} days\n`;
  }

  return {
    id: "opponent",
    type: "OPPONENT_ACTIVITY",
    title: "Opponent Activity",
    description: "Opponent response patterns",
    content,
    isEmpty: snapshot.status === "NO_DATA",
  };
}

async function buildClientUpdateSection(caseId: string, orgId: string): Promise<CasePackSection> {
  const update = await buildClientUpdate(caseId, orgId);

  return {
    id: "client-update",
    type: "CLIENT_UPDATE",
    title: "Draft Client Update",
    description: "Auto-generated client communication draft",
    content: update.body,
    isEmpty: !update.body,
  };
}

