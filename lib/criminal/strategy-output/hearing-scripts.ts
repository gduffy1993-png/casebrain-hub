/**
 * Strategy Output Model - Hearing Scripts
 * 
 * Builds short checklists (not speeches) for court hearings, tied to current disclosure and routes.
 * Professional, conditional, no predictions. Readable in 30 seconds.
 */

import type { EvidenceSnapshot } from "./types";
import type { DisclosureState } from "../disclosure-state";
import type { RoutePlaybooks } from "./route-playbooks";

export type HearingScript = {
  hearing_type: "PTPH" | "disclosure_directions" | "case_management" | "special_measures";
  checklist: string[]; // short bullets
  asks_of_court: string[]; // directions to request
  do_not_concede: string[]; // protect position
};

export type HearingScripts = {
  scripts: HearingScript[];
};

export type BuildHearingScriptsInput = {
  snapshot: EvidenceSnapshot;
  disclosureState: DisclosureState;
  playbooks?: RoutePlaybooks | null;
};

/**
 * Build Hearing Scripts
 * 
 * Creates short checklists for court hearings based on disclosure state and routes.
 */
export function buildHearingScripts(
  input: BuildHearingScriptsInput
): HearingScripts {
  const { snapshot, disclosureState, playbooks } = input;

  const scripts: HearingScript[] = [];

  // PTPH script (always include if Phase 2)
  if (snapshot.posture.phase && snapshot.posture.phase >= 2) {
    scripts.push(buildPTPHScript(snapshot, disclosureState, playbooks));
  }

  // Disclosure directions script (if disclosure outstanding)
  if (disclosureState.missing_items.length > 0) {
    scripts.push(buildDisclosureDirectionsScript(snapshot, disclosureState, playbooks));
  }

  // Case management script (if multiple routes or complex case)
  if (playbooks && playbooks.playbooks.length > 1) {
    scripts.push(buildCaseManagementScript(snapshot, disclosureState, playbooks));
  }

  // Special measures script (if ID challenge route exists)
  const hasIdChallenge = playbooks?.playbooks.some((p) => p.route_id === "identification_challenge");
  if (hasIdChallenge) {
    scripts.push(buildSpecialMeasuresScript(snapshot, disclosureState));
  }

  return { scripts };
}

/**
 * Build PTPH script
 */
function buildPTPHScript(
  snapshot: EvidenceSnapshot,
  disclosureState: DisclosureState,
  playbooks?: RoutePlaybooks | null
): HearingScript {
  const checklist: string[] = [];
  const asksOfCourt: string[] = [];
  const doNotConcede: string[] = [];

  // Checklist items
  checklist.push("Confirm issues in dispute");
  checklist.push("Confirm prosecution case summary");
  checklist.push("Confirm disclosure status");
  
  if (disclosureState.missing_items.length > 0) {
    checklist.push("Request directions for outstanding disclosure");
  }

  if (playbooks && playbooks.playbooks.length > 0) {
    const primaryRoute = playbooks.playbooks[0];
    if (primaryRoute.route_id === "identification_challenge") {
      checklist.push("Request Turnbull direction");
    }
    if (primaryRoute.route_id === "intent_denial") {
      checklist.push("Confirm prosecution case on intent");
    }
  }

  // Asks of court
  if (disclosureState.missing_items.length > 0) {
    const criticalMissing = disclosureState.missing_items.filter((item) => item.severity === "critical");
    if (criticalMissing.length > 0) {
      asksOfCourt.push(`Request directions for critical disclosure: ${criticalMissing.slice(0, 2).map((i) => i.label).join(", ")}`);
    }
    asksOfCourt.push("Request timetable for outstanding disclosure");
  }

  if (playbooks && playbooks.playbooks.length > 0) {
    const primaryRoute = playbooks.playbooks[0];
    if (primaryRoute.route_id === "identification_challenge") {
      asksOfCourt.push("Request Turnbull direction on identification reliability");
    }
  }

  asksOfCourt.push("Request case management directions if disclosure affects trial readiness");

  // Do not concede
  doNotConcede.push("Do not concede identification if identification challenge route is active");
  doNotConcede.push("Do not concede intent if intent denial route is active");
  
  if (disclosureState.status === "unsafe" || disclosureState.status === "conditionally_unsafe") {
    doNotConcede.push("Do not agree to trial date until critical disclosure is served");
  }

  if (playbooks && playbooks.playbooks.some((p) => p.route_id === "procedural_disclosure_leverage")) {
    doNotConcede.push("Do not concede disclosure is complete if disclosure leverage route is active");
  }

  return {
    hearing_type: "PTPH",
    checklist: checklist.slice(0, 6),
    asks_of_court: asksOfCourt.slice(0, 5),
    do_not_concede: doNotConcede.slice(0, 4),
  };
}

/**
 * Build disclosure directions script
 */
function buildDisclosureDirectionsScript(
  snapshot: EvidenceSnapshot,
  disclosureState: DisclosureState,
  playbooks?: RoutePlaybooks | null
): HearingScript {
  const checklist: string[] = [];
  const asksOfCourt: string[] = [];
  const doNotConcede: string[] = [];

  // Checklist items
  checklist.push("Confirm what disclosure has been served");
  checklist.push("Confirm what disclosure remains outstanding");
  checklist.push("Request materiality assessment for outstanding items");
  
  const criticalMissing = disclosureState.missing_items.filter((item) => item.severity === "critical");
  if (criticalMissing.length > 0) {
    checklist.push(`Request specific directions for: ${criticalMissing.slice(0, 2).map((i) => i.label).join(", ")}`);
  }

  // Asks of court
  if (criticalMissing.length > 0) {
    asksOfCourt.push(`Request directions for critical disclosure: ${criticalMissing.map((i) => i.label).join(", ")}`);
    asksOfCourt.push("Request timetable for critical disclosure service");
  }

  const highMissing = disclosureState.missing_items.filter((item) => item.severity === "high");
  if (highMissing.length > 0) {
    asksOfCourt.push(`Request directions for high-priority disclosure: ${highMissing.slice(0, 2).map((i) => i.label).join(", ")}`);
  }

  asksOfCourt.push("Request materiality assessment if prosecution resists disclosure");
  asksOfCourt.push("Request adverse inference direction if disclosure obligations not met");

  // Do not concede
  doNotConcede.push("Do not accept that disclosure is complete if items remain outstanding");
  doNotConcede.push("Do not accept non-materiality without specific justification");
  
  if (disclosureState.status === "unsafe") {
    doNotConcede.push("Do not agree to proceed until critical disclosure is served");
  }

  if (playbooks && playbooks.playbooks.some((p) => p.route_id === "procedural_disclosure_leverage")) {
    doNotConcede.push("Do not concede disclosure failures do not affect fair trial");
  }

  return {
    hearing_type: "disclosure_directions",
    checklist: checklist.slice(0, 5),
    asks_of_court: asksOfCourt.slice(0, 5),
    do_not_concede: doNotConcede.slice(0, 4),
  };
}

/**
 * Build case management script
 */
function buildCaseManagementScript(
  snapshot: EvidenceSnapshot,
  disclosureState: DisclosureState,
  playbooks?: RoutePlaybooks | null
): HearingScript {
  const checklist: string[] = [];
  const asksOfCourt: string[] = [];
  const doNotConcede: string[] = [];

  // Checklist items
  checklist.push("Confirm issues in dispute");
  checklist.push("Confirm estimated trial length");
  checklist.push("Confirm witness requirements");
  
  if (disclosureState.missing_items.length > 0) {
    checklist.push("Confirm disclosure status affects case management");
  }

  if (playbooks && playbooks.playbooks.length > 1) {
    checklist.push("Confirm alternative routes may affect case management");
  }

  // Asks of court
  if (disclosureState.missing_items.length > 0) {
    asksOfCourt.push("Request case management directions if disclosure affects trial readiness");
    asksOfCourt.push("Request adjournment if disclosure obligations not met");
  }

  if (playbooks && playbooks.playbooks.some((p) => p.route_id === "identification_challenge")) {
    asksOfCourt.push("Request case management directions for identification evidence");
  }

  if (playbooks && playbooks.playbooks.some((p) => p.route_id === "intent_denial")) {
    asksOfCourt.push("Request case management directions for intent evidence");
  }

  asksOfCourt.push("Request directions for expert evidence if required");

  // Do not concede
  doNotConcede.push("Do not agree to trial date if disclosure affects case preparation");
  doNotConcede.push("Do not concede issues in dispute without reviewing disclosure");
  
  if (playbooks && playbooks.playbooks.length > 1) {
    doNotConcede.push("Do not narrow issues if alternative routes remain viable");
  }

  return {
    hearing_type: "case_management",
    checklist: checklist.slice(0, 5),
    asks_of_court: asksOfCourt.slice(0, 5),
    do_not_concede: doNotConcede.slice(0, 4),
  };
}

/**
 * Build special measures script
 */
function buildSpecialMeasuresScript(
  snapshot: EvidenceSnapshot,
  disclosureState: DisclosureState
): HearingScript {
  const checklist: string[] = [];
  const asksOfCourt: string[] = [];
  const doNotConcede: string[] = [];

  // Checklist items
  checklist.push("Confirm identification evidence requirements");
  checklist.push("Request Turnbull direction if identification is disputed");
  checklist.push("Request directions for identification procedure evidence");
  checklist.push("Request directions for CCTV/BWV if identification is disputed");

  // Asks of court
  asksOfCourt.push("Request Turnbull direction on identification reliability");
  asksOfCourt.push("Request directions for identification procedure evidence");
  
  if (disclosureState.missing_items.some((item) => 
    item.key.includes("cctv") || item.key.includes("bwv")
  )) {
    asksOfCourt.push("Request directions for CCTV/BWV disclosure if identification is disputed");
  }

  asksOfCourt.push("Request directions for witness statements on identification conditions");

  // Do not concede
  doNotConcede.push("Do not concede identification reliability without Turnbull assessment");
  doNotConcede.push("Do not accept identification evidence without reliability factors");
  doNotConcede.push("Do not agree to proceed if identification evidence is insufficient");

  return {
    hearing_type: "special_measures",
    checklist: checklist.slice(0, 5),
    asks_of_court: asksOfCourt.slice(0, 4),
    do_not_concede: doNotConcede.slice(0, 3),
  };
}
