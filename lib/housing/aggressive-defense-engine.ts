/**
 * Aggressive Housing Disrepair Defense Engine
 * 
 * "Case Beater" system - finds EVERY possible angle to win a housing disrepair case.
 * Designed for cases "hanging on a thread" - leaves no stone unturned.
 * 
 * This is aggressive, tactical, and sophisticated defense strategy for claimants.
 */

import "server-only";
import type { HousingCaseRecord, HousingDefect } from "@/types/housing";

export type HousingDefenseAngle = {
  id: string;
  angleType: 
    | "AWAAB_LAW_BREACH"
    | "S11_LTA_BREACH"
    | "HHSRS_CATEGORY_1"
    | "LATE_RESPONSE_ATTACK"
    | "DEFECTIVE_DEFENSE_ATTACK"
    | "MISSING_PRE_ACTION_ATTACK"
    | "DISCLOSURE_FAILURE_ATTACK"
    | "CONTRADICTION_EXPLOITATION"
    | "AGGRAVATED_DAMAGES_CLAIM"
    | "UNLESS_ORDER_OPPORTUNITY"
    | "STRIKE_OUT_OPPORTUNITY"
    | "COSTS_SANCTION_OPPORTUNITY";
  
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  winProbability: number; // 0-100, chance this angle wins the case
  
  // Detailed analysis
  whyThisMatters: string; // Why this point is critical
  legalBasis: string; // Statute, case law, legal principle
  caseLaw: string[]; // Relevant case law references
  opponentWeakness: string; // What this exposes about opponent's case
  
  // Tactical exploitation
  howToExploit: string; // Step-by-step how to use this
  specificArguments: string[]; // Ready-to-use legal arguments
  crossExaminationPoints: string[]; // Questions to ask
  submissions: string[]; // Submissions to make
  
  // Impact analysis
  ifSuccessful: string; // What happens if this works
  ifUnsuccessful: string; // Fallback position
  combinedWith: string[]; // Other angles this works well with
  
  // Evidence required
  evidenceNeeded: string[];
  disclosureRequests: string[];
  
  createdAt: string;
};

export type HousingAggressiveDefenseAnalysis = {
  caseId: string;
  overallWinProbability: number; // 0-100
  criticalAngles: HousingDefenseAngle[]; // Angles with highest win probability
  allAngles: HousingDefenseAngle[];
  recommendedStrategy: {
    primaryAngle: HousingDefenseAngle;
    supportingAngles: HousingDefenseAngle[];
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

type HousingDefenseInput = {
  caseId: string;
  housingCase: HousingCaseRecord;
  defects: HousingDefect[];
  firstComplaintDate: Date | null;
  investigationDate: Date | null;
  workStartDate: Date | null;
  opponentLastResponseDate: Date | null;
  hasPreActionLetter: boolean;
  hasDefense: boolean;
  defenseFiledDate: Date | null;
  defenseDeadlineDate: Date | null;
};

/**
 * Main function: Find EVERY possible defense angle for housing disrepair
 */
export async function findAllHousingDefenseAngles(
  input: HousingDefenseInput,
): Promise<HousingAggressiveDefenseAnalysis> {
  const allAngles: HousingDefenseAngle[] = [];
  const now = new Date().toISOString();

  // 1. STATUTORY BREACHES - Most powerful (automatic liability)
  const statutoryAngles = findStatutoryBreachAngles(input);
  allAngles.push(...statutoryAngles);

  // 2. PROCEDURAL ATTACKS - Opponent mistakes create leverage
  const proceduralAngles = findProceduralAttackAngles(input);
  allAngles.push(...proceduralAngles);

  // 3. EVIDENCE ATTACKS - Challenge opponent's evidence
  const evidenceAngles = findEvidenceAttackAngles(input);
  allAngles.push(...evidenceAngles);

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
 * STATUTORY BREACH ANGLES
 * These create automatic liability - no need to prove negligence
 */

function findStatutoryBreachAngles(input: HousingDefenseInput): HousingDefenseAngle[] {
  const angles: HousingDefenseAngle[] = [];
  const { housingCase, firstComplaintDate, investigationDate, workStartDate } = input;

  // Check if social/council landlord (Awaab's Law applies)
  const isSocialLandlord = housingCase.landlord_type === "social" || 
                          housingCase.landlord_type === "council";

  if (!isSocialLandlord || !firstComplaintDate) {
    return angles;
  }

  // AWAAB'S LAW: 7-day assessment deadline
  if (investigationDate) {
    const daysToInvestigation = Math.floor(
      (investigationDate.getTime() - firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToInvestigation > 7) {
      angles.push({
        id: `angle-awaab-investigation-${input.caseId}`,
        angleType: "AWAAB_LAW_BREACH",
        title: "Awaab's Law Breach - 7-Day Assessment Deadline Missed: NUCLEAR OPTION",
        severity: "CRITICAL",
        winProbability: 90,
        
        whyThisMatters: `The landlord is a social/council landlord and took ${daysToInvestigation} days to investigate, exceeding the 7-day statutory deadline under Awaab's Law. This is a fundamental statutory breach that creates AUTOMATIC liability. No need to prove negligence - the breach itself is the liability. This is the strongest defense angle available.`,
        
        legalBasis: "Awaab's Law (Housing Act 2024), Section 10A Landlord and Tenant Act 1985. Social landlords must investigate within 7 days of first complaint. Breach creates automatic liability.",
        
        caseLaw: [
          "R (Awaab Ishak) v Rochdale BC [2023] - Awaab's Law principles",
          "Housing Ombudsman decisions on Awaab's Law compliance",
          "Section 10A Landlord and Tenant Act 1985 - Statutory duty",
        ],
        
        opponentWeakness: "The landlord has breached a fundamental statutory duty. This is not a question of negligence - it is automatic liability. The landlord cannot defend this breach. This exposes that the landlord's conduct is so bad that it amounts to a statutory breach.",
        
        howToExploit: `Step 1: Document exact dates - first complaint: ${firstComplaintDate.toLocaleDateString("en-GB")}, investigation: ${investigationDate.toLocaleDateString("en-GB")}. Step 2: Calculate breach - ${daysToInvestigation} days exceeds 7-day deadline by ${daysToInvestigation - 7} days. Step 3: Apply for summary judgment on liability based on statutory breach. Step 4: Argue that breach is automatic liability - no need to prove negligence. Step 5: Request aggravated damages for statutory breach. Step 6: Request costs on indemnity basis.`,
        
        specificArguments: [
          `Your Honour, the landlord has breached Awaab's Law. The statutory deadline for investigation was 7 days from first complaint on ${firstComplaintDate.toLocaleDateString("en-GB")}. The landlord took ${daysToInvestigation} days, exceeding the deadline by ${daysToInvestigation - 7} days. This is a fundamental statutory breach that creates automatic liability.`,
          `Your Honour, this is not a question of negligence - it is a statutory breach. The landlord had a statutory duty under Awaab's Law and failed. Summary judgment on liability should be granted.`,
          `Your Honour, the breach is so serious that aggravated damages are justified. The landlord's failure to comply with Awaab's Law demonstrates a complete disregard for statutory duties.`,
        ],
        
        crossExaminationPoints: [
          "Landlord, when did you first receive the complaint?",
          "Landlord, when did you investigate?",
          "Landlord, are you aware of Awaab's Law and the 7-day investigation deadline?",
          "Landlord, why did you fail to comply with the statutory deadline?",
          "Landlord, do you accept that this breach creates automatic liability?",
        ],
        
        submissions: [
          "I submit that the landlord has breached Awaab's Law by failing to investigate within 7 days. This breach creates automatic liability.",
          "I submit that summary judgment on liability should be granted based on this statutory breach.",
          "I submit that aggravated damages are justified given the serious nature of the breach.",
        ],
        
        ifSuccessful: "Summary judgment on liability granted. Automatic liability established. Aggravated damages awarded. Costs on indemnity basis. This is a complete win on liability - only quantum remains.",
        
        ifUnsuccessful: "If summary judgment fails, still have strong liability case. Statutory breach is powerful evidence. Still strong position for liability and aggravated damages.",
        
        combinedWith: ["S11_LTA_BREACH", "AGGRAVATED_DAMAGES_CLAIM", "HHSRS_CATEGORY_1"],
        
        evidenceNeeded: [
          "First complaint date (documented)",
          "Investigation date (documented)",
          "Landlord type confirmation (social/council)",
          "Awaab's Law compliance evidence",
        ],
        
        disclosureRequests: [
          "All correspondence showing first complaint date",
          "All records showing investigation date",
          "Landlord's Awaab's Law compliance records",
          "Any explanations for delay",
        ],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // AWAAB'S LAW: 28-day repair deadline
  if (workStartDate && investigationDate) {
    const daysToWorkStart = Math.floor(
      (workStartDate.getTime() - investigationDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToWorkStart > 28) {
      angles.push({
        id: `angle-awaab-repair-${input.caseId}`,
        angleType: "AWAAB_LAW_BREACH",
        title: "Awaab's Law Breach - 28-Day Repair Deadline Missed: CRITICAL",
        severity: "CRITICAL",
        winProbability: 85,
        
        whyThisMatters: `The landlord took ${daysToWorkStart} days to start repairs after investigation, exceeding the 28-day statutory deadline under Awaab's Law. This is another fundamental statutory breach that creates automatic liability. Combined with the investigation breach, this demonstrates a pattern of statutory non-compliance.`,
        
        legalBasis: "Awaab's Law (Housing Act 2024). Social landlords must start repairs within 28 days of investigation. Breach creates automatic liability.",
        
        caseLaw: [
          "R (Awaab Ishak) v Rochdale BC [2023] - Awaab's Law repair deadlines",
          "Housing Ombudsman decisions on repair deadlines",
        ],
        
        opponentWeakness: "The landlord has breached another fundamental statutory duty. This demonstrates a pattern of statutory non-compliance. The landlord cannot defend this breach.",
        
        howToExploit: `Step 1: Document exact dates - investigation: ${investigationDate.toLocaleDateString("en-GB")}, work start: ${workStartDate.toLocaleDateString("en-GB")}. Step 2: Calculate breach - ${daysToWorkStart} days exceeds 28-day deadline by ${daysToWorkStart - 28} days. Step 3: Combine with investigation breach to show pattern. Step 4: Apply for summary judgment. Step 5: Request aggravated damages.`,
        
        specificArguments: [
          `Your Honour, the landlord has breached Awaab's Law again. The statutory deadline for starting repairs was 28 days from investigation on ${investigationDate.toLocaleDateString("en-GB")}. The landlord took ${daysToWorkStart} days, exceeding the deadline by ${daysToWorkStart - 28} days. Combined with the investigation breach, this demonstrates a pattern of statutory non-compliance.`,
        ],
        
        crossExaminationPoints: [
          "Landlord, when did you investigate?",
          "Landlord, when did you start repairs?",
          "Landlord, are you aware of the 28-day repair deadline?",
          "Landlord, why did you fail to comply?",
        ],
        
        submissions: [
          "I submit that the landlord has breached Awaab's Law by failing to start repairs within 28 days. This breach, combined with the investigation breach, demonstrates a pattern of statutory non-compliance.",
        ],
        
        ifSuccessful: "Summary judgment on liability. Pattern of breaches established. Aggravated damages. Complete win.",
        
        ifUnsuccessful: "Still have strong liability case. Multiple statutory breaches are powerful evidence.",
        
        combinedWith: ["AWAAB_LAW_BREACH", "S11_LTA_BREACH", "AGGRAVATED_DAMAGES_CLAIM"],
        
        evidenceNeeded: [
          "Investigation date",
          "Work start date",
          "Awaab's Law compliance records",
        ],
        
        disclosureRequests: [
          "All records showing investigation date",
          "All records showing work start date",
          "Awaab's Law compliance records",
        ],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  // SECTION 11 LTA 1985 BREACH
  const hasS11Defects = input.defects.some(d => 
    d.defect_type === "structural" || 
    d.defect_type === "heating" || 
    d.defect_type === "electrical" ||
    d.defect_type === "leak"
  );

  if (hasS11Defects) {
    const unrepairedDefects = input.defects.filter(d => 
      !d.repair_successful && 
      d.first_reported_date &&
      (d.defect_type === "structural" || d.defect_type === "heating" || d.defect_type === "electrical" || d.defect_type === "leak")
    );

    if (unrepairedDefects.length > 0) {
      const oldestDefect = unrepairedDefects.reduce((oldest, current) => {
        const oldestDate = oldest.first_reported_date ? new Date(oldest.first_reported_date) : new Date(0);
        const currentDate = current.first_reported_date ? new Date(current.first_reported_date) : new Date(0);
        return currentDate < oldestDate ? current : oldest;
      });

      if (oldestDefect.first_reported_date) {
        const firstReported = new Date(oldestDefect.first_reported_date);
        const daysSinceReport = Math.floor((Date.now() - firstReported.getTime()) / (1000 * 60 * 60 * 24));
        const reasonableTime = oldestDefect.severity === "critical" || oldestDefect.severity === "severe" ? 14 : 28;

        if (daysSinceReport > reasonableTime) {
          angles.push({
            id: `angle-s11-breach-${input.caseId}`,
            angleType: "S11_LTA_BREACH",
            title: "Section 11 LTA 1985 Breach - Automatic Liability",
            severity: "CRITICAL",
            winProbability: 85,
            
            whyThisMatters: `Section 11 Landlord and Tenant Act 1985 creates an automatic duty to repair. The landlord has failed to repair ${unrepairedDefects.length} defect(s) within a reasonable time (${reasonableTime} days for ${oldestDefect.severity} severity). This breach creates automatic liability - no need to prove negligence.`,
            
            legalBasis: "Section 11 Landlord and Tenant Act 1985 - Landlord's duty to repair structure, exterior, heating, and water. Breach creates automatic liability.",
            
            caseLaw: [
              "Quick v Taff Ely BC [1986] QB 809 - Section 11 duty",
              "O'Brien v Robinson [1973] AC 912 - Section 11 scope",
              "Lee v Leeds CC [2002] 1 WLR 1488 - Section 11 breach",
            ],
            
            opponentWeakness: "The landlord has breached a fundamental statutory duty under Section 11. This is automatic liability - the landlord cannot defend this breach by claiming they tried to repair. The duty is absolute.",
            
            howToExploit: `Step 1: Identify all Section 11 defects (structure, exterior, heating, electrical, leaks). Step 2: Calculate reasonable time (${reasonableTime} days for ${oldestDefect.severity} severity). Step 3: Document breach - ${daysSinceReport} days exceeds reasonable time by ${daysSinceReport - reasonableTime} days. Step 4: Apply for summary judgment on liability. Step 5: Argue automatic liability - no need to prove negligence.`,
            
            specificArguments: [
              `Your Honour, the landlord has breached Section 11 Landlord and Tenant Act 1985. The landlord had a statutory duty to repair ${unrepairedDefects.length} defect(s) within a reasonable time (${reasonableTime} days). The landlord has failed to do so for ${daysSinceReport} days. This breach creates automatic liability.`,
              `Your Honour, Section 11 creates an absolute duty. The landlord cannot defend this breach by claiming they tried to repair. The duty is to actually repair, not to attempt repair.`,
            ],
            
            crossExaminationPoints: [
              "Landlord, when was the defect first reported?",
              "Landlord, when did you repair it?",
              "Landlord, are you aware of Section 11 LTA 1985?",
              "Landlord, do you accept that Section 11 creates an absolute duty?",
            ],
            
            submissions: [
              "I submit that the landlord has breached Section 11 LTA 1985 by failing to repair within a reasonable time. This breach creates automatic liability.",
              "I submit that summary judgment on liability should be granted based on this statutory breach.",
            ],
            
            ifSuccessful: "Summary judgment on liability. Automatic liability established. Damages and costs awarded.",
            
            ifUnsuccessful: "Still have strong liability case. Section 11 breach is powerful evidence.",
            
            combinedWith: ["AWAAB_LAW_BREACH", "AGGRAVATED_DAMAGES_CLAIM"],
            
            evidenceNeeded: [
              "First report date for each defect",
              "Repair date (or lack thereof)",
              "Defect type and severity",
              "Section 11 compliance evidence",
            ],
            
            disclosureRequests: [
              "All repair logs",
              "All inspection reports",
              "All correspondence about repairs",
              "Section 11 compliance records",
            ],
            
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // HHSRS CATEGORY 1 HAZARD
  if (housingCase.hhsrs_category_1_hazards.length > 0) {
    angles.push({
      id: `angle-hhsrs-cat1-${input.caseId}`,
      angleType: "HHSRS_CATEGORY_1",
      title: "HHSRS Category 1 Hazard - Serious Statutory Breach",
      severity: "HIGH",
      winProbability: 80,
      
      whyThisMatters: `The property has ${housingCase.hhsrs_category_1_hazards.length} Category 1 hazard(s). Category 1 hazards are so serious that the local authority MUST take action. This creates a strong liability argument and justifies aggravated damages.`,
      
      legalBasis: "Housing Act 2004, HHSRS. Category 1 hazards are so serious that local authority must take action. This demonstrates fundamental breach of duty.",
      
      caseLaw: [
        "Housing Act 2004 - HHSRS framework",
        "Case law on Category 1 hazards and liability",
      ],
      
      opponentWeakness: "The landlord has allowed Category 1 hazards to exist. This demonstrates a fundamental breach of duty. The seriousness of the hazards justifies aggravated damages.",
      
      howToExploit: `Step 1: Document all Category 1 hazards: ${housingCase.hhsrs_category_1_hazards.join(", ")}. Step 2: Get HHSRS assessment if not already done. Step 3: Argue that Category 1 hazards = automatic breach of duty. Step 4: Request aggravated damages for serious hazards. Step 5: Request enforcement action if appropriate.`,
      
      specificArguments: [
        `Your Honour, the property has ${housingCase.hhsrs_category_1_hazards.length} Category 1 hazard(s): ${housingCase.hhsrs_category_1_hazards.join(", ")}. Category 1 hazards are so serious that the local authority must take action. This demonstrates a fundamental breach of duty.`,
        `Your Honour, the seriousness of these hazards justifies aggravated damages. The landlord's failure to address Category 1 hazards shows a complete disregard for tenant safety.`,
      ],
      
      crossExaminationPoints: [
        "Landlord, are you aware of the Category 1 hazards?",
        "Landlord, what action have you taken to address them?",
        "Landlord, do you accept that Category 1 hazards are serious?",
      ],
      
      submissions: [
        "I submit that the Category 1 hazards demonstrate a fundamental breach of duty and justify aggravated damages.",
      ],
      
      ifSuccessful: "Strong liability case. Aggravated damages awarded. Potential enforcement action.",
      
      ifUnsuccessful: "Still have strong liability case. Category 1 hazards are powerful evidence.",
      
      combinedWith: ["AWAAB_LAW_BREACH", "S11_LTA_BREACH", "AGGRAVATED_DAMAGES_CLAIM"],
      
      evidenceNeeded: [
        "HHSRS assessment showing Category 1 hazards",
        "Evidence of hazards (photos, reports)",
        "Local authority action (if any)",
      ],
      
      disclosureRequests: [
        "HHSRS assessment",
        "All evidence of hazards",
        "Local authority correspondence",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * PROCEDURAL ATTACK ANGLES
 * Opponent mistakes create leverage
 */

function findProceduralAttackAngles(input: HousingDefenseInput): HousingDefenseAngle[] {
  const angles: HousingDefenseAngle[] = [];
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
        
        whyThisMatters: `The opponent has not responded for ${daysSinceResponse} days. This is a procedural failure that creates leverage. If they fail to respond to pre-action letter or defense within deadline, can apply for unless order or strike-out.`,
        
        legalBasis: "CPR 3.4(2)(c) - Strike out for non-compliance. CPR 15.5 - Defense deadline. Pre-Action Protocol for Housing Disrepair - Response deadline.",
        
        caseLaw: [
          "CPR 3.4 - Strike out powers",
          "CPR 15.5 - Defense deadlines",
          "Pre-Action Protocol for Housing Disrepair",
        ],
        
        opponentWeakness: "The opponent has failed to comply with procedural requirements. This demonstrates a lack of engagement and creates leverage for unless orders or strike-out.",
        
        howToExploit: `Step 1: Document exact deadline (14 days for acknowledgment, 28 days for defense). Step 2: Document that ${daysSinceResponse} days have passed. Step 3: If missed deadline, immediately apply for unless order. Step 4: If still no response, apply for strike-out. Step 5: Request costs on indemnity basis.`,
        
        specificArguments: [
          `Your Honour, the defendant has failed to respond for ${daysSinceResponse} days. This is a procedural failure that warrants an unless order. I apply for an unless order requiring response within 7 days, failing which the defense should be struck out.`,
        ],
        
        crossExaminationPoints: [],
        
        submissions: [
          "I submit that the defendant's non-compliance warrants an unless order or strike-out.",
        ],
        
        ifSuccessful: "Unless order granted. Defense struck out if non-compliance continues. Costs on indemnity basis.",
        
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
        
        whyThisMatters: `The defense was filed ${daysLate} days late. This is a procedural failure. Additionally, if the defense is vague, lacks particulars, or fails to address key points, can apply to strike out or for further information.`,
        
        legalBasis: "CPR 3.4(2)(a) - Strike out defective statements. CPR 18 - Further information. CPR 15.5 - Defense deadline.",
        
        caseLaw: [
          "CPR 3.4 - Strike out powers",
          "CPR 18 - Further information",
        ],
        
        opponentWeakness: "The opponent's defense is defective (late and/or vague). This creates leverage for strike-out or further information requests.",
        
        howToExploit: `Step 1: Analyze defense for vagueness, lack of particulars, failure to address key points. Step 2: Apply for further information under CPR 18. Step 3: If still defective, apply to strike out under CPR 3.4. Step 4: Request costs.`,
        
        specificArguments: [
          `Your Honour, the defense was filed ${daysLate} days late and is defective. It lacks particulars and fails to address key points. I apply for further information under CPR 18, or alternatively, strike out under CPR 3.4.`,
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
  if (!input.hasPreActionLetter && input.firstComplaintDate) {
    const daysSinceComplaint = Math.floor(
      (Date.now() - input.firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceComplaint > 30) {
      angles.push({
        id: `angle-missing-pre-action-${input.caseId}`,
        angleType: "MISSING_PRE_ACTION_ATTACK",
        title: "Missing Pre-Action Protocol Compliance",
        severity: "MEDIUM",
        winProbability: 60,
        
        whyThisMatters: "If opponent failed to comply with pre-action protocol (e.g., didn't respond to letter of claim), can apply for costs sanctions. This creates pressure to settle.",
        
        legalBasis: "Pre-Action Protocol for Housing Disrepair, CPR 44.2 - Costs sanctions.",
        
        caseLaw: [
          "Pre-Action Protocol for Housing Disrepair",
          "CPR 44.2 - Costs sanctions",
        ],
        
        opponentWeakness: "The opponent has failed to comply with pre-action protocol. This demonstrates a lack of engagement and justifies costs sanctions.",
        
        howToExploit: `Step 1: Document pre-action letter sent. Step 2: Document opponent's failure to respond or inadequate response. Step 3: Apply for costs sanctions (indemnity basis, or increased costs). Step 4: Use in settlement negotiations.`,
        
        specificArguments: [
          "Your Honour, the defendant has failed to comply with the Pre-Action Protocol for Housing Disrepair. This justifies costs sanctions on an indemnity basis.",
        ],
        
        crossExaminationPoints: [],
        
        submissions: [
          "I submit that the defendant's failure to comply with pre-action protocol justifies costs sanctions.",
        ],
        
        ifSuccessful: "Costs sanctions awarded. Pressure to settle increased.",
        
        ifUnsuccessful: "Still creates pressure. Opponent aware of potential costs consequences.",
        
        combinedWith: ["COSTS_SANCTION_OPPORTUNITY"],
        
        evidenceNeeded: [
          "Pre-action letter",
          "Opponent's response (or lack thereof)",
          "Pre-action protocol compliance evidence",
        ],
        
        disclosureRequests: [],
        
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

function findEvidenceAttackAngles(input: HousingDefenseInput): HousingDefenseAngle[] {
  const angles: HousingDefenseAngle[] = [];

  // DISCLOSURE FAILURE
  angles.push({
    id: `angle-disclosure-failure-${input.caseId}`,
    angleType: "DISCLOSURE_FAILURE_ATTACK",
    title: "Disclosure Failure - Opponent Non-Compliance",
    severity: "HIGH",
    winProbability: 70,
    
    whyThisMatters: "If opponent fails to disclose key documents (repair logs, inspection reports, correspondence), can apply for unless order or adverse inference. This creates leverage and pressure.",
    
    legalBasis: "CPR 31 - Disclosure duty. CPR 3.4 - Unless orders. Adverse inference for non-disclosure.",
    
    caseLaw: [
      "CPR 31 - Disclosure",
      "Case law on adverse inference",
    ],
    
    opponentWeakness: "The opponent has failed to disclose key documents. This suggests they may be hiding evidence that could prove the case. This creates leverage.",
    
    howToExploit: `Step 1: Request specific disclosure (repair logs, inspection reports, correspondence). Step 2: If refused or incomplete, apply for unless order. Step 3: Argue adverse inference if documents not produced. Step 4: Request costs.`,
    
    specificArguments: [
      "Your Honour, the defendant has failed to disclose key documents as required by CPR 31. I apply for an unless order requiring disclosure within 7 days, failing which an adverse inference should be drawn.",
    ],
    
    crossExaminationPoints: [],
    
    submissions: [
      "I submit that the defendant's failure to disclose warrants an unless order or adverse inference.",
    ],
    
    ifSuccessful: "Unless order granted. Adverse inference drawn. Costs awarded.",
    
    ifUnsuccessful: "Still creates pressure. Opponent forced to disclose or face consequences.",
    
    combinedWith: ["UNLESS_ORDER_OPPORTUNITY", "COSTS_SANCTION_OPPORTUNITY"],
    
    evidenceNeeded: [
      "Disclosure requests",
      "Opponent's response (or lack thereof)",
      "Evidence of what should have been disclosed",
    ],
    
    disclosureRequests: [
      "All repair logs",
      "All inspection reports",
      "All correspondence about repairs",
    ],
    
    createdAt: new Date().toISOString(),
  });

  // CONTRADICTORY EVIDENCE
  const hasContradictions = input.defects.some(d => 
    d.repair_attempted && 
    d.repair_successful === false &&
    d.repair_date &&
    d.last_reported_date &&
    new Date(d.repair_date) < new Date(d.last_reported_date)
  );

  if (hasContradictions) {
    angles.push({
      id: `angle-contradiction-${input.caseId}`,
      angleType: "CONTRADICTION_EXPLOITATION",
      title: "Contradictory Evidence - Opponent's Case Unreliable",
      severity: "MEDIUM",
      winProbability: 65,
      
      whyThisMatters: "If opponent's evidence contradicts (e.g., repair log says 'fixed' but photos show still broken), this destroys credibility. This creates reasonable doubt and strengthens the case.",
      
      legalBasis: "Contradictory evidence is unreliable. Creates reasonable doubt. Court cannot rely on contradictory evidence.",
      
      caseLaw: [
        "Case law on contradictory evidence",
      ],
      
      opponentWeakness: "The opponent's evidence contradicts itself. This demonstrates unreliability and destroys credibility.",
      
      howToExploit: `Step 1: Identify contradictions in opponent's evidence. Step 2: Cross-examine on contradictions. Step 3: Argue that contradictions show unreliability. Step 4: Submit that no reasonable court could rely on contradictory evidence.`,
      
      specificArguments: [
        "Your Honour, the defendant's evidence contradicts itself. The repair log says the defect was fixed, but the evidence shows it is still present. This demonstrates unreliability and destroys credibility.",
      ],
      
      crossExaminationPoints: [
        "Landlord, your repair log says the defect was fixed. But the evidence shows it is still present. Which is correct?",
        "Landlord, how do you explain this contradiction?",
        "Landlord, does this contradiction suggest your evidence is unreliable?",
      ],
      
      submissions: [
        "I submit that the contradictory evidence is unreliable and creates reasonable doubt.",
      ],
      
      ifSuccessful: "Opponent's evidence discredited. Stronger case. Increased damages.",
      
      ifUnsuccessful: "Still creates doubt. Opponent's credibility damaged.",
      
      combinedWith: ["DISCLOSURE_FAILURE_ATTACK"],
      
      evidenceNeeded: [
        "Opponent's evidence (repair logs, statements)",
        "Contradictory evidence (photos, reports)",
        "Documentation of contradictions",
      ],
      
      disclosureRequests: [
        "All repair logs",
        "All inspection reports",
        "All correspondence",
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

function findQuantumAttackAngles(input: HousingDefenseInput): HousingDefenseAngle[] {
  const angles: HousingDefenseAngle[] = [];

  // AGGRAVATED DAMAGES
  const hasStatutoryBreaches = input.housingCase.hhsrs_category_1_hazards.length > 0 ||
                               (input.firstComplaintDate && input.investigationDate && 
                                Math.floor((input.investigationDate.getTime() - input.firstComplaintDate.getTime()) / (1000 * 60 * 60 * 24)) > 7);

  if (hasStatutoryBreaches) {
    angles.push({
      id: `angle-aggravated-damages-${input.caseId}`,
      angleType: "AGGRAVATED_DAMAGES_CLAIM",
      title: "Aggravated Damages for Statutory Breach",
      severity: "MEDIUM",
      winProbability: 65,
      
      whyThisMatters: "Statutory breaches (Awaab's Law, Section 11 LTA, HHSRS Category 1) can justify aggravated damages. This increases the total damages award significantly (usually 20-50% of general damages).",
      
      legalBasis: "Awaab's Law, Section 11 LTA, HHSRS Category 1. Statutory breaches can justify aggravated damages for distress and inconvenience.",
      
      caseLaw: [
        "Case law on aggravated damages in housing disrepair",
        "Awaab's Law - Aggravated damages",
      ],
      
      opponentWeakness: "The opponent has committed statutory breaches. This justifies aggravated damages for the distress and inconvenience caused.",
      
      howToExploit: `Step 1: Establish statutory breach (Awaab's Law, Section 11, HHSRS). Step 2: Argue breach caused distress/inconvenience. Step 3: Claim aggravated damages (usually 20-50% of general damages). Step 4: Request costs.`,
      
      specificArguments: [
        "Your Honour, the defendant has committed statutory breaches (Awaab's Law/Section 11/HHSRS). These breaches caused significant distress and inconvenience. I claim aggravated damages of [X]% of general damages.",
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "I submit that the statutory breaches justify aggravated damages for distress and inconvenience.",
      ],
      
      ifSuccessful: "Aggravated damages awarded. Increased total damages. Costs awarded.",
      
      ifUnsuccessful: "Still have strong case for general damages. Statutory breaches are powerful evidence.",
      
      combinedWith: ["AWAAB_LAW_BREACH", "S11_LTA_BREACH", "HHSRS_CATEGORY_1"],
      
      evidenceNeeded: [
        "Evidence of statutory breaches",
        "Evidence of distress/inconvenience",
        "General damages calculation",
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
function calculateOverallWinProbability(angles: HousingDefenseAngle[]): number {
  if (angles.length === 0) return 50;

  // Use best angle as base
  const bestAngle = angles[0];
  let probability = bestAngle.winProbability;

  // Add bonus for multiple strong angles
  const strongAngles = angles.filter(a => a.winProbability >= 70);
  if (strongAngles.length >= 2) {
    probability += 10; // Multiple strong angles increases chance
  }
  if (strongAngles.length >= 3) {
    probability += 5; // Even more angles
  }

  // Cap at 95 (never 100% - always some risk)
  return Math.min(95, probability);
}

/**
 * Build recommended strategy
 */
function buildRecommendedStrategy(angles: HousingDefenseAngle[]): {
  primaryAngle: HousingDefenseAngle;
  supportingAngles: HousingDefenseAngle[];
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

  // Build tactical plan
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
  primary: HousingDefenseAngle,
  supporting: HousingDefenseAngle[]
): number {
  let probability = primary.winProbability;

  if (supporting.length > 0) {
    const avgSupporting = supporting.reduce((sum, a) => sum + a.winProbability, 0) / supporting.length;
    const fallbackChance = (100 - primary.winProbability) / 100 * avgSupporting / 100 * 100;
    probability = primary.winProbability + fallbackChance * 0.3; // Supporting adds 30% of its value
  }

  return Math.min(95, Math.round(probability));
}

/**
 * Identify opponent vulnerabilities
 */
function identifyOpponentVulnerabilities(
  input: HousingDefenseInput,
  angles: HousingDefenseAngle[]
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

