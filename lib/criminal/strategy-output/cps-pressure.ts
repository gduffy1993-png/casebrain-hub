/**
 * Strategy Output Model - CPS Pressure Lens
 * 
 * Builds realistic, case-specific prosecution pressure analysis.
 * All content is evidence-linked, non-predictive, and conditional.
 */

import type { EvidenceSnapshot, EvidenceAnchor } from "./types";
import { buildGapAnchor, buildTimelineAnchor } from "./anchors";

/**
 * CPS Pressure Lens
 * 
 * Anticipates prosecution arguments and pressure points based on evidence state.
 */
export type CPSPressureLens = {
  headline: string; // 1 sentence: "CPS pressure concentrates on X because Y is weak/strong"
  theory_components: Array<{
    component: string;
    what_they_need: string;
    anchors?: EvidenceAnchor;
    evidence_needed?: string[];
  }>;
  pressure_points: Array<{
    point: string;
    targets_element: string; // e.g. "specific intent", "identification", "causation"
    depends_on: string[]; // evidence/disclosure items needed
    why_it_bites: string; // short
    how_to_blunt: string[]; // defence counters (at least 1 item)
    anchors?: EvidenceAnchor;
    evidence_needed?: string[];
  }>; // 4-8
  likely_requests: string[]; // Things CPS commonly pushes procedurally (framed neutrally)
  weak_spots_for_defence: Array<{
    spot: string;
    exploit: string;
    anchors?: EvidenceAnchor;
  }>; // 3-6
  counter_prep: Array<{
    prompt: string;
    safe_reply: string;
    dependencies?: string[];
  }>; // Short Q/A prep (5-8)
};

/**
 * Build CPS Pressure Lens
 * 
 * @param input - Case data input
 * @returns CPSPressureLens
 */
export function buildCPSPressureLens(input: {
  snapshot: EvidenceSnapshot;
  offenceElements: Array<{
    id: string;
    label: string;
    support: "strong" | "some" | "weak" | "none";
    gaps: string[];
  }>;
  routes: Array<{
    id: string;
    status: "viable" | "risky" | "blocked";
    reasons: string[];
  }>;
  recordedPosition?: string;
}): CPSPressureLens {
  const { snapshot, offenceElements, routes } = input;

  // Build headline
  const headline = buildHeadline(snapshot, offenceElements);

  // Build theory components
  const theory_components = buildTheoryComponents(snapshot, offenceElements);

  // Build pressure points
  const pressure_points = buildPressurePoints(snapshot, offenceElements, routes);

  // Build likely requests
  const likely_requests = buildLikelyRequests(snapshot, offenceElements);

  // Build weak spots for defence
  const weak_spots_for_defence = buildWeakSpotsForDefence(snapshot, offenceElements, routes);

  // Build counter prep
  const counter_prep = buildCounterPrep(snapshot, offenceElements, routes);

  return {
    headline,
    theory_components,
    pressure_points,
    likely_requests,
    weak_spots_for_defence,
    counter_prep,
  };
}

/**
 * Build headline from offence + strongest element + weakest disputed element
 */
function buildHeadline(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ label: string; support: string }>
): string {
  const parts: string[] = [];

  // Find strongest element
  const strongElements = offenceElements.filter(e => e.support === "strong");
  if (strongElements.length > 0) {
    parts.push(`${strongElements[0].label.toLowerCase()}`);
  }

  // Find weakest disputed element
  const weakElements = offenceElements.filter(
    e => e.support === "weak" || e.support === "none"
  );
  if (weakElements.length > 0) {
    parts.push(`${weakElements[0].label.toLowerCase()} inference`);
  }

  // Add evidence context
  if (snapshot.flags.sequence_missing) {
    parts.push("sequence/medical mechanism determine leverage");
  } else if (snapshot.flags.weapon_uncertainty) {
    parts.push("weapon/causation mechanism determine leverage");
  } else if (snapshot.flags.id_uncertainty) {
    parts.push("identification reliability determines leverage");
  }

  if (parts.length === 0) {
    return "CPS pressure analysis based on current evidence state.";
  }

  return `Pressure centres on ${parts.join(" and ")}.`;
}

/**
 * Build theory components (mirror offence elements)
 */
function buildTheoryComponents(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>
): CPSPressureLens["theory_components"] {
  const components: CPSPressureLens["theory_components"] = [];
  const offenceCode = snapshot.offence.code || "";

  // Harm/Classification component
  const injuryElement = offenceElements.find(
    e => e.id === "injury_classification" || e.id === "injury" || e.id === "actual_bodily_harm"
  );
  if (injuryElement) {
    const whatTheyNeed = injuryElement.support === "weak" || injuryElement.support === "none"
      ? "Establish injury meets statutory threshold (wound/GBH/ABH)"
      : "Confirm injury classification and mechanism";
    
    components.push({
      component: "Harm/Classification",
      what_they_need: whatTheyNeed,
      evidence_needed: injuryElement.gaps.length > 0
        ? injuryElement.gaps.slice(0, 3)
        : ["Medical report", "Photographs", "Expert evidence"],
      anchors: injuryElement.gaps.length > 0 ? buildGapAnchor(injuryElement.gaps) : undefined,
    });
  }

  // Intent/Mental element component
  if (offenceCode.includes("s18") || offenceCode.includes("18")) {
    const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
    if (intentElement) {
      const whatTheyNeed = intentElement.support === "weak" || intentElement.support === "none"
        ? "Establish specific intent to cause GBH (targeting, premeditation, sustained conduct)"
        : "Confirm intent inference from sequence and targeting";
      
      components.push({
        component: "Specific Intent (s.18)",
        what_they_need: whatTheyNeed,
        evidence_needed: intentElement.gaps.length > 0
          ? intentElement.gaps.slice(0, 3)
          : ["CCTV showing sequence", "Witness statements on targeting", "Defendant statements"],
        anchors: intentElement.gaps.length > 0 ? buildGapAnchor(intentElement.gaps) : undefined,
      });
    }
  } else if (offenceCode.includes("s20") || offenceCode.includes("20")) {
    const recklessnessElement = offenceElements.find(e => e.id === "recklessness");
    if (recklessnessElement) {
      const whatTheyNeed = recklessnessElement.support === "weak" || recklessnessElement.support === "none"
        ? "Establish recklessness (awareness of risk of causing harm)"
        : "Confirm recklessness inference from circumstances";
      
      components.push({
        component: "Recklessness (s.20)",
        what_they_need: whatTheyNeed,
        evidence_needed: recklessnessElement.gaps.length > 0
          ? recklessnessElement.gaps.slice(0, 3)
          : ["Circumstances evidence", "Defendant's state", "Foreseeability evidence"],
        anchors: recklessnessElement.gaps.length > 0 ? buildGapAnchor(recklessnessElement.gaps) : undefined,
      });
    }
  }

  // Identification component
  const idElement = offenceElements.find(e => e.id === "identification");
  if (idElement) {
    const whatTheyNeed = idElement.support === "weak" || idElement.support === "none"
      ? "Establish identification reliability despite conditions"
      : "Confirm identification consistency and reliability";
    
    components.push({
      component: "Identification",
      what_they_need: whatTheyNeed,
      evidence_needed: idElement.gaps.length > 0
        ? idElement.gaps.slice(0, 3)
        : ["CCTV/BWV footage", "Witness statements", "Identification procedure"],
      anchors: idElement.gaps.length > 0 ? buildGapAnchor(idElement.gaps) : undefined,
    });
  }

  // Weapon/Causation component
  const weaponElement = offenceElements.find(
    e => e.id.includes("weapon") || e.id.includes("causation") || e.id === "act_causation"
  );
  if (weaponElement || snapshot.flags.weapon_uncertainty) {
    const whatTheyNeed = snapshot.flags.weapon_uncertainty
      ? "Establish weapon use and causation mechanism"
      : "Confirm weapon use and injury causation";
    
    components.push({
      component: "Weapon/Causation",
      what_they_need: whatTheyNeed,
      evidence_needed: weaponElement && weaponElement.gaps.length > 0
        ? weaponElement.gaps.slice(0, 3)
        : ["Weapon recovery", "Forensic analysis", "Medical mechanism evidence"],
      anchors: weaponElement && weaponElement.gaps.length > 0
        ? buildGapAnchor(weaponElement.gaps)
        : snapshot.flags.weapon_uncertainty
        ? buildGapAnchor(["Weapon recovery", "Forensic confirmation"])
        : undefined,
    });
  }

  return components;
}

/**
 * Build pressure points (4-8, tied to snapshot.flags and offence elements)
 */
function buildPressurePoints(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  routes: Array<{ id: string; status: string }>
): CPSPressureLens["pressure_points"] {
  const points: CPSPressureLens["pressure_points"] = [];
  const offenceCode = snapshot.offence.code || "";

  // Pressure point: sequence missing (targets causation/intent)
  if (snapshot.flags.sequence_missing) {
    const causationElement = offenceElements.find(e => e.id === "causation" || e.id === "act_causation");
    const intentElement = offenceCode.includes("s18") || offenceCode.includes("18")
      ? offenceElements.find(e => e.id === "specific_intent" || e.id === "intent")
      : null;
    const targetElement = intentElement ? intentElement.label : (causationElement?.label || "causation");
    
    points.push({
      point: "Sequence inference from injury pattern and medical evidence",
      targets_element: targetElement.toLowerCase(),
      depends_on: ["CCTV showing sequence", "Witness statements on duration", "Medical evidence of multiple injuries"],
      why_it_bites: "If sequence evidence arrives showing sustained/targeted conduct, intent denial route becomes harder",
      how_to_blunt: [
        "Require prosecution to prove sequence through direct evidence, not inference",
        "Challenge sequence inference; require clear evidence of sustained/targeted conduct",
        "Argue that injury pattern alone does not establish sequence or targeting"
      ],
      evidence_needed: ["CCTV showing sequence", "Witness statements on duration", "Medical evidence of multiple injuries"],
      anchors: buildGapAnchor(["CCTV", "Witness statements on sequence"]),
    });
  }

  // Pressure point: weapon uncertainty (targets causation)
  if (snapshot.flags.weapon_uncertainty) {
    const causationElement = offenceElements.find(e => e.id === "causation" || e.id === "act_causation");
    const targetElement = causationElement?.label || "causation";
    
    points.push({
      point: "Weapon inference from medical mechanism and injury pattern",
      targets_element: targetElement.toLowerCase(),
      depends_on: ["Weapon recovery", "Forensic analysis", "Medical mechanism report"],
      why_it_bites: "If weapon recovery or forensic confirmation arrives, weapon uncertainty leverage reduces",
      how_to_blunt: [
        "Challenge weapon inference; require clear evidence of weapon use and causation",
        "Require prosecution to prove weapon presence, recovery, or clear forensic confirmation",
        "Argue that medical mechanism alone does not establish weapon use"
      ],
      evidence_needed: ["Weapon recovery", "Forensic analysis", "Medical mechanism report"],
      anchors: buildGapAnchor(["Weapon recovery", "Forensic confirmation"]),
    });
  }

  // Pressure point: ID uncertainty (targets identification)
  if (snapshot.flags.id_uncertainty) {
    const idRoute = routes.find(r => r.id === "identification_challenge");
    if (idRoute && (idRoute.status === "viable" || idRoute.status === "risky")) {
      const idElement = offenceElements.find(e => e.id === "identification");
      const targetElement = idElement?.label || "identification";
      
      points.push({
        point: "Identification reliability despite conditions (Turnbull factors)",
        targets_element: targetElement.toLowerCase(),
        depends_on: ["Clear CCTV/BWV footage", "Corroborating witness statements", "Identification procedure evidence"],
        why_it_bites: "If clear identification evidence arrives, identification challenge route becomes significantly harder",
        how_to_blunt: [
          "Apply Turnbull principles; require prosecution to establish identification reliability",
          "Challenge identification evidence given conditions of observation and lack of corroboration",
          "Require clear reliability factors (lighting, duration, distance, recognition context)"
        ],
        evidence_needed: ["Clear CCTV/BWV footage", "Corroborating witness statements", "Identification procedure evidence"],
        anchors: buildGapAnchor(["CCTV", "BWV", "Witness statements"]),
      });
    }
  }

  // Pressure point: date conflicts (targets continuity/credibility)
  if (snapshot.flags.date_conflicts) {
    points.push({
      point: "Continuity and credibility despite date/time inconsistencies",
      targets_element: "continuity",
      depends_on: ["CCTV continuity logs", "Witness statements on timing", "CAD logs"],
      why_it_bites: "If continuity evidence resolves conflicts, procedural leverage may reduce",
      how_to_blunt: [
        "Challenge continuity and integrity; require clear evidence of chain of custody",
        "Argue that date inconsistencies affect weight and reliability",
        "Require prosecution to resolve conflicts before evidence can be relied upon"
      ],
      evidence_needed: ["CCTV continuity logs", "Witness statements on timing", "CAD logs"],
      anchors: buildGapAnchor(["CCTV continuity", "Timing evidence"]),
    });
  }

  // Pressure point: intent element (s18) (targets specific intent)
  if (offenceCode.includes("s18") || offenceCode.includes("18")) {
    const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      points.push({
        point: "Intent inference from injury severity, sequence, and targeting",
        targets_element: intentElement.label.toLowerCase(),
        depends_on: ["CCTV showing targeting", "Witness statements on premeditation", "Defendant statements"],
        why_it_bites: "If evidence arrives showing targeting or premeditation, intent denial route becomes harder",
        how_to_blunt: [
          "Require prosecution to prove specific intent beyond injury alone; targeting, premeditation, or sustained conduct required",
          "Challenge intent inference; require clear evidence of targeting or deliberation",
          "Argue that injury severity alone does not establish specific intent"
        ],
        evidence_needed: ["CCTV showing targeting", "Witness statements on premeditation", "Defendant statements"],
        anchors: intentElement.gaps.length > 0 ? buildGapAnchor(intentElement.gaps) : undefined,
      });
    }
  }

  // Pressure point: outstanding disclosure (targets disclosure/fair trial)
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    const dependsOn = snapshot.disclosure.required_without_timeline.slice(0, 3);
    points.push({
      point: "Outstanding disclosure may strengthen prosecution case",
      targets_element: "disclosure",
      depends_on: dependsOn,
      why_it_bites: "If key required disclosure is served, disclosure leverage route may become blocked",
      how_to_blunt: [
        "Pressure CPS on disclosure obligations and materiality; seek adverse inference if not served",
        "Require disclosure of material items before case can safely proceed",
        "Argue that missing disclosure affects fair trial and case management"
      ],
      evidence_needed: dependsOn,
      anchors: buildTimelineAnchor(
        snapshot.disclosure.required_without_timeline.map(item => ({ item, action: "outstanding" }))
      ),
    });
  }

  // Pressure point: strong element (targets that element)
  const strongElements = offenceElements.filter(e => e.support === "strong");
  if (strongElements.length > 0) {
    const strongElement = strongElements[0];
    points.push({
      point: `${strongElement.label} element has strong support`,
      targets_element: strongElement.label.toLowerCase(),
      depends_on: strongElement.gaps.length > 0 ? strongElement.gaps.slice(0, 2) : ["Existing evidence"],
      why_it_bites: `Strong ${strongElement.label.toLowerCase()} evidence limits defence options on this element`,
      how_to_blunt: [
        `Focus defence on other elements where support is weaker`,
        `Challenge ${strongElement.label.toLowerCase()} element only if evidence gaps emerge`,
        `Require prosecution to maintain strong evidence throughout trial`
      ],
      evidence_needed: strongElement.gaps.length > 0 ? strongElement.gaps.slice(0, 2) : undefined,
    });
  }

  // Limit to 8
  return points.slice(0, 8);
}

/**
 * Build likely requests (procedural moves CPS commonly takes)
 */
function buildLikelyRequests(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>
): string[] {
  const requests: string[] = [];

  // Common approach: seek time for outstanding disclosure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    requests.push("Common approach: seek adjournment for outstanding disclosure");
  }

  // Common approach: rely on medical reports
  const hasMedicalGaps = offenceElements.some(e =>
    e.gaps.some(gap => gap.toLowerCase().includes("medical") || gap.toLowerCase().includes("mechanism"))
  );
  if (hasMedicalGaps) {
    requests.push("Common approach: rely on medical reports for injury classification");
  }

  // Common approach: resist downgrade until CCTV served
  if (snapshot.evidence.key_gaps.some(gap => gap.toLowerCase().includes("cctv"))) {
    requests.push("Common approach: resist charge reduction until CCTV disclosure served");
  }

  // Common approach: narrow issues at PTPH
  if (snapshot.posture.phase && snapshot.posture.phase >= 2) {
    requests.push("Common approach: narrow issues in dispute at PTPH");
  }

  // Common approach: seek early trial date if evidence strong
  const strongElements = offenceElements.filter(e => e.support === "strong");
  if (strongElements.length >= 2) {
    requests.push("Common approach: seek early trial date if evidence appears strong");
  }

  // Common approach: resist disclosure applications if materiality unclear
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    requests.push("Common approach: resist disclosure applications if materiality not clearly established");
  }

  return requests;
}

/**
 * Build weak spots for defence (where defence can pressure CPS)
 */
function buildWeakSpotsForDefence(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  routes: Array<{ id: string; status: string }>
): CPSPressureLens["weak_spots_for_defence"] {
  const spots: CPSPressureLens["weak_spots_for_defence"] = [];

  // Weak spot: missing key disclosure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    spots.push({
      spot: "Missing key required disclosure",
      exploit: "Pressure CPS on disclosure obligations and materiality; seek adverse inference if not served",
      anchors: buildTimelineAnchor(
        snapshot.disclosure.required_without_timeline.map(item => ({ item, action: "outstanding" }))
      ),
    });
  }

  // Weak spot: weak element support
  const weakElements = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  for (const element of weakElements.slice(0, 3)) {
    spots.push({
      spot: `${element.label} element has weak support`,
      exploit: `Challenge ${element.label.toLowerCase()} element; require prosecution to establish to required standard`,
      anchors: element.gaps.length > 0 ? buildGapAnchor(element.gaps) : undefined,
    });
  }

  // Weak spot: identification uncertainty
  if (snapshot.flags.id_uncertainty) {
    const idRoute = routes.find(r => r.id === "identification_challenge");
    if (idRoute && (idRoute.status === "viable" || idRoute.status === "risky")) {
      spots.push({
        spot: "Identification uncertainty and poor conditions",
        exploit: "Apply Turnbull principles; require prosecution to establish identification reliability",
        anchors: buildGapAnchor(["CCTV", "BWV", "Witness statements"]),
      });
    }
  }

  // Weak spot: weapon uncertainty
  if (snapshot.flags.weapon_uncertainty) {
    spots.push({
      spot: "Weapon presence/use unclear",
      exploit: "Challenge weapon inference; require clear evidence of weapon use and causation",
      anchors: buildGapAnchor(["Weapon recovery", "Forensic confirmation"]),
    });
  }

  // Weak spot: sequence missing
  if (snapshot.flags.sequence_missing) {
    spots.push({
      spot: "Sequence evidence missing",
      exploit: "Challenge sequence inference; require clear evidence of sustained/targeted conduct",
      anchors: buildGapAnchor(["CCTV showing sequence", "Witness statements on duration"]),
    });
  }

  // Limit to 6
  return spots.slice(0, 6);
}

/**
 * Build counter prep (5-8 Q/A prompts with safe replies)
 */
function buildCounterPrep(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  routes: Array<{ id: string; status: string }>
): CPSPressureLens["counter_prep"] {
  const prep: CPSPressureLens["counter_prep"] = [];
  const offenceCode = snapshot.offence.code || "";

  // Counter prep: intent pressure (s18)
  if (offenceCode.includes("s18") || offenceCode.includes("18")) {
    const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      prep.push({
        prompt: "If prosecution presses intent inference from injury severity, how do we respond safely?",
        safe_reply: "The defence position is that injury severity alone does not establish specific intent; prosecution must prove targeting, premeditation, or sustained conduct beyond the injury itself.",
        dependencies: intentElement.gaps.length > 0 ? intentElement.gaps.slice(0, 2) : undefined,
      });
    }
  }

  // Counter prep: identification pressure
  if (snapshot.flags.id_uncertainty) {
    prep.push({
      prompt: "If prosecution presses identification reliability despite conditions, how do we respond safely?",
      safe_reply: "The defence position is that identification evidence is insufficient given the conditions of observation and lack of corroboration; Turnbull principles require clear reliability factors.",
      dependencies: ["CCTV/BWV footage", "Witness statements", "Identification procedure"],
    });
  }

  // Counter prep: weapon inference
  if (snapshot.flags.weapon_uncertainty) {
    prep.push({
      prompt: "If prosecution presses weapon inference from medical mechanism, how do we respond safely?",
      safe_reply: "The defence position is that medical mechanism alone does not establish weapon use; prosecution must prove weapon presence, recovery, or clear forensic confirmation.",
      dependencies: ["Weapon recovery", "Forensic analysis", "Medical mechanism report"],
    });
  }

  // Counter prep: sequence inference
  if (snapshot.flags.sequence_missing) {
    prep.push({
      prompt: "If prosecution presses sequence inference from injury pattern, how do we respond safely?",
      safe_reply: "The defence position is that injury pattern alone does not establish sustained or targeted conduct; prosecution must prove sequence, duration, or targeting through direct evidence.",
      dependencies: ["CCTV showing sequence", "Witness statements on duration", "Medical evidence"],
    });
  }

  // Counter prep: disclosure pressure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    prep.push({
      prompt: "If prosecution resists disclosure application, how do we respond safely?",
      safe_reply: "The defence position is that outstanding disclosure is material to the issues in dispute; seek adverse inference if disclosure obligations are not met.",
      dependencies: snapshot.disclosure.required_without_timeline.slice(0, 2),
    });
  }

  // Counter prep: charge reduction resistance
  const viableRoutes = routes.filter(r => r.status === "viable");
  const hasChargeReductionRoute = viableRoutes.some(r =>
    r.id === "alternative_mental_state_offence" || r.id === "mitigation_early_resolution"
  );
  if (hasChargeReductionRoute) {
    prep.push({
      prompt: "If prosecution resists charge reduction, how do we respond safely?",
      safe_reply: "The defence position is that evidence does not support the higher charge; alternative mental state or lesser offence may be more appropriate based on current evidence.",
      dependencies: undefined,
    });
  }

  // Counter prep: medical evidence reliance
  const hasMedicalGaps = offenceElements.some(e =>
    e.gaps.some(gap => gap.toLowerCase().includes("medical") || gap.toLowerCase().includes("mechanism"))
  );
  if (hasMedicalGaps) {
    prep.push({
      prompt: "If prosecution relies heavily on medical reports, how do we respond safely?",
      safe_reply: "The defence position is that medical reports alone do not establish all elements; require prosecution to prove causation, mechanism, and classification through complete evidence.",
      dependencies: ["Medical report", "Expert evidence", "Causation evidence"],
    });
  }

  // Counter prep: early trial pressure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    prep.push({
      prompt: "If prosecution seeks early trial date, how do we respond safely?",
      safe_reply: "The defence position is that outstanding disclosure must be served and reviewed before trial can proceed fairly; seek adjournment if disclosure obligations are not met.",
      dependencies: snapshot.disclosure.required_without_timeline.slice(0, 2),
    });
  }

  // Limit to 8
  return prep.slice(0, 8);
}
