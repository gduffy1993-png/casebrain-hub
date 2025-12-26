/**
 * Case Summary Generator
 * 
 * Generates a strong, solicitor-style summary using extracted facts,
 * statutory breaches, and compliance status.
 */

import { getSupabaseAdminClient } from "./supabase";
import { buildKeyFactsSummary } from "./key-facts";
import { findMissingEvidence } from "./missing-evidence";
import { checkAwaabsLaw, checkSection11Lta } from "./housing/compliance";
import { inferAwaabRisks } from "./housing/awaab-inferred";
import type { ExtractedCaseFacts, HousingMeta } from "@/types/case";
import type { PracticeArea } from "./types/casebrain";

type CaseSummaryInput = {
  caseId: string;
  orgId: string;
};

export type CaseSummary = {
  headline: string;
  summary: string;
  statutoryBreaches: string[];
  complianceStatus: "compliant" | "non_compliant" | "unknown";
  keyFacts: string[];
  risks: string[];
  nextActions: string[];
};

/**
 * Generate solicitor-style case summary
 */
export async function generateCaseSummary(input: CaseSummaryInput): Promise<CaseSummary> {
  const { caseId, orgId } = input;
  const supabase = getSupabaseAdminClient();

  // Fetch case data
  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, created_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  const practiceArea = (caseRecord.practice_area ?? "other_litigation") as PracticeArea;

  // Fetch key facts
  const keyFacts = await buildKeyFactsSummary(caseId, orgId);

  // Fetch documents
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, type, extracted_json")
    .eq("case_id", caseId)
    .eq("org_id", orgId);

  // Extract structured facts
  const extractedFacts: ExtractedCaseFacts[] = [];
  for (const doc of documents ?? []) {
    if (doc.extracted_json && typeof doc.extracted_json === "object") {
      const extracted = doc.extracted_json as ExtractedCaseFacts;
      if (extracted.parties || extracted.dates || extracted.keyIssues) {
        extractedFacts.push(extracted);
      }
    }
  }

  // Fetch risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("id, flag_type, severity, description, resolved")
    .eq("case_id", caseId)
    .eq("resolved", false);

  // Fetch missing evidence
  const missingEvidenceItems = findMissingEvidence(
    caseId,
    practiceArea,
    (documents ?? []).map(d => ({ name: d.name, type: d.type ?? undefined }))
  );

  // Build summary components
  const headline = buildHeadline(caseRecord, keyFacts, practiceArea);
  const summary = buildSummaryText(caseRecord, keyFacts, practiceArea, extractedFacts);
  const statutoryBreaches = await buildStatutoryBreaches(caseId, orgId, practiceArea, extractedFacts);
  const complianceStatus = determineComplianceStatus(statutoryBreaches, riskFlags ?? []);
  const keyFactsList = buildKeyFactsList(keyFacts, extractedFacts);
  const risksList = buildRisksList(riskFlags ?? [], missingEvidenceItems);
  const nextActions = await buildNextActions(caseId, caseRecord, riskFlags ?? [], missingEvidenceItems);

  return {
    headline,
    summary,
    statutoryBreaches,
    complianceStatus,
    keyFacts: keyFactsList,
    risks: risksList,
    nextActions,
  };
}

function buildHeadline(
  caseRecord: { title: string; practice_area?: string | null },
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  practiceArea: PracticeArea,
): string {
  const practiceAreaLabel = practiceArea === "housing_disrepair" ? "Housing Disrepair" :
    practiceArea === "personal_injury" ? "Personal Injury" :
    practiceArea === "clinical_negligence" ? "Clinical Negligence" :
    practiceArea === "family" ? "Family" :
    practiceArea === "criminal" ? "Criminal Defence" :
    "General Litigation";

  const stage = keyFacts.stage.replace(/_/g, " ").toUpperCase();
  return `${practiceAreaLabel} case - ${stage} stage`;
}

function buildSummaryText(
  caseRecord: { title: string; summary?: string | null },
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  practiceArea: PracticeArea,
  extractedFacts: ExtractedCaseFacts[],
): string {
  if (practiceArea === "criminal") {
    // Use new Disclosure-First Executive Brief structure for criminal cases
    return buildCriminalDisclosureFirstBrief(caseRecord, keyFacts, extractedFacts);
  }

  let summary = `This is a ${practiceArea.replace(/_/g, " ")} case currently at ${keyFacts.stage.replace(/_/g, " ")} stage. `;

  if (keyFacts.clientName && keyFacts.opponentName) {
    summary += `The matter involves ${keyFacts.clientName} (claimant) and ${keyFacts.opponentName} (defendant). `;
  }

  if (keyFacts.headlineSummary) {
    summary += keyFacts.headlineSummary;
  } else if (caseRecord.summary) {
    summary += caseRecord.summary;
  } else if (extractedFacts.length > 0 && extractedFacts[0].summary) {
    summary += extractedFacts[0].summary;
  } else {
    summary += "Case details are being compiled from uploaded documents.";
  }

  if (keyFacts.primaryIssues.length > 0) {
    summary += ` Key issues identified include: ${keyFacts.primaryIssues.slice(0, 3).join(", ")}.`;
  }

  return summary;
}

async function buildStatutoryBreaches(
  caseId: string,
  orgId: string,
  practiceArea: PracticeArea,
  extractedFacts: ExtractedCaseFacts[],
): Promise<string[]> {
  const breaches: string[] = [];

  if (practiceArea === "housing_disrepair") {
    const supabase = getSupabaseAdminClient();
    const { data: housingCase } = await supabase
      .from("housing_cases")
      .select("first_report_date, landlord_type")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (housingCase) {
      const isSocialLandlord = housingCase.landlord_type === "social" || 
                               housingCase.landlord_type === "council";

      // Check Awaab's Law
      if (isSocialLandlord && housingCase.first_report_date) {
        const firstReport = new Date(housingCase.first_report_date);
        const awaabChecks = checkAwaabsLaw(firstReport, null, null, null, true);
        const awaabBreaches = awaabChecks.filter(c => !c.passed);
        awaabBreaches.forEach(check => {
          breaches.push(`Awaab's Law: ${check.rule} - ${check.details}`);
        });

        // Check inferred Awaab risks
        if (extractedFacts.length > 0) {
          const inferredRisks = inferAwaabRisks(
            caseId,
            extractedFacts,
            extractedFacts[0]?.housingMeta,
            firstReport,
            isSocialLandlord,
          );
          inferredRisks.forEach(risk => {
            if (risk.statutoryBreach) {
              breaches.push(`Possible Awaab's Law breach: ${risk.description}`);
            }
          });
        }
      }

      // Check Section 11 LTA
      if (housingCase.first_report_date) {
        const firstReport = new Date(housingCase.first_report_date);
        const section11Checks = checkSection11Lta(firstReport, null, 0, 0, false);
        const section11Breaches = section11Checks.filter(c => !c.passed && c.severity !== "low");
        section11Breaches.forEach(check => {
          breaches.push(`Section 11 LTA: ${check.rule} - ${check.details}`);
        });
      }
    }
  }

  return breaches;
}

function determineComplianceStatus(
  statutoryBreaches: string[],
  riskFlags: Array<{ severity: string; resolved: boolean }>,
): "compliant" | "non_compliant" | "unknown" {
  if (statutoryBreaches.length > 0) {
    return "non_compliant";
  }

  const criticalRisks = riskFlags.filter(r => r.severity === "critical" && !r.resolved);
  if (criticalRisks.length > 0) {
    return "non_compliant";
  }

  if (riskFlags.length === 0) {
    return "unknown";
  }

  return "compliant";
}

/**
 * Build Disclosure-First Executive Brief for criminal cases
 * Replaces narrative paragraph style with structured solicitor-style brief
 */
function buildCriminalDisclosureFirstBrief(
  caseRecord: { title: string; summary?: string | null },
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  extractedFacts: ExtractedCaseFacts[],
): string {
  const sections: string[] = [];
  
  // A) What we have (from supplied documents)
  sections.push("A) WHAT WE HAVE (from supplied documents):");
  const docTypes: string[] = [];
  extractedFacts.forEach(fact => {
    if (fact.summary) {
      // Extract document types from summary if available
      const docMentions = fact.summary.match(/(?:MG\d+|charge sheet|indictment|witness statement|CCTV|BWV|999|custody record|interview)/gi);
      if (docMentions) {
        docTypes.push(...docMentions.map(d => d.toLowerCase()));
      }
    }
  });
  if (docTypes.length > 0) {
    const uniqueDocs = Array.from(new Set(docTypes)).slice(0, 5);
    sections.push(`- Documents referenced: ${uniqueDocs.join(", ")}`);
  } else {
    sections.push("- Documents: Being compiled from uploaded bundle");
  }
  
  // B) Allegation/Charge (UNCONFIRMED until charge sheet/indictment present)
  sections.push("\nB) ALLEGATION/CHARGE (UNCONFIRMED until charge sheet/indictment present):");
  const criminalMeta = extractedFacts.find(f => f.criminalMeta)?.criminalMeta;
  if (criminalMeta?.charges && criminalMeta.charges.length > 0) {
    criminalMeta.charges.slice(0, 3).forEach(charge => {
      sections.push(`- Reported: ${charge.offence}${charge.section ? ` (${charge.section})` : ""}`);
    });
    sections.push("- Charge requires confirmation from charge sheet/indictment.");
  } else if (keyFacts.causeOfAction) {
    sections.push(`- Reported: ${keyFacts.causeOfAction}`);
    sections.push("- Charge requires confirmation from charge sheet/indictment.");
  } else {
    sections.push("- No charges confirmed from charge sheet/indictment.");
    sections.push("- Charge requires confirmation from charge sheet/indictment.");
  }
  
  // C) Evidence references (NOT VERIFIED unless present in supplied docs)
  sections.push("\nC) EVIDENCE REFERENCES (NOT VERIFIED unless present in supplied docs):");
  const evidenceStatus: string[] = [];
  
  // Check for CCTV
  const hasCCTV = extractedFacts.some(f => 
    f.criminalMeta?.prosecutionEvidence?.some(e => e.type === "CCTV") ||
    f.summary?.toLowerCase().includes("cctv")
  );
  evidenceStatus.push(`- CCTV: Referenced: ${hasCCTV ? "yes" : "no"} | Continuity: unknown`);
  
  // Check for witness ID
  const hasWitnessID = extractedFacts.some(f => 
    f.criminalMeta?.prosecutionEvidence?.some(e => e.type === "witness_statement") ||
    f.summary?.toLowerCase().includes("witness")
  );
  evidenceStatus.push(`- Witness ID: Referenced: ${hasWitnessID ? "yes" : "no"}`);
  
  // Check for medical
  const hasMedical = extractedFacts.some(f => 
    f.summary?.toLowerCase().includes("medical") || 
    f.summary?.toLowerCase().includes("injury")
  );
  evidenceStatus.push(`- Medical: Present: ${hasMedical ? "yes" : "no"}`);
  
  // Check for forensics
  const hasForensics = extractedFacts.some(f => 
    f.criminalMeta?.prosecutionEvidence?.some(e => e.type === "forensic") ||
    f.summary?.toLowerCase().includes("forensic")
  );
  evidenceStatus.push(`- Forensics: Referenced: ${hasForensics ? "yes" : "no"}`);
  
  // Check for weapon
  const hasWeapon = extractedFacts.some(f => 
    f.summary?.toLowerCase().includes("weapon") || 
    f.summary?.toLowerCase().includes("pipe")
  );
  evidenceStatus.push(`- Weapon: Referenced: ${hasWeapon ? "yes" : "no"}`);
  
  // Check for interview
  const hasInterview = extractedFacts.some(f => 
    f.criminalMeta?.paceCompliance ||
    f.summary?.toLowerCase().includes("interview") ||
    f.summary?.toLowerCase().includes("no comment")
  );
  evidenceStatus.push(`- Interview: Referenced: ${hasInterview ? "yes" : "no"} (no-comment etc)`);
  
  sections.push(...evidenceStatus);
  
  // D) Key risks / uncertainties (because bundle thin)
  sections.push("\nD) KEY RISKS / UNCERTAINTIES (because bundle thin):");
  sections.push("- Bundle coverage thin: treat gaps as likely until confirmed");
  if (keyFacts.mainRisks.length > 0) {
    keyFacts.mainRisks.slice(0, 3).forEach(risk => {
      sections.push(`- ${risk}`);
    });
  } else {
    sections.push("- Outstanding disclosure items may materially affect case assessment");
  }
  
  // E) Immediate next actions (Disclosure-first)
  sections.push("\nE) IMMEDIATE NEXT ACTIONS (Disclosure-first):");
  const requestList = [
    "MG6C/MG6D",
    "Disclosure schedules",
    "Custody record",
    "Legal advice log",
    "Interview recording",
    "CCTV/BWV/999",
    "Exhibit list",
    "Continuity statements",
    "Forensics submission/results"
  ];
  sections.push("- Request list: " + requestList.join(", "));
  
  // F) Guardrail line
  sections.push("\nF) GUARDRAIL:");
  sections.push("- Do not form a fixed merits view until disclosure is stabilised.");
  
  return sections.join("\n");
}

function buildKeyFactsList(
  keyFacts: Awaited<ReturnType<typeof buildKeyFactsSummary>>,
  extractedFacts: ExtractedCaseFacts[],
): string[] {
  const facts: string[] = [];

  if (keyFacts.clientName) {
    facts.push(`Client: ${keyFacts.clientName}`);
  }
  if (keyFacts.opponentName) {
    facts.push(`Opponent: ${keyFacts.opponentName}`);
  }
  if (keyFacts.claimType) {
    facts.push(`Claim Type: ${keyFacts.claimType}`);
  }
  if (keyFacts.causeOfAction) {
    facts.push(`Cause of Action: ${keyFacts.causeOfAction}`);
  }
  if (keyFacts.approxValue) {
    facts.push(`Approximate Value: ${keyFacts.approxValue}`);
  }

  // Add key dates
  keyFacts.keyDates.slice(0, 3).forEach(kd => {
    facts.push(`${kd.label}: ${new Date(kd.date).toLocaleDateString("en-GB")}`);
  });

  return facts;
}

function buildRisksList(
  riskFlags: Array<{ severity: string; description: string; resolved: boolean }>,
  missingEvidence: Array<{ id: string; caseId: string; category: "LIABILITY" | "CAUSATION" | "QUANTUM" | "PROCEDURE" | "HOUSING"; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; label: string; reason: string; status: "MISSING" | "REQUESTED" | "RECEIVED" }>,
): string[] {
  const risks: string[] = [];

  // Critical risks first
  const criticalRisks = riskFlags.filter(r => r.severity === "critical" && !r.resolved);
  criticalRisks.forEach(r => risks.push(`[CRITICAL] ${r.description}`));

  // High risks
  const highRisks = riskFlags.filter(r => r.severity === "high" && !r.resolved);
  highRisks.forEach(r => risks.push(`[HIGH] ${r.description}`));

  // Critical missing evidence
  const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL");
  criticalMissing.forEach(e => risks.push(`[CRITICAL] Missing evidence: ${e.label}`));

  return risks.slice(0, 5); // Top 5 risks
}

async function buildNextActions(
  caseId: string,
  caseRecord: { practice_area?: string | null; created_at?: string },
  riskFlags: Array<{ severity: string; flag_type: string; description: string; resolved: boolean }>,
  missingEvidence: Array<{ id: string; caseId: string; category: "LIABILITY" | "CAUSATION" | "QUANTUM" | "PROCEDURE" | "HOUSING"; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; label: string; reason: string; status: "MISSING" | "REQUESTED" | "RECEIVED"; suggestedAction?: string }>,
): Promise<string[]> {
  const { calculateAllNextSteps } = await import("./next-step");
  const { calculateLimitation } = await import("./core/limitation");

  const practiceArea = caseRecord.practice_area ?? "general";
  const limitationResult = calculateLimitation({
    incidentDate: caseRecord.created_at ?? new Date().toISOString(),
    practiceArea: practiceArea === "housing_disrepair" ? "housing" :
                  practiceArea === "personal_injury" ? "pi_rta" : "other",
  });

  const nextSteps = calculateAllNextSteps({
    caseId,
    practiceArea,
    limitationInfo: limitationResult.limitationDate ? {
      caseId,
      primaryLimitationDate: limitationResult.limitationDate,
      daysRemaining: limitationResult.daysRemaining ?? 0,
      isExpired: limitationResult.isExpired ?? false,
      severity: limitationResult.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      practiceArea: practiceArea as PracticeArea,
      causeOfAction: "unknown",
    } : undefined,
    riskFlags: riskFlags.map(rf => ({
      id: rf.flag_type,
      caseId,
      severity: rf.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      type: rf.flag_type as any,
      code: rf.flag_type.toUpperCase(),
      title: rf.flag_type.replace(/_/g, " "),
      message: rf.description,
      source: "risk_detection",
      status: rf.resolved ? "resolved" as const : "outstanding" as const,
      createdAt: new Date().toISOString(),
    })),
    missingEvidence,
    pendingChasers: [],
    hasRecentAttendanceNote: false,
    daysSinceLastUpdate: 0,
  });

  return nextSteps.map(step => step.title).slice(0, 3);
}

