/**
 * Shared evidence-state reconciliation: served / referred / missing / incomplete.
 * Modality-aware — clips ≠ master; incomplete transcript ≠ missing recording.
 * Generic evidence never acts as a wildcard for a specific request.
 */

export type SharedEvidenceState =
  | "served"
  | "referred_only"
  | "missing"
  | "incomplete"
  | "not_safely_confirmed";

export type EvidenceModality =
  | "recording"
  | "transcript"
  | "master_media"
  | "clip_or_still"
  | "bwv"
  | "cad_999"
  | "cad_extract"
  | "cad_audio"
  | "custody"
  | "interview"
  | "medical"
  | "generic";

export type EvidenceStateRow = {
  label: string;
  state: SharedEvidenceState;
  modality?: EvidenceModality;
  defendant?: string | null;
  countNumber?: number | null;
  aliases?: string[];
};

/** Order matters: specific families are resolved before the generic "recording". */
const MODALITY_PATTERNS: Array<{ modality: EvidenceModality; re: RegExp }> = [
  { modality: "clip_or_still", re: /\b(clips?|stills?|screenshots?|excerpts?|snippets?)\b/i },
  { modality: "master_media", re: /\b(master(?:\s+(?:cctv|footage|export|recording))?|full\s+(?:cctv|footage|video|export))\b/i },
  { modality: "transcript", re: /\btranscript\b/i },
  { modality: "bwv", re: /\b(bwv|body[-\s]?worn)\b/i },
  // CAD extract ≠ 999 audio (Grant Present extract must not suppress Dunn audio chase).
  { modality: "cad_extract", re: /\bcad(?:\s*\/\s*999)?(?:\s+incident\s+log)?\s+extract\b|\bcad\s+log\b(?!\s+full\s+print)/i },
  { modality: "cad_audio", re: /\b999\s+audio\b|\b999\s+call\s+recording\b|\bcall\s+audio\b/i },
  { modality: "cad_999", re: /\b(999|cad|dispatch|control\s*room)\b/i },
  { modality: "custody", re: /\b(custody\s+record|custody\s+log|detention\s+log)\b/i },
  // A qualifier wins over the bare noun: "interview recording" belongs to the
  // interview family, so a served body-worn recording cannot stand in for it.
  { modality: "interview", re: /\b(pace\s+interview|interview)\b/i },
  { modality: "medical", re: /\b(medical|hospital|A&E|injury\s+report|GP\s+notes?|clinical)\b/i },
  { modality: "recording", re: /\b(recording|audio\s+file|interview\s+tape|digital\s+recording)\b/i },
];

/**
 * Explicitly permitted modality relationships for service (not wildcards).
 * Generic is never listed — it cannot satisfy a specific request by modality alone.
 * CAD extract must NOT satisfy 999 audio (and vice versa).
 */
const PERMITTED_MODALITY_RELATIONSHIPS: ReadonlyArray<readonly [EvidenceModality, EvidenceModality]> = [
  ["interview", "recording"],
  ["bwv", "recording"],
];

export function inferEvidenceModality(label: string): EvidenceModality {
  for (const { modality, re } of MODALITY_PATTERNS) {
    if (re.test(label)) return modality;
  }
  return "generic";
}

/**
 * True when wording proves referred/listed/scheduled but not served/attached.
 * Outstanding alone is NOT enough.
 */
export function wordingIndicatesReferredOnly(text: string): boolean {
  const hay = text.toLowerCase();
  if (
    /\boutstanding\b/.test(hay) &&
    !/\breferred\b/.test(hay) &&
    !/\b(?:listed|scheduled)\b/.test(hay)
  ) {
    return false;
  }
  if (/^uncertain(?:\s+on\s+papers)?\s*:/i.test(text.trim())) return false;
  if (/^referred\s+only\s*:/i.test(text.trim()) || /\breferred\s+only\b/.test(hay)) return true;
  if (/\breferred\s+on\s+(?:mg6c?|schedule|index|disclosure)\b/.test(hay)) return true;
  if (/\breferred\s+to\b/.test(hay)) return true;
  if (/\b(?:listed|scheduled)\b[^.\n]{0,40}\bnot\s+(?:served|attached)\b/.test(hay)) return true;
  if (
    /\breferred\b/.test(hay) &&
    /\b(?:export\s+not\s+served|not\s+attached|not\s+included|not\s+on\s+bundle)\b/.test(hay)
  ) {
    return true;
  }
  // "confirm on file" alone is organisational chase boilerplate — not referred proof
  if (/\bmentioned but\b|\bnot safely served\b|\bnot safely on file\b/.test(hay)) return true;
  if (/\bnot\s+included\b|\bnot\s+attached\b|\bsummary\s+only\b/.test(hay)) return true;
  return false;
}

export function wordingIndicatesPartialIncomplete(text: string): boolean {
  return /\bincomplete\b|\bpartial\b|\blimited on (?:export|file)\b|\bdraft\b|\bunsigned\b/i.test(
    text,
  );
}

/**
 * Canonicalise existence from label + raw state.
 * Shared across view/copy/export/API/PDF/composed and ESA rematerialisation.
 * Never invents served. Outstanding alone does not become referred_only.
 */
export function canonicalizeEvidenceExistence(input: {
  label: string;
  rawExistence?: string | null;
  source?: string;
  baseStatus?: string;
}): SharedEvidenceState | "other_defendant_only" | "unknown" {
  const raw = (input.rawExistence ?? "").toLowerCase().replace(/\s+/g, "_");
  if (raw === "other_defendant_only") return "other_defendant_only";

  const hay = `${input.label} ${input.source ?? ""} ${input.baseStatus ?? ""}`;

  // Explicit co-def precision preserved
  if (/\bco-defendant-only\b|\bnot this defendant\b/i.test(hay)) {
    return "other_defendant_only";
  }

  // Referred/listed language wins over missing/incomplete collapse (F01/F02)
  if (wordingIndicatesReferredOnly(hay)) {
    // Partial extract that is also referred stays incomplete only when the unit
    // itself is a partial artefact AND there is no explicit referred-on-MG6 clause.
    if (
      wordingIndicatesPartialIncomplete(hay) &&
      !/\breferred\s+on\s+(?:mg6c?|schedule)\b/i.test(hay) &&
      !/^referred\s+only\s*:/i.test(input.label.trim())
    ) {
      return "incomplete";
    }
    return "referred_only";
  }

  if (raw === "served" || raw === "received") return "served";
  if (raw === "referred_only" || raw === "referred") return "referred_only";
  if (raw === "incomplete" || raw === "partial") return "incomplete";
  if (raw === "missing" || raw === "outstanding" || raw === "absent") return "missing";
  if (raw === "not_safely_confirmed" || raw === "unclear") return "not_safely_confirmed";
  if (raw === "unknown") return "unknown";

  return reconcileEvidenceState({
    label: input.label,
    source: input.source,
    baseStatus: input.baseStatus,
    explicitState: input.rawExistence,
  });
}

/** Normalize chase/status text into shared evidence state — incomplete ≠ missing. */
export function reconcileEvidenceState(input: {
  label: string;
  source?: string;
  baseStatus?: string;
  evidenceAnchor?: string | null;
  explicitState?: string | null;
  /** Chase whyItMatters / note — used for referred-only cues only, never as outstanding proof. */
  note?: string | null;
}): SharedEvidenceState {
  if (input.explicitState) {
    const e = input.explicitState.toLowerCase().replace(/\s+/g, "_");
    if (e === "other_defendant_only") return "referred_only"; // live shared enum lacks ODO
    if (e === "served" || e === "received") return "served";
    if (e === "referred_only" || e === "referred") return "referred_only";
    if (e === "incomplete" || e === "partial") return "incomplete";
    if (e === "missing" || e === "outstanding" || e === "absent") return "missing";
    if (e === "not_safely_confirmed" || e === "unclear") return "not_safely_confirmed";
  }

  // Label + anchor only for existence cues. Organisational chase chips (Outstanding /
  // Overdue) must not poison the hay into missing when whyItMatters says referred.
  const labelHay = `${input.label} ${input.evidenceAnchor ?? ""}`;
  const referredHay = `${labelHay} ${input.note ?? ""}`;
  const status = (input.baseStatus ?? "").toLowerCase().replace(/_/g, " ").trim();

  // Referred/listed/scheduled-not-served BEFORE outstanding/not-served (F01)
  if (wordingIndicatesReferredOnly(referredHay)) {
    return "referred_only";
  }
  // Partial/incomplete for the unit itself (not referred-only aggregates)
  if (wordingIndicatesPartialIncomplete(labelHay)) {
    return "incomplete";
  }
  // Content-level missing cues on the unit label/anchor only (not chase status chips,
  // not "appears outstanding" why-boilerplate).
  if (/\boutstanding\b|\bnot served\b|\bmissing\b|\babsent\b|\bnot provided\b/i.test(labelHay)) {
    return "missing";
  }
  if (status === "received" || /\bserved\b/i.test(labelHay)) {
    return "served";
  }
  // Organisational / raw status chips (not content) — after referred/partial label cues
  if (status === "partial" || status === "incomplete" || status === "draft" || status === "unsigned") {
    return "incomplete";
  }
  // Genuine chase deadline chips without referred/partial/content cues → missing
  if (
    status === "outstanding" ||
    status === "overdue" ||
    status === "due soon" ||
    status === "chased"
  ) {
    return "missing";
  }
  if (status === "not safely confirmed" || status === "unclear") {
    return "not_safely_confirmed";
  }
  return "not_safely_confirmed";
}

function labelsExactOrAliasMatch(requestLabel: string, row: EvidenceStateRow): boolean {
  const reqKey = normalizeAliasKey(requestLabel);
  if (!reqKey) return false;
  if (normalizeAliasKey(row.label) === reqKey) return true;
  return (row.aliases ?? []).some((a) => normalizeAliasKey(a) === reqKey);
}

/**
 * Whether a served/incomplete row may satisfy a chase request.
 * Requires exact/alias match, the same specific modality, or an explicitly permitted relationship.
 * Generic evidence never acts as a wildcard.
 */
export function evidenceMaySatisfyRequest(
  requestLabel: string,
  row: EvidenceStateRow,
): { match: boolean; basis: "exact_or_alias" | "same_modality" | "permitted_relationship" | null } {
  const reqMod = inferEvidenceModality(requestLabel);
  const rowMod = row.modality ?? inferEvidenceModality(row.label);

  if (labelsExactOrAliasMatch(requestLabel, row)) {
    return { match: true, basis: "exact_or_alias" };
  }

  // Generic never satisfies by modality alone — either side being generic blocks modality matching.
  if (reqMod === "generic" || rowMod === "generic") {
    return { match: false, basis: null };
  }

  if (reqMod === rowMod) {
    return { match: true, basis: "same_modality" };
  }

  if (modalitiesHavePermittedRelationship(reqMod, rowMod)) {
    return { match: true, basis: "permitted_relationship" };
  }

  return { match: false, basis: null };
}

/**
 * Whether a chase request for `requestLabel` should be suppressed because
 * equivalent material is already served (or incomplete, not missing).
 */
export function shouldSuppressChaseAsAlreadyOnFile(
  requestLabel: string,
  rows: EvidenceStateRow[],
): { suppress: boolean; reason: string | null } {
  const reqMod = inferEvidenceModality(requestLabel);

  for (const row of rows) {
    const rowMod = row.modality ?? inferEvidenceModality(row.label);
    const { match, basis } = evidenceMaySatisfyRequest(requestLabel, row);
    if (!match) continue;

    // Served recording does not satisfy a request for a missing transcript.
    if (row.state === "served") {
      if (reqMod === "transcript" && rowMod === "recording") {
        continue;
      }
      if (reqMod === "master_media" && rowMod === "clip_or_still") {
        // Clips do not prove master served (even if alias-adjacent).
        if (basis !== "exact_or_alias") continue;
        // Exact label match of a clip still does not prove master — clips never satisfy master.
        continue;
      }
      // CAD extract / log does not prove 999 audio (and vice versa).
      if (
        (reqMod === "cad_audio" && (rowMod === "cad_extract" || rowMod === "cad_999")) ||
        (reqMod === "cad_extract" && rowMod === "cad_audio") ||
        (reqMod === "cad_999" && rowMod === "cad_extract" && /audio|recording/i.test(requestLabel))
      ) {
        continue;
      }
      if (
        basis === "exact_or_alias" ||
        basis === "same_modality" ||
        basis === "permitted_relationship"
      ) {
        return {
          suppress: true,
          reason: `${row.label} is already on file (${basis.replace(/_/g, " ")}) — do not chase as absent`,
        };
      }
    }

    if (row.state === "incomplete" && reqMod === "recording" && rowMod === "recording") {
      return {
        suppress: true,
        reason: "Recording is on file but incomplete — not missing",
      };
    }
  }

  // Special: served recording + incomplete transcript must not be labelled missing recording
  if (reqMod === "recording") {
    const recordingServed = rows.some(
      (r) =>
        (r.modality ?? inferEvidenceModality(r.label)) === "recording" && r.state === "served",
    );
    const transcriptIncomplete = rows.some(
      (r) =>
        (r.modality ?? inferEvidenceModality(r.label)) === "transcript" &&
        (r.state === "incomplete" || r.state === "referred_only"),
    );
    if (recordingServed && transcriptIncomplete) {
      return {
        suppress: true,
        reason: "Recording served; incomplete transcript is not a missing recording",
      };
    }
  }

  return { suppress: false, reason: null };
}

function modalitiesHavePermittedRelationship(a: EvidenceModality, b: EvidenceModality): boolean {
  if (a === "generic" || b === "generic") return false;
  for (const [x, y] of PERMITTED_MODALITY_RELATIONSHIPS) {
    if ((a === x && b === y) || (a === y && b === x)) return true;
  }
  return false;
}

/** @deprecated Prefer evidenceMaySatisfyRequest — kept for callers that only need boolean compatibility. */
export function modalitiesCompatibleForService(a: EvidenceModality, b: EvidenceModality): boolean {
  if (a === "generic" || b === "generic") return false;
  if (a === b) return true;
  return modalitiesHavePermittedRelationship(a, b);
}

function normalizeAliasKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|full|complete|served|outstanding|missing)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map shared state onto presentation SourceStateKind-compatible values. */
export function sharedStateToSourceStateKind(
  state: SharedEvidenceState,
): "served" | "referred_only" | "missing" | "incomplete" | "not_safely_confirmed" | "provisional" {
  if (state === "incomplete") return "incomplete";
  return state;
}

/**
 * materialNotSafelyServed with modality awareness:
 * a served clip does not satisfy a master-media requirement;
 * generic evidence does not satisfy a specific request.
 */
export function materialSafelyServedForRequest(
  materials: Array<{ label: string; detail?: string | null; status: string }>,
  requestPattern: RegExp,
  options?: { requireModality?: EvidenceModality; requestLabel?: string },
): boolean {
  const rows = materials.filter((m) =>
    requestPattern.test(`${m.label} ${m.detail ?? ""}`),
  );
  if (!rows.length) return false;

  const requireMod = options?.requireModality;
  const requestLabel = options?.requestLabel ?? "";

  return rows.some((m) => {
    if (m.status !== "served") return false;
    const mod = inferEvidenceModality(m.label);
    if (requireMod === "master_media" && mod === "clip_or_still") return false;
    if (requireMod === "recording" && mod === "transcript") return false;
    if (requireMod && (mod === "generic" || requireMod === "generic")) return false;
    if (requireMod && mod !== requireMod && !modalitiesHavePermittedRelationship(requireMod, mod)) {
      return false;
    }
    if (requestLabel) {
      return evidenceMaySatisfyRequest(requestLabel, {
        label: m.label,
        state: "served",
        modality: mod,
      }).match;
    }
    if (requireMod) return mod === requireMod || modalitiesHavePermittedRelationship(requireMod, mod);
    // Without a specific request label or modality, pattern match alone is insufficient
    // when the material is generic.
    return mod !== "generic";
  });
}
