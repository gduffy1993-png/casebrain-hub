/**
 * Criminal Strategy Fight Engine - Deterministic Generators
 * 
 * Provides deterministic templates for:
 * - Route viability assessment
 * - Attack paths
 * - CPS response simulation
 * - Kill switches
 * - Pivot plans
 * - Judicial optics
 * - Evidence impact mapping
 * - Output artifacts
 * 
 * All generators work with or without AI analysis (canGenerateAnalysis flag).
 * When canGenerateAnalysis=false, returns procedural templates with clear labels.
 */

export type RouteViabilityStatus = "VIABLE" | "WEAKENING" | "UNSAFE";

export type RouteViability = {
  status: RouteViabilityStatus;
  reasons: string[];
  evidenceBacked: boolean; // true if based on extracted facts, false if template
};

export type AttackPath = {
  id: string;
  target: string;
  method: string;
  evidenceInputs: string[];
  expectedEffect: string;
  cpsLikelyResponse: string;
  counterResponse: string;
  killSwitch: string;
  next48HoursActions: string[];
  isHypothesis: boolean; // true if pending evidence, false if evidence-backed
};

export type CPSResponse = {
  id: string;
  cpsMove: string;
  defenceCounter: string;
  resultingPressure: string;
};

export type KillSwitch = {
  id: string;
  evidenceEvent: string;
  pivotRecommendation: string;
};

export type PivotPlan = {
  triggers: string[];
  timing: string;
  behaviourChange: {
    stop: string[];
    start: string[];
  };
};

export type JudicialOptics = "attractive" | "neutral" | "risky";

export type EvidenceImpact = {
  item: string;
  attackPaths: string[]; // IDs of attack paths this feeds
  routeViability: {
    routeId: string;
    impact: "strengthens" | "weakens" | "neutral";
  }[];
  urgency: "before_ptph" | "before_trial" | "anytime";
};

export type StrategyArtifact = {
  type: "defence_position" | "disclosure_request" | "case_management_note" | "cps_negotiation_brief";
  title: string;
  content: string;
};

type RouteType = "fight_charge" | "charge_reduction" | "outcome_management";

type CaseDiagnostics = {
  docCount: number;
  rawCharsTotal: number;
  suspectedScanned: boolean;
  textThin: boolean;
};

type ExtractedFacts = {
  hasCCTV?: boolean;
  hasBWV?: boolean;
  hasMG6?: boolean;
  hasCustody?: boolean;
  hasInterview?: boolean;
  has999?: boolean;
  chargeSection?: string; // e.g., "s18", "s20"
  hasWeapon?: boolean;
  hasMedicalEvidence?: boolean;
};

/**
 * Generate route viability based on evidence signals
 */
export function generateRouteViability(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  diagnostics: CaseDiagnostics,
  facts?: ExtractedFacts
): RouteViability {
  if (!canGenerateAnalysis) {
    return {
      status: "VIABLE",
      reasons: ["Pending disclosure review - viability assessment requires full disclosure"],
      evidenceBacked: false,
    };
  }

  // Evidence-backed viability assessment
  const reasons: string[] = [];
  let status: RouteViabilityStatus = "VIABLE";

  switch (routeType) {
    case "fight_charge":
      if (!facts?.hasCCTV && !facts?.hasBWV) {
        reasons.push("Missing visual evidence (CCTV/BWV) - identification challenge may be weaker");
        status = "WEAKENING";
      }
      if (!facts?.hasMG6) {
        reasons.push("Missing MG6 schedules - disclosure position unclear");
        status = "WEAKENING";
      }
      if (facts?.hasCCTV && facts?.hasBWV) {
        reasons.push("Visual evidence available - identification challenge possible");
      }
      if (facts?.hasInterview) {
        reasons.push("Interview evidence present - PACE compliance review required");
      }
      if (facts?.chargeSection === "s18" && !facts?.hasWeapon) {
        reasons.push("s18 charge without weapon evidence - intent challenge viable");
      }
      break;

    case "charge_reduction":
      if (!facts?.hasMedicalEvidence) {
        reasons.push("Missing medical evidence - intent distinction assessment limited");
        status = "WEAKENING";
      }
      if (facts?.chargeSection === "s18" && facts?.hasMedicalEvidence) {
        reasons.push("Medical evidence available - can assess s18 vs s20 intent distinction");
      }
      if (facts?.hasCCTV) {
        reasons.push("CCTV available - sequence/duration analysis possible for intent");
      }
      if (!facts?.hasCCTV && !facts?.hasBWV) {
        reasons.push("No visual evidence - sequence evidence unavailable");
        status = "WEAKENING";
      }
      break;

    case "outcome_management":
      // Outcome management is generally viable if case exists
      reasons.push("Case proceeding - mitigation strategy always available");
      if (facts?.hasInterview) {
        reasons.push("Interview evidence may support early plea position");
      }
      break;
  }

  return {
    status,
    reasons: reasons.length > 0 ? reasons : ["Route appears viable based on available evidence"],
    evidenceBacked: true,
  };
}

/**
 * Generate attack paths for a route
 */
export function generateAttackPaths(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts
): AttackPath[] {
  const paths: AttackPath[] = [];

  switch (routeType) {
    case "fight_charge":
      paths.push({
        id: "ap_fight_001",
        target: "Identification evidence",
        method: "Turnbull challenge - reliability and quality of identification",
        evidenceInputs: canGenerateAnalysis && facts?.hasCCTV ? ["CCTV footage", "VIPER pack"] : ["CCTV footage (pending)", "VIPER pack (pending)"],
        expectedEffect: "Identification evidence excluded or weakened, prosecution case collapses",
        cpsLikelyResponse: "Argue identification is reliable and supported by multiple sources",
        counterResponse: "Apply Turnbull guidelines strictly - if single witness or poor conditions, challenge reliability",
        killSwitch: "Multiple independent witnesses with strong identification under good conditions",
        next48HoursActions: [
          "Request CCTV footage and continuity evidence",
          "Request VIPER pack if identification procedure used",
          "Review identification conditions (lighting, distance, duration, stress)",
          "Assess whether Turnbull warning required",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasCCTV,
      });

      paths.push({
        id: "ap_fight_002",
        target: "Intent (mens rea)",
        method: "Challenge prosecution's ability to prove specific intent beyond reasonable doubt",
        evidenceInputs: canGenerateAnalysis && facts?.hasMedicalEvidence ? ["Medical reports", "CCTV sequence"] : ["Medical reports (pending)", "CCTV sequence (pending)"],
        expectedEffect: "Prosecution cannot prove intent, charge reduced or dismissed",
        cpsLikelyResponse: "Argue intent is clear from circumstances and medical evidence",
        counterResponse: "Medical evidence shows single/brief blow consistent with recklessness, not specific intent",
        killSwitch: "Medical evidence shows sustained/targeted injuries clearly indicating specific intent",
        next48HoursActions: [
          "Request full medical evidence disclosure",
          "Review medical reports for injury pattern (single vs sustained)",
          "Analyse CCTV for sequence/duration (if available)",
          "Prepare intent distinction submissions",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasMedicalEvidence,
      });

      paths.push({
        id: "ap_fight_003",
        target: "PACE compliance",
        method: "Challenge admissibility of interview/custody evidence under PACE",
        evidenceInputs: canGenerateAnalysis && facts?.hasInterview ? ["Interview recording/transcript", "Custody record"] : ["Interview recording (pending)", "Custody record (pending)"],
        expectedEffect: "Interview/custody evidence excluded, prosecution case weakened",
        cpsLikelyResponse: "Argue PACE compliance was adequate and any breaches were minor",
        counterResponse: "PACE breaches are material and render evidence unreliable - apply s78 PACE",
        killSwitch: "PACE compliance confirmed with no material breaches",
        next48HoursActions: [
          "Request interview recording and transcript",
          "Request custody record and PACE compliance documentation",
          "Review for PACE breaches (access to legal advice, appropriate adult, recording issues)",
          "Prepare s78 PACE exclusion application if breaches found",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasInterview,
      });

      paths.push({
        id: "ap_fight_004",
        target: "Disclosure failures",
        method: "Abuse of process application if disclosure failures persist after chase trail",
        evidenceInputs: ["MG6 schedules", "Disclosure requests", "Chase trail"],
        expectedEffect: "Stay of proceedings or material exclusion if disclosure failures are persistent and material",
        cpsLikelyResponse: "Argue disclosure is complete or failures are not material",
        counterResponse: "Disclosure failures are material and persistent despite proper chase - abuse of process",
        killSwitch: "Full disclosure provided with no material gaps",
        next48HoursActions: [
          "Request full MG6 schedules (MG6A, MG6B, MG6C)",
          "Document all disclosure requests and chase trail",
          "Assess materiality of missing items",
          "Prepare abuse of process application only if failures persist after chase",
        ],
        isHypothesis: !canGenerateAnalysis,
      });

      break;

    case "charge_reduction":
      paths.push({
        id: "ap_reduction_001",
        target: "Intent threshold (s18 → s20)",
        method: "Medical evidence analysis - single/brief vs sustained/targeted injuries",
        evidenceInputs: canGenerateAnalysis && facts?.hasMedicalEvidence ? ["Medical reports", "CCTV sequence"] : ["Medical reports (pending)", "CCTV sequence (pending)"],
        expectedEffect: "Court accepts injuries consistent with recklessness (s20) not specific intent (s18)",
        cpsLikelyResponse: "Argue medical evidence supports specific intent based on injury pattern",
        counterResponse: "Medical evidence shows single blow or brief contact - consistent with recklessness",
        killSwitch: "Medical evidence clearly shows sustained/targeted injuries indicating specific intent",
        next48HoursActions: [
          "Request full medical evidence disclosure",
          "Review medical reports for injury pattern analysis",
          "Analyse CCTV for sequence/duration (if available)",
          "Prepare written submissions on intent distinction",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasMedicalEvidence,
      });

      paths.push({
        id: "ap_reduction_002",
        target: "Sequence/duration evidence",
        method: "CCTV analysis - brief contact vs prolonged attack",
        evidenceInputs: canGenerateAnalysis && facts?.hasCCTV ? ["CCTV footage", "Continuity evidence"] : ["CCTV footage (pending)", "Continuity evidence (pending)"],
        expectedEffect: "CCTV shows brief contact supporting recklessness, not prolonged attack supporting intent",
        cpsLikelyResponse: "Argue CCTV shows prolonged or targeted conduct supporting intent",
        counterResponse: "CCTV shows single brief contact - consistent with recklessness not specific intent",
        killSwitch: "CCTV clearly shows prolonged or targeted attack supporting specific intent",
        next48HoursActions: [
          "Request CCTV footage and continuity evidence",
          "Review CCTV for sequence and duration",
          "Assess whether conduct supports intent or recklessness",
          "Prepare case management submissions on charge reduction",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasCCTV,
      });

      paths.push({
        id: "ap_reduction_003",
        target: "Weapon use context",
        method: "Weapon use analysis - duration and targeting",
        evidenceInputs: canGenerateAnalysis && facts?.hasWeapon ? ["Weapon evidence", "CCTV/sequence"] : ["Weapon evidence (pending)", "CCTV/sequence (pending)"],
        expectedEffect: "Weapon use lacks duration/targeting to prove specific intent",
        cpsLikelyResponse: "Argue weapon use demonstrates specific intent",
        counterResponse: "Weapon use was brief/incidental - not sustained/targeted to prove specific intent",
        killSwitch: "Weapon use clearly sustained/targeted indicating specific intent",
        next48HoursActions: [
          "Request weapon evidence disclosure",
          "Review weapon use context (duration, targeting, circumstances)",
          "Assess whether weapon use supports intent or recklessness",
          "Prepare charge reduction negotiation position",
        ],
        isHypothesis: !canGenerateAnalysis || !facts?.hasWeapon,
      });

      break;

    case "outcome_management":
      paths.push({
        id: "ap_outcome_001",
        target: "Early plea credit",
        method: "Guilty plea at earliest opportunity for maximum sentence reduction",
        evidenceInputs: ["Prosecution case strength assessment", "Sentencing guidelines"],
        expectedEffect: "Maximum sentence reduction (up to 1/3) through early plea",
        cpsLikelyResponse: "Accept early plea and recommend reduced sentence",
        counterResponse: "Early plea demonstrates remorse and saves court time - maximum credit",
        killSwitch: "Case is weak and acquittal likely - early plea not in client's interest",
        next48HoursActions: [
          "Assess prosecution case strength realistically",
          "Consider early guilty plea if case is strong",
          "Prepare mitigation package",
          "Review sentencing guidelines for credit calculation",
        ],
        isHypothesis: false, // Always available
      });

      paths.push({
        id: "ap_outcome_002",
        target: "Mitigation evidence",
        method: "Comprehensive mitigation package including character, circumstances, and remorse",
        evidenceInputs: ["Character references", "Personal circumstances", "Employment/health evidence"],
        expectedEffect: "Sentence reduced or non-custodial outcome through strong mitigation",
        cpsLikelyResponse: "Consider mitigation but maintain appropriate sentence",
        counterResponse: "Strong mitigation supports reduced sentence or non-custodial outcome",
        killSwitch: "Mitigation evidence is weak or contradicted",
        next48HoursActions: [
          "Gather character references",
          "Collect personal circumstances evidence (employment, family, health)",
          "Prepare mitigation statement",
          "Review sentencing guidelines for mitigation factors",
        ],
        isHypothesis: false, // Always available
      });

      break;
  }

  return paths;
}

/**
 * Generate CPS response branches
 */
export function generateCPSResponses(routeType: RouteType): CPSResponse[] {
  const responses: CPSResponse[] = [];

  switch (routeType) {
    case "fight_charge":
      responses.push({
        id: "cps_fight_001",
        cpsMove: "Maintain s18 charge and proceed to trial",
        defenceCounter: "Apply for charge reduction to s20 based on intent evidence",
        resultingPressure: "Court may order case management hearing to resolve charge issue",
      });
      responses.push({
        id: "cps_fight_002",
        cpsMove: "Oppose disclosure requests and argue disclosure is complete",
        defenceCounter: "Document chase trail and apply for abuse of process if failures persist",
        resultingPressure: "Court may order disclosure or stay proceedings if failures are material",
      });
      responses.push({
        id: "cps_fight_003",
        cpsMove: "Argue identification is reliable and Turnbull warning not required",
        defenceCounter: "Apply Turnbull guidelines strictly and challenge identification reliability",
        resultingPressure: "Court may exclude identification evidence if reliability is poor",
      });
      break;

    case "charge_reduction":
      responses.push({
        id: "cps_reduction_001",
        cpsMove: "Maintain s18 charge based on medical evidence",
        defenceCounter: "Argue medical evidence supports s20 (recklessness) not s18 (intent)",
        resultingPressure: "Court may order case management hearing or accept reduction",
      });
      responses.push({
        id: "cps_reduction_002",
        cpsMove: "Oppose charge reduction and proceed to trial",
        defenceCounter: "Prepare written submissions on intent distinction for case management",
        resultingPressure: "Court may order reduction before trial or maintain charge",
      });
      responses.push({
        id: "cps_reduction_003",
        cpsMove: "Offer s20 plea deal with reduced sentence",
        defenceCounter: "Accept if favourable, or proceed to trial on intent issue",
        resultingPressure: "Early resolution or trial on intent distinction",
      });
      break;

    case "outcome_management":
      responses.push({
        id: "cps_outcome_001",
        cpsMove: "Accept early guilty plea and recommend reduced sentence",
        defenceCounter: "Maximise plea credit and mitigation evidence",
        resultingPressure: "Early resolution with reduced sentence",
      });
      responses.push({
        id: "cps_outcome_002",
        cpsMove: "Maintain prosecution case and proceed to trial",
        defenceCounter: "Prepare mitigation package and sentencing submissions",
        resultingPressure: "Trial with mitigation focus if conviction",
      });
      responses.push({
        id: "cps_outcome_003",
        cpsMove: "Oppose non-custodial outcome based on seriousness",
        defenceCounter: "Argue mitigation and personal circumstances support non-custodial",
        resultingPressure: "Sentencing hearing with mitigation focus",
      });
      break;
  }

  return responses;
}

/**
 * Generate kill switches for a route
 */
export function generateKillSwitches(routeType: RouteType): KillSwitch[] {
  const switches: KillSwitch[] = [];

  switch (routeType) {
    case "fight_charge":
      switches.push({
        id: "ks_fight_001",
        evidenceEvent: "Full disclosure provided with no material gaps",
        pivotRecommendation: "Pivot to charge reduction or outcome management if disclosure strengthens prosecution case",
      });
      switches.push({
        id: "ks_fight_002",
        evidenceEvent: "Multiple independent witnesses with strong identification under good conditions",
        pivotRecommendation: "Pivot to charge reduction or outcome management - identification challenge unlikely to succeed",
      });
      switches.push({
        id: "ks_fight_003",
        evidenceEvent: "Medical evidence shows sustained/targeted injuries clearly indicating specific intent",
        pivotRecommendation: "Pivot to outcome management - intent challenge unlikely to succeed",
      });
      switches.push({
        id: "ks_fight_004",
        evidenceEvent: "PACE compliance confirmed with no material breaches",
        pivotRecommendation: "Pivot to charge reduction or outcome management - PACE challenge unavailable",
      });
      break;

    case "charge_reduction":
      switches.push({
        id: "ks_reduction_001",
        evidenceEvent: "Medical evidence clearly shows sustained/targeted injuries indicating specific intent",
        pivotRecommendation: "Pivot to outcome management - charge reduction unlikely to succeed",
      });
      switches.push({
        id: "ks_reduction_002",
        evidenceEvent: "CCTV clearly shows prolonged or targeted attack supporting specific intent",
        pivotRecommendation: "Pivot to outcome management - sequence evidence supports intent",
      });
      switches.push({
        id: "ks_reduction_003",
        evidenceEvent: "Weapon use clearly sustained/targeted indicating specific intent",
        pivotRecommendation: "Pivot to outcome management - weapon evidence supports intent",
      });
      break;

    case "outcome_management":
      switches.push({
        id: "ks_outcome_001",
        evidenceEvent: "Case is weak and acquittal likely",
        pivotRecommendation: "Pivot to fight charge - early plea not in client's interest",
      });
      switches.push({
        id: "ks_outcome_002",
        evidenceEvent: "Mitigation evidence is weak or contradicted",
        pivotRecommendation: "Pivot to fight charge or charge reduction - mitigation unlikely to succeed",
      });
      break;
  }

  return switches;
}

/**
 * Generate pivot plan for a route
 */
export function generatePivotPlan(routeType: RouteType): PivotPlan {
  switch (routeType) {
    case "fight_charge":
      return {
        triggers: [
          "Full disclosure provided with no material gaps",
          "Strong identification evidence from multiple sources",
          "Medical evidence clearly supports specific intent",
          "PACE compliance confirmed",
        ],
        timing: "Before PTPH to preserve leverage and plea credit",
        behaviourChange: {
          stop: [
            "Pursuing disclosure-based abuse of process applications",
            "Challenging identification evidence if strong",
            "Challenging intent if medical evidence is clear",
          ],
          start: [
            "Negotiating charge reduction (s18 → s20) if intent is weak",
            "Preparing mitigation package for outcome management",
            "Assessing early plea position if case is strong",
          ],
        },
      };

    case "charge_reduction":
      return {
        triggers: [
          "Medical evidence clearly shows sustained/targeted injuries",
          "CCTV shows prolonged or targeted attack",
          "Weapon evidence clearly supports specific intent",
        ],
        timing: "Before PTPH to preserve plea credit if pivoting to outcome management",
        behaviourChange: {
          stop: [
            "Pursuing charge reduction if intent evidence is strong",
            "Arguing intent distinction if medical/CCTV evidence is clear",
          ],
          start: [
            "Preparing comprehensive mitigation package",
            "Assessing early plea position",
            "Focusing on sentencing position and non-custodial outcome",
          ],
        },
      };

    case "outcome_management":
      return {
        triggers: [
          "Case is weak and acquittal likely",
          "Disclosure failures emerge",
          "Strong defence evidence discovered",
        ],
        timing: "Before PTPH to preserve leverage - early plea credit may be lost if pivoting",
        behaviourChange: {
          stop: [
            "Pursuing early guilty plea if case is weak",
            "Focusing solely on mitigation if acquittal is possible",
          ],
          start: [
            "Challenging prosecution case at trial",
            "Pursuing disclosure-based challenges",
            "Preparing full trial defence",
          ],
        },
      };
  }
}

/**
 * Get judicial optics for an action
 */
export function getJudicialOptics(action: string): JudicialOptics {
  const attractive = [
    "disclosure request",
    "continuity request",
    "written submission",
    "case management",
    "structured request",
  ];
  const risky = [
    "abuse of process without chase",
    "unsubstantiated challenge",
    "frivolous application",
  ];

  const lowerAction = action.toLowerCase();
  if (attractive.some(a => lowerAction.includes(a))) return "attractive";
  if (risky.some(r => lowerAction.includes(r))) return "risky";
  return "neutral";
}

/**
 * Generate evidence impact mapping
 */
export function generateEvidenceImpact(
  missingItems: string[],
  routeType: RouteType,
  attackPaths: AttackPath[]
): EvidenceImpact[] {
  const impact: EvidenceImpact[] = [];

  for (const item of missingItems) {
    const relevantPaths: string[] = [];
    const routeImpacts: { routeId: string; impact: "strengthens" | "weakens" | "neutral" }[] = [];

    // Map items to attack paths
    if (item.toLowerCase().includes("cctv")) {
      relevantPaths.push(...attackPaths.filter(p => p.evidenceInputs.some(e => e.toLowerCase().includes("cctv"))).map(p => p.id));
      routeImpacts.push({ routeId: routeType, impact: "weakens" });
    }
    if (item.toLowerCase().includes("medical") || item.toLowerCase().includes("mg6")) {
      relevantPaths.push(...attackPaths.filter(p => p.evidenceInputs.some(e => e.toLowerCase().includes("medical") || e.toLowerCase().includes("mg6"))).map(p => p.id));
      routeImpacts.push({ routeId: routeType, impact: "weakens" });
    }
    if (item.toLowerCase().includes("interview")) {
      relevantPaths.push(...attackPaths.filter(p => p.evidenceInputs.some(e => e.toLowerCase().includes("interview"))).map(p => p.id));
      routeImpacts.push({ routeId: routeType, impact: "weakens" });
    }

    impact.push({
      item,
      attackPaths: relevantPaths,
      routeViability: routeImpacts,
      urgency: item.toLowerCase().includes("ptph") || item.toLowerCase().includes("disclosure") ? "before_ptph" : "before_trial",
    });
  }

  return impact;
}

/**
 * Generate output artifacts
 */
export function generateArtifacts(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts,
  caseDetails?: { caseId: string; charge?: string; clientName?: string }
): StrategyArtifact[] {
  const artifacts: StrategyArtifact[] = [];
  const caseId = caseDetails?.caseId || "[CASE_ID]";
  const charge = caseDetails?.charge || "[CHARGE]";
  const clientName = caseDetails?.clientName || "[CLIENT_NAME]";

  // Defence Position Snapshot
  artifacts.push({
    type: "defence_position",
    title: "Defence Position Snapshot",
    content: generateDefencePositionSnapshot(routeType, canGenerateAnalysis, facts, { caseId, charge, clientName }),
  });

  // Disclosure Request Pack
  artifacts.push({
    type: "disclosure_request",
    title: "Disclosure Request Pack",
    content: generateDisclosureRequestPack(routeType, canGenerateAnalysis, facts, { caseId, charge, clientName }),
  });

  // Case Management Note
  artifacts.push({
    type: "case_management_note",
    title: "Case Management Note",
    content: generateCaseManagementNote(routeType, canGenerateAnalysis, facts, { caseId, charge, clientName }),
  });

  // CPS Negotiation Brief
  artifacts.push({
    type: "cps_negotiation_brief",
    title: "CPS Negotiation Brief",
    content: generateCPSNegotiationBrief(routeType, canGenerateAnalysis, facts, { caseId, charge, clientName }),
  });

  return artifacts;
}

function generateDefencePositionSnapshot(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts,
  details?: { caseId: string; charge: string; clientName: string }
): string {
  const { caseId, charge, clientName } = details || {};
  
  let content = `DEFENCE POSITION SNAPSHOT\n`;
  content += `Case: ${caseId}\n`;
  content += `Client: ${clientName}\n`;
  content += `Charge: ${charge}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;

  switch (routeType) {
    case "fight_charge":
      content += `PRIMARY STRATEGY: Fight Charge (Full Trial)\n\n`;
      content += `POSITION:\n`;
      content += `- Challenge prosecution case at trial\n`;
      content += `- Target: Acquittal or dismissal\n`;
      content += `- Focus: Evidence, intent, identification, procedural breaches\n\n`;
      if (canGenerateAnalysis && facts) {
        content += `EVIDENCE STATUS:\n`;
        if (facts.hasCCTV) content += `- CCTV: Available\n`;
        if (facts.hasBWV) content += `- BWV: Available\n`;
        if (facts.hasMG6) content += `- MG6: Available\n`;
        if (facts.hasInterview) content += `- Interview: Available (PACE review required)\n`;
      } else {
        content += `EVIDENCE STATUS: Pending disclosure\n`;
      }
      break;

    case "charge_reduction":
      content += `PRIMARY STRATEGY: Charge Reduction (s18 → s20)\n\n`;
      content += `POSITION:\n`;
      content += `- Accept harm occurred but challenge intent threshold\n`;
      content += `- Target: Reduction from s18 to s20 or lesser offence\n`;
      content += `- Focus: Medical evidence, sequence, intent distinction\n\n`;
      if (canGenerateAnalysis && facts) {
        content += `EVIDENCE STATUS:\n`;
        if (facts.hasMedicalEvidence) content += `- Medical evidence: Available\n`;
        if (facts.hasCCTV) content += `- CCTV: Available (sequence analysis)\n`;
      } else {
        content += `EVIDENCE STATUS: Pending disclosure\n`;
      }
      break;

    case "outcome_management":
      content += `PRIMARY STRATEGY: Outcome Management (Plea/Mitigation)\n\n`;
      content += `POSITION:\n`;
      content += `- Focus on sentencing position and mitigation\n`;
      content += `- Target: Reduced sentence or non-custodial outcome\n`;
      content += `- Focus: Early plea, mitigation, character evidence\n\n`;
      break;
  }

  return content;
}

function generateDisclosureRequestPack(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts,
  details?: { caseId: string; charge: string; clientName: string }
): string {
  const { caseId, charge, clientName } = details || {};
  
  let content = `DISCLOSURE REQUEST PACK\n`;
  content += `Case: ${caseId}\n`;
  content += `Client: ${clientName}\n`;
  content += `Charge: ${charge}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;

  content += `REQUESTED ITEMS:\n\n`;

  const items: string[] = [];

  switch (routeType) {
    case "fight_charge":
      items.push("Full MG6 schedules (MG6A, MG6B, MG6C)");
      items.push("CCTV footage and continuity evidence");
      items.push("BWV footage if available");
      items.push("VIPER pack if identification procedure used");
      items.push("Interview recording and transcript");
      items.push("Custody record and PACE compliance documentation");
      items.push("999 call recording if available");
      items.push("All unused material");
      break;

    case "charge_reduction":
      items.push("Full medical evidence and reports");
      items.push("CCTV footage and continuity evidence");
      items.push("Sequence evidence (timeline, duration)");
      items.push("Weapon evidence if applicable");
      items.push("MG6 schedules");
      break;

    case "outcome_management":
      items.push("Full prosecution case bundle");
      items.push("Sentencing guidelines and case law");
      items.push("Previous convictions if applicable");
      break;
  }

  items.forEach((item, idx) => {
    content += `${idx + 1}. ${item}\n`;
  });

  content += `\nURGENCY: Before PTPH\n`;
  content += `CHASE TRAIL: Document all requests and follow-up\n`;

  return content;
}

function generateCaseManagementNote(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts,
  details?: { caseId: string; charge: string; clientName: string }
): string {
  const { caseId, charge, clientName } = details || {};
  
  let content = `CASE MANAGEMENT NOTE\n`;
  content += `Case: ${caseId}\n`;
  content += `Client: ${clientName}\n`;
  content += `Charge: ${charge}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;

  content += `DIRECTIONS SOUGHT:\n\n`;

  switch (routeType) {
    case "fight_charge":
      content += `1. Disclosure directions:\n`;
      content += `   - Order prosecution to provide full MG6 schedules\n`;
      content += `   - Order disclosure of CCTV/BWV footage\n`;
      content += `   - Set deadline for disclosure compliance\n\n`;
      content += `2. Case management:\n`;
      content += `   - List trial date\n`;
      content += `   - Set timetable for defence case statement\n`;
      content += `   - Consider abuse of process application if disclosure failures persist\n\n`;
      break;

    case "charge_reduction":
      content += `1. Charge review:\n`;
      content += `   - Request prosecution review charge (s18 → s20)\n`;
      content += `   - Directions on intent distinction evidence\n\n`;
      content += `2. Case management:\n`;
      content += `   - List case management hearing if charge not reduced\n`;
      content += `   - Set timetable for written submissions on intent\n\n`;
      break;

    case "outcome_management":
      content += `1. Sentencing preparation:\n`;
      content += `   - Directions on mitigation evidence\n`;
      content += `   - Timetable for character references\n\n`;
      content += `2. Case management:\n`;
      content += `   - Consider early guilty plea if appropriate\n`;
      content += `   - List sentencing hearing if plea entered\n\n`;
      break;
  }

  return content;
}

function generateCPSNegotiationBrief(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  facts?: ExtractedFacts,
  details?: { caseId: string; charge: string; clientName: string }
): string {
  const { caseId, charge, clientName } = details || {};
  
  let content = `CPS NEGOTIATION BRIEF\n`;
  content += `Case: ${caseId}\n`;
  content += `Client: ${clientName}\n`;
  content += `Charge: ${charge}\n`;
  content += `Date: ${new Date().toLocaleDateString()}\n\n`;

  content += `NEGOTIATION POSITION:\n\n`;

  switch (routeType) {
    case "fight_charge":
      content += `RATIONALE FOR DOWNSGRADE:\n`;
      content += `- Evidence gaps in prosecution case\n`;
      content += `- Identification evidence may be challengeable\n`;
      content += `- Intent may not be provable beyond reasonable doubt\n`;
      content += `- Disclosure position unclear\n\n`;
      content += `PROPOSED OUTCOME:\n`;
      content += `- Consider charge reduction (s18 → s20) or lesser offence\n`;
      content += `- Alternative: Dismissal if evidence gaps are material\n\n`;
      break;

    case "charge_reduction":
      content += `RATIONALE FOR DOWNSGRADE:\n`;
      content += `- Medical evidence supports recklessness (s20) not specific intent (s18)\n`;
      if (canGenerateAnalysis && facts?.hasCCTV) {
        content += `- CCTV sequence shows brief contact, not prolonged attack\n`;
      }
      content += `- Intent distinction favours s20 charge\n\n`;
      content += `PROPOSED OUTCOME:\n`;
      content += `- Accept s20 plea with reduced sentence\n`;
      content += `- Alternative: Proceed to trial on intent issue\n\n`;
      break;

    case "outcome_management":
      content += `RATIONALE FOR SENTENCE REDUCTION:\n`;
      content += `- Early guilty plea (maximum credit)\n`;
      content += `- Strong mitigation evidence\n`;
      content += `- Personal circumstances support non-custodial outcome\n\n`;
      content += `PROPOSED OUTCOME:\n`;
      content += `- Reduced sentence or non-custodial outcome\n`;
      content += `- Consider suspended sentence or community order\n\n`;
      break;
  }

  return content;
}

