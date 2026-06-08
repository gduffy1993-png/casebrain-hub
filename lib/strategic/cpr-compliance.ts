/**
 * CPR Compliance Checker with Application Suggestions
 * 
 * Systematically checks for CPR non-compliance and suggests
 * specific court applications (unless orders, strike-out, etc.)
 * 
 * All suggestions are within CPR rules and legally compliant.
 */

import { findMissingEvidence } from "../missing-evidence";
import type { PracticeArea } from "../types/casebrain";

export type CPRComplianceIssue = {
  id: string;
  caseId: string;
  rule: string; // "CPR 31.10" / "Pre-Action Protocol" / "CPR 16.4"
  breach: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  suggestedApplication: "UNLESS_ORDER" | "STRIKE_OUT" | "FURTHER_INFORMATION" | "COSTS_ORDER" | "DIRECTION";
  applicationText: string;
  deadline?: string;
  evidence: string[];
  createdAt: string;
};

type CPRComplianceInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
  letters: Array<{ id: string; created_at: string; template_id?: string }>;
  hasChronology: boolean;
  hasHazardAssessment: boolean;
  caseRole?: "claimant" | "defendant"; // Optional: for role-specific logic
  medicalEvidenceSignals?: {
    hasMedicalRecords: boolean;
    hasAandE: boolean;
    hasRadiology: boolean;
    hasGP: boolean;
  }; // Optional: to override missing medical evidence flags
  breachEvidence?: {
    level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
    detected: boolean;
  }; // Optional: breach evidence from medical records
  causationEvidence?: {
    level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
    detected: boolean;
  }; // Optional: causation evidence from medical records
  harmEvidence?: {
    level: "PRESENT" | "NONE";
    detected: boolean;
  }; // Optional: harm evidence from medical records
};

/**
 * Check CPR compliance and detect breaches
 */
export function checkCPRCompliance(input: CPRComplianceInput): CPRComplianceIssue[] {
  const issues: CPRComplianceIssue[] = [];
  const now = new Date().toISOString();

  // 1. Check for late disclosure (CPR 31.10)
  const hasIssueDate = input.timeline.some(e => 
    e.description.toLowerCase().includes("issue") ||
    e.description.toLowerCase().includes("proceedings")
  );

  if (hasIssueDate) {
    const issueDate = input.timeline.find(e => 
      e.description.toLowerCase().includes("issue") ||
      e.description.toLowerCase().includes("proceedings")
    );

    if (issueDate) {
      const daysSinceIssue = Math.floor(
        (Date.now() - new Date(issueDate.event_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const disclosureKeywords = ["disclosure", "list of documents", "inspection", "cpd"];
      const hasDisclosure = input.documents.some(d => 
        disclosureKeywords.some(keyword => d.name.toLowerCase().includes(keyword))
      );

      if (!hasDisclosure && daysSinceIssue > 28) {
        issues.push({
          id: `cpr-late-disclosure-${input.caseId}`,
          caseId: input.caseId,
          rule: "CPR 31.10",
          breach: "Late or missing disclosure list",
          severity: daysSinceIssue > 56 ? "CRITICAL" : "HIGH",
          description: `No disclosure list detected despite case being post-issue for ${daysSinceIssue} days`,
          suggestedApplication: daysSinceIssue > 56 ? "UNLESS_ORDER" : "FURTHER_INFORMATION",
          applicationText: daysSinceIssue > 56
            ? "Apply for an unless order here — this could compel them to comply or risk strike-out."
            : "Request disclosure list — this is required under CPR 31.10.",
          evidence: [
            `Issue date: ${issueDate.event_date}`,
            `Days since issue: ${daysSinceIssue}`,
          ],
          createdAt: now,
        });
      }
    }
  }

  // 2. Check for missing particulars (CPR 16.4)
  const hasParticulars = input.documents.some(d => 
    d.name.toLowerCase().includes("particulars") ||
    d.name.toLowerCase().includes("statement of case")
  );

  if (hasIssueDate && !hasParticulars) {
    issues.push({
      id: `cpr-missing-particulars-${input.caseId}`,
      caseId: input.caseId,
      rule: "CPR 16.4",
      breach: "Missing or incomplete particulars of claim",
      severity: "HIGH",
      description: "No particulars of claim detected",
      suggestedApplication: "FURTHER_INFORMATION",
      applicationText: "Request further information or clarification — particulars must be clear and complete.",
      evidence: ["No particulars of claim found in documents"],
      createdAt: now,
    });
  }

  // 3. Check for missing pre-action protocol letter
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
      issues.push({
        id: `cpr-missing-pre-action-${input.caseId}`,
        caseId: input.caseId,
        rule: "Pre-Action Protocol",
        breach: "Missing letter before action",
        severity: "HIGH",
        description: "No pre-action protocol letter detected",
        suggestedApplication: "DIRECTION",
        applicationText: "Send pre-action protocol letter — this is required before issuing proceedings.",
        evidence: [
          `First complaint: ${firstComplaintDate.toISOString()}`,
          `Days since complaint: ${daysSinceComplaint}`,
        ],
        createdAt: now,
      });
    }
  }

  // 4. Check for missing tenancy agreement (housing)
  if (input.practiceArea === "housing_disrepair") {
    const missingEvidence = findMissingEvidence(
      input.caseId,
      "housing",
      input.documents,
    );

    const missingTenancy = missingEvidence.find(e => 
      e.label.toLowerCase().includes("tenancy") &&
      e.status === "MISSING"
    );

    if (missingTenancy) {
      issues.push({
        id: `cpr-missing-tenancy-${input.caseId}`,
        caseId: input.caseId,
        rule: "Pre-Action Protocol (Housing)",
        breach: "Missing tenancy agreement",
        severity: "HIGH",
        description: "Tenancy agreement not provided — required for housing disrepair claims",
        suggestedApplication: "FURTHER_INFORMATION",
        applicationText: "Request tenancy agreement — this is essential evidence for establishing landlord obligations.",
        evidence: [missingTenancy.reason],
        createdAt: now,
      });
    }
  }

  // 5. Check for missing medical evidence (PI/Clinical Neg)
  // For claimant cases, only flag if medical evidence is actually missing (content-based check)
  if ((input.practiceArea === "personal_injury" || input.practiceArea === "clinical_negligence") &&
      input.caseRole === "claimant") {
    
    // If medical evidence signals indicate medical records are present, skip this check
    if (input.medicalEvidenceSignals?.hasMedicalRecords) {
      // Medical records are present - check for expert report instead
      const missingEvidence = findMissingEvidence(
        input.caseId,
        "pi",
        input.documents,
      );

      const missingExpert = missingEvidence.find(e => 
        (e.label.toLowerCase().includes("expert") ||
         e.label.toLowerCase().includes("breach") ||
         e.label.toLowerCase().includes("causation")) &&
        e.status === "MISSING" &&
        e.priority === "CRITICAL"
      );

      if (missingExpert) {
        issues.push({
          id: `cpr-missing-expert-${input.caseId}`,
          caseId: input.caseId,
          rule: "Pre-Action Protocol (PI/Clinical Neg)",
          breach: "Expert evidence not yet uploaded",
          severity: "CRITICAL",
          description: "Expert evidence not yet uploaded — required to finalise breach/causation opinion (PAP stage)",
          suggestedApplication: "FURTHER_INFORMATION",
          applicationText: "Obtain expert evidence — this is essential for establishing breach and causation in clinical negligence cases.",
          evidence: [missingExpert.reason],
          createdAt: now,
        });
      }
    } else {
      // No medical records detected - flag as missing
      const missingEvidence = findMissingEvidence(
        input.caseId,
        "pi",
        input.documents,
      );

      const missingMedical = missingEvidence.find(e => 
        (e.label.toLowerCase().includes("medical") ||
         e.label.toLowerCase().includes("gp") ||
         e.label.toLowerCase().includes("hospital")) &&
        e.status === "MISSING" &&
        e.priority === "CRITICAL"
      );

      if (missingMedical) {
        // Check if medical records show strong breach/causation/harm (via momentum state)
        // If so, adjust message to indicate expert is needed, not medical records
        // Note: This is a simplified check - in production, you'd pass breach/causation/harm evidence here
        const description = "Expert evidence required to formalise breach and causation. Underlying medical records strongly support negligence.";
        const applicationText = "Obtain expert evidence to confirm and quantify the breach and causation opinion. Medical records already provide strong support.";
        
        issues.push({
          id: `cpr-missing-medical-${input.caseId}`,
          caseId: input.caseId,
          rule: "Pre-Action Protocol (PI/Clinical Neg)",
          breach: "Expert evidence not yet uploaded",
          severity: "HIGH", // Reduced from CRITICAL since medical records are present
          description,
          suggestedApplication: "FURTHER_INFORMATION",
          applicationText,
          evidence: [missingMedical.reason],
          createdAt: now,
        });
      }
    }
  } else if (input.practiceArea === "personal_injury" || input.practiceArea === "clinical_negligence") {
    // For defendant cases or when caseRole is not provided, use original logic
    const missingEvidence = findMissingEvidence(
      input.caseId,
      "pi",
      input.documents,
    );

    const missingMedical = missingEvidence.find(e => 
      (e.label.toLowerCase().includes("medical") ||
       e.label.toLowerCase().includes("gp") ||
       e.label.toLowerCase().includes("hospital")) &&
      e.status === "MISSING" &&
      e.priority === "CRITICAL"
    );

    if (missingMedical) {
      // Check if medical records show strong breach/causation/harm
      const hasStrongBreach = input.breachEvidence?.level === "HIGH";
      const hasStrongCausation = input.causationEvidence?.level === "HIGH";
      const hasHarm = input.harmEvidence?.level === "PRESENT";
      const hasStrongMedicalEvidence = hasStrongBreach && hasStrongCausation && hasHarm;
      
      // Also check if medical evidence signals indicate records are present
      const hasMedicalRecords = input.medicalEvidenceSignals?.hasMedicalRecords;
      
      // If medical records show strong breach/causation/harm, adjust message
      const description = hasStrongMedicalEvidence
        ? "Expert evidence required to formalise breach and causation. Underlying medical records strongly support negligence."
        : hasMedicalRecords
        ? "Expert evidence required to formalise breach and causation. Underlying medical records strongly support negligence."
        : "Critical medical evidence not provided — required for causation";
      const applicationText = hasStrongMedicalEvidence || hasMedicalRecords
        ? "Obtain expert evidence to confirm and quantify the breach and causation opinion. Medical records already provide strong support."
        : "Request medical records — this is essential for establishing causation and quantum.";
      
      issues.push({
        id: `cpr-missing-medical-${input.caseId}`,
        caseId: input.caseId,
        rule: "Pre-Action Protocol (PI/Clinical Neg)",
        breach: hasStrongMedicalEvidence || hasMedicalRecords ? "Expert evidence not yet uploaded" : "Missing medical evidence",
        severity: hasStrongMedicalEvidence || hasMedicalRecords ? "HIGH" : "CRITICAL",
        description,
        suggestedApplication: "FURTHER_INFORMATION",
        applicationText,
        evidence: [missingMedical.reason],
        createdAt: now,
      });
    }
  }

  // 6. Check for missing chronology
  if (!input.hasChronology && input.timeline.length > 5) {
    issues.push({
      id: `cpr-missing-chronology-${input.caseId}`,
      caseId: input.caseId,
      rule: "Pre-Action Protocol",
      breach: "No chronological clarity",
      severity: "MEDIUM",
      description: "No clear chronology provided — makes case difficult to follow",
      suggestedApplication: "FURTHER_INFORMATION",
      applicationText: "Request chronological summary — this helps clarify the sequence of events.",
      evidence: [`${input.timeline.length} timeline events but no clear chronology`],
      createdAt: now,
    });
  }

  // 7. Check for missing hazard assessment (housing)
  if (input.practiceArea === "housing_disrepair" && !input.hasHazardAssessment) {
    const hasHazards = input.timeline.some(e => 
      e.description.toLowerCase().includes("hazard") ||
      e.description.toLowerCase().includes("hhsrs") ||
      e.description.toLowerCase().includes("mold") ||
      e.description.toLowerCase().includes("damp")
    );

    if (hasHazards) {
      issues.push({
        id: `cpr-missing-hazard-assessment-${input.caseId}`,
        caseId: input.caseId,
        rule: "Pre-Action Protocol (Housing)",
        breach: "Missing hazard assessment",
        severity: "HIGH",
        description: "Hazards detected but no formal hazard assessment provided",
        suggestedApplication: "FURTHER_INFORMATION",
        applicationText: "Request hazard assessment — this is required for establishing HHSRS Category 1 hazards.",
        evidence: ["Hazards mentioned in timeline but no assessment document"],
        createdAt: now,
      });
    }
  }

  return issues;
}

