/**
 * Hearing Preparation Pack Generator
 * 
 * Generates a comprehensive hearing preparation pack by aggregating
 * data from all CaseBrain brains:
 * - Key Facts
 * - Chronology/Timeline
 * - Issues Map
 * - Contradictions
 * - Bundle Overview
 * - Evidence Summary
 * - Opponent Behaviour
 * - Risks & Limitation
 * - Next Steps
 * - Draft questions and submissions
 */

import { buildKeyFactsSummary } from "./key-facts";
import { buildOpponentActivitySnapshot } from "./opponent-radar";
import { buildCorrespondenceTimeline } from "./correspondence";
import { 
  getBundleStatus,
  buildBundleOverview, 
  buildBundleTOC, 
  buildBundleTimeline,
  buildIssuesMap,
  findContradictions,
} from "./bundle-navigator";
import { findMissingEvidence } from "./missing-evidence";
import { getOpenAIClient } from "./openai";
import type {
  HearingPrepPack,
  HearingPrepSection,
} from "./types/casebrain";

/**
 * Build a comprehensive hearing preparation pack
 */
export async function buildHearingPrepPack(
  caseId: string,
  orgId: string,
  userId: string,
  hearingType?: string,
  hearingDate?: string,
): Promise<HearingPrepPack> {
  const sections: HearingPrepSection[] = [];

  // 1. Get Key Facts
  const keyFacts = await buildKeyFactsSummary(caseId, orgId);

  // 2. Section: Case Overview
  sections.push(buildCaseOverviewSection(keyFacts, hearingType, hearingDate));

  // 3. Get bundle data if exists
  const bundle = await getBundleStatus(caseId, orgId);
  let bundleOverview = null;
  let bundleTOC: Awaited<ReturnType<typeof buildBundleTOC>> = [];
  let bundleTimeline: Awaited<ReturnType<typeof buildBundleTimeline>> = [];
  let issuesMap: Awaited<ReturnType<typeof buildIssuesMap>> = [];
  let contradictions: Awaited<ReturnType<typeof findContradictions>> = [];

  if (bundle && bundle.status === "completed") {
    bundleOverview = await buildBundleOverview(bundle.id);
    bundleTOC = await buildBundleTOC(bundle.id);
    bundleTimeline = await buildBundleTimeline(bundle.id);
    issuesMap = await buildIssuesMap(bundle.id);
    contradictions = await findContradictions(bundle.id);
  }

  // 4. Section: Chronology
  sections.push(buildChronologySection(keyFacts, bundleTimeline));

  // 5. Section: Key Issues
  sections.push(buildIssuesSection(keyFacts, issuesMap));

  // 6. Section: Evidence Overview
  sections.push(buildEvidenceSection(bundleOverview, bundleTOC));

  // 7. Section: Contradictions
  if (contradictions.length > 0) {
    sections.push(buildContradictionsSection(contradictions));
  }

  // 8. Get opponent activity
  let opponentSection: HearingPrepSection;
  try {
    const opponentSnapshot = await buildOpponentActivitySnapshot(caseId, orgId);
    opponentSection = buildOpponentSection(opponentSnapshot);
  } catch {
    opponentSection = {
      id: "opponent",
      title: "Opponent Behaviour",
      content: "Opponent activity data not available.",
      priority: "optional",
    };
  }
  sections.push(opponentSection);

  // 9. Section: Risks & Limitation
  sections.push(buildRisksSection(keyFacts));

  // 10. Section: Missing Evidence
  const missingEvidence = findMissingEvidence(
    caseId,
    keyFacts.claimType?.toLowerCase().includes("housing") ? "housing" : "pi",
    [], // existing documents
  );
  sections.push(buildMissingEvidenceSection(missingEvidence));

  // 11. Section: Draft Questions (AI-generated)
  const questionsSection = await buildQuestionsSection(keyFacts, issuesMap, contradictions);
  sections.push(questionsSection);

  // 12. Section: Draft Submissions
  const submissionsSection = await buildSubmissionsSection(keyFacts, issuesMap);
  sections.push(submissionsSection);

  // 13. Section: Hearing Checklist
  sections.push(buildChecklistSection(hearingType));

  return {
    caseId,
    hearingType,
    hearingDate,
    generatedAt: new Date().toISOString(),
    generatedByUserId: userId,
    sections,
  };
}

// =============================================================================
// Section Builders
// =============================================================================

function buildCaseOverviewSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  hearingType?: string,
  hearingDate?: string,
): HearingPrepSection {
  let content = "HEARING INFORMATION\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  if (hearingType) content += `Hearing Type: ${hearingType}\n`;
  if (hearingDate) content += `Hearing Date: ${new Date(hearingDate).toLocaleDateString("en-GB")}\n`;
  content += "\n";

  content += "PARTIES\n";
  content += "─────────────────────────────────────────────────────────────\n";
  content += `Claimant: ${keyFacts.clientName ?? "To be confirmed"}\n`;
  content += `Defendant: ${keyFacts.opponentName ?? "To be confirmed"}\n\n`;

  if (keyFacts.courtName) content += `Court: ${keyFacts.courtName}\n`;
  if (keyFacts.claimType) content += `Claim Type: ${keyFacts.claimType}\n`;
  if (keyFacts.approxValue) content += `Value: ${keyFacts.approxValue}\n`;
  content += `Stage: ${keyFacts.stage.replace(/_/g, " ").toUpperCase()}\n`;

  if (keyFacts.headlineSummary) {
    content += `\nCASE SUMMARY\n`;
    content += `─────────────────────────────────────────────────────────────\n`;
    content += `${keyFacts.headlineSummary}\n`;
  }

  if (keyFacts.whatClientWants) {
    content += `\nCLIENT OBJECTIVE\n`;
    content += `─────────────────────────────────────────────────────────────\n`;
    content += `${keyFacts.whatClientWants}\n`;
  }

  return {
    id: "overview",
    title: "Case Overview",
    content,
    priority: "essential",
  };
}

function buildChronologySection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  bundleTimeline: Awaited<ReturnType<typeof buildBundleTimeline>>,
): HearingPrepSection {
  let content = "KEY DATES\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  keyFacts.keyDates.forEach(kd => {
    const formattedDate = new Date(kd.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const urgent = kd.isUrgent ? " ⚠️" : "";
    content += `${formattedDate} — ${kd.label}${urgent}\n`;
  });

  if (bundleTimeline.length > 0) {
    content += `\nCHRONOLOGY\n`;
    content += `─────────────────────────────────────────────────────────────\n`;
    bundleTimeline.slice(0, 25).forEach(entry => {
      const formattedDate = new Date(entry.date).toLocaleDateString("en-GB");
      content += `${formattedDate} — ${entry.event}\n`;
    });
    if (bundleTimeline.length > 25) {
      content += `\n[${bundleTimeline.length - 25} more events in full timeline]\n`;
    }
  }

  return {
    id: "chronology",
    title: "Chronology",
    content,
    priority: "essential",
  };
}

function buildIssuesSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  issuesMap: Awaited<ReturnType<typeof buildIssuesMap>>,
): HearingPrepSection {
  let content = "ISSUES FOR DETERMINATION\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  if (keyFacts.primaryIssues.length > 0) {
    keyFacts.primaryIssues.forEach((issue, idx) => {
      content += `${idx + 1}. ${issue}\n`;
    });
    content += "\n";
  }

  if (issuesMap.length > 0) {
    content += "DETAILED ISSUES ANALYSIS\n";
    content += "─────────────────────────────────────────────────────────────\n\n";
    issuesMap.forEach((issue, idx) => {
      content += `Issue ${idx + 1}: ${issue.issue}\n`;
      content += `Type: ${issue.type} | Strength: ${issue.overallStrength}\n`;
      content += `Supporting documents: ${issue.supportingSections.length}\n\n`;
    });
  }

  if (keyFacts.primaryIssues.length === 0 && issuesMap.length === 0) {
    content += "Issues to be confirmed.\n";
  }

  return {
    id: "issues",
    title: "Key Issues",
    content,
    priority: "essential",
  };
}

function buildEvidenceSection(
  bundleOverview: Awaited<ReturnType<typeof buildBundleOverview>> | null,
  bundleTOC: Awaited<ReturnType<typeof buildBundleTOC>>,
): HearingPrepSection {
  let content = "EVIDENCE OVERVIEW\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  if (bundleOverview) {
    content += `Bundle: ${bundleOverview.totalPages} pages\n\n`;

    if (Object.keys(bundleOverview.docTypeCounts).length > 0) {
      content += "DOCUMENT TYPES\n";
      content += "─────────────────────────────────────────────────────────────\n";
      Object.entries(bundleOverview.docTypeCounts).forEach(([type, count]) => {
        content += `• ${type}: ${count}\n`;
      });
      content += "\n";
    }
  }

  if (bundleTOC.length > 0) {
    content += "BUNDLE CONTENTS\n";
    content += "─────────────────────────────────────────────────────────────\n";
    bundleTOC.forEach((section, idx) => {
      content += `${idx + 1}. ${section.title} (pp. ${section.pageStart}-${section.pageEnd})\n`;
    });
  } else {
    content += "Bundle not yet analysed.\n";
  }

  return {
    id: "evidence",
    title: "Evidence Overview",
    content,
    priority: "essential",
  };
}

function buildContradictionsSection(
  contradictions: Awaited<ReturnType<typeof findContradictions>>,
): HearingPrepSection {
  let content = "CONTRADICTIONS IN EVIDENCE\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += "⚠️ The following contradictions have been detected:\n\n";

  contradictions.forEach((c, idx) => {
    content += `${idx + 1}. ${c.description}\n`;
    content += `   Confidence: ${c.confidence} | Impact: ${c.potentialImpact}\n`;
    c.sectionsInvolved.forEach(s => {
      content += `   - Pages ${s.pageStart}-${s.pageEnd}: ${s.position}\n`;
    });
    content += "\n";
  });

  content += "Consider addressing these contradictions in cross-examination.\n";

  return {
    id: "contradictions",
    title: "Contradictions",
    content,
    priority: "recommended",
  };
}

function buildOpponentSection(
  snapshot: Awaited<ReturnType<typeof buildOpponentActivitySnapshot>>,
): HearingPrepSection {
  let content = "OPPONENT BEHAVIOUR ANALYSIS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += `Status: ${snapshot.statusMessage}\n\n`;

  if (snapshot.lastLetterSentAt) {
    content += `Last letter to opponent: ${new Date(snapshot.lastLetterSentAt).toLocaleDateString("en-GB")}\n`;
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
    title: "Opponent Behaviour",
    content,
    priority: "recommended",
  };
}

function buildRisksSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
): HearingPrepSection {
  let content = "RISKS & LIMITATION\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  const limitationDate = keyFacts.keyDates.find(d => d.label === "Limitation");
  if (limitationDate) {
    content += `Limitation: ${new Date(limitationDate.date).toLocaleDateString("en-GB")}\n`;
    if (limitationDate.isPast) content += "⚠️ LIMITATION EXPIRED\n";
    else if (limitationDate.isUrgent) content += "⚠️ LIMITATION APPROACHING\n";
    content += "\n";
  }

  if (keyFacts.mainRisks.length > 0) {
    content += "KEY RISKS\n";
    content += "─────────────────────────────────────────────────────────────\n";
    keyFacts.mainRisks.forEach((risk, idx) => {
      content += `${idx + 1}. ${risk}\n`;
    });
  } else {
    content += "No high-priority risks flagged.\n";
  }

  return {
    id: "risks",
    title: "Risks & Limitation",
    content,
    priority: "essential",
  };
}

function buildMissingEvidenceSection(
  missingEvidence: Awaited<ReturnType<typeof findMissingEvidence>>,
): HearingPrepSection {
  let content = "EVIDENCE GAPS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  const missing = missingEvidence.filter(e => e.status === "MISSING");

  if (missing.length > 0) {
    content += "⚠️ The following evidence may be required:\n\n";
    missing.forEach(e => {
      content += `• ${e.label} [${e.priority}]\n`;
      if (e.reason) content += `  Reason: ${e.reason}\n`;
    });
  } else {
    content += "No critical evidence gaps identified.\n";
  }

  return {
    id: "missing-evidence",
    title: "Evidence Gaps",
    content,
    priority: "recommended",
  };
}

async function buildQuestionsSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  issuesMap: Awaited<ReturnType<typeof buildIssuesMap>>,
  contradictions: Awaited<ReturnType<typeof findContradictions>>,
): Promise<HearingPrepSection> {
  let content = "SUGGESTED QUESTIONS\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  try {
    const client = getOpenAIClient();

    const issuesList = [
      ...keyFacts.primaryIssues,
      ...issuesMap.map(i => i.issue),
    ].slice(0, 5);

    const contradictionsList = contradictions
      .slice(0, 3)
      .map(c => c.description);

    const prompt = `Based on the following case information, suggest 5-7 key questions for cross-examination or witness examination.

Case Type: ${keyFacts.claimType ?? "Not specified"}
Client Objective: ${keyFacts.whatClientWants ?? "Not specified"}
Key Issues: ${issuesList.join("; ") || "Not specified"}
Contradictions in evidence: ${contradictionsList.join("; ") || "None detected"}

Provide practical, probing questions that address the key issues and any contradictions. Format as a numbered list.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: "You are a litigation assistant helping prepare questions for court hearings. Be specific and practical.",
        },
        { role: "user", content: prompt },
      ],
    });

    content += completion.choices[0]?.message?.content ?? "Unable to generate questions.\n";
  } catch (error) {
    content += "1. [Questions to be developed based on case review]\n";
    content += "2. [Consider addressing key contradictions in evidence]\n";
    content += "3. [Focus on establishing timeline and causation]\n";
  }

  return {
    id: "questions",
    title: "Suggested Questions",
    content,
    priority: "recommended",
  };
}

async function buildSubmissionsSection(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  issuesMap: Awaited<ReturnType<typeof buildIssuesMap>>,
): Promise<HearingPrepSection> {
  let content = "DRAFT SUBMISSIONS OUTLINE\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  try {
    const client = getOpenAIClient();

    const issuesList = [
      ...keyFacts.primaryIssues,
      ...issuesMap.map(i => i.issue),
    ].slice(0, 5);

    const prompt = `Draft a brief outline of oral submissions for a court hearing based on:

Case Type: ${keyFacts.claimType ?? "Not specified"}
Client: ${keyFacts.clientName ?? "Claimant"}
Opponent: ${keyFacts.opponentName ?? "Defendant"}
Client Objective: ${keyFacts.whatClientWants ?? "Not specified"}
Key Issues: ${issuesList.join("; ") || "Not specified"}
Main Risks: ${keyFacts.mainRisks.join("; ") || "None flagged"}

Provide a structured outline with:
1. Introduction (1-2 lines)
2. Key submissions on each issue (2-3 lines each)
3. Conclusion / relief sought (1-2 lines)

Be concise and professional. This is a draft for the solicitor to refine.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: "You are a litigation assistant drafting submission outlines. Be formal and structured.",
        },
        { role: "user", content: prompt },
      ],
    });

    content += completion.choices[0]?.message?.content ?? "Submissions to be drafted.\n";
  } catch (error) {
    content += "INTRODUCTION\n";
    content += "• [Opening statement]\n\n";
    content += "KEY SUBMISSIONS\n";
    keyFacts.primaryIssues.forEach((issue, idx) => {
      content += `${idx + 1}. Re: ${issue}\n   [Submission to be developed]\n\n`;
    });
    content += "CONCLUSION\n";
    content += "• [Relief sought]\n";
  }

  return {
    id: "submissions",
    title: "Draft Submissions",
    content,
    priority: "recommended",
  };
}

function buildChecklistSection(hearingType?: string): HearingPrepSection {
  let content = "PRE-HEARING CHECKLIST\n";
  content += "═══════════════════════════════════════════════════════════\n\n";

  content += "BEFORE THE HEARING\n";
  content += "─────────────────────────────────────────────────────────────\n";
  content += "☐ Review bundle and mark key pages\n";
  content += "☐ Prepare chronology / Scott schedule\n";
  content += "☐ Draft skeleton argument (if required)\n";
  content += "☐ Prepare questions for witnesses\n";
  content += "☐ Check court directions compliance\n";
  content += "☐ Confirm client attendance\n";
  content += "☐ Check opponent's submissions / skeleton\n";
  content += "☐ Prepare draft order\n\n";

  content += "DOCUMENTS TO BRING\n";
  content += "─────────────────────────────────────────────────────────────\n";
  content += "☐ Trial bundle (with index)\n";
  content += "☐ Skeleton argument\n";
  content += "☐ Authorities bundle (if any)\n";
  content += "☐ Witness statements\n";
  content += "☐ Expert reports (if any)\n";
  content += "☐ Draft order\n";
  content += "☐ Chronology\n";
  content += "☐ Case summary\n\n";

  if (hearingType?.toLowerCase().includes("disposal") || 
      hearingType?.toLowerCase().includes("trial")) {
    content += "TRIAL SPECIFIC\n";
    content += "─────────────────────────────────────────────────────────────\n";
    content += "☐ Opening submissions prepared\n";
    content += "☐ Cross-examination questions ready\n";
    content += "☐ Closing submissions outlined\n";
    content += "☐ Costs schedule prepared\n";
  }

  return {
    id: "checklist",
    title: "Pre-Hearing Checklist",
    content,
    priority: "recommended",
  };
}

