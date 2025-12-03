/**
 * Compliance Brain
 * 
 * Calculates compliance scores and identifies gaps across all cases.
 * Used by the Compliance Dashboard.
 * 
 * Now uses the pack system for practice-area-specific compliance requirements.
 */

import type {
  CaseComplianceScore,
  ComplianceGap,
  Severity,
  HeatmapStatus,
  MissingEvidenceItem,
  RiskFlag,
  LimitationInfo,
  PracticeArea,
} from "./types/casebrain";
import { getPackForPracticeArea, type PackComplianceItem } from "./packs";

type ComplianceInput = {
  caseId: string;
  caseTitle: string;
  clientName?: string;
  opponentName?: string;
  practiceArea: string;
  limitationInfo?: LimitationInfo;
  riskFlags: RiskFlag[];
  missingEvidence: MissingEvidenceItem[];
  awaabRiskLevel?: Severity;
  // Document presence checks
  documents: Array<{ name: string; type?: string; created_at: string }>;
  // Case metadata
  hasAttendanceNote: boolean;
  lastNoteDate?: string;
  caseCreatedAt: string;
};

/**
 * Core compliance gap definitions
 */
const COMPLIANCE_REQUIREMENTS: Array<{
  type: ComplianceGap["type"];
  label: string;
  detectPatterns: string[];
  severity: Severity;
  suggestion: string;
}> = [
  {
    type: "AML",
    label: "AML / ID Verification",
    detectPatterns: ["aml", "anti-money", "id verification", "identity", "kyc", "proof of id"],
    severity: "CRITICAL",
    suggestion: "Obtain client ID and complete AML checks immediately",
  },
  {
    type: "CFA",
    label: "Signed CFA / Retainer",
    detectPatterns: ["cfa", "conditional fee", "retainer", "engagement letter", "terms of business"],
    severity: "CRITICAL",
    suggestion: "Ensure signed funding agreement is on file",
  },
  {
    type: "CONFLICT",
    label: "Conflict Check",
    detectPatterns: ["conflict check", "conflict of interest", "conflicts register"],
    severity: "HIGH",
    suggestion: "Document conflict check in case file",
  },
  {
    type: "INSTRUCTIONS",
    label: "Client Instructions",
    detectPatterns: ["instructions", "client authority", "instruction letter"],
    severity: "HIGH",
    suggestion: "Record clear client instructions for current stage",
  },
  {
    type: "ATTENDANCE_NOTE",
    label: "Key Advice Attendance Note",
    detectPatterns: ["attendance note", "file note", "advice note", "call note"],
    severity: "MEDIUM",
    suggestion: "Create attendance note documenting key advice given",
  },
  {
    type: "AUTHORITY",
    label: "Authority to Act",
    detectPatterns: ["authority to act", "loa", "letter of authority"],
    severity: "MEDIUM",
    suggestion: "Obtain signed authority to act from client",
  },
];

/**
 * Convert pack compliance item to gap type
 */
function packItemToGapType(itemId: string): ComplianceGap["type"] {
  const id = itemId.toLowerCase();
  if (id.includes("aml") || id.includes("kyc")) return "AML";
  if (id.includes("cfa") || id.includes("retainer") || id.includes("funding")) return "CFA";
  if (id.includes("conflict")) return "CONFLICT";
  if (id.includes("instruction")) return "INSTRUCTIONS";
  if (id.includes("attendance") || id.includes("note")) return "ATTENDANCE_NOTE";
  if (id.includes("authority")) return "AUTHORITY";
  return "RETAINER";
}

/**
 * Get compliance requirements for a practice area from the pack system
 */
function getPackComplianceItems(practiceArea: string): PackComplianceItem[] {
  const pack = getPackForPracticeArea(practiceArea as PracticeArea);
  return pack.complianceItems;
}

/**
 * Check for compliance gaps based on documents present
 * Now uses pack-specific compliance items when available
 */
function detectComplianceGaps(
  documents: Array<{ name: string; type?: string }>,
  hasAttendanceNote: boolean,
  lastNoteDate?: string,
  caseCreatedAt?: string,
  practiceArea?: string,
): ComplianceGap[] {
  const gaps: ComplianceGap[] = [];
  const docNames = documents.map(d => d.name.toLowerCase()).join(" ");
  const docTypes = documents.map(d => (d.type ?? "").toLowerCase()).join(" ");
  const searchText = docNames + " " + docTypes;

  // Get pack-specific compliance items if available
  const packItems = practiceArea ? getPackComplianceItems(practiceArea) : [];
  
  // If pack has compliance items, use those; otherwise fall back to base requirements
  const requirements = packItems.length > 0
    ? packItems.map(item => ({
        type: packItemToGapType(item.id) as ComplianceGap["type"],
        label: item.label,
        detectPatterns: item.detectPatterns,
        severity: item.severity,
        suggestion: item.description,
      }))
    : COMPLIANCE_REQUIREMENTS;

  for (const req of requirements) {
    const found = req.detectPatterns.some(pattern => 
      searchText.includes(pattern.toLowerCase())
    );

    if (!found) {
      // Special handling for attendance notes
      if (req.type === "ATTENDANCE_NOTE") {
        if (hasAttendanceNote) {
          // Check if note is recent (within 30 days for active cases)
          if (lastNoteDate) {
            const daysSinceNote = Math.floor(
              (Date.now() - new Date(lastNoteDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceNote > 30) {
              gaps.push({
                type: req.type,
                label: req.label,
                status: "EXPIRED",
                severity: "MEDIUM",
                suggestion: `Last attendance note was ${daysSinceNote} days ago. Consider adding a recent note.`,
              });
            }
            continue;
          }
        }
      }

      gaps.push({
        type: req.type,
        label: req.label,
        status: "MISSING",
        severity: req.severity,
        suggestion: req.suggestion,
      });
    }
  }

  return gaps;
}

/**
 * Calculate overall compliance score
 */
function calculateComplianceScore(
  limitationInfo?: LimitationInfo,
  riskFlags: RiskFlag[] = [],
  missingEvidence: MissingEvidenceItem[] = [],
  complianceGaps: ComplianceGap[] = [],
  awaabRiskLevel?: Severity,
): { score: number; status: HeatmapStatus } {
  let score = 100;

  // Deduct for limitation risk
  if (limitationInfo) {
    if (limitationInfo.isExpired) {
      score -= 40;
    } else if (limitationInfo.daysRemaining <= 30) {
      score -= 30;
    } else if (limitationInfo.daysRemaining <= 90) {
      score -= 20;
    } else if (limitationInfo.daysRemaining <= 180) {
      score -= 10;
    }
  }

  // Deduct for risk flags
  const criticalRisks = riskFlags.filter(r => r.severity === "CRITICAL" && r.status === "outstanding").length;
  const highRisks = riskFlags.filter(r => r.severity === "HIGH" && r.status === "outstanding").length;
  const mediumRisks = riskFlags.filter(r => r.severity === "MEDIUM" && r.status === "outstanding").length;

  score -= criticalRisks * 15;
  score -= highRisks * 8;
  score -= mediumRisks * 3;

  // Deduct for missing evidence
  const criticalMissing = missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING").length;
  const highMissing = missingEvidence.filter(e => e.priority === "HIGH" && e.status === "MISSING").length;

  score -= criticalMissing * 10;
  score -= highMissing * 5;

  // Deduct for compliance gaps
  const criticalGaps = complianceGaps.filter(g => g.severity === "CRITICAL").length;
  const highGaps = complianceGaps.filter(g => g.severity === "HIGH").length;

  score -= criticalGaps * 12;
  score -= highGaps * 6;

  // Deduct for Awaab risk
  if (awaabRiskLevel === "CRITICAL") score -= 15;
  else if (awaabRiskLevel === "HIGH") score -= 10;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: HeatmapStatus;
  if (score >= 70) status = "GREEN";
  else if (score >= 40) status = "AMBER";
  else status = "RED";

  return { score, status };
}

/**
 * Build compliance score for a single case
 */
export function buildCaseComplianceScore(input: ComplianceInput): CaseComplianceScore {
  const complianceGaps = detectComplianceGaps(
    input.documents,
    input.hasAttendanceNote,
    input.lastNoteDate,
    input.caseCreatedAt,
    input.practiceArea,
  );

  const { score, status } = calculateComplianceScore(
    input.limitationInfo,
    input.riskFlags,
    input.missingEvidence,
    complianceGaps,
    input.awaabRiskLevel,
  );

  const riskCounts = {
    critical: input.riskFlags.filter(r => r.severity === "CRITICAL" && r.status === "outstanding").length,
    high: input.riskFlags.filter(r => r.severity === "HIGH" && r.status === "outstanding").length,
    medium: input.riskFlags.filter(r => r.severity === "MEDIUM" && r.status === "outstanding").length,
    low: input.riskFlags.filter(r => r.severity === "LOW" && r.status === "outstanding").length,
  };

  return {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientName: input.clientName,
    opponentName: input.opponentName,
    practiceArea: input.practiceArea,
    overallScore: score,
    status,
    limitationDaysRemaining: input.limitationInfo?.daysRemaining,
    limitationSeverity: input.limitationInfo?.severity ?? "LOW",
    riskCounts,
    missingEvidenceCount: input.missingEvidence.filter(e => e.status === "MISSING").length,
    complianceGaps,
    awaabRiskLevel: input.awaabRiskLevel,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get severity label for limitation days
 */
export function getLimitationSeverity(daysRemaining?: number): Severity {
  if (daysRemaining === undefined) return "LOW";
  if (daysRemaining <= 0) return "CRITICAL";
  if (daysRemaining <= 30) return "CRITICAL";
  if (daysRemaining <= 90) return "HIGH";
  if (daysRemaining <= 180) return "MEDIUM";
  return "LOW";
}

