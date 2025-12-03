/**
 * Key Facts Brain
 * 
 * Builds a comprehensive summary of key case facts by pulling from
 * existing case data, brains, and optionally using AI to fill gaps.
 */

import { getSupabaseAdminClient } from "./supabase";
import { calculateNextStep } from "./next-step";
import type {
  KeyFactsSummary,
  KeyFactsStage,
  KeyFactsFundingType,
  KeyFactsKeyDate,
  RiskFlag,
  LimitationInfo,
} from "./types/casebrain";

/**
 * Build a key facts summary for a case
 */
export async function buildKeyFactsSummary(
  caseId: string,
  orgId: string,
): Promise<KeyFactsSummary> {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch base case record
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, status, created_at")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (!caseData) {
    throw new Error("Case not found");
  }

  // 2. Fetch PI case data if applicable
  const { data: piCase } = await supabase
    .from("pi_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  // 3. Fetch Housing case data if applicable
  const { data: housingCase } = await supabase
    .from("housing_cases")
    .select("*")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  // 4. Fetch risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("id, flag_type, severity, description, resolved")
    .eq("case_id", caseId)
    .eq("resolved", false);

  // 5. Fetch deadlines
  const { data: deadlines } = await supabase
    .from("deadlines")
    .select("id, title, due_date")
    .eq("case_id", caseId)
    .order("due_date", { ascending: true });

  // 6. Fetch case notes for client objectives (first attendance note)
  const { data: caseNotes } = await supabase
    .from("case_notes")
    .select("id, body, is_attendance, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(5);

  // 7. Fetch documents for timeline extraction and structured facts
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, type, created_at, extracted_json")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50); // Limit to prevent memory issues

  // Ensure we have at least an empty array
  if (!documents) {
    console.warn(`[buildKeyFactsSummary] No documents found for case ${caseId}`);
  }

  // === Build Key Facts ===

  // Determine stage
  const stage = determineStage(caseData, piCase, housingCase);

  // Determine funding type
  const fundingType = determineFundingType(piCase);

  // Build key dates
  const keyDates = buildKeyDates(caseData, piCase, housingCase, deadlines ?? []);

  // Extract main risks
  const mainRisks = (riskFlags ?? [])
    .filter(r => r.severity === "critical" || r.severity === "high")
    .map(r => r.description)
    .slice(0, 5);

  // Extract primary issues from documents
  const primaryIssues = extractPrimaryIssues(documents ?? []);

  // Get next step brief
  const nextStepsBrief = await getNextStepBrief(caseId, caseData, riskFlags ?? [], documents ?? []);

  // Get client objectives from available data
  const whatClientWants = getClientObjectives(caseData, caseNotes ?? [], piCase);

  // Determine approximate value
  const approxValue = getApproxValue(piCase, housingCase);

  // Determine claim type
  const claimType = getClaimType(caseData.practice_area, piCase, housingCase);

  // Get opponent name
  const opponentName = getOpponentName(piCase, housingCase);

  return {
    caseId,
    clientName: piCase?.claimant_name ?? housingCase?.tenant_name ?? undefined,
    opponentName,
    courtName: piCase?.court_name ?? undefined,
    claimType,
    causeOfAction: piCase?.liability_type ?? housingCase?.claim_type ?? undefined,
    stage,
    fundingType,
    approxValue,
    headlineSummary: caseData.summary ?? undefined,
    whatClientWants,
    keyDates,
    mainRisks,
    primaryIssues,
    nextStepsBrief,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function determineStage(
  caseData: { status?: string; practice_area?: string },
  piCase: { stage?: string } | null,
  housingCase: { stage?: string } | null,
): KeyFactsStage {
  // Check PI case stage
  if (piCase?.stage) {
    const piStage = piCase.stage.toLowerCase();
    if (piStage.includes("pre")) return "pre_action";
    if (piStage.includes("issue")) return "issued";
    if (piStage.includes("trial")) return "trial_prep";
    if (piStage.includes("settle")) return "settled";
  }

  // Check housing case stage
  if (housingCase?.stage) {
    const hStage = housingCase.stage.toLowerCase();
    if (hStage === "pre_action") return "pre_action";
    if (hStage === "litigation") return "issued";
    if (hStage === "settlement") return "settled";
    if (hStage === "closed") return "closed";
  }

  // Fall back to case status
  const status = caseData.status?.toLowerCase() ?? "";
  if (status.includes("pre")) return "pre_action";
  if (status.includes("issue")) return "issued";
  if (status.includes("trial")) return "trial_prep";
  if (status.includes("settle")) return "settled";
  if (status.includes("close")) return "closed";

  return "other";
}

function determineFundingType(
  piCase: { funding_type?: string } | null,
): KeyFactsFundingType {
  if (!piCase?.funding_type) return "unknown";
  
  const ft = piCase.funding_type.toLowerCase();
  if (ft.includes("cfa")) return "cfa";
  if (ft.includes("private")) return "private";
  if (ft.includes("legal_aid") || ft.includes("legal aid")) return "legal_aid";
  if (ft.includes("dba")) return "dba";
  if (ft.includes("aei") || ft.includes("after")) return "after_event";
  
  return "other";
}

function buildKeyDates(
  caseData: { created_at: string },
  piCase: { 
    incident_date?: string; 
    instructions_date?: string;
    limitation_date?: string;
    issue_date?: string;
  } | null,
  housingCase: { 
    first_complaint_date?: string;
    issue_date?: string;
  } | null,
  deadlines: Array<{ title: string; due_date: string }>,
): KeyFactsKeyDate[] {
  const dates: KeyFactsKeyDate[] = [];
  const now = new Date();

  // Instructions/first contact date
  const instructionsDate = piCase?.instructions_date ?? caseData.created_at;
  dates.push({
    label: "Instructions",
    date: instructionsDate,
    isPast: new Date(instructionsDate) < now,
  });

  // Incident date
  if (piCase?.incident_date) {
    dates.push({
      label: "Incident",
      date: piCase.incident_date,
      isPast: true,
    });
  }
  if (housingCase?.first_complaint_date) {
    dates.push({
      label: "First Complaint",
      date: housingCase.first_complaint_date,
      isPast: true,
    });
  }

  // Limitation date
  if (piCase?.limitation_date) {
    const limitDate = new Date(piCase.limitation_date);
    const daysRemaining = Math.ceil((limitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    dates.push({
      label: "Limitation",
      date: piCase.limitation_date,
      isPast: daysRemaining < 0,
      isUrgent: daysRemaining > 0 && daysRemaining <= 90,
    });
  }

  // Issue date
  const issueDate = piCase?.issue_date ?? housingCase?.issue_date;
  if (issueDate) {
    dates.push({
      label: "Issued",
      date: issueDate,
      isPast: new Date(issueDate) < now,
    });
  }

  // Next critical deadline
  const nextDeadline = deadlines.find(d => new Date(d.due_date) > now);
  if (nextDeadline) {
    const daysUntil = Math.ceil((new Date(nextDeadline.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    dates.push({
      label: `Next: ${nextDeadline.title}`,
      date: nextDeadline.due_date,
      isPast: false,
      isUrgent: daysUntil <= 14,
    });
  }

  // Sort by date
  return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Extract primary issues from structured extraction data
 * Uses extracted_json structured facts as primary input
 * Falls back to summary text if structured data is missing
 */
function extractPrimaryIssues(
  documents: Array<{ extracted_json?: unknown; name?: string }>,
): string[] {
  const issues: string[] = [];
  const seenIssues = new Set<string>();
  
  // Process documents in reverse order (newest first) to prioritize recent extractions
  for (const doc of documents.slice().reverse()) {
    if (doc.extracted_json && typeof doc.extracted_json === "object") {
      const extracted = doc.extracted_json as { 
        keyIssues?: string[];
        summary?: string;
        housingMeta?: {
          propertyDefects?: Array<{ type: string; severity?: string }>;
          hhsrsHazards?: string[];
        };
      };
      
      // Primary: Use structured keyIssues
      if (Array.isArray(extracted.keyIssues) && extracted.keyIssues.length > 0) {
        for (const issue of extracted.keyIssues) {
          const normalized = issue.trim().toLowerCase();
          if (normalized && !seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issue.trim());
          }
        }
      }
      
      // Fallback: Extract from housing defects if no keyIssues
      if (issues.length === 0 && extracted.housingMeta?.propertyDefects) {
        for (const defect of extracted.housingMeta.propertyDefects) {
          const issueText = `${defect.type}${defect.severity ? ` (${defect.severity})` : ""}`;
          const normalized = issueText.toLowerCase();
          if (!seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issueText);
          }
        }
      }
      
      // Fallback: Extract from HHSRS hazards
      if (extracted.housingMeta?.hhsrsHazards && extracted.housingMeta.hhsrsHazards.length > 0) {
        for (const hazard of extracted.housingMeta.hhsrsHazards) {
          const issueText = `HHSRS hazard: ${hazard}`;
          const normalized = issueText.toLowerCase();
          if (!seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issueText);
          }
        }
      }

      // Final fallback: Extract key phrases from summary if no structured issues
      if (issues.length === 0 && extracted.summary) {
        const summaryLower = extracted.summary.toLowerCase();
        if (summaryLower.includes("damp") || summaryLower.includes("mould")) {
          issues.push("Damp and mould issues");
        }
        if (summaryLower.includes("awaab") || summaryLower.includes("awaab's law")) {
          issues.push("Potential Awaab's Law breach");
        }
        if (summaryLower.includes("category 1") || summaryLower.includes("cat 1")) {
          issues.push("Category 1 hazard identified");
        }
        if (summaryLower.includes("child") && (summaryLower.includes("health") || summaryLower.includes("asthma"))) {
          issues.push("Child health impact from disrepair");
        }
      }
    }
  }

  // Limit to top 5 most relevant issues
  return issues.slice(0, 5);
}

async function getNextStepBrief(
  caseId: string,
  caseData: { practice_area?: string },
  riskFlags: Array<{ severity: string; flag_type: string; description: string; resolved: boolean }>,
  documents: Array<{ name: string; type?: string }>,
): Promise<string | undefined> {
  const convertedRiskFlags = riskFlags.map(rf => ({
    id: rf.flag_type,
    caseId,
    severity: rf.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    type: rf.flag_type as RiskFlag["type"],
    code: rf.flag_type.toUpperCase(),
    title: rf.flag_type.replace(/_/g, " "),
    message: rf.description,
    source: "risk_detection",
    status: rf.resolved ? "resolved" as const : "outstanding" as const,
    createdAt: new Date().toISOString(),
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

  return nextStep?.title;
}

function getClientObjectives(
  caseData: { summary?: string; title: string },
  caseNotes: Array<{ body: string; is_attendance: boolean }>,
  piCase: { client_objectives?: string } | null,
): string | undefined {
  // First check for explicit client objectives
  if (piCase?.client_objectives) {
    return piCase.client_objectives;
  }

  // Try to find in first attendance note
  const attendanceNote = caseNotes.find(n => n.is_attendance);
  if (attendanceNote?.body) {
    // Look for explicit objectives pattern
    const objectivesMatch = attendanceNote.body.match(/(?:client wants?|objectives?|seeking|wishes? to)[:\s]+([^.]+)/i);
    if (objectivesMatch) {
      return objectivesMatch[1].trim();
    }
  }

  // Try to extract from case summary
  if (caseData.summary) {
    const summaryMatch = caseData.summary.match(/(?:client wants?|objectives?|seeking|wishes? to|claims? for)[:\s]+([^.]+)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
  }

  // TODO: Could use AI to summarize client objectives from notes
  return undefined;
}

function getApproxValue(
  piCase: { claim_value?: number; estimated_damages?: number } | null,
  housingCase: { estimated_damages?: number } | null,
): string | undefined {
  const value = piCase?.claim_value ?? piCase?.estimated_damages ?? housingCase?.estimated_damages;
  
  if (!value) return undefined;
  
  // Format as bracket
  if (value < 10000) return "Small claims (< £10k)";
  if (value < 25000) return "Fast track (£10k-£25k)";
  if (value < 100000) return "Multi-track (£25k-£100k)";
  return "High value (> £100k)";
}

function getClaimType(
  practiceArea: string | undefined,
  piCase: { claim_type?: string; liability_type?: string } | null,
  housingCase: { claim_type?: string } | null,
): string | undefined {
  if (piCase?.claim_type) return piCase.claim_type;
  if (piCase?.liability_type) return piCase.liability_type;
  if (housingCase?.claim_type) return housingCase.claim_type;
  
  // Fall back to practice area
  if (practiceArea === "pi") return "Personal Injury";
  if (practiceArea === "clinical_negligence") return "Clinical Negligence";
  if (practiceArea === "housing_disrepair") return "Housing Disrepair";
  
  return undefined;
}

function getOpponentName(
  piCase: { defendant_name?: string; insurer_name?: string } | null,
  housingCase: { landlord_name?: string } | null,
): string | undefined {
  if (piCase?.defendant_name) return piCase.defendant_name;
  if (piCase?.insurer_name) return `${piCase.insurer_name} (Insurer)`;
  if (housingCase?.landlord_name) return housingCase.landlord_name;
  return undefined;
}

