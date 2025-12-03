import type { MissingEvidenceItem, EvidenceRequirement, Severity, PracticeArea } from "./types/casebrain";
import { getEvidenceChecklist, type PackEvidenceRequirement } from "./packs";

/**
 * Legacy evidence requirements - kept for backwards compatibility
 * New code should use the pack system via getEvidenceChecklist()
 * @deprecated Use getEvidenceChecklist(practiceArea) instead
 */
const LEGACY_EVIDENCE_REQUIREMENTS: EvidenceRequirement[] = [
  // Housing Disrepair Requirements
  {
    id: "housing-tenancy",
    label: "Tenancy Agreement",
    category: "LIABILITY",
    description: "Copy of tenancy agreement showing landlord obligations",
    priority: "HIGH",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["tenancy", "agreement", "lease", "contract"],
  },
  {
    id: "housing-complaint",
    label: "Initial Complaint Letter/Email",
    category: "LIABILITY",
    description: "Evidence of first report to landlord",
    priority: "CRITICAL",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["complaint", "report", "notif", "inform"],
  },
  {
    id: "housing-photos",
    label: "Photographic Evidence",
    category: "LIABILITY",
    description: "Photos of defects and disrepair",
    priority: "HIGH",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["photo", "image", "picture", "jpeg", "jpg", "png"],
  },
  {
    id: "housing-survey",
    label: "Surveyor's Report",
    category: "LIABILITY",
    description: "Expert surveyor inspection report",
    priority: "HIGH",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["survey", "inspection", "hhsrs", "hazard"],
  },
  {
    id: "housing-medical",
    label: "Medical Evidence",
    category: "CAUSATION",
    description: "GP records or medical report showing health impact",
    priority: "HIGH",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["medical", "gp", "doctor", "health", "asthma", "respiratory"],
  },
  {
    id: "housing-landlord-response",
    label: "Landlord Correspondence",
    category: "LIABILITY",
    description: "Any responses or acknowledgements from landlord",
    priority: "MEDIUM",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["landlord", "response", "reply", "acknowledgement"],
  },
  {
    id: "housing-schedule-loss",
    label: "Schedule of Special Damages",
    category: "QUANTUM",
    description: "List of financial losses with receipts",
    priority: "MEDIUM",
    caseTypes: ["housing_disrepair"],
    detectPatterns: ["schedule", "loss", "damage", "receipt", "expense"],
  },

  // Personal Injury Requirements
  {
    id: "pi-accident-report",
    label: "Accident Report",
    category: "LIABILITY",
    description: "Report of the accident/incident",
    priority: "CRITICAL",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["accident", "incident", "report", "claim form", "cnf"],
  },
  {
    id: "pi-witness",
    label: "Witness Statement",
    category: "LIABILITY",
    description: "Statements from witnesses to the incident",
    priority: "HIGH",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["witness", "statement", "testimony"],
  },
  {
    id: "pi-medical-records",
    label: "Medical Records",
    category: "CAUSATION",
    description: "GP and hospital records",
    priority: "CRITICAL",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["medical", "gp", "hospital", "record", "note"],
  },
  {
    id: "pi-medical-report",
    label: "Medical Expert Report",
    category: "CAUSATION",
    description: "Expert medical report on injuries",
    priority: "CRITICAL",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["expert", "report", "prognosis", "medco"],
  },
  {
    id: "pi-schedule-loss",
    label: "Schedule of Loss",
    category: "QUANTUM",
    description: "Schedule of past and future losses",
    priority: "HIGH",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["schedule", "loss", "special damage"],
  },
  {
    id: "pi-employment",
    label: "Employment Evidence",
    category: "QUANTUM",
    description: "Pay slips, employment contract, or loss of earnings letter",
    priority: "MEDIUM",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["employment", "pay", "wage", "salary", "earning"],
  },
  {
    id: "pi-photos",
    label: "Photographic Evidence",
    category: "LIABILITY",
    description: "Photos of injuries or accident scene",
    priority: "MEDIUM",
    caseTypes: ["pi", "personal_injury", "clinical_negligence"],
    detectPatterns: ["photo", "image", "picture"],
  },

  // Clinical Negligence Specific
  {
    id: "clin-consent",
    label: "Consent Forms",
    category: "LIABILITY",
    description: "Signed consent forms for treatment",
    priority: "HIGH",
    caseTypes: ["clinical_negligence"],
    detectPatterns: ["consent", "form", "signed"],
  },
  {
    id: "clin-expert",
    label: "Expert Breach/Causation Report",
    category: "LIABILITY",
    description: "Expert report on breach of duty and causation",
    priority: "CRITICAL",
    caseTypes: ["clinical_negligence"],
    detectPatterns: ["breach", "duty", "causation", "expert", "bolam"],
  },
];

/**
 * Convert pack evidence requirement to legacy format
 */
function packRequirementToLegacy(req: PackEvidenceRequirement, practiceArea: string): EvidenceRequirement {
  return {
    id: req.id,
    label: req.label,
    category: req.category,
    description: req.description,
    priority: req.priority,
    caseTypes: [practiceArea],
    detectPatterns: req.detectPatterns,
  };
}

/**
 * Get evidence requirements using the pack system
 */
function getRequirementsFromPack(practiceArea: string): EvidenceRequirement[] {
  const packRequirements = getEvidenceChecklist(practiceArea as PracticeArea);
  return packRequirements.map(req => packRequirementToLegacy(req, practiceArea));
}

/**
 * Find missing evidence for a case
 * Now uses the pack system for evidence requirements
 */
export function findMissingEvidence(
  caseId: string,
  caseType: string,
  existingDocuments: Array<{ name: string; type?: string; extracted_json?: unknown }>,
): MissingEvidenceItem[] {
  // Get requirements from the pack system (preferred) with fallback to legacy
  const normalizedType = mapCaseType(caseType);
  const packRequirements = getRequirementsFromPack(normalizedType);
  
  // Use pack requirements if available, otherwise fall back to legacy
  const requirements = packRequirements.length > 0 
    ? packRequirements
    : LEGACY_EVIDENCE_REQUIREMENTS.filter((req) =>
        req.caseTypes.includes(caseType) || req.caseTypes.includes(normalizedType),
      );

  // Check which requirements are met
  const missingItems: MissingEvidenceItem[] = [];

  for (const req of requirements) {
    const isPresent = checkEvidencePresent(req, existingDocuments);

    if (!isPresent) {
      missingItems.push({
        id: `missing-${caseId}-${req.id}`,
        caseId,
        category: req.category,
        label: req.label,
        reason: req.description,
        priority: req.priority as Severity,
        status: "MISSING",
        suggestedAction: getSuggestedAction(req),
      });
    }
  }

  // Group by category and sort by priority within each category
  const priorityOrder: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  missingItems.sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    // Then by category (Liability → Causation → Quantum → Procedure)
    const categoryOrder: Array<MissingEvidenceItem["category"]> = ["LIABILITY", "CAUSATION", "QUANTUM", "PROCEDURE", "HOUSING"];
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  });

  return missingItems;
}

/**
 * Check if evidence requirement is met by existing documents
 * Enhanced to check extracted_json structured data for housing-specific evidence
 */
function checkEvidencePresent(
  requirement: EvidenceRequirement,
  documents: Array<{ name: string; type?: string; extracted_json?: unknown }>,
): boolean {
  for (const doc of documents) {
    const docNameLower = doc.name.toLowerCase();
    const docTypeLower = (doc.type ?? "").toLowerCase();

    // Check if any detect pattern matches the document name or type
    for (const pattern of requirement.detectPatterns) {
      if (docNameLower.includes(pattern) || docTypeLower.includes(pattern)) {
        return true;
      }
    }

    // Enhanced: Check extracted_json structured data for housing-specific evidence
    if (doc.extracted_json && typeof doc.extracted_json === "object") {
      const extracted = doc.extracted_json as {
        housingMeta?: {
          propertyDefects?: Array<{ type: string; firstReported?: string }>;
          landlordResponses?: Array<{ type: string; date: string; text?: string }>;
        };
        summary?: string;
        keyIssues?: string[];
      };

      // Check for first complaint
      if (requirement.id === "housing-initial-complaint" || requirement.id === "housing-complaint") {
        if (extracted.housingMeta?.propertyDefects?.some(d => d.firstReported)) {
          return true;
        }
        if (extracted.summary?.toLowerCase().includes("first complaint") ||
            extracted.summary?.toLowerCase().includes("initial report") ||
            extracted.summary?.toLowerCase().includes("first reported")) {
          return true;
        }
      }

      // Check for landlord replies
      if (requirement.id === "housing-landlord-response" || requirement.id === "housing-landlord-responses") {
        if (extracted.housingMeta?.landlordResponses && extracted.housingMeta.landlordResponses.length > 0) {
          return true;
        }
        if (extracted.summary?.toLowerCase().includes("landlord response") ||
            extracted.summary?.toLowerCase().includes("landlord reply") ||
            extracted.summary?.toLowerCase().includes("acknowledgement")) {
          return true;
        }
      }

      // Check for repair history
      if (requirement.id === "housing-repair-history" || requirement.id === "housing-chasing-correspondence") {
        if (extracted.housingMeta?.landlordResponses?.some(r => 
          r.type === "repair_scheduled" || r.type === "acknowledgement"
        )) {
          return true;
        }
        if (extracted.summary?.toLowerCase().includes("repair") ||
            extracted.summary?.toLowerCase().includes("chaser") ||
            extracted.summary?.toLowerCase().includes("follow up")) {
          return true;
        }
      }
    }

    // Also check extracted JSON if available
    if (doc.extracted_json) {
      const jsonString = JSON.stringify(doc.extracted_json).toLowerCase();
      for (const pattern of requirement.detectPatterns) {
        if (jsonString.includes(pattern)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Map practice area to standardized case type
 */
function mapCaseType(practiceArea: string): string {
  const lower = practiceArea.toLowerCase().replace(/[^a-z_]/g, "_");
  
  // Housing variants
  if (lower.includes("housing") || lower.includes("disrepair")) {
    return "housing_disrepair";
  }
  
  // PI variants
  if (lower.includes("pi") || lower.includes("personal") || lower.includes("injury") || 
      lower.includes("rta") || lower.includes("accident")) {
    return "personal_injury";
  }
  
  // Clinical negligence variants
  if (lower.includes("clin") || lower.includes("medical") || lower.includes("negligence")) {
    return "clinical_negligence";
  }
  
  // Family
  if (lower.includes("family") || lower.includes("child") || lower.includes("divorce") ||
      lower.includes("matrimonial")) {
    return "family";
  }
  
  return "other_litigation";
}

/**
 * Get suggested action for missing evidence
 */
function getSuggestedAction(requirement: EvidenceRequirement): string {
  switch (requirement.category) {
    case "LIABILITY":
      return `Request ${requirement.label.toLowerCase()} from client or opponent`;
    case "CAUSATION":
      return `Obtain ${requirement.label.toLowerCase()} to establish causation link`;
    case "QUANTUM":
      return `Gather ${requirement.label.toLowerCase()} to support quantum claim`;
    default:
      return `Obtain ${requirement.label.toLowerCase()}`;
  }
}

/**
 * Get all evidence requirements for a case type (for display)
 * Now uses the pack system
 */
export function getEvidenceRequirements(caseType: string): EvidenceRequirement[] {
  const normalizedType = mapCaseType(caseType);
  const packRequirements = getRequirementsFromPack(normalizedType);
  
  if (packRequirements.length > 0) {
    return packRequirements;
  }
  
  // Fallback to legacy
  return LEGACY_EVIDENCE_REQUIREMENTS.filter((req) =>
    req.caseTypes.includes(caseType) || req.caseTypes.includes(normalizedType),
  );
}

