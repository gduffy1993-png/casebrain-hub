/**
 * Case Insights Engine
 * 
 * Builds rich, non-AI insights from existing case data.
 * Never calls OpenAI - purely data aggregation and scoring.
 */

import type {
  CaseInsights,
  CaseInsightsSummary,
  CaseInsightsRagLevel,
  CaseInsightsScore,
  CaseInsightsBriefing,
} from "./enterprise-types";
import type { RiskFlag, MissingEvidenceItem, LimitationInfo, PracticeArea } from "../types/casebrain";
import type { OutcomeSummary, ComplaintRiskSummary } from "./enterprise-types";
import { PRACTICE_AREA_LABELS } from "../types/casebrain";
import { buildKeyFactsSummary } from "../key-facts";
import { buildOutcomeSummary, buildComplaintRiskSummary } from "./outcomes";
import { getPackForPracticeArea } from "../packs";
import { computeCaseHeatmap } from "../heatmap";
import { getSupabaseAdminClient } from "../supabase";
import { inferAwaabRisks } from "../housing/awaab-inferred";
import type { ExtractedCaseFacts } from "@/types/case";

// =============================================================================
// Main Function
// =============================================================================

export type CaseInsightsInput = {
  caseId: string;
  orgId: string;
  caseRecord: {
    id: string;
    title: string;
    summary?: string | null;
    practice_area?: string | null;
    created_at: string;
  };
  documents: Array<{ id: string; name: string; type?: string | null }>;
  riskFlags: Array<{
    id: string;
    flag_type: string;
    severity: string;
    description: string;
    category?: string | null;
    resolved: boolean;
  }>;
  missingEvidence: MissingEvidenceItem[];
  limitationInfo?: LimitationInfo | null;
  keyIssues: Array<{ id: string; label: string; category?: string | null }>;
  nextSteps: Array<{ id: string; action: string; priority?: string | null }>;
  supervisorReviewed?: boolean;
  daysSinceLastUpdate: number;
};

/**
 * Build rich case insights from existing data (no AI)
 */
export async function buildCaseInsights(input: CaseInsightsInput): Promise<CaseInsights> {
  const {
    caseId,
    orgId,
    caseRecord,
    documents,
    riskFlags,
    missingEvidence,
    limitationInfo,
    supervisorReviewed,
    daysSinceLastUpdate,
  } = input;

  const practiceArea = (caseRecord.practice_area ?? "other_litigation") as PracticeArea;
  const pack = getPackForPracticeArea(practiceArea);

  // Fetch key facts for summary data - handle errors gracefully to prevent UI flashing
  let keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>> | undefined;
  try {
    keyFacts = await buildKeyFactsSummary(caseId, orgId);
  } catch (error) {
    // Silently fail - preserve last good render instead of causing UI flash
    // Log for debugging but don't throw - insights can proceed without keyFacts
    if (process.env.NODE_ENV !== "production") {
      console.error("[buildCaseInsights] Error fetching key facts (non-fatal):", error);
    }
    // Continue with fallback data - keyFacts will be undefined
    keyFacts = undefined;
  }

  // Extract structured facts for Awaab Law analysis (housing only)
  const extractedFacts: ExtractedCaseFacts[] = [];
  if (practiceArea === "housing_disrepair") {
    // Fetch documents with extracted_json directly
    const { data: docsWithExtraction } = await getSupabaseAdminClient()
      .from("documents")
      .select("id, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId);
    
    for (const doc of docsWithExtraction ?? []) {
      if (doc.extracted_json && typeof doc.extracted_json === "object") {
        const extracted = doc.extracted_json as ExtractedCaseFacts;
        if (extracted.parties || extracted.dates || extracted.keyIssues || extracted.summary) {
          extractedFacts.push(extracted);
        }
      }
    }

    // Add Awaab's Law inferred risks
    if (extractedFacts.length > 0) {
      try {
        const { data: housingCase } = await getSupabaseAdminClient()
          .from("housing_cases")
          .select("first_report_date, landlord_type")
          .eq("id", caseId)
          .eq("org_id", orgId)
          .maybeSingle();

        const isSocialLandlord = housingCase?.landlord_type === "social" || 
                                 housingCase?.landlord_type === "council" ||
                                 // Infer from case if not set
                                 (caseRecord.practice_area === "housing_disrepair" && !housingCase);
        const firstComplaintDate = housingCase?.first_report_date 
          ? new Date(housingCase.first_report_date)
          : undefined;

        // Always run Awaab Law detection for housing cases, even if landlord type is unknown
        // It will check the text for social landlord indicators
        if (extractedFacts.length > 0 || !housingCase) {
          const awaabRisks = inferAwaabRisks(
            caseId,
            extractedFacts.length > 0 ? extractedFacts : [{
              summary: caseRecord.summary ?? "",
              keyIssues: [],
              timeline: [],
              parties: [],
              dates: [],
              amounts: [],
              claimType: "housing_disrepair",
            }],
            extractedFacts[0]?.housingMeta,
            firstComplaintDate,
            isSocialLandlord ?? true, // Default to true if unknown, let the detector check text
          );

          // Add Awaab risks to risk flags for briefing
          awaabRisks.forEach(risk => {
            if (!input.riskFlags.some(r => r.flag_type === "awaabs_law" && r.id === risk.id)) {
              input.riskFlags.push({
                id: risk.id,
                flag_type: "awaabs_law",
                severity: risk.severity.toLowerCase(),
                description: risk.description,
                category: "health_safety",
                resolved: false,
              });
            }
          });
        }
      } catch (err) {
        console.error("[buildCaseInsights] Error adding Awaab risks:", err);
      }
    }
  }

  // Build summary
  const summary = buildSummary(caseRecord, keyFacts, practiceArea, documents, missingEvidence);

  // Build RAG scores
  const rag = buildRagScores(input, keyFacts);

  // Build briefing
  const briefing = buildBriefing(input, rag, keyFacts);

  // Build meta
  const hasCoreEvidence = documents.length > 0;
  const missingCritical = missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING").length;
  const missingHigh = missingEvidence.filter(e => e.priority === "HIGH" && e.status === "MISSING").length;

  return {
    summary,
    rag,
    briefing,
    meta: {
      caseId,
      updatedAt: new Date().toISOString(),
      hasCoreEvidence,
      missingCriticalCount: missingCritical,
      missingHighCount: missingHigh,
    },
  };
}

// =============================================================================
// Summary Builder
// =============================================================================

function buildSummary(
  caseRecord: CaseInsightsInput["caseRecord"],
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>> | undefined,
  practiceArea: PracticeArea,
  documents: CaseInsightsInput["documents"],
  missingEvidence: CaseInsightsInput["missingEvidence"],
): CaseInsightsSummary {
  const practiceAreaLabel = PRACTICE_AREA_LABELS[practiceArea] || "Litigation";
  
  // Determine stage
  let stageLabel: string | null = null;
  if (keyFacts?.stage) {
    stageLabel = formatStageLabel(keyFacts.stage);
  }
  // Note: caseRecord.status column removed - stage now derived from keyFacts only

  // Build headline
  let headline: string;
  if (practiceArea === "family") {
    headline = stageLabel 
      ? `Private law children – ${stageLabel}`
      : "Private law children matter";
  } else if (practiceArea === "housing_disrepair") {
    headline = stageLabel
      ? `Housing disrepair – ${stageLabel}`
      : "Housing disrepair matter";
  } else if (practiceArea === "personal_injury") {
    headline = stageLabel
      ? `Personal injury – ${stageLabel}`
      : "Personal injury matter";
  } else if (practiceArea === "clinical_negligence") {
    headline = stageLabel
      ? `Clinical negligence – ${stageLabel}`
      : "Clinical negligence matter";
  } else {
    headline = stageLabel
      ? `Litigation matter – ${stageLabel}`
      : "Litigation matter";
  }

  // Build one-liner
  const clientName = keyFacts?.clientName || null;
  const opponentName = keyFacts?.opponentName || null;
  
  let oneLiner: string;
  if (!documents || documents.length === 0) {
    oneLiner = "Case created – upload key documents to generate insights.";
  } else {
    const partyInfo = clientName && opponentName
      ? `${clientName} v ${opponentName}`
      : clientName
      ? `${clientName}`
      : opponentName
      ? `opponent: ${opponentName}`
      : "parties unknown";
    
    const stageInfo = stageLabel ? ` – ${stageLabel}` : " – early stage";
    const missingCount = missingEvidence.filter(e => e.status === "MISSING").length;
    const missingInfo = missingCount > 0 ? ` with ${missingCount} evidence item(s) still missing` : "";
    
    oneLiner = `${practiceAreaLabel} dispute involving ${partyInfo}${stageInfo}${missingInfo}.`;
  }

  return {
    headline,
    oneLiner,
    stageLabel,
    practiceArea: practiceAreaLabel,
    clientName,
    opponentName,
  };
}

function formatStageLabel(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// RAG Score Builder
// =============================================================================

function buildRagScores(
  input: CaseInsightsInput,
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>> | undefined,
): CaseInsights["rag"] {
  const { riskFlags, missingEvidence, limitationInfo, documents, caseRecord } = input;

  // Use heatmap logic to compute dimension scores
  const practiceArea = (caseRecord.practice_area ?? "other_litigation") as PracticeArea;
  
  // Convert risk flags to the format expected by heatmap
  const formattedRisks: RiskFlag[] = riskFlags.map(rf => ({
    id: rf.id,
    caseId: input.caseId,
    severity: rf.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    type: rf.flag_type as RiskFlag["type"],
    code: rf.flag_type.toUpperCase(),
    title: rf.flag_type.replace(/_/g, " "),
    message: rf.description,
    source: "risk_detection",
    status: rf.resolved ? "resolved" : "outstanding",
    createdAt: new Date().toISOString(),
  }));

  const heatmap = computeCaseHeatmap({
    caseId: input.caseId,
    practiceArea,
    riskFlags: formattedRisks,
    missingEvidence,
    limitationInfo: limitationInfo ?? undefined,
    hasTimeline: documents.length > 0,
    documentCount: documents.length,
    extractedFactsCount: documents.length, // Approximation
    stage: undefined, // status column removed from cases table
  });

  // Convert heatmap cells to insight scores
  const scores: CaseInsightsScore[] = [];

  // Liability
  const liabilityCell = heatmap.cells.find(c => c.issue === "LIABILITY");
  if (liabilityCell) {
    scores.push({
      area: "Liability",
      score: liabilityCell.score,
      level: scoreToRagLevel(liabilityCell.score),
      message: liabilityCell.reason,
    });
  } else {
    // Compute fallback
    const liabilityRisks = riskFlags.filter(r => 
      r.category === "evidence_gap" || 
      r.description.toLowerCase().includes("liability")
    );
    const score = liabilityRisks.length === 0 ? 70 : Math.max(0, 70 - liabilityRisks.length * 15);
    scores.push({
      area: "Liability",
      score,
      level: scoreToRagLevel(score),
      message: liabilityRisks.length === 0 ? "No obvious liability concerns" : `${liabilityRisks.length} liability-related risk(s)`,
    });
  }

  // Procedure
  const procedureCell = heatmap.cells.find(c => c.issue === "PROCEDURAL_COMPLIANCE");
  if (procedureCell) {
    scores.push({
      area: "Procedure",
      score: procedureCell.score,
      level: scoreToRagLevel(procedureCell.score),
      message: procedureCell.reason,
    });
  } else {
    const proceduralRisks = riskFlags.filter(r => r.category === "compliance" || r.flag_type.includes("compliance"));
    const score = proceduralRisks.length === 0 ? 80 : Math.max(0, 80 - proceduralRisks.length * 10);
    scores.push({
      area: "Procedure",
      score,
      level: scoreToRagLevel(score),
      message: proceduralRisks.length === 0 ? "Procedural compliance appears sound" : `${proceduralRisks.length} procedural issue(s)`,
    });
  }

  // Evidence
  const evidenceCell = heatmap.cells.find(c => c.issue === "EVIDENCE_COMPLETENESS");
  if (evidenceCell) {
    scores.push({
      area: "Evidence",
      score: evidenceCell.score,
      level: scoreToRagLevel(evidenceCell.score),
      message: evidenceCell.reason,
    });
  } else {
    const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING").length;
    const highMissing = missingEvidence.filter(e => e.priority === "HIGH" && e.status === "MISSING").length;
    const score = Math.max(0, 100 - criticalMissing * 25 - highMissing * 15);
    scores.push({
      area: "Evidence",
      score,
      level: scoreToRagLevel(score),
      message: criticalMissing > 0 || highMissing > 0
        ? `${criticalMissing + highMissing} critical/high-priority evidence item(s) missing`
        : "Core evidence appears complete",
    });
  }

  // Quantum
  const quantumCell = heatmap.cells.find(c => c.issue === "QUANTUM");
  if (quantumCell) {
    scores.push({
      area: "Quantum",
      score: quantumCell.score,
      level: scoreToRagLevel(quantumCell.score),
      message: quantumCell.reason,
    });
  } else {
    const quantumMissing = missingEvidence.filter(e => e.category === "QUANTUM" && e.status === "MISSING").length;
    const score = quantumMissing === 0 ? 70 : Math.max(0, 70 - quantumMissing * 15);
    scores.push({
      area: "Quantum",
      score,
      level: scoreToRagLevel(score),
      message: quantumMissing === 0 ? "Quantum evidence appears sufficient" : `${quantumMissing} quantum-related document(s) missing`,
    });
  }

  // Causation (if applicable)
  if (practiceArea === "personal_injury" || practiceArea === "clinical_negligence" || practiceArea === "housing_disrepair") {
    const causationCell = heatmap.cells.find(c => c.issue === "CAUSATION");
    if (causationCell) {
      scores.push({
        area: "Causation",
        score: causationCell.score,
        level: scoreToRagLevel(causationCell.score),
        message: causationCell.reason,
      });
    } else {
      const causationMissing = missingEvidence.filter(e => e.category === "CAUSATION" && e.status === "MISSING").length;
      const score = causationMissing === 0 ? 70 : Math.max(0, 70 - causationMissing * 15);
      scores.push({
        area: "Causation",
        score,
        level: scoreToRagLevel(score),
        message: causationMissing === 0 ? "Causation evidence appears sufficient" : `${causationMissing} causation-related document(s) missing`,
      });
    }
  }

  // Limitation
  if (limitationInfo) {
    let score: number;
    if (limitationInfo.isExpired) {
      score = 0;
    } else {
      const days = limitationInfo.daysRemaining ?? 999;
      if (days <= 30) score = 10;
      else if (days <= 90) score = 30;
      else if (days <= 180) score = 50;
      else if (days <= 365) score = 70;
      else score = 100;
    }
    scores.push({
      area: "Limitation",
      score,
      level: scoreToRagLevel(score),
      message: limitationInfo.isExpired
        ? "Limitation period may have expired"
        : limitationInfo.daysRemaining && limitationInfo.daysRemaining <= 30
        ? `Critical: only ${limitationInfo.daysRemaining} days until limitation`
        : limitationInfo.daysRemaining
        ? `${limitationInfo.daysRemaining} days until limitation`
        : "Limitation currently clear",
    });
  } else {
    scores.push({
      area: "Limitation",
      score: 100,
      level: "green",
      message: "Limitation currently clear",
    });
  }

  // Calculate overall score (minimum of all dimension scores)
  const overallScore = scores.length > 0 
    ? Math.min(...scores.map(s => s.score))
    : 50;
  
  const overallLevel = scoreToRagLevel(overallScore);

  return {
    overallLevel,
    overallScore,
    scores,
  };
}

function scoreToRagLevel(score: number): CaseInsightsRagLevel {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

// =============================================================================
// Briefing Builder
// =============================================================================

function buildBriefing(
  input: CaseInsightsInput,
  rag: CaseInsights["rag"],
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>> | undefined,
): CaseInsightsBriefing {
  const { caseRecord, riskFlags, missingEvidence, limitationInfo, documents } = input;
  const practiceAreaLabel = PRACTICE_AREA_LABELS[(caseRecord.practice_area ?? "other_litigation") as PracticeArea] || "Litigation";

  const clientName = keyFacts?.clientName || "client";
  const opponentName = keyFacts?.opponentName || "opponent";
  const stage = keyFacts?.stage || "early stage"; // Stage now derived from keyFacts only (cases.status column removed)

  // Build overview
  let overview = "";

  // Sentence 1: What the case is
  overview += `${practiceAreaLabel} case involving ${clientName}`;
  if (opponentName) {
    overview += ` and ${opponentName}`;
  }
  overview += ". ";

  // Sentence 2: Where it is in the process
  overview += `Currently at ${formatStageLabel(stage)} stage. `;

  // Sentence 3: Overall health
  const criticalRisks = riskFlags.filter(r => r.severity === "critical" && !r.resolved).length;
  const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING").length;
  
  if (rag.overallLevel === "red") {
    overview += `Case health is poor – ${criticalRisks} critical risk(s) and ${criticalMissing} critical evidence gap(s) identified. `;
  } else if (rag.overallLevel === "amber") {
    overview += `Case health is moderate – some gaps or risks present requiring attention. `;
  } else {
    overview += `Case health appears strong with no critical gaps. `;
  }

  // Sentence 4: Top signal
  if (limitationInfo && limitationInfo.isExpired) {
    overview += "URGENT: Limitation period may have expired.";
  } else if (limitationInfo && limitationInfo.daysRemaining && limitationInfo.daysRemaining <= 30) {
    overview += `URGENT: Limitation approaching in ${limitationInfo.daysRemaining} days.`;
  } else if (criticalMissing > 0) {
    overview += `${criticalMissing} critical evidence item(s) missing.`;
  } else if (criticalRisks > 0) {
    overview += `${criticalRisks} critical risk(s) flagged.`;
  } else {
    overview += "No immediate urgent concerns at present.";
  }

  // Build key strengths
  const keyStrengths: string[] = [];
  
  // Check each dimension for strengths
  rag.scores.forEach(score => {
    if (score.level === "green" && score.score >= 80) {
      if (score.area === "Limitation") {
        keyStrengths.push("Limitation currently clear (100% score).");
      } else {
        keyStrengths.push(`${score.area} appears strong (${score.score}% score).`);
      }
    }
  });

  if (documents.length >= 5) {
    keyStrengths.push(`Good document collection (${documents.length} documents uploaded).`);
  }

  if (keyStrengths.length === 0) {
    keyStrengths.push("Case is in early stages – continue building evidence base.");
  }

  // Build key risks
  const keyRisks: string[] = [];

  // Add risks from red/amber scores
  rag.scores.forEach(score => {
    if (score.level === "red" || (score.level === "amber" && score.score < 50)) {
      keyRisks.push(`${score.area}: ${score.message}`);
    }
  });

  // Add critical missing evidence
  const criticalMissingItems = missingEvidence
    .filter(e => e.priority === "CRITICAL" && e.status === "MISSING")
    .slice(0, 5);
  
  criticalMissingItems.forEach(item => {
    keyRisks.push(`Critical evidence missing: ${item.label}`);
  });

  // Add high-priority missing evidence for family cases
  if ((caseRecord.practice_area ?? "").includes("family")) {
    const familyMissing = missingEvidence
      .filter(e => 
        (e.priority === "HIGH" || e.priority === "CRITICAL") && 
        e.status === "MISSING" &&
        (e.label.toLowerCase().includes("miam") ||
         e.label.toLowerCase().includes("fl401") ||
         e.label.toLowerCase().includes("safeguarding") ||
         e.label.toLowerCase().includes("domestic") ||
         e.label.toLowerCase().includes("cafcass") ||
         e.label.toLowerCase().includes("form e"))
      )
      .slice(0, 3);
    
    familyMissing.forEach(item => {
      if (!keyRisks.some(r => r.includes(item.label))) {
        keyRisks.push(`${item.priority} priority: ${item.label}`);
      }
    });
  }

  // Add critical risks
  const criticalRiskFlags = riskFlags
    .filter(r => r.severity === "critical" && !r.resolved)
    .slice(0, 3);
  
  criticalRiskFlags.forEach(risk => {
    if (!keyRisks.some(r => r.includes(risk.description))) {
      keyRisks.push(`Critical risk: ${risk.description}`);
    }
  });

  if (keyRisks.length === 0) {
    keyRisks.push("No significant risks identified at present.");
  }

  // Build urgent actions
  const urgentActions: string[] = [];

  // Limitation actions
  if (limitationInfo && limitationInfo.isExpired) {
    urgentActions.push("URGENT: Review limitation position immediately – period may have expired.");
  } else if (limitationInfo && limitationInfo.daysRemaining && limitationInfo.daysRemaining <= 30) {
    urgentActions.push(`URGENT: Limitation in ${limitationInfo.daysRemaining} days – issue proceedings or review position.`);
  }

  // Critical missing evidence actions
  const topCriticalMissing = missingEvidence
    .filter(e => e.priority === "CRITICAL" && e.status === "MISSING")
    .slice(0, 3);
  
  topCriticalMissing.forEach(item => {
    if (item.suggestedAction) {
      urgentActions.push(item.suggestedAction);
    } else {
      urgentActions.push(`Obtain: ${item.label}`);
    }
  });

  // Family-specific urgent actions
  if ((caseRecord.practice_area ?? "").includes("family")) {
    const needsMiam = missingEvidence.find(e => 
      e.label.toLowerCase().includes("miam") && e.status === "MISSING"
    );
    if (needsMiam) {
      urgentActions.push("Request MIAM certificate or exemption before filing.");
    }

    const needsSafeguarding = missingEvidence.find(e => 
      (e.label.toLowerCase().includes("safeguarding") || 
       e.label.toLowerCase().includes("domestic abuse")) && 
      e.status === "MISSING"
    );
    if (needsSafeguarding) {
      urgentActions.push("Chase client for safeguarding statement and domestic abuse evidence.");
    }
  }

  // Very low scores need attention
  rag.scores.forEach(score => {
    if (score.score < 30 && score.area !== "Limitation") {
      urgentActions.push(`Address ${score.area.toLowerCase()} issues: ${score.message}`);
    }
  });

  return {
    overview,
    keyStrengths,
    keyRisks,
    urgentActions,
  };
}

