/**
 * Aggressive PI / Clinical Negligence Defense Engine
 * 
 * "Case Beater" system - finds EVERY possible angle to win a PI/Clinical Neg case.
 * Designed for cases "hanging on a thread" - leaves no stone unturned.
 * 
 * This is aggressive, tactical, and sophisticated defense strategy for claimants.
 */

import "server-only";
import type { PiCaseRecord, PiMedicalReport, PiOffer } from "@/types/pi";

export type PiDefenseAngle = {
  id: string;
  angleType: 
    | "LATE_RESPONSE_ATTACK"
    | "DEFECTIVE_DEFENSE_ATTACK"
    | "MISSING_PRE_ACTION_ATTACK"
    | "EXPERT_CONTRADICTION_ATTACK"
    | "WEAK_EXPERT_ATTACK"
    | "CAUSATION_GAP_ATTACK"
    | "ALTERNATIVE_CAUSATION_DEFENSE"
    | "PART_36_PRESSURE"
    | "FUTURE_LOSS_MAXIMIZATION"
    | "DISCLOSURE_FAILURE_ATTACK"
    | "UNLESS_ORDER_OPPORTUNITY"
    | "STRIKE_OUT_OPPORTUNITY"
    | "COSTS_SANCTION_OPPORTUNITY";
  
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

export type PiAggressiveDefenseAnalysis = {
  caseId: string;
  overallWinProbability: number;
  criticalAngles: PiDefenseAngle[];
  allAngles: PiDefenseAngle[];
  recommendedStrategy: {
    primaryAngle: PiDefenseAngle;
    supportingAngles: PiDefenseAngle[];
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

type PiDefenseInput = {
  caseId: string;
  piCase: PiCaseRecord;
  medicalReports: PiMedicalReport[];
  offers: PiOffer[];
  opponentLastResponseDate: Date | null;
  hasCNF: boolean;
  cnfSentDate: Date | null;
  cnfResponseDeadline: Date | null;
  hasDefense: boolean;
  defenseFiledDate: Date | null;
  defenseDeadlineDate: Date | null;
  hasPart36Offer: boolean;
  part36OfferDate: Date | null;
  part36OfferAmount: number | null;
};

/**
 * Main function: Find EVERY possible defense angle for PI/Clinical Neg
 */
export async function findAllPiDefenseAngles(
  input: PiDefenseInput,
): Promise<PiAggressiveDefenseAnalysis> {
  const allAngles: PiDefenseAngle[] = [];
  const now = new Date().toISOString();

  // 1. PROCEDURAL ATTACKS - Opponent mistakes create leverage
  const proceduralAngles = findProceduralAttackAngles(input);
  allAngles.push(...proceduralAngles);

  // 2. EXPERT ATTACKS - Challenge opponent's expert evidence
  const expertAngles = findExpertAttackAngles(input);
  allAngles.push(...expertAngles);

  // 3. CAUSATION ATTACKS - Challenge causation arguments
  const causationAngles = findCausationAttackAngles(input);
  allAngles.push(...causationAngles);

  // 4. QUANTUM ATTACKS - Maximize damages
  const quantumAngles = findQuantumAttackAngles(input);
  allAngles.push(...quantumAngles);

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

function findProceduralAttackAngles(input: PiDefenseInput): PiDefenseAngle[] {
  const angles: PiDefenseAngle[] = [];
  const now = Date.now();

  // LATE RESPONSE / NON-COMPLIANCE
  if (input.opponentLastResponseDate) {
    const daysSinceResponse = Math.floor(
      (now - input.opponentLastResponseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceResponse > 21) {
      angles.push({
        id: `angle-late-response-${input.caseId}`,
        angleType: "LATE_RESPONSE_ATTACK",
        title: `Opponent Non-Compliance - ${daysSinceResponse} Days Since Last Response`,
        severity: daysSinceResponse > 42 ? "CRITICAL" : "HIGH",
        winProbability: daysSinceResponse > 42 ? 75 : 70,
        
        whyThisMatters: `The opponent has not responded for ${daysSinceResponse} days. If they fail to respond to CNF or defense within deadline, can apply for unless order or strike-out. This is a procedural failure that creates significant leverage.`,
        
        legalBasis: "CPR 3.4(2)(c) - Strike out for non-compliance. CPR 15.5 - Defense deadline. Pre-Action Protocol for PI - Response deadline (21 days).",
        
        caseLaw: [
          "CPR 3.4 - Strike out powers",
          "CPR 15.5 - Defense deadlines",
          "Pre-Action Protocol for Personal Injury Claims",
        ],
        
        opponentWeakness: "The opponent has failed to comply with procedural requirements. This demonstrates a lack of engagement and creates leverage for unless orders or strike-out.",
        
        howToExploit: `Step 1: Document exact deadline (21 days for CNF response, 28 days for defense). Step 2: Document that ${daysSinceResponse} days have passed. Step 3: If missed deadline, immediately apply for unless order. Step 4: If still no response, apply for strike-out. Step 5: Request costs on indemnity basis.`,
        
        specificArguments: [
          `Your Honour, the defendant has failed to respond for ${daysSinceResponse} days. This is a procedural failure that warrants an unless order. I apply for an unless order requiring response within 7 days, failing which the defense should be struck out.`,
        ],
        
        crossExaminationPoints: [],
        
        submissions: [
          "I submit that the defendant's non-compliance warrants an unless order or strike-out.",
        ],
        
        ifSuccessful: "Unless order granted. Defense struck out if non-compliance continues. Costs on indemnity basis. Judgment in default.",
        
        ifUnsuccessful: "Still creates pressure. Opponent forced to respond or face consequences.",
        
        combinedWith: ["STRIKE_OUT_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Last response date",
          "Deadline date",
          "Evidence of non-compliance",
        ],
        
        disclosureRequests: [],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // DEFECTIVE DEFENSE
  if (input.hasDefense && input.defenseFiledDate && input.defenseDeadlineDate) {
    const daysLate = Math.floor(
      (input.defenseFiledDate.getTime() - input.defenseDeadlineDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLate > 0) {
      angles.push({
        id: `angle-defective-defense-${input.caseId}`,
        angleType: "DEFECTIVE_DEFENSE_ATTACK",
        title: `Defective Defense - Filed ${daysLate} Days Late`,
        severity: "HIGH",
        winProbability: 70,
        
        whyThisMatters: `The defense was filed ${daysLate} days late. Additionally, if the defense is vague, lacks particulars, or fails to address key points (liability, causation, quantum), can apply to strike out or for further information.`,
        
        legalBasis: "CPR 3.4(2)(a) - Strike out defective statements. CPR 18 - Further information. CPR 15.5 - Defense deadline.",
        
        caseLaw: [
          "CPR 3.4 - Strike out powers",
          "CPR 18 - Further information",
        ],
        
        opponentWeakness: "The opponent's defense is defective (late and/or vague). This creates leverage for strike-out or further information requests.",
        
        howToExploit: `Step 1: Analyze defense for vagueness, lack of particulars, failure to address key points (liability, causation, quantum). Step 2: Apply for further information under CPR 18. Step 3: If still defective, apply to strike out under CPR 3.4. Step 4: Request costs.`,
        
        specificArguments: [
          `Your Honour, the defense was filed ${daysLate} days late and is defective. It lacks particulars on liability/causation/quantum and fails to address key points. I apply for further information under CPR 18, or alternatively, strike out under CPR 3.4.`,
        ],
        
        crossExaminationPoints: [],
        
        submissions: [
          "I submit that the defense is defective and should be struck out or further information should be ordered.",
        ],
        
        ifSuccessful: "Defense struck out or forced to provide particulars. Costs awarded.",
        
        ifUnsuccessful: "Still creates pressure. Opponent forced to provide particulars.",
        
        combinedWith: ["STRIKE_OUT_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Defense document",
          "Defense deadline",
          "Defense filed date",
        ],
        
        disclosureRequests: [],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // MISSING PRE-ACTION PROTOCOL
  if (input.hasCNF && input.cnfSentDate && input.cnfResponseDeadline) {
    const nowDate = new Date();
    if (nowDate > input.cnfResponseDeadline) {
      const daysOverdue = Math.floor(
        (nowDate.getTime() - input.cnfResponseDeadline.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOverdue > 0) {
        angles.push({
          id: `angle-missing-pre-action-${input.caseId}`,
          angleType: "MISSING_PRE_ACTION_ATTACK",
          title: `Missing Pre-Action Protocol Compliance - ${daysOverdue} Days Overdue`,
          severity: "MEDIUM",
          winProbability: 65,
          
          whyThisMatters: `The defendant failed to respond to CNF within 21 days (now ${daysOverdue} days overdue). This is a breach of Pre-Action Protocol and can justify costs sanctions. This creates pressure to settle.`,
          
          legalBasis: "Pre-Action Protocol for Personal Injury Claims, CPR 44.2 - Costs sanctions.",
          
          caseLaw: [
            "Pre-Action Protocol for Personal Injury Claims",
            "CPR 44.2 - Costs sanctions",
          ],
          
          opponentWeakness: "The opponent has failed to comply with pre-action protocol. This demonstrates a lack of engagement and justifies costs sanctions.",
          
          howToExploit: `Step 1: Document CNF sent on ${input.cnfSentDate.toLocaleDateString("en-GB")}. Step 2: Document deadline (21 days = ${input.cnfResponseDeadline.toLocaleDateString("en-GB")}). Step 3: Document ${daysOverdue} days overdue. Step 4: Apply for costs sanctions (indemnity basis, or increased costs). Step 5: Use in settlement negotiations.`,
          
          specificArguments: [
            `Your Honour, the defendant has failed to comply with the Pre-Action Protocol for Personal Injury Claims. The CNF was sent on ${input.cnfSentDate.toLocaleDateString("en-GB")} with a 21-day response deadline. The defendant is now ${daysOverdue} days overdue. This justifies costs sanctions on an indemnity basis.`,
          ],
          
          crossExaminationPoints: [],
          
          submissions: [
            "I submit that the defendant's failure to comply with pre-action protocol justifies costs sanctions.",
          ],
          
          ifSuccessful: "Costs sanctions awarded. Pressure to settle increased.",
          
          ifUnsuccessful: "Still creates pressure. Opponent aware of potential costs consequences.",
          
          combinedWith: ["COSTS_SANCTION_OPPORTUNITY"],
          
          evidenceNeeded: [
            "CNF document",
            "CNF sent date",
            "CNF response deadline",
            "Opponent's response (or lack thereof)",
          ],
          
          disclosureRequests: [],
          
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return angles;
}

/**
 * EXPERT ATTACK ANGLES
 * Challenge opponent's expert evidence
 */

function findExpertAttackAngles(input: PiDefenseInput): PiDefenseAngle[] {
  const angles: PiDefenseAngle[] = [];

  // Check for expert contradictions
  // If we have multiple medical reports, check for contradictions
  if (input.medicalReports.length > 1) {
    const hasContradictions = input.medicalReports.some((r1, i) =>
      input.medicalReports.slice(i + 1).some(r2 => 
        r1.specialism === r2.specialism &&
        r1.notes && r2.notes &&
        r1.notes.toLowerCase() !== r2.notes.toLowerCase()
      )
    );

    if (hasContradictions) {
      angles.push({
        id: `angle-expert-contradiction-${input.caseId}`,
        angleType: "EXPERT_CONTRADICTION_ATTACK",
        title: "Expert Contradictions - Opponent's Expert Evidence Unreliable",
        severity: "HIGH",
        winProbability: 75,
        
        whyThisMatters: "If defendant's expert contradicts defendant's own evidence or other experts, this destroys credibility. Expert contradictions are a powerful attack that can discredit the opponent's entire case.",
        
        legalBasis: "CPR 35 - Expert evidence. Contradictory expert evidence is unreliable. Court cannot rely on contradictory evidence.",
        
        caseLaw: [
          "CPR 35 - Expert evidence",
          "Case law on contradictory expert evidence",
        ],
        
        opponentWeakness: "The opponent's expert evidence contradicts itself or other experts. This demonstrates unreliability and destroys credibility.",
        
        howToExploit: `Step 1: Identify contradictions between experts (same specialism, different conclusions). Step 2: Cross-examine on contradictions. Step 3: Argue that contradictions show unreliability. Step 4: Request that contradictory evidence be excluded or given little weight.`,
        
        specificArguments: [
          "Your Honour, the defendant's expert evidence contradicts itself. Expert A says X, but Expert B says Y. This demonstrates unreliability and destroys credibility. I submit that the contradictory evidence should be excluded or given little weight.",
        ],
        
        crossExaminationPoints: [
          "Expert, your report says X. But Expert B's report says Y. Which is correct?",
          "Expert, how do you explain this contradiction?",
          "Expert, does this contradiction suggest your evidence is unreliable?",
        ],
        
        submissions: [
          "I submit that the contradictory expert evidence is unreliable and should be excluded or given little weight.",
        ],
        
        ifSuccessful: "Expert evidence discredited. Opponent's case weakened significantly. Stronger position for settlement or trial.",
        
        ifUnsuccessful: "Still creates doubt. Opponent's expert credibility damaged.",
        
        combinedWith: ["WEAK_EXPERT_ATTACK"],
        
        evidenceNeeded: [
          "All expert reports",
          "Documentation of contradictions",
        ],
        
        disclosureRequests: [
          "All expert reports",
          "All expert correspondence",
        ],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // WEAK EXPERT EVIDENCE
  // Check if any expert reports lack reasoning or are based on assumptions
  const weakReports = input.medicalReports.filter(r => 
    !r.notes || 
    r.notes.length < 100 || 
    r.notes.toLowerCase().includes("assume") ||
    r.notes.toLowerCase().includes("possibly") ||
    r.notes.toLowerCase().includes("may")
  );

  if (weakReports.length > 0) {
    angles.push({
      id: `angle-weak-expert-${input.caseId}`,
      angleType: "WEAK_EXPERT_ATTACK",
      title: "Weak Expert Evidence - Opponent's Expert Report Lacks Reasoning",
      severity: "HIGH",
      winProbability: 70,
      
      whyThisMatters: "If defendant's expert report is weak (e.g., lacks reasoning, based on assumptions, vague conclusions), can challenge admissibility or weight under CPR 35. Weak expert evidence is unreliable and should be given little weight.",
      
      legalBasis: "CPR 35 - Expert evidence must be reasoned. Weak expert evidence (lacking reasoning, based on assumptions) can be excluded or given little weight.",
      
      caseLaw: [
        "CPR 35 - Expert evidence requirements",
        "Case law on weak expert evidence",
      ],
      
      opponentWeakness: "The opponent's expert evidence is weak (lacks reasoning, based on assumptions). This demonstrates unreliability and should be given little weight.",
      
      howToExploit: `Step 1: Analyze expert report for weaknesses (lacks reasoning, based on assumptions, vague conclusions). Step 2: Challenge admissibility under CPR 35. Step 3: If admitted, challenge weight. Step 4: Argue that weak evidence should not be relied upon.`,
      
      specificArguments: [
        "Your Honour, the defendant's expert report is weak. It lacks reasoning, is based on assumptions, and contains vague conclusions. Under CPR 35, expert evidence must be reasoned. I submit that this evidence should be excluded or given little weight.",
      ],
      
      crossExaminationPoints: [
        "Expert, your report lacks detailed reasoning. Can you explain your methodology?",
        "Expert, your conclusions are based on assumptions. Can you provide evidence?",
        "Expert, your report is vague. Can you be more specific?",
      ],
      
      submissions: [
        "I submit that the expert evidence is weak and should be excluded or given little weight.",
      ],
      
      ifSuccessful: "Expert evidence excluded or given little weight. Opponent's case weakened. Stronger position.",
      
      ifUnsuccessful: "Still creates doubt. Opponent's expert credibility damaged.",
      
      combinedWith: ["EXPERT_CONTRADICTION_ATTACK"],
      
      evidenceNeeded: [
        "Expert report",
        "Analysis of weaknesses",
      ],
      
      disclosureRequests: [
        "Full expert report",
        "Expert's methodology",
        "Expert's reasoning",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * CAUSATION ATTACK ANGLES
 * Challenge causation arguments
 */

function findCausationAttackAngles(input: PiDefenseInput): PiDefenseAngle[] {
  const angles: PiDefenseAngle[] = [];

  // CAUSATION GAPS
  // If defendant denies causation but cannot explain how injury occurred, can challenge
  if (input.piCase.liability_stance === "denied" || input.piCase.liability_stance === "partial") {
    angles.push({
      id: `angle-causation-gap-${input.caseId}`,
      angleType: "CAUSATION_GAP_ATTACK",
      title: "Causation Gaps - Defendant Cannot Establish Alternative Causation",
      severity: "HIGH",
      winProbability: 65,
      
      whyThisMatters: "If defendant denies causation but cannot establish how the injury occurred (e.g., no alternative cause identified), can challenge causation. Causation gaps create reasonable doubt and strengthen the case.",
      
      legalBasis: "Defendant must establish causation or alternative causation. If defendant cannot explain how injury occurred, causation is established. Causation gaps create reasonable doubt.",
      
      caseLaw: [
        "Case law on causation in PI claims",
        "Case law on alternative causation",
      ],
      
      opponentWeakness: "The defendant denies causation but cannot establish how the injury occurred. This creates a causation gap that strengthens the claimant's case.",
      
      howToExploit: `Step 1: Identify gaps in causation chain (defendant denies causation but cannot explain how injury occurred). Step 2: Argue that causation is established (no alternative cause). Step 3: Request strike-out of causation arguments. Step 4: Argue that defendant cannot establish alternative causation.`,
      
      specificArguments: [
        "Your Honour, the defendant denies causation but cannot establish how the injury occurred. There is no alternative cause identified. I submit that causation is established and the defendant's causation arguments should be struck out.",
      ],
      
      crossExaminationPoints: [
        "Defendant, you deny causation. How do you explain how the injury occurred?",
        "Defendant, what is your alternative causation theory?",
        "Defendant, can you provide evidence of alternative causation?",
      ],
      
      submissions: [
        "I submit that the defendant cannot establish alternative causation and causation is established.",
      ],
      
      ifSuccessful: "Causation arguments struck out. Causation established. Stronger case.",
      
      ifUnsuccessful: "Still creates doubt. Defendant forced to provide alternative causation theory.",
      
      combinedWith: ["ALTERNATIVE_CAUSATION_DEFENSE"],
      
      evidenceNeeded: [
        "Defendant's causation arguments",
        "Evidence of alternative causes (or lack thereof)",
      ],
      
      disclosureRequests: [
        "All evidence of alternative causation",
        "All expert reports on causation",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * QUANTUM ATTACK ANGLES
 * Maximize damages
 */

function findQuantumAttackAngles(input: PiDefenseInput): PiDefenseAngle[] {
  const angles: PiDefenseAngle[] = [];

  // PART 36 PRESSURE
  if (input.hasPart36Offer && input.part36OfferDate && input.part36OfferAmount) {
    angles.push({
      id: `angle-part36-${input.caseId}`,
      angleType: "PART_36_PRESSURE",
      title: "Part 36 Pressure - Enhanced Costs and Interest",
      severity: "MEDIUM-HIGH",
      winProbability: 70,
      
      whyThisMatters: "If defendant rejects Part 36 offer and claimant beats it at trial, can get enhanced costs and interest. This creates significant pressure to settle and maximizes recovery.",
      
      legalBasis: "CPR 36.17 - Enhanced costs and interest if Part 36 offer beaten at trial.",
      
      caseLaw: [
        "CPR 36.17 - Part 36 consequences",
        "Case law on Part 36 offers",
      ],
      
      opponentWeakness: "The defendant has rejected a Part 36 offer. If the claimant beats it at trial, the defendant faces enhanced costs and interest. This creates significant pressure to settle.",
      
      howToExploit: `Step 1: Make Part 36 offer of £${input.part36OfferAmount.toLocaleString()}. Step 2: If rejected and beaten at trial, apply for enhanced costs under CPR 36.17. Step 3: Request interest on damages and costs. Step 4: Use in settlement negotiations to pressure defendant.`,
      
      specificArguments: [
        `Your Honour, the defendant rejected a Part 36 offer of £${input.part36OfferAmount.toLocaleString()} made on ${input.part36OfferDate.toLocaleDateString("en-GB")}. The claimant has beaten this offer at trial. I apply for enhanced costs and interest under CPR 36.17.`,
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "I submit that the defendant's rejection of the Part 36 offer warrants enhanced costs and interest.",
      ],
      
      ifSuccessful: "Enhanced costs awarded. Interest on damages and costs. Significant pressure to settle.",
      
      ifUnsuccessful: "Still creates pressure. Defendant aware of potential costs consequences.",
      
      combinedWith: ["COSTS_SANCTION_OPPORTUNITY"],
      
      evidenceNeeded: [
        "Part 36 offer document",
        "Part 36 offer date",
        "Part 36 offer amount",
        "Defendant's response (rejection)",
      ],
      
      disclosureRequests: [],
      
      createdAt: new Date().toISOString(),
    });
  }

  // FUTURE LOSS MAXIMIZATION
  if (input.piCase.loss_of_earnings_estimate && input.piCase.loss_of_earnings_estimate > 0) {
    angles.push({
      id: `angle-future-loss-${input.caseId}`,
      angleType: "FUTURE_LOSS_MAXIMIZATION",
      title: "Future Loss Maximization - Maximize Future Loss Claims",
      severity: "MEDIUM",
      winProbability: 65,
      
      whyThisMatters: "Can maximize damages by showing future losses (e.g., future care, loss of earnings, loss of pension). Future losses can significantly increase the total damages award.",
      
      legalBasis: "Future losses are recoverable if established. Future loss multipliers can significantly increase damages.",
      
      caseLaw: [
        "Case law on future losses",
        "Case law on future loss multipliers",
      ],
      
      opponentWeakness: "The claimant has future losses that can be maximized. This increases the total damages award significantly.",
      
      howToExploit: `Step 1: Get expert evidence on future losses (future care, loss of earnings, loss of pension). Step 2: Calculate future loss multipliers. Step 3: Claim maximum future losses. Step 4: Argue that future losses are established and recoverable.`,
      
      specificArguments: [
        "Your Honour, the claimant has established future losses (future care, loss of earnings, loss of pension). I claim future losses of [X] with multipliers of [Y]. These future losses are established and recoverable.",
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "I submit that future losses are established and recoverable.",
      ],
      
      ifSuccessful: "Future losses awarded. Higher total damages. Increased recovery.",
      
      ifUnsuccessful: "Still have strong case for general damages. Future losses are powerful evidence.",
      
      combinedWith: ["PART_36_PRESSURE"],
      
      evidenceNeeded: [
        "Expert evidence on future losses",
        "Future loss calculations",
        "Future loss multipliers",
      ],
      
      disclosureRequests: [
        "All expert reports on future losses",
        "All future loss calculations",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * Calculate overall win probability
 */
function calculateOverallWinProbability(angles: PiDefenseAngle[]): number {
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
function buildRecommendedStrategy(angles: PiDefenseAngle[]): {
  primaryAngle: PiDefenseAngle;
  supportingAngles: PiDefenseAngle[];
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
  primary: PiDefenseAngle,
  supporting: PiDefenseAngle[]
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
  input: PiDefenseInput,
  angles: PiDefenseAngle[]
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

    if (angle.angleType.includes("DISCLOSURE") || angle.angleType.includes("EVIDENCE") || angle.angleType.includes("EXPERT")) {
      evidenceGaps.push(angle.title);
    }

    if (angle.angleType.includes("PROCEDURAL") || angle.angleType.includes("LATE") || angle.angleType.includes("DEFECTIVE")) {
      proceduralErrors.push(angle.title);
    }
  });

  return {
    criticalWeaknesses: [...new Set(criticalWeaknesses)],
    evidenceGaps: [...new Set(evidenceGaps)],
    proceduralErrors: [...new Set(proceduralErrors)],
  };
}

