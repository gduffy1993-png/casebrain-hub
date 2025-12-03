/**
 * Instructions to Counsel Generator
 * 
 * Generates a comprehensive instructions document for counsel by aggregating
 * data from all existing CaseBrain brains:
 * - Key Facts
 * - Bundle analysis
 * - Issues map
 * - Contradictions
 * - Risk & limitation
 * - Opponent activity
 * - Timeline
 * - Next steps
 */

import { getSupabaseAdminClient } from "./supabase";
import { buildKeyFactsSummary } from "./key-facts";
import { buildOpponentActivitySnapshot } from "./opponent-radar";
import { 
  getBundleStatus,
  buildBundleOverview, 
  buildBundleTOC, 
  buildBundleTimeline,
  buildIssuesMap,
  findContradictions,
} from "./bundle-navigator";
import { calculateLimitation } from "./core/limitation";
import { buildOutcomeSummary, buildComplaintRiskSummary } from "./core/outcomes";
import { getPackForPracticeArea } from "./packs";
import { findMissingEvidence } from "./missing-evidence";
import type {
  InstructionsToCounselDraft,
  InstructionsToCounselSection,
} from "./types/casebrain";
import type { OutcomeSummary, ComplaintRiskSummary } from "./core/enterprise-types";

/**
 * Build a draft Instructions to Counsel document
 * 
 * @param caseId - Case ID
 * @param orgId - Organization ID
 * @param userId - User ID generating the draft
 * @param existingData - Optional: Use existing data from case page instead of fetching
 */
export async function buildInstructionsToCounselDraft(
  caseId: string,
  orgId: string,
  userId: string,
  existingData?: {
    timeline?: Array<{ date: string; label: string; description?: string }>;
    keyIssues?: Array<{ id: string; label: string; category?: string | null; severity?: string }>;
    parties?: Array<{ name: string; role?: string }>;
    documents?: Array<{ id: string; name: string; type?: string | null }>;
    caseRecord?: { title?: string | null; summary?: string | null; practice_area?: string | null };
    clientName?: string;
    opponentName?: string;
  },
): Promise<InstructionsToCounselDraft> {
  const sections: InstructionsToCounselSection[] = [];

  // 1. Get Key Facts - use existing data if provided, otherwise fetch
  let keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>;
  
  if (existingData?.clientName || existingData?.opponentName || existingData?.parties) {
    // Use existing data from case page
    console.log(`[Instructions] Using existing data from case page`);
    
    // Extract parties from existing data
    let clientName = existingData.clientName;
    let opponentName = existingData.opponentName;
    
    if (!clientName || !opponentName) {
      for (const party of existingData.parties ?? []) {
        const role = (party.role ?? "").toLowerCase();
        if (role.includes("claimant") || role.includes("tenant") || role.includes("client")) {
          if (!clientName) clientName = party.name;
        }
        if (role.includes("defendant") || role.includes("landlord") || role.includes("opponent")) {
          if (!opponentName) opponentName = party.name;
        }
      }
    }
    
    // Build key dates from timeline
    const keyDates = (existingData.timeline ?? []).map(event => ({
      label: event.label,
      date: event.date,
      isPast: new Date(event.date) < new Date(),
      isUrgent: false,
    }));
    
    // Build primary issues from key issues
    const primaryIssues = (existingData.keyIssues ?? []).map(issue => issue.label);
    
    keyFacts = {
      caseId,
      clientName: clientName ?? undefined,
      opponentName: opponentName ?? undefined,
      courtName: undefined,
      claimType: undefined,
      causeOfAction: undefined,
      stage: "pre_action",
      fundingType: "private",
      approxValue: undefined,
      headlineSummary: existingData.caseRecord?.summary ?? undefined,
      whatClientWants: undefined,
      keyDates,
      mainRisks: [],
      primaryIssues,
      nextStepsBrief: undefined,
    };
  } else {
    // Fallback: fetch key facts if not provided
    try {
      console.log(`[Instructions] Building key facts for case ${caseId}`);
      keyFacts = await buildKeyFactsSummary(caseId, orgId);
      console.log(`[Instructions] Key facts built: ${keyFacts.clientName ?? "unknown client"}`);
    } catch (error) {
      console.error("[Instructions] Error building key facts:", error);
      // Create a minimal fallback keyFacts object matching KeyFactsSummary type
      keyFacts = {
        caseId,
        clientName: undefined,
        opponentName: undefined,
        courtName: undefined,
        claimType: undefined,
        causeOfAction: undefined,
        stage: "pre_action",
        fundingType: "private",
        approxValue: undefined,
        headlineSummary: undefined,
        whatClientWants: undefined,
        keyDates: [],
        mainRisks: [],
        primaryIssues: [],
        nextStepsBrief: undefined,
      };
    }
  }

  // 2. Section: Parties & Case Overview
  try {
    sections.push(buildPartiesSection(keyFacts));
  } catch (error) {
    console.error("[Instructions] Error building parties section:", error);
    sections.push({
      id: "parties",
      title: "Parties & Case Overview",
      content: "Case data temporarily unavailable. Please refer to case file.",
    });
  }

  // 3. Section: Instructions & Client Objective
  try {
    sections.push(buildInstructionsSection(keyFacts));
  } catch (error) {
    console.error("[Instructions] Error building instructions section:", error);
    sections.push({
      id: "instructions",
      title: "Instructions & Client Objective",
      content: "Instructions to be confirmed.",
    });
  }

  // 4. Get bundle data if exists
  let bundleOverview = null;
  let bundleTOC: Awaited<ReturnType<typeof buildBundleTOC>> = [];
  let bundleTimeline: Awaited<ReturnType<typeof buildBundleTimeline>> = [];
  let issuesMap: Awaited<ReturnType<typeof buildIssuesMap>> = [];
  let contradictions: Awaited<ReturnType<typeof findContradictions>> = [];

  try {
    const bundle = await getBundleStatus(caseId, orgId);
    if (bundle && bundle.status === "completed") {
      console.log(`[Instructions] Bundle found, building bundle sections`);
      bundleOverview = await buildBundleOverview(bundle.id);
      bundleTOC = await buildBundleTOC(bundle.id);
      bundleTimeline = await buildBundleTimeline(bundle.id);
      issuesMap = await buildIssuesMap(bundle.id);
      contradictions = await findContradictions(bundle.id);
    }
  } catch (error) {
    console.error("[Instructions] Error building bundle sections:", error);
    // Continue without bundle data
  }

  // 5. Section: Background Facts & Chronology
  // Use existing timeline if provided, otherwise use bundle timeline
  const timelineToUse = existingData?.timeline 
    ? existingData.timeline.map(t => ({
        date: t.date,
        event: t.description ?? t.label,
        source: "case_documents",
        pageRef: undefined,
        importance: "medium" as const,
      }))
    : bundleTimeline;
    
  try {
    sections.push(buildChronologySection(keyFacts, timelineToUse));
  } catch (error) {
    console.error("[Instructions] Error building chronology section:", error);
    sections.push({
      id: "chronology",
      title: "Background Facts & Chronology",
      content: existingData?.timeline && existingData.timeline.length > 0
        ? existingData.timeline.map(t => `${new Date(t.date).toLocaleDateString("en-GB")} — ${t.label}`).join("\n")
        : "Chronology data temporarily unavailable.",
    });
  }

  // 6. Section: Key Issues in Dispute
  // Use existing key issues if provided
  const issuesToUse = existingData?.keyIssues && existingData.keyIssues.length > 0
    ? existingData.keyIssues.map(issue => ({
        id: issue.id,
        issue: issue.label,
        type: (issue.category?.toLowerCase() ?? "other") as "liability" | "causation" | "quantum" | "procedure" | "other",
        overallStrength: (issue.severity?.toLowerCase() === "critical" ? "strong" : 
                         issue.severity?.toLowerCase() === "high" ? "strong" :
                         issue.severity?.toLowerCase() === "medium" ? "medium" : "weak") as "strong" | "medium" | "weak" | "unclear",
        supportingSections: [],
      }))
    : issuesMap;
    
  try {
    sections.push(buildIssuesSection(keyFacts, issuesToUse));
  } catch (error) {
    console.error("[Instructions] Error building issues section:", error);
    const issuesContent = existingData?.keyIssues && existingData.keyIssues.length > 0
      ? existingData.keyIssues.map((issue, idx) => `${idx + 1}. ${issue.label}${issue.category ? ` (${issue.category})` : ""}`).join("\n")
      : "Issues to be confirmed following review of the bundle and papers.";
    sections.push({
      id: "issues",
      title: "Key Issues in Dispute",
      content: issuesContent,
    });
  }

  // 7. Section: Evidence & Bundle Overview
  // Use existing documents if provided
  const documentsToUse = existingData?.documents ?? [];
  
  try {
    // If we have existing documents but no bundle, create a simple overview
    if (documentsToUse.length > 0 && !bundleOverview) {
      const docTypes = documentsToUse.reduce((acc, doc) => {
        const type = doc.type ?? "Unclassified";
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      sections.push({
        id: "evidence",
        title: "Evidence & Bundle Overview",
        content: `DOCUMENTS\n═══════════════════════════════════════════════════════════\n\n` +
          `Total documents: ${documentsToUse.length}\n\n` +
          (Object.keys(docTypes).length > 0 
            ? `DOCUMENT TYPES\n─────────────────────────────────────────────────────────────\n` +
              Object.entries(docTypes).map(([type, count]) => `• ${type}: ${count} document(s)`).join("\n") + "\n\n"
            : "") +
          `DOCUMENTS ENCLOSED\n─────────────────────────────────────────────────────────────\n` +
          documentsToUse.map((doc, idx) => `${idx + 1}. ${doc.name}${doc.type ? ` (${doc.type})` : ""}`).join("\n"),
      });
    } else {
      sections.push(buildEvidenceSection(bundleOverview, bundleTOC));
    }
  } catch (error) {
    console.error("[Instructions] Error building evidence section:", error);
    sections.push({
      id: "evidence",
      title: "Evidence & Bundle Overview",
      content: documentsToUse.length > 0
        ? `Documents enclosed: ${documentsToUse.length}\n\n${documentsToUse.map((d, idx) => `${idx + 1}. ${d.name}`).join("\n")}`
        : "Bundle not yet processed. Please refer to the documents enclosed.",
    });
  }

  // 8. Build outcome and complaint summaries for context
  let outcomeSummary: OutcomeSummary | undefined;
  let complaintRiskSummary: ComplaintRiskSummary | undefined;
  
  try {
    const supabase = getSupabaseAdminClient();
    const { data: caseRecord } = await supabase
      .from("cases")
      .select("practice_area, supervisor_reviewed")
      .eq("id", caseId)
      .maybeSingle();

    const { data: riskFlags } = await supabase
      .from("risk_flags")
      .select("id, flag_type, severity, description, category, resolved")
      .eq("case_id", caseId)
      .eq("resolved", false);

    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, type, extracted_json")
      .eq("case_id", caseId);

    const docsForEvidence = (documents ?? []).map((d) => ({
      name: d.name,
      type: d.type ?? undefined,
      extracted_json: d.extracted_json ?? undefined,
    }));
    const missingEvidence = findMissingEvidence(
      caseId,
      caseRecord?.practice_area ?? "general",
      docsForEvidence,
    );

    const { data: limitationData } = await supabase
      .from("limitation_info")
      .select("primary_limitation_date, days_remaining, is_expired, severity")
      .eq("case_id", caseId)
      .maybeSingle();

    const { data: recentNotes } = await supabase
      .from("case_notes")
      .select("created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1);

    const daysSinceLastUpdate = recentNotes?.[0]?.created_at
      ? Math.floor((Date.now() - new Date(recentNotes[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const pack = getPackForPracticeArea(caseRecord?.practice_area);
    outcomeSummary = buildOutcomeSummary({
      pack,
      risks: (riskFlags ?? []).map(rf => ({ 
        id: rf.id, 
        severity: rf.severity.toUpperCase() as any, 
        label: rf.description, 
        category: rf.category 
      })),
      missingEvidence: missingEvidence.map(m => ({ 
        id: m.id, 
        priority: m.priority, 
        label: m.label, 
        category: m.category 
      })),
      limitation: limitationData ? {
        daysRemaining: limitationData.days_remaining,
        isExpired: limitationData.is_expired,
        severity: limitationData.severity,
      } : undefined,
      documents: (documents ?? []).map(d => ({ id: d.id, name: d.name, type: d.type })),
      supervisorReviewed: caseRecord?.supervisor_reviewed ?? false,
      daysSinceLastUpdate,
    });

    complaintRiskSummary = buildComplaintRiskSummary({
      pack,
      risks: (riskFlags ?? []).map(rf => ({ 
        id: rf.id, 
        severity: rf.severity.toUpperCase() as any, 
        label: rf.description, 
        category: rf.category 
      })),
      missingEvidence: missingEvidence.map(m => ({ 
        id: m.id, 
        priority: m.priority, 
        label: m.label, 
        category: m.category 
      })),
      limitation: limitationData ? {
        daysRemaining: limitationData.days_remaining,
        isExpired: limitationData.is_expired,
        severity: limitationData.severity,
      } : undefined,
      supervisorReviewed: caseRecord?.supervisor_reviewed ?? false,
      daysSinceLastUpdate,
    });
  } catch (error) {
    console.error("[Instructions] Error building outcome/complaint summaries:", error);
    // Continue without outcome summaries
  }

  // 8. Section: Risks, Limitation & Compliance (enhanced with outcome/complaint context)
  try {
    sections.push(buildRisksSection(keyFacts, outcomeSummary, complaintRiskSummary));
  } catch (error) {
    console.error("[Instructions] Error building risks section:", error);
    sections.push({
      id: "risks",
      title: "Risks, Limitation & Compliance",
      content: "Risk assessment data temporarily unavailable.",
    });
  }

  // 9. Section: Opponent Behaviour & Delays
  let opponentSection: InstructionsToCounselSection;
  try {
    const opponentSnapshot = await buildOpponentActivitySnapshot(caseId, orgId);
    opponentSection = buildOpponentSection(opponentSnapshot);
  } catch (error) {
    console.error("[Instructions] Error building opponent section:", error);
    opponentSection = {
      id: "opponent",
      title: "Opponent Behaviour & Delays",
      content: "No opponent activity data available at this time.",
    };
  }
  sections.push(opponentSection);

  // 10. Section: Contradictions (if any)
  if (contradictions.length > 0) {
    try {
      sections.push(buildContradictionsSection(contradictions));
    } catch (error) {
      console.error("[Instructions] Error building contradictions section:", error);
    }
  }

  // 11. Section: Questions for Counsel
  try {
    sections.push(buildQuestionsSection(keyFacts, issuesMap));
  } catch (error) {
    console.error("[Instructions] Error building questions section:", error);
    sections.push({
      id: "questions",
      title: "Questions for Counsel / Advice Sought",
      content: "Instructing Solicitors would be grateful for Counsel's advice on the merits of the claim and prospects of success.",
    });
  }

  return {
    caseId,
    generatedAt: new Date().toISOString(),
    generatedByUserId: userId,
    sections,
  };
}

// =============================================================================
// Section Builders
// =============================================================================

function buildPartiesSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
): InstructionsToCounselSection {
  let content = "PARTIES\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += `Claimant: ${keyFacts.clientName ?? "To be confirmed"}\n\n`;
  content += `Defendant: ${keyFacts.opponentName ?? "To be confirmed"}\n\n`;

  if (keyFacts.courtName) {
    content += `Court: ${keyFacts.courtName}\n\n`;
  }

  content += "CASE OVERVIEW\n";
  content += "─────────────────────────────────────────────────────────────\n\n";

  if (keyFacts.claimType) {
    content += `Claim Type: ${keyFacts.claimType}\n`;
  }
  if (keyFacts.causeOfAction) {
    content += `Cause of Action: ${keyFacts.causeOfAction}\n`;
  }
  if (keyFacts.approxValue) {
    content += `Approximate Value: ${keyFacts.approxValue}\n`;
  }

  const stageLabel = (keyFacts.stage ?? "pre_action").replace(/_/g, " ").toUpperCase();
  const fundingLabel = (keyFacts.fundingType ?? "private").replace(/_/g, " ").toUpperCase();
  content += `\nCurrent Stage: ${stageLabel}\n`;
  content += `Funding: ${fundingLabel}\n`;

  if (keyFacts.headlineSummary) {
    content += `\nSUMMARY\n`;
    content += `─────────────────────────────────────────────────────────────\n`;
    content += `${keyFacts.headlineSummary}\n`;
  }

  return {
    id: "parties",
    title: "Parties & Case Overview",
    content,
  };
}

function buildInstructionsSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
): InstructionsToCounselSection {
  let content = "INSTRUCTIONS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += "Instructing Solicitors request that Counsel advises on the following matters ";
  content += "and provides a written advice or conference as appropriate.\n\n";

  if (keyFacts.whatClientWants) {
    content += "CLIENT OBJECTIVE\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += `${keyFacts.whatClientWants}\n\n`;
  }

  if (keyFacts.nextStepsBrief) {
    content += "IMMEDIATE NEXT STEP\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += `${keyFacts.nextStepsBrief}\n`;
  }

  return {
    id: "instructions",
    title: "Instructions & Client Objective",
    content,
  };
}

function buildChronologySection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  bundleTimeline: Awaited<ReturnType<typeof buildBundleTimeline>>,
): InstructionsToCounselSection {
  let content = "BACKGROUND FACTS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  // Key dates from key facts
  if (keyFacts.keyDates.length > 0) {
    content += "KEY DATES\n";
    content += "─────────────────────────────────────────────────────────────\n";
    keyFacts.keyDates.forEach(kd => {
      const formattedDate = new Date(kd.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const urgent = kd.isUrgent ? " ⚠️ URGENT" : "";
      content += `${formattedDate} — ${kd.label}${urgent}\n`;
    });
    content += "\n";
  }

  // Bundle timeline if available
  if (bundleTimeline.length > 0) {
    content += "CHRONOLOGY (from Bundle)\n";
    content += "─────────────────────────────────────────────────────────────\n";
    bundleTimeline.slice(0, 20).forEach(entry => {
      const formattedDate = new Date(entry.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      content += `${formattedDate} — ${entry.event}\n`;
    });
    if (bundleTimeline.length > 20) {
      content += `\n... and ${bundleTimeline.length - 20} more events (see full timeline in bundle)\n`;
    }
  }

  return {
    id: "chronology",
    title: "Background Facts & Chronology",
    content,
  };
}

function buildIssuesSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  issuesMap: Awaited<ReturnType<typeof buildIssuesMap>>,
): InstructionsToCounselSection {
  let content = "KEY ISSUES IN DISPUTE\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  // Primary issues from key facts
  if (keyFacts.primaryIssues.length > 0) {
    content += "Instructing Solicitors have identified the following key issues:\n\n";
    keyFacts.primaryIssues.forEach((issue, idx) => {
      content += `${idx + 1}. ${issue}\n`;
    });
    content += "\n";
  }

  // Issues from bundle analysis
  if (issuesMap.length > 0) {
    content += "ISSUES IDENTIFIED FROM BUNDLE ANALYSIS\n";
    content += "─────────────────────────────────────────────────────────────\n";
    issuesMap.forEach((issue, idx) => {
      content += `\n${idx + 1}. ${issue.issue}\n`;
      content += `   Type: ${issue.type} | Strength: ${issue.overallStrength}\n`;
      if (issue.supportingSections.length > 0) {
        content += `   Supporting documents: ${issue.supportingSections.length}\n`;
      }
    });
  }

  if (keyFacts.primaryIssues.length === 0 && issuesMap.length === 0) {
    content += "Issues to be confirmed following review of the bundle and papers.\n";
  }

  return {
    id: "issues",
    title: "Key Issues in Dispute",
    content,
  };
}

function buildEvidenceSection(
  bundleOverview: Awaited<ReturnType<typeof buildBundleOverview>> | null,
  bundleTOC: Awaited<ReturnType<typeof buildBundleTOC>>,
): InstructionsToCounselSection {
  let content = "EVIDENCE & BUNDLE\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  if (bundleOverview) {
    content += `Bundle: ${bundleOverview.totalPages} pages\n`;
    content += `Status: ${bundleOverview.status}\n\n`;

    if (Object.keys(bundleOverview.docTypeCounts).length > 0) {
      content += "DOCUMENT TYPES\n";
      content += "─────────────────────────────────────────────────────────────\n";
      Object.entries(bundleOverview.docTypeCounts).forEach(([type, count]) => {
        content += `• ${type}: ${count} document(s)\n`;
      });
      content += "\n";
    }

    if (bundleOverview.summary) {
      content += "BUNDLE SUMMARY\n";
      content += "─────────────────────────────────────────────────────────────\n";
      content += `${bundleOverview.summary}\n\n`;
    }
  }

  if (bundleTOC.length > 0) {
    content += "TABLE OF CONTENTS\n";
    content += "─────────────────────────────────────────────────────────────\n";
    bundleTOC.forEach((section, idx) => {
      content += `${idx + 1}. ${section.title} (pp. ${section.pageStart}-${section.pageEnd})\n`;
    });
  } else if (!bundleOverview) {
    content += "Bundle not yet processed. Please refer to the documents enclosed.\n";
  }

  return {
    id: "evidence",
    title: "Evidence & Bundle Overview",
    content,
  };
}

function buildRisksSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  outcomeSummary?: OutcomeSummary,
  complaintRiskSummary?: ComplaintRiskSummary,
): InstructionsToCounselSection {
  let content = "RISKS & LIMITATION\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  // Limitation
  const limitationDate = keyFacts.keyDates.find(d => d.label === "Limitation");
  if (limitationDate) {
    const formattedDate = new Date(limitationDate.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    content += "LIMITATION\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += `Limitation Date: ${formattedDate}\n`;
    if (limitationDate.isPast) {
      content += "⚠️ WARNING: Limitation period has expired.\n";
    } else if (limitationDate.isUrgent) {
      content += "⚠️ WARNING: Limitation is approaching. Urgent action required.\n";
    }
    content += "\n";
  }

  // Risks
  if (keyFacts.mainRisks.length > 0) {
    content += "KEY RISKS IDENTIFIED\n";
    content += "─────────────────────────────────────────────────────────────\n";
    keyFacts.mainRisks.forEach((risk, idx) => {
      content += `${idx + 1}. ${risk}\n`;
    });
    content += "\n";
    content += "Counsel is asked to advise on these risks and any mitigation strategies.\n";
  } else {
    content += "No high-priority risks currently flagged.\n";
  }

  // Outcome Summary
  if (outcomeSummary) {
    content += "\nOUTCOME ASSESSMENT\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += `Overall Level: ${outcomeSummary.level.toUpperCase()}\n\n`;
    content += "Dimensions:\n";
    content += `• Liability: ${outcomeSummary.dimensions.liability}\n`;
    content += `• Quantum: ${outcomeSummary.dimensions.quantum}\n`;
    content += `• Evidential: ${outcomeSummary.dimensions.evidential}\n`;
    content += `• Limitation: ${outcomeSummary.dimensions.limitation}\n\n`;
    if (outcomeSummary.notes.length > 0) {
      content += "Notes:\n";
      outcomeSummary.notes.slice(0, 3).forEach(note => {
        content += `• ${note}\n`;
      });
    }
  }

  // Complaint Risk Summary
  if (complaintRiskSummary && complaintRiskSummary.level !== "low") {
    content += "\nCOMPLAINT RISK ASSESSMENT\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += `Risk Level: ${complaintRiskSummary.level.toUpperCase()}\n\n`;
    if (complaintRiskSummary.drivers.length > 0) {
      content += "Risk Drivers:\n";
      complaintRiskSummary.drivers.slice(0, 3).forEach(driver => {
        content += `• ${driver}\n`;
      });
    }
    if (complaintRiskSummary.level === "high") {
      content += "\n⚠️ HIGH complaint risk case. Counsel is asked to advise on risk mitigation and client communication strategies.\n";
    }
  }

  return {
    id: "risks",
    title: "Risks, Limitation & Compliance",
    content,
  };
}

function buildOpponentSection(
  snapshot: Awaited<ReturnType<typeof buildOpponentActivitySnapshot>>,
): InstructionsToCounselSection {
  let content = "OPPONENT BEHAVIOUR\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += `Current Status: ${snapshot.statusMessage}\n\n`;

  if (snapshot.lastLetterSentAt) {
    const formattedDate = new Date(snapshot.lastLetterSentAt).toLocaleDateString("en-GB");
    content += `Last letter sent to opponent: ${formattedDate}\n`;
  }

  if (snapshot.lastOpponentReplyAt) {
    const formattedDate = new Date(snapshot.lastOpponentReplyAt).toLocaleDateString("en-GB");
    content += `Last opponent reply: ${formattedDate}\n`;
  }

  if (snapshot.averageResponseDays) {
    content += `Average response time: ${snapshot.averageResponseDays} days\n`;
  }

  if (snapshot.currentSilenceDays > 0) {
    content += `\nCurrent silence: ${snapshot.currentSilenceDays} days\n`;
    if (snapshot.currentSilenceDays > 21) {
      content += "⚠️ Extended silence may indicate tactical delay or intention to defend.\n";
    }
  }

  return {
    id: "opponent",
    title: "Opponent Behaviour & Delays",
    content,
  };
}

function buildContradictionsSection(
  contradictions: Awaited<ReturnType<typeof findContradictions>>,
): InstructionsToCounselSection {
  let content = "POTENTIAL CONTRADICTIONS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += "The following potential contradictions have been detected in the bundle:\n\n";

  contradictions.forEach((c, idx) => {
    content += `${idx + 1}. ${c.description}\n`;
    content += `   Confidence: ${c.confidence}\n`;
    content += `   Potential Impact: ${c.potentialImpact}\n`;
    c.sectionsInvolved.forEach(s => {
      content += `   - Pages ${s.pageStart}-${s.pageEnd}: ${s.position}\n`;
    });
    content += "\n";
  });

  content += "Counsel is asked to advise on the significance of these contradictions ";
  content += "and how they might be used in cross-examination or submissions.\n";

  return {
    id: "contradictions",
    title: "Potential Contradictions",
    content,
  };
}

function buildQuestionsSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  issuesMap: Awaited<ReturnType<typeof buildIssuesMap>>,
): InstructionsToCounselSection {
  let content = "QUESTIONS FOR COUNSEL\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += "Instructing Solicitors would be grateful for Counsel's advice on the following:\n\n";

  const questions: string[] = [
    "The merits of the claim and prospects of success.",
    "Any additional evidence required to strengthen the case.",
  ];

  if (keyFacts.stage === "pre_action") {
    questions.push("Whether proceedings should be issued and timing considerations.");
    questions.push("The appropriate court and track for the claim.");
  }

  if (keyFacts.stage === "issued" || keyFacts.stage === "post_issue") {
    questions.push("Strategy for the next procedural steps.");
    questions.push("Any applications that should be made.");
  }

  if (keyFacts.mainRisks.length > 0) {
    questions.push("Mitigation strategies for the identified risks.");
  }

  if (issuesMap.length > 0) {
    questions.push("The strength of each key issue and how to advance them.");
  }

  questions.push("Quantum assessment and any valuation considerations.");
  questions.push("Settlement strategy and any Part 36 offer considerations.");

  questions.forEach((q, idx) => {
    content += `${idx + 1}. ${q}\n`;
  });

  content += "\nCounsel's written advice or availability for a conference would be appreciated.\n";

  return {
    id: "questions",
    title: "Questions for Counsel / Advice Sought",
    content,
  };
}

