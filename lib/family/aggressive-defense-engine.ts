/**
 * Aggressive Family Law Defense Engine
 * 
 * "Case Beater" system - finds EVERY possible angle to win a family law case.
 * Designed for cases "hanging on a thread" - leaves no stone unturned.
 * 
 * This is aggressive, tactical, and sophisticated defense strategy.
 */

import "server-only";

export type FamilyDefenseAngle = {
  id: string;
  angleType: 
    | "NON_COMPLIANCE_ATTACK"
    | "LATE_APPLICATION_ATTACK"
    | "DEFECTIVE_APPLICATION_ATTACK"
    | "NON_DISCLOSURE_ATTACK"
    | "INCOMPLETE_DISCLOSURE_ATTACK"
    | "CONTRADICTION_EXPLOITATION"
    | "WEAK_EVIDENCE_ATTACK"
    | "ENFORCEMENT_OPPORTUNITY"
    | "COMMITTAL_OPPORTUNITY"
    | "COSTS_SANCTION_OPPORTUNITY"
    | "STRIKE_OUT_OPPORTUNITY";
  
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  winProbability: number; // 0-100, chance this angle wins the case
  
  // Detailed analysis
  whyThisMatters: string;
  legalBasis: string;
  caseLaw: string[];
  opponentWeakness: string;
  
  // Tactical exploitation
  howToExploit: string;
  specificArguments: string[];
  crossExaminationPoints: string[];
  submissions: string[];
  
  // Impact analysis
  ifSuccessful: string;
  ifUnsuccessful: string;
  combinedWith: string[];
  
  // Evidence required
  evidenceNeeded: string[];
  disclosureRequests: string[];
  
  createdAt: string;
};

export type FamilyAggressiveDefenseAnalysis = {
  caseId: string;
  overallWinProbability: number;
  criticalAngles: FamilyDefenseAngle[];
  allAngles: FamilyDefenseAngle[];
  recommendedStrategy: {
    primaryAngle: FamilyDefenseAngle;
    supportingAngles: FamilyDefenseAngle[];
    combinedProbability: number;
    tacticalPlan: string[];
  };
  opponentVulnerabilities: {
    criticalWeaknesses: string[];
    evidenceGaps: string[];
    proceduralErrors: string[];
  };
  createdAt: string;
};

type FamilyDefenseInput = {
  caseId: string;
  opponentLastResponseDate: Date | null;
  hasApplication: boolean;
  applicationFiledDate: Date | null;
  applicationDeadlineDate: Date | null;
  hasOrder: boolean;
  orderDate: Date | null;
  orderComplianceDeadline: Date | null;
  orderCompliedWith: boolean | null;
  hasDisclosure: boolean;
  disclosureComplete: boolean | null;
  disclosureDeadline: Date | null;
};

/**
 * Main function: Find EVERY possible defense angle for family law
 */
export async function findAllFamilyDefenseAngles(
  input: FamilyDefenseInput,
): Promise<FamilyAggressiveDefenseAnalysis> {
  const allAngles: FamilyDefenseAngle[] = [];
  const now = new Date().toISOString();

  // 1. PROCEDURAL ATTACKS - Opponent mistakes create leverage
  const proceduralAngles = findProceduralAttackAngles(input);
  allAngles.push(...proceduralAngles);

  // 2. DISCLOSURE ATTACKS - Challenge opponent's disclosure
  const disclosureAngles = findDisclosureAttackAngles(input);
  allAngles.push(...disclosureAngles);

  // 3. EVIDENCE ATTACKS - Challenge opponent's evidence
  const evidenceAngles = findEvidenceAttackAngles(input);
  allAngles.push(...evidenceAngles);

  // 4. ENFORCEMENT ATTACKS - Enforce compliance
  const enforcementAngles = findEnforcementAttackAngles(input);
  allAngles.push(...enforcementAngles);

  // Sort by win probability
  const sortedAngles = allAngles.sort((a, b) => b.winProbability - a.winProbability);
  const criticalAngles = sortedAngles.filter(a => a.winProbability >= 70 || a.severity === "CRITICAL");

  // Calculate overall win probability
  const overallWinProbability = calculateOverallWinProbability(sortedAngles);

  // Build recommended strategy
  const recommendedStrategy = buildRecommendedStrategy(sortedAngles);

  // Identify opponent vulnerabilities
  const opponentVulnerabilities = identifyOpponentVulnerabilities(input, allAngles);

  return {
    caseId: input.caseId,
    overallWinProbability,
    criticalAngles: criticalAngles.slice(0, 5),
    allAngles: sortedAngles,
    recommendedStrategy,
    opponentVulnerabilities,
    createdAt: now,
  };
}

/**
 * PROCEDURAL ATTACK ANGLES
 * Opponent mistakes create leverage
 */

function findProceduralAttackAngles(input: FamilyDefenseInput): FamilyDefenseAngle[] {
  const angles: FamilyDefenseAngle[] = [];
  const now = Date.now();

  // NON-COMPLIANCE WITH ORDERS
  if (input.hasOrder && input.orderComplianceDeadline && input.orderCompliedWith === false) {
    const daysOverdue = Math.floor(
      (now - input.orderComplianceDeadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue > 0) {
      angles.push({
        id: `angle-non-compliance-${input.caseId}`,
        angleType: "NON_COMPLIANCE_ATTACK",
        title: `Non-Compliance with Court Order - ${daysOverdue} Days Overdue: CRITICAL`,
        severity: "CRITICAL",
        winProbability: 85,
        
        whyThisMatters: `The opponent has failed to comply with a court order for ${daysOverdue} days. This is a serious breach that can lead to enforcement action, committal, or costs sanctions. Non-compliance with court orders is taken very seriously by the family court.`,
        
        legalBasis: "Family Procedure Rules 2010 - Enforcement powers. Non-compliance with court orders can lead to enforcement, committal, or costs sanctions.",
        
        caseLaw: [
          "FPR 2010 - Enforcement powers",
          "Case law on non-compliance with family court orders",
        ],
        
        opponentWeakness: "The opponent has failed to comply with a court order. This demonstrates a lack of respect for the court and creates significant leverage for enforcement action.",
        
        howToExploit: `Step 1: Document order and compliance deadline. Step 2: Document non-compliance (${daysOverdue} days overdue). Step 3: Apply for enforcement (penal notice, committal). Step 4: Request costs on indemnity basis. Step 5: Use non-compliance to strengthen your position in the case.`,
        
        specificArguments: [
          `Your Honour, the opponent has failed to comply with the court order dated ${input.orderDate?.toLocaleDateString("en-GB") || "unknown"}. The compliance deadline was ${input.orderComplianceDeadline.toLocaleDateString("en-GB")} and the opponent is now ${daysOverdue} days overdue. This is a serious breach that warrants enforcement action.`,
          `Your Honour, I apply for enforcement of the order, including a penal notice and, if necessary, committal proceedings. I also request costs on an indemnity basis.`,
        ],
        
        crossExaminationPoints: [
          "Opponent, are you aware of the court order?",
          "Opponent, why have you failed to comply?",
          "Opponent, do you accept that non-compliance is a serious matter?",
        ],
        
        submissions: [
          "I submit that the opponent's non-compliance warrants enforcement action, including a penal notice and, if necessary, committal.",
          "I submit that costs should be awarded on an indemnity basis given the serious nature of the breach.",
        ],
        
        ifSuccessful: "Enforcement order granted. Penal notice served. Potential committal. Costs on indemnity basis. Strong position in case.",
        
        ifUnsuccessful: "Still creates pressure. Opponent aware of potential consequences. Strong position.",
        
        combinedWith: ["COMMITTAL_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Court order",
          "Compliance deadline",
          "Evidence of non-compliance",
        ],
        
        disclosureRequests: [],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // LATE APPLICATION
  if (input.hasApplication && input.applicationFiledDate && input.applicationDeadlineDate) {
    const daysLate = Math.floor(
      (input.applicationFiledDate.getTime() - input.applicationDeadlineDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLate > 0) {
      angles.push({
        id: `angle-late-application-${input.caseId}`,
        angleType: "LATE_APPLICATION_ATTACK",
        title: `Late Application - Filed ${daysLate} Days Late`,
        severity: "HIGH",
        winProbability: 75,
        
        whyThisMatters: `The opponent's application was filed ${daysLate} days late without permission. This is a procedural failure that can lead to the application being struck out. Late applications without permission are not tolerated in family law.`,
        
        legalBasis: "Family Procedure Rules 2010, FPR 4.4 - Strike out for lateness. Late applications without permission can be struck out.",
        
        caseLaw: [
          "FPR 4.4 - Strike out powers",
          "Case law on late applications in family law",
        ],
        
        opponentWeakness: "The opponent's application is late without permission. This demonstrates a lack of respect for procedural requirements and creates leverage for strike-out.",
        
        howToExploit: `Step 1: Identify late application (${daysLate} days late). Step 2: Check if permission was sought/granted. Step 3: If no permission, apply to strike out under FPR 4.4. Step 4: Request costs. Step 5: Argue that lateness demonstrates lack of respect for court.`,
        
        specificArguments: [
          `Your Honour, the opponent's application was filed ${daysLate} days late without permission. This is a procedural failure that warrants strike-out under FPR 4.4. I apply to strike out the application.`,
        ],
        
        crossExaminationPoints: [],
        
        submissions: [
          "I submit that the late application should be struck out under FPR 4.4.",
        ],
        
        ifSuccessful: "Application struck out. Costs awarded. Opponent's case dismissed.",
        
        ifUnsuccessful: "Still creates pressure. Opponent forced to explain lateness.",
        
        combinedWith: ["STRIKE_OUT_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Application document",
          "Application deadline",
          "Application filed date",
          "Permission (or lack thereof)",
        ],
        
        disclosureRequests: [],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // DEFECTIVE APPLICATION
  if (input.hasApplication) {
    angles.push({
      id: `angle-defective-application-${input.caseId}`,
      angleType: "DEFECTIVE_APPLICATION_ATTACK",
      title: "Defective Application - Lacks Required Information",
      severity: "HIGH",
      winProbability: 70,
      
      whyThisMatters: "If opponent's application is defective (e.g., lacks required information, fails to address key points), can apply to strike out. Defective applications are not tolerated in family law.",
      
      legalBasis: "Family Procedure Rules 2010, FPR 4.4 - Strike out defective applications. Applications must contain required information.",
      
      caseLaw: [
        "FPR 4.4 - Strike out powers",
        "Case law on defective applications",
      ],
      
      opponentWeakness: "The opponent's application is defective (lacks required information). This creates leverage for strike-out.",
      
      howToExploit: `Step 1: Analyze application for defects (lacks required information, fails to address key points). Step 2: Apply to strike out under FPR 4.4. Step 3: Request costs. Step 4: Argue that defects demonstrate lack of preparation.`,
      
      specificArguments: [
        "Your Honour, the opponent's application is defective. It lacks required information and fails to address key points. I apply to strike out the application under FPR 4.4.",
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "I submit that the defective application should be struck out under FPR 4.4.",
      ],
      
      ifSuccessful: "Application struck out. Costs awarded.",
      
      ifUnsuccessful: "Still creates pressure. Opponent forced to provide required information.",
      
      combinedWith: ["STRIKE_OUT_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
      
      evidenceNeeded: [
        "Application document",
        "Required information checklist",
        "Evidence of defects",
      ],
      
      disclosureRequests: [],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * DISCLOSURE ATTACK ANGLES
 * Challenge opponent's disclosure
 */

function findDisclosureAttackAngles(input: FamilyDefenseInput): FamilyDefenseAngle[] {
  const angles: FamilyDefenseAngle[] = [];

  // NON-DISCLOSURE
  if (input.hasDisclosure === false || (input.hasDisclosure && input.disclosureComplete === false)) {
    angles.push({
      id: `angle-non-disclosure-${input.caseId}`,
      angleType: "NON_DISCLOSURE_ATTACK",
      title: "Non-Disclosure - Opponent Has Not Disclosed",
      severity: "CRITICAL",
      winProbability: 80,
      
      whyThisMatters: "In family law, non-disclosure is extremely serious. If opponent has not disclosed required information (financial, children, etc.), can apply for adverse inference, set aside orders, or costs sanctions. Non-disclosure can lead to orders being set aside.",
      
      legalBasis: "Family Procedure Rules 2010, FPR 9.26 - Non-disclosure. Non-disclosure can lead to adverse inference, set aside orders, or costs sanctions.",
      
      caseLaw: [
        "FPR 9.26 - Non-disclosure",
        "Case law on non-disclosure in family law",
        "Sharland v Sharland [2015] - Set aside for non-disclosure",
      ],
      
      opponentWeakness: "The opponent has failed to disclose required information. This is extremely serious in family law and can lead to orders being set aside. This demonstrates a lack of honesty and creates significant leverage.",
      
      howToExploit: `Step 1: Identify non-disclosure (financial, children, etc.). Step 2: Apply for adverse inference. Step 3: Request set aside of orders based on non-disclosure. Step 4: Request costs on indemnity basis. Step 5: Use non-disclosure to strengthen your position.`,
      
      specificArguments: [
        "Your Honour, the opponent has failed to disclose required information. This is a serious breach of FPR 9.26. I apply for adverse inference and, if appropriate, set aside of orders based on non-disclosure.",
        "Your Honour, non-disclosure is extremely serious in family law. I submit that orders should be set aside and costs awarded on an indemnity basis.",
      ],
      
      crossExaminationPoints: [
        "Opponent, have you disclosed all required information?",
        "Opponent, why have you failed to disclose?",
        "Opponent, are you aware that non-disclosure can lead to orders being set aside?",
      ],
      
      submissions: [
        "I submit that the opponent's non-disclosure warrants adverse inference and, if appropriate, set aside of orders.",
        "I submit that costs should be awarded on an indemnity basis given the serious nature of the breach.",
      ],
      
      ifSuccessful: "Adverse inference drawn. Orders set aside. Costs on indemnity basis. Strong position in case.",
      
      ifUnsuccessful: "Still creates pressure. Opponent aware of potential consequences. Strong position.",
      
      combinedWith: ["INCOMPLETE_DISCLOSURE_ATTACK", "COSTS_SANCTION_OPPORTUNITY"],
      
      evidenceNeeded: [
        "Disclosure requirements",
        "Evidence of non-disclosure",
        "Orders based on non-disclosure",
      ],
      
      disclosureRequests: [
        "Full disclosure as required by FPR",
        "All financial information",
        "All information about children",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  // INCOMPLETE DISCLOSURE
  if (input.hasDisclosure && input.disclosureComplete === false && input.disclosureDeadline) {
    const now = Date.now();
    const daysOverdue = Math.floor(
      (now - input.disclosureDeadline.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue > 0) {
      angles.push({
        id: `angle-incomplete-disclosure-${input.caseId}`,
        angleType: "INCOMPLETE_DISCLOSURE_ATTACK",
        title: `Incomplete Disclosure - ${daysOverdue} Days Overdue`,
        severity: "HIGH",
        winProbability: 75,
        
        whyThisMatters: `The opponent's disclosure is incomplete and ${daysOverdue} days overdue. Incomplete disclosure can lead to adverse inference or further disclosure orders. This creates leverage and pressure.`,
        
        legalBasis: "Family Procedure Rules 2010, FPR 9.26 - Disclosure requirements. Incomplete disclosure can lead to adverse inference or further disclosure orders.",
        
        caseLaw: [
          "FPR 9.26 - Disclosure requirements",
          "Case law on incomplete disclosure",
        ],
        
        opponentWeakness: "The opponent's disclosure is incomplete. This suggests they may be hiding information and creates leverage for adverse inference or further disclosure orders.",
        
        howToExploit: `Step 1: Identify gaps in disclosure. Step 2: Document ${daysOverdue} days overdue. Step 3: Apply for further disclosure. Step 4: If refused, apply for adverse inference. Step 5: Request costs.`,
        
        specificArguments: [
          `Your Honour, the opponent's disclosure is incomplete and ${daysOverdue} days overdue. I apply for further disclosure or, if refused, adverse inference.`,
        ],
        
        crossExaminationPoints: [
          "Opponent, your disclosure is incomplete. What information is missing?",
          "Opponent, why have you failed to provide complete disclosure?",
        ],
        
        submissions: [
          "I submit that the incomplete disclosure warrants further disclosure or adverse inference.",
        ],
        
        ifSuccessful: "Further disclosure ordered. Adverse inference drawn if refused. Costs awarded.",
        
        ifUnsuccessful: "Still creates pressure. Opponent forced to provide complete disclosure.",
        
        combinedWith: ["NON_DISCLOSURE_ATTACK", "COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Disclosure requirements",
          "Evidence of gaps",
          "Disclosure deadline",
        ],
        
        disclosureRequests: [
          "Complete disclosure as required",
          "All missing information",
        ],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  return angles;
}

/**
 * EVIDENCE ATTACK ANGLES
 * Challenge opponent's evidence
 */

function findEvidenceAttackAngles(input: FamilyDefenseInput): FamilyDefenseAngle[] {
  const angles: FamilyDefenseAngle[] = [];

  // CONTRADICTORY EVIDENCE
  angles.push({
    id: `angle-contradiction-${input.caseId}`,
    angleType: "CONTRADICTION_EXPLOITATION",
    title: "Contradictory Evidence - Opponent's Case Unreliable",
    severity: "MEDIUM",
    winProbability: 65,
    
    whyThisMatters: "If opponent's evidence contradicts (e.g., says one thing in statement, another in application), this destroys credibility. Contradictory evidence is unreliable and should not be relied upon.",
    
    legalBasis: "Contradictory evidence is unreliable. Creates reasonable doubt. Court cannot rely on contradictory evidence.",
    
    caseLaw: [
      "Case law on contradictory evidence in family law",
    ],
    
    opponentWeakness: "The opponent's evidence contradicts itself. This demonstrates unreliability and destroys credibility.",
    
    howToExploit: `Step 1: Identify contradictions in opponent's evidence (statement vs application, etc.). Step 2: Cross-examine on contradictions. Step 3: Argue that contradictions show unreliability. Step 4: Submit that no reasonable court could rely on contradictory evidence.`,
    
    specificArguments: [
      "Your Honour, the opponent's evidence contradicts itself. The statement says X, but the application says Y. This demonstrates unreliability and destroys credibility.",
    ],
    
    crossExaminationPoints: [
      "Opponent, your statement says X. But your application says Y. Which is correct?",
      "Opponent, how do you explain this contradiction?",
      "Opponent, does this contradiction suggest your evidence is unreliable?",
    ],
    
    submissions: [
      "I submit that the contradictory evidence is unreliable and should not be relied upon.",
    ],
    
    ifSuccessful: "Opponent's evidence discredited. Stronger case. Increased chances of success.",
    
    ifUnsuccessful: "Still creates doubt. Opponent's credibility damaged.",
    
    combinedWith: ["WEAK_EVIDENCE_ATTACK"],
    
    evidenceNeeded: [
      "Opponent's evidence (statements, applications)",
      "Contradictory evidence",
      "Documentation of contradictions",
    ],
    
    disclosureRequests: [
      "All opponent's evidence",
      "All statements",
      "All applications",
    ],
    
    createdAt: new Date().toISOString(),
  });

  // WEAK EVIDENCE
  angles.push({
    id: `angle-weak-evidence-${input.caseId}`,
    angleType: "WEAK_EVIDENCE_ATTACK",
    title: "Weak Evidence - Opponent's Evidence Lacks Detail",
    severity: "MEDIUM",
    winProbability: 60,
    
    whyThisMatters: "If opponent's evidence is weak (e.g., lacks detail, based on assumptions), can challenge weight. Weak evidence should not be relied upon and can be given little weight.",
    
    legalBasis: "Weak evidence (lacking detail, based on assumptions) should be given little weight. Court cannot rely on weak evidence.",
    
    caseLaw: [
      "Case law on weak evidence in family law",
    ],
    
    opponentWeakness: "The opponent's evidence is weak (lacks detail, based on assumptions). This demonstrates unreliability and should be given little weight.",
    
    howToExploit: `Step 1: Analyze evidence for weaknesses (lacks detail, based on assumptions, vague). Step 2: Challenge weight. Step 3: Argue that weak evidence should not be relied upon. Step 4: Submit that weak evidence should be given little weight.`,
    
    specificArguments: [
      "Your Honour, the opponent's evidence is weak. It lacks detail, is based on assumptions, and is vague. I submit that this evidence should be given little weight.",
    ],
    
    crossExaminationPoints: [
      "Opponent, your evidence lacks detail. Can you provide more information?",
      "Opponent, your conclusions are based on assumptions. Can you provide evidence?",
      "Opponent, your evidence is vague. Can you be more specific?",
    ],
    
    submissions: [
      "I submit that the weak evidence should be given little weight.",
    ],
    
    ifSuccessful: "Evidence given little weight. Opponent's case weakened. Stronger position.",
    
    ifUnsuccessful: "Still creates doubt. Opponent's credibility damaged.",
    
    combinedWith: ["CONTRADICTION_EXPLOITATION"],
    
    evidenceNeeded: [
      "Opponent's evidence",
      "Analysis of weaknesses",
    ],
    
    disclosureRequests: [
      "All opponent's evidence",
      "All supporting documents",
    ],
    
    createdAt: new Date().toISOString(),
  });

  return angles;
}

/**
 * ENFORCEMENT ATTACK ANGLES
 * Enforce compliance
 */

function findEnforcementAttackAngles(input: FamilyDefenseInput): FamilyDefenseAngle[] {
  const angles: FamilyDefenseAngle[] = [];

  // ENFORCEMENT OPPORTUNITY
  if (input.hasOrder && input.orderCompliedWith === false) {
    angles.push({
      id: `angle-enforcement-${input.caseId}`,
      angleType: "ENFORCEMENT_OPPORTUNITY",
      title: "Enforcement Opportunity - Opponent Non-Compliance",
      severity: "HIGH",
      winProbability: 75,
      
      whyThisMatters: "If opponent has failed to comply with a court order, can apply for enforcement (penal notice, committal). Enforcement creates significant pressure and can lead to committal if non-compliance continues.",
      
      legalBasis: "Family Procedure Rules 2010 - Enforcement powers. Non-compliance with court orders can lead to enforcement, penal notice, or committal.",
      
      caseLaw: [
        "FPR 2010 - Enforcement powers",
        "Case law on enforcement in family law",
      ],
      
      opponentWeakness: "The opponent has failed to comply with a court order. This creates significant leverage for enforcement action.",
      
      howToExploit: `Step 1: Document order and non-compliance. Step 2: Apply for enforcement (penal notice). Step 3: If non-compliance continues, apply for committal. Step 4: Request costs. Step 5: Use enforcement to strengthen your position.`,
      
      specificArguments: [
        "Your Honour, the opponent has failed to comply with the court order. I apply for enforcement, including a penal notice and, if necessary, committal proceedings.",
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "I submit that the opponent's non-compliance warrants enforcement action, including a penal notice and, if necessary, committal.",
      ],
      
      ifSuccessful: "Enforcement order granted. Penal notice served. Potential committal. Costs awarded. Strong position.",
      
      ifUnsuccessful: "Still creates pressure. Opponent aware of potential consequences.",
      
      combinedWith: ["COMMITTAL_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
      
      evidenceNeeded: [
        "Court order",
        "Evidence of non-compliance",
      ],
      
      disclosureRequests: [],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * Calculate overall win probability
 */
function calculateOverallWinProbability(angles: FamilyDefenseAngle[]): number {
  if (angles.length === 0) return 50;

  const bestAngle = angles[0];
  let probability = bestAngle.winProbability;

  const strongAngles = angles.filter(a => a.winProbability >= 70);
  if (strongAngles.length >= 2) {
    probability += 10;
  }
  if (strongAngles.length >= 3) {
    probability += 5;
  }

  return Math.min(95, probability);
}

/**
 * Build recommended strategy
 */
function buildRecommendedStrategy(angles: FamilyDefenseAngle[]): {
  primaryAngle: FamilyDefenseAngle;
  supportingAngles: FamilyDefenseAngle[];
  combinedProbability: number;
  tacticalPlan: string[];
} {
  if (angles.length === 0) {
    throw new Error("No defense angles found");
  }

  const primaryAngle = angles[0];
  const supportingAngles = angles.slice(1, 4).filter(a => 
    primaryAngle.combinedWith.includes(a.angleType) || 
    a.winProbability >= 60
  );

  const tacticalPlan: string[] = [
    `Primary Strategy: ${primaryAngle.title}`,
    `Win Probability: ${primaryAngle.winProbability}%`,
    ``,
    ...primaryAngle.howToExploit.split('\n').filter(line => line.trim()),
    ``,
    `Key Arguments:`,
    ...primaryAngle.specificArguments.slice(0, 2).map(arg => `- ${arg}`),
    ``,
    `Cross-Examination Points:`,
    ...primaryAngle.crossExaminationPoints.slice(0, 3).map(q => `- ${q}`),
  ];

  if (supportingAngles.length > 0) {
    tacticalPlan.push(``, `Supporting Strategies:`);
    supportingAngles.forEach(angle => {
      tacticalPlan.push(`- ${angle.title} (${angle.winProbability}% win chance)`);
    });
  }

  const combinedProbability = calculateCombinedProbability(primaryAngle, supportingAngles);

  return {
    primaryAngle,
    supportingAngles,
    combinedProbability,
    tacticalPlan,
  };
}

function calculateCombinedProbability(
  primary: FamilyDefenseAngle,
  supporting: FamilyDefenseAngle[]
): number {
  let probability = primary.winProbability;

  if (supporting.length > 0) {
    const avgSupporting = supporting.reduce((sum, a) => sum + a.winProbability, 0) / supporting.length;
    const fallbackChance = (100 - primary.winProbability) / 100 * avgSupporting / 100 * 100;
    probability = primary.winProbability + fallbackChance * 0.3;
  }

  return Math.min(95, Math.round(probability));
}

/**
 * Identify opponent vulnerabilities
 */
function identifyOpponentVulnerabilities(
  input: FamilyDefenseInput,
  angles: FamilyDefenseAngle[]
): {
  criticalWeaknesses: string[];
  evidenceGaps: string[];
  proceduralErrors: string[];
} {
  const criticalWeaknesses: string[] = [];
  const evidenceGaps: string[] = [];
  const proceduralErrors: string[] = [];

  angles.forEach(angle => {
    if (angle.severity === "CRITICAL") {
      criticalWeaknesses.push(angle.opponentWeakness);
    }

    if (angle.angleType.includes("DISCLOSURE") || angle.angleType.includes("EVIDENCE")) {
      evidenceGaps.push(angle.title);
    }

    if (angle.angleType.includes("PROCEDURAL") || angle.angleType.includes("LATE") || angle.angleType.includes("DEFECTIVE") || angle.angleType.includes("NON_COMPLIANCE")) {
      proceduralErrors.push(angle.title);
    }
  });

  return {
    criticalWeaknesses: [...new Set(criticalWeaknesses)],
    evidenceGaps: [...new Set(evidenceGaps)],
    proceduralErrors: [...new Set(proceduralErrors)],
  };
}

