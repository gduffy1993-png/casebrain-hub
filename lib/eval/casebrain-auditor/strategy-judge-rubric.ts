/** Strategy rubric — deterministic checks in scorers.ts. LLM judge reserved for later. */

export type StrategyJudgeCriterion = {
  id: string;
  label: string;
  description: string;
};

export const STRATEGY_JUDGE_CRITERIA: StrategyJudgeCriterion[] = [
  {
    id: "usefulness",
    label: "Usefulness to criminal defence solicitor",
    description: "Practical, profile-specific PTPH prep — not generic filler.",
  },
  {
    id: "court_safety",
    label: "Court safety",
    description: "No outcome prediction; conditional phrasing on contested facts.",
  },
  {
    id: "evidential_grounding",
    label: "Evidential grounding",
    description: "Claims tied to bundle material or marked provisional.",
  },
  {
    id: "disclosure_leverage",
    label: "Disclosure leverage",
    description: "Chase items align with primary route and profile family.",
  },
  {
    id: "lose_scenario",
    label: "What would make us lose",
    description: "Collapse risks honest about Crown strengths if material served.",
  },
  {
    id: "next_action_practicality",
    label: "Next action practicality",
    description: "Concrete instructions/chase/continuity — not platitudes.",
  },
];

export const STRATEGY_FORBIDDEN_PREDICTION = [
  /\bthis wins\b/i,
  /\bwill be acquitted\b/i,
  /\bCrown will lose\b/i,
  /\bguaranteed\b/i,
];

export const STRATEGY_REQUIRED_CONDITIONAL_MARKERS = [
  /\bconditional\b/i,
  /\bif served\b/i,
  /\bpending disclosure\b/i,
  /\bprovisional\b/i,
  /\bmay\b/i,
];
