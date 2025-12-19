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
  strongSignals: string[];
  strongSignalMin?: number;
};

/**
 * ROLE_RULES config - defines minimum signals required for each role
 */
export const ROLE_RULES: Record<SolicitorRole, RoleRule> = {
  criminal_solicitor: {
    minSignals: 2,
    strongSignals: [
      "PACE", "CPIA", "MG6A", "MG6C", "Indictment", "Plea and Trial Preparation", "PTR",
      "Crown Court", "EWCA Crim", "R v", "Custody Time Limit", "CTI",
    ],
    strongSignalMin: 1,
    signals: [
      // Court and procedure
      "EWCA Crim", "R v", "Crown Court", "Magistrates' Court", "Magistrates Court", "sentence", "appeal",
      "conviction", "pleaded guilty", "custody", "case management", "directions", "trial date", "listing", "adjournment",
      // Statutes and offences
      "OAPA", "Offences Against the Person Act", "OAPA 1861", "Offences Against the Person Act 1861",
      "s.18", "s18", "section 18", "s.20", "s20", "section 20",
      "attempted murder", "conspiracy to murder", "wounding with intent",
      "GBH", "grievous bodily harm", "ABH", "actual bodily harm", "common assault",
      "offensive weapon", "bladed article", "knife", "firearm",
      "robbery", "burglary", "theft", "fraud",
      "possession with intent to supply", "PWITS", "Class A", "Class B", "controlled drug",
      // Procedure and evidence
      "offence", "prosecution", "defence", "defendant",
      "interview", "caution", "legal advice", "solicitor present", "custody record",
      "bail", "remand", "curfew", "no contact", "residence requirement", "surety",
      "charge", "indictment", "MG6", "MG5",
      "disclosure", "unused material", "sensitive material", "continuity", "exhibit", "chain of custody",
      "CCTV", "body worn video", "BWV", "999 call", "first account",
      "CPS", "Crown Prosecution Service",
    ],
  },
  clinical_neg_solicitor: {
    minSignals: 2,
    strongSignals: [
      "Pre-Action Protocol for the Resolution of Clinical Disputes",
      "Letter of Claim", "Letter of Response",
      "NHS Trust", "Integrated Care Board", "ICB",
      "Bolam", "Bolitho", "Montgomery",
    ],
    strongSignalMin: 1,
    signals: [
      // Parties
      "patient", "claimant", "deceased", "next of kin",
      // Healthcare providers
      "NHS", "Trust", "hospital", "ward", "clinic", "A&E", "ED", "GP", "consultant",
      // Clinical terms
      "diagnosis", "misdiagnosis", "delay in diagnosis", "delay", "deterioration",
      "scan", "imaging", "radiology", "x-ray", "xray", "CT", "MRI", "ultrasound", "report", "addendum",
      "surgery", "operation", "procedure", "anaesthetic", "discharge", "admitted", "triage",
      "sepsis", "stroke", "MI", "fracture", "infection", "complication",
      "consent", "informed consent", "risk explained",
      // Documentation
      "clinical notes", "nursing notes", "obs", "observations", "NEWS2",
      "handover", "escalation", "senior review", "incident report", "Datix", "RCA",
      "medical records", "chronology", "witness statement", "discharge summary",
      // Legal terms
      "negligence", "breach", "causation", "breach of duty", "standard of care", "quantum",
      "Pre-Action Protocol", "CNF", "Schedule of Loss", "expert report", "treatment", "clinical",
    ],
  },
  housing_solicitor: {
    minSignals: 2,
    strongSignals: [
      "Section 11", "Landlord and Tenant Act 1985",
      "HHSRS", "Housing Health and Safety Rating System",
      "Homes (Fitness for Human Habitation) Act",
      "disrepair", "damp and mould",
      "Awaab", "Awaab's Law",
    ],
    strongSignalMin: 1,
    signals: [
      // Parties
      "tenant", "landlord", "housing association", "council", "social housing",
      // Defects and hazards
      "mould", "mold", "damp", "condensation", "leak", "penetrating damp",
      "repair", "repairs", "defect", "hazard", "unfit", "habitability",
      "water ingress",
      // Legal and procedure
      "section 11", "LTA 1985", "HHSRS",
      "notice of disrepair", "repair notice", "complaint", "ombudsman",
      "inspection", "survey", "environmental health", "abatement",
      "schedule of works", "contractor", "work order", "works order",
      "tenancy agreement",
      // Impact
      "decant", "temporary accommodation",
      "asthma", "respiratory", "health impact",
      "unfit for habitation", "housing disrepair",
    ],
  },
  pi_solicitor: {
    minSignals: 2,
    strongSignals: [
      "CNF", "MOJ Portal", "OIC", "Whiplash Reform Programme",
      "Part 36", "Calderbank",
      "RTA Protocol", "EL/PL Protocol",
    ],
    strongSignalMin: 1,
    signals: [
      // Incident types
      "accident", "injury", "RTA", "road traffic accident", "RTI", "EL", "PL",
      "employer's liability", "public liability", "collision", "slip", "trip", "fall", "road traffic", "motor vehicle",
      // Injury types
      "whiplash", "soft tissue", "fracture", "psychological injury",
      // Parties and procedure
      "claimant", "defendant", "liability",
      "CNF", "MOJ portal",
      // Medical and evidence
      "medical report", "GP records", "A&E attendance",
      // Damages
      "special damages", "general damages", "loss of earnings", "care", "rehab",
      "credit hire", "physio", "treatment",
      // Legal terms
      "negligence", "duty", "breach", "causation", "quantum",
      "personal injury",
    ],
  },
  family_solicitor: {
    minSignals: 2,
    strongSignals: [
      "CAFCASS", "Children Act 1989",
      "Child Arrangements Order", "Prohibited Steps Order", "Specific Issue Order",
      "s.7 report", "s.8",
      "fact-finding hearing",
    ],
    strongSignalMin: 1,
    signals: [
      // Orders and procedure
      "child arrangements", "contact", "residence", "parental responsibility",
      "s.8", "section 8", "s.7 report", "section 7",
      "supervision order", "care order", "prohibited steps", "specific issue",
      // Safeguarding
      "safeguarding", "allegations", "domestic abuse", "non-molestation",
      "child protection",
      // Procedure
      "CAFCASS", "FHDRA", "directions", "welfare checklist",
      "social services", "local authority", "threshold criteria",
      "guardian", "family court",
      // Forms
      "children act", "C100", "FL401",
    ],
  },
  general_litigation_solicitor: {
    minSignals: 1, // General litigation is a catch-all, so lower threshold
    strongSignals: [
      "ACAS", "Early Conciliation",
      "Employment Tribunal", "ET1", "ET3",
      "unfair dismissal", "Equality Act 2010",
    ],
    strongSignalMin: 1,
    signals: [
      // General litigation
      "claimant", "defendant", "claim", "litigation", "court", "proceedings",
      "letter before action", "LBA", "particulars of claim", "defence",
      "witness statement", "disclosure", "trial", "hearing",
      // Employment (since general_litigation can include employment)
      "dismissal", "redundancy", "notice period", "PILON",
      "grievance", "disciplinary", "investigation", "appeal",
      "discrimination", "harassment", "victimisation",
      "protected characteristic", "reasonable adjustments",
      "constructive dismissal", "wrongful dismissal",
      "settlement agreement", "without prejudice",
      "ACAS", "Early Conciliation",
      "Employment Tribunal", "ET1", "ET3",
      "unfair dismissal", "Equality Act 2010",
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

  // Helper function for robust signal matching
  const matchesSignal = (signal: string, text: string): boolean => {
    const signalLower = signal.toLowerCase();
    const textLower = text.toLowerCase();
    const signalNormalized = signalLower.replace(/[^\w\s]/g, ""); // Remove punctuation for matching
    
    // Direct match
    if (textLower.includes(signalLower)) {
      return true;
    }
    
    // Punctuation-tolerant match (e.g., "s.18" matches "section 18", "s18", "s.18")
    if (signalNormalized.length > 0) {
      // Create regex pattern that handles common punctuation variants
      const pattern = signalNormalized
        .replace(/\s+/g, "\\s*") // Allow optional whitespace
        .replace(/section\s*(\d+)/gi, "(?:section|s\\.?)\\s*$1") // Handle "section 18" vs "s.18"
        .replace(/(\d+)/g, "$1"); // Preserve numbers
      
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(textLower)) {
          return true;
        }
      } catch {
        // If regex fails, fall back to simple includes
      }
    }
    
    return false;
  };

  // Count strong signal hits
  const strongHits = (rule.strongSignals || []).filter((signal) => 
    matchesSignal(signal, normalizedText)
  ).length;

  // Count regular signal hits
  const hits = rule.signals.filter((signal) => 
    matchesSignal(signal, normalizedText)
  ).length;

  const strongSignalMin = rule.strongSignalMin ?? 1;
  const score = Math.min(1, Math.max(
    hits / Math.max(rule.minSignals, 1),
    strongHits >= strongSignalMin ? 1 : 0
  ));
  
  // Viable if: (regular signals >= minSignals) OR (strong signals >= strongSignalMin)
  const viable = (hits >= rule.minSignals) || (strongHits >= strongSignalMin);

  const reasons: string[] = [];
  if (!viable) {
    const signalText = strongHits > 0 
      ? `${hits} signal(s) and ${strongHits} strong signal(s)`
      : `${hits} signal(s)`;
    reasons.push(
      `Found ${signalText} for ${role.replace("_", " ")} (minimum required: ${rule.minSignals} signals or ${strongSignalMin} strong signal)`
    );
    const missingSignals = rule.signals
      .filter((s) => !matchesSignal(s, normalizedText))
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
      
      const altStrongHits = (altRule.strongSignals || []).filter((signal) => 
        matchesSignal(signal, normalizedText)
      ).length;
      
      const altHits = altRule.signals.filter((signal) => 
        matchesSignal(signal, normalizedText)
      ).length;
      
      const altStrongMin = altRule.strongSignalMin ?? 1;
      const altTotalHits = altHits + (altStrongHits >= altStrongMin ? 3 : 0); // Weight strong signals higher
      
      if (altTotalHits >= 3 || altStrongHits >= altStrongMin) {
        alternativeScores.push({ role: altRole as SolicitorRole, hits: altTotalHits });
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

