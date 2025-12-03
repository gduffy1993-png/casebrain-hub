import type {
  CaseHeatmap,
  CaseHeatmapCell,
  CaseIssueKey,
  HeatmapStatus,
  MissingEvidenceItem,
  RiskFlag,
  LimitationInfo,
} from "./types/casebrain";

type HeatmapInput = {
  caseId: string;
  practiceArea: string;
  riskFlags: RiskFlag[];
  missingEvidence: MissingEvidenceItem[];
  limitationInfo?: LimitationInfo;
  hasTimeline: boolean;
  documentCount: number;
  extractedFactsCount: number;
  stage?: string;
  deadlineRiskScore?: number; // 0-100, lower = more risk
};

/**
 * Compute case heatmap from various data sources
 */
export function computeCaseHeatmap(input: HeatmapInput): CaseHeatmap {
  const cells: CaseHeatmapCell[] = [];
  const now = new Date().toISOString();

  // 1. Evidence Completeness
  cells.push(computeEvidenceCompleteness(input));

  // 2. Limitation Risk
  cells.push(computeLimitationRisk(input));

  // 3. Liability Assessment
  cells.push(computeLiabilityScore(input));

  // 4. Causation Assessment
  cells.push(computeCausationScore(input));

  // 5. Quantum Assessment
  cells.push(computeQuantumScore(input));

  // 6. Housing Standard (for housing cases)
  if (input.practiceArea === "housing_disrepair") {
    cells.push(computeHousingStandard(input));
    cells.push(computeAwaabRisk(input));
  }

  // 7. Procedural Compliance
  cells.push(computeProceduralCompliance(input));

  // 8. Deadline Risk (if provided)
  if (input.deadlineRiskScore !== undefined) {
    cells.push(computeDeadlineRisk(input.deadlineRiskScore));
  }

  // Calculate overall score
  const validCells = cells.filter((c) => c.score >= 0);
  const overallScore =
    validCells.length > 0
      ? Math.round(validCells.reduce((sum, c) => sum + c.score, 0) / validCells.length)
      : 50;

  const overallStatus = scoreToStatus(overallScore);

  return {
    caseId: input.caseId,
    cells,
    overallScore,
    overallStatus,
    generatedAt: now,
  };
}

/**
 * Convert score (0-100) to status (RED/AMBER/GREEN)
 */
function scoreToStatus(score: number): HeatmapStatus {
  if (score >= 70) return "GREEN";
  if (score >= 40) return "AMBER";
  return "RED";
}

/**
 * Evidence Completeness score
 */
function computeEvidenceCompleteness(input: HeatmapInput): CaseHeatmapCell {
  const missingCritical = input.missingEvidence.filter(
    (e) => e.priority === "CRITICAL" && e.status === "MISSING",
  ).length;
  const missingHigh = input.missingEvidence.filter(
    (e) => e.priority === "HIGH" && e.status === "MISSING",
  ).length;
  const missingMedium = input.missingEvidence.filter(
    (e) => e.priority === "MEDIUM" && e.status === "MISSING",
  ).length;

  // Start at 100, deduct for missing items
  let score = 100;
  score -= missingCritical * 25;
  score -= missingHigh * 15;
  score -= missingMedium * 5;
  
  // Track raw score before floor
  const rawScoreBeforeFloor = score;
  score = Math.max(0, score);
  const floorApplied = rawScoreBeforeFloor < 0 ? 0 : null;

  // Bonus for having documents and timeline
  let rawScoreBeforeCap = score;
  if (input.documentCount > 0) {
    rawScoreBeforeCap += 5;
  }
  if (input.hasTimeline) {
    rawScoreBeforeCap += 5;
  }
  const capApplied = rawScoreBeforeCap > 100 ? 100 : null;
  score = Math.min(100, rawScoreBeforeCap);

  let reason: string;
  if (missingCritical > 0) {
    reason = `${missingCritical} critical evidence item(s) missing`;
  } else if (missingHigh > 0) {
    reason = `${missingHigh} high-priority item(s) still needed`;
  } else if (missingMedium > 0) {
    reason = `${missingMedium} medium-priority item(s) to obtain`;
  } else {
    reason = "All required evidence appears present";
  }

  const breakdown = [
    { factor: "Base score", impact: 100 },
    ...(missingCritical > 0 ? [{ factor: `Missing ${missingCritical} critical item(s)`, impact: -missingCritical * 25 }] : []),
    ...(missingHigh > 0 ? [{ factor: `Missing ${missingHigh} high-priority item(s)`, impact: -missingHigh * 15 }] : []),
    ...(missingMedium > 0 ? [{ factor: `Missing ${missingMedium} medium-priority item(s)`, impact: -missingMedium * 5 }] : []),
    ...(input.documentCount > 0 ? [{ factor: "Documents present", impact: 5 }] : []),
    ...(input.hasTimeline ? [{ factor: "Timeline available", impact: 5 }] : []),
    { factor: `Raw score: ${rawScoreBeforeFloor}%`, impact: 0 },
    ...(floorApplied !== null ? [{ factor: `Score floor applied: ${floorApplied}%`, impact: 0 }] : []),
    ...(capApplied !== null ? [{ factor: `Score cap applied: ${capApplied}%`, impact: 0 }] : []),
    { factor: `Final score: ${score}%`, impact: 0 },
  ];

  return {
    caseId: input.caseId,
    issue: "EVIDENCE_COMPLETENESS",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Limitation Risk score
 */
function computeLimitationRisk(input: HeatmapInput): CaseHeatmapCell {
  let score = 100;
  let reason = "No limitation concerns";

  if (input.limitationInfo) {
    const { daysRemaining, isExpired } = input.limitationInfo;

    if (isExpired) {
      score = 0;
      reason = "Limitation period may have expired";
    } else if (daysRemaining <= 30) {
      score = 10;
      reason = `Critical: only ${daysRemaining} days until limitation`;
    } else if (daysRemaining <= 90) {
      score = 30;
      reason = `${daysRemaining} days until limitation - urgent action needed`;
    } else if (daysRemaining <= 180) {
      score = 50;
      reason = `${daysRemaining} days until limitation - monitor closely`;
    } else if (daysRemaining <= 365) {
      score = 70;
      reason = `${daysRemaining} days until limitation`;
    } else {
      score = 90;
      reason = `${daysRemaining} days until limitation - low risk`;
    }
  }

  // Check for limitation-related risk flags
  const limitationFlags = input.riskFlags.filter(
    (f) => f.type === "limitation" || f.code.includes("LIMITATION"),
  );
  if (limitationFlags.some((f) => f.severity === "CRITICAL")) {
    score = Math.min(score, 20);
  } else if (limitationFlags.some((f) => f.severity === "HIGH")) {
    score = Math.min(score, 40);
  }

  const breakdown = [
    { factor: "Base score", impact: 100 },
    ...(input.limitationInfo?.isExpired 
      ? [{ factor: "Limitation period expired", impact: -100 }] 
      : input.limitationInfo?.daysRemaining !== undefined && input.limitationInfo.daysRemaining <= 30
      ? [{ factor: `Only ${input.limitationInfo.daysRemaining} days remaining`, impact: -90 }]
      : input.limitationInfo?.daysRemaining !== undefined && input.limitationInfo.daysRemaining <= 90
      ? [{ factor: `${input.limitationInfo.daysRemaining} days remaining (urgent)`, impact: -70 }]
      : input.limitationInfo?.daysRemaining !== undefined && input.limitationInfo.daysRemaining <= 180
      ? [{ factor: `${input.limitationInfo.daysRemaining} days remaining`, impact: -50 }]
      : input.limitationInfo?.daysRemaining !== undefined && input.limitationInfo.daysRemaining <= 365
      ? [{ factor: `${input.limitationInfo.daysRemaining} days remaining`, impact: -30 }]
      : input.limitationInfo?.daysRemaining !== undefined
      ? [{ factor: `${input.limitationInfo.daysRemaining} days remaining`, impact: -10 }]
      : []),
    ...(limitationFlags.some((f) => f.severity === "CRITICAL") 
      ? [{ factor: "CRITICAL limitation risk flag", impact: -80 }] 
      : limitationFlags.some((f) => f.severity === "HIGH") 
      ? [{ factor: "HIGH limitation risk flag", impact: -60 }] 
      : []),
  ];

  return {
    caseId: input.caseId,
    issue: "LIMITATION_RISK",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Liability score
 */
function computeLiabilityScore(input: HeatmapInput): CaseHeatmapCell {
  // Check for liability-related evidence
  const liabilityMissing = input.missingEvidence.filter(
    (e) => e.category === "LIABILITY" && e.status === "MISSING",
  );

  let score = 80;
  score -= liabilityMissing.filter((e) => e.priority === "CRITICAL").length * 30;
  score -= liabilityMissing.filter((e) => e.priority === "HIGH").length * 15;
  
  // Track raw score before floor
  const rawScoreBeforeFloor = score;
  score = Math.max(0, score);
  const floorApplied = rawScoreBeforeFloor < 0 ? 0 : null;

  // Boost if we have documents
  let rawScoreBeforeCap = score;
  if (input.documentCount >= 3) {
    rawScoreBeforeCap = score + 10;
    score = Math.min(100, rawScoreBeforeCap);
  }
  const capApplied = rawScoreBeforeCap > 100 ? 100 : null;

  const reason =
    liabilityMissing.length > 0
      ? `${liabilityMissing.length} liability evidence item(s) missing`
      : "Liability evidence appears sufficient";

  const breakdown = [
    { factor: "Base score", impact: 80 },
    ...(liabilityMissing.filter((e) => e.priority === "CRITICAL").length > 0 
      ? [{ factor: `Missing ${liabilityMissing.filter((e) => e.priority === "CRITICAL").length} critical item(s)`, impact: -liabilityMissing.filter((e) => e.priority === "CRITICAL").length * 30 }] 
      : []),
    ...(liabilityMissing.filter((e) => e.priority === "HIGH").length > 0 
      ? [{ factor: `Missing ${liabilityMissing.filter((e) => e.priority === "HIGH").length} high-priority item(s)`, impact: -liabilityMissing.filter((e) => e.priority === "HIGH").length * 15 }] 
      : []),
    ...(input.documentCount >= 3 ? [{ factor: "Documents boost", impact: 10 }] : []),
    { factor: `Raw score: ${rawScoreBeforeFloor}%`, impact: 0 },
    ...(floorApplied !== null ? [{ factor: `Score floor applied: ${floorApplied}%`, impact: 0 }] : []),
    ...(capApplied !== null ? [{ factor: `Score cap applied: ${capApplied}%`, impact: 0 }] : []),
    { factor: `Final score: ${score}%`, impact: 0 },
  ];

  return {
    caseId: input.caseId,
    issue: "LIABILITY",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Causation score
 */
function computeCausationScore(input: HeatmapInput): CaseHeatmapCell {
  const causationMissing = input.missingEvidence.filter(
    (e) => e.category === "CAUSATION" && e.status === "MISSING",
  );

  let score = 80;
  score -= causationMissing.filter((e) => e.priority === "CRITICAL").length * 35;
  score -= causationMissing.filter((e) => e.priority === "HIGH").length * 20;
  score = Math.max(0, score);

  const reason =
    causationMissing.length > 0
      ? `${causationMissing.length} causation evidence item(s) missing`
      : "Causation evidence appears sufficient";

  const breakdown = [
    { factor: "Base score", impact: 80 },
    ...(causationMissing.filter((e) => e.priority === "CRITICAL").length > 0 
      ? [{ factor: `Missing ${causationMissing.filter((e) => e.priority === "CRITICAL").length} critical item(s)`, impact: -causationMissing.filter((e) => e.priority === "CRITICAL").length * 35 }] 
      : []),
    ...(causationMissing.filter((e) => e.priority === "HIGH").length > 0 
      ? [{ factor: `Missing ${causationMissing.filter((e) => e.priority === "HIGH").length} high-priority item(s)`, impact: -causationMissing.filter((e) => e.priority === "HIGH").length * 20 }] 
      : []),
  ];

  return {
    caseId: input.caseId,
    issue: "CAUSATION",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Quantum score
 */
function computeQuantumScore(input: HeatmapInput): CaseHeatmapCell {
  const quantumMissing = input.missingEvidence.filter(
    (e) => e.category === "QUANTUM" && e.status === "MISSING",
  );

  let score = 75;
  score -= quantumMissing.filter((e) => e.priority === "CRITICAL").length * 25;
  score -= quantumMissing.filter((e) => e.priority === "HIGH").length * 15;
  score = Math.max(0, score);

  const reason =
    quantumMissing.length > 0
      ? `${quantumMissing.length} quantum evidence item(s) to gather`
      : "Quantum evidence appears sufficient";

  const breakdown = [
    { factor: "Base score", impact: 75 },
    ...(quantumMissing.filter((e) => e.priority === "CRITICAL").length > 0 
      ? [{ factor: `Missing ${quantumMissing.filter((e) => e.priority === "CRITICAL").length} critical item(s)`, impact: -quantumMissing.filter((e) => e.priority === "CRITICAL").length * 25 }] 
      : []),
    ...(quantumMissing.filter((e) => e.priority === "HIGH").length > 0 
      ? [{ factor: `Missing ${quantumMissing.filter((e) => e.priority === "HIGH").length} high-priority item(s)`, impact: -quantumMissing.filter((e) => e.priority === "HIGH").length * 15 }] 
      : []),
  ];

  return {
    caseId: input.caseId,
    issue: "QUANTUM",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Housing Standard score
 */
function computeHousingStandard(input: HeatmapInput): CaseHeatmapCell {
  const housingFlags = input.riskFlags.filter(
    (f) => f.type === "section_11" || f.type === "compliance",
  );

  let score = 80;
  const rawScoreBeforeAdjustment = score;
  if (housingFlags.some((f) => f.severity === "CRITICAL")) {
    score = 20;
  } else if (housingFlags.some((f) => f.severity === "HIGH")) {
    score = 40;
  } else if (housingFlags.some((f) => f.severity === "MEDIUM")) {
    score = 60;
  }
  
  // No explicit floor/cap, but track raw score for consistency
  const rawScore = score === 80 ? rawScoreBeforeAdjustment : score;
  const floorApplied = null; // No floor in this calculation
  const capApplied = null; // No cap in this calculation

  const reason =
    housingFlags.length > 0
      ? `${housingFlags.length} housing standard issue(s) detected`
      : "No housing standard issues flagged";

  const breakdown = [
    { factor: "Base score", impact: 80 },
    ...(housingFlags.some((f) => f.severity === "CRITICAL") 
      ? [{ factor: "CRITICAL housing standard issue(s)", impact: -60 }] 
      : housingFlags.some((f) => f.severity === "HIGH") 
      ? [{ factor: "HIGH housing standard issue(s)", impact: -40 }] 
      : housingFlags.some((f) => f.severity === "MEDIUM") 
      ? [{ factor: "MEDIUM housing standard issue(s)", impact: -20 }] 
      : []),
    { factor: `Raw score: ${rawScore}%`, impact: 0 },
    ...(floorApplied !== null ? [{ factor: `Score floor applied: ${floorApplied}%`, impact: 0 }] : []),
    ...(capApplied !== null ? [{ factor: `Score cap applied: ${capApplied}%`, impact: 0 }] : []),
    { factor: `Final score: ${score}%`, impact: 0 },
  ];

  return {
    caseId: input.caseId,
    issue: "HOUSING_STANDARD",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Awaab Risk score
 */
function computeAwaabRisk(input: HeatmapInput): CaseHeatmapCell {
  const awaabFlags = input.riskFlags.filter((f) => f.type === "awaabs_law");

  let score = 100;
  if (awaabFlags.some((f) => f.severity === "CRITICAL")) {
    score = 15;
  } else if (awaabFlags.some((f) => f.severity === "HIGH")) {
    score = 35;
  } else if (awaabFlags.some((f) => f.severity === "MEDIUM")) {
    score = 55;
  } else if (awaabFlags.length > 0) {
    score = 75;
  }

  const reason =
    awaabFlags.length > 0
      ? `${awaabFlags.length} Awaab's Law compliance issue(s)`
      : "No Awaab's Law issues detected";

  // Extract triggers from risk flags (if available)
  const allTriggers: string[] = [];
  for (const flag of awaabFlags) {
    // Check if flag has triggers stored (from AwaabInferredRisk)
    const flagAny = flag as any;
    if (flagAny.triggers && Array.isArray(flagAny.triggers)) {
      allTriggers.push(...flagAny.triggers);
    } else {
      // Fallback: extract from message/description
      const message = flag.message || flag.title || "";
      if (message.includes("Child under 5")) allTriggers.push("Child under 5 present");
      if (message.includes("Mould present") || message.includes("mould")) allTriggers.push("Mould in room");
      if (message.includes("Category 1") || message.includes("cat 1")) allTriggers.push("Category 1 hazard");
      if (message.includes("health") || message.includes("respiratory") || message.includes("symptoms")) allTriggers.push("Health symptoms reported");
      if (message.includes("days") && message.includes("overdue")) allTriggers.push("Statutory deadlines exceeded");
    }
  }
  
  // Remove duplicates
  const uniqueTriggers = Array.from(new Set(allTriggers));

  // Build breakdown with actual triggers instead of "Base score"
  const breakdown = uniqueTriggers.length > 0
    ? uniqueTriggers.slice(0, 5).map(trigger => ({
        factor: trigger,
        impact: 0, // Just show the trigger, not impact
      }))
    : [
        ...(awaabFlags.some((f) => f.severity === "CRITICAL") 
          ? [{ factor: "CRITICAL breach risk detected", impact: -85 }] 
          : awaabFlags.some((f) => f.severity === "HIGH") 
          ? [{ factor: "HIGH breach risk detected", impact: -65 }] 
          : awaabFlags.some((f) => f.severity === "MEDIUM") 
          ? [{ factor: "MEDIUM breach risk detected", impact: -45 }] 
          : awaabFlags.length > 0 
          ? [{ factor: "Awaab's Law risk detected", impact: -25 }] 
          : []),
      ];

  return {
    caseId: input.caseId,
    issue: "AWAAB_RISK",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

/**
 * Procedural Compliance score
 */
/**
 * Deadline Risk score
 */
function computeDeadlineRisk(deadlineRiskScore: number): CaseHeatmapCell {
  const score = Math.max(0, Math.min(100, deadlineRiskScore));
  
  let reason: string;
  if (score >= 70) {
    reason = "No urgent deadlines";
  } else if (score >= 40) {
    reason = "Some deadlines approaching";
  } else if (score >= 20) {
    reason = "Multiple deadlines due soon";
  } else {
    reason = "Critical: overdue deadlines present";
  }

  const breakdown = [
    { factor: "Deadline risk assessment", impact: score },
  ];

  return {
    caseId: "", // Will be set by caller
    issue: "DEADLINE_RISK",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

function computeProceduralCompliance(input: HeatmapInput): CaseHeatmapCell {
  const proceduralMissing = input.missingEvidence.filter(
    (e) => e.category === "PROCEDURE" && e.status === "MISSING",
  );

  let score = 85;
  score -= proceduralMissing.length * 15;

  // Check stage - later stages should have more documentation
  if (input.stage === "litigation" && input.documentCount < 5) {
    score -= 20;
  }

  // Track raw score before floor
  const rawScoreBeforeFloor = score;
  score = Math.max(0, score);
  const floorApplied = rawScoreBeforeFloor < 0 ? 0 : null;

  const reason =
    proceduralMissing.length > 0
      ? `${proceduralMissing.length} procedural item(s) to address`
      : "Procedural requirements appear met";

  const breakdown = [
    { factor: "Base score", impact: 85 },
    ...(proceduralMissing.length > 0 
      ? [{ factor: `Missing ${proceduralMissing.length} procedural item(s)`, impact: -proceduralMissing.length * 15 }] 
      : []),
    ...(input.stage === "litigation" && input.documentCount < 5 
      ? [{ factor: "Insufficient documentation for litigation stage", impact: -20 }] 
      : []),
    { factor: `Raw score: ${rawScoreBeforeFloor}%`, impact: 0 },
    ...(floorApplied !== null ? [{ factor: `Score floor applied: ${floorApplied}%`, impact: 0 }] : []),
    { factor: `Final score: ${score}%`, impact: 0 },
  ];

  return {
    caseId: input.caseId,
    issue: "PROCEDURAL_COMPLIANCE",
    score,
    status: scoreToStatus(score),
    reason,
    lastUpdated: new Date().toISOString(),
    breakdown,
  };
}

