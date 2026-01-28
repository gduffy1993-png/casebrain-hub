/**
 * Strategy Coordinator
 * 
 * SAFE, deterministic coordinator that aggregates existing criminal modules
 * into a single canonical reasoning object. This coordinator adds coordination,
 * not intelligence. It evaluates existing routes only.
 * 
 * IMPORTANT:
 * - Do NOT invent strategies, predictions, or speculative reasoning
 * - Only aggregates and coordinates existing data
 * - Never throws, always returns fully shaped result
 * - Accepts partial input gracefully
 */

import type { RouteType } from "./strategy-fight-types";
import { detectOffence, type OffenceDef } from "./offence-elements";
import { evaluateRoutes, CANONICAL_ROUTES, type RouteAssessment as CanonicalRouteAssessment } from "./strategy-routes";
import { buildJudgeAnalysis, type JudgeAnalysis } from "./judge-reasoning";

// ============================================================================
// CANONICAL TYPES
// ============================================================================

export type ElementSupport = "strong" | "some" | "weak" | "none";

export type EvidenceRef = {
  doc_type?: string;
  note: string;
  quote?: string; // optional, <= 20 words only
};

export type OffenceElementState = {
  id: string;
  label: string;
  support: ElementSupport;
  refs: EvidenceRef[];
  gaps: string[];
};

export type DependencyState = {
  id: string;
  label: string;
  status: "outstanding" | "served" | "unknown";
  why_it_matters: string;
  last_action_date?: string;
};

export type RouteStatus = "viable" | "risky" | "blocked";

export type RouteAssessment = {
  id: string;
  status: RouteStatus;
  reasons: string[];
  required_dependencies: string[];
  constraints: string[];
};

export type StrategyCoordinatorResult = {
  offence: { code: string; label: string };
  elements: OffenceElementState[];
  dependencies: DependencyState[];
  plugin_constraints: Record<string, any>;
  routes: CanonicalRouteAssessment[];
  next_actions: string[];
  audit_trace: string[];
  judge_analysis?: JudgeAnalysis;
};

// ============================================================================
// INPUT TYPE
// ============================================================================

export type StrategyCoordinatorInput = {
  caseId: string;
  extracted?: any;
  charges?: Array<{
    offence?: string;
    section?: string;
    count?: number;
  }>;
  disclosureTimeline?: Array<{
    item: string;
    action: string;
    date: string;
    note?: string;
  }>;
  declaredDependencies?: Array<{
    id: string;
    label: string;
    status: "required" | "helpful" | "not_needed";
    note?: string;
  }>;
  irreversibleDecisions?: Array<{
    id: string;
    label: string;
    status: "not_yet" | "planned" | "completed";
    updated_at?: string;
  }>;
  recordedPosition?: {
    position_type?: string;
    position_text?: string;
    primary?: RouteType;
  };
  evidenceImpactMap?: Array<{
    evidenceItem: {
      name: string;
      urgency?: string;
    };
  }>;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Build Strategy Coordinator Result
 * 
 * Aggregates existing criminal modules into a single canonical reasoning object.
 * Never throws, always returns fully shaped result.
 */
export function buildStrategyCoordinator(
  input: StrategyCoordinatorInput
): StrategyCoordinatorResult {
  const audit_trace: string[] = [];
  audit_trace.push(`[COORDINATOR] Started for case ${input.caseId}`);

  // Initialize result with defaults
  const result: StrategyCoordinatorResult = {
    offence: { code: "", label: "" },
    elements: [],
    dependencies: [],
    plugin_constraints: {},
    routes: [],
    next_actions: [],
    audit_trace: [],
  };

  try {
    // Step 1: Detect offence using canonical detection
    audit_trace.push("[COORDINATOR] Step 1: Detecting offence using canonical detection");
    const offenceDef = detectOffence(input.charges, input.extracted);
    result.offence = { code: offenceDef.code, label: offenceDef.label };
    audit_trace.push(`[COORDINATOR] Offence detected: ${offenceDef.code} - ${offenceDef.label}`);

    // Step 2: Build offence elements state from canonical elements
    audit_trace.push("[COORDINATOR] Step 2: Building offence elements state from canonical elements");
    result.elements = buildOffenceElementsFromCanonical(
      offenceDef,
      input.extracted,
      input.evidenceImpactMap || []
    );
    audit_trace.push(`[COORDINATOR] Elements built: ${result.elements.length} elements`);

    // Step 3: Build dependencies with canonical IDs
    audit_trace.push("[COORDINATOR] Step 3: Building dependencies with canonical IDs");
    result.dependencies = buildCanonicalDependencies(
      input.declaredDependencies || [],
      input.disclosureTimeline || [],
      input.evidenceImpactMap || []
    );
    audit_trace.push(`[COORDINATOR] Dependencies built: ${result.dependencies.length} dependencies`);

    // Step 4: Build plugin constraints (try to import existing modules)
    audit_trace.push("[COORDINATOR] Step 4: Building plugin constraints from existing modules");
    result.plugin_constraints = buildPluginConstraintsWithModules(
      input.irreversibleDecisions || [],
      input.recordedPosition,
      input.disclosureTimeline || [],
      input.evidenceImpactMap || [],
      audit_trace
    );
    audit_trace.push(`[COORDINATOR] Plugin constraints built: ${Object.keys(result.plugin_constraints).length} constraints`);

    // Step 5: Evaluate canonical routes
    audit_trace.push("[COORDINATOR] Step 5: Evaluating canonical routes");
    result.routes = evaluateCanonicalRoutes(
      offenceDef,
      result.elements,
      result.dependencies,
      result.plugin_constraints,
      input.recordedPosition,
      input.declaredDependencies || [],
      input.irreversibleDecisions || [],
      input.extracted,
      audit_trace
    );
    audit_trace.push(`[COORDINATOR] Routes evaluated: ${result.routes.length} canonical routes`);

    // Step 6: Generate next actions (max 8)
    audit_trace.push("[COORDINATOR] Step 6: Generating next actions (max 8)");
    result.next_actions = generateNextActionsDeterministic(
      result.dependencies,
      result.routes,
      input.disclosureTimeline || [],
      input.recordedPosition,
      input.irreversibleDecisions || []
    );
    audit_trace.push(`[COORDINATOR] Next actions generated: ${result.next_actions.length} actions`);

    // Step 7: Build judge analysis (doctrine-based, no predictions)
    audit_trace.push("[COORDINATOR] Step 7: Building judge analysis (doctrine-based)");
    try {
      result.judge_analysis = buildJudgeAnalysis({
        offenceCode: result.offence.code,
        offenceLabel: result.offence.label,
        elements: result.elements,
        dependencies: result.dependencies,
        plugin_constraints: result.plugin_constraints,
      });
      audit_trace.push(`[COORDINATOR] Judge analysis built: ${result.judge_analysis.legal_tests.length} legal tests, ${result.judge_analysis.constraints.length} constraints`);
    } catch (error) {
      // Judge analysis is optional, fail gracefully
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      audit_trace.push(`[COORDINATOR] Judge analysis failed (non-fatal): ${errorMsg}`);
    }

    // Set audit trace
    result.audit_trace = audit_trace;
    audit_trace.push("[COORDINATOR] Completed successfully");

  } catch (error) {
    // Never throw - log error and return partial result
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    audit_trace.push(`[COORDINATOR] Error caught (non-fatal): ${errorMsg}`);
    result.audit_trace = audit_trace;
  }

  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build offence elements state from canonical offence definition
 */
function buildOffenceElementsFromCanonical(
  offenceDef: OffenceDef,
  extracted: any,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): OffenceElementState[] {
  const elements: OffenceElementState[] = [];

  for (const canonicalElement of offenceDef.elements) {
    elements.push({
      id: canonicalElement.id,
      label: canonicalElement.label,
      support: assessElementSupportDeterministic(
        canonicalElement.id,
        extracted,
        evidenceImpactMap
      ),
      refs: extractEvidenceRefs(canonicalElement.id, extracted),
      gaps: extractElementGaps(canonicalElement.id, evidenceImpactMap),
    });
  }

  return elements;
}

/**
 * Assess element support level deterministically
 */
function assessElementSupportDeterministic(
  elementId: string,
  extracted: any,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): ElementSupport {
  // Check if evidence exists for this element
  const relevantItems = evidenceImpactMap.filter(item => {
    const name = item.evidenceItem.name.toLowerCase();
    const elementLower = elementId.toLowerCase();
    
    // Direct match
    if (name.includes(elementLower) || elementLower.includes(name)) {
      return true;
    }
    
    // Element-specific patterns
    if (elementId === "identification" && (name.includes("id") || name.includes("cctv") || name.includes("bwv") || name.includes("witness"))) {
      return true;
    }
    if ((elementId === "act_causation" || elementId === "actus_reus") && (name.includes("cctv") || name.includes("witness") || name.includes("scene"))) {
      return true;
    }
    if ((elementId === "injury_threshold" || elementId === "injury" || elementId === "injury_classification") && (name.includes("medical") || name.includes("injury") || name.includes("wound") || name.includes("gbh"))) {
      return true;
    }
    if (elementId === "specific_intent" && (name.includes("intent") || name.includes("deliberate") || name.includes("targeted"))) {
      return true;
    }
    if (elementId === "recklessness" && (name.includes("reckless") || name.includes("aware"))) {
      return true;
    }
    if (elementId === "causation" && (name.includes("caused") || name.includes("resulted") || name.includes("mechanism"))) {
      return true;
    }
    if (elementId === "unlawfulness" && (name.includes("unlawful") || name.includes("justification"))) {
      return true;
    }
    
    return false;
  });

  const outstandingItems = relevantItems.filter(item => {
    const urgency = item.evidenceItem.urgency?.toLowerCase() || "";
    return urgency.includes("missing") || urgency.includes("outstanding") || urgency.includes("not received");
  });

  // Check extracted text for element-specific indicators
  let extractedSupport: ElementSupport | null = null;
  if (extracted) {
    const extractedStr = JSON.stringify(extracted).toLowerCase();
    
    // Identification: downgrade if uncertainty indicators present
    if (elementId === "identification") {
      const uncertaintyIndicators = ["poor lighting", "dark", "uncertain", "not sure", "couldn't see", "fast", "brief"];
      if (uncertaintyIndicators.some(ind => extractedStr.includes(ind))) {
        extractedSupport = "weak";
      }
    }
    
    // Injury: strong if medical summary indicates GBH-type wording
    if (elementId === "injury_threshold" || elementId === "injury" || elementId === "injury_classification") {
      const gbhIndicators = ["laceration", "fracture", "gbh", "grievous", "serious harm", "wound"];
      if (gbhIndicators.some(ind => extractedStr.includes(ind))) {
        extractedSupport = "strong";
      } else if (extractedStr.includes("injury") || extractedStr.includes("harm")) {
        extractedSupport = "some";
      }
    }
    
    // Weapon: weak/some if witness "believes" or didn't clearly see
    if (elementId.includes("weapon")) {
      const uncertaintyIndicators = ["believes", "thinks", "not sure", "unclear", "didn't see"];
      if (uncertaintyIndicators.some(ind => extractedStr.includes(ind))) {
        extractedSupport = "weak";
      } else if (extractedStr.includes("weapon")) {
        extractedSupport = "some";
      }
    }
    
    // Specific intent: weak by default; some only if explicit
    if (elementId === "specific_intent") {
      if (extractedStr.includes("targeted") || extractedStr.includes("sustained") || extractedStr.includes("deliberate")) {
        extractedSupport = "some";
      } else {
        extractedSupport = "weak";
      }
    }
    
    // Recklessness: some if act + injury supported but intent weak
    if (elementId === "recklessness") {
      if (extractedStr.includes("reckless") || extractedStr.includes("aware")) {
        extractedSupport = "some";
      }
    }
  }

  // Combine evidence map and extracted support
  if (outstandingItems.length === 0 && relevantItems.length > 0) {
    return extractedSupport === "weak" ? "some" : "strong";
  } else if (outstandingItems.length < relevantItems.length) {
    return extractedSupport || "some";
  } else if (outstandingItems.length === relevantItems.length && relevantItems.length > 0) {
    return extractedSupport || "weak";
  } else {
    return extractedSupport || "none";
  }
}

/**
 * Extract evidence references for an element
 */
function extractEvidenceRefs(elementId: string, extracted: any): EvidenceRef[] {
  const refs: EvidenceRef[] = [];

  if (!extracted) {
    return refs;
  }

  // Try to extract relevant document types
  if (typeof extracted === "object") {
    // Look for document arrays or evidence arrays
    const docs = extracted.documents || extracted.evidence || [];
    if (Array.isArray(docs)) {
      for (const doc of docs.slice(0, 3)) { // Limit to 3 refs
        if (doc && typeof doc === "object") {
          refs.push({
            doc_type: doc.type || doc.name || "document",
            note: `Relevant to ${elementId}`,
          });
        }
      }
    }
  }

  return refs;
}

/**
 * Extract element gaps from evidence impact map
 */
function extractElementGaps(
  elementId: string,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): string[] {
  const gaps: string[] = [];

  for (const item of evidenceImpactMap) {
    const name = item.evidenceItem.name.toLowerCase();
    const urgency = item.evidenceItem.urgency?.toLowerCase() || "";
    
    const isRelevant = 
      name.includes(elementId.toLowerCase()) ||
      (elementId === "identification" && (name.includes("id") || name.includes("cctv") || name.includes("bwv"))) ||
      (elementId === "act_causation" && (name.includes("cctv") || name.includes("witness"))) ||
      (elementId === "injury_classification" && (name.includes("medical") || name.includes("injury")));

    if (isRelevant && (urgency.includes("missing") || urgency.includes("outstanding") || urgency.includes("not received"))) {
      gaps.push(item.evidenceItem.name);
    }
  }

  return gaps;
}

/**
 * Build dependencies with canonical IDs
 */
function buildCanonicalDependencies(
  declaredDependencies: Array<{ id: string; label: string; status: string; note?: string }>,
  disclosureTimeline: Array<{ item: string; action: string; date: string; note?: string }>,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): DependencyState[] {
  const dependencies: DependencyState[] = [];
  const seen = new Set<string>();

  // Canonical dependency IDs
  const canonicalDeps = [
    { id: "cctv_window_2310_2330", label: "CCTV (Aroma Kebab 23:10-23:30)", why: "clarifies sequence/ID" },
    { id: "cctv_continuity", label: "CCTV Continuity Statement", why: "clarifies sequence/continuity" },
    { id: "bwv_arrest", label: "BWV Arresting Officers", why: "clarifies ID/procedure" },
    { id: "call_999_audio", label: "999 Call Audio", why: "clarifies sequence/context" },
    { id: "cad_log", label: "CAD Log", why: "clarifies sequence/timing" },
    { id: "interview_recording", label: "Interview Recording", why: "clarifies defendant account" },
    { id: "custody_cctv", label: "Custody CCTV", why: "clarifies procedure/context" },
    { id: "medical_photos", label: "Medical Photographs", why: "clarifies injury mechanism" },
    { id: "scene_photos", label: "Scene Photographs", why: "clarifies scene/context" },
    { id: "forensics_if_any", label: "Forensics (if any)", why: "clarifies weapon/causation" },
  ];

  // Add canonical dependencies
  for (const canonicalDep of canonicalDeps) {
    // Check if declared dependency matches
    const declaredMatch = declaredDependencies.find(d => 
      d.id.toLowerCase().includes(canonicalDep.id.toLowerCase()) ||
      canonicalDep.id.toLowerCase().includes(d.id.toLowerCase()) ||
      d.label.toLowerCase().includes(canonicalDep.label.toLowerCase())
    );

    // Check if evidence impact map has this item
    const evidenceMatch = evidenceImpactMap.find(item => {
      const name = item.evidenceItem.name.toLowerCase();
      return name.includes(canonicalDep.id.toLowerCase()) ||
             name.includes(canonicalDep.label.toLowerCase()) ||
             (canonicalDep.id.includes("cctv") && name.includes("cctv")) ||
             (canonicalDep.id.includes("bwv") && name.includes("bwv")) ||
             (canonicalDep.id.includes("999") && name.includes("999")) ||
             (canonicalDep.id.includes("cad") && name.includes("cad")) ||
             (canonicalDep.id.includes("interview") && name.includes("interview")) ||
             (canonicalDep.id.includes("custody") && name.includes("custody")) ||
             (canonicalDep.id.includes("medical") && name.includes("medical")) ||
             (canonicalDep.id.includes("scene") && name.includes("scene")) ||
             (canonicalDep.id.includes("forensics") && name.includes("forensic"));
    });

    if (declaredMatch || evidenceMatch) {
      const status = getDependencyStatus(canonicalDep.id, canonicalDep.label, disclosureTimeline);
      dependencies.push({
        id: canonicalDep.id,
        label: canonicalDep.label,
        status: status,
        why_it_matters: declaredMatch?.note || canonicalDep.why,
        last_action_date: getLastActionDate(canonicalDep.id, canonicalDep.label, disclosureTimeline),
      });
      seen.add(canonicalDep.id);
    }
  }

  // Add other declared dependencies not in canonical list
  for (const dep of declaredDependencies) {
    if (dep.status === "required" || dep.status === "helpful") {
      if (!seen.has(dep.id.toLowerCase())) {
        const status = getDependencyStatus(dep.id, dep.label, disclosureTimeline);
        dependencies.push({
          id: dep.id,
          label: dep.label,
          status: status,
          why_it_matters: dep.note || `Required for strategy`,
          last_action_date: getLastActionDate(dep.id, dep.label, disclosureTimeline),
        });
        seen.add(dep.id.toLowerCase());
      }
    }
  }

  return dependencies;
}

/**
 * Get dependency status from disclosure timeline
 */
function getDependencyStatus(
  id: string,
  label: string,
  disclosureTimeline: Array<{ item: string; action: string; date: string; note?: string }>
): "outstanding" | "served" | "unknown" {
  // Find latest entry for this item
  const relevantEntries = disclosureTimeline.filter(entry => {
    const entryItem = entry.item.toLowerCase();
    return entryItem.includes(id.toLowerCase()) || entryItem.includes(label.toLowerCase());
  });

  if (relevantEntries.length === 0) {
    return "unknown";
  }

  // Sort by date (most recent first)
  const sorted = relevantEntries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sorted[0];
  if (latest.action === "served" || latest.action === "reviewed") {
    return "served";
  } else if (latest.action === "outstanding" || latest.action === "overdue") {
    return "outstanding";
  } else {
    return "unknown";
  }
}

/**
 * Get last action date for a dependency
 */
function getLastActionDate(
  id: string,
  label: string,
  disclosureTimeline: Array<{ item: string; action: string; date: string; note?: string }>
): string | undefined {
  const relevantEntries = disclosureTimeline.filter(entry => {
    const entryItem = entry.item.toLowerCase();
    return entryItem.includes(id.toLowerCase()) || entryItem.includes(label.toLowerCase());
  });

  if (relevantEntries.length === 0) {
    return undefined;
  }

  const sorted = relevantEntries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return sorted[0].date;
}

/**
 * Build plugin constraints (try to import existing modules)
 */
function buildPluginConstraintsWithModules(
  irreversibleDecisions: Array<{ id: string; label: string; status: string; updated_at?: string }>,
  recordedPosition: any,
  disclosureTimeline: Array<{ item: string; action: string; date: string; note?: string }>,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>,
  audit_trace: string[]
): Record<string, any> {
  const constraints: Record<string, any> = {};

  // Try to import procedural-safety module
  try {
    const { computeProceduralSafety } = require("./procedural-safety");
    const proceduralSafety = computeProceduralSafety(evidenceImpactMap);
    constraints.procedural_safety = {
      status: proceduralSafety.status,
      explanation: proceduralSafety.explanation,
      outstandingItems: proceduralSafety.outstandingItems,
    };
    audit_trace.push("[COORDINATOR] Procedural safety module loaded");
  } catch (error) {
    audit_trace.push("[COORDINATOR] Procedural safety module not available (skipped)");
  }

  // Try to import incident-shape module
  try {
    const { classifyIncidentShape } = require("./incident-shape");
    if (recordedPosition?.position_text) {
      const incidentShape = classifyIncidentShape(recordedPosition.position_text);
      constraints.incident_shape = {
        shape: incidentShape.shape,
        reasoning: incidentShape.reasoning,
      };
      audit_trace.push("[COORDINATOR] Incident shape module loaded");
    }
  } catch (error) {
    audit_trace.push("[COORDINATOR] Incident shape module not available (skipped)");
  }

  // Try to import weapon-tracker module
  try {
    const { extractWeaponTracker } = require("./weapon-tracker");
    if (recordedPosition?.position_text) {
      const weaponTracker = extractWeaponTracker(recordedPosition.position_text, evidenceImpactMap);
      constraints.weapon_tracker = {
        allegedWeapon: weaponTracker.allegedWeapon,
        visuallyObserved: weaponTracker.visuallyObserved,
        recovered: weaponTracker.recovered,
        forensicConfirmation: weaponTracker.forensicConfirmation,
      };
      audit_trace.push("[COORDINATOR] Weapon tracker module loaded");
    }
  } catch (error) {
    audit_trace.push("[COORDINATOR] Weapon tracker module not available (skipped)");
  }

  // Try to import worst-case-cap module
  try {
    const { generateWorstCaseCap } = require("./worst-case-cap");
    // Would need charges, incident shape, weapon tracker - skip for now
    audit_trace.push("[COORDINATOR] Worst-case cap module available but requires additional inputs (skipped)");
  } catch (error) {
    audit_trace.push("[COORDINATOR] Worst-case cap module not available (skipped)");
  }

  // Irreversible decisions constraints
  const plannedOrCompleted = irreversibleDecisions.filter(d => 
    d.status === "planned" || d.status === "completed"
  );

  if (plannedOrCompleted.length > 0) {
    constraints.irreversible_decisions = {
      count: plannedOrCompleted.length,
      items: plannedOrCompleted.map(d => ({
        id: d.id,
        label: d.label,
        status: d.status,
        updated_at: d.updated_at,
      })),
    };
  }

  // Recorded position constraint
  if (recordedPosition?.primary) {
    constraints.recorded_position = {
      primary: recordedPosition.primary,
      position_type: recordedPosition.position_type,
    };
  }

  // Outstanding disclosure constraint
  const outstanding = disclosureTimeline.filter(entry => 
    entry.action === "outstanding" || entry.action === "overdue"
  );

  if (outstanding.length > 0) {
    constraints.outstanding_disclosure = {
      count: outstanding.length,
      items: outstanding.map(entry => entry.item),
    };
  }

  return constraints;
}

/**
 * Evaluate canonical routes using strategy-routes library
 */
function evaluateCanonicalRoutes(
  offenceDef: OffenceDef,
  elementsState: OffenceElementState[],
  dependencies: DependencyState[],
  plugin_constraints: Record<string, any>,
  recordedPosition: any,
  declaredDependencies: Array<{ id: string; status: string }>,
  irreversibleDecisions: Array<{ id: string; status: string }>,
  extracted: any,
  audit_trace: string[]
): CanonicalRouteAssessment[] {
  const ctx = {
    offenceDef,
    elementsState: elementsState.map(e => ({
      id: e.id,
      support: e.support,
      gaps: e.gaps,
    })),
    dependencies: dependencies.map(d => ({
      id: d.id,
      status: d.status,
    })),
    plugin_constraints,
    recordedPosition,
    declaredDependencies,
    irreversibleDecisions,
    extracted,
  };

  audit_trace.push(`[COORDINATOR] Evaluating ${CANONICAL_ROUTES.length} canonical routes`);
  const assessments = evaluateRoutes(ctx);
  
  for (const assessment of assessments) {
    audit_trace.push(`[COORDINATOR] Route ${assessment.id}: ${assessment.status} - ${assessment.reasons[0] || "no reasons"}`);
  }

  return assessments;
}

/**
 * Generate next actions deterministically (max 8)
 */
function generateNextActionsDeterministic(
  dependencies: DependencyState[],
  routes: CanonicalRouteAssessment[],
  disclosureTimeline: Array<{ item: string; action: string; date: string; note?: string }>,
  recordedPosition: any,
  irreversibleDecisions: Array<{ id: string; status: string }>
): string[] {
  const actions: string[] = [];

  // 1. Chase outstanding dependencies (max 3)
  const outstandingDeps = dependencies.filter(d => d.status === "outstanding");
  for (const dep of outstandingDeps.slice(0, 3)) {
    const lastAction = dep.last_action_date;
    if (!lastAction) {
      actions.push(`Request ${dep.label}`);
    } else {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince >= 14) {
        actions.push(`Chase ${dep.label} (last action ${daysSince} days ago)`);
      } else if (daysSince >= 7) {
        actions.push(`Follow up on ${dep.label} (requested ${daysSince} days ago)`);
      }
    }
    if (actions.length >= 3) break;
  }

  // 2. Verify continuity/date inconsistencies (if applicable)
  if (actions.length < 8) {
    const continuityDep = dependencies.find(d => d.id.includes("continuity"));
    if (continuityDep && continuityDep.status === "outstanding") {
      actions.push("Verify CCTV continuity and date/time consistency");
    }
  }

  // 3. Confirm medical mechanism (if injury element weak)
  if (actions.length < 8) {
    const injuryElement = routes.find(r => r.id.includes("weapon") || r.id.includes("causation"));
    if (injuryElement && (injuryElement.status === "risky" || injuryElement.status === "blocked")) {
      actions.push("Confirm medical mechanism and fracture/injury causation");
    }
  }

  // 4. Record position if missing
  if (actions.length < 8 && !recordedPosition?.primary && !recordedPosition?.position_type) {
    actions.push("Record defense position if strategy commitment made");
  }

  // 5. Avoid irreversible decisions while required deps outstanding (factual reminder)
  if (actions.length < 8) {
    const requiredOutstanding = dependencies.filter(d => 
      d.status === "outstanding" && 
      ["cctv_window_2310_2330", "bwv_arrest", "call_999_audio", "interview_recording"].includes(d.id)
    );
    const hasIrreversible = irreversibleDecisions.some(d => d.status === "planned" || d.status === "completed");
    if (requiredOutstanding.length > 0 && hasIrreversible) {
      actions.push("Factual reminder: Key required dependencies remain outstanding; ensure rationale recorded for any irreversible decisions");
    }
  }

  // 6. Review blocked routes
  if (actions.length < 8) {
    const blockedRoutes = routes.filter(r => r.status === "blocked");
    if (blockedRoutes.length > 0) {
      actions.push(`Review ${blockedRoutes.length} blocked route(s) - disclosure or evidence required`);
    }
  }

  // 7. Assess risky routes
  if (actions.length < 8) {
    const riskyRoutes = routes.filter(r => r.status === "risky");
    if (riskyRoutes.length > 0) {
      actions.push(`Assess ${riskyRoutes.length} risky route(s) - evidence gaps present`);
    }
  }

  return actions.slice(0, 8); // Ensure max 8
}
