/**
 * Strategy Output Model - Defence Strategy Plan
 * 
 * Builds a hard fight plan with kill switches, pivot routes, and tactical moves.
 * All content is case-derived, evidence-linked, and non-predictive.
 */

import type { EvidenceSnapshot, EvidenceAnchor, ConditionalLogic } from "./types";
import { buildGapAnchor, buildTimelineAnchor } from "./anchors";
import { getOffenceWording } from "../offence-wording";
import { formatTimelineConflictLines } from "../timeline-extractor";

/**
 * Defence Strategy Plan
 * 
 * Practical, evidence-linked defence tactics for fighting the case.
 */
export type DefenceStrategyPlan = {
  /** Stage 5: One-line synthesis from existing outputs (no new reasoning). */
  strategy_line: string;
  /** Stage 5: 3–5 bullets: "If X: Y. Pivot to Z if needed." Frames system as responsive. */
  risks_fallbacks: string[];
  /** Stage 6: Attack order: "Primary attack: X. If not open or fails: Y. Then Z." */
  attack_sequence: string;
  posture: string; // 1 sentence
  primary_route: {
    id: string;
    label: string;
    rationale: string[];
    anchors?: EvidenceAnchor;
  };
  secondary_routes: Array<{
    id: string;
    label: string;
    purpose: string;
    triggers: ConditionalLogic[];
  }>;
  prosecution_pressure: string[]; // Short "pressure lines" (non-predictive, 4-6)
  defence_counters: Array<{
    point: string;
    safe_wording: string;
    anchors?: EvidenceAnchor;
    evidence_needed?: string[];
  }>;
  kill_switches: ConditionalLogic[]; // Plan breakers (3-6)
  pivot_plan: Array<{
    if_triggered: string;
    new_route: string;
    immediate_actions: string[];
  }>;
  next_72_hours: string[]; // Procedural + tactical tasks (max 8)
  /** Case-driven defence angles: what's weak or missing in this case (max 6). */
  defence_angles: string[];
  /** Hard-fight: one sentence – we are running [route]; put prosecution to proof on [weak elements]. */
  strategy_in_one_line: string;
  /** Hard-fight: burdens (element labels) where this case has weak/none support – prosecution still must prove. */
  prosecution_still_must_prove: string[];
  /** Hard-fight: 1–3 bullets – order to challenge evidence (main weak/gap, ID if disputed, next). */
  order_to_challenge: string[];
  /** Hard-fight: no-case / half-time line when arguable (2+ weak elements and critical disclosure outstanding); null otherwise. */
  no_case_line: string | null;
  /** Hard-fight: 2–3 bullets from kill switches – trial risks. */
  risks_if_we_fight: string[];
  /** Witness attack plan: 2–4 theme-based bullets (who to challenge and on what). */
  witness_attack_plan: string[];
  /** One sentence on disclosure leverage when disclosure is in attack order; null otherwise. */
  disclosure_leverage_line: string | null;
  /** Cross-examination themes: 2–4 bullets from defence angles + order to challenge (counsel-facing). */
  cross_examination_themes: string[];
  /** Witness timeline conflicts: SOURCE says/shows EVENT TIME – for cross-examination (all criminal cases). */
  witness_timeline_conflicts: string[];
  /** Fight stance: going for a win (acquittal/dismissal) vs damage limitation (reduction/mitigation). */
  strategy_stance: "fight_to_win" | "damage_limitation";
  /** Top 2–3 winning angles: prosecution pressure + kill switches when fighting to win (surfaced for quick scan). */
  winning_angles: string[];
  /** Offence-specific high-leverage fight angles (1–3) for "best way to fight" and plan. */
  offence_leverage_angles: string[];
  /** Disclosure as weapon: chase X then consider no case/abuse (2–3 steps). */
  disclosure_weapon_steps: string[];
  /** Case theory in one go: prosecution case / our case / best angle (one short paragraph). */
  case_theory_one_go: string;
  /** Risks and pivots in 2–3 short bullets for at-a-glance / Best way to fight. */
  risks_pivots_short: string[];
};

/**
 * Build Defence Strategy Plan
 * 
 * @param input - Case data input
 * @returns DefenceStrategyPlan
 */
export function buildDefenceStrategyPlan(input: {
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
    required_dependencies: string[];
  }>;
  recordedPosition?: string;
  /** V2: Seeds from Key Facts (e.g. defence angles to prepend when bundle says "client denies", "no CCTV"). */
  keyFactsSeeds?: { defenceAngles?: string[] };
  /** V2: Agreed case theory line (one sentence). When set, used in case_theory_one_go and strategy_in_one_line. */
  agreedCaseTheoryLine?: string | null;
}): DefenceStrategyPlan {
  const { snapshot, offenceElements, routes, recordedPosition, keyFactsSeeds, agreedCaseTheoryLine } = input;

  // Build posture
  const posture = buildPosture(snapshot, offenceElements);

  // Choose primary route
  const primary_route = choosePrimaryRoute(routes, snapshot, offenceElements);

  // Build secondary routes
  const secondary_routes = buildSecondaryRoutes(routes, primary_route.id);

  // Build prosecution pressure points
  const prosecution_pressure = buildProsecutionPressure(snapshot, offenceElements);

  // Build defence counters
  const defence_counters = buildDefenceCounters(offenceElements, snapshot);

  // Build kill switches
  const kill_switches = buildKillSwitches(snapshot, offenceElements, routes);

  // Build pivot plan
  const pivot_plan = buildPivotPlan(kill_switches, routes);

  // Build next 72 hours tasks
  const next_72_hours = buildNext72Hours(snapshot, routes);

  // Stage 5: Strategy one-liner (synthesis only) and risks & fallbacks
  const strategy_line = buildStrategyLine(posture, primary_route);
  const risks_fallbacks = buildRisksFallbacks(kill_switches, pivot_plan);

  // Stage 6: Attack sequence (primary / if fails / then)
  const attack_sequence = buildAttackSequence(primary_route, secondary_routes, pivot_plan);

  // Key defence angles: case-driven from weak elements and disclosure gaps; V2: prepend Key Facts seeds when provided
  const builtAngles = buildDefenceAngles(snapshot, offenceElements);
  const seedAngles = keyFactsSeeds?.defenceAngles?.length ? keyFactsSeeds.defenceAngles : [];
  const defence_angles = seedAngles.length > 0 ? [...seedAngles, ...builtAngles].slice(0, 6) : builtAngles;

  // Hard-fight blocks (all case-driven, same logic for every offence)
  const strategy_in_one_line = buildStrategyInOneLine(primary_route, offenceElements);
  const prosecution_still_must_prove = buildProsecutionStillMustProve(offenceElements);
  const order_to_challenge = buildOrderToChallenge(snapshot, offenceElements);
  const no_case_line = buildNoCaseLine(snapshot, offenceElements);
  const risks_if_we_fight = buildRisksIfWeFight(kill_switches);
  const witness_attack_plan = buildWitnessAttackPlan(snapshot, offenceElements);
  const disclosure_leverage_line = buildDisclosureLeverageLine(snapshot, primary_route, secondary_routes);
  const cross_examination_themes = buildCrossExaminationThemes(defence_angles, order_to_challenge);
  const witness_timeline_conflicts = buildWitnessTimelineConflicts(snapshot);

  // Next 72 hours: add fight-specific line when primary route is a fight route
  const next_72_hours_with_fight = addFightSpecificNextAction(
    next_72_hours,
    primary_route,
    offenceElements,
    snapshot
  );

  // Fight stance: going for a win vs damage limitation (surfaced in UI)
  const fightRouteIds = ["act_denial", "identification_challenge", "intent_denial", "self_defence", "weapon_uncertainty_causation", "alternative_mental_state_offence"];
  const strategy_stance: "fight_to_win" | "damage_limitation" =
    fightRouteIds.includes(primary_route.id) ? "fight_to_win" : "damage_limitation";

  // Winning angles: top prosecution pressure + kill switches when fighting to win (quick scan)
  const winning_angles: string[] = [];
  if (strategy_stance === "fight_to_win") {
    winning_angles.push(...prosecution_pressure.slice(0, 2));
    for (const ks of kill_switches.slice(0, 2)) {
      winning_angles.push(`If ${ks.if}: ${ks.then}`);
    }
  } else {
    winning_angles.push(...prosecution_pressure.slice(0, 3));
  }

  const offence_leverage_angles = buildOffenceLeverageAngles(snapshot, offenceElements, primary_route);
  const disclosure_weapon_steps = buildDisclosureWeaponSteps(snapshot, offenceElements, no_case_line);
  const case_theory_one_go =
    agreedCaseTheoryLine?.trim()
      ? agreedCaseTheoryLine.trim()
      : buildCaseTheoryOneGo(snapshot, posture, primary_route, prosecution_still_must_prove, defence_angles);
  const strategy_in_one_line_final =
    agreedCaseTheoryLine?.trim()
      ? agreedCaseTheoryLine.trim()
      : strategy_in_one_line;
  const risks_pivots_short = buildRisksPivotsShort(risks_fallbacks, pivot_plan);

  return {
    strategy_line,
    risks_fallbacks,
    attack_sequence,
    posture,
    primary_route,
    secondary_routes,
    prosecution_pressure,
    defence_counters,
    kill_switches,
    pivot_plan,
    next_72_hours: next_72_hours_with_fight,
    defence_angles,
    strategy_in_one_line: strategy_in_one_line_final,
    prosecution_still_must_prove,
    order_to_challenge,
    no_case_line,
    risks_if_we_fight,
    witness_attack_plan,
    disclosure_leverage_line,
    cross_examination_themes,
    witness_timeline_conflicts,
    strategy_stance,
    winning_angles: winning_angles.slice(0, 5),
    offence_leverage_angles,
    disclosure_weapon_steps,
    case_theory_one_go,
    risks_pivots_short,
  };
}

/**
 * Build posture from offence + disputed elements + evidence snapshot
 */
function buildPosture(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string {
  const parts: string[] = [];

  // Offence context
  const offenceLabel = snapshot.offence.label || "criminal offence";
  parts.push(offenceLabel);

  // Top disputed element
  const disputedElements = offenceElements.filter(
    e => e.support === "weak" || e.support === "none"
  );
  if (disputedElements.length > 0) {
    const topDisputed = disputedElements[0];
    parts.push(`disputing ${topDisputed.label.toLowerCase()}`);
  }

  // Key missing evidence flag
  if (snapshot.flags.sequence_missing) {
    parts.push("pending sequence evidence");
  } else if (snapshot.flags.id_uncertainty) {
    parts.push("pending identification clarity");
  } else if (snapshot.evidence.key_gaps.length > 0) {
    parts.push("pending key disclosure");
  } else if (snapshot.disclosure.required_without_timeline.length > 0) {
    parts.push("pending required disclosure");
  }

  return parts.length > 0
    ? `Defence posture: ${parts.join(", ")}.`
    : "Defence posture: case under review.";
}

/**
 * Offence-specific short angle phrase for a weak element (no generic "Evidence does not establish X").
 * Returns null if no phrase defined; caller can fall back to short label-based line.
 */
function getOffenceAnglePhrase(offenceCode: string, elementId: string): string | null {
  const code = offenceCode.toLowerCase();
  if (code.includes("criminal_damage") || code.includes("arson")) {
    const map: Record<string, string> = {
      property_belonging_to_another: "Ownership / property in issue",
      damage_by_fire: "Who caused the damage / started the fire not established",
      intent_or_recklessness: "Intent or recklessness as to damage not established",
      lawful_excuse: "Lawful excuse in issue",
      identification: "Identification in dispute",
      actus_reus: "Who caused the damage / started the fire not established",
      mental_state: "Intent or recklessness as to damage not established",
      causation: "Ignition source / mechanism not established",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("agg_criminal_damage")) {
    const map: Record<string, string> = {
      damage: "Who caused the damage not established",
      intent_or_recklessness: "Intent or recklessness not established",
      endangerment: "Endangerment of life not established",
      identification: "Identification in dispute",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("s18") || code.includes("s20") || code.includes("oapa")) {
    const map: Record<string, string> = {
      injury_threshold: "Injury threshold / causation not established",
      causation: "Causation between act and injury not established",
      unlawfulness: "Unlawfulness in issue",
      identification: "Identification in dispute",
      specific_intent: "Intent to cause serious harm not established",
      recklessness: "Recklessness not established",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("s47")) {
    const map: Record<string, string> = {
      assault_or_battery: "Assault or battery not established",
      actual_bodily_harm: "ABH and causation not established",
      causation: "Causation between act and harm not established",
      identification: "Identification in dispute",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("common_assault")) {
    const map: Record<string, string> = {
      assault_or_battery: "Assault or battery not established",
      identification: "Identification in dispute",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("theft")) {
    const map: Record<string, string> = {
      appropriation: "Appropriation not established",
      dishonesty: "Dishonesty or intention to permanently deprive in issue",
      identification: "Identification in dispute",
    };
    return map[elementId] ?? null;
  }
  if (code.includes("fraud")) {
    const map: Record<string, string> = {
      dishonesty: "Dishonesty in issue",
      representation_or_disclosure_or_abuse: "False representation / failure to disclose in issue",
      gain_or_loss: "Gain or loss not established",
      identification: "Identification in dispute",
    };
    return map[elementId] ?? null;
  }
  if (elementId === "identification") return "Identification in dispute";
  return null;
}

/**
 * Build key defence angles: gap-led and disclosure-led first, then ID, then concrete element-based phrases.
 * No generic "Evidence does not establish X to the required standard". Max 6. Deduped.
 */
function buildDefenceAngles(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string; gaps?: string[] }>
): string[] {
  const angles: string[] = [];
  const code = (snapshot.offence?.code ?? "").toLowerCase();
  const keyGaps = snapshot.evidence?.key_gaps ?? [];
  const requiredMissing = snapshot.disclosure?.required_without_timeline ?? [];
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");

  // 1) Gaps and disclosure first (concrete, tactical)
  if (keyGaps.some(g => /cctv|footage|video/i.test(g))) {
    angles.push("No CCTV to confirm or exclude defendant's presence or conduct");
  }
  if ((code.includes("criminal_damage") || code.includes("arson")) && keyGaps.some(g => /fire|ignition|cause|origin/i.test(g))) {
    angles.push("No ignition source or cause of fire established");
  }
  if (requiredMissing.length > 0) {
    const sample = requiredMissing.slice(0, 2).join(", ");
    angles.push(sample.length > 40 ? "Key disclosure outstanding" : `Outstanding disclosure: ${sample}`);
  }

  // 2) Identification
  if (snapshot.flags?.id_uncertainty) {
    angles.push("Identification in dispute");
  }

  // 3) Weak elements: offence-specific phrase or short fallback (no long generic line)
  for (const e of weak) {
    if (angles.length >= 6) break;
    const phrase = getOffenceAnglePhrase(code, e.id);
    const line = phrase ?? `${e.label} not established`;
    if (!angles.includes(line)) angles.push(line);
  }

  // 4) One offence-specific "general" angle where it adds value (e.g. lawful excuse for CD/arson)
  if (angles.length < 6 && (code.includes("criminal_damage") || code.includes("arson")) && weak.some(e => e.id === "intent_or_recklessness" || e.id === "damage_by_fire")) {
    const line = "Lawful excuse in issue";
    if (!angles.includes(line)) angles.push(line);
  }

  return angles.slice(0, 6);
}

/**
 * Hard-fight: one sentence – we are running [primary route]; put prosecution to proof on [weakest 1–2 elements].
 */
function buildStrategyInOneLine(
  primary_route: DefenceStrategyPlan["primary_route"],
  offenceElements: Array<{ id: string; label: string; support: string }>
): string {
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const weakLabels = weak.slice(0, 2).map(e => e.label);
  const proofPart = weakLabels.length > 0
    ? ` Put prosecution to proof on ${weakLabels.join(" and ")}.`
    : "";
  return `We are running: ${primary_route.label}.${proofPart}`;
}

/**
 * Hard-fight: list of burdens (element labels) where this case has weak or none support – prosecution still must prove.
 */
function buildProsecutionStillMustProve(
  offenceElements: Array<{ id: string; label: string; support: string }>
): string[] {
  return offenceElements
    .filter(e => e.support === "weak" || e.support === "none")
    .map(e => e.label);
}

/**
 * Hard-fight: 1–3 bullets – order to challenge evidence (main weak element or gap, ID if disputed, next).
 */
function buildOrderToChallenge(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string[] {
  const bullets: string[] = [];
  const keyGaps = snapshot.evidence?.key_gaps ?? [];
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");

  if (weak.length > 0) {
    bullets.push(`Challenge ${weak[0].label} – weak or no support in current evidence`);
  }
  if (snapshot.flags?.id_uncertainty && !bullets.some(b => /identification|ID/i.test(b))) {
    bullets.push("Identification in dispute – challenge ID evidence");
  }
  if (keyGaps.length > 0 && bullets.length < 3) {
    const gap = keyGaps[0];
    bullets.push(`Obtain or challenge gap: ${gap}`);
  } else if (weak.length > 1 && bullets.length < 3) {
    bullets.push(`Challenge ${weak[1].label} – weak or no support`);
  }
  return bullets.slice(0, 3);
}

/**
 * Hard-fight: no-case / half-time line when arguable (2+ elements weak/none and critical disclosure outstanding).
 */
function buildNoCaseLine(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string | null {
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const outstanding = snapshot.disclosure?.required_without_timeline ?? [];
  if (weak.length < 2 || outstanding.length === 0) return null;
  const weakestLabel = weak[0]?.label ?? "key element";
  const mainGap = outstanding[0] ?? "key disclosure";
  return `No case to answer / half-time submission may be open on ${weakestLabel} if ${mainGap} does not strengthen the prosecution case.`;
}

/**
 * Hard-fight: 2–3 bullets from kill switches – risks if we fight.
 */
function buildRisksIfWeFight(kill_switches: ConditionalLogic[]): string[] {
  return kill_switches.slice(0, 3).map(k => `If ${k.if}: ${k.then}`);
}

/**
 * When primary route is a fight route, add one explicit fight-specific next action.
 */
function addFightSpecificNextAction(
  next_72_hours: string[],
  primary_route: DefenceStrategyPlan["primary_route"],
  offenceElements: Array<{ id: string; label: string; support: string }>,
  snapshot: EvidenceSnapshot
): string[] {
  const fightRouteIds = ["act_denial", "identification_challenge", "intent_denial"];
  if (!fightRouteIds.includes(primary_route.id)) return next_72_hours;
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const outstanding = snapshot.disclosure?.required_without_timeline ?? [];
  const fightLine = weak.length > 0 && outstanding.length > 0
    ? `Draft no-case note on ${weak[0].label}; chase ${outstanding[0]}`
    : weak.length > 0
      ? `Draft no-case note on ${weak[0].label} if disclosure does not strengthen`
      : outstanding.length > 0
        ? `Chase critical disclosure: ${outstanding[0]}`
        : "Identify and document challenge points for trial";
  const hasFightLine = next_72_hours.some(t => /no-case|chase.*disclosure|challenge points/i.test(t));
  if (hasFightLine) return next_72_hours;
  return [fightLine, ...next_72_hours].slice(0, 8);
}

/**
 * Witness attack plan: 2–4 theme-based bullets (who to challenge and on what), case-driven from weak elements and ID.
 */
function buildWitnessAttackPlan(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string[] {
  const bullets: string[] = [];
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const code = (snapshot.offence?.code ?? "").toLowerCase();

  if (snapshot.flags?.id_uncertainty) {
    bullets.push("Identification witnesses: challenge any purported ID – no direct recognition / circumstantial only");
  }
  const actElement = weak.find(e => /actus|act_|damage|fire|causation/i.test(e.id) || e.label.toLowerCase().includes("actus") || e.label.toLowerCase().includes("causation"));
  if (actElement) {
    bullets.push(`Causation / act witnesses: challenge evidence of who did the act – ${actElement.label} not established`);
  }
  const intentElement = weak.find(e => /intent|mental|recklessness/i.test(e.id) || e.label.toLowerCase().includes("intent") || e.label.toLowerCase().includes("mental"));
  if (intentElement && !bullets.some(b => /intent|mental/i.test(b))) {
    bullets.push(`Intent / state of mind: challenge inference from conduct – ${intentElement.label} in issue`);
  }
  if (code.includes("criminal_damage") || code.includes("arson")) {
    if (!bullets.some(b => /origin|ignition|fire|who started/i.test(b))) {
      bullets.push("Origin / ignition: challenge evidence of who started fire – no witness to ignition");
    }
  }
  return bullets.slice(0, 4);
}

/**
 * One sentence on disclosure leverage when procedural disclosure is in the attack order.
 */
function buildDisclosureLeverageLine(
  snapshot: EvidenceSnapshot,
  primary_route: DefenceStrategyPlan["primary_route"],
  secondary_routes: DefenceStrategyPlan["secondary_routes"]
): string | null {
  const disclosureRouteIds = ["procedural_disclosure_leverage"];
  const isPrimary = disclosureRouteIds.includes(primary_route.id);
  const isSecondary = secondary_routes.some(r => disclosureRouteIds.includes(r.id));
  if (!isPrimary && !isSecondary) return null;
  const outstanding = snapshot.disclosure?.required_without_timeline ?? [];
  const sample = outstanding.slice(0, 3).join(", ");
  return `Use outstanding disclosure (${sample || "key items"}) for procedural pressure; seek directions and adverse inference or stay if obligations not met.`;
}

/**
 * Cross-examination themes: 2–4 bullets from defence angles + order to challenge (counsel-facing label).
 */
function buildCrossExaminationThemes(defence_angles: string[], order_to_challenge: string[]): string[] {
  const combined = [...defence_angles, ...order_to_challenge];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of combined) {
    const norm = line.slice(0, 80);
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(line);
    if (out.length >= 4) break;
  }
  return out.slice(0, 4);
}

/**
 * Witness timeline conflicts: format timeline_entries as "SOURCE says/shows EVENT TIME" for cross-examination.
 * Case-driven from snapshot; works for every criminal case (arson, assault, ID, etc.).
 */
function buildWitnessTimelineConflicts(snapshot: EvidenceSnapshot): string[] {
  const entries = snapshot.timeline_entries ?? [];
  if (entries.length === 0) return [];
  return formatTimelineConflictLines(entries);
}

/**
 * Offence-specific high-leverage fight angles (1–3) – sharpen "best way to fight".
 */
function buildOffenceLeverageAngles(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>,
  primary_route: DefenceStrategyPlan["primary_route"]
): string[] {
  const code = (snapshot.offence?.code ?? "").toLowerCase();
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const angles: string[] = [];

  if (code.includes("criminal_damage") || code.includes("arson")) {
    if (weak.some(e => /lawful_excuse|intent_or_recklessness/i.test(e.id))) angles.push("Lawful excuse – put prosecution to proof on intent/recklessness");
    if (weak.some(e => /damage|fire|causation/i.test(e.id))) angles.push("Causation / who started fire – no direct evidence; challenge origin and mechanism");
    if (snapshot.flags?.id_uncertainty) angles.push("Identification – challenge ID; no recognition / circumstantial only");
  } else if (code.includes("oapa") || code.includes("s18") || code.includes("s20") || code.includes("s47")) {
    if (weak.some(e => /intent|specific_intent|recklessness/i.test(e.id))) angles.push("Intent / recklessness – challenge inference from conduct; put prosecution to proof");
    if (weak.some(e => /causation|injury|actus/i.test(e.id))) angles.push("Act and causation – challenge sequence and mechanism");
    if (snapshot.flags?.id_uncertainty) angles.push("Identification – Turnbull; challenge ID evidence");
  } else if (code.includes("theft") || code.includes("burglary") || code.includes("robbery")) {
    if (weak.some(e => /dishonesty|appropriation|intention/i.test(e.id))) angles.push("Dishonesty / intention – put prosecution to proof");
    if (snapshot.flags?.id_uncertainty) angles.push("Identification – challenge ID");
  }

  if (angles.length === 0 && weak.length > 0) {
    angles.push(`Put prosecution to proof on ${weak[0].label}`);
    if (weak.length > 1) angles.push(weak[1].label + " – weak or no support");
  }
  return angles.slice(0, 3);
}

/**
 * Disclosure as weapon: chase X then consider no case / abuse (2–3 steps).
 */
function buildDisclosureWeaponSteps(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>,
  no_case_line: string | null
): string[] {
  const outstanding = snapshot.disclosure?.required_without_timeline ?? [];
  const weak = offenceElements.filter(e => e.support === "weak" || e.support === "none");
  const steps: string[] = [];
  if (outstanding.length === 0) return steps;
  const chaseList = outstanding.slice(0, 3).join(", ");
  steps.push(`Chase disclosure: ${chaseList}.`);
  if (weak.length >= 2 && no_case_line) {
    steps.push(`If not served by next hearing, consider no-case submission on ${weak[0]?.label ?? "key element"} if disclosure does not strengthen prosecution case.`);
  } else if (outstanding.length > 0) {
    steps.push("If disclosure not provided, seek directions and adverse inference or stay if CPIA obligations not met.");
  }
  return steps.slice(0, 3);
}

/**
 * Case theory in one go: prosecution case / our case / best angle (one short paragraph).
 */
function buildCaseTheoryOneGo(
  snapshot: EvidenceSnapshot,
  posture: string,
  primary_route: DefenceStrategyPlan["primary_route"],
  prosecution_still_must_prove: string[],
  defence_angles: string[]
): string {
  const offenceLabel = snapshot.offence?.label ?? "the offence";
  const prosecutionBrief = prosecution_still_must_prove.length > 0
    ? `Prosecution must prove ${prosecution_still_must_prove.slice(0, 2).join(" and ")}.`
    : "Prosecution must prove all elements beyond reasonable doubt.";
  const ourCase = posture.replace(/^Defence posture: /i, "").trim() || `We are running ${primary_route.label}.`;
  const bestAngle = defence_angles[0] ?? primary_route.label;
  return `${prosecutionBrief} Our case: ${ourCase} Best angle: ${bestAngle}.`;
}

/**
 * Risks and pivots in 2–3 short bullets for at-a-glance / Best way to fight.
 */
function buildRisksPivotsShort(
  risks_fallbacks: string[],
  pivot_plan: DefenceStrategyPlan["pivot_plan"]
): string[] {
  const out: string[] = [];
  for (const r of risks_fallbacks.slice(0, 2)) {
    out.push(r.length > 100 ? r.slice(0, 97) + "…" : r);
  }
  if (out.length < 3 && pivot_plan.length > 0) {
    const p = pivot_plan[0];
    out.push(`Pivot: if ${p.if_triggered} → ${p.new_route}`);
  }
  return out.slice(0, 3);
}

/**
 * Which offence element IDs each route "attacks" – weak prosecution evidence on these helps that route.
 * Used to rank routes by evidence strength (prefer route with most weak/none on its target elements).
 */
const ROUTE_TARGET_ELEMENTS: Record<string, string[]> = {
  act_denial: ["causation", "actus_reus", "damage", "damage_by_fire", "property_damage", "destruction"],
  identification_challenge: ["identification"],
  intent_denial: ["specific_intent", "intent", "mens_rea", "recklessness", "mental_state", "intent_or_recklessness"],
  weapon_uncertainty_causation: ["causation", "weapon", "instrument"],
  self_defence: ["unlawfulness", "lawful_excuse", "self_defence"],
  alternative_mental_state_offence: ["specific_intent", "intent", "mens_rea", "recklessness", "intent_or_recklessness"],
  procedural_disclosure_leverage: [], // disclosure-focused, not element-focused
  mitigation_early_resolution: [],   // damage limitation
};

/**
 * Score a route by how many weak/none prosecution elements it targets (higher = better fit for evidence).
 */
function scoreRouteByEvidence(
  routeId: string,
  offenceElements: Array<{ id: string; support: string }>
): number {
  const targetIds = ROUTE_TARGET_ELEMENTS[routeId];
  if (!targetIds?.length) return 0;
  let score = 0;
  for (const el of offenceElements) {
    if ((el.support === "weak" || el.support === "none") && targetIds.some(t => el.id.includes(t) || t.includes(el.id)))
      score += el.support === "none" ? 2 : 1;
  }
  return score;
}

/**
 * Choose primary route: evidence-driven (prefer route that targets most weak/none elements), then best viable, else best risky.
 */
function choosePrimaryRoute(
  routes: Array<{ id: string; status: string; reasons: string[] }>,
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; support: string; gaps: string[] }>
): DefenceStrategyPlan["primary_route"] {
  const pick = (list: typeof routes) => {
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => scoreRouteByEvidence(b.id, offenceElements) - scoreRouteByEvidence(a.id, offenceElements));
    const best = sorted[0];
    const gaps = offenceElements.flatMap(e => e.gaps);
    return {
      id: best.id,
      label: formatRouteLabel(best.id),
      rationale: best.reasons.slice(0, 3),
      anchors: gaps.length > 0 ? buildGapAnchor(gaps) : undefined,
    };
  };

  const viableRoutes = routes.filter(r => r.status === "viable");
  const chosen = pick(viableRoutes);
  if (chosen) return chosen;

  const riskyRoutes = routes.filter(r => r.status === "risky");
  const chosenRisky = pick(riskyRoutes);
  if (chosenRisky) return chosenRisky;

  const firstRoute = routes[0] || { id: "procedural_disclosure_leverage", reasons: [] };
  return {
    id: firstRoute.id,
    label: formatRouteLabel(firstRoute.id),
    rationale: firstRoute.reasons.slice(0, 3),
  };
}

/**
 * Build secondary routes
 */
function buildSecondaryRoutes(
  routes: Array<{ id: string; status: string; reasons: string[] }>,
  primaryRouteId: string
): DefenceStrategyPlan["secondary_routes"] {
  const secondary: DefenceStrategyPlan["secondary_routes"] = [];

  // Get routes that aren't the primary
  const otherRoutes = routes.filter(r => r.id !== primaryRouteId);

  for (const route of otherRoutes.slice(0, 3)) {
    // Build purpose from route status and reasons
    const purpose = route.status === "viable"
      ? `Alternative viable route if primary route blocked`
      : route.status === "risky"
      ? `Fallback route if primary route becomes blocked`
      : `Reserve route if evidence changes`;

    // Build triggers from route reasons
    const triggers: ConditionalLogic[] = route.reasons.slice(0, 2).map(reason => ({
      if: reason,
      then: `${formatRouteLabel(route.id)} becomes viable`,
      severity: route.status === "viable" ? "high" : route.status === "risky" ? "medium" : "low",
    }));

    secondary.push({
      id: route.id,
      label: formatRouteLabel(route.id),
      purpose,
      triggers,
    });
  }

  return secondary;
}

/**
 * Build prosecution pressure points (4-6, non-predictive)
 */
function buildProsecutionPressure(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>
): string[] {
  const pressure: string[] = [];
  const offenceCode = snapshot.offence.code || "";

  const wording = getOffenceWording(offenceCode as import("../offence-elements").OffenceCode);
  if (wording?.pressure?.length) {
    pressure.push(...wording.pressure);
  } else {
    pressure.push("Pressure point: prosecution must prove all elements of the offence beyond reasonable doubt");
  }
  if (snapshot.evidence.key_gaps.some(g => /fire|ignition|damage|cctv/i.test(g)) && (offenceCode.includes("criminal_damage") || offenceCode.includes("arson"))) {
    pressure.push("Pressure point: outstanding disclosure (e.g. fire report, CCTV) may strengthen causation");
  }

  // Common pressure points based on elements
  const idElement = offenceElements.find(e => e.id === "identification");
  if (idElement && (idElement.support === "weak" || idElement.support === "none")) {
    pressure.push("Pressure point: identification consistency despite conditions");
  } else if (!snapshot.flags.id_uncertainty) {
    pressure.push("Pressure point: identification reliability despite defence challenge");
  }

  // Pressure based on evidence gaps
  if (snapshot.evidence.key_gaps.length > 0) {
    pressure.push(`Pressure point: missing evidence may support prosecution case`);
  }

  // Pressure based on disclosure
  if (snapshot.disclosure.required_without_timeline.length > 0) {
    pressure.push("Pressure point: outstanding disclosure may strengthen prosecution case");
  }

  // Limit to 6
  return pressure.slice(0, 6);
}

/**
 * Build defence counters (4-6) with safe wording. Stage 6: case- and evidence-specific (e.g. s18 specific intent, CCTV gap).
 */
function buildDefenceCounters(
  offenceElements: Array<{ id: string; label: string; support: string; gaps: string[] }>,
  snapshot: EvidenceSnapshot
): DefenceStrategyPlan["defence_counters"] {
  const counters: DefenceStrategyPlan["defence_counters"] = [];
  const offenceCode = snapshot.offence?.code ?? "";
  const keyGaps = snapshot.evidence?.key_gaps ?? [];

  // Counter for each disputed element — reference charge/evidence where possible
  const disputedElements = offenceElements.filter(
    e => e.support === "weak" || e.support === "none"
  );

  const isCDArson = offenceCode.includes("criminal_damage") || offenceCode.includes("arson");

  for (const element of disputedElements.slice(0, 4)) {
    const elLower = element.label.toLowerCase();
    const point =
      isCDArson && (element.id === "damage" || element.id === "causation" || element.id === "actus")
        ? "Counter to causation / defendant caused damage or fire"
        : isCDArson && (element.id === "intent" || element.id === "recklessness")
        ? "Counter to intent or recklessness as to damage / danger to life"
        : offenceCode.includes("s18") && (element.id === "specific_intent" || element.id === "intent")
        ? "Counter to s18 specific intent"
        : offenceCode.includes("s20") && (element.id === "recklessness" || element.id === "mental_state")
        ? "Counter to s20 recklessness element"
        : offenceCode === "theft" && (element.id === "dishonesty" || element.id === "appropriation" || element.id === "intention_to_permanently_deprive")
        ? `Counter to theft: ${elLower}`
        : offenceCode === "burglary" && (element.id === "entry" || element.id === "intent_or_ulterior")
        ? `Counter to burglary: ${elLower}`
        : offenceCode === "robbery" && (element.id === "theft" || element.id === "force_or_threat" || element.id === "timing")
        ? `Counter to robbery: ${elLower}`
        : offenceCode === "fraud" && (element.id === "dishonesty" || element.id === "representation_or_disclosure_or_abuse" || element.id === "gain_or_loss")
        ? `Counter to fraud: ${elLower}`
        : offenceCode === "s47_oapa" && (element.id === "assault_or_battery" || element.id === "actual_bodily_harm" || element.id === "causation")
        ? `Counter to ABH: ${elLower}`
        : offenceCode === "common_assault" && element.id === "assault_or_battery"
        ? "Counter to assault or battery"
        : `Counter to ${elLower} element`;
    const safe_wording =
      element.gaps.length > 0
        ? `The defence position is that the evidence does not establish ${elLower} to the required standard; ${element.gaps[0]} is in issue.`
        : `The defence position is that the evidence does not establish ${elLower} to the required standard.`;

    const counter: DefenceStrategyPlan["defence_counters"][0] = {
      point,
      safe_wording,
      evidence_needed: element.gaps.length > 0 ? element.gaps.slice(0, 3) : undefined,
    };

    if (element.gaps.length > 0) {
      counter.anchors = buildGapAnchor(element.gaps);
    }

    counters.push(counter);
  }

  if (isCDArson) {
    counters.push({
      point: "Counter to causation (who caused damage / started fire)",
      safe_wording: "The defence position is that the evidence does not establish that the defendant caused the damage or started the fire; lawful excuse and intent/recklessness are in issue where relevant.",
      evidence_needed: ["CCTV/evidence of who acted", "Fire report / ignition evidence", "Witness to deliberate act"],
    });
  }

  // Counter for identification uncertainty — Turnbull / evidence gap
  if (snapshot.flags.id_uncertainty) {
    const idGap = keyGaps.find(g => /cctv|bwv|identification|viper/i.test(g)) || "CCTV/BWV";
    counters.push({
      point: "Counter to identification pressure (Turnbull)",
      safe_wording: `The defence position is that the identification evidence is insufficient given the conditions of observation and lack of corroboration. ${idGap} gap affects reliability.`,
      anchors: buildGapAnchor(["CCTV", "BWV", "Witness statements"]),
    });
  }

  // Counter for weapon uncertainty — OAPA/GBH only; CD/Arson uses damage/ignition counter above
  const isOapa = offenceCode.includes("s18") || offenceCode.includes("s20") || offenceCode.includes("oapa");
  if (!isCDArson && isOapa && snapshot.flags.weapon_uncertainty) {
    counters.push({
      point: "Counter to weapon / causation inference",
      safe_wording: "The defence position is that the evidence does not clearly establish weapon use or the precise mechanism of injury.",
      evidence_needed: ["Weapon recovery", "Forensic confirmation", "Witness statements on weapon"],
    });
  }

  return counters.slice(0, 6);
}

/**
 * Build kill switches (3-6 conditional logic breakers).
 * Offence-specific: CD/Arson uses fire/damage/valuation triggers; GBH uses intent/weapon/sequence.
 */
function buildKillSwitches(
  snapshot: EvidenceSnapshot,
  offenceElements: Array<{ id: string; label: string; support: string }>,
  routes: Array<{ id: string; status: string }>
): ConditionalLogic[] {
  const killSwitches: ConditionalLogic[] = [];
  const offenceCode = snapshot.offence?.code ?? "";

  const wording = getOffenceWording(offenceCode as import("../offence-elements").OffenceCode);
  if (wording?.killSwitches?.length) {
    for (const k of wording.killSwitches) {
      killSwitches.push({
        if: k.if,
        then: k.then,
        evidence_needed: k.evidence_needed,
        severity: "high",
      });
    }
  } else {
    killSwitches.push({
      if: "Key evidence arrives that clearly establishes defendant's act and causation",
      then: "Act denial or causation challenge becomes harder; review route viability",
      evidence_needed: ["CCTV or scene evidence", "Witness statements", "Forensic or documentary evidence"],
      severity: "high",
    });
  }

  // OAPA: add sequence/weapon/intent kill switches from evidence context
  const isOapa = offenceCode.includes("s18") || offenceCode.includes("s20") || offenceCode.includes("oapa");
  if (isOapa) {
    const seqGap = snapshot.evidence?.key_gaps?.find(g => /cctv|sequence|timing/i.test(g)) ?? "CCTV/sequence evidence";
    if (snapshot.flags.sequence_missing) {
      killSwitches.push({
        if: `If ${seqGap} or disclosure shows sustained or targeted attack`,
        then: "Intent denial route becomes harder; pivot to charge reduction or outcome control",
        evidence_needed: ["CCTV showing sequence", "Witness statements on duration", "Medical evidence of multiple injuries"],
        severity: "high",
      });
    }
    const weaponElement = offenceElements.find(e => e.id.includes("weapon") || e.id.includes("causation"));
    if (weaponElement && (weaponElement.support === "weak" || weaponElement.support === "none")) {
      killSwitches.push({
        if: "Medical mechanism evidence supports deliberate weapon use",
        then: "Weapon uncertainty leverage reduces; consider basis control or charge reduction",
        evidence_needed: ["Medical report on mechanism", "Forensic weapon analysis", "Scene photographs"],
        severity: "high",
      });
    }
    const intentElement = offenceElements.find(e => e.id === "specific_intent" || e.id === "intent");
    if (intentElement && (intentElement.support === "weak" || intentElement.support === "none")) {
      const intentRoute = routes.find(r => r.id === "intent_denial");
      if (intentRoute && (intentRoute.status === "viable" || intentRoute.status === "risky")) {
        killSwitches.push({
          if: "Evidence arrives showing targeting, premeditation, or sustained violence",
          then: "Intent denial route becomes harder; pivot to alternative mental state or outcome control",
          evidence_needed: ["CCTV showing sequence", "Witness statements on targeting", "Defendant statements"],
          severity: "medium",
        });
      }
    }
  }

  // CD/Arson: add disclosure/id kill switches if not already from wording
  if ((offenceCode.includes("criminal_damage") || offenceCode.includes("arson")) && snapshot.disclosure?.required_without_timeline?.length) {
    const requiredDocs = snapshot.disclosure.required_without_timeline;
    killSwitches.push({
      if: `If ${requiredDocs[0]} is served and shows defendant caused damage or started fire`,
      then: "Review route viability; disclosure leverage or act denial may become blocked",
      evidence_needed: requiredDocs.slice(0, 3),
      severity: "medium",
    });
  }
  if (snapshot.flags.id_uncertainty && (offenceCode.includes("criminal_damage") || offenceCode.includes("arson"))) {
    killSwitches.push({
      if: "Clear identification evidence arrives (CCTV/BWV placing defendant at scene)",
      then: "Identification challenge becomes harder; act denial may still be viable on causation",
      evidence_needed: ["CCTV", "BWV", "Witness statements"],
      severity: "medium",
    });
  }

  if (snapshot.flags.id_uncertainty) {
    const idRoute = routes.find(r => r.id === "identification_challenge");
    if (idRoute && (idRoute.status === "viable" || idRoute.status === "risky")) {
      killSwitches.push({
        if: "Clear identification evidence arrives (CCTV/BWV showing clear identification)",
        then: "Identification challenge route becomes significantly harder",
        evidence_needed: ["Clear CCTV footage", "BWV of identification", "Corroborating witness statements"],
        severity: "high",
      });
    }
  }

  const requiredDocs = snapshot.disclosure?.required_without_timeline ?? [];
  if (requiredDocs.length > 0) {
    const docName = requiredDocs[0];
    killSwitches.push({
      if: `If ${docName} is served and shows material that strengthens the prosecution case`,
      then: "Review route viability; disclosure leverage route may become blocked",
      evidence_needed: requiredDocs.slice(0, 3),
      severity: "medium",
    });
  }

  if (snapshot.flags.date_conflicts) {
    killSwitches.push({
      if: "Date/time conflicts resolved with continuity evidence",
      then: "Procedural leverage may reduce; review route viability",
      evidence_needed: ["CCTV continuity logs", "Witness statements on timing", "CAD logs"],
      severity: "low",
    });
  }

  return killSwitches.slice(0, 6);
}

/**
 * Build pivot plan for each kill switch
 */
function buildPivotPlan(
  killSwitches: ConditionalLogic[],
  routes: Array<{ id: string; label?: string; status: string }>
): DefenceStrategyPlan["pivot_plan"] {
  const pivotPlan: DefenceStrategyPlan["pivot_plan"] = [];

  for (const killSwitch of killSwitches) {
    // Determine new route based on kill switch
    let newRoute = "procedural_disclosure_leverage"; // Default fallback

    // If kill switch mentions intent, pivot to alternative mental state
    if (killSwitch.if.includes("intent") || killSwitch.if.includes("targeting")) {
      const altRoute = routes.find(r => r.id === "alternative_mental_state_offence");
      if (altRoute) {
        newRoute = altRoute.id;
      }
    }
    // If kill switch mentions identification, pivot to act denial or outcome control
    else if (killSwitch.if.includes("identification")) {
      const actRoute = routes.find(r => r.id === "act_denial");
      if (actRoute && actRoute.status !== "blocked") {
        newRoute = actRoute.id;
      } else {
        newRoute = "mitigation_early_resolution";
      }
    }
    // If kill switch mentions disclosure, pivot to outcome control
    else if (killSwitch.if.includes("disclosure")) {
      newRoute = "mitigation_early_resolution";
    }

    // Build immediate actions
    const immediateActions: string[] = [];
    immediateActions.push("Review route viability and evidence state");
    if (killSwitch.evidence_needed && killSwitch.evidence_needed.length > 0) {
      immediateActions.push(`Assess impact of: ${killSwitch.evidence_needed[0]}`);
    }
    immediateActions.push(`Consider pivot to ${formatRouteLabel(newRoute)}`);

    pivotPlan.push({
      if_triggered: killSwitch.if,
      new_route: formatRouteLabel(newRoute),
      immediate_actions: immediateActions.slice(0, 3),
    });
  }

  return pivotPlan;
}

/**
 * Build next 72 hours tasks (max 8)
 */
function buildNext72Hours(
  snapshot: EvidenceSnapshot,
  routes: Array<{ required_dependencies: string[] }>
): string[] {
  const tasks: string[] = [];

  // Chase required dependencies without timeline
  for (const dep of snapshot.disclosure.required_without_timeline.slice(0, 3)) {
    tasks.push(`Chase required disclosure: ${dep}`);
  }

  // Address key evidence gaps
  for (const gap of snapshot.evidence.key_gaps.slice(0, 2)) {
    if (gap.toLowerCase().includes("cctv")) {
      tasks.push("Obtain CCTV export and verify continuity");
    } else if (gap.toLowerCase().includes("medical") || gap.toLowerCase().includes("mechanism")) {
      tasks.push("Pin medical mechanism and causation evidence");
    } else if (gap.toLowerCase().includes("continuity")) {
      tasks.push("Verify evidence continuity and date/time consistency");
    } else {
      tasks.push(`Obtain: ${gap}`);
    }
  }

  // Route-specific tasks
  const routesWithDeps = routes.filter(r => r.required_dependencies && r.required_dependencies.length > 0);
  if (routesWithDeps.length > 0) {
    const route = routesWithDeps[0];
    tasks.push(`Secure route dependencies: ${route.required_dependencies[0]}`);
  }

  // General procedural tasks
  if (tasks.length < 8) {
    tasks.push("Review disclosure timeline and update status");
  }
  if (tasks.length < 8 && snapshot.posture.has_position) {
    tasks.push("Review recorded position and update if needed");
  }
  if (tasks.length < 8) {
    tasks.push("Prepare instructions for counsel if applicable");
  }

  // Limit to 8
  return tasks.slice(0, 8);
}

/**
 * Stage 6: Build attack sequence: "Primary attack: X. If not open or fails: Y. Then Z."
 */
function buildAttackSequence(
  primary_route: DefenceStrategyPlan["primary_route"],
  secondary_routes: DefenceStrategyPlan["secondary_routes"],
  pivot_plan: DefenceStrategyPlan["pivot_plan"]
): string {
  const parts: string[] = [];
  parts.push(`Primary attack: ${primary_route.label}.`);

  const second = secondary_routes[0];
  const third = secondary_routes[1] ?? pivot_plan[0];

  if (second) {
    parts.push(` If not open or fails: ${second.label}.`);
  }
  if (third) {
    const thirdLabel = "new_route" in third ? third.new_route : third.label;
    parts.push(` Then: ${thirdLabel}.`);
  }

  return parts.join("");
}

/**
 * Stage 5: Build strategy one-liner from existing outputs (synthesis only, no new reasoning).
 */
function buildStrategyLine(
  posture: string,
  primary_route: DefenceStrategyPlan["primary_route"]
): string {
  const label = primary_route.label;
  const firstRationale = primary_route.rationale?.[0]?.trim();
  if (firstRationale && firstRationale.length > 0 && firstRationale.length < 120) {
    return `${label}: ${firstRationale}`;
  }
  const shortPosture = posture.trim().slice(0, 100);
  if (shortPosture.length > 0) {
    return `${label}. ${shortPosture}${posture.length > 100 ? "…" : ""}`;
  }
  return label;
}

/**
 * Stage 5: Build 3–5 risks & fallbacks bullets from kill_switches and pivot_plan.
 * Frames the system as responsive, not prophetic.
 */
function buildRisksFallbacks(
  kill_switches: ConditionalLogic[],
  pivot_plan: DefenceStrategyPlan["pivot_plan"]
): string[] {
  const max = 5;
  const bullets: string[] = [];

  for (let i = 0; i < Math.min(max, kill_switches.length); i++) {
    const ks = kill_switches[i];
    const pivot = pivot_plan[i];
    if (pivot) {
      bullets.push(`If ${ks.if}: ${ks.then} Pivot to ${pivot.new_route} if needed.`);
    } else {
      bullets.push(`If ${ks.if}: ${ks.then}`);
    }
  }

  return bullets;
}

/**
 * Format route label from route ID
 */
function formatRouteLabel(routeId: string): string {
  return routeId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
