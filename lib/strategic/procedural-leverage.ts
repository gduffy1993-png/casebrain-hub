/**
 * Procedural Leverage Point Detector
 * 
 * Systematically detects procedural leverage points where the opponent
 * has made mistakes or is non-compliant, suggesting legitimate escalations.
 * 
 * All suggestions are within CPR rules and legally compliant.
 */

import { getSupabaseAdminClient } from "../supabase";
import { findMissingEvidence } from "../missing-evidence";
import { buildOpponentActivitySnapshot } from "../opponent-radar";
import { detectCaseRole, type CaseRole } from "./role-detection";
import { detectSubstantiveMerits } from "./substantive-merits";
import type { PracticeArea } from "../types/casebrain";
import type { StrategicInsightMeta } from "./types";
import { generateLeverageMeta } from "./meta-generator";

export type ProceduralLeverageType =
  | "MISSING_DEADLINE"
  | "LATE_RESPONSE"
  | "DEFECTIVE_NOTICE"
  | "INCORRECT_SERVICE"
  | "MISSING_PARTICULARS"
  | "MISSING_PRE_ACTION"
  | "DISCLOSURE_FAILURE"
  | "MISSING_EVIDENCE";

export type EscalationType =
  | "UNLESS_ORDER"
  | "CLARIFICATION"
  | "FURTHER_INFORMATION"
  | "STRIKE_OUT"
  | "COSTS"
  | "ENFORCEMENT";

export type ProceduralLeveragePoint = {
  id: string;
  caseId: string;
  type: ProceduralLeverageType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  suggestedEscalation: EscalationType;
  escalationText: string;
  cprRule?: string;
  leverage: string; // "If you challenge this point, the court is likely to order X"
  createdAt: string;
  meta?: StrategicInsightMeta; // Explanatory metadata
};

type ProceduralLeverageInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  deadlines: Array<{ id: string; title: string; due_date: string; status: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  caseRole?: CaseRole; // Optional: if not provided, will be detected
};

/**
 * Detect all procedural leverage points for a case
 * 
 * For claimant clinical negligence cases, prioritizes substantive leverage
 * (guideline breaches, expert causation) over administrative gaps.
 * Administrative gaps (client ID, retainer, CFA) are only marked as HIGH
 * leverage for defendant cases.
 */
export async function detectProceduralLeveragePoints(
  input: ProceduralLeverageInput,
): Promise<ProceduralLeveragePoint[]> {
  const leveragePoints: ProceduralLeveragePoint[] = [];
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
      console.warn("[procedural-leverage] Failed to detect case role, defaulting to claimant:", error);
      caseRole = "claimant"; // Default to claimant
    }
  }
  
  const isClaimant = caseRole === "claimant";
  const isClinicalNeg = input.practiceArea === "clinical_negligence";
  
  // ============================================
  // SUBSTANTIVE LEVERAGE (Claimant Clinical Negligence - PRIORITY)
  // ============================================
  if (isClaimant && isClinicalNeg) {
    try {
      const merits = await detectSubstantiveMerits({
        caseId: input.caseId,
        orgId: input.orgId,
        documents: input.documents,
        timeline: input.timeline,
      });
      
      // Guideline breaches are HIGH leverage for claimant cases
      if (merits.guidelineBreaches.detected) {
        leveragePoints.push({
          id: `leverage-guideline-breach-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_EVIDENCE", // Using existing type, but it's actually substantive leverage
          severity: "CRITICAL",
          description: `NICE guideline breach(es) detected — strong liability foundation`,
          evidence: merits.guidelineBreaches.details,
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Use guideline breaches as primary leverage in Letter of Claim and negotiations. Highlight how the breach establishes breach of duty and supports causation. Request admission of liability based on guideline non-compliance.",
          leverage: `Guideline breaches establish a strong breach of duty position. The opponent cannot defend non-compliance with established clinical guidelines. This creates high leverage for early liability admission or favorable judgment at trial. Use this in PAP Letter of Claim, Particulars of Claim, and trial submissions.`,
          createdAt: now,
        });
      }
      
      // Expert confirmation of avoidability is HIGH leverage
      if (merits.expertConfirmation.detected) {
        leveragePoints.push({
          id: `leverage-expert-confirmation-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_EVIDENCE",
          severity: "CRITICAL",
          description: `Expert evidence confirms breach and/or causation — strong evidential position`,
          evidence: merits.expertConfirmation.details,
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Use expert confirmation as primary leverage. Request admission of liability based on expert evidence. If admission not received, proceed to trial with strong expert foundation.",
          leverage: `Expert confirmation of breach and causation establishes a compelling evidential position. The opponent must either admit liability or challenge expert evidence at trial, which is high-risk for them. Use expert reports in Letter of Claim, Particulars of Claim, and as primary trial evidence.`,
          createdAt: now,
        });
      }
      
      // Delay-caused injury is HIGH leverage
      if (merits.delayCausation.detected) {
        leveragePoints.push({
          id: `leverage-delay-causation-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_EVIDENCE",
          severity: "HIGH",
          description: `Delay in diagnosis/treatment linked to avoidable harm — causation strengthened`,
          evidence: merits.delayCausation.details,
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Use delay-caused injury as leverage. Establish that earlier diagnosis/treatment would have avoided the harm. Request admission of causation based on delay.",
          leverage: `Delay-caused injury establishes a clear causal link between breach and harm. The opponent must explain why the delay was justified or face causation liability. Use delay timeline in Letter of Claim and trial chronology.`,
          createdAt: now,
        });
      }
      
      // Serious harm indicators are MEDIUM-HIGH leverage
      if (merits.seriousHarm.detected) {
        leveragePoints.push({
          id: `leverage-serious-harm-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_EVIDENCE",
          severity: "HIGH",
          description: `Serious harm indicators present — quantum escalators`,
          evidence: merits.seriousHarm.indicators,
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Use serious harm indicators to support quantum claim. Highlight severity in Schedule of Loss and negotiations.",
          leverage: `Serious harm indicators (ICU, sepsis, surgery, etc.) significantly escalate quantum and create urgency. The opponent faces high quantum exposure if liability is established. Use in quantum negotiations and Schedule of Loss.`,
          createdAt: now,
        });
      }
    } catch (error) {
      console.warn("[procedural-leverage] Failed to detect substantive merits:", error);
    }
  }

  // 1. Check for late responses
  const opponentSnapshot = await buildOpponentActivitySnapshot(input.caseId, input.orgId);
  
  if (opponentSnapshot.currentSilenceDays > 21) {
    const evidence = [
      `Last letter sent: ${opponentSnapshot.lastLetterSentAt || "Unknown"}`,
      `Days since last contact: ${opponentSnapshot.currentSilenceDays}`,
    ];
    
    const isCriminal = input.practiceArea === "criminal";
    const leveragePoint: ProceduralLeveragePoint = {
      id: `leverage-late-response-${input.caseId}`,
      caseId: input.caseId,
      type: "LATE_RESPONSE",
      severity: opponentSnapshot.currentSilenceDays > 42 ? "CRITICAL" : "HIGH",
      description: `Opponent has not responded for ${opponentSnapshot.currentSilenceDays} days`,
      evidence,
      suggestedEscalation: opponentSnapshot.currentSilenceDays > 42 ? "UNLESS_ORDER" : "CLARIFICATION",
      escalationText: isCriminal
        ? "Raise at the next hearing and seek clear case management directions (service dates and disclosure timetable). Record all late service."
        : opponentSnapshot.currentSilenceDays > 42
          ? "Apply for an unless order — this could compel them to respond or risk strike-out."
          : "Request clarification or further information — this puts pressure on them to respond.",
      cprRule: isCriminal ? undefined : "CPR 3.4(2)(c)",
      leverage: isCriminal
        ? "If you challenge persistent silence/late service, the court can give directions and, where prejudice is shown, the prosecution's position can be weakened."
        : `If you challenge this delay, the court is likely to order compliance or impose sanctions, which puts significant pressure on the opponent.`,
      createdAt: now,
    };
    
    // Generate meta
    if (includeMeta) {
      leveragePoint.meta = generateLeverageMeta(
        "LATE_RESPONSE",
        leveragePoint.description,
        evidence,
        {
          practiceArea: input.practiceArea,
          documents: input.documents,
          timeline: input.timeline,
          letters: input.letters,
          deadlines: input.deadlines,
          hasChronology: false,
          hasMedicalEvidence: false,
          hasExpertReports: false,
          hasDisclosure: false,
          hasPreActionLetter: input.letters.some(l => 
            l.template_id?.toLowerCase().includes("pre_action") ||
            l.template_id?.toLowerCase().includes("protocol")
          ),
          caseRole: input.caseRole || caseRole,
        }
      );
    }
    
    leveragePoints.push(leveragePoint);
  }

  // 2. Check for missing pre-action steps
  if (input.practiceArea === "housing_disrepair") {
    const hasPreActionLetter = input.letters.some(l => 
      l.template_id?.toLowerCase().includes("pre_action") ||
      l.template_id?.toLowerCase().includes("protocol")
    );
    
    if (!hasPreActionLetter && input.timeline.length > 0) {
      const firstComplaintDate = new Date(input.timeline[0].event_date);
      const daysSinceComplaint = Math.floor(
        (Date.now() - firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceComplaint > 30) {
        const evidence = [
          `First complaint: ${firstComplaintDate.toISOString()}`,
          `Days since complaint: ${daysSinceComplaint}`,
        ];
        
        const leveragePoint: ProceduralLeveragePoint = {
          id: `leverage-missing-pre-action-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_PRE_ACTION",
          severity: "HIGH",
          description: "No pre-action protocol letter detected despite case being active for over 30 days",
          evidence,
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Send pre-action protocol letter — this is required before issuing proceedings.",
          leverage: "Missing pre-action steps can delay proceedings and may result in costs sanctions if proceedings are issued prematurely.",
          createdAt: now,
        };
        
        // Generate meta
        leveragePoint.meta = generateLeverageMeta(
          "MISSING_PRE_ACTION",
          leveragePoint.description,
          evidence,
          {
            practiceArea: input.practiceArea,
            documents: input.documents,
            timeline: input.timeline,
            letters: input.letters,
            deadlines: input.deadlines,
            hasChronology: false,
            hasMedicalEvidence: false,
            hasExpertReports: false,
            hasDisclosure: false,
            hasPreActionLetter: false,
            caseRole: input.caseRole || caseRole,
          }
        );
        
        leveragePoints.push(leveragePoint);
      }
    }
  }

  // ============================================
  // MISSING EVIDENCE (Role-aware priority)
  // ============================================
  // For claimant cases, admin gaps (client ID, retainer, CFA) should NOT be HIGH leverage
  // Only substantive missing evidence should be HIGH leverage for claimant cases
  const missingEvidence = findMissingEvidence(input.caseId, input.practiceArea, input.documents);

  const criticalMissing = missingEvidence.filter(e => 
    e.priority === "CRITICAL" && e.status === "MISSING"
  );

  if (criticalMissing.length > 0) {
    // For claimant cases, filter out admin-only gaps
    const substantiveMissing = isClaimant
      ? criticalMissing.filter(e => {
          const label = e.label.toLowerCase();
          return !label.includes("client id") &&
                 !label.includes("retainer") &&
                 !label.includes("cfa") &&
                 !label.includes("identification") &&
                 !label.includes("client identification");
        })
      : criticalMissing; // For defendant, all critical missing evidence is leverage
    
    // For claimant, only process substantive missing evidence as HIGH leverage
    // Admin gaps are downgraded to MEDIUM
    const evidenceToProcess = isClaimant ? substantiveMissing : criticalMissing;
    
    if (evidenceToProcess.length > 0) {
      const firstMissing = evidenceToProcess[0];
      
      // Enhanced leverage analysis
      let detailedLeverage = "";
      let tacticalSteps = "";
      let legalBasis = "Evidence gathering";
      
      // Criminal-only: remove CPR/Part 36 and use PACE/CPIA framing
      if (input.practiceArea === "criminal") {
        const label = firstMissing.label.toLowerCase();
        legalBasis = "CPIA / PACE / CrimPR case management";
        if (label.includes("disclosure") || label.includes("mg6") || label.includes("unused")) {
          detailedLeverage =
            "Without proper disclosure (including schedules and unused material), the defence cannot properly assess the evidence. This creates immediate procedural leverage: you can press for disclosure, seek case management directions, and resist any attempt to force early admissions without the bundle.";
          tacticalSteps =
            "Step 1: Write to CPS/disclosure officer requesting MG6A/MG6C and confirmation of unused material review. Step 2: Ask for a clear disclosure timetable. Step 3: If outstanding, raise at the next hearing and seek directions / disclosure order. Step 4: Record all delays and late service for later submissions if prejudice arises.";
        } else if (label.includes("custody") || label.includes("pace") || label.includes("interview") || label.includes("recording")) {
          detailedLeverage =
            "PACE / procedural integrity gaps can materially affect admissibility and fairness. If core custody/interview materials are missing, the prosecution may struggle to rely on disputed admissions or procedural steps.";
          tacticalSteps =
            "Step 1: Request the full custody record, legal advice log, and interview recording/transcript. Step 2: If missing, require written confirmation of what exists and why anything is unavailable. Step 3: Raise as a case management issue and seek directions for service (or, if appropriate, exclusion/adverse approach where fairness is impacted).";
        } else if (label.includes("cctv") || label.includes("bw") || label.includes("body") || label.includes("video")) {
          detailedLeverage =
            "Visual evidence (CCTV/BWV) is often decisive and the defence is entitled to clarity on what exists, in what format, and continuity. Missing continuity or late production is a recurring vulnerability.";
          tacticalSteps =
            "Step 1: Request native/original footage and continuity statements/logs. Step 2: Ask for creation/export metadata and chain-of-custody confirmation. Step 3: If not served, set a timetable via directions and document prejudice caused by delay.";
        } else {
          detailedLeverage =
            `Without ${firstMissing.label}, the defence cannot properly test the prosecution case. Treat this as a disclosure/records gap and use case management to force clarity on what exists and when it will be served.`;
          tacticalSteps =
            "Step 1: Request the missing item with a clear deadline. Step 2: Ask for confirmation if it does not exist. Step 3: Raise at hearing for directions if still outstanding.";
        }
      } else if (firstMissing.label.toLowerCase().includes("medical")) {
        detailedLeverage = "Medical evidence is fundamental to proving causation and quantum. Without it, the opponent cannot establish: (1) the causal link between breach and injury, (2) the extent of injury, or (3) the financial impact. This creates a procedural advantage — you can apply for an order compelling disclosure, and if they fail to comply, seek costs sanctions or even strike-out of their quantum claim.";
        tacticalSteps = "Step 1: Send a formal request under CPR 31.10 for medical records within 14 days. Step 2: If not provided, apply for an order under CPR 31.12 with costs. Step 3: If still not provided, apply for unless order under CPR 3.4(2)(c) — failure to comply may result in strike-out. Step 4: Use the absence of medical evidence to challenge their case at trial — argue they cannot prove causation or quantum.";
      } else if (firstMissing.label.toLowerCase().includes("accident") || firstMissing.label.toLowerCase().includes("circumstances")) {
        detailedLeverage = "The Accident Circumstances Statement is essential for proving liability. Without it, the opponent cannot establish how the accident occurred or who was at fault. This creates a procedural advantage — you can challenge their ability to prove liability, and if they cannot provide it, seek an order compelling disclosure or argue they have no credible case.";
        tacticalSteps = "Step 1: Request disclosure under CPR 31.10 within 14 days. Step 2: If not provided, apply for specific disclosure under CPR 31.12. Step 3: In your response, highlight that without this evidence, they cannot prove liability. Step 4: Consider making a Part 36 offer based on the weakness of their evidence, or apply for summary judgment if they have no credible case.";
      } else {
        detailedLeverage = `Without ${firstMissing.label}, the opponent cannot establish key elements of their case. This creates a procedural advantage — you can apply for an order compelling disclosure, and if they fail to comply, seek costs sanctions or use the absence of evidence to challenge their case.`;
        tacticalSteps = "Step 1: Request disclosure under CPR 31.10 within 14 days. Step 2: If not provided, apply for specific disclosure under CPR 31.12 with costs. Step 3: If still not provided, consider an unless order under CPR 3.4(2)(c). Step 4: Use the absence of evidence to challenge their case at trial.";
      }
      
      leveragePoints.push({
        id: `leverage-missing-evidence-${input.caseId}`,
        caseId: input.caseId,
        type: "MISSING_EVIDENCE",
        severity: "HIGH",
        description: `Critical evidence missing: ${firstMissing.label}`,
        evidence: [
          firstMissing.reason,
          `Priority: ${firstMissing.priority}`,
          `Legal basis: ${legalBasis}`,
        ],
        suggestedEscalation: "FURTHER_INFORMATION",
        escalationText: tacticalSteps,
        leverage: detailedLeverage,
        createdAt: now,
      });
    }
    
    // For claimant cases, add admin gaps as MEDIUM severity (not HIGH leverage)
    if (isClaimant && criticalMissing.length > substantiveMissing.length) {
      const adminMissing = criticalMissing.filter(e => {
        const label = e.label.toLowerCase();
        return label.includes("client id") ||
               label.includes("retainer") ||
               label.includes("cfa") ||
               label.includes("identification") ||
               label.includes("client identification");
      });
      
      if (adminMissing.length > 0) {
        leveragePoints.push({
          id: `leverage-admin-gap-${input.caseId}`,
          caseId: input.caseId,
          type: "MISSING_EVIDENCE",
          severity: "MEDIUM", // Downgraded for claimant cases
          description: `Administrative documentation gap: ${adminMissing[0].label}`,
          evidence: [
            adminMissing[0].reason,
            `Priority: Administrative (not substantive leverage)`,
          ],
          suggestedEscalation: "CLARIFICATION",
          escalationText: "Request missing administrative documentation. This is procedural compliance only and does not affect substantive case strength.",
          leverage: `Administrative documentation gaps (client ID, retainer, CFA) are procedural compliance issues only. They do not constitute high leverage for claimant cases and should not be used as primary settlement leverage. Focus on substantive merits (guideline breaches, expert causation, delay-caused harm) instead.`,
          createdAt: now,
        });
      }
    }
  }

  // 4. Check for overdue deadlines (opponent's perspective)
  const nowDate = new Date();
  const overdueDeadlines = input.deadlines.filter(d => {
    const dueDate = new Date(d.due_date);
    return dueDate < nowDate && d.status !== "completed";
  });

  if (overdueDeadlines.length > 0) {
    const mostOverdue = overdueDeadlines.sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0];

    const daysOverdue = Math.floor(
      (nowDate.getTime() - new Date(mostOverdue.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const isCriminal = input.practiceArea === "criminal";
    leveragePoints.push({
      id: `leverage-missing-deadline-${mostOverdue.id}`,
      caseId: input.caseId,
      type: "MISSING_DEADLINE",
      severity: daysOverdue > 14 ? "CRITICAL" : "HIGH",
      description: `Deadline missed: ${mostOverdue.title} (${daysOverdue} days overdue)`,
      evidence: [
        `Deadline: ${mostOverdue.title}`,
        `Due date: ${new Date(mostOverdue.due_date).toISOString()}`,
        `Days overdue: ${daysOverdue}`,
      ],
      suggestedEscalation: daysOverdue > 14 ? "UNLESS_ORDER" : "CLARIFICATION",
      escalationText: isCriminal
        ? "Raise at the next hearing and seek directions to regularise the timetable. Record late service and any prejudice."
        : daysOverdue > 14
          ? "Apply for an unless order — this could compel compliance or risk strike-out."
          : "Request clarification on deadline status — this puts pressure on them to comply.",
      cprRule: isCriminal ? undefined : "CPR 3.4(2)(c)",
      leverage: isCriminal
        ? "Missed case management deadlines create leverage when they cause prejudice (late evidence/disclosure). Use directions to control the timetable and document late service."
        : `If you challenge this missed deadline, the court is likely to order compliance or impose sanctions, which puts significant pressure on the opponent.`,
      createdAt: now,
    });
  }

  // 5. Check for disclosure failures (if we have disclosure-related documents)
  const disclosureKeywords = ["disclosure", "list of documents", "inspection", "cpd"];
  const hasDisclosureDocs = input.documents.some(d => 
    disclosureKeywords.some(keyword => d.name.toLowerCase().includes(keyword))
  );

  // If case is post-issue but no disclosure detected
  const hasIssueDate = input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  );

  if (hasIssueDate && !hasDisclosureDocs) {
    const issueDate = input.timeline.find(e => 
      e.description.toLowerCase().includes("issue") ||
      e.description.toLowerCase().includes("proceedings")
    );
    
    if (issueDate) {
      const daysSinceIssue = Math.floor(
        (Date.now() - new Date(issueDate.event_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceIssue > 28) {
        leveragePoints.push({
          id: `leverage-disclosure-failure-${input.caseId}`,
          caseId: input.caseId,
          type: "DISCLOSURE_FAILURE",
          severity: "HIGH",
          description: "No disclosure list detected despite case being post-issue for over 28 days",
          evidence: [
            `Issue date: ${issueDate.event_date}`,
            `Days since issue: ${daysSinceIssue}`,
          ],
          suggestedEscalation: "FURTHER_INFORMATION",
          escalationText: "Request disclosure list — this is required under CPR 31.10.",
          cprRule: "CPR 31.10",
          leverage: "If the opponent fails to provide disclosure, you can apply for an order compelling disclosure, which may result in costs sanctions.",
          createdAt: now,
        });
      }
    }
  }

  return leveragePoints;
}

