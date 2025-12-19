/**
 * Practice Area Viability Assessment
 * 
 * Prevents strategy generation when documents don't match the selected solicitor role.
 * This is a foundational shipping fix to prevent hallucinated/mismatched advice.
 */

// SolicitorRole type - matches sidebar definition
export type SolicitorRole =
  | "criminal_solicitor"
  | "clinical_neg_solicitor"
  | "housing_solicitor"
  | "pi_solicitor"
  | "family_solicitor"
  | "general_litigation_solicitor";

export type PracticeAreaViabilityResult = {
  viable: boolean;
  score: number; // 0-1, how well the bundle matches the role
  reasons: string[];
  suggestedRole?: SolicitorRole;
};

export type RoleRule = {
  minSignals: number;
  signals: string[];
};

/**
 * ROLE_RULES config - defines minimum signals required for each role
 */
export const ROLE_RULES: Record<SolicitorRole, RoleRule> = {
  criminal_solicitor: {
    minSignals: 2,
    signals: [
      "EWCA Crim", "R v", "Crown Court", "Magistrates' Court", "sentence", "appeal",
      "conviction", "pleaded guilty", "custody", "OAPA", "Offences Against the Person Act",
      "PACE", "CPIA", "offence", "prosecution", "defence", "defendant",
      "interview", "bail", "remand", "charge", "indictment", "MG6", "MG5",
      "disclosure", "unused material", "CPS", "Crown Prosecution Service",
    ],
  },
  clinical_neg_solicitor: {
    minSignals: 2,
    signals: [
      "patient", "claimant", "deceased", "NHS", "Trust", "hospital", "ward",
      "A&E", "A & E", "GP", "consultant", "diagnosis", "scan", "x-ray", "xray",
      "ct", "mri", "surgery", "procedure", "discharge", "admitted", "negligence",
      "breach", "delay", "misdiagnosis", "sepsis", "deterioration", "consent",
      "Pre-Action Protocol", "Letter of Claim", "Letter of Response", "CNF",
      "Schedule of Loss", "expert report", "radiology", "imaging", "operation",
      "treatment", "clinical", "medical records", "discharge summary",
    ],
  },
  housing_solicitor: {
    minSignals: 2,
    signals: [
      "tenant", "landlord", "council", "housing association", "damp", "mould",
      "mold", "disrepair", "leak", "section 11", "LTA 1985", "HHSRS",
      "Awaab", "repair notice", "unfit for habitation", "housing disrepair",
      "water ingress", "condensation", "repairs", "inspection", "survey",
      "works order", "complaint", "tenancy agreement",
    ],
  },
  pi_solicitor: {
    minSignals: 2,
    signals: [
      "accident", "injury", "RTA", "RTI", "EL", "PL", "employers liability",
      "public liability", "CNF", "MOJ portal", "whiplash", "liability",
      "quantum", "medical report", "personal injury", "claimant", "defendant",
      "collision", "slip", "trip", "fall", "road traffic", "motor vehicle",
    ],
  },
  family_solicitor: {
    minSignals: 2,
    signals: [
      "child arrangements", "CAFCASS", "s.8", "section 8", "s.7 report",
      "section 7", "parental responsibility", "contact", "residence",
      "safeguarding", "domestic abuse", "child protection", "supervision order",
      "care order", "prohibited steps", "specific issue", "family court",
      "children act", "C100", "FL401",
    ],
  },
  general_litigation_solicitor: {
    minSignals: 1, // General litigation is a catch-all, so lower threshold
    signals: [
      "claimant", "defendant", "claim", "litigation", "court", "proceedings",
      "letter before action", "LBA", "particulars of claim", "defence",
      "witness statement", "disclosure", "trial", "hearing",
    ],
  },
};

/**
 * Map practice area to solicitor role
 */
function practiceAreaToRole(practiceArea: string): SolicitorRole {
  const pa = (practiceArea || "").toLowerCase();
  if (pa === "criminal") return "criminal_solicitor";
  if (pa === "clinical_negligence") return "clinical_neg_solicitor";
  if (pa === "housing_disrepair") return "housing_solicitor";
  if (pa === "personal_injury") return "pi_solicitor";
  if (pa === "family") return "family_solicitor";
  return "general_litigation_solicitor";
}

/**
 * Assess practice area viability for a bundle
 */
export function assessPracticeAreaViability(
  bundleText: string,
  selectedRole: SolicitorRole | string,
): PracticeAreaViabilityResult {
  const role = typeof selectedRole === "string" ? (selectedRole as SolicitorRole) : selectedRole;
  const normalizedText = (bundleText || "").toLowerCase();
  
  const rule = ROLE_RULES[role];
  if (!rule) {
    return {
      viable: true, // Default to viable if role not recognized
      score: 0.5,
      reasons: [`Role "${role}" not recognized in viability rules`],
    };
  }

  // Count signal hits for selected role
  const hits = rule.signals.filter((signal) => 
    normalizedText.includes(signal.toLowerCase())
  ).length;

  const score = Math.min(1, hits / Math.max(rule.minSignals, 1));
  const viable = hits >= rule.minSignals;

  const reasons: string[] = [];
  if (!viable) {
    reasons.push(
      `Found ${hits} signal(s) for ${role.replace("_", " ")} (minimum required: ${rule.minSignals})`
    );
    const missingSignals = rule.signals
      .filter((s) => !normalizedText.includes(s.toLowerCase()))
      .slice(0, 5);
    if (missingSignals.length > 0) {
      reasons.push(`Missing indicators: ${missingSignals.join(", ")}`);
    }
  }

  // Detect alternative role with strong signals
  let suggestedRole: SolicitorRole | undefined;
  if (!viable) {
    const alternativeScores: Array<{ role: SolicitorRole; hits: number }> = [];
    
    for (const [altRole, altRule] of Object.entries(ROLE_RULES)) {
      if (altRole === role) continue;
      
      const altHits = altRule.signals.filter((signal) =>
        normalizedText.includes(signal.toLowerCase())
      ).length;
      
      if (altHits >= 3) {
        alternativeScores.push({ role: altRole as SolicitorRole, hits: altHits });
      }
    }
    
    if (alternativeScores.length > 0) {
      // Suggest the role with the most hits
      alternativeScores.sort((a, b) => b.hits - a.hits);
      suggestedRole = alternativeScores[0].role;
      reasons.push(`Strong signals detected for alternative role: ${suggestedRole.replace("_", " ")} (${alternativeScores[0].hits} indicators)`);
    }
  }

  return {
    viable,
    score,
    reasons,
    suggestedRole,
  };
}

/**
 * Check if evidence trigger exists in bundle text
 */
export function hasEvidenceTrigger(
  bundleText: string,
  triggers: string[],
): boolean {
  const normalized = (bundleText || "").toLowerCase();
  return triggers.some((trigger) => normalized.includes(trigger.toLowerCase()));
}

/**
 * Evidence trigger rules - only show evidence if triggers exist
 */
export const EVIDENCE_TRIGGERS: Record<string, string[]> = {
  // Clinical Negligence
  radiology: ["ct", "mri", "x-ray", "xray", "scan", "imaging", "radiology"],
  consent: ["procedure", "surgery", "operation", "consent", "informed consent"],
  escalation: ["deteriorat", "sepsis", "critical", "red flag", "escalat", "urgent"],
  timeToTreatment: ["delay", "waiting", "hours", "triage", "wait time", "delayed"],
  
  // Housing Disrepair
  dampMould: ["damp", "mould", "mold", "condensation", "moisture"],
  repairNotice: ["repair notice", "works order", "inspection", "survey"],
  awaabsLaw: ["awaab", "mould", "damp", "excess cold", "water ingress"],
  
  // Personal Injury
  part36: ["part 36", "part36", "offer", "settlement", "quantum"],
  mojPortal: ["moj portal", "portal", "cnf", "pre-action protocol"],
  
  // Criminal
  pace: ["custody", "interview", "pace", "caution", "solicitor", "legal advice"],
  disclosure: ["mg6", "mg5", "disclosure", "unused material", "cpia"],
  cctv: ["cctv", "footage", "camera", "video", "bwv", "body worn"],
  
  // Family
  cafcass: ["cafcass", "s.7", "section 7", "welfare report"],
  safeguarding: ["safeguarding", "child protection", "domestic abuse", "risk"],
};

/**
 * Check if evidence item should be shown based on triggers
 */
export function shouldShowEvidenceItem(
  evidenceLabel: string,
  bundleText: string,
): boolean {
  const labelLower = evidenceLabel.toLowerCase();
  
  // Check each trigger category
  for (const [category, triggers] of Object.entries(EVIDENCE_TRIGGERS)) {
    if (labelLower.includes(category) || 
        triggers.some((t) => labelLower.includes(t))) {
      return hasEvidenceTrigger(bundleText, triggers);
    }
  }
  
  // If no specific trigger rule, default to showing it
  return true;
}

