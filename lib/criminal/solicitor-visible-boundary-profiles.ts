/**
 * Surface-aware solicitor-visible boundary profiles.
 * Punctuation heuristics are profile-specific — bullet lists and headers
 * must not be judged as incomplete narrative prose.
 */

import {
  assessSolicitorVisibleBoundary,
  hasIncompleteRequiredDisclaimer,
  type SolicitorBoundaryIssue,
} from "@/lib/criminal/solicitor-visible-boundary";

export type SolicitorBoundaryProfile =
  | "narrative_prose"
  | "structured_header"
  | "bullet_list"
  | "count_or_status_strip"
  | "chase_request_sentence"
  | "short_label_or_title";

export type BoundaryProfileContext = {
  /** Expected field values for structured_header (e.g. Client, Allegation). */
  expectedFields?: Record<string, string | null | undefined>;
  /** Expected bullet semantic units (label + optional state). */
  expectedUnits?: Array<{ label: string; state?: string | null }>;
  /** Declared strip template tokens for count_or_status_strip. */
  stripTemplate?: RegExp;
};

const PROFILE_BY_SURFACE: Record<string, SolicitorBoundaryProfile> = {
  // Scale-3000 consolidated surfaces
  source_context: "structured_header",
  case_header: "narrative_prose",
  case_header_charge_copy: "narrative_prose",
  case_header_verified_charge: "narrative_prose",
  overview_counts: "narrative_prose",
  truth_map: "bullet_list",
  hearing_status_strip: "count_or_status_strip",
  offence_family: "short_label_or_title",
  client_summary: "narrative_prose",
  court_line: "narrative_prose",
  cps_chase_draft: "chase_request_sentence",
  chase_brief: "bullet_list",
  do_not_overstate: "bullet_list",
  defence_plan_safe_wording: "narrative_prose",
  copy_preview: "chase_request_sentence",
  export_preview: "narrative_prose",
  api_consumer_preview: "narrative_prose",
  family_leak_probe: "short_label_or_title",
  blocked_empty_state: "short_label_or_title",
  evidence_alias_expansion: "bullet_list",
  evidence_family_quarantine: "bullet_list",
  matter_family_contradiction: "narrative_prose",
  chase_source_contradictions: "bullet_list",
  provenance_title: "short_label_or_title",

  // Phase-2 / registry / render aliases (fail-closed if unmapped elsewhere)
  overview_safe_wording_card: "narrative_prose",
  overview_court_prep_card: "narrative_prose",
  overview_evidence_gaps_card: "bullet_list",
  overview_snapshot_boxes: "count_or_status_strip",
  overview_advanced_panel: "narrative_prose",
  confidence_dashboard: "count_or_status_strip",
  defence_decision_board: "narrative_prose",
  advice_change_radar: "narrative_prose",
  rerun_diff_panel: "narrative_prose",
  hearing_war_room_assistant: "narrative_prose",
  client_explanation_panel: "narrative_prose",
  reasoning_v2_panel: "narrative_prose",
  client_account_stress_test: "narrative_prose",
  supervisor_qa_panel: "narrative_prose",
  control_room_assistant: "narrative_prose",
  export_case_qa_pack: "narrative_prose",
  api_letters_draft: "narrative_prose",
  api_disclosure_request: "chase_request_sentence",
  api_hearing_prep: "narrative_prose",
  api_cases_hearing_prep: "narrative_prose",
  api_client_advice: "narrative_prose",
  api_bail_application: "narrative_prose",
  api_sentencing_mitigation: "narrative_prose",
  api_court_scripts: "narrative_prose",
  api_kill_shot: "narrative_prose",
  api_prosecution_weaknesses: "narrative_prose",
  api_propose_summary: "narrative_prose",
  api_strategy_export: "narrative_prose",
  api_strategy_ask: "narrative_prose",
  api_defence_plan_chat: "narrative_prose",
  api_executive_brief: "narrative_prose",
};

/** Resolve profile for a surface id (strips scale3000_ / phase11_* prefixes). */
export function resolveSolicitorBoundaryProfile(surfaceId: string): SolicitorBoundaryProfile {
  const raw = (surfaceId ?? "").trim();
  if (!raw) {
    throw new Error("BOUNDARY_PROFILE_MISSING: empty surfaceId");
  }
  const candidates = [
    raw,
    raw.replace(/^scale3000_/, ""),
    raw.replace(/^phase11_v\d+_/, ""),
    raw.replace(/^api_scale3000_/, "api_"),
  ];
  for (const id of candidates) {
    const p = PROFILE_BY_SURFACE[id];
    if (p) return p;
  }
  throw new Error(`BOUNDARY_PROFILE_MISSING: no profile declared for surfaceId=${surfaceId}`);
}

export function requireAllSurfacesHaveProfiles(surfaceIds: string[]): void {
  const missing: string[] = [];
  for (const id of surfaceIds) {
    try {
      resolveSolicitorBoundaryProfile(id);
    } catch {
      missing.push(id);
    }
  }
  if (missing.length) {
    throw new Error(`BOUNDARY_PROFILE_MISSING: ${missing.sort().join(", ")}`);
  }
}

function unbalancedDelimiter(text: string, open: string, close: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === open) depth += 1;
    else if (ch === close) depth = Math.max(0, depth - 1);
  }
  return depth > 0;
}

function midWordInToken(token: string): boolean {
  const last = token.replace(/[^A-Za-z]/g, "");
  if (last.length < 4 || !/^[A-Za-z]+$/.test(last)) return false;
  // Obvious stubs / hard cuts
  if (/^(outstan|provis|disclos|attribut|complaina|defenda|continui)$/i.test(last)) return true;
  return false;
}

function lineLooksMidWordCut(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 8) return false;
  if (/\.\.\.|…\s*$/.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] ?? "";
  return midWordInToken(last);
}

function normUnit(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function assessStructuredHeader(
  text: string,
  ctx?: BoundaryProfileContext,
): { ok: boolean; issues: SolicitorBoundaryIssue[] } {
  const issues: SolicitorBoundaryIssue[] = [];
  const t = text.trim();
  if (!t) return { ok: false, issues: ["empty"] };

  const client = t.match(/^Client:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const allegation = t.match(/^Allegation:\s*(.+)$/im)?.[1]?.trim() ?? "";
  if (!client || !allegation) {
    // Allow multi-field source_context style headers that include Client/Allegation lines
    const hasClient = /^Client:\s*\S+/im.test(t);
    const hasAllegation = /^Allegation:\s*\S+/im.test(t);
    if (!hasClient || !hasAllegation) issues.push("mid_sentence_cut");
  }

  for (const line of t.split(/\n/)) {
    if (lineLooksMidWordCut(line)) issues.push("mid_word_cut");
  }

  if (ctx?.expectedFields) {
    for (const [key, expected] of Object.entries(ctx.expectedFields)) {
      if (expected == null || String(expected).trim() === "") continue;
      const re = new RegExp(`^${key}:\\s*(.+)$`, "im");
      const got = t.match(re)?.[1]?.trim() ?? "";
      if (!got) {
        issues.push("mid_sentence_cut");
        continue;
      }
      // Truncation vs source: emitted field shorter than source and not equal
      const exp = String(expected).trim();
      if (got.length + 8 < exp.length && normUnit(exp).startsWith(normUnit(got))) {
        issues.push("mid_word_cut");
      } else if (normUnit(got) !== normUnit(exp) && !normUnit(exp).includes(normUnit(got))) {
        // Field present but does not match source semantic unit — treat as defect when clearly truncated
        if (exp.length > got.length && normUnit(exp).startsWith(normUnit(got))) {
          issues.push("mid_word_cut");
        }
      }
    }
  }

  if (unbalancedDelimiter(t, "(", ")") || unbalancedDelimiter(t, "[", "]")) issues.push("open_bracket");
  if (hasIncompleteRequiredDisclaimer(t)) issues.push("incomplete_disclaimer");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

function assessBulletList(
  text: string,
  ctx?: BoundaryProfileContext,
): { ok: boolean; issues: SolicitorBoundaryIssue[] } {
  const issues: SolicitorBoundaryIssue[] = [];
  const t = text.trim();
  if (!t) return { ok: false, issues: ["empty"] };

  const lines = t.split(/\n/).map((l) => l.trim()).filter(Boolean);
  // Allow a leading "Total N" strip line
  const bulletLines = lines.filter((l) => !/^Total\s+\d+\s*$/i.test(l) && l !== "(no chase items)");
  if (!bulletLines.length) return { ok: false, issues: ["empty"] };

  for (const line of bulletLines) {
    if (!/^([•\-*]|\d+\.)\s+\S/.test(line) && !/^[A-Z0-9].+—/.test(line)) {
      // Non-prefixed non-empty rows still allowed if they are complete label—state tuples
      if (!/\S/.test(line)) {
        issues.push("empty");
        continue;
      }
    }
    const body = line.replace(/^([•\-*]|\d+\.)\s+/, "").trim();
    if (!body) {
      issues.push("empty");
      continue;
    }
    if (lineLooksMidWordCut(body)) issues.push("mid_word_cut");
    if (/[-–—:,;]\s*$/.test(body)) issues.push("mid_sentence_cut");
    if (/\b(?:and|or|that|which|the|to|of|for|with|from|including)\s*$/i.test(body)) {
      issues.push("mid_sentence_cut");
    }
  }

  if (ctx?.expectedUnits?.length) {
    const emitted = bulletLines.map((l) => {
      const body = l.replace(/^([•\-*]|\d+\.)\s+/, "").trim();
      const parts = body.split(/\s+[—–-]\s+/);
      return {
        label: (parts[0] ?? body).trim(),
        state: parts.length > 1 ? (parts[parts.length - 1] ?? "").trim() : null,
      };
    });
    for (const exp of ctx.expectedUnits) {
      const expN = normUnit(exp.label);
      const hit = emitted.find((e) => normUnit(e.label) === expN || normUnit(e.label).includes(expN));
      if (!hit) {
        // Missing expected unit is a structural gap, not punctuation FP
        issues.push("mid_sentence_cut");
        continue;
      }
      if (exp.state) {
        const stateN = normUnit(String(exp.state));
        if (hit.state && !normUnit(hit.state).includes(stateN) && !stateN.includes(normUnit(hit.state))) {
          // State mismatch only when emitted looks truncated relative to expected
          if (String(exp.state).length > (hit.state?.length ?? 0) + 2) issues.push("mid_word_cut");
        }
      }
      if (exp.label.length > hit.label.length + 8 && normUnit(exp.label).startsWith(normUnit(hit.label))) {
        issues.push("mid_word_cut");
      }
    }
  }

  if (unbalancedDelimiter(t, "(", ")") || unbalancedDelimiter(t, "[", "]")) issues.push("open_bracket");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

const DEFAULT_COUNT_STRIP_RE =
  /^Served\s+\d+\s*·\s*Referred\s+\d+\s*·\s*Missing\s+\d+\s*·\s*Incomplete\s+\d+\s*·\s*Not safely confirmed\s+\d+\s*$/i;

function assessCountOrStatusStrip(
  text: string,
  ctx?: BoundaryProfileContext,
): { ok: boolean; issues: SolicitorBoundaryIssue[] } {
  const issues: SolicitorBoundaryIssue[] = [];
  const t = text.trim();
  if (!t) return { ok: false, issues: ["empty"] };
  if (lineLooksMidWordCut(t)) issues.push("mid_word_cut");
  if (/\.\.\.|…\s*$/.test(t)) issues.push("ellipsis_cut");
  const re = ctx?.stripTemplate ?? DEFAULT_COUNT_STRIP_RE;
  // Hearing / family strips are free-form short status — accept if non-empty and not mid-cut
  const looksLikeCountStrip = /Served\s+\d+/i.test(t);
  if (looksLikeCountStrip && !re.test(t)) issues.push("mid_sentence_cut");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

function assessShortLabelOrTitle(text: string): { ok: boolean; issues: SolicitorBoundaryIssue[] } {
  const issues: SolicitorBoundaryIssue[] = [];
  const t = text.trim();
  if (!t) return { ok: false, issues: ["empty"] };
  if (lineLooksMidWordCut(t)) issues.push("mid_word_cut");
  if (/\.\.\.|…\s*$/.test(t)) issues.push("ellipsis_cut");
  if (/[-–—:,;]\s*$/.test(t)) issues.push("mid_sentence_cut");
  if (unbalancedDelimiter(t, "(", ")") || unbalancedDelimiter(t, "[", "]")) issues.push("open_bracket");
  // Do NOT require terminal punctuation
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

/**
 * Profile-aware boundary assessment.
 * `narrative_prose` / `chase_request_sentence` reuse the full prose detector.
 */
export function assessSolicitorVisibleBoundaryForProfile(
  text: string | null | undefined,
  profile: SolicitorBoundaryProfile,
  ctx?: BoundaryProfileContext,
): { ok: boolean; issues: SolicitorBoundaryIssue[]; profile: SolicitorBoundaryProfile } {
  const raw = (text ?? "").trim();
  switch (profile) {
    case "narrative_prose":
    case "chase_request_sentence": {
      const r = assessSolicitorVisibleBoundary(raw);
      return { ok: r.ok, issues: r.issues, profile };
    }
    case "structured_header":
      return { ...assessStructuredHeader(raw, ctx), profile };
    case "bullet_list":
      return { ...assessBulletList(raw, ctx), profile };
    case "count_or_status_strip":
      return { ...assessCountOrStatusStrip(raw, ctx), profile };
    case "short_label_or_title":
      return { ...assessShortLabelOrTitle(raw), profile };
    default: {
      const _exhaustive: never = profile;
      throw new Error(`Unknown boundary profile: ${_exhaustive}`);
    }
  }
}

export function assessSolicitorVisibleBoundaryForSurface(
  text: string | null | undefined,
  surfaceId: string,
  ctx?: BoundaryProfileContext,
): { ok: boolean; issues: SolicitorBoundaryIssue[]; profile: SolicitorBoundaryProfile } {
  const profile = resolveSolicitorBoundaryProfile(surfaceId);
  return assessSolicitorVisibleBoundaryForProfile(text, profile, ctx);
}

export function listedBoundaryProfileSurfaceIds(): string[] {
  return Object.keys(PROFILE_BY_SURFACE).sort();
}
