/**
 * Courtroom Mode Generator
 * 
 * Produces realistic, high-utility "court pressure" content for criminal solicitors.
 * All content is clearly labeled as scenario templates, not predictions.
 * 
 * STRICT RULES:
 * - No "will/likely/probably/expected" wording
 * - No plea/sentence outcome recommendations
 * - No invented facts; every item must list evidence needed or evidence basis
 * - Output is for solicitor brainstorming; keep it opt-in
 */

import type { OffenceElementState, DependencyState, RouteAssessment } from "./strategy-coordinator";
import type { JudgeAnalysis } from "./judge-reasoning";

export type CourtroomModePack = {
  prosecution_lines: { line: string; evidence_needed: string[]; if_true_risk: string }[];
  judicial_focus: { focus: string; legal_anchor: string; evidence_needed: string[] }[];
  defence_counters: { counter: string; safe_wording: string; dependencies: string[] }[];
  cross_exam_angles: { target: "complainant" | "witness" | "officer" | "expert"; angle: string; purpose: string; evidence_needed: string[] }[];
  negotiation_script: { cps_ask: string[]; defence_offer: string[]; red_lines: string[] }[];
  hearing_script: {
    cmh_ptph: string[];
    disclosure_app: string[];
    bail: string[];
  };
  rapid_client_questions: string[];
  flip_triggers: { if_evidence_arrives: string; then_impact: string }[];
  counsel_instruction_pack: {
    issues: string[];
    documents_to_request: string[];
    questions_for_counsel: string[];
  };
};

/**
 * Build Courtroom Mode Pack
 * 
 * Generates deterministic scenario templates based on offence elements, dependencies, and routes.
 * All content is conditional and evidence-linked.
 */
export function buildCourtroomModePack(input: {
  offenceCode: string;
  offenceLabel: string;
  elements: OffenceElementState[];
  dependencies: DependencyState[];
  routes: RouteAssessment[];
  judge_analysis?: JudgeAnalysis;
  recordedPosition?: {
    position_type?: string;
    position_text?: string;
    primary?: string;
  };
}): CourtroomModePack {
  const { offenceCode, offenceLabel, elements, dependencies, routes, judge_analysis, recordedPosition } = input;

  // Identify weak/contested elements
  const weakElements = elements.filter(e => e.support === "weak" || e.support === "none");
  const contestedElements = elements.filter(e => e.support === "some" || e.support === "weak");
  
  // Identify outstanding dependencies
  const outstandingDeps = dependencies.filter(d => d.status === "outstanding");
  const keyOutstanding = outstandingDeps.filter(d => 
    d.id.includes("cctv") || d.id.includes("bwv") || d.id.includes("999") || 
    d.id.includes("interview") || d.id.includes("cad")
  );

  // Identify viable routes
  const viableRoutes = routes.filter(r => r.status === "viable");
  const riskyRoutes = routes.filter(r => r.status === "risky");

  // ============================================================================
  // PROSECUTION LINES
  // ============================================================================
  const prosecution_lines: { line: string; evidence_needed: string[]; if_true_risk: string }[] = [];

  // Based on weak elements
  for (const element of weakElements) {
    if (element.id === "identification") {
      prosecution_lines.push({
        line: "Prosecution may argue identification is clear and reliable",
        evidence_needed: ["CCTV footage showing clear identification", "BWV of identification procedure", "Witness statements confirming identification"],
        if_true_risk: "Identification challenge route becomes harder if clear visual evidence exists",
      });
    }
    if (element.id === "specific_intent" || element.id === "intent") {
      prosecution_lines.push({
        line: "Prosecution may argue intent is demonstrated by sustained or targeted actions",
        evidence_needed: ["CCTV showing sequence and duration", "Medical evidence of multiple injuries", "Witness statements describing sustained attack"],
        if_true_risk: "Intent denial route becomes harder if evidence shows sustained/targeted conduct",
      });
    }
    if (element.id === "injury_classification" || element.id === "injury") {
      prosecution_lines.push({
        line: "Prosecution may argue injury meets statutory threshold (wound/GBH)",
        evidence_needed: ["Medical report confirming wound/GBH classification", "Photographs of injuries", "Expert evidence on injury mechanism"],
        if_true_risk: "Injury threshold challenge becomes harder if medical evidence confirms wound/GBH",
      });
    }
    if (element.id === "act_causation" || element.id === "actus_reus") {
      prosecution_lines.push({
        line: "Prosecution may argue act and causation are clearly established",
        evidence_needed: ["CCTV showing sequence", "Medical evidence linking act to injury", "Witness statements confirming act"],
        if_true_risk: "Act denial route becomes harder if clear sequence evidence exists",
      });
    }
  }

  // Generic prosecution lines based on offence
  if (offenceCode === "s18_oapa") {
    prosecution_lines.push({
      line: "Prosecution may argue specific intent is demonstrated by deliberate targeting or premeditation",
      evidence_needed: ["Evidence of targeting (CCTV, witness statements)", "Evidence of premeditation (prior contact, statements)", "Evidence of sustained violence"],
      if_true_risk: "Intent denial route becomes harder if targeting/premeditation evidence exists",
    });
  }

  if (offenceCode === "s20_oapa") {
    prosecution_lines.push({
      line: "Prosecution may argue recklessness is demonstrated by foresight of harm",
      evidence_needed: ["Evidence of awareness of risk (statements, circumstances)", "Evidence of foresight (prior warnings, context)", "Evidence of deliberate act despite risk"],
      if_true_risk: "Recklessness challenge becomes harder if foresight evidence exists",
    });
  }

  // ============================================================================
  // JUDICIAL FOCUS
  // ============================================================================
  const judicial_focus: { focus: string; legal_anchor: string; evidence_needed: string[] }[] = [];

  // Based on judge analysis legal tests
  if (judge_analysis) {
    for (const test of judge_analysis.legal_tests.slice(0, 3)) {
      judicial_focus.push({
        focus: `Court may focus on: ${test}`,
        legal_anchor: test,
        evidence_needed: judge_analysis.evidential_requirements.filter(req => 
          req.toLowerCase().includes(test.toLowerCase().split(" ")[0])
        ).slice(0, 2),
      });
    }
  }

  // Based on weak elements
  for (const element of weakElements.slice(0, 3)) {
    judicial_focus.push({
      focus: `Court may require clear evidence on: ${element.label}`,
      legal_anchor: element.label,
      evidence_needed: element.gaps.length > 0 ? element.gaps : ["Evidence supporting " + element.label],
    });
  }

  // ============================================================================
  // DEFENCE COUNTERS
  // ============================================================================
  const defence_counters: { counter: string; safe_wording: string; dependencies: string[] }[] = [];

  // Based on viable routes
  for (const route of viableRoutes.slice(0, 3)) {
    if (route.id === "identification_challenge") {
      defence_counters.push({
        counter: "Identification may be challenged if conditions were poor",
        safe_wording: "If evidence shows poor lighting, brief observation, or uncertain conditions, identification may be challenged. Requires: CCTV showing conditions, witness statements on visibility, BWV of scene.",
        dependencies: ["CCTV showing lighting/conditions", "Witness statements on visibility", "BWV of scene"],
      });
    }
    if (route.id === "intent_denial") {
      defence_counters.push({
        counter: "Specific intent may be challenged if evidence is weak",
        safe_wording: "If evidence does not demonstrate targeting, premeditation, or sustained violence, specific intent may be challenged. Requires: CCTV showing sequence, medical evidence on mechanism, witness statements on duration.",
        dependencies: ["CCTV showing sequence", "Medical evidence on mechanism", "Witness statements on duration"],
      });
    }
    if (route.id === "weapon_uncertainty_causation") {
      defence_counters.push({
        counter: "Weapon use and causation may be challenged if uncertain",
        safe_wording: "If weapon presence/use is unclear or medical mechanism is uncertain, causation may be challenged. Requires: Witness statements on weapon visibility, medical evidence on mechanism, forensic evidence if weapon recovered.",
        dependencies: ["Witness statements on weapon visibility", "Medical evidence on mechanism", "Forensic evidence if weapon recovered"],
      });
    }
    if (route.id === "procedural_disclosure_leverage") {
      defence_counters.push({
        counter: "Procedural leverage may be available if disclosure is outstanding",
        safe_wording: "If key disclosure items remain outstanding, procedural leverage may be available. Requires: Disclosure timeline showing outstanding items, evidence of materiality, evidence of impact on fair trial.",
        dependencies: ["Disclosure timeline showing outstanding items", "Evidence of materiality", "Evidence of impact on fair trial"],
      });
    }
  }

  // ============================================================================
  // CROSS EXAMINATION ANGLES
  // ============================================================================
  const cross_exam_angles: { target: "complainant" | "witness" | "officer" | "expert"; angle: string; purpose: string; evidence_needed: string[] }[] = [];

  // Identification angles
  if (weakElements.some(e => e.id === "identification")) {
    cross_exam_angles.push({
      target: "complainant",
      angle: "Conditions of observation: lighting, distance, duration, angle of view",
      purpose: "Challenge reliability of identification if conditions were poor",
      evidence_needed: ["CCTV showing scene conditions", "Witness statements on lighting", "BWV of scene"],
    });
    cross_exam_angles.push({
      target: "witness",
      angle: "Opportunity to observe: position, line of sight, distractions, duration",
      purpose: "Challenge reliability of identification if opportunity was limited",
      evidence_needed: ["CCTV showing witness position", "Witness statements on position", "Scene photographs"],
    });
  }

  // Weapon angles
  if (weakElements.some(e => e.id.includes("weapon")) || outstandingDeps.some(d => d.id.includes("weapon"))) {
    cross_exam_angles.push({
      target: "complainant",
      angle: "Weapon visibility: did you clearly see a weapon, or did you believe one was present?",
      purpose: "Challenge weapon certainty if visibility was unclear",
      evidence_needed: ["Witness statements on weapon visibility", "CCTV showing weapon (if any)", "Forensic evidence if weapon recovered"],
    });
    cross_exam_angles.push({
      target: "officer",
      angle: "Weapon recovery: was a weapon recovered, and if so, where and when?",
      purpose: "Challenge weapon presence if not recovered or recovery is unclear",
      evidence_needed: ["Evidence of weapon recovery", "Forensic evidence", "Chain of custody"],
    });
  }

  // Sequence/timing angles
  if (weakElements.some(e => e.id === "act_causation" || e.id === "actus_reus")) {
    cross_exam_angles.push({
      target: "complainant",
      angle: "Sequence of events: exact timing, order of actions, what happened first?",
      purpose: "Challenge causation if sequence is unclear",
      evidence_needed: ["CCTV showing sequence", "Witness statements on timing", "Medical evidence on mechanism"],
    });
  }

  // Medical mechanism angles
  if (weakElements.some(e => e.id === "injury_classification" || e.id === "injury")) {
    cross_exam_angles.push({
      target: "expert",
      angle: "Medical mechanism: how exactly was the injury caused, and is there alternative causation?",
      purpose: "Challenge injury causation if mechanism is unclear or alternative causation possible",
      evidence_needed: ["Medical report on mechanism", "Expert evidence on causation", "Alternative causation evidence"],
    });
  }

  // ============================================================================
  // NEGOTIATION SCRIPT
  // ============================================================================
  const negotiation_script: { cps_ask: string[]; defence_offer: string[]; red_lines: string[] }[] = [];

  // Based on viable routes
  if (viableRoutes.some(r => r.id === "identification_challenge")) {
    negotiation_script.push({
      cps_ask: [
        "CPS may seek to maintain current charge if identification evidence is strong",
        "CPS may seek to proceed to trial if identification is clear",
      ],
      defence_offer: [
        "Defence may argue identification is weak if conditions were poor (requires: CCTV showing conditions, witness statements on visibility)",
        "Defence may seek charge reduction if identification is uncertain (requires: evidence of poor conditions, uncertain identification)",
      ],
      red_lines: [
        "Do not accept identification as reliable without reviewing CCTV/BWV showing conditions",
        "Do not accept charge without reviewing all identification evidence",
      ],
    });
  }

  if (viableRoutes.some(r => r.id === "intent_denial" && offenceCode === "s18_oapa")) {
    negotiation_script.push({
      cps_ask: [
        "CPS may seek to maintain s.18 if intent evidence is strong",
        "CPS may seek to proceed to trial if intent is clear",
      ],
      defence_offer: [
        "Defence may argue intent is weak if evidence does not show targeting/premeditation (requires: CCTV showing sequence, medical evidence, witness statements)",
        "Defence may seek reduction to s.20 if intent is uncertain (requires: evidence of lack of targeting, lack of premeditation)",
      ],
      red_lines: [
        "Do not accept s.18 without reviewing all intent evidence",
        "Do not accept charge without reviewing CCTV/medical evidence on sequence",
      ],
    });
  }

  if (keyOutstanding.length > 0) {
    negotiation_script.push({
      cps_ask: [
        "CPS may seek to proceed without outstanding disclosure if it is not material",
        "CPS may seek to proceed if disclosure is not critical",
      ],
      defence_offer: [
        "Defence may argue disclosure is material and required before proceeding (requires: disclosure timeline, evidence of materiality)",
        "Defence may seek adjournment if disclosure is outstanding (requires: evidence of impact on fair trial)",
      ],
      red_lines: [
        "Do not proceed without key disclosure if it is material to defence",
        "Do not accept CPS position on disclosure without reviewing materiality",
      ],
    });
  }

  // ============================================================================
  // HEARING SCRIPTS
  // ============================================================================
  const hearing_script: {
    cmh_ptph: string[];
    disclosure_app: string[];
    bail: string[];
  } = {
    cmh_ptph: [],
    disclosure_app: [],
    bail: [],
  };

  // CMH/PTPH script
  if (keyOutstanding.length > 0) {
    hearing_script.cmh_ptph.push(
      "Submission: Key disclosure items remain outstanding. These items are material to the defence case.",
      "Request: Adjournment to allow disclosure to be served and reviewed before plea/listing.",
      "Basis: Fair trial requires full disclosure. Outstanding items: " + keyOutstanding.map(d => d.label).join(", "),
    );
  }

  if (weakElements.length > 0) {
    hearing_script.cmh_ptph.push(
      "Submission: Defence case depends on evidence that is currently weak or outstanding.",
      "Request: Time to review disclosure and prepare defence case.",
      "Basis: Weak elements: " + weakElements.map(e => e.label).join(", "),
    );
  }

  // Disclosure application script
  if (keyOutstanding.length > 0) {
    hearing_script.disclosure_app.push(
      "Application: Disclosure of outstanding items under CPIA.",
      "Items: " + keyOutstanding.map(d => `${d.label} (${d.why_it_matters})`).join("; "),
      "Materiality: These items are material to the defence case as they relate to: " + weakElements.map(e => e.label).join(", "),
      "Request: Disclosure to be served within [X] days, or application for stay if not served.",
    );
  }

  // Bail script (if applicable)
  if (recordedPosition?.primary === "fight_charge") {
    hearing_script.bail.push(
      "Submission: Defendant has strong defence case based on available evidence.",
      "Basis: Weak prosecution elements: " + weakElements.map(e => e.label).join(", "),
      "Request: Conditional bail if not already granted, or variation of conditions if granted.",
    );
  }

  // ============================================================================
  // RAPID CLIENT QUESTIONS
  // ============================================================================
  const rapid_client_questions: string[] = [];

  // Identification questions
  if (weakElements.some(e => e.id === "identification")) {
    rapid_client_questions.push("What were the lighting conditions at the time?");
    rapid_client_questions.push("How long did you observe the incident?");
    rapid_client_questions.push("What was your distance from the incident?");
    rapid_client_questions.push("Were there any obstructions to your view?");
  }

  // Weapon questions
  if (weakElements.some(e => e.id.includes("weapon")) || outstandingDeps.some(d => d.id.includes("weapon"))) {
    rapid_client_questions.push("Did you clearly see a weapon, or did you believe one was present?");
    rapid_client_questions.push("If a weapon was used, what type was it?");
    rapid_client_questions.push("Was the weapon recovered?");
  }

  // Sequence/timing questions
  rapid_client_questions.push("What was the exact sequence of events?");
  rapid_client_questions.push("How long did the incident last?");
  rapid_client_questions.push("What happened immediately before the incident?");

  // Provocation/context questions
  rapid_client_questions.push("Was there any prior contact or history between you and the other party?");
  rapid_client_questions.push("Was there any provocation or threat before the incident?");
  rapid_client_questions.push("Were you under the influence of alcohol or drugs at the time?");

  // Injury questions
  if (weakElements.some(e => e.id === "injury_classification" || e.id === "injury")) {
    rapid_client_questions.push("What injuries did you sustain?");
    rapid_client_questions.push("How were the injuries caused?");
    rapid_client_questions.push("Did you receive medical treatment?");
  }

  // Limit to 8-12 questions
  const limitedQuestions = rapid_client_questions.slice(0, 12);

  // ============================================================================
  // FLIP TRIGGERS
  // ============================================================================
  const flip_triggers: { if_evidence_arrives: string; then_impact: string }[] = [];

  // Based on outstanding dependencies
  for (const dep of keyOutstanding.slice(0, 3)) {
    if (dep.id.includes("cctv")) {
      flip_triggers.push({
        if_evidence_arrives: "CCTV footage showing clear sequence and identification",
        then_impact: "Identification challenge route becomes harder; act denial route becomes harder",
      });
    }
    if (dep.id.includes("bwv")) {
      flip_triggers.push({
        if_evidence_arrives: "BWV showing clear identification and scene conditions",
        then_impact: "Identification challenge route becomes harder; conditions-based challenges become harder",
      });
    }
    if (dep.id.includes("999")) {
      flip_triggers.push({
        if_evidence_arrives: "999 call audio containing admissions or clear account",
        then_impact: "Act denial route becomes harder; self-defence route may become harder if admissions present",
      });
    }
    if (dep.id.includes("interview")) {
      flip_triggers.push({
        if_evidence_arrives: "Interview recording containing admissions or clear account",
        then_impact: "Act denial route becomes harder; intent denial route may become harder if admissions present",
      });
    }
  }

  // Based on weak elements
  for (const element of weakElements.slice(0, 2)) {
    if (element.id === "specific_intent") {
      flip_triggers.push({
        if_evidence_arrives: "Evidence showing targeting, premeditation, or sustained violence",
        then_impact: "Intent denial route becomes harder; alternative mental state route becomes harder",
      });
    }
    if (element.id === "injury_classification") {
      flip_triggers.push({
        if_evidence_arrives: "Medical evidence clearly confirming wound/GBH classification",
        then_impact: "Injury threshold challenge becomes harder; charge reduction route becomes harder",
      });
    }
  }

  // ============================================================================
  // COUNSEL INSTRUCTION PACK
  // ============================================================================
  const counsel_instruction_pack: {
    issues: string[];
    documents_to_request: string[];
    questions_for_counsel: string[];
  } = {
    issues: [],
    documents_to_request: [],
    questions_for_counsel: [],
  };

  // Issues based on weak elements and viable routes
  for (const element of weakElements) {
    counsel_instruction_pack.issues.push(`${element.label}: Evidence is weak or contested. Requires: ${element.gaps.join(", ") || "Evidence supporting " + element.label}`);
  }

  for (const route of viableRoutes.slice(0, 3)) {
    counsel_instruction_pack.issues.push(`${route.id.replace(/_/g, " ")}: Route is viable. Reasons: ${route.reasons.slice(0, 2).join("; ")}`);
  }

  // Documents to request based on outstanding dependencies
  for (const dep of outstandingDeps) {
    counsel_instruction_pack.documents_to_request.push(`${dep.label}: ${dep.why_it_matters}`);
  }

  // Questions for counsel
  counsel_instruction_pack.questions_for_counsel.push("What is your assessment of the strength of the prosecution case on each element?");
  counsel_instruction_pack.questions_for_counsel.push("What are the key weaknesses in the prosecution case?");
  counsel_instruction_pack.questions_for_counsel.push("What evidence is needed to strengthen the defence case?");
  counsel_instruction_pack.questions_for_counsel.push("What are the risks of each defence route?");
  counsel_instruction_pack.questions_for_counsel.push("What disclosure is still needed and why?");
  counsel_instruction_pack.questions_for_counsel.push("What are the key questions for cross-examination?");
  counsel_instruction_pack.questions_for_counsel.push("What are the realistic prospects of success for each route?");

  // ============================================================================
  // RETURN PACK
  // ============================================================================
  return {
    prosecution_lines: prosecution_lines.slice(0, 5), // Limit to 5
    judicial_focus: judicial_focus.slice(0, 5), // Limit to 5
    defence_counters: defence_counters.slice(0, 5), // Limit to 5
    cross_exam_angles: cross_exam_angles.slice(0, 8), // Limit to 8
    negotiation_script: negotiation_script.slice(0, 3), // Limit to 3
    hearing_script,
    rapid_client_questions: limitedQuestions,
    flip_triggers: flip_triggers.slice(0, 6), // Limit to 6
    counsel_instruction_pack,
  };
}
