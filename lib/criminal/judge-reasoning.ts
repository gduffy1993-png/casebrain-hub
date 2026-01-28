/**
 * Judge Reasoning Layer
 * 
 * Provides doctrine-based analysis of how the court is required to analyse issues,
 * without predicting outcomes or probabilities.
 */

import type { OffenceCode } from "./offence-elements";
import type { OffenceElementState, DependencyState } from "./strategy-coordinator";

export type JudgeAnalysis = {
  legal_tests: string[];
  constraints: string[];
  tolerances: string[];
  red_flags: string[];
  evidential_requirements: string[];
};

export type BuildJudgeAnalysisInput = {
  offenceCode: string;
  offenceLabel: string;
  elements: OffenceElementState[];
  dependencies: DependencyState[];
  plugin_constraints: Record<string, any>;
};

/**
 * Build Judge Analysis from offence, elements, dependencies, and constraints.
 * Returns doctrine-based analysis without predictions.
 */
export function buildJudgeAnalysis(input: BuildJudgeAnalysisInput): JudgeAnalysis {
  const { offenceCode, offenceLabel, elements, dependencies, plugin_constraints } = input;

  const legal_tests: string[] = [];
  const constraints: string[] = [];
  const tolerances: string[] = [];
  const red_flags: string[] = [];
  const evidential_requirements: string[] = [];

  // Get weak/none elements
  const weakElements = elements.filter(e => e.support === "weak" || e.support === "none");
  const outstandingDeps = dependencies.filter(d => d.status === "outstanding");

  // Identification element analysis
  const identificationElement = elements.find(e => e.id === "identification");
  if (identificationElement && (identificationElement.support === "weak" || identificationElement.support === "none")) {
    legal_tests.push("Turnbull principles (reliability factors)");
    constraints.push("Court must assess identification reliability against Turnbull guidelines");
    evidential_requirements.push("Sequence/ID conditions evidence (lighting, duration, distance, recognition context)");
    
    // Check for outstanding CCTV/BWV that would affect ID
    const idDeps = outstandingDeps.filter(d => 
      d.id.includes("cctv") || d.id.includes("bwv") || d.label.toLowerCase().includes("cctv") || d.label.toLowerCase().includes("bwv")
    );
    if (idDeps.length > 0) {
      red_flags.push("Missing CCTV/BWV where identification is disputed");
    }
  }

  // Intent element analysis (s18 specific intent)
  if (offenceCode === "s18_oapa") {
    const intentElement = elements.find(e => e.id === "specific_intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      legal_tests.push("Woollin / direct intent principles");
      constraints.push("Court must distinguish specific intent (s18) from recklessness (s20)");
      tolerances.push("Specific intent requires evidence supporting targeting/deliberation beyond injury alone");
      evidential_requirements.push("Targeting/duration evidence (sequence, repetition, context, premeditation indicators)");
    }
  }

  // Recklessness element analysis (s20)
  if (offenceCode === "s20_oapa") {
    const recklessnessElement = elements.find(e => e.id === "recklessness");
    if (recklessnessElement && (recklessnessElement.support === "weak" || recklessnessElement.support === "none")) {
      legal_tests.push("Cunningham recklessness (awareness of risk)");
      constraints.push("Court must assess whether defendant was aware of risk of causing serious harm");
      evidential_requirements.push("Awareness/risk evidence (circumstances, defendant's state, foreseeability)");
    }
  }

  // Injury/Classification element analysis
  const injuryElement = elements.find(e => 
    e.id === "injury_threshold" || e.id === "injury_classification" || e.id === "injury" || e.id === "actual_bodily_harm"
  );
  if (injuryElement && (injuryElement.support === "weak" || injuryElement.support === "none")) {
    if (offenceCode === "s18_oapa" || offenceCode === "s20_oapa") {
      legal_tests.push("GBH/Wounding threshold (serious harm definition)");
      constraints.push("Court must determine whether injury meets GBH/wounding threshold");
      evidential_requirements.push("Medical mechanism confirmation (causation, mechanism, severity classification)");
    } else if (offenceCode === "s47_oapa") {
      legal_tests.push("Actual Bodily Harm threshold");
      constraints.push("Court must determine whether injury meets ABH threshold");
      evidential_requirements.push("Medical evidence confirming injury mechanism and causation");
    }
  }

  // Act/Causation element analysis
  const actElement = elements.find(e => 
    e.id === "act_causation" || e.id === "actus_reus" || e.id === "causation"
  );
  if (actElement && (actElement.support === "weak" || actElement.support === "none")) {
    constraints.push("Court must establish causation between act and injury");
    evidential_requirements.push("Sequence evidence (timing, mechanism, alternative causation possibilities)");
  }

  // Self-defence analysis (if route is blocked but mentioned)
  // Note: Routes are not in plugin_constraints, so we check based on recorded position
  // and missing evidence that would support self-defence
  if (plugin_constraints.recorded_position?.primary === "fight_charge") {
    // If self-defence narrative is mentioned but evidence is missing, include doctrine
    const hasSelfDefenceEvidence = elements.some(e => 
      e.refs.some(ref => 
        ref.note.toLowerCase().includes("self-defence") || 
        ref.note.toLowerCase().includes("self defence")
      )
    );
    if (!hasSelfDefenceEvidence) {
      legal_tests.push("Self-defence: necessity + reasonableness + evidential basis requirement");
      constraints.push("Self-defence requires evidential basis; court cannot infer it");
      evidential_requirements.push("Evidential basis for self-defence narrative (defendant's account, circumstances, threat evidence)");
    }
  }

  // Disclosure fairness analysis
  const hasOutstandingDisclosure = outstandingDeps.length > 0;
  const proceduralSafety = plugin_constraints.procedural_safety;
  if (hasOutstandingDisclosure || proceduralSafety?.status === "UNSAFE_TO_PROCEED" || proceduralSafety?.status === "CONDITIONALLY_UNSAFE") {
    legal_tests.push("CPIA principles (fair trial / materiality)");
    constraints.push("Court must ensure fair trial; missing material disclosure affects case management");
    
    // Check for key missing items
    const keyMissing = outstandingDeps.filter(d => 
      d.id.includes("cctv") || d.id.includes("bwv") || d.id.includes("999") || 
      d.id.includes("interview") || d.id.includes("cad")
    );
    if (keyMissing.length > 0) {
      red_flags.push("Missing key disclosure items (CCTV/BWV/999/interview) where decisive for disputed elements");
    }
  }

  // CCTV continuity analysis
  const cctvDeps = outstandingDeps.filter(d => 
    d.id.includes("cctv") || d.label.toLowerCase().includes("cctv")
  );
  const continuityDep = dependencies.find(d => 
    d.id.includes("continuity") || d.label.toLowerCase().includes("continuity")
  );
  if (cctvDeps.length > 0 || (continuityDep && continuityDep.status === "outstanding")) {
    legal_tests.push("CCTV continuity: weight depends on continuity and integrity");
    constraints.push("Missing continuity affects weight; court must assess integrity chain");
    evidential_requirements.push("CCTV continuity logs (seizure, storage, exhibit logs, chain of custody)");
    
    // Check for date inconsistencies
    if (plugin_constraints.outstanding_disclosure?.items?.some((item: string) => 
      item.toLowerCase().includes("continuity") || item.toLowerCase().includes("date")
    )) {
      red_flags.push("Date inconsistencies / continuity issues in CCTV evidence");
    }
  }

  // Weapon uncertainty analysis
  const weaponElement = elements.find(e => e.id.includes("weapon"));
  if (weaponElement && (weaponElement.support === "weak" || weaponElement.support === "none")) {
    constraints.push("Court must determine weapon presence/use; uncertainty affects causation");
    evidential_requirements.push("Weapon visibility/mechanism clarity (witness observations, recovery, forensic confirmation)");
    
    // Check for witness uncertainty indicators
    if (weaponElement.gaps.length > 0 || weaponElement.refs.length === 0) {
      red_flags.push("Witness uncertainty on weapon (visibility, recovery, mechanism unclear)");
    }
  }

  // Alternative mental state / offence framing
  if (offenceCode === "s18_oapa" && identificationElement && identificationElement.support === "strong") {
    // If ID is strong but intent is weak, s20 alternative is relevant
    const intentElement = elements.find(e => e.id === "specific_intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      legal_tests.push("Alternative mental state framing (s18 vs s20)");
      constraints.push("Court must distinguish specific intent (s18) from recklessness (s20) based on evidence");
      tolerances.push("Absence of targeting/deliberation evidence supports alternative mental state (s20)");
    }
  }

  // Generic constraints for any weak element
  if (weakElements.length > 0) {
    constraints.push("Court must resolve disputed elements based on available evidence; missing material affects assessment");
  }

  // Remove duplicates and limit counts
  const uniqueLegalTests = Array.from(new Set(legal_tests));
  const uniqueConstraints = Array.from(new Set(constraints));
  const uniqueTolerances = Array.from(new Set(tolerances));
  const uniqueRedFlags = Array.from(new Set(red_flags));
  const uniqueEvidentialRequirements = Array.from(new Set(evidential_requirements));

  return {
    legal_tests: uniqueLegalTests.slice(0, 8), // Max 8
    constraints: uniqueConstraints.slice(0, 8), // Max 8
    tolerances: uniqueTolerances.slice(0, 6), // Max 6
    red_flags: uniqueRedFlags.slice(0, 6), // Max 6
    evidential_requirements: uniqueEvidentialRequirements.slice(0, 8), // Max 8
  };
}
