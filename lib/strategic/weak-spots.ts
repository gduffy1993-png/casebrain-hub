/**
 * Opponent Weak Spot Detector
 * 
 * Systematically detects opponent weaknesses and inconsistencies
 * that can be exploited legitimately in litigation.
 * 
 * All suggestions are legally compliant and within CPR rules.
 */

import { findMissingEvidence } from "../missing-evidence";
import { findContradictions } from "../bundle-navigator";
import type { PracticeArea } from "../types/casebrain";
import type { StrategicInsightMeta } from "./types";
import { generateWeakSpotMeta } from "./meta-generator";
import { detectCaseRole, type CaseRole } from "./role-detection";

export type WeakSpotType =
  | "CONTRADICTION"
  | "MISSING_EVIDENCE"
  | "INCONSISTENCY"
  | "TIMELINE_GAP"
  | "WEAK_CAUSATION"
  | "POOR_EXPERT"
  | "NO_RESPONSE"
  | "MISSING_RECORDS"
  | "WRONG_DATE"
  | "INCORRECT_STATUTE";

export type OpponentWeakSpot = {
  id: string;
  caseId: string;
  type: WeakSpotType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  impact: string; // "If you highlight this inconsistency, the opponent's argument weakens dramatically."
  suggestedAction: string;
  createdAt: string;
  meta?: StrategicInsightMeta; // Explanatory metadata
};

type WeakSpotInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  bundleId?: string;
  caseRole?: CaseRole; // Optional: if not provided, will be detected
};

/**
 * Detect all opponent weak spots for a case
 * 
 * For claimant cases, admin gaps (client ID, retainer, CFA) are labelled
 * as "Administrative/Procedural" and cannot be HIGH severity.
 */
export async function detectOpponentWeakSpots(
  input: WeakSpotInput,
): Promise<OpponentWeakSpot[]> {
  const weakSpots: OpponentWeakSpot[] = [];
  const now = new Date().toISOString();
  const includeMeta = input.practiceArea !== "criminal";
  
  // Detect case role if not provided
  let caseRole = input.caseRole;
  if (!caseRole) {
    try {
      caseRole = await detectCaseRole({
        caseId: input.caseId,
        orgId: input.orgId,
        practiceArea: input.practiceArea,
        documents: input.documents,
        timeline: input.timeline,
      });
    } catch (error) {
      console.warn("[weak-spots] Failed to detect case role, defaulting to claimant:", error);
      caseRole = "claimant"; // Default to claimant
    }
  }
  
  const isClaimant = caseRole === "claimant";

  // 1. Check for contradictions (if bundle exists)
  if (input.bundleId) {
    try {
      const contradictions = await findContradictions(input.bundleId);
      
      if (contradictions.length > 0) {
        const criticalContradictions = contradictions.filter(c => 
          c.confidence === "high" || c.confidence === "medium"
        );

        for (const contradiction of criticalContradictions.slice(0, 5)) {
          const evidence = [
            contradiction.description,
            `Confidence: ${contradiction.confidence}`,
          ];
          
          const weakSpot: OpponentWeakSpot = {
            id: `weakspot-contradiction-${contradiction.id}`,
            caseId: input.caseId,
            type: "CONTRADICTION",
            severity: contradiction.confidence === "high" ? "CRITICAL" : "HIGH",
            description: `Contradictory statements detected: ${contradiction.description}`,
            evidence,
            impact: "If you highlight this contradiction, the opponent's argument weakens dramatically. This can be used in cross-examination or to challenge their credibility.",
            suggestedAction: "Prepare cross-examination questions or challenge this contradiction in your response.",
            createdAt: now,
          };
          
          // Generate meta (civil-focused; hide for criminal to prevent copy leakage)
          if (includeMeta) {
            weakSpot.meta = generateWeakSpotMeta(
              "CONTRADICTION",
              weakSpot.description,
              evidence,
              {
                practiceArea: input.practiceArea,
                documents: input.documents,
                timeline: input.timeline,
                letters: [],
                deadlines: [],
                hasChronology: false,
                hasMedicalEvidence: false,
                hasExpertReports: false,
                hasDisclosure: false,
                hasPreActionLetter: false,
                contradictions: criticalContradictions.map(c => ({
                  description: c.description,
                  confidence: c.confidence,
                })),
                caseRole: input.caseRole || caseRole,
              }
            );
          }
          
          weakSpots.push(weakSpot);
        }
      }
    } catch (error) {
      // Continue if bundle check fails
      console.error("Error checking contradictions:", error);
    }
  }

  // 2. Check for missing evidence
  const missingEvidence = findMissingEvidence(input.caseId, input.practiceArea, input.documents);

  const criticalMissing = missingEvidence.filter(e => 
    e.priority === "CRITICAL" && e.status === "MISSING"
  );

  for (const missing of criticalMissing.slice(0, 3)) {
    // Check if this is an admin gap (for claimant cases)
    const isAdminGap = isClaimant && (
      missing.label.toLowerCase().includes("client id") ||
      missing.label.toLowerCase().includes("retainer") ||
      missing.label.toLowerCase().includes("cfa") ||
      missing.label.toLowerCase().includes("identification") ||
      missing.label.toLowerCase().includes("client identification")
    );
    
    // Enhanced analysis based on evidence type
    let detailedImpact = "";
    let tacticalAdvice = "";
    let legalBasis = "";
    
    if (isAdminGap) {
      // For claimant cases, admin gaps are procedural compliance only
      detailedImpact = `${missing.label} is missing. This is an administrative/procedural compliance issue and does not affect the substantive strength of your case on liability or quantum.`;
      tacticalAdvice = "Request or prepare the missing administrative documentation. This is for procedural compliance only and does not impact substantive case strength.";
      legalBasis = "Procedural compliance";
    } else if (input.practiceArea === "criminal") {
      // Criminal: remove CPR/Part 36 and use PACE/CPIA framing
      const label = missing.label.toLowerCase();
      if (label.includes("disclosure") || label.includes("mg6") || label.includes("unused")) {
        detailedImpact =
          "Disclosure is a gating item. Without schedules/unused material review and core evidence served, it is unsafe to commit to a fixed narrative and the defence cannot properly test the case.";
        tacticalAdvice =
          "Chase CPS/disclosure officer for MG6A/MG6C, unused material confirmation, and a clear disclosure timetable. If still outstanding, raise for directions at the next hearing.";
        legalBasis = "CPIA / CrimPR case management";
      } else if (label.includes("custody") || label.includes("pace") || label.includes("interview") || label.includes("recording")) {
        detailedImpact =
          "PACE/procedural integrity gaps can affect admissibility and fairness. Missing custody/interview materials often become a focal weakness at hearings.";
        tacticalAdvice =
          "Request custody record, legal advice log, and interview recording/transcript. Ask for written confirmation if any item does not exist. Raise for directions if not served promptly.";
        legalBasis = "PACE / CrimPR";
      } else {
        detailedImpact =
          `Without ${missing.label}, the defence cannot properly test the prosecution case. Treat this as a missing-records problem and force clarity on what exists and when it will be served.`;
        tacticalAdvice =
          "Request the item with a deadline, ask for confirmation if it does not exist, and raise at hearing for directions if still outstanding.";
        legalBasis = "Case management / disclosure";
      }
    } else if (missing.label.toLowerCase().includes("medical") || missing.label.toLowerCase().includes("gp") || missing.label.toLowerCase().includes("hospital")) {
      if (isClaimant) {
        detailedImpact = "Medical records are essential for establishing causation and quantum. Ensure you have comprehensive medical evidence to support your claim. Without complete medical records, it may be difficult to fully establish: (1) the extent of injury, (2) the causal link between breach and injury, (3) the duration and severity of symptoms, or (4) the financial impact (loss of earnings, care costs).";
        tacticalAdvice = "Request medical records under CPR 31.10 within 14 days. If not provided, apply for an order under CPR 31.12 compelling disclosure. Use complete medical evidence to strengthen your quantum claim and causation position.";
        legalBasis = "CPR 31.10 (standard disclosure), CPR 31.12 (specific disclosure)";
      } else {
        detailedImpact = "Medical records are essential for establishing causation and quantum. Without them, the opponent cannot prove: (1) the extent of injury, (2) the causal link between breach and injury, (3) the duration and severity of symptoms, or (4) the financial impact (loss of earnings, care costs). This creates a fundamental weakness in their case that can be exploited at trial.";
        tacticalAdvice = "Request disclosure under CPR 31.10 within 14 days. If not provided, apply for an order under CPR 31.12 compelling disclosure. At trial, argue that the absence of medical evidence means the opponent cannot discharge their burden of proof on causation and quantum. Consider making a Part 36 offer based on the weakness of their evidence.";
        legalBasis = "CPR 31.10 (standard disclosure), CPR 31.12 (specific disclosure), Burden of proof on causation (Bonnington Castings v Wardlaw [1956])";
      }
    } else if (missing.label.toLowerCase().includes("accident") || missing.label.toLowerCase().includes("circumstances")) {
      if (isClaimant) {
        detailedImpact = "The Accident Circumstances Statement helps establish liability. Ensure you have comprehensive documentation of how the incident occurred to support your liability position.";
        tacticalAdvice = "Prepare and serve a detailed Accident Circumstances Statement. This will strengthen your liability position and support your claim.";
        legalBasis = "Statement preparation";
      } else {
        detailedImpact = "The Accident Circumstances Statement is critical for establishing liability. Without it, the opponent cannot prove: (1) how the accident occurred, (2) what caused it, (3) who was at fault, or (4) whether they took reasonable steps to prevent it. This is particularly damaging in PI cases where the mechanism of injury must be established.";
        tacticalAdvice = "Request disclosure under CPR 31.10. If not provided, apply for specific disclosure under CPR 31.12. At trial, challenge their ability to prove liability without this evidence. Consider arguing that the absence of a proper statement suggests they have no credible account of what happened.";
        legalBasis = "CPR 31.10, CPR 31.12, Burden of proof on liability";
      }
    } else if (missing.label.toLowerCase().includes("expert") || missing.label.toLowerCase().includes("report")) {
      if (isClaimant) {
        detailedImpact = "Expert evidence strengthens your position on breach, causation, and quantum. Ensure you have expert reports supporting your case.";
        tacticalAdvice = "Obtain expert reports under CPR 35 to support breach, causation, and quantum. Expert evidence strengthens your liability and quantum positions.";
        legalBasis = "CPR 35 (expert evidence)";
      } else {
        detailedImpact = "Expert evidence is required to prove technical aspects of the case (liability, causation, quantum). Without it, the opponent cannot establish: (1) breach of duty, (2) causation, or (3) the extent of loss. This is a fundamental weakness that can be exploited.";
        tacticalAdvice = "Request disclosure of expert reports under CPR 35.10. If not provided, apply for an order under CPR 35.8. At trial, argue that without expert evidence, the opponent cannot discharge their burden of proof. Consider challenging their case on the basis that they have no expert support for their position.";
        legalBasis = "CPR 35.10 (expert disclosure), CPR 35.8 (expert evidence), Burden of proof";
      }
    } else {
      if (isClaimant) {
        detailedImpact = `Without ${missing.label}, it may be more difficult to establish certain elements of your case. Ensure you have comprehensive evidence to support your claim.`;
        tacticalAdvice = `Request or prepare ${missing.label} to strengthen your case. This will help establish your position on liability and/or quantum.`;
        legalBasis = "Evidence gathering";
      } else {
        detailedImpact = `Without ${missing.label}, the opponent cannot establish key elements of their case. This creates a significant weakness that can be exploited strategically.`;
        tacticalAdvice = `Request disclosure under CPR 31.10. If not provided, apply for specific disclosure under CPR 31.12. Highlight the absence of this evidence in your response and consider using it to challenge their case at trial.`;
        legalBasis = "CPR 31.10, CPR 31.12";
      }
    }
    
    const evidence = [
      missing.reason,
      isAdminGap ? `Category: Administrative/Procedural` : `Category: ${missing.category}`,
      `Legal basis: ${legalBasis}`,
    ];
    
    // For claimant cases, admin gaps must not be HIGH severity
    const severity = isAdminGap ? "MEDIUM" : "HIGH";
    
    const weakSpot: OpponentWeakSpot = {
      id: `weakspot-missing-evidence-${missing.id}`,
      caseId: input.caseId,
      type: "MISSING_EVIDENCE",
      severity,
      description: isAdminGap 
        ? `Administrative/Procedural: ${missing.label}`
        : `Critical evidence missing: ${missing.label}`,
      evidence,
      impact: detailedImpact,
      suggestedAction: tacticalAdvice,
      createdAt: now,
    };
    
    // Generate meta (civil-focused; hide for criminal to prevent copy leakage)
    if (includeMeta) {
      weakSpot.meta = generateWeakSpotMeta(
        "MISSING_EVIDENCE",
        weakSpot.description,
        evidence,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: [],
          deadlines: [],
          hasChronology: false,
          hasMedicalEvidence: false,
          hasExpertReports: false,
          hasDisclosure: false,
          hasPreActionLetter: false,
          missingEvidence: criticalMissing.map(m => ({
            type: m.label,
            priority: m.priority,
          })),
          caseRole: input.caseRole || caseRole,
        }
      );
    }
    
    weakSpots.push(weakSpot);
  }

  // 3. Check for timeline gaps
  if (input.timeline.length > 2) {
    const sortedTimeline = [...input.timeline].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

    const gaps: Array<{ from: string; to: string; days: number }> = [];
    
    for (let i = 1; i < sortedTimeline.length; i++) {
      const prevDate = new Date(sortedTimeline[i - 1].event_date);
      const currDate = new Date(sortedTimeline[i].event_date);
      const daysGap = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysGap > 90) {
        gaps.push({
          from: sortedTimeline[i - 1].event_date,
          to: sortedTimeline[i].event_date,
          days: daysGap,
        });
      }
    }

    if (gaps.length > 0) {
      const largestGap = gaps.sort((a, b) => b.days - a.days)[0];
      weakSpots.push({
        id: `weakspot-timeline-gap-${input.caseId}`,
        caseId: input.caseId,
        type: "TIMELINE_GAP",
        severity: largestGap.days > 180 ? "HIGH" : "MEDIUM",
        description: `Significant timeline gap detected: ${largestGap.days} days between events`,
        evidence: [
          `From: ${largestGap.from}`,
          `To: ${largestGap.to}`,
          `Gap: ${largestGap.days} days`,
        ],
        impact: "Large timeline gaps suggest missing information or lack of documentation. This can be used to challenge the opponent's case or request further information about what happened during this period.",
        suggestedAction: "Request clarification on events during this period — this gap suggests missing information.",
        createdAt: now,
      });
    }
  }

  // 4. Check for wrong dates (if we can detect date inconsistencies)
  const datePatterns = input.timeline.map(e => ({
    date: e.event_date,
    description: e.description,
  }));

  // Look for dates that don't make sense (e.g., repair completed before reported)
  if (input.practiceArea === "housing_disrepair") {
    const reportDates = datePatterns.filter(d => 
      d.description.toLowerCase().includes("report") ||
      d.description.toLowerCase().includes("complaint")
    );
    const repairDates = datePatterns.filter(d => 
      d.description.toLowerCase().includes("repair") ||
      d.description.toLowerCase().includes("fixed") ||
      d.description.toLowerCase().includes("completed")
    );

    for (const report of reportDates) {
      for (const repair of repairDates) {
        const reportDate = new Date(report.date);
        const repairDate = new Date(repair.date);
        
        if (repairDate < reportDate) {
          weakSpots.push({
            id: `weakspot-wrong-date-${input.caseId}-${report.date}`,
            caseId: input.caseId,
            type: "WRONG_DATE",
            severity: "HIGH",
            description: `Date inconsistency: Repair completed (${repair.date}) before defect reported (${report.date})`,
            evidence: [
              `Report date: ${report.date}`,
              `Repair date: ${repair.date}`,
            ],
            impact: "If you highlight this date inconsistency, the opponent's timeline becomes untenable. This can be used to challenge their evidence or credibility.",
            suggestedAction: "Challenge this date inconsistency — it suggests incorrect documentation or timeline.",
            createdAt: now,
          });
          break;
        }
      }
    }
  }

  // 5. Check for missing records (housing-specific)
  if (input.practiceArea === "housing_disrepair") {
    const hasRepairLogs = input.documents.some(d => 
      d.name.toLowerCase().includes("repair") &&
      (d.name.toLowerCase().includes("log") ||
       d.name.toLowerCase().includes("record") ||
       d.name.toLowerCase().includes("history"))
    );

    const hasComplaints = input.timeline.some(e => 
      e.description.toLowerCase().includes("complaint") ||
      e.description.toLowerCase().includes("report")
    );

    if (hasComplaints && !hasRepairLogs) {
      weakSpots.push({
        id: `weakspot-missing-records-${input.caseId}`,
        caseId: input.caseId,
        type: "MISSING_RECORDS",
        severity: "MEDIUM",
        description: "No repair logs or records provided despite complaints being made",
        evidence: [
          "Complaints detected in timeline",
          "No repair logs found in documents",
        ],
        impact: "Missing repair records suggest the opponent may not have proper documentation of their response. This can be used to challenge their case or request disclosure.",
        suggestedAction: "Request repair logs and records — these should be available if repairs were attempted.",
        createdAt: now,
      });
    }
  }

  // 6. Check for no response to key reports (housing-specific)
  if (input.practiceArea === "housing_disrepair") {
    const tenantReports = input.timeline.filter(e => 
      e.description.toLowerCase().includes("tenant") &&
      (e.description.toLowerCase().includes("report") ||
       e.description.toLowerCase().includes("complaint"))
    );

    if (tenantReports.length > 2) {
      // Check if there are corresponding responses
      const hasResponses = input.timeline.some(e => 
        e.description.toLowerCase().includes("response") ||
        e.description.toLowerCase().includes("acknowledgment")
      );

      if (!hasResponses) {
        weakSpots.push({
          id: `weakspot-no-response-${input.caseId}`,
          caseId: input.caseId,
          type: "NO_RESPONSE",
          severity: "HIGH",
          description: `Multiple tenant reports (${tenantReports.length}) but no responses detected`,
          evidence: [
            `${tenantReports.length} tenant reports found`,
            "No responses detected in timeline",
          ],
          impact: "If you highlight the lack of response to multiple reports, it demonstrates the opponent's failure to engage. This can be used to support your case or challenge their position.",
          suggestedAction: "Highlight the lack of response to multiple reports — this demonstrates failure to engage.",
          createdAt: now,
        });
      }
    }
  }

  return weakSpots;
}

