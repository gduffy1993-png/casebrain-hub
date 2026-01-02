/**
 * Deterministic generators for Criminal Strategy Fight Engine
 * All layers generate templates that work even when canGenerateAnalysis=false
 * When canGenerateAnalysis=true, these can be enriched with extracted facts
 */

import type {
  RouteType,
  RouteViability,
  AttackPath,
  CPSResponse,
  KillSwitch,
  PivotPlan,
  EvidenceImpact,
  StrategyArtifacts,
  DefencePositionSnapshot,
  DisclosureRequestPack,
  CaseManagementNote,
  CPSNegotiationBrief,
  ExtendedStrategyRoute,
} from "./strategy-fight-engine-types";

type GeneratorContext = {
  canGenerateAnalysis: boolean;
  diagnostics?: {
    docCount: number;
    rawCharsTotal: number;
    suspectedScanned?: boolean;
    textThin?: boolean;
  };
  extractedFacts?: {
    charges?: Array<{ offence: string; section?: string }>;
    hasCCTV?: boolean;
    hasMG6C?: boolean;
    hasInterview?: boolean;
    hasCustody?: boolean;
    has999?: boolean;
    hasBWV?: boolean;
  };
};

/**
 * LAYER 1: Route Viability
 * Generate viability status and reasons for each route
 */
export function generateRouteViability(
  routeType: RouteType,
  context: GeneratorContext
): RouteViability {
  const { canGenerateAnalysis, extractedFacts } = context;

  if (!canGenerateAnalysis) {
    // Template viability when gated
    return {
      status: "VIABLE",
      reasons: [
        "Analysis gated – using procedural templates",
        "Pending disclosure completion to assess viability",
        "Route remains available pending evidence review",
      ],
      evidenceBacked: false,
    };
  }

  // Evidence-backed viability (can be enriched with extracted facts)
  const reasons: string[] = [];
  let status: "VIABLE" | "WEAKENING" | "UNSAFE" = "VIABLE";

  switch (routeType) {
    case "fight_charge":
      if (extractedFacts?.hasCCTV || extractedFacts?.hasMG6C) {
        reasons.push("Disclosure appears present (CCTV/MG6C detected)");
        reasons.push("Evidence available for identification challenge");
      } else {
        reasons.push("Disclosure gaps detected – may support abuse of process if chased");
        status = "WEAKENING";
      }
      if (extractedFacts?.hasInterview) {
        reasons.push("Interview evidence present – assess PACE compliance");
      }
      break;

    case "charge_reduction":
      if (extractedFacts?.charges?.some((c) => c.section === "18")) {
        reasons.push("s18 charge detected – intent distinction available");
        reasons.push("Medical evidence review required to assess intent threshold");
      } else {
        reasons.push("Charge type unclear – review charge details");
        status = "WEAKENING";
      }
      break;

    case "outcome_management":
      reasons.push("Mitigation strategy always available");
      reasons.push("Early plea credit available if case is strong");
      break;
  }

  return {
    status,
    reasons: reasons.length > 0 ? reasons : ["Route available pending evidence review"],
    evidenceBacked: canGenerateAnalysis,
  };
}

/**
 * LAYER 2: Attack Paths
 * Generate 2-5 attack paths per route using deterministic templates
 */
export function generateAttackPaths(
  routeType: RouteType,
  context: GeneratorContext
): AttackPath[] {
  const { canGenerateAnalysis, extractedFacts } = context;
  const isHypothesis = !canGenerateAnalysis;

  switch (routeType) {
    case "fight_charge":
      return [
        {
          id: "attack-identification",
          target: "Identification evidence",
          method: "Challenge under Turnbull guidelines – reliability, opportunity, description",
          evidenceInputs: extractedFacts?.hasCCTV
            ? ["CCTV footage", "VIPER pack", "Witness statements"]
            : ["CCTV footage (pending)", "VIPER pack (pending)", "Witness statements"],
          expectedEffect: "Identification excluded or weakened, prosecution case collapses",
          cpsLikelyResponse: "CPS will rely on multiple witnesses and CCTV continuity",
          counterResponse: "Challenge witness reliability and CCTV continuity chain",
          killSwitch: "Strong multi-witness identification with CCTV confirmation",
          next48HoursActions: [
            "Request CCTV footage and continuity",
            "Request VIPER pack",
            "Review witness statements for Turnbull compliance",
          ],
          isHypothesis,
        },
        {
          id: "attack-intent",
          target: "Specific intent (s18)",
          method: "Challenge intent threshold – show recklessness not specific intent",
          evidenceInputs: extractedFacts?.hasMG6C
            ? ["Medical reports", "MG6C", "CCTV sequence"]
            : ["Medical reports (pending)", "MG6C (pending)", "CCTV sequence (pending)"],
          expectedEffect: "Intent downgraded to s20 or lesser, charge reduced",
          cpsLikelyResponse: "CPS will maintain s18 based on weapon use and targeting",
          counterResponse: "Show single/brief blow, no sustained targeting, weapon incidental",
          killSwitch: "Medical evidence shows sustained/targeted injuries",
          next48HoursActions: [
            "Request medical reports",
            "Request MG6C and CCTV",
            "Analyse sequence for duration/targeting",
          ],
          isHypothesis,
        },
        {
          id: "attack-pace",
          target: "PACE compliance",
          method: "Challenge interview/custody procedures – exclusion under s76/s78 PACE",
          evidenceInputs: extractedFacts?.hasInterview
            ? ["Interview transcript/recording", "Custody records", "Solicitor attendance"]
            : ["Interview transcript/recording (pending)", "Custody records (pending)"],
          expectedEffect: "Interview excluded, prosecution case weakened",
          cpsLikelyResponse: "CPS will assert PACE compliance",
          counterResponse: "Identify breaches: no solicitor, no caution, no access to codes",
          killSwitch: "Full PACE compliance with solicitor attendance",
          next48HoursActions: [
            "Request interview transcript/recording",
            "Request custody records",
            "Review PACE compliance checklist",
          ],
          isHypothesis,
        },
        {
          id: "attack-disclosure",
          target: "Disclosure failures",
          method: "Chase missing material, then abuse of process if failures persist",
          evidenceInputs: ["MG6C", "CCTV continuity", "Unused material schedule"],
          expectedEffect: "Stay or material exclusion if failures persist after chase",
          cpsLikelyResponse: "CPS will provide disclosure after chase",
          counterResponse: "If disclosure still incomplete after chase, apply for stay",
          killSwitch: "Full disclosure provided promptly after request",
          next48HoursActions: [
            "Request full disclosure (MG6C, CCTV, unused material)",
            "Document chase trail",
            "Prepare abuse of process application if disclosure fails",
          ],
          isHypothesis,
        },
      ];

    case "charge_reduction":
      return [
        {
          id: "attack-intent-threshold",
          target: "s18 specific intent",
          method: "Show medical/sequence evidence supports recklessness not specific intent",
          evidenceInputs: extractedFacts?.hasMG6C
            ? ["Medical reports", "MG6C", "CCTV sequence"]
            : ["Medical reports (pending)", "MG6C (pending)", "CCTV sequence (pending)"],
          expectedEffect: "Charge reduced from s18 to s20 before trial",
          cpsLikelyResponse: "CPS will maintain s18 if medical evidence shows targeting",
          counterResponse: "Show single blow, brief duration, no targeting pattern",
          killSwitch: "Medical evidence shows sustained/targeted injuries",
          next48HoursActions: [
            "Request medical reports",
            "Request MG6C and CCTV",
            "Analyse sequence for duration/targeting",
          ],
          isHypothesis,
        },
        {
          id: "attack-weapon-use",
          target: "Weapon use as proof of intent",
          method: "Show weapon use was incidental, not targeted or prolonged",
          evidenceInputs: ["CCTV sequence", "Witness statements", "Weapon description"],
          expectedEffect: "Weapon use does not prove specific intent",
          cpsLikelyResponse: "CPS will assert weapon use proves intent",
          counterResponse: "Show weapon was incidental, not used to target or prolong",
          killSwitch: "CCTV shows prolonged weapon use with targeting",
          next48HoursActions: [
            "Request CCTV footage",
            "Review weapon description and use",
            "Analyse sequence for targeting",
          ],
          isHypothesis,
        },
      ];

    case "outcome_management":
      return [
        {
          id: "attack-sentence-mitigation",
          target: "Sentence length",
          method: "Early plea + comprehensive mitigation package",
          evidenceInputs: ["Character references", "Personal circumstances", "Employment records"],
          expectedEffect: "Sentence reduced or non-custodial outcome",
          cpsLikelyResponse: "CPS will seek custodial sentence per guidelines",
          counterResponse: "Present strong mitigation: employment, family, remorse, rehabilitation",
          killSwitch: "Serious aggravating factors or previous convictions",
          next48HoursActions: [
            "Gather character references",
            "Prepare personal circumstances statement",
            "Review sentencing guidelines",
          ],
          isHypothesis,
        },
      ];

    default:
      return [];
  }
}

/**
 * LAYER 3: CPS Responses
 * Generate top 3 CPS response branches per route
 */
export function generateCPSResponses(routeType: RouteType): CPSResponse[] {
  switch (routeType) {
    case "fight_charge":
      return [
        {
          id: "cps-identification",
          cpsMove: "CPS will rely on multiple witnesses and CCTV continuity",
          defenceCounter: "Challenge witness reliability and CCTV continuity chain under Turnbull",
          resultingPressure: "Prosecution must prove identification beyond reasonable doubt",
        },
        {
          id: "cps-intent",
          cpsMove: "CPS will maintain s18 based on weapon use and targeting",
          defenceCounter: "Show single/brief blow, no sustained targeting, weapon incidental",
          resultingPressure: "Prosecution must prove specific intent, not just recklessness",
        },
        {
          id: "cps-disclosure",
          cpsMove: "CPS will provide disclosure after chase",
          defenceCounter: "If disclosure still incomplete after chase, apply for stay",
          resultingPressure: "Prosecution must provide full disclosure or face stay application",
        },
      ];

    case "charge_reduction":
      return [
        {
          id: "cps-intent-maintain",
          cpsMove: "CPS will maintain s18 if medical evidence shows targeting",
          defenceCounter: "Show single blow, brief duration, no targeting pattern",
          resultingPressure: "Prosecution must prove specific intent threshold",
        },
        {
          id: "cps-weapon",
          cpsMove: "CPS will assert weapon use proves intent",
          defenceCounter: "Show weapon was incidental, not used to target or prolong",
          resultingPressure: "Prosecution must prove weapon use was targeted/prolonged",
        },
      ];

    case "outcome_management":
      return [
        {
          id: "cps-sentence",
          cpsMove: "CPS will seek custodial sentence per guidelines",
          defenceCounter: "Present strong mitigation: employment, family, remorse, rehabilitation",
          resultingPressure: "Court must balance guidelines with mitigation factors",
        },
      ];

    default:
      return [];
  }
}

/**
 * LAYER 4: Kill Switches
 * Generate kill switches per route
 */
export function generateKillSwitches(routeType: RouteType): KillSwitch[] {
  switch (routeType) {
    case "fight_charge":
      return [
        {
          id: "kill-strong-identification",
          trigger: "Strong multi-witness identification with CCTV confirmation",
          pivotRecommendation: "Pivot to charge reduction or outcome management",
        },
        {
          id: "kill-full-disclosure",
          trigger: "Full disclosure provided promptly after request",
          pivotRecommendation: "Reassess route viability – may need to pivot if evidence is strong",
        },
        {
          id: "kill-pace-compliant",
          trigger: "Full PACE compliance with solicitor attendance",
          pivotRecommendation: "Remove PACE attack path, focus on other angles",
        },
      ];

    case "charge_reduction":
      return [
        {
          id: "kill-sustained-injuries",
          trigger: "Medical evidence shows sustained/targeted injuries",
          pivotRecommendation: "Pivot to outcome management (plea/mitigation)",
        },
        {
          id: "kill-weapon-targeting",
          trigger: "CCTV shows prolonged weapon use with targeting",
          pivotRecommendation: "Pivot to outcome management (plea/mitigation)",
        },
      ];

    case "outcome_management":
      return [
        {
          id: "kill-aggravating",
          trigger: "Serious aggravating factors or previous convictions",
          pivotRecommendation: "Focus on maximum mitigation and early plea credit",
        },
      ];

    default:
      return [];
  }
}

/**
 * LAYER 5: Pivot Plan
 * Generate pivot guidance per route
 */
export function generatePivotPlan(routeType: RouteType): PivotPlan {
  switch (routeType) {
    case "fight_charge":
      return {
        triggers: [
          "Strong identification evidence with CCTV confirmation",
          "Full disclosure provided and prosecution case is strong",
          "PACE compliance confirmed",
        ],
        timing: "Before PTPH to preserve leverage and plea credit",
        behaviourChange: {
          stop: [
            "Stop pursuing abuse of process application",
            "Stop challenging identification if evidence is strong",
            "Stop PACE challenges if compliant",
          ],
          start: [
            "Start charge reduction negotiations",
            "Start preparing mitigation package",
            "Start considering early plea if case is strong",
          ],
        },
      };

    case "charge_reduction":
      return {
        triggers: [
          "Medical evidence shows sustained/targeted injuries",
          "CCTV shows prolonged weapon use with targeting",
          "Prosecution maintains s18 despite evidence",
        ],
        timing: "Before PTPH to preserve leverage and plea credit",
        behaviourChange: {
          stop: [
            "Stop pursuing s18 → s20 downgrade",
            "Stop challenging intent threshold",
          ],
          start: [
            "Start preparing mitigation package",
            "Start considering early plea",
            "Start outcome management strategy",
          ],
        },
      };

    case "outcome_management":
      return {
        triggers: [
          "Serious aggravating factors emerge",
          "Previous convictions discovered",
          "Mitigation evidence is weak",
        ],
        timing: "Before sentencing to maximize mitigation impact",
        behaviourChange: {
          stop: [
            "Stop relying solely on mitigation",
            "Stop delaying plea if case is strong",
          ],
          start: [
            "Start gathering additional mitigation evidence",
            "Start preparing comprehensive mitigation package",
            "Start considering early plea for maximum credit",
          ],
        },
      };

    default:
      return {
        triggers: [],
        timing: "Before PTPH",
        behaviourChange: { stop: [], start: [] },
      };
  }
}

/**
 * LAYER 7: Evidence Impact
 * Map missing items to routes and attack paths
 */
export function generateEvidenceImpact(
  missingItems: string[],
  context: GeneratorContext
): EvidenceImpact[] {
  const impact: EvidenceImpact[] = [];

  // Common missing items for criminal cases
  const commonItems = [
    "CCTV footage",
    "MG6C",
    "Interview transcript/recording",
    "Custody records",
    "999 call recording",
    "BWV footage",
    "VIPER pack",
    "Medical reports",
  ];

  const allItems = [...new Set([...missingItems, ...commonItems])];

  for (const item of allItems) {
    const affectsRoutes: RouteType[] = [];
    const feedsAttackPaths: string[] = [];

    if (item.includes("CCTV") || item.includes("VIPER")) {
      affectsRoutes.push("fight_charge");
      feedsAttackPaths.push("attack-identification");
    }

    if (item.includes("MG6C") || item.includes("Medical")) {
      affectsRoutes.push("fight_charge", "charge_reduction");
      feedsAttackPaths.push("attack-intent", "attack-intent-threshold");
    }

    if (item.includes("Interview") || item.includes("Custody")) {
      affectsRoutes.push("fight_charge");
      feedsAttackPaths.push("attack-pace");
    }

    if (item.includes("999") || item.includes("BWV")) {
      affectsRoutes.push("fight_charge");
      feedsAttackPaths.push("attack-identification");
    }

    if (affectsRoutes.length > 0) {
      impact.push({
        missingItem: item,
        affectsRoutes,
        affectsViability: true,
        urgency: item.includes("CCTV") || item.includes("MG6C") ? "before_ptph" : "before_trial",
        feedsAttackPaths,
      });
    }
  }

  return impact;
}

/**
 * LAYER 8: Artifacts (only when committed + canGenerateAnalysis)
 */
export function generateArtifacts(
  routeType: RouteType,
  context: GeneratorContext
): StrategyArtifacts | null {
  if (!context.canGenerateAnalysis) {
    return null; // Artifacts only when analysis is open
  }

  const defencePositionSnapshot: DefencePositionSnapshot = {
    primaryStrategy: routeType,
    position: getPositionSummary(routeType),
    keyArguments: getKeyArguments(routeType),
    evidenceSummary: "Evidence review pending – see disclosure tracker",
    proceduralStatus: "Pre-PTPH – disclosure requests outstanding",
  };

  const disclosureRequestPack: DisclosureRequestPack = {
    requests: getDisclosureRequests(routeType),
    chaseTrail: "Document all requests, chase after 14 days, escalate if no response after 28 days",
  };

  const caseManagementNote: CaseManagementNote = {
    directionsSought: getDirectionsSought(routeType),
    rationale: getDirectionsRationale(routeType),
    judicialOptics: "attractive",
  };

  const cpsNegotiationBrief: CPSNegotiationBrief | null =
    routeType === "charge_reduction"
      ? {
          downgradeRationale: getDowngradeRationale(),
          keyPoints: getDowngradeKeyPoints(),
          evidenceSupporting: ["Medical reports", "CCTV sequence", "Witness statements"],
          proposedOutcome: "s18 → s20 reduction before PTPH",
        }
      : null;

  return {
    defencePositionSnapshot,
    disclosureRequestPack,
    caseManagementNote,
    cpsNegotiationBrief: cpsNegotiationBrief || undefined,
  };
}

// Helper functions for artifacts
function getPositionSummary(routeType: RouteType): string {
  switch (routeType) {
    case "fight_charge":
      return "Defence position: Challenge prosecution case at trial. Target acquittal or dismissal by attacking evidence, intent, and identification. Disclosure position and evidence gaps support this strategy.";
    case "charge_reduction":
      return "Defence position: Accept harm occurred but challenge intent threshold. Target reduction from s18 to s20 or lesser offence. Medical evidence and sequence analysis support intent distinction.";
    case "outcome_management":
      return "Defence position: Focus on sentencing position and mitigation. Target reduced sentence or non-custodial outcome. Early plea and comprehensive mitigation package support this strategy.";
  }
}

function getKeyArguments(routeType: RouteType): string[] {
  switch (routeType) {
    case "fight_charge":
      return [
        "Identification evidence unreliable under Turnbull guidelines",
        "Intent threshold not met – recklessness not specific intent",
        "PACE breaches require exclusion of interview/custody evidence",
        "Disclosure failures support abuse of process application",
      ];
    case "charge_reduction":
      return [
        "Medical evidence shows single/brief blow, not sustained/targeted",
        "CCTV sequence shows no prolonged or targeted conduct",
        "Weapon use was incidental, not targeted or prolonged",
        "Intent distinction supports s18 → s20 reduction",
      ];
    case "outcome_management":
      return [
        "Early plea credit available",
        "Strong mitigation: employment, family, remorse, rehabilitation",
        "Personal circumstances support non-custodial outcome",
        "Sentencing guidelines applied favourably",
      ];
  }
}

function getDisclosureRequests(routeType: RouteType): Array<{
  item: string;
  legalBasis: string;
  urgency: "before_ptph" | "before_trial" | "anytime";
}> {
  const baseRequests = [
    {
      item: "Full MG6C",
      legalBasis: "CPIA 1996 s3 – prosecution duty to disclose",
      urgency: "before_ptph" as const,
    },
    {
      item: "CCTV footage and continuity",
      legalBasis: "CPIA 1996 s3 – material that might undermine prosecution case",
      urgency: "before_ptph" as const,
    },
  ];

  if (routeType === "fight_charge") {
    return [
      ...baseRequests,
      {
        item: "VIPER pack",
        legalBasis: "CPIA 1996 s3 – identification evidence",
        urgency: "before_ptph" as const,
      },
      {
        item: "Unused material schedule",
        legalBasis: "CPIA 1996 s7A – unused material",
        urgency: "before_trial" as const,
      },
    ];
  }

  if (routeType === "charge_reduction") {
    return [
      ...baseRequests,
      {
        item: "Medical reports",
        legalBasis: "CPIA 1996 s3 – material relevant to intent",
        urgency: "before_ptph" as const,
      },
    ];
  }

  return baseRequests;
}

function getDirectionsSought(routeType: RouteType): string[] {
  switch (routeType) {
    case "fight_charge":
      return [
        "Full disclosure including CCTV, MG6C, and unused material",
        "VIPER pack for identification evidence",
        "Case management directions for disclosure compliance",
      ];
    case "charge_reduction":
      return [
        "Medical reports for intent assessment",
        "CCTV sequence for duration/targeting analysis",
        "Case management directions for charge reduction consideration",
      ];
    case "outcome_management":
      return [
        "Sentencing guidelines application",
        "Mitigation evidence directions",
        "Case management directions for early plea consideration",
      ];
  }
}

function getDirectionsRationale(routeType: RouteType): string {
  switch (routeType) {
    case "fight_charge":
      return "Full disclosure required for fair trial. Disclosure failures may support abuse of process application if chased and not remedied.";
    case "charge_reduction":
      return "Medical and sequence evidence required to assess intent distinction. Charge reduction consideration appropriate before trial.";
    case "outcome_management":
      return "Early plea and mitigation directions required for sentencing position. Case management should facilitate early resolution if appropriate.";
  }
}

function getDowngradeRationale(): string {
  return "Medical evidence and CCTV sequence show single/brief blow, not sustained/targeted. Intent distinction supports s18 → s20 reduction. Recklessness threshold met, specific intent threshold not met.";
}

function getDowngradeKeyPoints(): string[] {
  return [
    "Medical evidence shows injuries consistent with single/brief blow",
    "CCTV sequence shows no prolonged or targeted conduct",
    "Weapon use was incidental, not targeted or prolonged",
    "Intent distinction: recklessness (s20) not specific intent (s18)",
  ];
}

/**
 * Main generator: Create extended strategy route with all layers
 */
export function generateExtendedRoute(
  baseRoute: {
    id: string;
    type: RouteType;
    title: string;
    rationale: string;
    winConditions: string[];
    risks: string[];
    nextActions: string[];
  },
  context: GeneratorContext
): ExtendedStrategyRoute {
  return {
    ...baseRoute,
    viability: generateRouteViability(baseRoute.type, context),
    attackPaths: generateAttackPaths(baseRoute.type, context),
    cpsResponses: generateCPSResponses(baseRoute.type),
    killSwitches: generateKillSwitches(baseRoute.type),
    pivotPlan: generatePivotPlan(baseRoute.type),
  };
}

