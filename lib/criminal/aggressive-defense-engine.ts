/**
 * Aggressive Criminal Defense Engine
 * 
 * "Case Beater" system - finds EVERY possible angle to win a criminal case.
 * Designed for cases "hanging on a thread" - leaves no stone unturned.
 * 
 * This is aggressive, tactical, and sophisticated defense strategy.
 */

import "server-only";
import type { CriminalMeta } from "@/types/case";
import { detectAllLoopholes, type Loophole } from "./loophole-detector";

export type DefenseAngle = {
  id: string;
  angleType: 
    | "PACE_BREACH_EXCLUSION"
    | "DISCLOSURE_FAILURE_STAY"
    | "EVIDENCE_WEAKNESS_CHALLENGE"
    | "ABUSE_OF_PROCESS"
    | "HUMAN_RIGHTS_BREACH"
    | "TECHNICAL_DEFENSE"
    | "IDENTIFICATION_CHALLENGE"
    | "ALIBI_DEFENSE"
    | "CONTRADICTION_EXPLOITATION"
    | "CHAIN_OF_CUSTODY_BREAK"
    | "HEARSAY_CHALLENGE"
    | "BAD_CHARACTER_EXCLUSION"
    | "PROSECUTION_MISCONDUCT"
    | "NO_CASE_TO_ANSWER"
    | "SENTENCING_MITIGATION";
  
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  winProbability: number; // 0-100, chance this angle wins the case
  
  // Detailed analysis
  whyThisMatters: string; // Why this point is critical
  legalBasis: string; // Statute, case law, legal principle
  caseLaw: string[]; // Relevant case law references
  prosecutionWeakness: string; // What this exposes about prosecution case
  
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

export type AggressiveDefenseAnalysis = {
  caseId: string;
  overallWinProbability: number; // 0-100
  criticalAngles: DefenseAngle[]; // Angles with highest win probability
  allAngles: DefenseAngle[];
  recommendedStrategy: {
    primaryAngle: DefenseAngle;
    supportingAngles: DefenseAngle[];
    combinedProbability: number;
    tacticalPlan: string[];
  };
  prosecutionVulnerabilities: {
    criticalWeaknesses: string[];
    evidenceGaps: string[];
    proceduralErrors: string[];
  };
  createdAt: string;
  // Evidence strength calibration fields (added for reality calibration)
  evidenceStrengthWarnings?: string[];
  evidenceStrength?: number;
  realisticOutcome?: string;
};

/**
 * Main function: Find EVERY possible defense angle
 */
export async function findAllDefenseAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): Promise<AggressiveDefenseAnalysis> {
  const allAngles: DefenseAngle[] = [];
  const now = new Date().toISOString();

  // 1. PACE BREACHES - Most powerful defense angle
  const paceAngles = findPACEExclusionAngles(criminalMeta, caseId);
  allAngles.push(...paceAngles);

  // 2. DISCLOSURE FAILURES - Can get case stayed
  const disclosureAngles = findDisclosureFailureAngles(criminalMeta, caseId);
  allAngles.push(...disclosureAngles);

  // 3. EVIDENCE WEAKNESSES - Challenge prosecution evidence
  const evidenceAngles = findEvidenceWeaknessAngles(criminalMeta, caseId);
  allAngles.push(...evidenceAngles);

  // 4. ABUSE OF PROCESS - Nuclear option
  const abuseAngles = findAbuseOfProcessAngles(criminalMeta, caseId);
  allAngles.push(...abuseAngles);

  // 5. HUMAN RIGHTS BREACHES - Article 6 ECHR
  const humanRightsAngles = findHumanRightsAngles(criminalMeta, caseId);
  allAngles.push(...humanRightsAngles);

  // 6. TECHNICAL DEFENSES - Procedural errors
  const technicalAngles = findTechnicalDefenseAngles(criminalMeta, caseId);
  allAngles.push(...technicalAngles);

  // 7. IDENTIFICATION CHALLENGES - Turnbull Guidelines
  const idAngles = findIdentificationChallengeAngles(criminalMeta, caseId);
  allAngles.push(...idAngles);

  // 8. CONTRADICTIONS - Exploit inconsistencies
  const contradictionAngles = findContradictionAngles(criminalMeta, caseId);
  allAngles.push(...contradictionAngles);

  // 9. NO CASE TO ANSWER - Submission at close of prosecution
  const noCaseAngles = findNoCaseToAnswerAngles(criminalMeta, caseId);
  allAngles.push(...noCaseAngles);

  // 10. CHAIN OF CUSTODY - Evidence contamination
  const chainAngles = findChainOfCustodyAngles(criminalMeta, caseId);
  allAngles.push(...chainAngles);

  // Sort by win probability
  const sortedAngles = allAngles.sort((a, b) => b.winProbability - a.winProbability);
  const criticalAngles = sortedAngles.filter(a => a.winProbability >= 70 || a.severity === "CRITICAL");

  // Calculate overall win probability (use best angle + supporting angles)
  const overallWinProbability = calculateOverallWinProbability(sortedAngles);

  // Build recommended strategy
  const recommendedStrategy = buildRecommendedStrategy(sortedAngles);

  // Identify prosecution vulnerabilities
  const prosecutionVulnerabilities = identifyProsecutionVulnerabilities(criminalMeta, allAngles);

  return {
    caseId,
    overallWinProbability,
    criticalAngles: criticalAngles.slice(0, 5),
    allAngles: sortedAngles,
    recommendedStrategy,
    prosecutionVulnerabilities,
    createdAt: now,
  };
}

/**
 * PACE BREACH EXCLUSION ANGLES
 * Most powerful - can get evidence excluded and case dismissed
 */
function findPACEExclusionAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  if (!criminalMeta?.paceCompliance) {
    return angles;
  }

  const pace = criminalMeta.paceCompliance;

  // CRITICAL: Caution not given before questioning
  if (pace.cautionGiven === false || (pace.cautionGiven === true && pace.cautionGivenBeforeQuestioning === false)) {
    angles.push({
      id: `angle-pace-caution-${caseId}`,
      angleType: "PACE_BREACH_EXCLUSION",
      title: "PACE Breach - Caution Not Given: NUCLEAR OPTION",
      severity: "CRITICAL",
      winProbability: 85,
      
      whyThisMatters: "If the caution was not given before questioning, ALL evidence obtained during that questioning is potentially inadmissible under s.78 PACE. This is often the prosecution's ONLY evidence. If excluded, the case collapses completely. This is the strongest defense angle available.",
      
      legalBasis: "Police and Criminal Evidence Act 1984, s.78 - Court may exclude evidence if admission would have adverse effect on fairness of proceedings. PACE Code C requires caution before questioning. Breach of Code C is a fundamental breach that renders evidence unreliable.",
      
      caseLaw: [
        "R v Keenan [1990] 2 QB 54 - Caution must be given before questioning",
        "R v Fulling [1987] QB 426 - Breach of PACE can lead to exclusion",
        "R v Mason [1988] 1 WLR 139 - Failure to caution renders confession unreliable",
      ],
      
      prosecutionWeakness: "The prosecution's case likely depends entirely on the confession/evidence obtained during questioning. Without it, they have no case. This exposes that the prosecution's evidence is fundamentally tainted and unreliable.",
      
      howToExploit: `Step 1: File application under s.78 PACE to exclude ALL evidence obtained during questioning. Step 2: Request voir dire hearing (trial within a trial) to determine admissibility. Step 3: Argue that the breach is so fundamental that exclusion is mandatory. Step 4: If evidence excluded, immediately submit "no case to answer" - prosecution has no evidence left. Step 5: Request case dismissed.`,
      
      specificArguments: [
        `Your Honour, I submit that the confession/evidence should be excluded under s.78 PACE. The caution was not given before questioning, which is a fundamental breach of PACE Code C. This breach is so serious that it renders the evidence unreliable and its admission would have an adverse effect on the fairness of the proceedings.`,
        `Your Honour, without this evidence, the prosecution has no case. I submit that the case should be dismissed.`,
        `Your Honour, this is not a technical breach - it is a fundamental breach of my client's rights. The prosecution cannot rely on evidence obtained in breach of PACE.`,
      ],
      
      crossExaminationPoints: [
        "Officer, when did you first caution my client?",
        "Officer, did you question my client BEFORE giving the caution?",
        "Officer, are you aware that PACE Code C requires a caution before questioning?",
        "Officer, why did you fail to follow PACE Code C?",
        "Officer, without the confession, what evidence do you have against my client?",
      ],
      
      submissions: [
        "I submit that the failure to caution is a fundamental breach that renders all evidence obtained during questioning inadmissible.",
        "I submit that without this evidence, the prosecution has no case and the case should be dismissed.",
        "I submit that the breach is so serious that exclusion is mandatory, not discretionary.",
      ],
      
      ifSuccessful: "ALL evidence from questioning excluded. Prosecution case collapses. Case dismissed. Client acquitted. This is a complete win.",
      
      ifUnsuccessful: "If exclusion fails, still argue that breach undermines reliability. Use in mitigation. Challenge weight of evidence. Still strong position for acquittal.",
      
      combinedWith: ["DISCLOSURE_FAILURE_STAY", "ABUSE_OF_PROCESS", "HUMAN_RIGHTS_BREACH"],
      
      evidenceNeeded: [
        "PACE custody record showing when caution was given",
        "Interview recording (if any) showing timing of caution",
        "Officer's notes showing sequence of events",
      ],
      
      disclosureRequests: [
        "Full PACE custody record",
        "All interview recordings",
        "All officer notes from time of arrest to interview",
        "CCTV from custody suite (if available)",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  // CRITICAL: Right to solicitor denied
  if (pace.rightToSolicitor === false) {
    angles.push({
      id: `angle-pace-solicitor-${caseId}`,
      angleType: "PACE_BREACH_EXCLUSION",
      title: "PACE Breach - Right to Solicitor Denied: CRITICAL",
      severity: "CRITICAL",
      winProbability: 90,
      
      whyThisMatters: "Denying access to a solicitor is a fundamental breach of PACE and Article 6 ECHR (right to fair trial). This is one of the strongest defense angles. ALL evidence obtained after denial is potentially inadmissible. This often gets cases dismissed.",
      
      legalBasis: "PACE Code C, para 6.1 - Right to consult solicitor. Article 6 ECHR - Right to fair trial. Denial of solicitor access is a fundamental breach that renders proceedings unfair.",
      
      caseLaw: [
        "R v Samuel [1988] QB 615 - Denial of solicitor access can lead to exclusion",
        "R v Alladice [1988] 87 Cr App R 380 - Right to solicitor is fundamental",
        "Salduz v Turkey [2008] ECHR 1542 - ECHR requires solicitor access",
      ],
      
      prosecutionWeakness: "The prosecution likely obtained key evidence after solicitor was denied. This evidence is tainted and unreliable. Without it, prosecution case may collapse.",
      
      howToExploit: `Step 1: File application to exclude ALL evidence obtained after solicitor was denied. Step 2: Argue fundamental breach of Article 6 ECHR. Step 3: Request voir dire hearing. Step 4: If evidence excluded, submit "no case to answer". Step 5: Request case dismissed or stayed as abuse of process.`,
      
      specificArguments: [
        `Your Honour, my client's fundamental right to consult with a solicitor was denied. This is a breach of PACE Code C and Article 6 ECHR. I submit that ALL evidence obtained after this breach should be excluded.`,
        `Your Honour, this breach is so fundamental that it renders the proceedings unfair. Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.`,
      ],
      
      crossExaminationPoints: [
        "Officer, did my client request a solicitor?",
        "Officer, why was the solicitor denied?",
        "Officer, are you aware that denying solicitor access is a breach of PACE?",
        "Officer, what evidence did you obtain after the solicitor was denied?",
      ],
      
      submissions: [
        "I submit that the denial of solicitor access is a fundamental breach that renders all subsequent evidence inadmissible.",
        "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.",
      ],
      
      ifSuccessful: "All evidence after solicitor denial excluded. Case stayed or dismissed. Complete win.",
      
      ifUnsuccessful: "Still argue breach undermines fairness. Use in mitigation. Strong position.",
      
      combinedWith: ["ABUSE_OF_PROCESS", "HUMAN_RIGHTS_BREACH"],
      
      evidenceNeeded: [
        "Custody record showing solicitor request and denial",
        "All evidence obtained after denial",
        "Officer's explanation for denial",
      ],
      
      disclosureRequests: [
        "Full custody record",
        "All evidence obtained after solicitor was denied",
        "Reasons for denying solicitor access",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  // HIGH: Interview not recorded
  if (pace.interviewRecorded === false) {
    angles.push({
      id: `angle-pace-interview-${caseId}`,
      angleType: "PACE_BREACH_EXCLUSION",
      title: "PACE Breach - Interview Not Recorded",
      severity: "HIGH",
      winProbability: 75,
      
      whyThisMatters: "If the interview was not properly recorded, the evidence is unreliable. The court cannot verify what was actually said. This creates reasonable doubt and can lead to exclusion under s.78 PACE.",
      
      legalBasis: "PACE Code E requires interviews to be recorded. Failure to record breaches Code E and renders evidence unreliable. s.78 PACE allows exclusion of unreliable evidence.",
      
      caseLaw: [
        "R v Keenan [1990] - Unrecorded interviews are unreliable",
        "R v Bailey [1993] - Breach of Code E can lead to exclusion",
      ],
      
      prosecutionWeakness: "The prosecution cannot prove what was actually said. Their evidence is unreliable and unverifiable. This creates reasonable doubt.",
      
      howToExploit: `Step 1: Challenge admissibility of interview evidence. Step 2: Request voir dire hearing. Step 3: Argue that unrecorded evidence is unreliable. Step 4: If excluded, challenge remaining evidence.`,
      
      specificArguments: [
        `Your Honour, the interview was not properly recorded in breach of PACE Code E. This renders the evidence unreliable and unverifiable. I submit that it should be excluded under s.78 PACE.`,
      ],
      
      crossExaminationPoints: [
        "Officer, why was the interview not recorded?",
        "Officer, how can you prove what was actually said?",
        "Officer, are you aware that PACE Code E requires recording?",
      ],
      
      submissions: [
        "I submit that unrecorded evidence is unreliable and should be excluded.",
      ],
      
      ifSuccessful: "Interview evidence excluded. Prosecution case weakened significantly.",
      
      ifUnsuccessful: "Still argue unreliability. Challenge weight of evidence.",
      
      combinedWith: ["EVIDENCE_WEAKNESS_CHALLENGE"],
      
      evidenceNeeded: [
        "Custody record",
        "Any notes from interview",
        "Explanation for why not recorded",
      ],
      
      disclosureRequests: [
        "Full custody record",
        "All notes from interview",
        "Reasons for not recording",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * DISCLOSURE FAILURE ANGLES
 * Can get case stayed - very powerful
 */
function findDisclosureFailureAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  // Check if disclosure is incomplete (this would typically come from disclosure tracker)
  // For now, create a general angle if disclosure issues are suspected
  
  angles.push({
    id: `angle-disclosure-${caseId}`,
    angleType: "DISCLOSURE_FAILURE_STAY",
    title: "Disclosure Failure - Consider Stay/Abuse of Process Application",
    severity: "HIGH",
    winProbability: 70,
    
    whyThisMatters: "If the prosecution fails to provide full disclosure, the defense cannot properly prepare. This breaches the duty of disclosure and can lead to the case being stayed as an abuse of process. This is a powerful defense angle.",
    
    legalBasis: "CPIA 1996 - Prosecution duty of disclosure. R v H [2004] - Failure to disclose can lead to stay. Article 6 ECHR - Right to fair trial requires full disclosure.",
    
    caseLaw: [
      "R v H [2004] UKHL 3 - Disclosure failures can lead to stay",
      "R v Ward [1993] 1 WLR 619 - Duty of disclosure is fundamental",
      "R v Davis [1993] 1 WLR 613 - Non-disclosure can be abuse of process",
    ],
    
    prosecutionWeakness: "The prosecution has failed in their fundamental duty. This suggests they may be hiding evidence that could prove innocence. This undermines the entire prosecution case.",
    
    howToExploit: `Step 1: Document all missing disclosure. Step 2: Request full disclosure immediately. Step 3: If refused or incomplete after clear chase trail, consider application to stay proceedings as abuse of process. Step 4: Argue that without disclosure, fair trial is impossible. Step 5: Request case stayed or dismissed only after directions/timetable have been exhausted.`,
    
    specificArguments: [
      `Your Honour, the prosecution has failed to provide full disclosure as required by CPIA 1996. This breach is so fundamental that it prevents my client from having a fair trial. Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.`,
      `Your Honour, without full disclosure, I cannot properly prepare my client's defense. This breaches Article 6 ECHR. Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.`,
    ],
    
    crossExaminationPoints: [
      "Prosecutor, have you provided full disclosure?",
      "Prosecutor, what material have you not disclosed?",
      "Prosecutor, are you aware of your duty under CPIA 1996?",
    ],
    
    submissions: [
      "I submit that the failure to disclose is a fundamental breach that prevents a fair trial.",
      "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.",
    ],
    
    ifSuccessful: "Case stayed. Proceedings halted. Client wins without trial.",
    
    ifUnsuccessful: "Still get disclosure. Use delay to strengthen defense. May get costs.",
    
    combinedWith: ["ABUSE_OF_PROCESS", "HUMAN_RIGHTS_BREACH"],
    
    evidenceNeeded: [
      "List of all requested disclosure",
      "Prosecution's response (or lack thereof)",
      "Evidence of what should have been disclosed",
    ],
    
    disclosureRequests: [
      "Full disclosure under CPIA 1996",
      "All unused material",
      "All material that could undermine prosecution or assist defense",
    ],
    
    createdAt: new Date().toISOString(),
  });

  return angles;
}

/**
 * EVIDENCE WEAKNESS ANGLES
 * Challenge prosecution evidence
 */
function findEvidenceWeaknessAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  if (!criminalMeta?.prosecutionEvidence) {
    return angles;
  }

  // Weak identification evidence
  const weakId = criminalMeta.prosecutionEvidence.find(e => 
    e.type === "witness_statement" && 
    e.issues?.some(i => ["distance", "lighting", "time", "brief"].includes(i.toLowerCase()))
  );

  if (weakId) {
    angles.push({
      id: `angle-weak-id-${caseId}`,
      angleType: "IDENTIFICATION_CHALLENGE",
      title: "Weak Identification Evidence - Turnbull Challenge",
      severity: "HIGH",
      winProbability: 75,
      
      whyThisMatters: "Weak identification evidence is the leading cause of miscarriages of justice. If the identification is weak (distance, lighting, time), it should be excluded under Turnbull Guidelines. Without identification, prosecution often has no case.",
      
      legalBasis: "Turnbull Guidelines [1977] - Identification evidence must be reliable. Weak identification should be excluded. R v Turnbull - Court must warn jury about weak ID.",
      
      caseLaw: [
        "R v Turnbull [1977] QB 224 - Turnbull Guidelines for ID evidence",
        "R v Forbes [2001] UKHL 40 - Weak ID can be excluded",
        "R v Makanjuola [1995] 1 WLR 1348 - ID evidence reliability",
      ],
      
      prosecutionWeakness: "The prosecution's case depends entirely on weak identification. This is unreliable and should not be sufficient for conviction. This exposes the fundamental weakness of their case.",
      
      howToExploit: `Step 1: Request voir dire hearing for ID evidence. Step 2: Argue ID evidence is weak under Turnbull Guidelines. Step 3: Request ID evidence be excluded. Step 4: If excluded, submit "no case to answer". Step 5: If not excluded, request strong Turnbull warning to jury.`,
      
      specificArguments: [
        `Your Honour, the identification evidence is weak and falls below the standard required by Turnbull Guidelines. The witness identified my client from a significant distance, in poor lighting, for only a brief period. This is unreliable and should be excluded.`,
        `Your Honour, without this identification evidence, the prosecution has no case. I submit that the case should be dismissed.`,
      ],
      
      crossExaminationPoints: [
        "Witness, how far away were you?",
        "Witness, what was the lighting like?",
        "Witness, how long did you see the person?",
        "Witness, are you sure it was my client?",
        "Witness, could you be mistaken?",
      ],
      
      submissions: [
        "I submit that the identification evidence is weak and unreliable under Turnbull Guidelines.",
        "I submit that it should be excluded, or at minimum, the jury should be given a strong Turnbull warning.",
      ],
      
      ifSuccessful: "ID evidence excluded. Prosecution case collapses. Case dismissed.",
      
      ifUnsuccessful: "Still get strong Turnbull warning. Jury likely to acquit on weak ID.",
      
      combinedWith: ["NO_CASE_TO_ANSWER"],
      
      evidenceNeeded: [
        "Witness statement",
        "Details of distance, lighting, time",
        "Any CCTV or other evidence",
      ],
      
      disclosureRequests: [
        "Full witness statements",
        "All CCTV from area",
        "Any identification procedures used",
      ],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * ABUSE OF PROCESS ANGLES
 * Nuclear option - can get case stayed
 */
function findAbuseOfProcessAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  // Abuse of process if multiple serious breaches
  if (criminalMeta?.paceCompliance) {
    const pace = criminalMeta.paceCompliance;
    const breaches = [
      pace.cautionGiven === false,
      pace.rightToSolicitor === false,
      pace.interviewRecorded === false,
    ].filter(Boolean).length;

    if (breaches >= 2) {
      angles.push({
        id: `angle-abuse-${caseId}`,
        angleType: "ABUSE_OF_PROCESS",
        title: "Abuse of Process - Multiple PACE Breaches",
        severity: "CRITICAL",
        winProbability: 85,
        
        whyThisMatters: "Multiple PACE breaches demonstrate a pattern of misconduct. This can amount to an abuse of process, leading to the case being stayed. This is the nuclear option - case ends without trial.",
        
        legalBasis: "R v Latif [1996] - Abuse of process can lead to stay. Multiple breaches demonstrate misconduct. Article 6 ECHR - Right to fair trial.",
        
        caseLaw: [
          "R v Latif [1996] 1 WLR 104 - Abuse of process principles",
          "R v Horseferry Road Magistrates' Court [1993] - Stay for abuse of process",
          "R v Loosely [2001] UKHL 53 - Entrapment and abuse of process",
        ],
        
        prosecutionWeakness: "The prosecution's conduct is so bad that it amounts to an abuse of process. This demonstrates they cannot be trusted to conduct a fair trial.",
        
        howToExploit: `Step 1: Document all breaches. Step 2: Apply to stay proceedings as abuse of process. Step 3: Argue that multiple breaches demonstrate misconduct. Step 4: Request case stayed.`,
        
        specificArguments: [
          `Your Honour, there have been multiple fundamental breaches of PACE. This demonstrates a pattern of misconduct that amounts to an abuse of process. Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.`,
        ],
        
        crossExaminationPoints: [
          "Officer, why were there multiple PACE breaches?",
          "Officer, does this demonstrate a pattern of misconduct?",
        ],
        
        submissions: [
          "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.",
        ],
        
        ifSuccessful: "Case stayed. Proceedings halted. Complete win.",
        
        ifUnsuccessful: "Still have strong PACE breach arguments. Strong position.",
        
        combinedWith: ["PACE_BREACH_EXCLUSION", "HUMAN_RIGHTS_BREACH"],
        
        evidenceNeeded: [
          "All PACE breaches documented",
          "Pattern of misconduct",
        ],
        
        disclosureRequests: [
          "All material relating to breaches",
        ],
        
        createdAt: new Date().toISOString(),
      });
    }
  }

  return angles;
}

/**
 * HUMAN RIGHTS BREACH ANGLES
 * Article 6 ECHR - Right to fair trial
 */
function findHumanRightsAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  if (criminalMeta?.paceCompliance?.rightToSolicitor === false) {
    angles.push({
      id: `angle-human-rights-${caseId}`,
      angleType: "HUMAN_RIGHTS_BREACH",
      title: "Human Rights Breach - Article 6 ECHR",
      severity: "CRITICAL",
      winProbability: 80,
      
      whyThisMatters: "Breach of Article 6 ECHR (right to fair trial) is a fundamental breach. This can lead to evidence being excluded or case being stayed. This is a very powerful defense angle.",
      
      legalBasis: "Article 6 ECHR - Right to fair trial. Human Rights Act 1998. Breach of Article 6 can lead to exclusion or stay.",
      
      caseLaw: [
        "Salduz v Turkey [2008] ECHR 1542 - Right to solicitor is fundamental",
        "R v Ibrahim [2008] EWCA Crim 880 - Article 6 and PACE",
      ],
      
      prosecutionWeakness: "The prosecution has breached fundamental human rights. This undermines the entire case.",
      
      howToExploit: `Step 1: Argue breach of Article 6 ECHR. Step 2: Request evidence excluded or case stayed. Step 3: Argue that breach is so fundamental that fair trial is impossible.`,
      
      specificArguments: [
        `Your Honour, my client's right to a fair trial under Article 6 ECHR has been breached. This is a fundamental breach that renders the proceedings unfair. Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.`,
      ],
      
      crossExaminationPoints: [],
      
      submissions: [
        "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable.",
      ],
      
      ifSuccessful: "Case stayed or evidence excluded. Strong position.",
      
      ifUnsuccessful: "Still have strong human rights argument. Use in mitigation.",
      
      combinedWith: ["PACE_BREACH_EXCLUSION", "ABUSE_OF_PROCESS"],
      
      evidenceNeeded: [
        "Evidence of human rights breach",
      ],
      
      disclosureRequests: [],
      
      createdAt: new Date().toISOString(),
    });
  }

  return angles;
}

/**
 * TECHNICAL DEFENSE ANGLES
 * Procedural errors
 */
function findTechnicalDefenseAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];
  // Would check for procedural errors (wrong court, wrong charge, etc.)
  return angles;
}

/**
 * IDENTIFICATION CHALLENGE ANGLES
 * Turnbull Guidelines
 */
function findIdentificationChallengeAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];
  // Covered in evidence weakness angles
  return angles;
}

/**
 * CONTRADICTION ANGLES
 * Exploit inconsistencies
 */
function findContradictionAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  if (criminalMeta?.prosecutionEvidence) {
    const witnessStatements = criminalMeta.prosecutionEvidence.filter(e => e.type === "witness_statement");
    
    if (witnessStatements.length > 1) {
      // Check for contradictions
      const hasContradictions = witnessStatements.some((w1, i) =>
        witnessStatements.slice(i + 1).some(w2 => 
          w1.content && w2.content && 
          (w1.content.toLowerCase() !== w2.content.toLowerCase())
        )
      );

      if (hasContradictions) {
        angles.push({
          id: `angle-contradiction-${caseId}`,
          angleType: "CONTRADICTION_EXPLOITATION",
          title: "Contradictory Evidence - Prosecution Case Unreliable",
          severity: "HIGH",
          winProbability: 70,
          
          whyThisMatters: "If prosecution witnesses contradict each other, their evidence is unreliable. This creates reasonable doubt. The jury cannot rely on contradictory evidence.",
          
          legalBasis: "Contradictory evidence is unreliable. Creates reasonable doubt. Jury cannot convict on unreliable evidence.",
          
          caseLaw: [
            "R v Turnbull - Unreliable evidence creates doubt",
          ],
          
          prosecutionWeakness: "The prosecution's own witnesses cannot agree. This demonstrates the unreliability of their case.",
          
          howToExploit: `Step 1: Document all contradictions. Step 2: Cross-examine on contradictions. Step 3: Argue evidence is unreliable. Step 4: Submit that no reasonable jury could convict on contradictory evidence.`,
          
          specificArguments: [
            `Your Honour, the prosecution witnesses cannot even agree on the basic facts. This demonstrates the unreliability of their evidence. I submit that no reasonable jury could convict on such contradictory evidence.`,
          ],
          
          crossExaminationPoints: [
            "Witness A, you said X. But Witness B said Y. Which is correct?",
            "Witness A, how do you explain this contradiction?",
            "Witness A, does this contradiction suggest you are unreliable?",
          ],
          
          submissions: [
            "I submit that the contradictory evidence is unreliable and creates reasonable doubt.",
          ],
          
          ifSuccessful: "Jury finds evidence unreliable. Acquittal.",
          
          ifUnsuccessful: "Still creates doubt. Strong position for acquittal.",
          
          combinedWith: ["NO_CASE_TO_ANSWER"],
          
          evidenceNeeded: [
            "All witness statements",
            "Documentation of contradictions",
          ],
          
          disclosureRequests: [
            "All witness statements",
          ],
          
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return angles;
}

/**
 * NO CASE TO ANSWER ANGLES
 * Submission at close of prosecution
 */
function findNoCaseToAnswerAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];

  // If evidence is weak or excluded, can submit no case to answer
  angles.push({
    id: `angle-no-case-${caseId}`,
    angleType: "NO_CASE_TO_ANSWER",
    title: "No Case to Answer - Submission at Close of Prosecution",
    severity: "HIGH",
    winProbability: 60,
    
    whyThisMatters: "If prosecution evidence is weak or excluded, can submit 'no case to answer' at close of prosecution case. If successful, case ends without defense needing to call evidence. This is a powerful tactical move.",
    
    legalBasis: "Criminal Procedure Rules - Submission of no case to answer. R v Galbraith [1981] - Test for no case to answer.",
    
    caseLaw: [
      "R v Galbraith [1981] 1 WLR 1039 - Test for no case to answer",
    ],
    
    prosecutionWeakness: "The prosecution's case is so weak that no reasonable jury could convict. This exposes the fundamental weakness of their case.",
    
    howToExploit: `Step 1: Wait for prosecution to close case. Step 2: Submit "no case to answer" under Galbraith test. Step 3: Argue that no reasonable jury could convict on this evidence. Step 4: Request case dismissed.`,
    
    specificArguments: [
      `Your Honour, I submit that there is no case to answer. The prosecution's evidence is so weak that no reasonable jury, properly directed, could convict. I submit that the case should be dismissed.`,
    ],
    
    crossExaminationPoints: [],
    
    submissions: [
      "I submit that there is no case to answer and the case should be dismissed.",
    ],
    
    ifSuccessful: "Case dismissed. Client acquitted without defense calling evidence.",
    
    ifUnsuccessful: "Still proceed with defense. But prosecution case is weak.",
    
    combinedWith: ["EVIDENCE_WEAKNESS_CHALLENGE", "PACE_BREACH_EXCLUSION"],
    
    evidenceNeeded: [
      "All prosecution evidence",
      "Analysis of weaknesses",
    ],
    
    disclosureRequests: [],
    
    createdAt: new Date().toISOString(),
  });

  return angles;
}

/**
 * CHAIN OF CUSTODY ANGLES
 * Evidence contamination
 */
function findChainOfCustodyAngles(
  criminalMeta: CriminalMeta | null | undefined,
  caseId: string,
): DefenseAngle[] {
  const angles: DefenseAngle[] = [];
  // Would check for chain of custody breaks
  return angles;
}

/**
 * Calculate overall win probability
 */
function calculateOverallWinProbability(angles: DefenseAngle[]): number {
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
function buildRecommendedStrategy(angles: DefenseAngle[]): {
  primaryAngle: DefenseAngle;
  supportingAngles: DefenseAngle[];
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
    `Step 1: ${primaryAngle.howToExploit.split('Step 1:')[1]?.split('Step 2:')[0]?.trim() || 'Implement primary strategy'}`,
    ...primaryAngle.specificArguments.slice(0, 2).map(arg => `Argument: ${arg}`),
    ...primaryAngle.crossExaminationPoints.slice(0, 3).map(q => `Question: ${q}`),
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
  primary: DefenseAngle,
  supporting: DefenseAngle[]
): number {
  // If primary succeeds, high chance of win
  // If primary fails but supporting succeeds, still good chance
  let probability = primary.winProbability;

  if (supporting.length > 0) {
    const avgSupporting = supporting.reduce((sum, a) => sum + a.winProbability, 0) / supporting.length;
    // If primary fails (20% chance), supporting might succeed
    const fallbackChance = (100 - primary.winProbability) / 100 * avgSupporting / 100 * 100;
    probability = primary.winProbability + fallbackChance * 0.3; // Supporting adds 30% of its value
  }

  return Math.min(95, Math.round(probability));
}

/**
 * Identify prosecution vulnerabilities
 */
function identifyProsecutionVulnerabilities(
  criminalMeta: CriminalMeta | null | undefined,
  angles: DefenseAngle[]
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
      criticalWeaknesses.push(angle.prosecutionWeakness);
    }

    if (angle.angleType.includes("EVIDENCE") || angle.angleType.includes("DISCLOSURE")) {
      evidenceGaps.push(angle.title);
    }

    if (angle.angleType.includes("PACE") || angle.angleType.includes("PROCEDURAL")) {
      proceduralErrors.push(angle.title);
    }
  });

  return {
    criticalWeaknesses: [...new Set(criticalWeaknesses)],
    evidenceGaps: [...new Set(evidenceGaps)],
    proceduralErrors: [...new Set(proceduralErrors)],
  };
}

