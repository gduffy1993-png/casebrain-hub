/**
 * Outcome Pathway Predictor
 * 
 * Predicts typical pathways for a case based on:
 * - Practice area
 * - Current stage
 * - Risk profile
 * - Case complexity indicators
 */

import type { OutcomePathway, Severity, RiskFlag, MissingEvidenceItem } from "./types/casebrain";

type PathwayInput = {
  caseId: string;
  practiceArea: string;
  stage?: string;
  riskFlags: RiskFlag[];
  missingEvidence: MissingEvidenceItem[];
  documentCount: number;
  daysSinceCreation: number;
};

type PracticeAreaConfig = {
  stages: Array<{ step: string; typicalDays: number }>;
  typicalResolutionMonths: { min: number; max: number };
  costBand: { low: number; medium: number; high: number };
};

const PRACTICE_AREA_CONFIGS: Record<string, PracticeAreaConfig> = {
  housing_disrepair: {
    stages: [
      { step: "Initial complaint letter to landlord", typicalDays: 0 },
      { step: "Landlord response period (14 days)", typicalDays: 14 },
      { step: "Expert inspection if needed", typicalDays: 30 },
      { step: "Pre-action protocol letter", typicalDays: 45 },
      { step: "Protocol response period", typicalDays: 59 },
      { step: "Issue proceedings if no resolution", typicalDays: 90 },
      { step: "Defence period", typicalDays: 104 },
      { step: "Disclosure", typicalDays: 134 },
      { step: "Settlement negotiations", typicalDays: 180 },
      { step: "Trial (if not settled)", typicalDays: 270 },
    ],
    typicalResolutionMonths: { min: 4, max: 12 },
    costBand: { low: 5000, medium: 15000, high: 40000 },
  },
  pi: {
    stages: [
      { step: "Obtain medical records", typicalDays: 21 },
      { step: "Medical expert report", typicalDays: 60 },
      { step: "Letter of claim / CNF", typicalDays: 75 },
      { step: "Response period", typicalDays: 96 },
      { step: "Schedule of loss preparation", typicalDays: 120 },
      { step: "Part 36 offer", typicalDays: 150 },
      { step: "Negotiations", typicalDays: 180 },
      { step: "Issue proceedings if needed", typicalDays: 210 },
      { step: "Trial (if not settled)", typicalDays: 365 },
    ],
    typicalResolutionMonths: { min: 6, max: 18 },
    costBand: { low: 3000, medium: 10000, high: 30000 },
  },
  pi_rta: {
    stages: [
      { step: "Submit to OIC portal", typicalDays: 7 },
      { step: "Insurer response", typicalDays: 22 },
      { step: "Medical report (MedCo)", typicalDays: 45 },
      { step: "Settlement pack / Stage 2", typicalDays: 60 },
      { step: "Counter-offer period", typicalDays: 75 },
      { step: "Stage 3 hearing if needed", typicalDays: 120 },
    ],
    typicalResolutionMonths: { min: 3, max: 8 },
    costBand: { low: 500, medium: 2000, high: 5000 },
  },
  clinical_negligence: {
    stages: [
      { step: "Obtain medical records", typicalDays: 40 },
      { step: "Medical expert screening", typicalDays: 90 },
      { step: "Condition & prognosis report", typicalDays: 120 },
      { step: "Breach of duty report", typicalDays: 180 },
      { step: "Letter of claim", typicalDays: 210 },
      { step: "Response (4 months)", typicalDays: 330 },
      { step: "Issue proceedings", typicalDays: 365 },
      { step: "Defence period", typicalDays: 393 },
      { step: "Expert meetings", typicalDays: 500 },
      { step: "Settlement / Trial", typicalDays: 730 },
    ],
    typicalResolutionMonths: { min: 18, max: 36 },
    costBand: { low: 20000, medium: 75000, high: 200000 },
  },
};

const DEFAULT_CONFIG: PracticeAreaConfig = {
  stages: [
    { step: "Case assessment", typicalDays: 14 },
    { step: "Evidence gathering", typicalDays: 60 },
    { step: "Pre-action correspondence", typicalDays: 90 },
    { step: "Negotiations", typicalDays: 150 },
    { step: "Resolution", typicalDays: 210 },
  ],
  typicalResolutionMonths: { min: 6, max: 12 },
  costBand: { low: 5000, medium: 15000, high: 30000 },
};

/**
 * Predict outcome pathway for a case
 */
export function predictOutcomePathway(input: PathwayInput): OutcomePathway {
  const config = PRACTICE_AREA_CONFIGS[input.practiceArea] ?? DEFAULT_CONFIG;

  // Determine which stages are completed based on current stage
  const stageOrder = config.stages.map(s => s.step.toLowerCase());
  const currentStageIndex = input.stage 
    ? stageOrder.findIndex(s => s.includes(input.stage?.toLowerCase() ?? ""))
    : Math.min(Math.floor(input.daysSinceCreation / 30), stageOrder.length - 1);

  const expectedSteps = config.stages.map((stage, index) => ({
    step: stage.step,
    typicalTimeframe: formatTimeframe(stage.typicalDays),
    isCompleted: index <= currentStageIndex,
  }));

  // Calculate complexity factors
  const criticalRisks = input.riskFlags.filter(r => r.severity === "CRITICAL" && r.status === "outstanding").length;
  const highRisks = input.riskFlags.filter(r => r.severity === "HIGH" && r.status === "outstanding").length;
  const missingCritical = input.missingEvidence.filter(e => e.priority === "CRITICAL" && e.status === "MISSING").length;

  // Adjust time estimate based on complexity
  let complexityMultiplier = 1;
  if (criticalRisks > 0) complexityMultiplier += 0.3;
  if (highRisks > 2) complexityMultiplier += 0.2;
  if (missingCritical > 2) complexityMultiplier += 0.2;
  if (input.documentCount < 3) complexityMultiplier += 0.1;

  const adjustedMin = Math.round(config.typicalResolutionMonths.min * complexityMultiplier);
  const adjustedMax = Math.round(config.typicalResolutionMonths.max * complexityMultiplier);

  // Determine cost band
  let costBand: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  if (complexityMultiplier < 1.1) {
    costBand = "LOW";
  } else if (complexityMultiplier < 1.3) {
    costBand = "MEDIUM";
  } else if (complexityMultiplier < 1.5) {
    costBand = "HIGH";
  } else {
    costBand = "VERY_HIGH";
  }

  // Determine confidence
  let confidence: "LOW" | "MEDIUM" | "HIGH";
  if (input.documentCount < 3 || criticalRisks > 2) {
    confidence = "LOW";
  } else if (input.documentCount < 10 || highRisks > 3) {
    confidence = "MEDIUM";
  } else {
    confidence = "HIGH";
  }

  return {
    caseId: input.caseId,
    practiceArea: input.practiceArea,
    currentStage: input.stage ?? "Unknown",
    expectedSteps,
    estimatedTimeToResolution: `${adjustedMin}-${adjustedMax} months`,
    estimatedCostBand: costBand,
    similarCasesCount: Math.floor(Math.random() * 50) + 10, // Placeholder
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

function formatTimeframe(days: number): string {
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

