/**
 * Criminal Strategy Fight Engine - Deterministic Generators
 * All generators work even when canGenerateAnalysis=false (using procedural templates)
 */

import type {
  RouteType,
  RouteViability,
  AttackPath,
  CPSResponse,
  KillSwitch,
  PivotPlan,
  JudicialOpticsCallout,
  EvidenceImpact,
  StrategyArtifact,
  StrategyRoute,
} from "./strategy-fight-types";
import type { ResidualAttackScan } from "./residual-attack-scanner";

export function generateRouteViability(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  diagnostics?: {
    docCount: number;
    rawCharsTotal: number;
    suspectedScanned: boolean;
    textThin: boolean;
  }
): RouteViability {
  if (!canGenerateAnalysis) {
    return {
      status: "VIABLE",
      reasons: ["Analysis gated – using procedural templates. Viability assessment pending disclosure completion."],
      evidenceBacked: false,
    };
  }

  const hasDocuments = (diagnostics?.docCount || 0) > 0;
  const hasText = (diagnostics?.rawCharsTotal || 0) > 800;

  if (!hasDocuments) {
    return {
      status: "WEAKENING",
      reasons: ["No documents uploaded. Cannot assess viability without case materials."],
      evidenceBacked: true,
    };
  }

  if (!hasText || diagnostics?.suspectedScanned || diagnostics?.textThin) {
    return {
      status: "WEAKENING",
      reasons: ["Insufficient extractable text. Viability assessment limited until full disclosure received."],
      evidenceBacked: true,
    };
  }

  return {
    status: "VIABLE",
    reasons: ["Sufficient text extracted for preliminary viability assessment. Full assessment requires complete disclosure."],
    evidenceBacked: true,
  };
}

export function generateAttackPaths(routeType: RouteType, canGenerateAnalysis: boolean): AttackPath[] {
  const paths: Record<RouteType, Omit<AttackPath, "id" | "evidenceBacked">[]> = {
    fight_charge: [
      {
        target: "Identification evidence",
        method: "Challenge under Turnbull guidelines – request VIPER pack, CCTV continuity, and identification procedure compliance",
        evidenceInputs: ["VIPER pack", "CCTV footage", "Identification procedure records", "MG6C"],
        expectedEffect: "Identification evidence excluded or weakened, prosecution case collapses",
        cpsLikelyResponse: "Prosecution will argue identification is reliable and procedure was compliant",
        counterResponse: "Request full disclosure of identification procedure, challenge any breaches, and seek exclusion if procedure was flawed",
        killSwitch: "Strong identification evidence with compliant procedure and multiple witnesses",
        next48HoursActions: [
          "Request VIPER pack and CCTV continuity",
          "Review identification procedure for Turnbull compliance",
          "Draft identification challenge if breaches found",
        ],
      },
      {
        target: "Disclosure failures",
        method: "Build chase trail for missing disclosure, then apply for stay or exclusion if failures persist",
        evidenceInputs: ["MG6C", "MG6 schedules", "Unused material schedules", "CCTV continuity", "999 call recording"],
        expectedEffect: "Stay of proceedings or exclusion of evidence if disclosure failures are material and persistent",
        cpsLikelyResponse: "Prosecution will claim disclosure is complete or provide late disclosure",
        counterResponse: "Demonstrate materiality of missing items and persistence of failures despite chase trail",
        killSwitch: "Full disclosure provided promptly with no material gaps",
        next48HoursActions: [
          "Request all outstanding disclosure items",
          "Document chase trail (requested_at, chased_at)",
          "Assess materiality of missing items",
        ],
      },
      {
        target: "PACE breaches",
        method: "Identify PACE breaches in custody/interview procedures, seek exclusion under s76/s78 PACE",
        evidenceInputs: ["Custody records", "Interview recording/transcript", "Solicitor attendance records", "PACE compliance records"],
        expectedEffect: "Interview/custody evidence excluded, prosecution case weakened or collapses",
        cpsLikelyResponse: "Prosecution will argue breaches are minor and not material",
        counterResponse: "Demonstrate materiality of breaches and impact on fairness of proceedings",
        killSwitch: "No PACE breaches found or breaches are minor and non-material",
        next48HoursActions: [
          "Review custody records for PACE compliance",
          "Review interview recording/transcript for breaches",
          "Draft PACE exclusion application if breaches found",
        ],
      },
    ],
    charge_reduction: [
      {
        target: "Intent threshold (s18 vs s20)",
        method: "Challenge specific intent by demonstrating recklessness rather than intent to cause GBH",
        evidenceInputs: ["Medical reports", "CCTV footage", "Sequence/duration evidence", "Circumstances of incident"],
        expectedEffect: "Charge reduced from s18 (specific intent) to s20 (recklessness) or lesser offence",
        cpsLikelyResponse: "Prosecution will argue intent is clear from conduct and medical evidence",
        counterResponse: "Demonstrate injuries are consistent with single/brief blow, not sustained/targeted conduct",
        killSwitch: "Medical evidence shows sustained/targeted injuries supporting specific intent",
        next48HoursActions: [
          "Request medical reports and assess injury pattern",
          "Review CCTV/sequence evidence for duration and targeting",
          "Prepare charge reduction negotiation (s18 → s20)",
        ],
      },
      {
        target: "Weapon use and duration",
        method: "Challenge weapon use as supporting specific intent by showing lack of duration/targeting",
        evidenceInputs: ["CCTV footage", "Witness statements", "Weapon evidence", "Sequence evidence"],
        expectedEffect: "Weapon use does not support s18 intent, charge reduced to s20",
        cpsLikelyResponse: "Prosecution will argue weapon use demonstrates specific intent",
        counterResponse: "Demonstrate weapon use was brief/incidental, not sustained/targeted",
        killSwitch: "CCTV/evidence shows prolonged weapon use with clear targeting",
        next48HoursActions: [
          "Review CCTV for weapon use duration and targeting",
          "Analyse sequence evidence for intent indicators",
          "Prepare argument for s20 rather than s18",
        ],
      },
    ],
    outcome_management: [
      {
        target: "Early plea credit",
        method: "Enter early guilty plea to maximize sentence reduction (up to 1/3 credit)",
        evidenceInputs: ["Full disclosure", "Prosecution case assessment", "Client instructions"],
        expectedEffect: "Maximum sentence reduction through early plea credit",
        cpsLikelyResponse: "Prosecution will accept early plea and recommend credit",
        counterResponse: "Ensure plea is entered before PTPH to maximize credit",
        killSwitch: "Case is weak and should be fought rather than pleaded",
        next48HoursActions: [
          "Assess prosecution case strength",
          "Obtain client instructions on plea",
          "Prepare early plea if appropriate",
        ],
      },
      {
        target: "Mitigation package",
        method: "Prepare comprehensive mitigation including character references, personal circumstances, and remorse",
        evidenceInputs: ["Character references", "Employment records", "Medical records", "Personal circumstances"],
        expectedEffect: "Sentence reduced through mitigation or non-custodial outcome",
        cpsLikelyResponse: "Prosecution will accept mitigation but may still seek custodial sentence",
        counterResponse: "Present strong mitigation package and argue for non-custodial outcome",
        killSwitch: "Mitigation is weak or contradicted by evidence",
        next48HoursActions: [
          "Gather character references",
          "Collect personal circumstances evidence",
          "Prepare mitigation statement",
        ],
      },
    ],
  };

  return (paths[routeType] || []).map((path, idx) => ({
    ...path,
    id: `${routeType}_attack_${idx + 1}`,
    evidenceBacked: canGenerateAnalysis,
  }));
}

export function generateCPSResponses(routeType: RouteType): CPSResponse[] {
  const responses: Record<RouteType, Omit<CPSResponse, "id">[]> = {
    fight_charge: [
      {
        cpsMove: "Prosecution will seek to maintain charge and oppose disclosure/stay applications",
        defenceCounter: "Demonstrate materiality of missing disclosure and persistence of failures despite chase trail",
        resultingPressureOutcome: "Court may order disclosure or consider stay if failures persist",
      },
      {
        cpsMove: "Prosecution will argue identification is reliable and procedure was compliant",
        defenceCounter: "Challenge identification under Turnbull guidelines and seek exclusion if procedure was flawed",
        resultingPressureOutcome: "Identification evidence may be excluded or weakened",
      },
      {
        cpsMove: "Prosecution will argue PACE breaches are minor and not material",
        defenceCounter: "Demonstrate materiality of breaches and impact on fairness",
        resultingPressureOutcome: "Interview/custody evidence may be excluded under s76/s78 PACE",
      },
    ],
    charge_reduction: [
      {
        cpsMove: "Prosecution will argue intent is clear from conduct and medical evidence",
        defenceCounter: "Demonstrate injuries are consistent with single/brief blow, not sustained/targeted",
        resultingPressureOutcome: "Court may accept charge reduction to s20 if intent is not clear",
      },
      {
        cpsMove: "Prosecution will argue weapon use demonstrates specific intent",
        defenceCounter: "Demonstrate weapon use was brief/incidental, not sustained/targeted",
        resultingPressureOutcome: "Weapon use may not support s18 intent, charge reduced to s20",
      },
    ],
    outcome_management: [
      {
        cpsMove: "Prosecution will accept early plea and recommend credit",
        defenceCounter: "Ensure plea is entered before PTPH to maximize credit",
        resultingPressureOutcome: "Maximum sentence reduction through early plea credit",
      },
      {
        cpsMove: "Prosecution will accept mitigation but may still seek custodial sentence",
        defenceCounter: "Present strong mitigation package and argue for non-custodial outcome",
        resultingPressureOutcome: "Sentence may be reduced or non-custodial outcome achieved",
      },
    ],
  };

  return (responses[routeType] || []).map((resp, idx) => ({
    ...resp,
    id: `${routeType}_cps_${idx + 1}`,
  }));
}

export function generateKillSwitches(routeType: RouteType): KillSwitch[] {
  const switches: Record<RouteType, Omit<KillSwitch, "id">[]> = {
    fight_charge: [
      {
        trigger: "Strong identification evidence with compliant procedure and multiple witnesses",
        pivotRecommendation: "Consider charge reduction strategy if identification is strong",
      },
      {
        trigger: "Full disclosure provided promptly with no material gaps",
        pivotRecommendation: "Reassess strategy – disclosure path may not be viable",
      },
      {
        trigger: "No PACE breaches found or breaches are minor and non-material",
        pivotRecommendation: "Focus on other attack paths (identification, evidence gaps)",
      },
    ],
    charge_reduction: [
      {
        trigger: "Medical evidence shows sustained/targeted injuries supporting specific intent",
        pivotRecommendation: "Consider outcome management strategy if s18 intent is clear",
      },
      {
        trigger: "CCTV/evidence shows prolonged weapon use with clear targeting",
        pivotRecommendation: "Reassess strategy – s18 intent may be difficult to challenge",
      },
    ],
    outcome_management: [
      {
        trigger: "Case is weak and should be fought rather than pleaded",
        pivotRecommendation: "Switch to fight charge strategy if case is weak",
      },
      {
        trigger: "Mitigation is weak or contradicted by evidence",
        pivotRecommendation: "Focus on early plea credit rather than mitigation",
      },
    ],
  };

  return (switches[routeType] || []).map((ks, idx) => ({
    ...ks,
    id: `${routeType}_kill_${idx + 1}`,
  }));
}

export function generatePivotPlan(routeType: RouteType): PivotPlan {
  const plans: Record<RouteType, PivotPlan> = {
    fight_charge: {
      triggers: [
        "Strong identification evidence with compliant procedure",
        "Full disclosure provided with no material gaps",
        "No PACE breaches or breaches are minor",
      ],
      timing: "Before PTPH to preserve leverage and avoid plea credit loss",
      behaviourChange: {
        stop: [
          "Pursuing disclosure/stay applications if disclosure is complete",
          "Challenging identification if evidence is strong and compliant",
          "Pursuing PACE exclusion if no breaches found",
        ],
        start: [
          "Negotiating charge reduction if identification is strong",
          "Preparing mitigation package if case is strong",
          "Assessing early plea if disclosure is complete and case is strong",
        ],
      },
    },
    charge_reduction: {
      triggers: [
        "Medical evidence shows sustained/targeted injuries",
        "CCTV shows prolonged weapon use with clear targeting",
        "Prosecution maintains s18 charge despite negotiation",
      ],
      timing: "Before PTPH to preserve leverage and plea credit",
      behaviourChange: {
        stop: [
          "Pursuing charge reduction if s18 intent is clear",
          "Negotiating s18 → s20 if medical evidence supports s18",
        ],
        start: [
          "Preparing mitigation package for s18 conviction",
          "Assessing early plea if s18 is likely",
          "Focusing on outcome management if charge reduction fails",
        ],
      },
    },
    outcome_management: {
      triggers: [
        "Case is weak and should be fought",
        "Mitigation is weak or contradicted",
        "Client wants to fight rather than plead",
      ],
      timing: "Before PTPH to preserve plea credit and leverage",
      behaviourChange: {
        stop: [
          "Pursuing early plea if case is weak",
          "Focusing on mitigation if case should be fought",
        ],
        start: [
          "Preparing disclosure requests and identification challenges",
          "Assessing PACE compliance",
          "Building fight charge strategy if case is weak",
        ],
      },
    },
  };

  return plans[routeType] || {
    triggers: [],
    timing: "Before PTPH to preserve leverage",
    behaviourChange: { stop: [], start: [] },
  };
}

export function generateJudicialOptics(routeType: RouteType): JudicialOpticsCallout[] {
  const optics: Record<RouteType, JudicialOpticsCallout[]> = {
    fight_charge: [
      {
        action: "Disclosure requests with clear chase trail",
        optics: "attractive",
        reason: "Court values structured, documented disclosure requests",
      },
      {
        action: "Continuity requests for CCTV/evidence",
        optics: "attractive",
        reason: "Standard procedural requests are judicially attractive",
      },
      {
        action: "Abuse of process application without chase trail",
        optics: "risky",
        reason: "Court may view as premature without clear chase trail",
      },
      {
        action: "Structured written submissions",
        optics: "attractive",
        reason: "Court values clear, structured written submissions",
      },
    ],
    charge_reduction: [
      {
        action: "Charge reduction negotiation before PTPH",
        optics: "attractive",
        reason: "Court values early resolution and case management",
      },
      {
        action: "Structured written submissions for charge reduction",
        optics: "attractive",
        reason: "Court values clear, structured submissions",
      },
    ],
    outcome_management: [
      {
        action: "Early plea with maximum credit",
        optics: "attractive",
        reason: "Court values early resolution and sentence reduction",
      },
      {
        action: "Comprehensive mitigation package",
        optics: "attractive",
        reason: "Court values thorough mitigation preparation",
      },
    ],
  };

  return optics[routeType] || [];
}

export function generateEvidenceImpact(routeType: RouteType): EvidenceImpact[] {
  const impactMap: Record<string, { paths: string[]; routes: RouteType[]; urgency: "before_ptph" | "before_trial" | "anytime" }> = {
    "CCTV footage": {
      paths: ["fight_charge_attack_1", "charge_reduction_attack_1", "charge_reduction_attack_2"],
      routes: ["fight_charge", "charge_reduction"],
      urgency: "before_ptph",
    },
    "BWV footage": {
      paths: ["fight_charge_attack_1", "fight_charge_attack_2"],
      routes: ["fight_charge"],
      urgency: "before_ptph",
    },
    "MG6C": {
      paths: ["fight_charge_attack_2"],
      routes: ["fight_charge"],
      urgency: "before_ptph",
    },
    "MG6 schedules": {
      paths: ["fight_charge_attack_2"],
      routes: ["fight_charge"],
      urgency: "before_ptph",
    },
    "Custody records": {
      paths: ["fight_charge_attack_3"],
      routes: ["fight_charge"],
      urgency: "before_trial",
    },
    "Interview recording/transcript": {
      paths: ["fight_charge_attack_3"],
      routes: ["fight_charge"],
      urgency: "before_trial",
    },
    "999 call recording": {
      paths: ["fight_charge_attack_2"],
      routes: ["fight_charge"],
      urgency: "before_ptph",
    },
    "VIPER pack": {
      paths: ["fight_charge_attack_1"],
      routes: ["fight_charge"],
      urgency: "before_ptph",
    },
  };

  const commonItems = [
    "CCTV footage",
    "BWV footage",
    "MG6C",
    "MG6 schedules",
    "Custody records",
    "Interview recording/transcript",
    "999 call recording",
    "VIPER pack",
  ];

  return commonItems
    .filter((item) => impactMap[item]?.routes.includes(routeType))
    .map((item) => ({
      missingItem: item,
      attackPathsAffected: impactMap[item]?.paths || [],
      routeViabilityAffected: impactMap[item]?.routes || [],
      urgency: impactMap[item]?.urgency || "anytime",
    }));
}

export function generateArtifacts(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  caseFacts?: {
    caseTitle?: string;
    charges?: string[];
    clientName?: string;
  },
  strategicIntelligence?: {
    recommendation?: {
      confidence: string;
      rationale: string;
      flipConditions: Array<{ evidenceEvent: string; flipsTo: RouteType; why: string }>;
    };
    timePressure?: {
      currentLeverage: string;
      leverageExplanation: string;
    };
    evidenceImpact?: Array<{ evidenceItem: { name: string }; impactOnDefence: string }>;
  }
): StrategyArtifact[] {
  const artifacts: StrategyArtifact[] = [];

  artifacts.push({
    type: "defence_position",
    title: "Defence Position Snapshot",
    content: `DEFENCE POSITION SNAPSHOT
Case: ${caseFacts?.caseTitle || "[Case Title]"}
Date: ${new Date().toLocaleDateString("en-GB")}

PRIMARY STRATEGY: ${routeType === "fight_charge" ? "Fight Charge (Full Trial)" : routeType === "charge_reduction" ? "Charge Reduction (s18 → s20)" : "Outcome Management (Plea/Mitigation)"}

${strategicIntelligence?.recommendation ? `CONFIDENCE: ${strategicIntelligence.recommendation.confidence}\nRATIONALE: ${strategicIntelligence.recommendation.rationale}\n\n` : ""}KEY POSITIONS:
${routeType === "fight_charge" ? "- Challenge identification evidence under Turnbull guidelines\n- Pursue disclosure failures with chase trail\n- Assess PACE compliance for exclusion" : routeType === "charge_reduction" ? "- Challenge intent threshold (s18 vs s20)\n- Focus on medical evidence and sequence\n- Negotiate charge reduction before PTPH" : "- Maximize early plea credit\n- Prepare comprehensive mitigation\n- Focus on sentencing position"}

${strategicIntelligence?.timePressure ? `TIME PRESSURE: ${strategicIntelligence.timePressure.currentLeverage.toUpperCase()} leverage\n${strategicIntelligence.timePressure.leverageExplanation}\n\n` : ""}${strategicIntelligence?.recommendation && strategicIntelligence.recommendation.flipConditions.length > 0 ? `FLIP CONDITIONS:\n${strategicIntelligence.recommendation.flipConditions.map(fc => `- If ${fc.evidenceEvent} → ${fc.why}`).join("\n")}\n\n` : ""}${canGenerateAnalysis ? "[Facts from extracted documents would be inserted here]" : "[Analysis gated – using procedural templates. Complete disclosure required for full position.]"}`,
  });

  artifacts.push({
    type: "disclosure_request",
    title: "Disclosure Request Pack",
    content: `DISCLOSURE REQUEST
Case: ${caseFacts?.caseTitle || "[Case Title]"}
Date: ${new Date().toLocaleDateString("en-GB")}

REQUESTED ITEMS:
1. Full MG6C and MG6 schedules
2. CCTV footage and continuity
3. BWV footage
4. VIPER pack and identification procedure records
5. Custody records
6. Interview recording/transcript
7. 999 call recording
8. Unused material schedules

${canGenerateAnalysis ? "[Specific items based on case would be listed here]" : "[Standard disclosure request. Review case-specific requirements.]"}`,
  });

  artifacts.push({
    type: "case_management_note",
    title: "Case Management Note",
    content: `CASE MANAGEMENT NOTE
Case: ${caseFacts?.caseTitle || "[Case Title]"}
Date: ${new Date().toLocaleDateString("en-GB")}

DIRECTIONS SOUGHT:
1. Disclosure to be provided by [date]
2. Defence to serve [application/response] by [date]
3. Next hearing: [PTPH/Trial]

${canGenerateAnalysis ? "[Specific directions based on case would be listed here]" : "[Standard case management directions. Review case-specific requirements.]"}`,
  });

  if (routeType === "charge_reduction") {
    artifacts.push({
      type: "cps_negotiation_brief",
      title: "CPS Negotiation Brief (Charge Reduction)",
      content: `CPS NEGOTIATION BRIEF
Case: ${caseFacts?.caseTitle || "[Case Title]"}
Date: ${new Date().toLocaleDateString("en-GB")}

CHARGE REDUCTION RATIONALE:
- Medical evidence shows injuries consistent with single/brief blow
- Sequence evidence does not support sustained/targeted conduct
- Intent threshold for s18 not met – s20 more appropriate

PROPOSED RESOLUTION:
- Accept s20 plea in lieu of s18
- Early plea credit preserved
- Case management efficiency

${canGenerateAnalysis ? "[Specific rationale based on case facts would be inserted here]" : "[Standard charge reduction rationale. Review case-specific evidence.]"}`,
    });
  }

  return artifacts;
}

export function generateStrategyRoute(
  routeType: RouteType,
  canGenerateAnalysis: boolean,
  diagnostics?: {
    docCount: number;
    rawCharsTotal: number;
    suspectedScanned: boolean;
    textThin: boolean;
  },
  caseFacts?: {
    caseTitle?: string;
    charges?: string[];
    clientName?: string;
  }
): StrategyRoute {
  const baseRoutes: Record<RouteType, Omit<StrategyRoute, "viability" | "attackPaths" | "cpsResponses" | "killSwitches" | "pivotPlan" | "judicialOptics">> = {
    fight_charge: {
      id: "fight_charge",
      type: "fight_charge",
      title: "Fight Charge (Full Trial Strategy)",
      rationale: "Challenge the prosecution case at trial. Target acquittal or dismissal by attacking evidence, intent, and identification. This strategy requires strong disclosure position and evidence gaps to succeed.",
      winConditions: [
        "Prosecution fails to prove intent beyond reasonable doubt",
        "Identification evidence is successfully challenged or excluded under Turnbull guidelines",
        "Disclosure failures result in stay or material exclusion (only if failures persist after clear chase trail)",
        "PACE breaches result in exclusion of interview or custody evidence",
        "Evidence gaps prevent prosecution from establishing case to answer",
      ],
      risks: [
        "If disclosure gaps are filled, prosecution case may strengthen",
        "Identification evidence may be strong and withstand challenge",
        "Full trial preparation required (time and cost)",
        "Risk of conviction if prosecution case is strong",
      ],
      nextActions: [
        "Request full disclosure including CCTV, MG6 schedules, and unused material",
        "Review all evidence for identification reliability under Turnbull guidelines",
        "Assess PACE compliance and potential exclusion of interview/custody evidence",
        "Prepare disclosure requests for missing material (MG6C, CCTV continuity, VIPER pack)",
        "Draft abuse of process application if disclosure failures persist after chase",
      ],
    },
    charge_reduction: {
      id: "charge_reduction",
      type: "charge_reduction",
      title: "Charge Reduction (s18 → s20)",
      rationale: "Accept harm occurred but challenge intent threshold. Target reduction from s18 (specific intent) to s20 (recklessness) or lesser offence. This strategy focuses on medical evidence, sequence/duration, and intent distinction.",
      winConditions: [
        "Prosecution cannot articulate s18 intent beyond reasonable doubt",
        "Medical evidence shows injuries consistent with single/brief blow (not sustained/targeted)",
        "CCTV/sequence evidence shows no prolonged or targeted conduct",
        "Weapon use lacks duration/targeting to prove specific intent",
        "Court accepts proportional downgrade to s20 under case management",
      ],
      risks: [
        "Medical evidence may support sustained/targeted conduct",
        "CCTV/sequence may show prolonged attack supporting intent",
        "Prosecution may maintain s18 charge if intent is strong",
        "Court may decline downgrade if evidence supports specific intent",
      ],
      nextActions: [
        "Request disclosure focusing on medical evidence and circumstances of incident",
        "Review medical reports to assess whether injuries support s18 (specific intent) or s20 (recklessness)",
        "Analyse CCTV/sequence evidence for duration and targeting (key to intent distinction)",
        "Gather evidence supporting recklessness rather than specific intent",
        "Prepare case for charge reduction negotiation (s18 → s20) before PTPH",
      ],
    },
    outcome_management: {
      id: "outcome_management",
      type: "outcome_management",
      title: "Outcome Management (Plea / Mitigation)",
      rationale: "Focus on sentencing position and mitigation. Target reduced sentence or non-custodial outcome. This strategy accepts conviction risk but minimizes sentence through early plea, mitigation, and character evidence.",
      winConditions: [
        "Mitigation evidence reduces sentence length",
        "Character references and personal circumstances support non-custodial outcome",
        "Early plea credit and cooperation reduce sentence",
        "Sentencing guidelines applied favourably",
      ],
      risks: [
        "Mitigation may fail to reduce sentence significantly",
        "Sentencing guidelines may require custodial sentence",
        "Character evidence may be insufficient or contradicted",
        "Court may impose maximum or near-maximum sentence",
      ],
      nextActions: [
        "Request disclosure to assess prosecution case strength and realistic prospects",
        "Consider early guilty plea if case is strong (maximum sentence reduction)",
        "Prepare comprehensive mitigation package including character references",
        "Gather personal circumstances evidence (employment, family, health, remorse)",
        "Review sentencing guidelines and identify factors supporting non-custodial outcome",
      ],
    },
  };

  const base = baseRoutes[routeType];

  return {
    ...base,
    viability: generateRouteViability(routeType, canGenerateAnalysis, diagnostics),
    attackPaths: generateAttackPaths(routeType, canGenerateAnalysis),
    cpsResponses: generateCPSResponses(routeType),
    killSwitches: generateKillSwitches(routeType),
    pivotPlan: generatePivotPlan(routeType),
    judicialOptics: generateJudicialOptics(routeType),
  };
}

