"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, AlertCircle, X, Lock, ArrowRight, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Copy, FileText, Shield, Zap, AlertCircle as AlertCircleIcon, Calendar, MapPin, Loader2, Clock } from "lucide-react";
import { useToast } from "@/components/Toast";

export type PrimaryStrategy = 
  | "fight_charge" 
  | "charge_reduction" 
  | "outcome_management";

export type SecondaryStrategy = PrimaryStrategy;

type RouteViability = {
  status: "VIABLE" | "WEAKENING" | "UNSAFE";
  reasons: string[];
  evidenceBacked: boolean;
};

type AttackPath = {
  id: string;
  target: string;
  method: string;
  evidenceInputs: string[];
  expectedEffect: string;
  cpsLikelyResponse: string;
  counterResponse: string;
  killSwitch: string;
  next48HoursActions: string[];
  evidenceBacked: boolean;
};

type CPSResponse = {
  id: string;
  cpsMove: string;
  defenceCounter: string;
  resultingPressure: string;
};

type KillSwitch = {
  id: string;
  evidenceEvent: string;
  pivotRecommendation: string;
};

type PivotPlan = {
  triggers: string[];
  timing: string;
  behaviourChange: {
    stop: string[];
    start: string[];
  };
};

type StrategyArtifact = {
  type: "defence_position" | "disclosure_request" | "case_management_note" | "cps_negotiation_brief";
  title: string;
  content: string;
};

type ResidualAngle = {
  id: string;
  title: string;
  description: string;
  category: "credibility" | "sequence" | "medical" | "identification" | "procedure" | "context";
  evidenceBasis: "EVIDENCE_BACKED" | "HYPOTHESIS";
  requiredEvidence?: string[];
  judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
  whyOptics: string;
  howToUse: string[];
  stopIf: string;
};

type ResidualAttackScan = {
  status: "ATTACKS_REMAIN" | "EXHAUSTED";
  summary: string;
  angles: ResidualAngle[];
  lastResortLeverage: {
    triggers: string[];
    plan: Array<{
      title: string;
      actions: string[];
      timing: "before_PTPH" | "after_disclosure" | "anytime";
      judicialOptics: "ATTRACTIVE" | "NEUTRAL" | "RISKY";
    }>;
  };
};

type StrategyRoute = {
  id: string;
  type: "fight_charge" | "charge_reduction" | "outcome_management";
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
  viability?: RouteViability;
  attackPaths?: AttackPath[];
  cpsResponses?: CPSResponse[];
  killSwitches?: KillSwitch[];
  pivotPlan?: PivotPlan;
  residual?: ResidualAttackScan;
};

type StrategyRecommendation = {
  recommended: "fight_charge" | "charge_reduction" | "outcome_management";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
  ranking: ("fight_charge" | "charge_reduction" | "outcome_management")[];
  flipConditions: Array<{
    evidenceEvent: string;
    flipsTo: "fight_charge" | "charge_reduction" | "outcome_management";
    why: string;
    timing: "before_PTPH" | "after_disclosure" | "anytime";
  }>;
  solicitorNarrative: string;
};

type EvidenceImpactMap = {
  evidenceItem: {
    id: string;
    name: string;
    category: string;
    urgency: string;
  };
  affectedAttackPaths: string[];
  impactOnDefence: string;
  ifArrivesClean: string;
  ifArrivesLate: string;
  ifArrivesAdverse: string;
  viabilityChange: Array<{
    route: string;
    change: string;
    explanation: string;
  }>;
  pivotTrigger?: {
    from: string;
    to: string;
    condition: string;
    timing: string;
  };
  killSwitch?: {
    route: string;
    condition: string;
    explanation: string;
  };
};

type TimePressureState = {
  windows: Array<{
    id: string;
    type: string;
    label: string;
    date: string | null;
    isPlaceholder: boolean;
    daysUntil: number | null;
    leverageImpact: string;
    actions: string[];
    warning?: string;
  }>;
  currentLeverage: string;
  leverageExplanation: string;
  timeCriticalActions: string[];
  losingLeverageActions: string[];
  noLongerAttractiveActions: string[];
};

type DecisionCheckpoint = {
  id: string;
  title: string;
  description: string;
  timing: string;
  options: Array<{
    id: string;
    label: string;
    risks: string[];
    consequences: string[];
    leverage: string;
    timing: string;
  }>;
  currentLeverage: string;
  leverageImpact: Array<{
    option: string;
    impact: string;
    explanation: string;
  }>;
  solicitorGuidance: string;
};

type StrategyAnalysisResponse = {
  routes: StrategyRoute[];
  selectedRoute?: string;
  artifacts?: StrategyArtifact[];
  evidenceImpact?: Array<{
    item: string;
    attackPaths: string[];
    routeViability: Array<{ routeId: string; impact: string }>;
    urgency: string;
  }>;
  recommendation?: StrategyRecommendation;
  evidenceImpactMap?: EvidenceImpactMap[];
  timePressure?: TimePressureState;
  confidenceStates?: Record<string, {
    current: string;
    explanation: string;
    changes: Array<{
      from: string;
      to: string;
      trigger: string;
      explanation: string;
    }>;
  }>;
  decisionCheckpoints?: DecisionCheckpoint[];
  residualSummary?: {
    exhaustedRoutes: string[];
    notes: string;
  };
  diagnostics?: {
    canGenerateAnalysis: boolean;
    isGated: boolean;
  };
};

type SavedPosition = {
  id: string;
  position_text: string;
  phase: number;
  created_at: string;
};

type StrategyCommitmentPanelProps = {
  caseId: string;
  onCommitmentChange: (commitment: StrategyCommitment | null) => void;
  savedPosition?: SavedPosition | null;
};

export type StrategyCommitment = {
  primary: PrimaryStrategy;
  secondary: SecondaryStrategy[];
};

const STRATEGY_OPTIONS: Array<{
  id: PrimaryStrategy;
  label: string;
  description: string;
}> = [
  {
    id: "fight_charge",
    label: "Fight Charge (Trial Strategy)",
    description: "Full trial defence. Challenge evidence, intent, and identification. Target: acquittal or dismissal.",
  },
  {
    id: "charge_reduction",
    label: "Charge Reduction (e.g. s18 → s20)",
    description: "Accept harm but challenge intent. Target: reduction from s18 to s20 or lesser offence.",
  },
  {
    id: "outcome_management",
    label: "Outcome Management (Plea / Mitigation)",
    description: "Focus on sentencing position and mitigation. Target: reduced sentence or non-custodial outcome.",
  },
];

// Sub-options (parallel attack paths) for each strategy (deterministic, non-AI)
type SubOption = {
  id: string;
  title: string;
  target: string;
  evidenceNeeded: string[];
  killSwitch: string;
  priority: "primary pressure" | "secondary pressure" | "leverage / pivot";
};

const SUB_OPTIONS_BY_STRATEGY: Record<PrimaryStrategy, SubOption[]> = {
  fight_charge: [
    {
      id: "identification",
      title: "Identification / Recognition Attack",
      target: "Challenge witness identification reliability, Turnbull compliance, and recognition evidence quality.",
      evidenceNeeded: [
        "VIPER pack / identification procedures",
        "Turnbull guidelines compliance check",
        "Recognition evidence timing and context",
        "Witness reliability assessments"
      ],
      killSwitch: "Strong, uncontested identification with multiple independent witnesses and clear Turnbull compliance.",
      priority: "primary pressure"
    },
    {
      id: "intent_downgrade",
      title: "Intent Downgrade (s18→s20) / Lack of Intent Attack",
      target: "Challenge specific intent (s18) to downgrade to recklessness (s20) or lack of intent altogether.",
      evidenceNeeded: [
        "Sequence evidence (CCTV, timings)",
        "Circumstances of incident (context, duration)",
        "Medical evidence (injury mechanism)",
        "Defendant's account / interview responses"
      ],
      killSwitch: "Clear evidence of premeditation, targeting, or specific intent to cause serious harm with no ambiguity.",
      priority: "primary pressure"
    },
    {
      id: "medical_causation",
      title: "Medical Causation / Injury Mechanism Attack",
      target: "Challenge whether injuries match prosecution narrative, causation chain, or medical expert evidence.",
      evidenceNeeded: [
        "Medical reports (GP, hospital, forensic)",
        "Injury mechanism analysis",
        "Timeline alignment (injury to incident)",
        "Alternative causation possibilities"
      ],
      killSwitch: "Uncontested medical causation linking injuries directly to defendant's actions with expert consensus.",
      priority: "secondary pressure"
    },
    {
      id: "disclosure_cctv",
      title: "Disclosure / CCTV Continuity / Quality Attack",
      target: "Exploit disclosure failures, CCTV gaps, continuity breaches, and evidence quality issues.",
      evidenceNeeded: [
        "MG6 schedules (disclosure requests)",
        "CCTV continuity chain (seizure, storage, exhibit logs)",
        "Unused material requests (MG6C)",
        "PACE compliance records"
      ],
      killSwitch: "Complete disclosure with no gaps, strong CCTV continuity chain, and full compliance with disclosure obligations.",
      priority: "leverage / pivot"
    }
  ],
  charge_reduction: [
    {
      id: "lesser_offence",
      title: "Lesser Alternative Offence Framing",
      target: "Frame case as lesser offence (e.g. ABH, common assault) or argue absence of specific intent for s18.",
      evidenceNeeded: [
        "Medical evidence supporting lesser harm",
        "Circumstances evidence (context, provocation)",
        "Intent vs recklessness distinction evidence",
        "Sentencing guidelines for alternative offences"
      ],
      killSwitch: "Medical evidence clearly supports GBH-level harm and circumstances show specific intent beyond reasonable doubt.",
      priority: "primary pressure"
    },
    {
      id: "negotiation_leverage",
      title: "Negotiation Leverage Checklist",
      target: "Identify what to request from CPS (charge reduction) and what can be conceded in negotiation.",
      evidenceNeeded: [
        "Prosecution case strength assessment",
        "Defendant's account / instructions",
        "Medical evidence clarity",
        "Witness reliability assessments"
      ],
      killSwitch: "CPS case is overwhelming with no negotiation room due to strong evidence on all elements.",
      priority: "secondary pressure"
    },
    {
      id: "basis_plea",
      title: "Basis of Plea / Newton Hearing Risk Control",
      target: "Control basis of plea to minimise sentence impact and manage Newton hearing risks.",
      evidenceNeeded: [
        "Sentencing guidelines (harm and culpability)",
        "Defendant's account / instructions",
        "Prosecution evidence on disputed facts",
        "Case law on basis of plea disputes"
      ],
      killSwitch: "Prosecution evidence on disputed facts is overwhelming, making basis of plea unsustainable.",
      priority: "leverage / pivot"
    }
  ],
  outcome_management: [
    {
      id: "mitigation_pack",
      title: "Mitigation Pack Checklist",
      target: "Assemble comprehensive mitigation package to support non-custodial or reduced sentence outcome.",
      evidenceNeeded: [
        "Character references (employment, community, family)",
        "Pre-sentence report (PSR) requests",
        "Medical / mental health reports",
        "Personal circumstances evidence (family, employment, health)"
      ],
      killSwitch: "Serious aggravating factors (previous convictions, victim vulnerability) outweigh mitigation.",
      priority: "primary pressure"
    },
    {
      id: "sentencing_guidelines",
      title: "Sentencing Guideline Anchor Points",
      target: "Identify guideline factors supporting reduced sentence: harm level, culpability, personal mitigation.",
      evidenceNeeded: [
        "Sentencing Council guidelines (relevant offence)",
        "Harm and culpability assessment",
        "Aggravating and mitigating factors checklist",
        "Case law on similar cases"
      ],
      killSwitch: "Guideline starting point is high with limited mitigation and significant aggravating factors.",
      priority: "secondary pressure"
    },
    {
      id: "early_plea",
      title: "Early Guilty Plea Credit / Timing Reminders",
      target: "Maximise credit for early guilty plea and manage timing of plea to preserve maximum credit.",
      evidenceNeeded: [
        "Stage of proceedings (first hearing, PTPH, pre-trial)",
        "Plea credit calculation (up to 1/3 reduction)",
        "Timeline of disclosure / case progression",
        "Client instructions on plea"
      ],
      killSwitch: "Client maintains not guilty plea or plea entered too late to qualify for maximum credit.",
      priority: "leverage / pivot"
    }
  ]
};

// Deterministic evidence needed based on strategy (non-AI, court-safe)
function getEvidenceNeeded(strategyType: PrimaryStrategy | null): string {
  if (!strategyType) return "Evidence requirements listed in Phase 2 steps.";
  
  switch (strategyType) {
    case "fight_charge":
      return "Full disclosure (CCTV, MG6 schedules, unused material). Identification evidence (VIPER pack, Turnbull compliance). PACE compliance records (interview, custody).";
    case "charge_reduction":
      return "Medical evidence (injury reports, GP records). Sequence evidence (CCTV, timings, targeting). Circumstances evidence (context of incident).";
    case "outcome_management":
      return "Prosecution case strength assessment. Personal circumstances evidence (employment, family, health). Character references. Mitigation materials.";
    default:
      return "Evidence requirements listed in Phase 2 steps.";
  }
}

// Deterministic pivot trigger template (non-AI, court-safe)
function getPivotTrigger(strategyType: PrimaryStrategy | null): string {
  if (!strategyType) return "Pivot guidance available in Phase 2 steps.";
  
  switch (strategyType) {
    case "fight_charge":
      return "Consider pivot if disclosure shows strong prosecution evidence on identification or intent, or if client accepts harm occurred but disputes specific intent.";
    case "charge_reduction":
      return "Consider pivot if medical evidence supports s18 rather than s20, or if prosecution evidence on intent is overwhelming.";
    case "outcome_management":
      return "Consider pivot if prosecution case weakens significantly (identification failures, disclosure gaps), creating viable trial defence.";
    default:
      return "Pivot guidance available in Phase 2 steps.";
  }
}

// Deterministic strategic intent per strategy (solicitor thinking, not checklist)
function getStrategicIntent(strategyType: PrimaryStrategy | null): string {
  if (!strategyType) return "";
  
  switch (strategyType) {
    case "fight_charge":
      return "Force CPS to prove identification and intent beyond evidential weaknesses; maintain downgrade leverage if thresholds fail.";
    case "charge_reduction":
      return "Establish recklessness narrative early; use medical/circumstantial evidence to create negotiation space before PTPH.";
    case "outcome_management":
      return "Build mitigation foundation while preserving plea credit; anchor sentencing position to guideline factors that reduce harm/culpability.";
    default:
      return "";
  }
}

// Deterministic case-break triggers per strategy (what breaks the case)
function getCaseBreakTriggers(strategyType: PrimaryStrategy | null): string[] {
  if (!strategyType) return [];
  
  switch (strategyType) {
    case "fight_charge":
      return [
        "Identification fails Turnbull (no VIPER, recognition only, multiple witnesses disagree)",
        "Disclosure gaps create abuse of process risk (MG6C missing, CCTV continuity broken)",
        "Medical causation disputed (injury mechanism unclear, alternative cause plausible)"
      ];
    case "charge_reduction":
      return [
        "Medical evidence supports s20 not s18 (injury mechanism suggests recklessness, not specific intent)",
        "Circumstances show lack of targeting/premeditation (spontaneous incident, provocation present)",
        "CPS case weak on intent element (no clear evidence of 'really serious harm' intent)"
      ];
    case "outcome_management":
      return [
        "Strong mitigation package (character references, PSR positive, personal circumstances compelling)",
        "Early guilty plea preserves maximum credit (first hearing or pre-trial, full 1/3 reduction)",
        "Guideline factors favour lower starting point (lower harm category, reduced culpability factors)"
      ];
    default:
      return [];
  }
}

// Conditional Trial Attack Plan (deterministic, court-safe, solicitor-facing)
type ConditionalAttackPlan = {
  cpsTheory: string;
  primaryAttacks: {
    intent: string;
    identification: string;
    weapon: string;
    sequence: string;
  };
  medicalTension: string;
  disclosureLeverage: string;
  collapsePath: string;
};

function getConditionalAttackPlan(strategyType: PrimaryStrategy | null): ConditionalAttackPlan | null {
  // Only generate for fight_charge strategy
  if (strategyType !== "fight_charge") return null;
  
  return {
    cpsTheory: "CPS will argue the defendant intended to cause really serious harm (s18 threshold). They will rely on: (1) nature and severity of injuries as evidence of intent, (2) witness identification placing defendant at scene, (3) sequence evidence showing sustained/targeted violence, (4) weapon inference (if applicable) suggesting premeditation. CPS case theory: deliberate, targeted attack with specific intent to cause GBH.",
    primaryAttacks: {
      intent: "If CPS relies on injury severity alone, the defence will argue that s18 requires proof of specific intent to cause really serious harm, not just recklessness. Absence of premeditation, targeting, or sustained violence undermines specific intent. Alternative: if harm occurred, it was reckless (s20) not intentional (s18).",
      identification: "If CPS relies on witness identification, the defence will challenge Turnbull compliance: (1) quality of identification (VIPER pack, recognition vs identification), (2) lighting/visibility conditions, (3) witness reliability (stress, time delay, contamination risk), (4) absence of supporting identification evidence. Defence position: identification is weak or unsafe.",
      weapon: "If CPS infers weapon use from injuries, the defence will argue: (1) injuries do not require weapon (can be caused by hands/feet), (2) no weapon recovered or linked to defendant, (3) alternative causation (fall, accident, self-inflicted), (4) medical evidence does not support weapon inference. Defence position: no weapon used or weapon inference is speculative.",
      sequence: "If CPS relies on sequence evidence (duration, escalation, targeting), the defence will challenge: (1) CCTV gaps or quality issues, (2) timing/sequence is disputed, (3) incident was spontaneous not premeditated, (4) sequence does not support sustained/targeted attack. Defence position: incident was brief, reactive, or lacks evidence of targeting."
    },
    medicalTension: "Medical evidence creates tension: if injuries are severe but mechanism is unclear, CPS will argue severity = intent. Defence will argue: (1) injury mechanism does not support weapon use, (2) alternative causation (fall, accident), (3) medical evidence is consistent with recklessness not specific intent, (4) timing of injuries is disputed (pre-existing, unrelated incident). Defence position: medical evidence does not prove specific intent to cause really serious harm.",
    disclosureLeverage: "If disclosure is incomplete (MG6C missing, CCTV continuity broken, unused material not disclosed), the defence will: (1) request full disclosure with specific requests, (2) if disclosure failures persist, draft abuse of process application, (3) argue exclusion of evidence where continuity is broken, (4) use disclosure failures to undermine prosecution case strength. Disclosure gaps create leverage: CPS must either provide material or face exclusion/abuse of process risk.",
    collapsePath: "The case collapses if CPS overreaches: (1) if CPS cannot prove identification beyond reasonable doubt (Turnbull failure), case fails, (2) if CPS cannot prove specific intent (only recklessness proven), charge reduces to s20, (3) if disclosure failures are material and persistent, abuse of process application may succeed, (4) if medical evidence does not support weapon inference or causation is disputed, CPS case weakens significantly. Defence position: force CPS to prove every element beyond reasonable doubt; exploit evidential weaknesses."
  };
}

// Beast Strategy Pack - Comprehensive court-safe attack brief
type BeastStrategyPack = {
  // 1. Route Dashboard
  dashboard: {
    objective: string;
    cpsMustProve: Array<{ element: string; cpsEvidence: string; defenceChallenge: string }>;
    top3Attacks: Array<{ target: string; leverage: string; evidenceRequired: string }>;
    primaryKillSwitch: { condition: string; pivotTo: string };
  };
  // 2. CPS Case Theory
  cpsTheory: {
    whatHappened: string;
    intentArgument: string;
    identificationArgument: string;
    weaponCausationArgument: string;
  };
  // 3. Defence Counter-Theory
  defenceTheory: {
    narrative: string;
    conditionalFlags: Array<{ area: string; missingEvidence: string }>;
    evidenceSupport: string[];
  };
  // 4. Attack Routes (Ranked)
  attackRoutes: Array<{
    target: string;
    evidenceSupporting: string;
    disclosureRequired: string;
    cpsResponse: string;
    defenceReply: string;
    riskIfFails: string;
  }>;
  // 5. Disclosure Leverage Chain
  disclosureLeverage: Array<{
    missingItem: string;
    whyItMatters: string;
    chaseWording: string;
    timeEscalation: string;
    applicationPath: string;
  }>;
  // 6. Courtroom Pressure Test
  courtroomPressure: Array<{
    judgeQuestion: string;
    cpsAnswer: string;
    defenceReply: string;
    evidenceCheck: string;
  }>;
  // 7. Kill Switches + Pivot Plan
  killSwitches: Array<{
    evidenceArrival: string;
    newRoute: string;
    preserved: string;
    abandoned: string;
  }>;
  // 8. Residual Attack Scanner
  residualAttacks: Array<{
    area: string;
    tested: boolean;
    leverage: string;
    evidenceNeeded: string;
  }>;
  // 9. Next 72 Hours
  next72Hours: string[];
};

function getBeastStrategyPack(strategyType: PrimaryStrategy | null): BeastStrategyPack | null {
  if (!strategyType) return null;
  
  switch (strategyType) {
    case "fight_charge":
      return {
        dashboard: {
          objective: "Knock out s18 intent. Force CPS to prove identification and specific intent beyond reasonable doubt. Exploit disclosure gaps and procedural weaknesses. Target acquittal or charge reduction to s20.",
          cpsMustProve: [
            { element: "Actus Reus (harm caused)", cpsEvidence: "Medical reports showing GBH-level injuries", defenceChallenge: "Challenge causation chain, alternative causation, pre-existing conditions" },
            { element: "Mens Rea (specific intent s18)", cpsEvidence: "Injury severity, sequence evidence, weapon inference", defenceChallenge: "Argue recklessness (s20) not specific intent, absence of premeditation/targeting" },
            { element: "Identification", cpsEvidence: "Witness statements, CCTV, recognition evidence", defenceChallenge: "Turnbull compliance, lighting/visibility, witness reliability, contamination risk" },
            { element: "Causation", cpsEvidence: "Medical evidence linking injuries to incident", defenceChallenge: "Dispute mechanism, timing, alternative causes" },
          ],
          top3Attacks: [
            { target: "Identification reliability", leverage: "If Turnbull guidelines not met, identification is unsafe", evidenceRequired: "VIPER pack, initial descriptions, lighting/visibility conditions [CONDITIONAL]" },
            { target: "Intent threshold (s18 vs s20)", leverage: "If sequence evidence shows spontaneity not targeting, s18 fails", evidenceRequired: "Full CCTV coverage, timings, duration [CONDITIONAL]" },
            { target: "Disclosure failures", leverage: "Persistent gaps create abuse of process risk", evidenceRequired: "MG6C, continuity logs, unused material [CONDITIONAL]" },
          ],
          primaryKillSwitch: { condition: "Strong uncontested identification + complete disclosure + medical evidence clearly links injuries", pivotTo: "charge_reduction or outcome_management" },
        },
        cpsTheory: {
          whatHappened: "CPS will likely argue: Defendant deliberately targeted the victim in a sustained attack. The sequence of events shows premeditation or at least clear targeting. The nature and severity of injuries demonstrate intent to cause really serious harm. [CONDITIONAL - pending full disclosure]",
          intentArgument: "CPS will argue intent from: (1) Injury severity suggests deliberate targeting, (2) Sequence evidence (duration, escalation, targeting) shows sustained violence, (3) Weapon use (if alleged) supports specific intent, (4) Circumstances show lack of provocation/self-defence. Defence will challenge: Severity alone does not prove intent; recklessness (s20) is alternative; sequence is disputed; weapon inference is speculative. [CONDITIONAL - requires full disclosure]",
          identificationArgument: "CPS will likely rely on: (1) Witness identification (VIPER pack, recognition evidence), (2) CCTV placing defendant at scene, (3) Supporting identification evidence. Defence will challenge under Turnbull: lighting/visibility, distance/duration, stress/contamination, reliability of initial description, absence of supporting identification. [CONDITIONAL - requires VIPER pack and full CCTV]",
          weaponCausationArgument: "CPS may infer weapon use from injury pattern. Defence will argue: (1) Injuries do not require weapon (hands/feet sufficient), (2) No weapon recovered or linked to defendant, (3) Alternative causation (fall, accident), (4) Medical evidence is ambiguous on mechanism. [CONDITIONAL - requires medical expert evidence]",
        },
        defenceTheory: {
          narrative: "Defence position: If the incident occurred, it was a brief, spontaneous altercation without specific intent to cause really serious harm. The defendant's actions (if any) were reckless not intentional. Identification is contested. [CONDITIONAL - reserved pending full disclosure including CCTV, witness statements, and medical evidence]",
          conditionalFlags: [
            { area: "Identification", missingEvidence: "VIPER pack, full CCTV coverage, initial descriptions [CONDITIONAL]" },
            { area: "Intent threshold", missingEvidence: "Complete sequence evidence, timings, duration [CONDITIONAL]" },
            { area: "Medical causation", missingEvidence: "Expert medical reports on injury mechanism [CONDITIONAL]" },
            { area: "Weapon inference", missingEvidence: "Forensic evidence linking weapon to defendant [CONDITIONAL]" },
          ],
          evidenceSupport: [
            "If CCTV shows brief incident → supports spontaneity not targeting [CONDITIONAL]",
            "If identification is single witness with poor lighting → supports Turnbull challenge [CONDITIONAL]",
            "If medical evidence is ambiguous on mechanism → supports alternative causation [CONDITIONAL]",
            "If disclosure gaps persist → supports procedural challenge [EVIDENCE-BACKED if gaps confirmed]",
          ],
        },
        attackRoutes: [
          {
            target: "Identification reliability (Turnbull)",
            evidenceSupporting: "Single witness, poor lighting conditions, time delay between incident and identification, potential contamination [CONDITIONAL - requires VIPER pack]",
            disclosureRequired: "VIPER pack, all CCTV from scene, initial witness descriptions, identification procedures, any failures to follow Turnbull",
            cpsResponse: "CPS will argue identification is strong, properly conducted, and supported by CCTV or other evidence",
            defenceReply: "If Turnbull guidelines not met, identification is unsafe. Defence will argue identification procedure was flawed or supporting evidence is weak. [CONDITIONAL - requires full disclosure]",
            riskIfFails: "If identification is strong and Turnbull compliant, this attack fails. Pivot to intent threshold or causation challenge.",
          },
          {
            target: "Intent threshold (s18 vs s20)",
            evidenceSupporting: "Brief incident duration, spontaneous altercation, lack of targeting or premeditation [CONDITIONAL - requires full CCTV]",
            disclosureRequired: "Complete CCTV coverage, sequence evidence, timings, duration, any evidence of provocation or self-defence",
            cpsResponse: "CPS will argue sequence shows sustained/targeted violence, duration supports specific intent, circumstances show premeditation",
            defenceReply: "Defence will argue sequence shows brief reactive incident, absence of targeting undermines specific intent, recklessness (s20) is established not s18. [CONDITIONAL - requires sequence evidence]",
            riskIfFails: "If sequence evidence clearly shows sustained targeting, s18 intent may be established. Pivot to charge_reduction if harm threshold met, or fight causation if medical evidence is weak.",
          },
          {
            target: "Disclosure failures (abuse of process)",
            evidenceSupporting: "MG6C missing, CCTV continuity broken, late material, unused material not disclosed [EVIDENCE-BACKED if gaps confirmed]",
            disclosureRequired: "Full MG6C, CCTV continuity logs, all unused material, all witness statements, prompt disclosure of any late material",
            cpsResponse: "CPS will argue disclosure is complete or gaps are not material to the case",
            defenceReply: "Defence will argue disclosure failures are material and persistent, creating unfair trial risk. If disclosure gaps persist after reasonable chase, draft abuse of process application. [EVIDENCE-BACKED if failures confirmed]",
            riskIfFails: "If disclosure is complete and timely, this attack fails. Focus on evidential weaknesses instead.",
          },
        ],
        disclosureLeverage: [
          {
            missingItem: "MG6C (unused material schedule)",
            whyItMatters: "Cannot assess whether prosecution has failed to disclose material that undermines case or assists defence",
            chaseWording: "Request full MG6C schedule pursuant to CPIA. Defence cannot properly assess case without full disclosure of unused material.",
            timeEscalation: "If not provided within 14 days, escalate to case management hearing. If still not provided, draft abuse of process application.",
            applicationPath: "Abuse of process application under s.78 PACE if persistent failures. Alternatively, exclusion of evidence if continuity is broken.",
          },
          {
            missingItem: "CCTV continuity logs",
            whyItMatters: "If continuity is broken, CCTV may be inadmissible. Continuity failures undermine prosecution case strength.",
            chaseWording: "Request CCTV continuity logs. Defence requires proof of unbroken chain of custody to assess admissibility.",
            timeEscalation: "If not provided within 7 days, request case management hearing to address admissibility. If continuity broken, challenge admissibility.",
            applicationPath: "Exclusion under s.78 PACE if continuity is broken or material gaps exist. Abuse of process if persistent failures.",
          },
          {
            missingItem: "VIPER pack / identification procedures",
            whyItMatters: "Cannot assess Turnbull compliance without identification procedure records. Turnbull failures make identification unsafe.",
            chaseWording: "Request VIPER pack and all identification procedure records. Defence requires these to assess Turnbull compliance and identification reliability.",
            timeEscalation: "If not provided within 14 days, request case management hearing. If Turnbull failures identified, challenge identification.",
            applicationPath: "Challenge identification under Turnbull guidelines. Exclusion of identification evidence if procedures were flawed.",
          },
        ],
        courtroomPressure: [
          {
            judgeQuestion: "Why is identification being challenged? The witness is clear.",
            cpsAnswer: "CPS will argue identification is strong, properly conducted, and supported by CCTV. Witness is reliable and procedures were correct.",
            defenceReply: "Defence position: Identification is challenged under Turnbull guidelines. [CONDITIONAL - pending VIPER pack review] Defence will argue: lighting/visibility issues, potential contamination, absence of supporting evidence. Cannot properly respond without full identification procedure records. [CONDITIONAL]",
            evidenceCheck: "Review VIPER pack, initial descriptions, lighting conditions, supporting identification evidence before relying on this reply.",
          },
          {
            judgeQuestion: "How can you challenge intent when the injuries are so serious?",
            cpsAnswer: "CPS will argue injury severity alone demonstrates intent, or injury severity combined with sequence evidence proves specific intent for s18.",
            defenceReply: "Defence position: Injury severity does not prove specific intent. s18 requires proof of specific intent to cause really serious harm, not just recklessness. Medical evidence [CONDITIONAL - requires expert reports] may show mechanism consistent with recklessness not specific intent. Sequence evidence [CONDITIONAL - requires full CCTV] may show spontaneity not targeting. [CONDITIONAL]",
            evidenceCheck: "Review medical expert reports on injury mechanism and full sequence evidence before relying on this reply.",
          },
          {
            judgeQuestion: "Why should disclosure failures lead to exclusion or stay?",
            cpsAnswer: "CPS will argue disclosure is complete, gaps are not material, or any failures are not persistent enough to warrant exclusion/stay.",
            defenceReply: "Defence position: [EVIDENCE-BACKED if gaps confirmed] Disclosure failures are material to assessment of case. Defence cannot properly prepare without full disclosure. If failures persist after reasonable chase, unfair trial risk arises. Defence will argue exclusion/stay is appropriate if failures are persistent and material. [EVIDENCE-BACKED if failures confirmed]",
            evidenceCheck: "Confirm disclosure gaps are material and persistent before relying on this reply. Review chase correspondence and time delays.",
          },
        ],
        killSwitches: [
          {
            evidenceArrival: "Strong uncontested identification with multiple witnesses and clear Turnbull compliance",
            newRoute: "Pivot to charge_reduction (s18 → s20) if identification is strong but intent threshold can be challenged. Alternatively, pivot to outcome_management if case is overwhelming.",
            preserved: "Intent threshold challenge (if medical/sequence evidence supports s20), disclosure leverage (if gaps persist), causation challenges",
            abandoned: "Identification challenge, abuse of process on identification grounds",
          },
          {
            evidenceArrival: "Complete disclosure with no gaps and strong CCTV continuity",
            newRoute: "Pivot to charge_reduction or outcome_management. Focus on evidential weaknesses (intent, causation) rather than procedural challenges.",
            preserved: "Intent threshold challenge, medical causation challenges, sequence evidence arguments",
            abandoned: "Abuse of process on disclosure grounds, CCTV continuity challenges",
          },
          {
            evidenceArrival: "Medical evidence clearly links injuries to defendant's actions with expert consensus",
            newRoute: "Pivot to intent threshold challenge (s18 vs s20) or outcome_management if causation is clear. Abandon causation challenges.",
            preserved: "Intent threshold challenge, identification challenges, disclosure leverage (if gaps persist)",
            abandoned: "Causation challenges, alternative causation arguments",
          },
        ],
        residualAttacks: [
          { area: "Identification", tested: false, leverage: "Turnbull compliance, lighting/visibility, witness reliability", evidenceNeeded: "VIPER pack, full CCTV, initial descriptions [CONDITIONAL]" },
          { area: "Intent", tested: false, leverage: "s18 vs s20 distinction, sequence evidence, premeditation", evidenceNeeded: "Full sequence evidence, timings, duration [CONDITIONAL]" },
          { area: "Causation", tested: false, leverage: "Medical mechanism, alternative causes, timing", evidenceNeeded: "Expert medical reports, full medical records [CONDITIONAL]" },
          { area: "Admissibility", tested: false, leverage: "PACE compliance, exclusion under s.78", evidenceNeeded: "PACE records, custody records, interview records [CONDITIONAL]" },
          { area: "Continuity", tested: false, leverage: "Chain of custody breaks, exclusion of evidence", evidenceNeeded: "Continuity logs, custody records [CONDITIONAL]" },
          { area: "PACE / Interview", tested: false, leverage: "PACE breaches, exclusion of interview evidence", evidenceNeeded: "Interview records, custody records, PACE records [CONDITIONAL]" },
          { area: "Medical mechanics", tested: false, leverage: "Injury mechanism does not support weapon inference or specific intent", evidenceNeeded: "Expert medical reports, injury mechanism analysis [CONDITIONAL]" },
        ],
        next72Hours: [
          "Request full disclosure (MG6C, CCTV continuity logs, VIPER pack, all witness statements)",
          "Review identification evidence for Turnbull compliance [CONDITIONAL - requires VIPER pack]",
          "Assess PACE compliance (interview, custody, evidence handling) [CONDITIONAL - requires PACE records]",
          "Draft initial disclosure requests with specific material identified",
          "Prepare case management note highlighting disclosure gaps [EVIDENCE-BACKED if gaps confirmed]",
          "Review medical evidence for causation challenges [CONDITIONAL - requires expert reports]",
          "Assess sequence evidence (CCTV, timings, duration) for intent distinction [CONDITIONAL - requires full CCTV]",
        ],
      };
    case "charge_reduction":
      return {
        dashboard: {
          objective: "Knock out s18 intent threshold. Accept harm occurred but challenge specific intent. Force charge reduction from s18 to s20 (reckless GBH). Target negotiated reduction before PTPH if medical/sequence evidence supports s20.",
          cpsMustProve: [
            { element: "Harm (GBH-level)", cpsEvidence: "Medical reports showing serious injuries", defenceChallenge: "Accept harm occurred but dispute mechanism or severity assessment" },
            { element: "Intent (s18 specific intent)", cpsEvidence: "Sequence evidence, targeting, premeditation", defenceChallenge: "Argue recklessness (s20) not specific intent, spontaneous not premeditated" },
            { element: "Causation", cpsEvidence: "Medical evidence linking injuries to incident", defenceChallenge: "Accept causation but dispute intent threshold" },
          ],
          top3Attacks: [
            { target: "Intent threshold (s18 vs s20)", leverage: "If sequence evidence shows spontaneity not targeting, s18 fails", evidenceRequired: "Full sequence evidence, timings, duration [CONDITIONAL]" },
            { target: "Medical evidence (intent mechanism)", leverage: "If medical evidence supports recklessness not specific intent, s18 fails", evidenceRequired: "Expert medical reports, injury mechanism analysis [CONDITIONAL]" },
            { target: "Circumstances (lack of premeditation)", leverage: "If circumstances show spontaneous incident, s18 intent threshold not met", evidenceRequired: "Full circumstances evidence, context, provocation [CONDITIONAL]" },
          ],
          primaryKillSwitch: { condition: "Medical evidence clearly supports s18 (specific intent mechanism) + sequence evidence shows clear targeting/premeditation", pivotTo: "outcome_management if charge reduction fails" },
        },
        cpsTheory: {
          whatHappened: "CPS will likely argue: Defendant deliberately targeted the victim with intent to cause really serious harm. The sequence shows targeting or premeditation. The circumstances support specific intent. [CONDITIONAL - pending full disclosure]",
          intentArgument: "CPS will argue specific intent from: (1) Medical evidence supports s18 (injury mechanism suggests deliberate targeting), (2) Sequence evidence shows targeting/premeditation (duration, escalation, sustained violence), (3) Circumstances show lack of provocation/self-defence. Defence will challenge: Medical evidence may support s20 (recklessness), sequence may show spontaneity, circumstances may show lack of targeting. [CONDITIONAL - requires full disclosure]",
          identificationArgument: "CPS will likely rely on identification evidence. Defence accepts identification [if clear] but challenges intent threshold. [CONDITIONAL - requires identification evidence review]",
          weaponCausationArgument: "CPS may infer weapon use or specific intent from injury pattern. Defence will argue: (1) Injuries do not require weapon, (2) Injury mechanism supports recklessness not specific intent, (3) Medical evidence is ambiguous on intent. [CONDITIONAL - requires medical expert evidence]",
        },
        defenceTheory: {
          narrative: "Defence position: Harm occurred, but the defendant's actions were reckless not intentional. The incident was spontaneous, not premeditated. The defendant lacked specific intent to cause really serious harm. s20 (reckless GBH) is appropriate, not s18. [CONDITIONAL - reserved pending full disclosure including medical evidence, sequence evidence, and circumstances]",
          conditionalFlags: [
            { area: "Intent mechanism", missingEvidence: "Expert medical reports on injury mechanism [CONDITIONAL]" },
            { area: "Sequence evidence", missingEvidence: "Full sequence evidence, timings, duration [CONDITIONAL]" },
            { area: "Circumstances", missingEvidence: "Full circumstances evidence, context, provocation [CONDITIONAL]" },
          ],
          evidenceSupport: [
            "If medical evidence shows recklessness mechanism → supports s20 not s18 [CONDITIONAL]",
            "If sequence shows spontaneity → supports lack of specific intent [CONDITIONAL]",
            "If circumstances show lack of targeting → supports recklessness argument [CONDITIONAL]",
          ],
        },
        attackRoutes: [
          {
            target: "Intent threshold (s18 vs s20) - Medical evidence",
            evidenceSupporting: "Medical evidence shows injury mechanism consistent with recklessness not specific intent [CONDITIONAL - requires expert reports]",
            disclosureRequired: "Expert medical reports, full medical records, injury mechanism analysis, any expert opinions on intent",
            cpsResponse: "CPS will argue medical evidence supports s18 (specific intent mechanism) or injury severity demonstrates intent",
            defenceReply: "Defence will argue medical evidence supports s20 (recklessness mechanism) not s18. Injury mechanism analysis [CONDITIONAL - requires expert reports] may show recklessness not specific intent. [CONDITIONAL]",
            riskIfFails: "If medical evidence clearly supports s18, this attack fails. Pivot to sequence evidence challenge or outcome_management.",
          },
          {
            target: "Intent threshold (s18 vs s20) - Sequence evidence",
            evidenceSupporting: "Sequence evidence shows brief spontaneous incident, lack of targeting or premeditation [CONDITIONAL - requires full CCTV]",
            disclosureRequired: "Complete sequence evidence, timings, duration, any evidence of targeting or premeditation",
            cpsResponse: "CPS will argue sequence shows sustained/targeted violence, duration supports specific intent, circumstances show premeditation",
            defenceReply: "Defence will argue sequence shows spontaneity not targeting, absence of premeditation undermines specific intent, recklessness (s20) is established not s18. [CONDITIONAL - requires sequence evidence]",
            riskIfFails: "If sequence clearly shows targeting/premeditation, this attack fails. Pivot to medical evidence challenge or outcome_management.",
          },
        ],
        disclosureLeverage: [
          {
            missingItem: "Expert medical reports / injury mechanism analysis",
            whyItMatters: "Cannot assess whether injury mechanism supports s18 (specific intent) or s20 (recklessness) without expert analysis",
            chaseWording: "Request expert medical reports and injury mechanism analysis. Defence requires these to assess intent distinction (s18 vs s20).",
            timeEscalation: "If not provided within 14 days, request case management hearing. Charge reduction negotiation may proceed if medical evidence supports s20.",
            applicationPath: "Request charge reduction before PTPH if medical/sequence evidence supports s20. Alternatively, prepare trial defence on intent distinction.",
          },
          {
            missingItem: "Full sequence evidence (CCTV, timings, duration)",
            whyItMatters: "Cannot assess intent distinction without full sequence evidence. Sequence evidence is key to s18 vs s20 distinction.",
            chaseWording: "Request full sequence evidence including complete CCTV coverage, timings, and duration. Defence requires this to assess intent distinction.",
            timeEscalation: "If not provided within 14 days, request case management hearing. Charge reduction negotiation may proceed if sequence supports spontaneity.",
            applicationPath: "Request charge reduction before PTPH if sequence evidence supports spontaneity not targeting. Alternatively, prepare trial defence on intent distinction.",
          },
        ],
        courtroomPressure: [
          {
            judgeQuestion: "How can you argue s20 when the injuries are so serious?",
            cpsAnswer: "CPS will argue injury severity demonstrates intent, or medical evidence supports s18 (specific intent mechanism).",
            defenceReply: "Defence position: Injury severity does not prove specific intent. s18 requires proof of specific intent to cause really serious harm. Medical evidence [CONDITIONAL - requires expert reports] may show mechanism consistent with recklessness (s20) not specific intent (s18). [CONDITIONAL]",
            evidenceCheck: "Review expert medical reports on injury mechanism before relying on this reply.",
          },
          {
            judgeQuestion: "How can sequence evidence show recklessness when the attack was sustained?",
            cpsAnswer: "CPS will argue sequence shows sustained/targeted violence, duration supports specific intent, circumstances show premeditation.",
            defenceReply: "Defence position: Sequence evidence [CONDITIONAL - requires full CCTV] may show brief reactive incident, absence of targeting undermines specific intent, spontaneity supports recklessness not specific intent. [CONDITIONAL]",
            evidenceCheck: "Review full sequence evidence (CCTV, timings, duration) before relying on this reply.",
          },
        ],
        killSwitches: [
          {
            evidenceArrival: "Medical evidence clearly supports s18 (specific intent mechanism)",
            newRoute: "Pivot to outcome_management if charge reduction fails. Focus on mitigation and sentencing position.",
            preserved: "Sequence evidence challenge (if spontaneity can be argued), circumstances arguments",
            abandoned: "Medical evidence challenge, injury mechanism arguments",
          },
          {
            evidenceArrival: "Sequence evidence shows clear targeting/premeditation",
            newRoute: "Pivot to outcome_management if charge reduction fails. Focus on mitigation and sentencing position.",
            preserved: "Medical evidence challenge (if mechanism supports s20), circumstances arguments",
            abandoned: "Sequence evidence challenge, spontaneity arguments",
          },
        ],
        residualAttacks: [
          { area: "Intent threshold", tested: false, leverage: "s18 vs s20 distinction, medical mechanism, sequence evidence", evidenceNeeded: "Expert medical reports, full sequence evidence [CONDITIONAL]" },
          { area: "Circumstances", tested: false, leverage: "Lack of premeditation, spontaneity, provocation", evidenceNeeded: "Full circumstances evidence, context [CONDITIONAL]" },
          { area: "Medical mechanism", tested: false, leverage: "Injury mechanism supports recklessness not specific intent", evidenceNeeded: "Expert medical reports, injury mechanism analysis [CONDITIONAL]" },
        ],
        next72Hours: [
          "Request medical evidence (full records, expert reports, injury mechanism analysis) [CONDITIONAL]",
          "Review sequence evidence (CCTV, timings, duration) for intent distinction [CONDITIONAL]",
          "Request circumstances evidence (context, provocation, self-defence) [CONDITIONAL]",
          "Prepare charge reduction negotiation brief (s18 → s20)",
          "Draft written submissions on intent distinction for case management",
          "Review sentencing guidelines for s20 vs s18 implications",
          "Prepare basis of plea if charge reduction succeeds",
        ],
      };
    case "outcome_management":
      return {
        dashboard: {
          objective: "Minimise sentence through strong mitigation and early guilty plea. Target non-custodial outcome or reduced custodial sentence. Focus on rehabilitation and reduced culpability.",
          cpsMustProve: [
            { element: "Harm level", cpsEvidence: "Medical evidence, circumstances", defenceChallenge: "Argue lower harm category, reduced culpability factors" },
            { element: "Culpability", cpsEvidence: "Sequence evidence, intent, targeting", defenceChallenge: "Argue reduced culpability (provocation, lack of premeditation)" },
            { element: "Personal mitigation", cpsEvidence: "Previous convictions, aggravating factors", defenceChallenge: "Present strong mitigation (character, employment, family, remorse)" },
          ],
          top3Attacks: [
            { target: "Mitigation package", leverage: "Strong character, employment, family circumstances support non-custodial outcome", evidenceRequired: "Character references, employment records, family circumstances [CONDITIONAL]" },
            { target: "Early guilty plea credit", leverage: "Up to 1/3 sentence reduction for early guilty plea", evidenceRequired: "Timing of plea, cooperation with authorities [EVIDENCE-BACKED if early plea entered]" },
            { target: "Reduced culpability", leverage: "Provocation, lack of premeditation, reduced harm category support lower starting point", evidenceRequired: "Circumstances evidence, harm assessment [CONDITIONAL]" },
          ],
          primaryKillSwitch: { condition: "Sentencing guidelines clearly point to custody despite mitigation + aggravating factors overwhelming", pivotTo: "Focus on sentence length reduction rather than non-custodial outcome" },
        },
        cpsTheory: {
          whatHappened: "CPS will likely argue: Offence is serious and warrants custodial sentence. Aggravating factors outweigh mitigation. Sentencing guidelines point to custody. [CONDITIONAL - pending sentencing assessment]",
          intentArgument: "CPS will argue: Intent is established (s18 or s20), harm is serious, aggravating factors exist. Defence will focus on mitigation rather than challenging intent.",
          identificationArgument: "CPS will likely rely on identification evidence. Defence accepts identification [if clear] and focuses on mitigation. [CONDITIONAL - requires identification evidence review]",
          weaponCausationArgument: "CPS may rely on weapon use or causation evidence. Defence focuses on mitigation rather than challenging causation.",
        },
        defenceTheory: {
          narrative: "Defence position: Defendant accepts responsibility (if guilty plea entered) or focuses on mitigation. Strong mitigation package supports non-custodial outcome or reduced custodial sentence. [CONDITIONAL - reserved pending full mitigation evidence]",
          conditionalFlags: [
            { area: "Personal mitigation", missingEvidence: "Character references, employment records, family circumstances [CONDITIONAL]" },
            { area: "Medical/mental health", missingEvidence: "Medical/mental health reports supporting mitigation [CONDITIONAL]" },
            { area: "Rehabilitation", missingEvidence: "Evidence of rehabilitation efforts, cooperation, remorse [CONDITIONAL]" },
          ],
          evidenceSupport: [
            "If character references are strong → supports mitigation [CONDITIONAL]",
            "If employment records show stability → supports mitigation [CONDITIONAL]",
            "If family circumstances show hardship → supports mitigation [CONDITIONAL]",
          ],
        },
        attackRoutes: [
          {
            target: "Mitigation package",
            evidenceSupporting: "Strong character references, employment stability, family circumstances, rehabilitation efforts [CONDITIONAL - requires mitigation evidence]",
            disclosureRequired: "Character references, employment records, family circumstances, medical/mental health reports, rehabilitation evidence",
            cpsResponse: "CPS will argue aggravating factors outweigh mitigation, offence is too serious for non-custodial outcome",
            defenceReply: "Defence will argue mitigation is strong, supports non-custodial outcome or reduced custodial sentence. Present comprehensive mitigation package. [CONDITIONAL - requires mitigation evidence]",
            riskIfFails: "If mitigation is insufficient or aggravating factors are overwhelming, non-custodial outcome may not be achievable. Focus on sentence length reduction.",
          },
          {
            target: "Early guilty plea credit",
            evidenceSupporting: "Early guilty plea entered, cooperation with authorities [EVIDENCE-BACKED if early plea entered]",
            disclosureRequired: "Timing of plea, cooperation evidence, any evidence of remorse",
            cpsResponse: "CPS will accept early guilty plea credit but argue sentence still warrants custody",
            defenceReply: "Defence will argue early guilty plea warrants up to 1/3 sentence reduction. Combined with strong mitigation, supports non-custodial outcome or reduced custodial sentence. [EVIDENCE-BACKED if early plea entered]",
            riskIfFails: "If plea is not early or mitigation is insufficient, sentence reduction may be limited.",
          },
        ],
        disclosureLeverage: [
          {
            missingItem: "Character references / employment records",
            whyItMatters: "Cannot present strong mitigation package without character and employment evidence",
            chaseWording: "Request character references and employment records. Defence requires these to present mitigation package.",
            timeEscalation: "If not provided, mitigation package may be incomplete. Request promptly for sentencing hearing preparation.",
            applicationPath: "Present mitigation at sentencing hearing. Request pre-sentence report (PSR) if appropriate.",
          },
          {
            missingItem: "Medical/mental health reports",
            whyItMatters: "Medical/mental health reports may support mitigation and reduced culpability",
            chaseWording: "Request medical/mental health reports supporting mitigation. Defence requires these for sentencing submissions.",
            timeEscalation: "If not provided, mitigation package may be incomplete. Request promptly for sentencing hearing preparation.",
            applicationPath: "Present medical/mental health mitigation at sentencing hearing.",
          },
        ],
        courtroomPressure: [
          {
            judgeQuestion: "Why should this not be a custodial sentence given the seriousness?",
            cpsAnswer: "CPS will argue offence is serious, aggravating factors exist, sentencing guidelines point to custody.",
            defenceReply: "Defence position: Strong mitigation package [CONDITIONAL - requires mitigation evidence] combined with early guilty plea credit supports non-custodial outcome or reduced custodial sentence. Rehabilitation prospects are good. [CONDITIONAL]",
            evidenceCheck: "Review mitigation evidence (character, employment, family, rehabilitation) before relying on this reply.",
          },
          {
            judgeQuestion: "What mitigation can be presented?",
            cpsAnswer: "CPS will accept mitigation but argue it does not outweigh seriousness or aggravating factors.",
            defenceReply: "Defence will present: Character references [CONDITIONAL], employment stability [CONDITIONAL], family circumstances [CONDITIONAL], rehabilitation efforts [CONDITIONAL], early guilty plea credit [EVIDENCE-BACKED if early plea], medical/mental health mitigation [CONDITIONAL]. [CONDITIONAL]",
            evidenceCheck: "Review all mitigation evidence before relying on this reply.",
          },
        ],
        killSwitches: [
          {
            evidenceArrival: "Sentencing guidelines clearly point to custody despite mitigation",
            newRoute: "Focus on sentence length reduction rather than non-custodial outcome. Emphasise rehabilitation and early release prospects.",
            preserved: "Mitigation package, early guilty plea credit, rehabilitation arguments",
            abandoned: "Non-custodial outcome arguments",
          },
          {
            evidenceArrival: "Aggravating factors are overwhelming (previous convictions, victim vulnerability)",
            newRoute: "Focus on sentence length reduction and rehabilitation. Accept custodial outcome is likely.",
            preserved: "Early guilty plea credit, rehabilitation arguments, reduced culpability arguments",
            abandoned: "Non-custodial outcome arguments",
          },
        ],
        residualAttacks: [
          { area: "Personal mitigation", tested: false, leverage: "Character, employment, family, rehabilitation", evidenceNeeded: "Character references, employment records, family circumstances [CONDITIONAL]" },
          { area: "Medical/mental health", tested: false, leverage: "Medical/mental health mitigation, reduced culpability", evidenceNeeded: "Medical/mental health reports [CONDITIONAL]" },
          { area: "Early guilty plea", tested: false, leverage: "Up to 1/3 sentence reduction", evidenceNeeded: "Timing of plea, cooperation evidence [EVIDENCE-BACKED if early plea]" },
          { area: "Rehabilitation", tested: false, leverage: "Rehabilitation prospects, cooperation, remorse", evidenceNeeded: "Rehabilitation evidence, cooperation evidence [CONDITIONAL]" },
        ],
        next72Hours: [
          "Prepare comprehensive mitigation package (character references, employment, family circumstances) [CONDITIONAL]",
          "Request pre-sentence report (PSR) if appropriate",
          "Gather medical/mental health reports supporting mitigation [CONDITIONAL]",
          "Review sentencing guidelines for harm/culpability factors",
          "Prepare sentencing submissions focusing on rehabilitation",
          "Consider early guilty plea timing for maximum credit [if not already entered]",
          "Prepare basis of plea if guilty plea entered",
        ],
      };
    default:
      return null;
  }
}

// Deterministic next steps based on committed strategy_type (non-AI)
function getDeterministicNextSteps(strategyType: PrimaryStrategy | null): string[] {
  if (!strategyType) return [];
  
  switch (strategyType) {
    case "fight_charge":
      return [
        "Request full disclosure including CCTV, MG6 schedules, and unused material",
        "Review all evidence for identification reliability under Turnbull guidelines",
        "Assess PACE compliance and potential exclusion of interview/custody evidence",
        "Prepare disclosure requests for missing material (MG6C, CCTV continuity, VIPER pack)",
        "Draft abuse of process application if disclosure failures persist after chase",
        "Prepare trial defence focusing on intent, identification, and procedural breaches",
      ];
    case "charge_reduction":
      return [
        "Request disclosure focusing on medical evidence and circumstances of incident",
        "Review medical reports to assess whether injuries support s18 (specific intent) or s20 (recklessness)",
        "Analyse CCTV/sequence evidence for duration and targeting (key to intent distinction)",
        "Gather evidence supporting recklessness rather than specific intent",
        "Prepare case for charge reduction negotiation (s18 → s20) before PTPH",
        "Draft written submissions on intent distinction for case management hearing",
      ];
    case "outcome_management":
      return [
        "Request disclosure to assess prosecution case strength and realistic prospects",
        "Consider early guilty plea if case is strong (maximum sentence reduction)",
        "Prepare comprehensive mitigation package including character references",
        "Gather personal circumstances evidence (employment, family, health, remorse)",
        "Review sentencing guidelines and identify factors supporting non-custodial outcome",
        "Prepare sentencing submissions focusing on rehabilitation and reduced culpability",
      ];
    default:
      return [];
  }
}

export function StrategyCommitmentPanel({ 
  caseId, 
  onCommitmentChange,
  savedPosition: propSavedPosition
}: StrategyCommitmentPanelProps) {
  const params = useParams();
  const router = useRouter();
  const resolvedCaseId = (caseId ?? params.caseId) as string | undefined;
  
  // Client-only debug detection (safe, no Next/navigation hooks)
  const isDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug");
  
  const [savedPosition, setSavedPosition] = useState<SavedPosition | null>(propSavedPosition || null);
  const [primary, setPrimary] = useState<PrimaryStrategy | null>(null);
  const [secondary, setSecondary] = useState<SecondaryStrategy[]>([]);
  const [isCommitted, setIsCommitted] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committedAt, setCommittedAt] = useState<string | null>(null);
  const [strategyRoutes, setStrategyRoutes] = useState<StrategyRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [artifacts, setArtifacts] = useState<StrategyArtifact[]>([]);
  const [isGated, setIsGated] = useState(false);
  const [recommendation, setRecommendation] = useState<StrategyRecommendation | null>(null);
  const [evidenceImpactMap, setEvidenceImpactMap] = useState<EvidenceImpactMap[]>([]);
  const [timePressure, setTimePressure] = useState<TimePressureState | null>(null);
  const [confidenceStates, setConfidenceStates] = useState<Record<string, any>>({});
  const [decisionCheckpoints, setDecisionCheckpoints] = useState<DecisionCheckpoint[]>([]);
  const [analysisVersionInfo, setAnalysisVersionInfo] = useState<{
    has_analysis_version: boolean;
    analysis_mode: "complete" | "preview" | "none";
  } | null>(null);
  const { push: showToast } = useToast();
  const storageKey = `casebrain:strategyCommitment:${resolvedCaseId}`;

  // Earliest reliable indicator that strategy data exists (UNCONDITIONAL - no phase/commit/route/loading gates)
  const hasStrategyData = (
    strategyRoutes.length > 0 ||
    recommendation !== null ||
    artifacts.length > 0 ||
    evidenceImpactMap.length > 0 ||
    timePressure !== null ||
    decisionCheckpoints.length > 0
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Load analysis version info
  useEffect(() => {
    if (!resolvedCaseId) return;
    
    async function fetchAnalysisVersion() {
      try {
        const versionRes = await fetch(`/api/cases/${resolvedCaseId}/analysis/version/latest`);
        if (versionRes.ok) {
          const versionData = await versionRes.json();
          const versionInfo = versionData?.data || versionData;
          setAnalysisVersionInfo({
            has_analysis_version: versionInfo?.has_analysis_version === true || versionInfo?.version_number !== null,
            analysis_mode: versionInfo?.analysis_mode || (versionInfo?.version_number ? "complete" : "none"),
          });
        }
      } catch {
        // Fail silently
        setAnalysisVersionInfo({ has_analysis_version: false, analysis_mode: "none" });
      }
    }
    
    fetchAnalysisVersion();
  }, [resolvedCaseId]);

  // Load strategy routes from strategy-analysis endpoint
  useEffect(() => {
    if (!resolvedCaseId) return;

    setIsLoadingRoutes(true);
    console.log("[StrategyCommitmentPanel] resolvedCaseId", resolvedCaseId);
    
    fetch(`/api/criminal/${resolvedCaseId}/strategy-analysis`)
      .then(res => res.json())
      .then(data => {
        if (data?.ok && data?.data?.routes) {
          setStrategyRoutes(data.data.routes);
          setSelectedRouteId(data.data.selectedRoute);
          if (data.data.artifacts) {
            setArtifacts(data.data.artifacts);
          }
          if (data.data.recommendation) {
            setRecommendation(data.data.recommendation);
          }
          if (data.data.evidenceImpactMap) {
            setEvidenceImpactMap(data.data.evidenceImpactMap);
          }
          if (data.data.timePressure) {
            setTimePressure(data.data.timePressure);
          }
          if (data.data.confidenceStates) {
            setConfidenceStates(data.data.confidenceStates);
          }
          if (data.data.decisionCheckpoints) {
            setDecisionCheckpoints(data.data.decisionCheckpoints);
          }
          if (data.data.diagnostics) {
            setIsGated(data.data.diagnostics.isGated || !data.data.diagnostics.canGenerateAnalysis);
          }
          if (data.banner) {
            setIsGated(true);
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        setIsLoadingRoutes(false);
      });
  }, [resolvedCaseId]);

  // Load saved position if not provided as prop
  useEffect(() => {
    if (propSavedPosition !== undefined) {
      setSavedPosition(propSavedPosition);
      return;
    }
    if (!resolvedCaseId) return;
    
    async function fetchPosition() {
      try {
        const res = await fetch(`/api/criminal/${resolvedCaseId}/position`);
        if (res.ok) {
          const result = await res.json();
          if (result.ok && result.data) {
            setSavedPosition(result.data);
          } else {
            setSavedPosition(null);
          }
        } else {
          setSavedPosition(null);
        }
      } catch {
        setSavedPosition(null);
      }
    }
    fetchPosition();
  }, [resolvedCaseId, propSavedPosition]);

  // Load commitment from API on mount
  useEffect(() => {
    if (!resolvedCaseId) return;
    
    async function loadCommitment() {
      try {
        const response = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`);
        if (response.ok) {
          const result = await response.json();
          // Determine committed state via !!data.primary_strategy
          // If commitment exists (data.primary_strategy truthy), do NOT show "Strategy analysis pending"
          if (result.ok && result.data && result.data.primary_strategy) {
            const strategy = result.data;
            setPrimary(strategy.primary_strategy);
            setSecondary(strategy.fallback_strategies || []);
            // If primary_strategy exists, strategy is committed
            setIsCommitted(true);
            // Show committed_at date if present
            setCommittedAt(strategy.committed_at || strategy.created_at || null);
            onCommitmentChange({
              primary: strategy.primary_strategy,
              secondary: strategy.fallback_strategies || [],
            });
            return;
          } else {
            // No commitment found - show "Strategy analysis pending" or "Select a strategy to proceed"
            setIsCommitted(false);
            setCommittedAt(null);
            setPrimary(null);
            setSecondary([]);
          }
        }
      } catch (error) {
        console.error("Failed to load strategy commitment:", error);
        // On error, assume no commitment
        setIsCommitted(false);
        setCommittedAt(null);
      }

      // Fallback to localStorage if no API commitment
      try {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
        if (saved) {
          const parsed = JSON.parse(saved) as StrategyCommitment;
          if (parsed?.primary) {
            setPrimary(parsed.primary);
            setSecondary(parsed.secondary?.slice(0, 3) || []);
            onCommitmentChange({
              primary: parsed.primary,
              secondary: parsed.secondary?.slice(0, 3) || [],
            });
          }
        }
      } catch {
        // fail silently; treat as no saved commitment
      }
    }
    loadCommitment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCaseId]);

  const handlePrimarySelect = (strategy: PrimaryStrategy) => {
    setPrimary(strategy);
    // Remove from secondary if it was there
    setSecondary(prev => prev.filter(s => s !== strategy));
    
    // Notify parent
    const commitment: StrategyCommitment = {
      primary: strategy,
      secondary: secondary.filter(s => s !== strategy),
    };
    onCommitmentChange(commitment);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(commitment));
    } catch {
      // ignore storage errors
    }
  };

  const handleSecondaryToggle = (strategy: SecondaryStrategy) => {
    if (strategy === primary) return; // Can't select primary as secondary
    
    setSecondary(prev => {
      const newSecondary = prev.includes(strategy)
        ? prev.filter(s => s !== strategy)
        : prev.length < 3
          ? [...prev, strategy]
          : prev; // Max 3 secondary
      
      // Notify parent if primary is set
      if (primary) {
        const commitment = { primary, secondary: newSecondary };
        onCommitmentChange(commitment);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(commitment));
        } catch {
          // ignore storage errors
        }
      }
      
      return newSecondary;
    });
  };

  const handleCommit = async () => {
    if (!primary) {
      showToast("No strategy selected. Please select a primary strategy before committing.", "error");
      return;
    }

    setIsCommitting(true);
      // CRITICAL: Never throw - always handle errors gracefully to prevent React crashes
    try {
      if (!resolvedCaseId) {
        showToast("Case ID not available", "error");
        return;
      }
      
      const response = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // EXACT keys: primary_strategy, fallback_strategies, strategy_type
          primary_strategy: primary, // Internal id: fight_charge / charge_reduction / outcome_management
          fallback_strategies: secondary.slice(0, 3), // Max 3 fallback strategies
          strategy_type: primary, // strategy_type must be the internal id (same as primary_strategy)
        }),
      });

      // Handle network errors
      if (!response.ok && response.status >= 500) {
        const errorText = await response.text().catch(() => "Server error");
        showToast(`Failed to commit strategy: Server error (${response.status})`, "error");
        setIsCommitting(false);
        return;
      }

      const result = await response.json().catch(() => ({ ok: false, error: "Invalid JSON response" }));

      if (!result.ok) {
        const errorMsg = result.error || "Failed to commit strategy";
        const detailsMsg = result.details ? ` (${result.details})` : "";
        showToast(`${errorMsg}${detailsMsg}`, "error");
        setIsCommitting(false);
        return;
      }

      if (!result.data || !result.data.primary_strategy) {
        showToast("Commit succeeded but no strategy data returned", "error");
        setIsCommitting(false);
        return;
      }

      // Immediately re-fetch GET and update UI state so committed strategy displays
      const getResponse = await fetch(`/api/criminal/${resolvedCaseId}/strategy-commitment`);
      if (getResponse.ok) {
        const getResult = await getResponse.json().catch(() => ({ ok: false, data: null }));
        if (getResult.ok && getResult.data && getResult.data.primary_strategy) {
          const strategy = getResult.data;
          setPrimary(strategy.primary_strategy);
          setSecondary(strategy.fallback_strategies || []);
          // Determine committed state via !!data.primary_strategy
          setIsCommitted(true);
          // Show committed_at date if present
          setCommittedAt(strategy.committed_at || null);
          onCommitmentChange({
            primary: strategy.primary_strategy,
            secondary: strategy.fallback_strategies || [],
          });
        }
      }

      // Refresh router to refetch phase2 plan and other data
      router.refresh();

      showToast("Strategy committed. Phase 2 directive planning is now enabled.", "success");

      // Also save to localStorage as backup
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          primary,
          secondary: secondary.slice(0, 3),
        }));
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      // CRITICAL: Catch all errors - never let them propagate to React
      console.error("Failed to commit strategy:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while committing the strategy.";
      showToast(`Failed to commit strategy: ${errorMessage}`, "error");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleClear = () => {
    setPrimary(null);
    setSecondary([]);
    setIsCommitted(false);
    setCommittedAt(null);
    onCommitmentChange(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
  };

  const handleCopyArtifact = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied to clipboard", "success");
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  // Simple collapsible sub-option card component
  const SubOptionCard = ({ subOption }: { subOption: SubOption }) => {
    const [isOpen, setIsOpen] = useState(false);
    const priorityColors = {
      "primary pressure": "bg-primary/20 text-primary border-primary/30",
      "secondary pressure": "bg-amber-500/20 text-amber-600 border-amber-500/30",
      "leverage / pivot": "bg-blue-500/20 text-blue-600 border-blue-500/30",
    };
    return (
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left flex items-center justify-between gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">{subOption.title}</h4>
            <Badge className={`text-xs border ${priorityColors[subOption.priority]}`}>
              {subOption.priority}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-2.5">
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Target:</p>
              <p className="text-xs text-muted-foreground">{subOption.target}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Evidence needed:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                {subOption.evidenceNeeded.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Kill switch:</p>
              <p className="text-xs text-muted-foreground">{subOption.killSwitch}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getViabilityBadge = (viability?: RouteViability) => {
    if (!viability) return null;
    const status = viability.status;
    const colors = {
      VIABLE: "bg-green-500/20 text-green-600 border-green-500/30",
      WEAKENING: "bg-amber-500/20 text-amber-600 border-amber-500/30",
      UNSAFE: "bg-red-500/20 text-red-600 border-red-500/30",
    };
    const emoji = {
      VIABLE: "🟢",
      WEAKENING: "🟠",
      UNSAFE: "🔴",
    };
    return (
      <Badge className={`${colors[status]} border text-xs`}>
        {emoji[status]} {status}
      </Badge>
    );
  };

  return (
    <Card className="p-6" data-strategy-commitment>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Strategy Commitment</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Choose how the case will be run, based on the recorded defence position.
            </p>
            <p className="text-sm text-foreground mb-3 font-medium">
              Based on the recorded defence position and current disclosure, the recommended way to run the case is:
            </p>
            <p className="text-sm text-muted-foreground">
              {isCommitted 
                ? "Strategy is committed. Phase 2 directive planning is enabled."
                : primary
                  ? "Select a strategy to proceed. Lock in your primary defence strategy to make the case plan directive and action-focused."
                  : "Lock in your primary defence strategy. This will make the case plan directive and action-focused."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCommitted && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Committed
              </Badge>
            )}
            {primary && !isCommitted && (
              <Button
                onClick={handleCommit}
                disabled={isCommitting || !primary}
                className="flex items-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                {isCommitting ? "Committing..." : "Commit Strategy"}
              </Button>
            )}
            {primary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="flex items-center gap-2"
                disabled={isCommitted}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {!primary ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Select Primary Strategy</h3>
              <p className="text-xs text-muted-foreground mb-3">No strategy committed yet. Select a primary strategy to begin.</p>
              <select
                value=""
                onChange={(e) => {
                  const value = e.target.value as PrimaryStrategy;
                  if (value) handlePrimarySelect(value);
                }}
                className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Select Primary Strategy --</option>
                {STRATEGY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Strategic Intent (only when committed) */}
            {isCommitted && primary && (
              <p className="text-xs text-muted-foreground italic">
                {getStrategicIntent(primary)}
              </p>
            )}
            
            {/* Primary Strategy Display */}
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="primary">PRIMARY STRATEGY</Badge>
                    {isCommitted && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                    {isCommitted && primary && (() => {
                      const activeRoutesCount = SUB_OPTIONS_BY_STRATEGY[primary]?.length ?? 0;
                      return activeRoutesCount > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {activeRoutesCount} active route{activeRoutesCount !== 1 ? 's' : ''}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.label || primary}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {STRATEGY_OPTIONS.find(o => o.id === primary)?.description}
                  </p>
                  {isCommitted && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Evidence needed:</p>
                        <p className="text-xs text-muted-foreground">{getEvidenceNeeded(primary)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Pivot trigger:</p>
                        <p className="text-xs text-muted-foreground">{getPivotTrigger(primary)}</p>
                      </div>
                    </div>
                  )}
                  {isCommitted && committedAt && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Committed {new Date(committedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              </div>
            </div>

            {/* Active Attack Routes (Sub-Options) - Only show when committed */}
            {isCommitted && primary && SUB_OPTIONS_BY_STRATEGY[primary] && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Active Attack Routes (run in parallel)
                </h3>
                <div className="space-y-3">
                  {SUB_OPTIONS_BY_STRATEGY[primary].map((subOption) => (
                    <SubOptionCard key={subOption.id} subOption={subOption} />
                  ))}
                </div>
                
                {/* Case-break triggers panel */}
                {(() => {
                  const triggers = getCaseBreakTriggers(primary);
                  if (triggers.length === 0) return null;
                  return (
                    <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <h4 className="text-xs font-semibold text-foreground mb-2">
                        What breaks the case (any one)
                      </h4>
                      <ul className="space-y-1.5">
                        {triggers.map((trigger, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{trigger}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Conditional Trial Attack Plan - Only when position recorded and strategy is fight_charge */}
            {savedPosition && primary === "fight_charge" && (() => {
              const attackPlan = getConditionalAttackPlan(primary);
              if (!attackPlan) return null;
              
              return (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Conditional Trial Attack Plan</h3>
                      <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
                        CONDITIONAL
                      </Badge>
                      <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 bg-blue-500/10">
                        SUBJECT TO DISCLOSURE
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      This attack plan is conditional on the recorded defence position and current disclosure. It updates if disclosure or position changes. It does not commit the case to trial.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Likely CPS Case Theory */}
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Likely CPS Case Theory</h4>
                      <p className="text-xs text-muted-foreground">{attackPlan.cpsTheory}</p>
                    </div>
                    
                    {/* Primary Defence Attacks */}
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <h4 className="text-xs font-semibold text-foreground mb-3">Primary Defence Attacks</h4>
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-medium text-foreground mb-1">Intent (s18 threshold)</h5>
                          <p className="text-xs text-muted-foreground">{attackPlan.primaryAttacks.intent}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-foreground mb-1">Identification / lighting / reliability</h5>
                          <p className="text-xs text-muted-foreground">{attackPlan.primaryAttacks.identification}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-foreground mb-1">Weapon inference and injury causation</h5>
                          <p className="text-xs text-muted-foreground">{attackPlan.primaryAttacks.weapon}</p>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-foreground mb-1">Sequence, duration, escalation</h5>
                          <p className="text-xs text-muted-foreground">{attackPlan.primaryAttacks.sequence}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Medical Evidence Tension */}
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Medical Evidence Tension</h4>
                      <p className="text-xs text-muted-foreground">{attackPlan.medicalTension}</p>
                    </div>
                    
                    {/* Disclosure Failure Leverage Path */}
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                      <h4 className="text-xs font-semibold text-foreground mb-2">Disclosure Failure Leverage Path</h4>
                      <p className="text-xs text-muted-foreground">{attackPlan.disclosureLeverage}</p>
                    </div>
                    
                    {/* How the Case Collapses if CPS Overreaches */}
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <h4 className="text-xs font-semibold text-foreground mb-2">How the Case Collapses if CPS Overreaches</h4>
                      <p className="text-xs text-muted-foreground">{attackPlan.collapsePath}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Fallback Strategies */}
            {secondary.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Fallback Strategies
                </h3>
                <div className="space-y-2">
                  {secondary.map((strategyId) => {
                    const option = STRATEGY_OPTIONS.find(o => o.id === strategyId);
                    if (!option) return null;
                    return (
                      <div
                        key={strategyId}
                        className="p-3 rounded-lg border border-primary/30 bg-primary/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-medium text-foreground">{option.label}</h4>
                              <Badge variant="outline" className="text-xs">Fallback</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
                            {isCommitted && (
                              <div className="space-y-1.5 mt-2 pt-2 border-t border-border/30">
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-0.5">Evidence needed:</p>
                                  <p className="text-xs text-muted-foreground">{getEvidenceNeeded(strategyId)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground mb-0.5">Pivot trigger:</p>
                                  <p className="text-xs text-muted-foreground">{getPivotTrigger(strategyId)}</p>
                                </div>
                                {/* Light sub-options for fallbacks */}
                                {SUB_OPTIONS_BY_STRATEGY[strategyId] && SUB_OPTIONS_BY_STRATEGY[strategyId].length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border/20">
                                    <p className="text-xs font-semibold text-foreground mb-2">If pivoting here, consider:</p>
                                    <div className="space-y-2">
                                      {SUB_OPTIONS_BY_STRATEGY[strategyId].slice(0, 2).map((subOption) => (
                                        <div key={subOption.id} className="p-2 rounded border border-border/30 bg-muted/10">
                                          <p className="text-xs font-medium text-foreground mb-1">{subOption.title}</p>
                                          <p className="text-xs text-muted-foreground">{subOption.target}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Strategic Recommendation Panel */}
            {recommendation && (() => {
              // Cap confidence to LOW if analysis is gated/preview
              const shouldCapConfidence = isGated || 
                (analysisVersionInfo?.analysis_mode === "preview") ||
                (analysisVersionInfo?.analysis_mode === "none");
              const displayConfidence = shouldCapConfidence ? "LOW" : recommendation.confidence;
              
              return (
              <div className="mb-6 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Recommended Strategy</h3>
                      <Badge variant="primary" className="text-xs">PRIMARY</Badge>
                      <Badge className={`text-xs ${
                        displayConfidence === "HIGH" 
                          ? "bg-green-500/20 text-green-600 border-green-500/30" 
                          : displayConfidence === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                            : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                      } border`}>
                        {displayConfidence} Confidence
                      </Badge>
                      {shouldCapConfidence && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Confidence capped (preview/gated)
                        </Badge>
                      )}
                    </div>
                    {/* Residual Attacks Banner */}
                    {strategyRoutes.length > 0 && (() => {
                      const allResidualAngles = strategyRoutes.flatMap(r => r.residual?.angles || []);
                      const evidenceBackedCount = allResidualAngles.filter(a => a.evidenceBasis === "EVIDENCE_BACKED").length;
                      const hypothesisCount = allResidualAngles.filter(a => a.evidenceBasis === "HYPOTHESIS").length;
                      const exhaustedCount = strategyRoutes.filter(r => r.residual?.status === "EXHAUSTED").length;
                      const totalRoutes = strategyRoutes.length;
                      
                      if (allResidualAngles.length > 0 || exhaustedCount > 0) {
                        const parts: string[] = [];
                        if (allResidualAngles.length > 0) {
                          const basisParts: string[] = [];
                          if (evidenceBackedCount > 0) {
                            basisParts.push(`${evidenceBackedCount} evidence-backed`);
                          }
                          if (hypothesisCount > 0) {
                            basisParts.push(`${hypothesisCount} ${hypothesisCount === 1 ? "hypothesis" : "hypotheses"}`);
                          }
                          const basisText = basisParts.length > 0 ? ` (${basisParts.join(", ")})` : "";
                          parts.push(`Residual angles: ${allResidualAngles.length}${basisText}`);
                        }
                        if (exhaustedCount > 0) {
                          parts.push(`Routes exhausted: ${exhaustedCount}/${totalRoutes}`);
                        }
                        
                        return (
                          <div className="mb-3 p-2 rounded-lg border border-border/50 bg-muted/20">
                            <p className="text-xs text-foreground">
                              {parts.join(" · ")}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="mb-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {STRATEGY_OPTIONS.find(o => o.id === recommendation.recommended)?.label || recommendation.recommended}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{recommendation.rationale}</p>
                    <div className="p-3 rounded-lg border border-border/50 bg-muted/20 mb-3">
                      <p className="text-xs font-semibold text-foreground mb-1">Solicitor Narrative:</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{recommendation.solicitorNarrative}</p>
                    </div>
                    
                    {/* Ranking */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-foreground mb-1">Strategy Ranking:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.ranking.map((route, idx) => (
                          <Badge
                            key={route}
                            className={`text-xs ${
                              idx === 0
                                ? "bg-primary/20 text-primary border-primary/30"
                                : idx === 1
                                  ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                            } border`}
                          >
                            {idx + 1}. {STRATEGY_OPTIONS.find(o => o.id === route)?.label || route}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Flip Conditions */}
                    {recommendation.flipConditions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-2">Flip Conditions:</p>
                        <div className="space-y-2">
                          {recommendation.flipConditions.map((flip, idx) => (
                            <div key={idx} className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                              <div className="text-xs">
                                <div className="font-semibold text-foreground mb-1">If: {flip.evidenceEvent}</div>
                                <div className="text-muted-foreground mb-1">→ Pivot to: {STRATEGY_OPTIONS.find(o => o.id === flip.flipsTo)?.label || flip.flipsTo}</div>
                                <div className="text-muted-foreground mb-1">Why: {flip.why}</div>
                                <div className="text-muted-foreground">Timing: {flip.timing.replace("_", " ")}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}

            {/* Gated Banner */}
            {isGated && (
              <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground mb-1">Analysis gated – using procedural templates</p>
                    <p className="text-xs text-muted-foreground">
                      Not enough extractable text to generate evidence-backed analysis. Routes shown use procedural templates pending full disclosure.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Worst-case if wrong panel (Phase 2+ only, after commitment) */}
            {primary && (
              <div className="mb-6 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-sm font-semibold text-foreground mb-2">If This Goes Wrong, Why?</h3>
                {(() => {
                  // Generate worst-case framing from available data
                  const selectedRoute = strategyRoutes.find(r => r.type === primary);
                  if (selectedRoute && selectedRoute.risks && selectedRoute.risks.length > 0) {
                    // Use risks from selected route
                    const topRisks = selectedRoute.risks.slice(0, 2);
                    const riskText = topRisks.join("; ").toLowerCase();
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are: {riskText}. These risks should be monitored as disclosure evolves, particularly around {selectedRoute.killSwitches && selectedRoute.killSwitches.length > 0 ? selectedRoute.killSwitches[0].evidenceEvent.toLowerCase() : "key evidence developments"}.
                      </p>
                    );
                  } else if (primary === "fight_charge") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that prosecution evidence proves stronger than anticipated, identification becomes unassailable, or procedural challenges do not succeed. Monitor disclosure for any evidence that strengthens the prosecution case on intent or identification, as these could undermine the defence position.
                      </p>
                    );
                  } else if (primary === "charge_reduction") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that the prosecution maintains s18 intent is proven, medical evidence supports specific intent, or the court rejects the recklessness argument. Monitor disclosure for evidence that clearly demonstrates deliberate targeting or sustained violence, as these factors support specific intent.
                      </p>
                    );
                  } else if (primary === "outcome_management") {
                    return (
                      <p className="text-xs text-muted-foreground">
                        If this strategy fails, the primary risks are that sentencing guidelines point to custody despite mitigation, character evidence is insufficient, or the court views the offence as too serious for a non-custodial outcome. Monitor for any aggravating factors in disclosure that could outweigh mitigation efforts.
                      </p>
                    );
                  } else {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Add a one-paragraph failure mode once disclosure and strategy are stabilised.
                      </p>
                    );
                  }
                })()}
              </div>
            )}

            {/* Strategy Routes from strategy-analysis endpoint - Always show if strategy selected or routes exist */}
            {((primary || strategyRoutes.length > 0) && !isLoadingRoutes) && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Strategy Routes</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Available defence strategies based on case analysis. Select a route to commit as your primary strategy.
                </p>
                <div className="space-y-4">
                  {(() => {
                    // If no routes from API, show fallback routes for all 3 main strategies
                    if (strategyRoutes.length === 0) {
                      const fallbackRoutes: StrategyRoute[] = [
                        {
                          id: "fallback_fight_charge",
                          type: "fight_charge",
                          title: "Fight Charge (Full Trial)",
                          rationale: "Challenge prosecution case at trial. Target acquittal or dismissal by attacking evidence, intent, and identification.",
                          winConditions: ["Identification fails Turnbull", "Disclosure gaps create abuse of process risk", "PACE breaches lead to exclusion"],
                          risks: ["Strong identification evidence", "Complete disclosure", "No procedural breaches"],
                          nextActions: ["Request full disclosure", "Review identification evidence", "Assess PACE compliance"],
                          attackPaths: [],
                          cpsResponses: [],
                          killSwitches: [],
                        },
                        {
                          id: "fallback_charge_reduction",
                          type: "charge_reduction",
                          title: "Charge Reduction (s18 → s20)",
                          rationale: "Accept harm occurred but challenge intent threshold. Target reduction from s18 to s20 or lesser offence.",
                          winConditions: ["Medical evidence supports s20 not s18", "Circumstances show lack of targeting", "CPS case weak on intent"],
                          risks: ["Medical evidence supports s18", "Clear evidence of specific intent", "Court rejects recklessness argument"],
                          nextActions: ["Request medical evidence", "Review sequence evidence", "Prepare charge reduction negotiation"],
                          attackPaths: [],
                          cpsResponses: [],
                          killSwitches: [],
                        },
                        {
                          id: "fallback_outcome_management",
                          type: "outcome_management",
                          title: "Outcome Management (Plea/Mitigation)",
                          rationale: "Focus on sentencing position and mitigation. Target reduced sentence or non-custodial outcome.",
                          winConditions: ["Strong mitigation package", "Early guilty plea credit", "Guideline factors favour lower starting point"],
                          risks: ["Sentencing guidelines point to custody", "Insufficient character evidence", "Court views offence as too serious"],
                          nextActions: ["Prepare mitigation package", "Consider early guilty plea", "Review sentencing guidelines"],
                          attackPaths: [],
                          cpsResponses: [],
                          killSwitches: [],
                        },
                      ];
                      return fallbackRoutes.map((route) => {
                        const strategyKey = route.type;
                        const isRouteCommitted = isCommitted && primary === strategyKey;
                        const isActive = primary === strategyKey;
                        
                        let badgeText: string | null = null;
                        if (isRouteCommitted) badgeText = "COMMITTED";
                        else if (isActive) badgeText = "ACTIVE (not committed)";
                        
                        const isSelected = primary === route.type;
                        const isCommittedRoute = isCommitted && isSelected;
                        return { route, strategyKey, isRouteCommitted, isActive, badgeText, isSelected, isCommittedRoute };
                      });
                    }
                    return strategyRoutes.map((route) => {
                      const strategyKey = route.type;
                      const isRouteCommitted = isCommitted && primary === strategyKey;
                      const isActive = primary === strategyKey;
                      
                      let badgeText: string | null = null;
                      if (isRouteCommitted) badgeText = "COMMITTED";
                      else if (isActive) badgeText = "ACTIVE (not committed)";
                      
                      const isSelected = selectedRouteId === route.id || primary === route.type;
                      const isCommittedRoute = isCommitted && isSelected;
                      return { route, strategyKey, isRouteCommitted, isActive, badgeText, isSelected, isCommittedRoute };
                    });
                  })().map(({ route, strategyKey, isRouteCommitted, isActive, badgeText, isSelected, isCommittedRoute }) => {
                    return (
                      <div
                        key={route.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          isCommittedRoute
                            ? "border-primary bg-primary/10"
                            : isSelected
                              ? "border-primary/50 bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-foreground">{route.title}</h4>
                              {badgeText && (
                                <Badge 
                                  variant={badgeText === "COMMITTED" ? "primary" : "outline"} 
                                  className="text-xs"
                                >
                                  {badgeText}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{route.rationale}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <h5 className="text-xs font-semibold text-foreground">Win Conditions</h5>
                            </div>
                            <ul className="space-y-1">
                              {route.winConditions.map((condition, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-green-600 mt-0.5">•</span>
                                  <span>{condition}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <h5 className="text-xs font-semibold text-foreground">Risks</h5>
                            </div>
                            <ul className="space-y-1">
                              {route.risks.map((risk, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-amber-600 mt-0.5">•</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 mb-2">
                            <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            <h5 className="text-xs font-semibold text-foreground">Next Actions</h5>
                          </div>
                          <ul className="space-y-1.5">
                            {route.nextActions.map((action, idx) => {
                              // Determine judicial optics
                              const lowerAction = action.toLowerCase();
                              let optics: "attractive" | "neutral" | "risky" = "neutral";
                              if (lowerAction.includes("disclosure request") || lowerAction.includes("continuity request") || lowerAction.includes("written submission") || lowerAction.includes("case management")) {
                                optics = "attractive";
                              } else if (lowerAction.includes("abuse of process without chase") || lowerAction.includes("unsubstantiated challenge") || lowerAction.includes("frivolous application")) {
                                optics = "risky";
                              }

                              return (
                                <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                    <span className="text-[10px] font-semibold text-primary">{idx + 1}</span>
                                  </span>
                                  <div className="flex-1 flex items-center gap-2">
                                    <span>{action}</span>
                                    {optics === "attractive" && (
                                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] px-1">
                                        Judicially attractive
                                      </Badge>
                                    )}
                                    {optics === "risky" && (
                                      <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] px-1">
                                        Judicially risky
                                      </Badge>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Viability Badge */}
                        {route.viability && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                              {getViabilityBadge(route.viability)}
                              {!route.viability.evidenceBacked && (
                                <Badge variant="outline" className="text-xs">
                                  Template (pending disclosure)
                                </Badge>
                              )}
                            </div>
                            <ul className="space-y-1">
                              {route.viability.reasons.map((reason, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground">• {reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Enhanced Route Details - Tabs/Sections */}
                        <div className="mt-4 pt-4 border-t border-border space-y-2">
                            {/* Attack Routes (Attack Paths) */}
                            {route.attackPaths && route.attackPaths.length > 0 ? (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_attack_paths`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">Attack Paths ({route.attackPaths.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_attack_paths`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_attack_paths`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    {route.attackPaths.map((path) => {
                                      // Score judicial optics for this attack path
                                      const methodLower = path.method.toLowerCase();
                                      let optics: "attractive" | "neutral" | "risky" = "neutral";
                                      if (methodLower.includes("turnbull") && methodLower.includes("early")) {
                                        optics = "attractive";
                                      } else if (methodLower.includes("abuse") && !methodLower.includes("chase")) {
                                        optics = "risky";
                                      } else if (methodLower.includes("pace") && methodLower.includes("exclusion")) {
                                        optics = "neutral";
                                      }

                                      return (
                                        <div key={path.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h6 className="text-xs font-semibold text-foreground">{path.target}</h6>
                                                {!path.evidenceBacked && (
                                                  <Badge variant="outline" className="text-[10px]">
                                                    Hypothesis (pending evidence)
                                                  </Badge>
                                                )}
                                                {path.evidenceBacked && (
                                                  <Badge variant="default" className="text-[10px]">
                                                    Evidence-backed
                                                  </Badge>
                                                )}
                                                {optics === "attractive" && (
                                                  <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px] border">
                                                    🟢 Judicially attractive
                                                  </Badge>
                                                )}
                                                {optics === "risky" && (
                                                  <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-[10px] border">
                                                    🔴 Judicially risky
                                                  </Badge>
                                                )}
                                                {optics === "neutral" && (
                                                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-[10px] border">
                                                    🟠 Neutral
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-xs text-muted-foreground mb-2">{path.method}</p>
                                            </div>
                                          </div>
                                        <div className="grid grid-cols-1 gap-2 text-xs">
                                          <div>
                                            <span className="font-semibold text-foreground">Evidence Inputs: </span>
                                            <span className="text-muted-foreground">{path.evidenceInputs.join(", ")}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Expected Effect: </span>
                                            <span className="text-muted-foreground">{path.expectedEffect}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">CPS Likely Response: </span>
                                            <span className="text-muted-foreground">{path.cpsLikelyResponse}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Counter-Response: </span>
                                            <span className="text-muted-foreground">{path.counterResponse}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Kill Switch: </span>
                                            <span className="text-muted-foreground">{path.killSwitch}</span>
                                          </div>
                                          <div className="mt-2 pt-2 border-t border-border/30">
                                            <span className="font-semibold text-foreground">Next 48 Hours: </span>
                                            <ul className="mt-1 space-y-1">
                                              {path.next48HoursActions.map((action, idx) => (
                                                <li key={idx} className="text-muted-foreground">• {action}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No attack paths generated (insufficient evidence). Request disclosure to assess viable attack angles.
                                </p>
                              </div>
                            )}

                            {/* CPS Responses */}
                            {route.cpsResponses && route.cpsResponses.length > 0 ? (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_cps_responses`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">CPS Responses ({route.cpsResponses.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_cps_responses`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_cps_responses`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    {route.cpsResponses.map((response) => (
                                      <div key={response.id} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                                        <div className="space-y-2 text-xs">
                                          <div>
                                            <span className="font-semibold text-foreground">CPS Move: </span>
                                            <span className="text-muted-foreground">{response.cpsMove}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Defence Counter: </span>
                                            <span className="text-muted-foreground">{response.defenceCounter}</span>
                                          </div>
                                          <div>
                                            <span className="font-semibold text-foreground">Resulting Pressure: </span>
                                            <span className="text-muted-foreground">{response.resultingPressure}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No CPS responses generated (insufficient evidence). Request disclosure to assess prosecution response scenarios.
                                </p>
                              </div>
                            )}

                            {/* Kill Switches */}
                            {route.killSwitches && route.killSwitches.length > 0 ? (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_kill_switches`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <AlertCircleIcon className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-semibold text-foreground">Kill Switches ({route.killSwitches.length})</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_kill_switches`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_kill_switches`) && (
                                  <div className="p-3 border-t border-border/50 space-y-2">
                                    {route.killSwitches.map((ks) => (
                                      <div key={ks.id} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                                        <div className="text-xs">
                                          <div className="font-semibold text-foreground mb-1">Evidence Event:</div>
                                          <div className="text-muted-foreground mb-2">{ks.evidenceEvent}</div>
                                          <div className="font-semibold text-foreground mb-1">Pivot Recommendation:</div>
                                          <div className="text-muted-foreground">{ks.pivotRecommendation}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No kill switches generated (insufficient evidence). Request disclosure to assess route abandonment triggers.
                                </p>
                              </div>
                            )}

                            {/* Pivot Plan */}
                            {route.pivotPlan ? (
                              <div className="rounded-lg border border-border/50 overflow-hidden">
                                <button
                                  onClick={() => toggleSection(`${route.id}_pivot_plan`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">Pivot Plan</span>
                                  </div>
                                  {expandedSections.has(`${route.id}_pivot_plan`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_pivot_plan`) && (
                                  <div className="p-3 border-t border-border/50 space-y-3">
                                    <div className="text-xs">
                                      <div className="font-semibold text-foreground mb-1">Pivot Triggers:</div>
                                      <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-3">
                                        {route.pivotPlan.triggers.map((trigger, idx) => (
                                          <li key={idx}>{trigger}</li>
                                        ))}
                                      </ul>
                                      <div className="font-semibold text-foreground mb-1">Timing:</div>
                                      <div className="text-muted-foreground mb-3">{route.pivotPlan.timing}</div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <div className="font-semibold text-foreground mb-1">Stop:</div>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {route.pivotPlan.behaviourChange.stop.map((item, idx) => (
                                              <li key={idx}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-foreground mb-1">Start:</div>
                                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                            {route.pivotPlan.behaviourChange.start.map((item, idx) => (
                                              <li key={idx}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border/50 p-3">
                                <p className="text-xs text-muted-foreground">
                                  No pivot plan generated (insufficient evidence). Request disclosure to assess pivot triggers and timing.
                                </p>
                              </div>
                            )}

                            {/* Residual Attack Scanner (Exhaustion Layer) - Only show once per route */}
                            {route.residual && (
                              <div className="rounded-lg border border-border/50 overflow-hidden mt-2">
                                <button
                                  onClick={() => toggleSection(`${route.id}_residual`)}
                                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-foreground">
                                      Residual Attack Scanner
                                    </span>
                                    <Badge
                                      variant={route.residual.status === "EXHAUSTED" ? "danger" : "default"}
                                      className="text-xs"
                                    >
                                      {route.residual.status === "EXHAUSTED" ? "EXHAUSTED" : "ATTACKS REMAIN"}
                                    </Badge>
                                  </div>
                                  {expandedSections.has(`${route.id}_residual`) ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                                {expandedSections.has(`${route.id}_residual`) && (
                                  <div className="p-4 border-t border-border/50 space-y-4">
                                    {/* Summary */}
                                    <div>
                                      <p className="text-xs text-muted-foreground">{route.residual.summary}</p>
                                    </div>

                                    {/* Residual Angles */}
                                    {route.residual.angles.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-foreground mb-2">
                                          Residual Attack Angles ({route.residual.angles.length})
                                        </p>
                                        <div className="space-y-3">
                                          {route.residual.angles.map((angle) => (
                                            <div
                                              key={angle.id}
                                              className="p-3 rounded border border-border/30 bg-muted/20 space-y-2"
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                  <p className="text-xs font-semibold text-foreground">
                                                    {angle.title}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    {angle.description}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  <Badge
                                                    variant={
                                                      angle.evidenceBasis === "EVIDENCE_BACKED"
                                                        ? "default"
                                                        : "secondary"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {angle.evidenceBasis === "EVIDENCE_BACKED"
                                                      ? "Evidence-backed"
                                                      : "Hypothesis"}
                                                  </Badge>
                                                  <Badge
                                                    variant={
                                                      angle.judicialOptics === "ATTRACTIVE"
                                                        ? "default"
                                                        : angle.judicialOptics === "RISKY"
                                                          ? "danger"
                                                          : "secondary"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {angle.judicialOptics === "ATTRACTIVE"
                                                      ? "🟢 Attractive"
                                                      : angle.judicialOptics === "RISKY"
                                                        ? "🔴 Risky"
                                                        : "🟠 Neutral"}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-xs font-semibold text-foreground mb-1">
                                                  Category: {angle.category}
                                                </p>
                                                {angle.requiredEvidence && angle.requiredEvidence.length > 0 && (
                                                  <div className="mb-2">
                                                    <p className="text-xs text-muted-foreground mb-1">
                                                      Required Evidence:
                                                    </p>
                                                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                      {angle.requiredEvidence.map((ev, idx) => (
                                                        <li key={idx}>{ev}</li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                                <p className="text-xs text-muted-foreground mb-1">
                                                  <span className="font-semibold">Judicial Optics:</span>{" "}
                                                  {angle.whyOptics}
                                                </p>
                                                <div className="mt-2">
                                                  <p className="text-xs font-semibold text-foreground mb-1">
                                                    How to Use:
                                                  </p>
                                                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                    {angle.howToUse.map((action, idx) => (
                                                      <li key={idx}>{action}</li>
                                                    ))}
                                                  </ul>
                                                </div>
                                                <div className="mt-2">
                                                  <p className="text-xs font-semibold text-foreground mb-1">
                                                    Stop If:
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">{angle.stopIf}</p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                        {!isCommitted && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Button
                              variant={isSelected ? "primary" : "outline"}
                              size="sm"
                              onClick={() => handlePrimarySelect(route.type)}
                              className="w-full"
                            >
                              {isSelected ? "Selected" : "Select as Primary Strategy"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Beast Strategy Pack - Comprehensive court-safe attack brief (9 sections) - UNCONDITIONAL RENDERING when strategy data exists */}
            {hasStrategyData && (() => {
              // Use primary if available, otherwise use first available strategy type from routes, or default to fight_charge
              const activeType: PrimaryStrategy = primary || 
                (strategyRoutes.length > 0 && strategyRoutes[0].type as PrimaryStrategy) || 
                "fight_charge";
              const beastPack = getBeastStrategyPack(activeType);
              
              // Debug block (only when ?debug=1)
              if (isDebug) {
                console.log('[Beast Strategy Pack Debug]', {
                  hasStrategyData,
                  primary,
                  activeType,
                  isCommitted,
                  strategyRoutesLength: strategyRoutes.length,
                  isLoadingRoutes,
                  beastPackExists: !!beastPack,
                });
              }
              
              if (!beastPack) return null;
              
              return (
                <div className="mt-6 pt-6 border-t-2 border-primary/30 space-y-4">
                  {/* Loading indicator (separate, does not block rendering) */}
                  {isLoadingRoutes && (
                    <div className="mb-4 p-2 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Generating routes...</span>
                    </div>
                  )}
                  
                  {/* Debug block (only when ?debug=1) */}
                  {isDebug && (
                    <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                      <p className="text-xs font-semibold text-foreground mb-2">DEBUG: Beast Strategy Pack Render State</p>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                        {JSON.stringify({
                          hasStrategyData,
                          primary,
                          activeType,
                          isCommitted,
                          strategyRoutesLength: strategyRoutes.length,
                          isLoadingRoutes,
                          beastPackExists: !!beastPack,
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                    <h4 className="text-base font-semibold text-foreground">Beast Strategy Pack</h4>
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/10">
                      CONDITIONAL
                    </Badge>
                  </div>
                  
                  {/* 1. ROUTE DASHBOARD - Always visible, not collapsed */}
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h5 className="text-sm font-semibold text-foreground">Route Dashboard</h5>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Objective:</p>
                      <p className="text-xs text-muted-foreground">{beastPack.dashboard.objective}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">CPS must prove:</p>
                      <div className="space-y-2">
                        {beastPack.dashboard.cpsMustProve.map((item, idx) => (
                          <div key={idx} className="p-2 rounded border border-border/30 bg-muted/10">
                            <p className="text-xs font-semibold text-foreground">{item.element}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-semibold">CPS Evidence: </span>{item.cpsEvidence}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Defence Challenge: </span>{item.defenceChallenge}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Top 3 highest-leverage defence attacks:</p>
                      <ul className="space-y-1.5">
                        {beastPack.dashboard.top3Attacks.map((attack, idx) => (
                          <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                              <span className="text-[10px] font-semibold text-primary">{idx + 1}</span>
                            </span>
                            <div className="flex-1">
                              <p className="font-semibold">{attack.target}</p>
                              <p className="text-muted-foreground">{attack.leverage}</p>
                              <p className="text-muted-foreground italic text-[10px] mt-0.5">{attack.evidenceRequired}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-primary/20">
                      <p className="text-xs font-semibold text-foreground mb-1">Primary kill switch (what forces a pivot):</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">If: </span>{beastPack.dashboard.primaryKillSwitch.condition}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Pivot to: </span>{beastPack.dashboard.primaryKillSwitch.pivotTo}
                      </p>
                    </div>
                  </div>

                  {/* 2. CPS CASE THEORY */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_cps_case_theory`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">CPS Case Theory</span>
                      </div>
                      {expandedSections.has(`${activeType}_cps_case_theory`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_cps_case_theory`) && (
                      <div className="p-3 border-t border-border/50 space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-foreground mb-1">What the prosecution will likely argue happened:</p>
                          <p className="text-muted-foreground">{beastPack.cpsTheory.whatHappened}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">How they will argue intent:</p>
                          <p className="text-muted-foreground">{beastPack.cpsTheory.intentArgument}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">How they will argue identification:</p>
                          <p className="text-muted-foreground">{beastPack.cpsTheory.identificationArgument}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">How they will argue weapon / injury causation:</p>
                          <p className="text-muted-foreground">{beastPack.cpsTheory.weaponCausationArgument}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. DEFENCE COUNTER-THEORY */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_defence_counter_theory`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Defence Counter-Theory</span>
                      </div>
                      {expandedSections.has(`${activeType}_defence_counter_theory`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_defence_counter_theory`) && (
                      <div className="p-3 border-t border-border/50 space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-foreground mb-1">Defence narrative consistent with current evidence:</p>
                          <p className="text-muted-foreground">{beastPack.defenceTheory.narrative}</p>
                        </div>
                        {beastPack.defenceTheory.conditionalFlags.length > 0 && (
                          <div>
                            <p className="font-semibold text-foreground mb-2">Explicit CONDITIONAL flags where disclosure is missing:</p>
                            <div className="space-y-2">
                              {beastPack.defenceTheory.conditionalFlags.map((flag, idx) => (
                                <div key={idx} className="p-2 rounded border border-amber-500/20 bg-amber-500/5">
                                  <p className="font-semibold text-foreground">{flag.area}:</p>
                                  <p className="text-muted-foreground">{flag.missingEvidence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {beastPack.defenceTheory.evidenceSupport.length > 0 && (
                          <div>
                            <p className="font-semibold text-foreground mb-1">Evidence support (no factual assertions without evidence):</p>
                            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                              {beastPack.defenceTheory.evidenceSupport.map((support, idx) => (
                                <li key={idx}>{support}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. ATTACK ROUTES (RANKED) */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_attack_routes_ranked`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Attack Routes (Ranked) ({beastPack.attackRoutes.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_attack_routes_ranked`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_attack_routes_ranked`) && (
                      <div className="p-3 border-t border-border/50 space-y-3">
                        {beastPack.attackRoutes.map((attack, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-[10px]">#{idx + 1}</Badge>
                              <p className="text-xs font-semibold text-foreground">{attack.target}</p>
                            </div>
                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="font-semibold text-foreground">Evidence supporting the attack: </span>
                                <span className="text-muted-foreground">{attack.evidenceSupporting}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Disclosure required to strengthen attack: </span>
                                <span className="text-muted-foreground">{attack.disclosureRequired}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">CPS likely response: </span>
                                <span className="text-muted-foreground">{attack.cpsResponse}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Defence reply (court-safe wording): </span>
                                <span className="text-muted-foreground">{attack.defenceReply}</span>
                              </div>
                              <div className="pt-1 border-t border-border/30">
                                <span className="font-semibold text-foreground">Risk if attack fails: </span>
                                <span className="text-muted-foreground">{attack.riskIfFails}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. DISCLOSURE LEVERAGE CHAIN */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_disclosure_leverage_chain`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Disclosure Leverage Chain ({beastPack.disclosureLeverage.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_disclosure_leverage_chain`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_disclosure_leverage_chain`) && (
                      <div className="p-3 border-t border-border/50 space-y-3">
                        {beastPack.disclosureLeverage.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="font-semibold text-foreground">Missing item: </span>
                                <span className="text-muted-foreground">{item.missingItem}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Why it matters: </span>
                                <span className="text-muted-foreground">{item.whyItMatters}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Chase wording: </span>
                                <span className="text-muted-foreground">{item.chaseWording}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Time escalation: </span>
                                <span className="text-muted-foreground">{item.timeEscalation}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Application path: </span>
                                <span className="text-muted-foreground">{item.applicationPath}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 6. COURTROOM PRESSURE TEST */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_courtroom_pressure`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Courtroom Pressure Test ({beastPack.courtroomPressure.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_courtroom_pressure`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_courtroom_pressure`) && (
                      <div className="p-3 border-t border-border/50 space-y-3">
                        {beastPack.courtroomPressure.map((pressure, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                            <div className="text-xs space-y-2">
                              <div>
                                <span className="font-semibold text-foreground">Judge likely question: </span>
                                <span className="text-muted-foreground italic">{pressure.judgeQuestion}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">CPS likely answer: </span>
                                <span className="text-muted-foreground">{pressure.cpsAnswer}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Defence reply (safe, measured, conditional if needed): </span>
                                <span className="text-muted-foreground">{pressure.defenceReply}</span>
                              </div>
                              <div className="pt-1 border-t border-border/30">
                                <span className="font-semibold text-foreground">Evidence check required before relying on reply: </span>
                                <span className="text-muted-foreground">{pressure.evidenceCheck}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 7. KILL SWITCHES + PIVOT PLAN */}
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_kill_switches_pivot`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-red-500/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-semibold text-foreground">Kill Switches + Pivot Plan ({beastPack.killSwitches.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_kill_switches_pivot`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_kill_switches_pivot`) && (
                      <div className="p-3 border-t border-red-500/20 space-y-3">
                        {beastPack.killSwitches.map((kill, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                            <div className="text-xs space-y-1.5">
                              <div>
                                <span className="font-semibold text-foreground">What evidence arrival forces a strategy change: </span>
                                <span className="text-muted-foreground">{kill.evidenceArrival}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">What the new route becomes: </span>
                                <span className="text-muted-foreground">{kill.newRoute}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">What is preserved: </span>
                                <span className="text-muted-foreground">{kill.preserved}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">What is abandoned: </span>
                                <span className="text-muted-foreground">{kill.abandoned}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 8. RESIDUAL ATTACK SCANNER */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_residual_attack_scanner`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Residual Attack Scanner ({beastPack.residualAttacks.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_residual_attack_scanner`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_residual_attack_scanner`) && (
                      <div className="p-3 border-t border-border/50 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">Checklist of untested areas:</p>
                        {beastPack.residualAttacks.map((attack, idx) => (
                          <div key={idx} className={`p-2 rounded border ${attack.tested ? 'border-green-500/20 bg-green-500/5' : 'border-border/30 bg-muted/10'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-foreground">{attack.area}</p>
                              <Badge variant={attack.tested ? "success" : "secondary"} className="text-[10px]">
                                {attack.tested ? "TESTED" : "UNTESTED"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Leverage: </span>{attack.leverage}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Evidence needed: </span>{attack.evidenceNeeded}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 9. NEXT 72 HOURS */}
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleSection(`${activeType}_next_72_hours`)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">Next 72 Hours ({beastPack.next72Hours.length})</span>
                      </div>
                      {expandedSections.has(`${activeType}_next_72_hours`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedSections.has(`${activeType}_next_72_hours`) && (
                      <div className="p-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Concrete task list (chases, reviews, applications, instructions). No predictions, only actions:</p>
                        <ul className="space-y-1.5">
                          {beastPack.next72Hours.map((action, idx) => (
                            <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                <span className="text-[10px] font-semibold text-primary">{idx + 1}</span>
                              </span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Evidence Impact Map */}
            {evidenceImpactMap.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Evidence Impact Map</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  How missing evidence affects attack paths and strategy viability.
                </p>
                <div className="space-y-3">
                  {evidenceImpactMap.map((impact, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-xs font-semibold text-foreground">{impact.evidenceItem.name}</h4>
                        <Badge variant="outline" className="text-[10px]">
                          {impact.evidenceItem.category}
                        </Badge>
                        <Badge className={`text-[10px] ${
                          impact.impactOnDefence === "helps" 
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : impact.impactOnDefence === "hurts"
                              ? "bg-red-500/20 text-red-600 border-red-500/30"
                              : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                        } border`}>
                          {impact.impactOnDefence === "helps" ? "Helps Defence" : impact.impactOnDefence === "hurts" ? "Hurts Defence" : "Depends"}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="font-semibold text-foreground">If arrives clean: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesClean}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">If arrives late: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesLate}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">If arrives adverse: </span>
                          <span className="text-muted-foreground">{impact.ifArrivesAdverse}</span>
                        </div>
                        {impact.pivotTrigger && (
                          <div className="mt-2 p-2 rounded border border-amber-500/20 bg-amber-500/5">
                            <div className="font-semibold text-foreground">Pivot Trigger:</div>
                            <div className="text-muted-foreground">
                              If {impact.pivotTrigger.condition} → Pivot from {impact.pivotTrigger.from} to {impact.pivotTrigger.to} ({impact.pivotTrigger.timing.replace("_", " ")})
                            </div>
                          </div>
                        )}
                        {impact.killSwitch && (
                          <div className="mt-2 p-2 rounded border border-red-500/20 bg-red-500/5">
                            <div className="font-semibold text-foreground">Kill Switch:</div>
                            <div className="text-muted-foreground">
                              If {impact.killSwitch.condition} → {impact.killSwitch.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Pressure */}
            {timePressure && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Time & Pressure</h3>
                  <Badge className={`text-xs ${
                    timePressure.currentLeverage === "high"
                      ? "bg-red-500/20 text-red-600 border-red-500/30"
                      : timePressure.currentLeverage === "medium"
                        ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                        : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                  } border`}>
                    {timePressure.currentLeverage.toUpperCase()} Leverage
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{timePressure.leverageExplanation}</p>
                <div className="space-y-2 mb-3">
                  {timePressure.windows.map((window) => (
                    <div key={window.id} className="p-2 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{window.label}</span>
                        {window.isPlaceholder && (
                          <Badge variant="outline" className="text-[10px]">Placeholder</Badge>
                        )}
                        {window.daysUntil !== null && (
                          <span className="text-xs text-muted-foreground">
                            {window.daysUntil <= 0 ? "Past" : `${window.daysUntil} days`}
                          </span>
                        )}
                      </div>
                      {window.warning && (
                        <div className="text-xs text-amber-600 mb-1">{window.warning}</div>
                      )}
                    </div>
                  ))}
                </div>
                {timePressure.timeCriticalActions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-foreground mb-1">Time-Critical Actions:</div>
                    <ul className="space-y-1">
                      {timePressure.timeCriticalActions.map((action, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {timePressure.losingLeverageActions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-red-600 mb-1">Losing Leverage:</div>
                    <ul className="space-y-1">
                      {timePressure.losingLeverageActions.map((action, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground">• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Confidence States */}
            {Object.keys(confidenceStates).length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Strategy Confidence</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Confidence levels for each route based on current evidence signals.
                </p>
                <div className="space-y-2">
                  {Object.entries(confidenceStates).map(([routeType, state]: [string, any]) => (
                    <div key={routeType} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-foreground">
                          {STRATEGY_OPTIONS.find(o => o.id === routeType)?.label || routeType}
                        </span>
                        <Badge className={`text-xs ${
                          state.current === "HIGH"
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : state.current === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                              : "bg-blue-500/20 text-blue-600 border-blue-500/30"
                        } border`}>
                          {state.current} Confidence
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{state.explanation}</p>
                      {state.changes && state.changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {state.changes.map((change: any, idx: number) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              • {change.explanation}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Checkpoints */}
            {decisionCheckpoints.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Solicitor Decision Required</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Critical decision points requiring solicitor judgment. System guides but does not decide.
                </p>
                <div className="space-y-4">
                  {decisionCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.id} className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                      <h4 className="text-sm font-semibold text-foreground mb-2">{checkpoint.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{checkpoint.description}</p>
                      <div className="space-y-3">
                        {checkpoint.options.map((option) => (
                          <div key={option.id} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="text-xs font-semibold text-foreground">{option.label}</h5>
                              <Badge className={`text-[10px] ${
                                option.leverage === "gains" 
                                  ? "bg-green-500/20 text-green-600 border-green-500/30"
                                  : option.leverage === "loses"
                                    ? "bg-red-500/20 text-red-600 border-red-500/30"
                                    : "bg-amber-500/20 text-amber-600 border-amber-500/30"
                              } border`}>
                                {option.leverage === "gains" ? "Gains Leverage" : option.leverage === "loses" ? "Loses Leverage" : "Maintains"}
                              </Badge>
                            </div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-semibold text-foreground">Risks: </span>
                                <span className="text-muted-foreground">{option.risks.join("; ")}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-foreground">Consequences: </span>
                                <span className="text-muted-foreground">{option.consequences.join("; ")}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-xs font-semibold text-foreground mb-1">Solicitor Guidance:</div>
                        <p className="text-xs text-muted-foreground">{checkpoint.solicitorGuidance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Output Artifacts - shown when strategy is committed AND analysis is available */}
            {isCommitted && primary && artifacts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Output Artifacts</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Structured outputs for your committed strategy. Copy to clipboard for use in case management.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {artifacts.map((artifact, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-xs font-semibold text-foreground">{artifact.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyArtifact(artifact.content)}
                          className="h-6 px-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {artifact.content.substring(0, 200)}...
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deterministic Next Steps - shown when strategy is committed */}
            {isCommitted && primary && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Procedural next steps (non-AI)</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Deterministic action items based on committed strategy. These steps are procedural and do not require AI analysis.
                </p>
                <div className="space-y-2">
                  {getDeterministicNextSteps(primary).map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <p className="text-xs text-foreground flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!isCommitted && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Fallback Strategies (Optional, max 3)
                </h3>
                <div className="space-y-2">
                  {STRATEGY_OPTIONS.filter(o => o.id !== primary).map((option) => {
                    const isSelected = secondary.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "border-primary/50 bg-primary/5"
                            : secondary.length >= 3
                              ? "border-border/50 bg-muted/20 opacity-50 cursor-not-allowed"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSecondaryToggle(option.id)}
                          disabled={!isSelected && secondary.length >= 3}
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground">{option.label}</h4>
                            {isSelected && (
                              <Badge variant="outline" className="text-xs">Selected</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {secondary.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Optional: Select fallback strategies if the primary strategy fails.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
