/**
 * Surface registry for Phase 2 fail-closed containment.
 * Central gate: lib/criminal/solicitor-output-gate.ts
 */

export type SurfaceGateMode = "central" | "none" | "deferred";

export type SurfaceGateEntry = {
  surfaceId: string;
  exposure: "view_only" | "copyable" | "exportable" | "api";
  /** How Phase 2 applies the gate. */
  gate: SurfaceGateMode;
  note: string;
};

/**
 * Ungated surfaces from Phase 1 inventory — each must be central, deferred, or justified none.
 * Final pass rates use unique-fixture denominator from corpus-unique-manifest.json.
 */
export const PHASE2_SURFACE_GATE_PLAN: SurfaceGateEntry[] = [
  { surfaceId: "overview_safe_wording_card", exposure: "view_only", gate: "central", note: "Parent Overview integrity + line filters" },
  { surfaceId: "overview_court_prep_card", exposure: "view_only", gate: "central", note: "Parent Overview integrity" },
  { surfaceId: "overview_evidence_gaps_card", exposure: "view_only", gate: "central", note: "Parent Overview integrity" },
  { surfaceId: "overview_snapshot_boxes", exposure: "view_only", gate: "central", note: "Parent Overview integrity" },
  { surfaceId: "overview_advanced_panel", exposure: "view_only", gate: "central", note: "SolicitorDeepDetailGate via outputIntegrity" },
  { surfaceId: "confidence_dashboard", exposure: "view_only", gate: "central", note: "Inside advanced panel gate" },
  { surfaceId: "defence_decision_board", exposure: "view_only", gate: "central", note: "Inside advanced panel gate" },
  { surfaceId: "advice_change_radar", exposure: "view_only", gate: "central", note: "Inside advanced panel gate" },
  { surfaceId: "rerun_diff_panel", exposure: "view_only", gate: "central", note: "Inside advanced panel gate" },
  { surfaceId: "hearing_war_room_assistant", exposure: "copyable", gate: "central", note: "API defence-plan-chat gated; dock shows integrity banner" },
  { surfaceId: "client_explanation_panel", exposure: "copyable", gate: "central", note: "gateSolicitorOutput on fullText before copy" },
  { surfaceId: "reasoning_v2_panel", exposure: "view_only", gate: "central", note: "Under papers deep integrity gate" },
  { surfaceId: "client_account_stress_test", exposure: "view_only", gate: "central", note: "Under papers deep integrity gate" },
  { surfaceId: "supervisor_qa_panel", exposure: "view_only", gate: "central", note: "Under papers deep integrity gate" },
  { surfaceId: "control_room_assistant", exposure: "copyable", gate: "central", note: "Shares defence-plan-chat / letter API gates" },
  { surfaceId: "export_case_qa_pack", exposure: "exportable", gate: "central", note: "gateSolicitorOutput before download (non-pilot)" },
  { surfaceId: "case_file_zone", exposure: "view_only", gate: "none", note: "No solicitor wording output" },
  { surfaceId: "api_letters_draft", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_disclosure_request", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_hearing_prep", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_cases_hearing_prep", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_client_advice", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_bail_application", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_sentencing_mitigation", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_court_scripts", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_kill_shot", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_prosecution_weaknesses", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_propose_summary", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_strategy_export", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse on narrative fields" },
  { surfaceId: "api_strategy_ask", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_defence_plan_chat", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse on reply text" },
  { surfaceId: "api_executive_brief", exposure: "api", gate: "central", note: "maybeIntegrityBlockedResponse" },
  { surfaceId: "api_export_review", exposure: "api", gate: "none", note: "Metadata/hash persistence only — no wording" },
];

export function phase2CentralSurfaceIds(): string[] {
  return PHASE2_SURFACE_GATE_PLAN.filter((s) => s.gate === "central").map((s) => s.surfaceId);
}

export function phase2RemainingUngated(): SurfaceGateEntry[] {
  return PHASE2_SURFACE_GATE_PLAN.filter((s) => s.gate === "deferred");
}
