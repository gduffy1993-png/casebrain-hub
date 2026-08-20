/**
 * Case Moves Engine — Strategy Fight Map
 *
 * Pure, deterministic conversion of already-known CaseBrain case signals into
 * tactical defence moves. This module sits ABOVE file-reading: it never
 * decides facts, it only reasons from the fields it is handed.
 *
 * Hard rules (do not relax without review):
 *   - No I/O: no fetch, no DB, no LLM, no env reads, no file system.
 *   - Same input → same output, every time (deterministic).
 *   - Never invents prosecution or defence facts. Every emitted move declares
 *     the signals that triggered it (`triggerSignals` + `sourceSignals`).
 *   - Anything assumed but not confirmed is listed in `unsupportedAssumptions`.
 *   - Missing evidence is framed as disclosure pressure or "no safe strategy",
 *     never as a finding of fact for the defence.
 *   - Wording is solicitor-safe and court-safe (no dramatic language).
 *   - Confidence cannot be "high" if the move depends on missing material.
 *   - If a move is based only on bundleTextPreview, confidence is capped at
 *     "medium" (and usually "low").
 *
 * Recovery note (legal-intelligence-recovery-v1):
 *   Restored from 6de1c4c24 and adapted to sit ABOVE canonical truth as an
 *   advisory Case Moves layer. Prefer consuming outputs via
 *   `lib/criminal/legal-intelligence` (PRACTITIONER_CONSIDERATION). Do not use
 *   this module to rewrite evidence existence/served/missing/modality or chase
 *   counters. Self-defence / lawful-excuse moves remain tactical templates —
 *   they must not be treated as established case theory without instructions.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CaseMoveCategory =
  | "disclosure"
  | "identification"
  | "interview"
  | "witness"
  | "intent"
  | "dishonesty"
  | "causation"
  | "self_defence"
  | "lawful_excuse"
  | "lawful_reason"
  | "forensic"
  | "medical"
  | "phone_evidence"
  | "driving_standard"
  | "supply_inference"
  | "no_safe_strategy"
  | "damage_limitation";

export type CaseMoveSignalSource =
  | "allegation"
  | "offence_type"
  | "current_stage"
  | "mg6_summary"
  | "served_evidence"
  | "outstanding_evidence"
  | "missing_evidence"
  | "interview_summary"
  | "exhibit_codes"
  | "inconsistencies"
  | "prosecution_weakness"
  | "defence_weakness"
  | "next_actions"
  | "bundle_text_preview"
  | "strategy_summary"
  | "derived";

export type CaseMoveSignal = {
  id: string;
  label: string;
  detail?: string;
  source: CaseMoveSignalSource;
  /** True if the signal came from a structured field. False if derived only
   *  from bundleTextPreview heuristics. */
  evidenceBacked: boolean;
};

export type CaseMoveLeverage = {
  id: string;
  label: string;
  description: string;
  /** Signal ids supporting this leverage point. */
  signals: string[];
  strength: "low" | "medium" | "high";
};

export type CrownCounter = {
  expectedMove: string;
  defenceResponse: string;
};

export type JudgeConstraint = {
  considerationsTheJudgeWillWeigh: string;
  reasonablenessTest: string;
};

export type KillSwitch = {
  triggerEvent: string;
  pivotRecommendation: string;
};

export type CaseMove = {
  id: string;
  title: string;
  category: CaseMoveCategory;
  /** Short labels naming the conditions that triggered the move. */
  triggerSignals: string[];
  /** Signal ids (from `signals[]`) that this move was built from. */
  sourceSignals: string[];
  /** Anything this move would normally assume, that the input did NOT confirm. */
  unsupportedAssumptions: string[];
  leveragePoint: string;
  recommendedMove: string;
  whyItMatters: string;
  crownCounter: CrownCounter;
  judgeConstraint: JudgeConstraint;
  risk: string;
  killSwitch: KillSwitch;
  nextAction: string;
  confidence: "low" | "medium" | "high";
  sourceDisciplineNote: string;
};

export type CaseMovesResult = {
  signals: CaseMoveSignal[];
  leverage: CaseMoveLeverage[];
  moves: CaseMove[];
  blockedOrUnsafeRoutes: string[];
  overallRiskLevel: "low" | "medium" | "high";
  nextBestActions: string[];
  sourceDisciplineSummary: string;
};

export type BuildCaseMovesInput = {
  caseId?: string;
  allegation?: string;
  offenceType?: string;
  currentStage?: string;
  mg6Summary?: string;
  servedEvidence?: string[];
  outstandingEvidence?: string[];
  missingEvidence?: string[];
  interviewSummary?: string;
  exhibitCodes?: string[];
  inconsistencies?: string[];
  prosecutionWeakness?: string;
  defenceWeakness?: string;
  nextActions?: string[];
  bundleTextPreview?: string;
  strategySummary?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Lowercase, collapse whitespace, trim. Safe on undefined.
 * Pure — no locale-dependent calls beyond toLowerCase.
 */
export function normaliseText(value: string | undefined | null): string {
  if (!value) return "";
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Returns true if any of `terms` appears as a substring of `text`. Case-
 * insensitive (assumes `text` is already normalised, but tolerates raw input).
 */
export function hasAny(text: string, terms: readonly string[]): boolean {
  if (!text) return false;
  const haystack = text.includes(" ") || text === text.toLowerCase()
    ? text
    : text.toLowerCase();
  for (const term of terms) {
    if (!term) continue;
    if (haystack.includes(term.toLowerCase())) return true;
  }
  return false;
}

/** Join a list of optional string fields into one normalised search string. */
function joinFields(parts: ReadonlyArray<string | undefined | null>): string {
  const buf: string[] = [];
  for (const p of parts) {
    const n = normaliseText(p ?? undefined);
    if (n) buf.push(n);
  }
  return buf.join(" \u2003 ");
}

/** Join an optional list of strings into one normalised search string. */
function joinList(list: readonly string[] | undefined): string {
  if (!list || list.length === 0) return "";
  return normaliseText(list.join(" \u2003 "));
}

/** Stable, deterministic comparator on string ids. */
function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Signal detection
// ---------------------------------------------------------------------------

type SignalCtx = {
  /** All structured-field text combined (high-trust). */
  structured: string;
  /** Only the bundleTextPreview text (low-trust — can never push to "high"). */
  bundlePreview: string;
  /** Outstanding + missing evidence list combined and normalised. */
  gaps: string;
  /** Served evidence combined and normalised. */
  served: string;
  /** Interview summary, normalised. */
  interview: string;
  /** Inconsistencies list combined and normalised. */
  inconsistencies: string;
  /** Strategy summary, normalised. */
  strategy: string;
  /** Defence weakness, normalised. */
  defenceWeakness: string;
  /** Prosecution weakness, normalised. */
  prosecutionWeakness: string;
  /** MG6 summary, normalised. */
  mg6: string;
  /** Allegation + offenceType, normalised. */
  charge: string;
  /** Exhibit codes joined and normalised. */
  exhibits: string;
  /** Whether exhibit codes were supplied at all. */
  exhibitsProvided: boolean;
  /** Original input (used for length / emptiness checks). */
  input: BuildCaseMovesInput;
};

function buildCtx(input: BuildCaseMovesInput): SignalCtx {
  const structured = joinFields([
    input.mg6Summary,
    input.interviewSummary,
    input.prosecutionWeakness,
    input.defenceWeakness,
    input.strategySummary,
    joinList(input.servedEvidence),
    joinList(input.outstandingEvidence),
    joinList(input.missingEvidence),
    joinList(input.inconsistencies),
    joinList(input.nextActions),
    joinList(input.exhibitCodes),
    input.allegation,
    input.offenceType,
    input.currentStage,
  ]);
  return {
    structured,
    bundlePreview: normaliseText(input.bundleTextPreview),
    gaps: joinFields([
      joinList(input.outstandingEvidence),
      joinList(input.missingEvidence),
    ]),
    served: joinList(input.servedEvidence),
    interview: normaliseText(input.interviewSummary),
    inconsistencies: joinList(input.inconsistencies),
    strategy: normaliseText(input.strategySummary),
    defenceWeakness: normaliseText(input.defenceWeakness),
    prosecutionWeakness: normaliseText(input.prosecutionWeakness),
    mg6: normaliseText(input.mg6Summary),
    charge: joinFields([input.allegation, input.offenceType]),
    exhibits: joinList(input.exhibitCodes),
    exhibitsProvided: Array.isArray(input.exhibitCodes) && input.exhibitCodes.length > 0,
    input,
  };
}

/** Add a signal to `out` only if the same id has not already been added. */
function pushSignal(
  out: CaseMoveSignal[],
  seen: Set<string>,
  signal: CaseMoveSignal,
): void {
  if (seen.has(signal.id)) return;
  seen.add(signal.id);
  out.push(signal);
}

/**
 * Detect signals from the input. Order is fixed for determinism: disclosure
 * gaps first, then interview, then defence positions, then bundle health.
 */
export function detectSignals(input: BuildCaseMovesInput): CaseMoveSignal[] {
  const ctx = buildCtx(input);
  const out: CaseMoveSignal[] = [];
  const seen = new Set<string>();

  // -- Disclosure / evidence -------------------------------------------------

  // Full CCTV outstanding
  if (
    hasAny(ctx.gaps, ["cctv"]) &&
    hasAny(ctx.gaps, ["full", "complete", "entire", "unedited", "outstanding", "missing", "awaiting", "awaited", "not served"])
  ) {
    pushSignal(out, seen, {
      id: "signal:cctv-full-outstanding",
      label: "Full CCTV outstanding",
      detail: "CCTV referenced in outstanding/missing material list.",
      source: hasAny(joinList(input.missingEvidence), ["cctv"]) ? "missing_evidence" : "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Partial CCTV only served
  if (hasAny(ctx.served, ["cctv"]) && hasAny(ctx.served, ["partial", "excerpt", "clip", "limited", "edited"])) {
    pushSignal(out, seen, {
      id: "signal:cctv-partial-only",
      label: "Partial CCTV only served",
      source: "served_evidence",
      evidenceBacked: true,
    });
  } else if (hasAny(ctx.bundlePreview, ["partial cctv", "cctv excerpt", "edited cctv", "limited cctv"])) {
    pushSignal(out, seen, {
      id: "signal:cctv-partial-only",
      label: "Partial CCTV referenced in bundle preview",
      source: "bundle_text_preview",
      evidenceBacked: false,
    });
  }

  // CCTV not identified
  if (hasAny(ctx.structured, ["cctv not identified", "no cctv identified", "cctv unknown", "cctv source unclear"])) {
    pushSignal(out, seen, {
      id: "signal:cctv-not-identified",
      label: "CCTV source not identified",
      source: "mg6_summary",
      evidenceBacked: true,
    });
  }

  // MG11 missing / outstanding witness statements
  if (
    hasAny(ctx.gaps, ["mg11", "witness statement"]) ||
    hasAny(ctx.structured, ["mg11 outstanding", "mg11 missing", "witness statement missing", "no mg11 served"])
  ) {
    pushSignal(out, seen, {
      id: "signal:mg11-outstanding",
      label: "MG11 / witness statement outstanding",
      source: hasAny(ctx.gaps, ["mg11", "witness statement"]) ? "outstanding_evidence" : "mg6_summary",
      evidenceBacked: true,
    });
  }

  // 999 call missing or not referenced
  if (
    hasAny(ctx.gaps, ["999"]) ||
    hasAny(ctx.structured, ["999 missing", "no 999", "999 not referenced", "999 audio outstanding"])
  ) {
    pushSignal(out, seen, {
      id: "signal:999-missing",
      label: "999 call audio missing or not referenced",
      source: "missing_evidence",
      evidenceBacked: true,
    });
  }

  // CAD missing / arrest-only
  if (
    hasAny(ctx.gaps, ["cad"]) ||
    hasAny(ctx.structured, ["cad missing", "arrest-only cad", "cad arrest only", "no cad"])
  ) {
    pushSignal(out, seen, {
      id: "signal:cad-missing",
      label: "CAD log missing or arrest-only",
      source: "missing_evidence",
      evidenceBacked: true,
    });
  }

  // BWV partial / continuity outstanding
  if (
    hasAny(ctx.structured, ["bwv partial", "partial bwv", "bwv continuity", "bwv outstanding"]) ||
    (hasAny(ctx.gaps, ["bwv"]) && hasAny(ctx.gaps, ["partial", "continuity", "outstanding", "missing"]))
  ) {
    pushSignal(out, seen, {
      id: "signal:bwv-partial",
      label: "BWV partial or continuity outstanding",
      source: "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Forensic / lab report outstanding
  if (
    hasAny(ctx.gaps, ["forensic", "lab report", "dna", "fingerprint"]) ||
    hasAny(ctx.structured, ["forensic outstanding", "lab report awaited", "forensics awaited"])
  ) {
    pushSignal(out, seen, {
      id: "signal:forensic-outstanding",
      label: "Forensic / lab report outstanding",
      source: "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Medical evidence awaited
  if (
    hasAny(ctx.gaps, ["medical", "a&e", "ae notes", "hospital records"]) ||
    hasAny(ctx.structured, ["medical awaited", "medical outstanding", "injury report awaited"])
  ) {
    pushSignal(out, seen, {
      id: "signal:medical-awaited",
      label: "Medical evidence awaited",
      source: "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Phone download outstanding
  if (
    hasAny(ctx.gaps, ["phone download", "device download", "cellsite", "mobile data"]) ||
    hasAny(ctx.structured, ["phone download outstanding", "device download awaited"])
  ) {
    pushSignal(out, seen, {
      id: "signal:phone-download-outstanding",
      label: "Phone / device download outstanding",
      source: "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Exhibit list blank or limited
  if (!ctx.exhibitsProvided) {
    pushSignal(out, seen, {
      id: "signal:exhibit-list-blank",
      label: "No exhibit codes supplied",
      source: "exhibit_codes",
      evidenceBacked: true,
    });
  } else if ((input.exhibitCodes ?? []).length <= 2) {
    pushSignal(out, seen, {
      id: "signal:exhibit-list-limited",
      label: "Exhibit list very limited",
      source: "exhibit_codes",
      evidenceBacked: true,
    });
  }

  // Custody record missing
  if (
    hasAny(ctx.gaps, ["custody record", "custody log", "custody cctv"]) ||
    hasAny(ctx.structured, ["custody record missing", "custody log outstanding"])
  ) {
    pushSignal(out, seen, {
      id: "signal:custody-record-missing",
      label: "Custody record missing or outstanding",
      source: "outstanding_evidence",
      evidenceBacked: true,
    });
  }

  // Interview missing / not served
  const interviewMentioned =
    !!ctx.interview ||
    hasAny(ctx.served, ["interview", "rom", "rom interview"]) ||
    hasAny(ctx.structured, ["interview served"]);
  if (
    !interviewMentioned ||
    hasAny(ctx.structured, ["interview not served", "interview missing", "no interview record"])
  ) {
    pushSignal(out, seen, {
      id: "signal:interview-missing",
      label: "Interview record missing or not served",
      source: ctx.interview ? "mg6_summary" : "interview_summary",
      evidenceBacked: true,
    });
  }

  // -- Interview content -----------------------------------------------------

  if (hasAny(ctx.interview, ["no comment"]) || hasAny(ctx.structured, ["no comment interview"])) {
    pushSignal(out, seen, {
      id: "signal:interview-no-comment",
      label: "No comment interview",
      source: "interview_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(ctx.interview, ["prepared statement"])) {
    pushSignal(out, seen, {
      id: "signal:interview-prepared-statement",
      label: "Prepared statement given",
      source: "interview_summary",
      evidenceBacked: true,
    });
  }

  const admissionTerms = ["admitted", "admission", "confessed", "accepted that", "agreed he"];
  const partialAdmissionTerms = ["partial admission", "admitted some", "accepted in part"];
  const denialTerms = ["denied", "denial", "rejected the allegation", "denies"];

  if (hasAny(ctx.interview, partialAdmissionTerms) || hasAny(ctx.structured, partialAdmissionTerms)) {
    pushSignal(out, seen, {
      id: "signal:interview-partial-admission",
      label: "Partial admission in interview",
      source: "interview_summary",
      evidenceBacked: true,
    });
  } else if (hasAny(ctx.interview, admissionTerms)) {
    pushSignal(out, seen, {
      id: "signal:interview-admission",
      label: "Admission in interview",
      source: "interview_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(ctx.interview, denialTerms) || hasAny(ctx.structured, ["denial in interview"])) {
    pushSignal(out, seen, {
      id: "signal:interview-denial",
      label: "Denial in interview",
      source: "interview_summary",
      evidenceBacked: true,
    });
  }

  // Interview account conflicts with served bundle
  if (
    ctx.inconsistencies.length > 0 ||
    hasAny(ctx.structured, ["interview conflicts", "account conflicts", "inconsistent with bundle"])
  ) {
    pushSignal(out, seen, {
      id: "signal:interview-conflicts-bundle",
      label: "Interview account appears to conflict with served material",
      source: ctx.inconsistencies.length > 0 ? "inconsistencies" : "mg6_summary",
      evidenceBacked: true,
    });
  }

  // -- Defence positions -----------------------------------------------------

  const defenceText = `${ctx.strategy} ${ctx.defenceWeakness} ${ctx.mg6}`;

  if (hasAny(defenceText, ["id disputed", "identification disputed", "identity disputed", "identification in issue", "wrong person"])) {
    pushSignal(out, seen, {
      id: "signal:id-disputed",
      label: "Identification disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["dishonesty disputed", "no dishonesty", "honest belief"])) {
    pushSignal(out, seen, {
      id: "signal:dishonesty-disputed",
      label: "Dishonesty disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["intent disputed", "no intent", "lack of intent", "intent in issue"])) {
    pushSignal(out, seen, {
      id: "signal:intent-disputed",
      label: "Intent disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["causation disputed", "causation in issue", "novus actus"])) {
    pushSignal(out, seen, {
      id: "signal:causation-disputed",
      label: "Causation disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["self-defence", "self defence", "defending himself", "defending herself", "defending themselves"])) {
    pushSignal(out, seen, {
      id: "signal:self-defence-raised",
      label: "Self-defence raised",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["lawful excuse"])) {
    pushSignal(out, seen, {
      id: "signal:lawful-excuse-raised",
      label: "Lawful excuse raised",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["lawful reason", "lawful authority"])) {
    pushSignal(out, seen, {
      id: "signal:lawful-reason-raised",
      label: "Lawful reason raised",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (hasAny(defenceText, ["standard of driving disputed", "manner of driving disputed", "driving standard in issue"])) {
    pushSignal(out, seen, {
      id: "signal:driving-standard-disputed",
      label: "Standard of driving disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (
    hasAny(defenceText, ["supply inference", "intent to supply disputed", "personal use"]) &&
    hasAny(ctx.charge, ["supply", "psa", "drugs"])
  ) {
    pushSignal(out, seen, {
      id: "signal:supply-inference-disputed",
      label: "Supply inference disputed",
      source: "strategy_summary",
      evidenceBacked: true,
    });
  }

  if (
    hasAny(defenceText, ["client account conflicts", "client conflicts with bundle", "account inconsistent"]) ||
    (ctx.inconsistencies.length > 0 && hasAny(ctx.inconsistencies, ["client", "account"]))
  ) {
    pushSignal(out, seen, {
      id: "signal:client-account-conflicts",
      label: "Client account conflicts with served material",
      source: "defence_weakness",
      evidenceBacked: true,
    });
  }

  // -- Bundle health (always last so other signals are weighed first) -------

  // Thin bundle: very short bundleTextPreview, OR more than two missing items,
  // OR strategy summary explicitly flags thinness.
  const bundlePreviewLen = ctx.bundlePreview.length;
  const missingCount =
    (input.missingEvidence?.length ?? 0) + (input.outstandingEvidence?.length ?? 0);
  const thinFlagged = hasAny(ctx.strategy, ["thin bundle", "limited material", "insufficient material"]);
  if (
    thinFlagged ||
    missingCount >= 3 ||
    (input.bundleTextPreview !== undefined && bundlePreviewLen > 0 && bundlePreviewLen < 200)
  ) {
    pushSignal(out, seen, {
      id: "signal:thin-bundle",
      label: "Thin bundle — unsafe to finalise strategy",
      detail:
        thinFlagged
          ? "Strategy summary explicitly flags limited material."
          : missingCount >= 3
            ? `${missingCount} outstanding/missing items recorded.`
            : "bundleTextPreview is very short.",
      source: thinFlagged ? "strategy_summary" : missingCount >= 3 ? "missing_evidence" : "bundle_text_preview",
      evidenceBacked: !(missingCount === 0 && !thinFlagged),
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Move builders
// ---------------------------------------------------------------------------

/** Quick lookup helper: do we have a signal with this id? */
function has(signals: ReadonlyArray<CaseMoveSignal>, id: string): boolean {
  for (const s of signals) if (s.id === id) return true;
  return false;
}

/** Get a signal by id (or undefined). */
function get(signals: ReadonlyArray<CaseMoveSignal>, id: string): CaseMoveSignal | undefined {
  for (const s of signals) if (s.id === id) return s;
  return undefined;
}

/** Compute a confidence value, applying the engine's standing rules. */
function computeConfidence(opts: {
  /** Signals this move is built from. */
  sources: ReadonlyArray<CaseMoveSignal>;
  /** Does the move depend on something that is currently missing? */
  dependsOnMissingEvidence: boolean;
}): "low" | "medium" | "high" {
  if (opts.sources.length === 0) return "low";
  const onlyBundlePreview = opts.sources.every((s) => s.source === "bundle_text_preview");
  if (onlyBundlePreview) return "low";
  if (opts.dependsOnMissingEvidence) return "medium";
  // Otherwise: high if at least two structured signals back the move, else medium.
  const structuredCount = opts.sources.filter((s) => s.evidenceBacked).length;
  return structuredCount >= 2 ? "high" : "medium";
}

const SOURCE_DISCIPLINE_NOTE =
  "Move generated only from explicit input fields. No facts inferred beyond declared signals.";

const SOURCE_DISCIPLINE_NOTE_PREVIEW_ONLY =
  "Move based only on bundleTextPreview heuristics. Treat as prompt for review, not as a finding.";

function noteFor(sources: ReadonlyArray<CaseMoveSignal>): string {
  const onlyBundlePreview = sources.length > 0 && sources.every((s) => s.source === "bundle_text_preview");
  return onlyBundlePreview ? SOURCE_DISCIPLINE_NOTE_PREVIEW_ONLY : SOURCE_DISCIPLINE_NOTE;
}

// -- Disclosure ------------------------------------------------------------

export function buildDisclosureMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const out: CaseMove[] = [];

  // Helper to assemble a generic disclosure-pressure move.
  const make = (opts: {
    id: string;
    title: string;
    item: string;
    sourceIds: string[];
    triggerLabels: string[];
    nextAction: string;
  }): CaseMove | null => {
    const sources = opts.sourceIds.map((id) => get(signals, id)).filter((s): s is CaseMoveSignal => !!s);
    if (sources.length === 0) return null;
    return {
      id: opts.id,
      title: opts.title,
      category: "disclosure",
      triggerSignals: opts.triggerLabels,
      sourceSignals: sources.map((s) => s.id),
      unsupportedAssumptions: [
        `Content of ${opts.item} is unknown until served — no assumption is made about whether it helps or hurts the defence.`,
      ],
      leveragePoint: `Disclosure pressure: ${opts.item} has not been provided in usable form.`,
      recommendedMove: `Issue a written disclosure request for ${opts.item}, citing CPIA s.3 and the disclosure officer's continuing duty. Set a 14-day deadline and copy the prosecutor.`,
      whyItMatters: `${opts.item} is material to a fair assessment. Without it, the defence cannot finalise position and the prosecution cannot demonstrate compliance with disclosure duties.`,
      crownCounter: {
        expectedMove: `Crown may state ${opts.item} is "not in their possession" or "not relevant".`,
        defenceResponse: `Press for a written explanation of searches conducted; invite the court to note non-compliance at the next hearing if not produced.`,
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the prosecution has discharged its CPIA duty and whether non-disclosure prejudices a fair trial.",
        reasonablenessTest: "Has the defence asked clearly, in writing, with a reasonable deadline, and has the prosecution given a reasoned response?",
      },
      risk: `Strategy cannot be finalised on ${opts.item} until it is served. Treat any current view as provisional.`,
      killSwitch: {
        triggerEvent: `${opts.item} is served and undermines the current defence theory.`,
        pivotRecommendation: "Re-run case assessment, revise defence statement if served, and consider damage-limitation or basis-of-plea options.",
      },
      nextAction: opts.nextAction,
      confidence: computeConfidence({ sources, dependsOnMissingEvidence: true }),
      sourceDisciplineNote: noteFor(sources),
    };
  };

  const candidates: Array<Parameters<typeof make>[0]> = [
    {
      id: "move:disclosure-cctv-full",
      title: "Chase full CCTV (continuity + unedited window)",
      item: "the full unedited CCTV window with continuity",
      sourceIds: ["signal:cctv-full-outstanding"],
      triggerLabels: ["full CCTV outstanding"],
      nextAction: "Send disclosure request for full CCTV + continuity statement; chase in 14 days.",
    },
    {
      id: "move:disclosure-cctv-partial",
      title: "Demand the unedited CCTV behind the served excerpt",
      item: "the unedited CCTV window underlying the served excerpt",
      sourceIds: ["signal:cctv-partial-only"],
      triggerLabels: ["partial CCTV only served"],
      nextAction: "Request unedited window and edits log; flag potential s.78 PACE point if only edits are served.",
    },
    {
      id: "move:disclosure-cctv-not-identified",
      title: "Pin down CCTV source and ownership",
      item: "the CCTV source, ownership, and recovery chain",
      sourceIds: ["signal:cctv-not-identified"],
      triggerLabels: ["CCTV source not identified"],
      nextAction: "Request MG11 from recovering officer and continuity exhibit chain.",
    },
    {
      id: "move:disclosure-mg11",
      title: "Chase outstanding MG11 witness statements",
      item: "the outstanding MG11 witness statement(s)",
      sourceIds: ["signal:mg11-outstanding"],
      triggerLabels: ["MG11 outstanding"],
      nextAction: "Issue disclosure request listing each outstanding MG11 by reference.",
    },
    {
      id: "move:disclosure-999",
      title: "Chase 999 audio and CAD reference",
      item: "the 999 call audio and the CAD reference",
      sourceIds: ["signal:999-missing"],
      triggerLabels: ["999 missing"],
      nextAction: "Submit force disclosure form for 999 audio; chase after 14 days.",
    },
    {
      id: "move:disclosure-cad",
      title: "Obtain full CAD log (not arrest-only)",
      item: "the full CAD / incident log (deployment to scene closure)",
      sourceIds: ["signal:cad-missing"],
      triggerLabels: ["CAD missing or arrest-only"],
      nextAction: "Request full CAD via disclosure officer; cite CPIA Code 8.2.",
    },
    {
      id: "move:disclosure-bwv",
      title: "Chase BWV continuity for all officers present",
      item: "BWV from all officers present, with continuity",
      sourceIds: ["signal:bwv-partial"],
      triggerLabels: ["BWV partial / continuity outstanding"],
      nextAction: "Request BWV index; identify missing officers by collar number; chase.",
    },
    {
      id: "move:disclosure-forensic",
      title: "Chase forensic / lab report and underlying data",
      item: "the forensic / lab report and the underlying data",
      sourceIds: ["signal:forensic-outstanding"],
      triggerLabels: ["forensic / lab report outstanding"],
      nextAction: "Request report + underlying notes; reserve right to instruct defence expert if delayed.",
    },
    {
      id: "move:disclosure-medical",
      title: "Chase medical / A&E records",
      item: "the medical / A&E records relevant to injury or fitness",
      sourceIds: ["signal:medical-awaited"],
      triggerLabels: ["medical evidence awaited"],
      nextAction: "Request medical records via prosecution; consider client-side consent route in parallel.",
    },
    {
      id: "move:disclosure-phone",
      title: "Chase phone / device download",
      item: "the phone / device download report",
      sourceIds: ["signal:phone-download-outstanding"],
      triggerLabels: ["phone download outstanding"],
      nextAction: "Request the download report and any keyword/search terms list applied.",
    },
    {
      id: "move:disclosure-exhibit-list",
      title: "Request a complete exhibit schedule",
      item: "a complete exhibit schedule",
      sourceIds: ["signal:exhibit-list-blank", "signal:exhibit-list-limited"],
      triggerLabels: ["exhibit list blank or limited"],
      nextAction: "Request MG6E / exhibit schedule before settling defence position.",
    },
    {
      id: "move:disclosure-custody",
      title: "Chase custody record (and custody CCTV if relevant)",
      item: "the custody record (and custody-suite CCTV where relevant)",
      sourceIds: ["signal:custody-record-missing"],
      triggerLabels: ["custody record missing"],
      nextAction: "Request custody record; note any abuse of process / s.76 / s.78 points to keep open.",
    },
    {
      id: "move:disclosure-interview",
      title: "Obtain full interview record",
      item: "the full interview record (recording + ROTI / ROVI)",
      sourceIds: ["signal:interview-missing"],
      triggerLabels: ["interview record missing"],
      nextAction: "Request full recording and any record of taped interview / video interview.",
    },
  ];

  for (const c of candidates) {
    const m = make(c);
    if (m) out.push(m);
  }

  return out;
}

// -- Interview --------------------------------------------------------------

export function buildInterviewMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const out: CaseMove[] = [];

  // No comment interview — list both leverage and risk.
  const noComment = get(signals, "signal:interview-no-comment");
  if (noComment) {
    out.push({
      id: "move:interview-no-comment",
      title: "Manage no-comment interview: silence + adverse inference posture",
      category: "interview",
      triggerSignals: ["no comment interview"],
      sourceSignals: [noComment.id],
      unsupportedAssumptions: [
        "Whether the no-comment was on legal advice is not stated unless captured in the interview summary.",
        "Whether anything reasonably could have been mentioned is fact-specific.",
      ],
      leveragePoint:
        "Silence is not evidence of guilt; the burden remains on the prosecution. If no facts were later relied on at trial, s.34 CJPOA risk is reduced.",
      recommendedMove:
        "Confirm legal-advice basis (if applicable), and prepare the trial defence statement so that any facts later relied on were either flagged by prepared statement or are properly explained.",
      whyItMatters:
        "Adverse inference under s.34 CJPOA only bites where a fact later relied on could reasonably have been mentioned. Strategy must be set now to control that risk.",
      crownCounter: {
        expectedMove: "Crown may invite the jury to draw an adverse inference under s.34 CJPOA.",
        defenceResponse:
          "Be ready to evidence the basis for silence (legal advice, mental state, complexity of allegation) and to limit the facts relied on at trial to those properly notified.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the s.34 direction is appropriate and how it should be tailored.",
        reasonablenessTest: "Was it reasonable, in the circumstances at the time, to expect the defendant to mention the fact now relied on?",
      },
      risk: "Adverse inference at trial; perceived inconsistency with later defence statement.",
      killSwitch: {
        triggerEvent: "Defence statement introduces a material fact that could plainly have been raised in interview.",
        pivotRecommendation: "Brief client/counsel on s.34 exposure; consider whether to give evidence to explain the silence.",
      },
      nextAction: "Lock the defence statement narrative against the interview record before service.",
      confidence: computeConfidence({ sources: [noComment], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([noComment]),
    });
  }

  const prepared = get(signals, "signal:interview-prepared-statement");
  if (prepared) {
    out.push({
      id: "move:interview-prepared-statement",
      title: "Audit prepared statement against served bundle",
      category: "interview",
      triggerSignals: ["prepared statement given"],
      sourceSignals: [prepared.id],
      unsupportedAssumptions: ["Full text of the prepared statement is assumed to be on the file."],
      leveragePoint:
        "Prepared statement materially reduces s.34 CJPOA exposure where it covers facts later relied on at trial.",
      recommendedMove:
        "Check every fact intended to be relied on at trial is covered (or properly explained) in the prepared statement. Identify any gaps before service of the defence statement.",
      whyItMatters: "Gaps between prepared statement and trial narrative reopen adverse inference risk.",
      crownCounter: {
        expectedMove: "Crown may probe any matter not in the prepared statement that is later raised at trial.",
        defenceResponse: "Be ready to explain why a fact was not mentioned (e.g. detail unknown at the time, legal advice).",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the prepared statement adequately covered the matters now relied on.",
        reasonablenessTest: "Was it reasonable, at interview, to expect more detail than the prepared statement gave?",
      },
      risk: "Mismatch between prepared statement and defence statement.",
      killSwitch: {
        triggerEvent: "Defence trial narrative diverges from prepared statement on a material point.",
        pivotRecommendation: "Reframe defence statement to bridge the gap with a stated reason; consider client evidence on the point.",
      },
      nextAction: "Cross-reference prepared statement against MG5 and exhibit schedule before settling defence statement.",
      confidence: computeConfidence({ sources: [prepared], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([prepared]),
    });
  }

  const partialAdmission = get(signals, "signal:interview-partial-admission");
  if (partialAdmission) {
    out.push({
      id: "move:interview-partial-admission",
      title: "Define and protect the limits of the partial admission",
      category: "damage_limitation",
      triggerSignals: ["partial admission in interview"],
      sourceSignals: [partialAdmission.id],
      unsupportedAssumptions: ["Exact wording of the admission is taken from the interview summary as supplied."],
      leveragePoint:
        "A partial admission can support a basis of plea or charge reduction without conceding the full prosecution case.",
      recommendedMove:
        "Map exactly what was admitted and what was not. Consider whether a basis of plea or representations on charge level would be advantageous; do not allow the partial admission to be inflated by inference.",
      whyItMatters: "Without disciplined framing, a partial admission can be treated by the Crown as a wider concession than it really is.",
      crownCounter: {
        expectedMove: "Crown may argue the partial admission proves the full offence.",
        defenceResponse: "Identify the specific elements that remain in issue; insist they are proved to the criminal standard.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the admission is properly limited to the conduct it describes.",
        reasonablenessTest: "Does the partial admission, on its terms, reach the elements of the charged offence?",
      },
      risk: "Admission expanded by inference into the missing elements.",
      killSwitch: {
        triggerEvent: "Crown serves further evidence converting the partial admission into a full one.",
        pivotRecommendation: "Re-run plea analysis; consider basis of plea or revised charge representations.",
      },
      nextAction: "Draft the precise scope of the admission for use in any basis-of-plea discussion.",
      confidence: computeConfidence({ sources: [partialAdmission], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([partialAdmission]),
    });
  }

  const admission = get(signals, "signal:interview-admission");
  if (admission && !partialAdmission) {
    out.push({
      id: "move:interview-admission",
      title: "Admission posture: damage limitation and credit for plea",
      category: "damage_limitation",
      triggerSignals: ["admission in interview"],
      sourceSignals: [admission.id],
      unsupportedAssumptions: ["Voluntariness and PACE compliance are assumed unless flagged elsewhere."],
      leveragePoint: "Early admission can attract maximum credit at sentence and may support a basis of plea.",
      recommendedMove:
        "Test the admission against PACE / s.76 / s.78. If it stands, focus on basis of plea, mitigation pack and credit.",
      whyItMatters: "Strategy should pivot away from contested fight if the admission is sustainable; otherwise admissibility must be challenged early.",
      crownCounter: {
        expectedMove: "Crown will rely on the admission as primary evidence.",
        defenceResponse: "If admissibility is sound, focus energy on basis of plea and sentence pack.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Voluntariness, fairness, and any breach of PACE / Codes of Practice.",
        reasonablenessTest: "Were the conditions of the interview fair and properly recorded?",
      },
      risk: "Spending preparation budget on a contested fight where the admission anchors the prosecution case.",
      killSwitch: {
        triggerEvent: "Custody record / interview audio reveals an admissibility issue.",
        pivotRecommendation: "Lodge s.78 application and pause plea discussions until ruling.",
      },
      nextAction: "Review custody record + interview recording for admissibility before opening plea discussion.",
      confidence: computeConfidence({ sources: [admission], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([admission]),
    });
  }

  const denial = get(signals, "signal:interview-denial");
  if (denial) {
    out.push({
      id: "move:interview-denial",
      title: "Lock denial narrative against served bundle",
      category: "interview",
      triggerSignals: ["denial in interview"],
      sourceSignals: [denial.id],
      unsupportedAssumptions: ["Detail of the denial is assumed to mirror the interview summary supplied."],
      leveragePoint: "A consistent denial across interview, defence statement and trial reduces adverse-inference exposure.",
      recommendedMove:
        "Cross-check the denial against MG5, exhibits and any client account; identify any inconsistency to address proactively in the defence statement.",
      whyItMatters: "Inconsistencies between interview denial and trial position are the easiest cross-examination target for the Crown.",
      crownCounter: {
        expectedMove: "Crown will probe any inconsistency between the interview denial and later accounts.",
        defenceResponse: "Pre-empt by addressing inconsistencies in the defence statement with a stated reason.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Consistency of accounts and the proper scope of any s.34 / s.35 directions.",
        reasonablenessTest: "Has the defence narrative remained consistent with what the defendant first said?",
      },
      risk: "Cross-examination collapse on inconsistency between interview and trial.",
      killSwitch: {
        triggerEvent: "Late-served evidence undermines the interview denial.",
        pivotRecommendation: "Reassess plea position; consider damage limitation and credit before next hearing.",
      },
      nextAction: "Build a denial-vs-bundle audit table before settling the defence statement.",
      confidence: computeConfidence({ sources: [denial], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([denial]),
    });
  }

  const conflicts = get(signals, "signal:interview-conflicts-bundle");
  if (conflicts) {
    out.push({
      id: "move:interview-conflicts",
      title: "Address interview vs bundle conflicts before defence statement",
      category: "interview",
      triggerSignals: ["interview conflicts with served material"],
      sourceSignals: [conflicts.id],
      unsupportedAssumptions: ["The specific conflicts are taken from the inconsistencies / mg6Summary fields as supplied."],
      leveragePoint: "Surface and explain conflicts on defence terms before the Crown frames them.",
      recommendedMove:
        "List each conflict, its source and a short stated reason. Build that explanation into the defence statement and the witness preparation note.",
      whyItMatters: "Unaddressed conflicts feed the strongest cross-examination questions and any s.34 / s.35 direction.",
      crownCounter: {
        expectedMove: "Crown will use the conflicts to attack credibility of the defence account.",
        defenceResponse: "Pre-empt with a clear, recorded explanation; consider defence evidence to anchor the account.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether explanations for the conflicts are credible and properly notified.",
        reasonablenessTest: "Could the conflicts reasonably have been explained earlier?",
      },
      risk: "Credibility damage at trial.",
      killSwitch: {
        triggerEvent: "Defence cannot supply a coherent explanation for the conflict.",
        pivotRecommendation: "Reassess plea posture and consider basis of plea.",
      },
      nextAction: "Build a conflict map (interview vs bundle) and decide explanation before defence statement.",
      confidence: computeConfidence({ sources: [conflicts], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([conflicts]),
    });
  }

  return out;
}

// -- Identification ---------------------------------------------------------

export function buildIdentificationMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const idDisputed = get(signals, "signal:id-disputed");
  if (!idDisputed) return [];
  // ID work commonly leans on CCTV, BWV, custody record, forensics — flag any
  // gaps as supporting context but do NOT assert them as helpful facts.
  const supporting = [
    get(signals, "signal:cctv-full-outstanding"),
    get(signals, "signal:cctv-partial-only"),
    get(signals, "signal:cctv-not-identified"),
    get(signals, "signal:bwv-partial"),
    get(signals, "signal:forensic-outstanding"),
    get(signals, "signal:custody-record-missing"),
  ].filter((s): s is CaseMoveSignal => !!s);
  const sources = [idDisputed, ...supporting];
  const dependsOnMissing = supporting.length > 0;
  return [
    {
      id: "move:id-turnbull-pack",
      title: "Build a Turnbull-grade ID challenge pack",
      category: "identification",
      triggerSignals: ["identification disputed", ...supporting.map((s) => s.label)],
      sourceSignals: sources.map((s) => s.id),
      unsupportedAssumptions: [
        "Quality of the ID evidence (lighting, distance, time observed) is unknown until the underlying material is reviewed.",
      ],
      leveragePoint:
        "Where ID is in issue, R v Turnbull requires the judge to give a careful warning and may justify a submission of no case if quality is poor.",
      recommendedMove:
        "Draft a Turnbull checklist (ADVOKATE) and audit each ID source against it. Where source material (CCTV, BWV, ID procedure record) is outstanding, route through disclosure pressure and reserve the s.78 / submission of no case point.",
      whyItMatters: "ID cases turn on the quality of the identification evidence; the Turnbull lens disciplines that analysis.",
      crownCounter: {
        expectedMove: "Crown may rely on multiple weak ID strands and invite cumulative inference.",
        defenceResponse: "Test each strand on Turnbull factors; cumulative weakness can support a half-time submission.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the Turnbull warning suffices or whether the case should be withdrawn from the jury.",
        reasonablenessTest: "Is the ID evidence of a quality on which a properly directed jury could safely convict?",
      },
      risk: "ID evidence may be stronger than it currently appears once underlying material is served.",
      killSwitch: {
        triggerEvent: "Served CCTV / ID procedure clearly identifies the defendant.",
        pivotRecommendation: "Pivot from ID challenge to alternative defence (e.g. lawful purpose, account of conduct) or damage limitation.",
      },
      nextAction: "Open a Turnbull / ADVOKATE worksheet keyed to each ID strand on the file.",
      confidence: computeConfidence({ sources, dependsOnMissingEvidence: dependsOnMissing }),
      sourceDisciplineNote: noteFor(sources),
    },
  ];
}

// -- Intent / dishonesty / causation / driving / supply / client-account ---

export function buildIntentDishonestyMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const out: CaseMove[] = [];

  type Spec = {
    signalId: string;
    id: string;
    title: string;
    category: CaseMoveCategory;
    triggerLabel: string;
    leveragePoint: string;
    recommendedMove: string;
    whyItMatters: string;
    crownExpected: string;
    defenceResponse: string;
    considerations: string;
    test: string;
    risk: string;
    killTrigger: string;
    pivot: string;
    next: string;
  };

  const specs: Spec[] = [
    {
      signalId: "signal:intent-disputed",
      id: "move:intent-element-attack",
      title: "Attack mens rea: pin Crown to specific intent evidence",
      category: "intent",
      triggerLabel: "intent disputed",
      leveragePoint:
        "Where intent is in issue, the Crown must prove the specific mental state the offence requires; conduct alone may not do it.",
      recommendedMove:
        "List the precise mens rea the offence requires. For each, identify the prosecution evidence said to prove it and the defence answer. Reserve a submission of no case where evidence of intent is absent.",
      whyItMatters: "Many cases lose at trial not on conduct but on intent; the analysis must be exact.",
      crownExpected: "Crown will invite inference of intent from conduct, words and surrounding circumstances.",
      defenceResponse: "Show the inference is not the only reasonable one; offer the alternative explanation.",
      considerations: "Whether the prosecution evidence reaches the required mental state to the criminal standard.",
      test: "Could a properly directed jury be sure of the requisite intent on this evidence?",
      risk: "Strong conduct evidence may make inference of intent compelling.",
      killTrigger: "Late-served evidence (e.g. messages, admission) anchors intent.",
      pivot: "Reassess plea posture; consider basis of plea on intent element.",
      next: "Build a mens rea evidence map keyed to the offence elements.",
    },
    {
      signalId: "signal:dishonesty-disputed",
      id: "move:dishonesty-ivey-frame",
      title: "Frame dishonesty challenge under Ivey v Genting",
      category: "dishonesty",
      triggerLabel: "dishonesty disputed",
      leveragePoint:
        "Dishonesty is judged by the standards of ordinary decent people, applied to the defendant's actual state of knowledge / belief (Ivey).",
      recommendedMove:
        "Plead the defendant's actual belief / knowledge with care. Show how that state, if accepted, would not be regarded as dishonest by ordinary standards.",
      whyItMatters: "Dishonesty is often the only seriously contested element; Ivey discipline keeps the analysis tight.",
      crownExpected: "Crown will rely on conduct and surrounding circumstances to invite a finding of dishonesty.",
      defenceResponse: "Anchor in the defendant's actual belief / knowledge and show why ordinary standards do not categorise it as dishonest.",
      considerations: "The defendant's actual state of mind, then the objective standard.",
      test: "Would ordinary decent people, knowing what the defendant knew, regard the conduct as dishonest?",
      risk: "Objective stage often goes against the defendant where belief is rejected.",
      killTrigger: "Evidence shows the defendant's stated belief was not in fact held.",
      pivot: "Reassess plea posture; consider basis of plea on dishonesty.",
      next: "Draft an Ivey-structured note: subjective belief, then objective test.",
    },
    {
      signalId: "signal:causation-disputed",
      id: "move:causation-chain-attack",
      title: "Attack causation chain (legal and factual cause)",
      category: "causation",
      triggerLabel: "causation disputed",
      leveragePoint:
        "Where causation is in issue, the Crown must prove the defendant's act was both factual and legal cause of the alleged result.",
      recommendedMove:
        "Map the causal chain the Crown must prove. Identify any intervening act / pre-existing condition / third party conduct that may break or weaken legal causation.",
      whyItMatters: "Causation is often the cleanest defence in result-crimes; the chain analysis must be explicit.",
      crownExpected: "Crown will treat the chain as obvious and rely on common-sense causation.",
      defenceResponse: "Force a step-by-step causation analysis; identify weakest link and any intervening cause.",
      considerations: "Whether the defendant's act remains an operating and substantial cause of the result.",
      test: "Was the defendant's act a substantial and operating cause, despite anything that intervened?",
      risk: "Intervening cause arguments often fail unless clearly supported by evidence.",
      killTrigger: "Expert evidence closes off the proposed intervening cause.",
      pivot: "Refocus on intent or, where appropriate, basis of plea.",
      next: "Draft a causation chain diagram with each step and supporting / undermining evidence.",
    },
    {
      signalId: "signal:driving-standard-disputed",
      id: "move:driving-standard-attack",
      title: "Attack standard of driving (careful and competent driver test)",
      category: "driving_standard",
      triggerLabel: "standard of driving disputed",
      leveragePoint:
        "Standard-of-driving offences turn on whether the driving fell below or far below what would be expected of a careful and competent driver.",
      recommendedMove:
        "Identify the precise driving acts relied on; compare against the careful and competent driver test. Consider expert / collision investigator material if available.",
      whyItMatters: "Many driving cases turn on the line between careless and dangerous; that line must be argued precisely.",
      crownExpected: "Crown will rely on outcome (collision, injury) to characterise the driving.",
      defenceResponse: "Separate outcome from driving acts; focus the test on what was actually done at the wheel.",
      considerations: "What a careful and competent driver would have done in the same conditions.",
      test: "Did the driving fall below (careless) or far below (dangerous) the careful and competent standard?",
      risk: "Sympathy for victims can pull the standard upward at trial.",
      killTrigger: "Reconstruction / dashcam evidence clearly shows driving far below standard.",
      pivot: "Consider charge reduction discussions or basis of plea.",
      next: "Build a driving-acts vs standard table; identify expert evidence needs.",
    },
    {
      signalId: "signal:supply-inference-disputed",
      id: "move:supply-inference-attack",
      title: "Attack supply inference: anchor in personal use",
      category: "supply_inference",
      triggerLabel: "supply inference disputed",
      leveragePoint:
        "Supply must be proved by more than possession of quantity / paraphernalia alone; the inference can be tested.",
      recommendedMove:
        "List every Crown plank for supply (quantity, packaging, cash, messages, list). For each, identify the personal-use answer and any expert evidence required.",
      whyItMatters: "Supply inferences often depend on cumulative effect; weakening individual planks weakens the whole.",
      crownExpected: "Crown will rely on cumulative inference: quantity + cash + messages + tick list.",
      defenceResponse: "Test each plank; offer personal-use account where supported by client instructions.",
      considerations: "Whether the cumulative inference of supply is the only reasonable one on the evidence.",
      test: "Is the only reasonable inference one of supply, or is personal use realistically open?",
      risk: "Phone download or messaging evidence can quickly close the personal-use route.",
      killTrigger: "Phone download produces clear supply messaging.",
      pivot: "Reassess plea posture; basis of plea on simple possession may be appropriate.",
      next: "Build a supply-inference plank table; flag any expert needs.",
    },
    {
      signalId: "signal:client-account-conflicts",
      id: "move:client-account-conflicts",
      title: "Resolve client account vs served material conflicts",
      category: "interview",
      triggerLabel: "client account conflicts with served material",
      leveragePoint:
        "Conflicts must be addressed on defence terms before they are exploited at trial.",
      recommendedMove:
        "List each conflict, the source on the file, and the client's explanation. Decide whether each requires a witness, an expert or a stated reason in the defence statement.",
      whyItMatters: "Unaddressed client / bundle conflicts are the highest-value cross-examination targets for the Crown.",
      crownExpected: "Crown will line up each conflict in cross-examination of the defendant.",
      defenceResponse: "Pre-empt with a clear, recorded explanation in the defence statement.",
      considerations: "Whether explanations for the conflicts are credible and properly notified.",
      test: "Can each conflict be coherently explained on the defence narrative?",
      risk: "Credibility damage at trial.",
      killTrigger: "Conflicts cannot be coherently explained.",
      pivot: "Reassess plea posture; consider basis of plea.",
      next: "Build a client-vs-bundle conflict map; agree explanations before defence statement.",
    },
  ];

  for (const spec of specs) {
    const sig = get(signals, spec.signalId);
    if (!sig) continue;
    out.push({
      id: spec.id,
      title: spec.title,
      category: spec.category,
      triggerSignals: [spec.triggerLabel],
      sourceSignals: [sig.id],
      unsupportedAssumptions: [
        "Specific facts of the defence position are taken from the strategy / defence-weakness fields as supplied.",
      ],
      leveragePoint: spec.leveragePoint,
      recommendedMove: spec.recommendedMove,
      whyItMatters: spec.whyItMatters,
      crownCounter: { expectedMove: spec.crownExpected, defenceResponse: spec.defenceResponse },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: spec.considerations,
        reasonablenessTest: spec.test,
      },
      risk: spec.risk,
      killSwitch: { triggerEvent: spec.killTrigger, pivotRecommendation: spec.pivot },
      nextAction: spec.next,
      confidence: computeConfidence({ sources: [sig], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([sig]),
    });
  }

  return out;
}

// -- Self-defence -----------------------------------------------------------

export function buildSelfDefenceMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const sd = get(signals, "signal:self-defence-raised");
  if (!sd) return [];
  const supporting = [
    get(signals, "signal:cctv-full-outstanding"),
    get(signals, "signal:bwv-partial"),
    get(signals, "signal:medical-awaited"),
  ].filter((s): s is CaseMoveSignal => !!s);
  const sources = [sd, ...supporting];
  return [
    {
      id: "move:self-defence-frame",
      title: "Consider self-defence framing: honest belief + reasonable response",
      category: "self_defence",
      triggerSignals: ["self-defence raised"],
      sourceSignals: sources.map((s) => s.id),
      unsupportedAssumptions: [
        "Subjective belief and objective reasonableness depend on facts to be proved at trial.",
        "Self-defence is not an established live case position until instructions and source-backed sequence support it.",
      ],
      leveragePoint:
        "Self-defence engages s.76 Criminal Justice and Immigration Act 2008: honest belief is judged subjectively, and reasonableness is judged on the facts as the defendant believed them.",
      recommendedMove:
        "If instructions and evidence support it, consider a two-stage self-defence frame: (1) honest belief in the need to use force; (2) force used was reasonable on the facts as believed. Identify each evidential anchor (CCTV, BWV, witness, medical) and route any gaps through disclosure pressure — do not assert self-defence as case theory from offence shape alone.",
      whyItMatters: "Misframing self-defence is a common trial-loss path; the two-stage structure must be explicit and must not be invented from charge type.",
      crownCounter: {
        expectedMove: "Crown may concede honest belief but argue the response was disproportionate.",
        defenceResponse: "Anchor proportionality in the moment-by-moment evidence; resist outcome-based hindsight.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the s.76 framework is properly engaged on the evidence.",
        reasonablenessTest: "Was the force used reasonable on the facts as the defendant honestly believed them to be?",
      },
      risk: "Force regarded as disproportionate, especially where outcome is serious.",
      killSwitch: {
        triggerEvent: "Served footage clearly shows force used was beyond what the defendant honestly believed necessary.",
        pivotRecommendation: "Reassess plea posture; consider basis of plea or partial defence where applicable.",
      },
      nextAction: "Draft a self-defence two-stage map keyed to evidence anchors and disclosure gaps.",
      confidence: computeConfidence({ sources, dependsOnMissingEvidence: supporting.length > 0 }),
      sourceDisciplineNote: noteFor(sources),
    },
  ];
}

// -- Lawful excuse / lawful reason -----------------------------------------

export function buildLawfulExcuseMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const out: CaseMove[] = [];

  const excuse = get(signals, "signal:lawful-excuse-raised");
  if (excuse) {
    out.push({
      id: "move:lawful-excuse-frame",
      title: "Frame lawful excuse precisely against the offence section",
      category: "lawful_excuse",
      triggerSignals: ["lawful excuse raised"],
      sourceSignals: [excuse.id],
      unsupportedAssumptions: [
        "Statutory definition of lawful excuse is offence-specific; checked against the actual section in the indictment.",
      ],
      leveragePoint:
        "Lawful excuse is a complete defence to specific offences; it must be pleaded against the precise statutory wording.",
      recommendedMove:
        "Set out the section relied on, the statutory definition of lawful excuse for that offence, and the evidential basis. Reserve any evidential burden / reverse burden point.",
      whyItMatters: "Generic 'lawful excuse' pleadings collapse at trial; the section-specific framing is essential.",
      crownCounter: {
        expectedMove: "Crown will challenge whether lawful excuse is even available on the section relied on.",
        defenceResponse: "Anchor the defence in the statutory wording; identify supporting authority where appropriate.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether lawful excuse is available on the offence and whether the evidential threshold is reached.",
        reasonablenessTest: "Does the evidence raise lawful excuse to the standard required by the section?",
      },
      risk: "Defence runs against an offence where lawful excuse is unavailable or narrowly defined.",
      killSwitch: {
        triggerEvent: "Crown identifies binding authority that closes off lawful excuse on the section.",
        pivotRecommendation: "Pivot to alternative defence or basis of plea.",
      },
      nextAction: "Draft a section-specific lawful-excuse note with statutory text and authority.",
      confidence: computeConfidence({ sources: [excuse], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([excuse]),
    });
  }

  const reason = get(signals, "signal:lawful-reason-raised");
  if (reason) {
    out.push({
      id: "move:lawful-reason-frame",
      title: "Frame lawful reason / authority against the offence",
      category: "lawful_reason",
      triggerSignals: ["lawful reason raised"],
      sourceSignals: [reason.id],
      unsupportedAssumptions: [
        "Statutory or common-law basis for lawful reason / authority is offence-specific.",
      ],
      leveragePoint:
        "Lawful reason / authority can be a complete answer where the statute provides for it; it must be evidenced.",
      recommendedMove:
        "Set out the specific source of lawful reason (statute, common law, professional duty, court order). Identify the evidence that proves it on the facts of this case.",
      whyItMatters: "Imprecise reliance on lawful reason fails at trial; the source must be named and evidenced.",
      crownCounter: {
        expectedMove: "Crown will test the source of lawful reason and the evidential basis.",
        defenceResponse: "Identify the specific source and the evidence that engages it.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether lawful reason / authority is engaged on the section and on the facts.",
        reasonablenessTest: "Is there an evidential basis for the lawful reason on the facts of this case?",
      },
      risk: "Defence is theoretical without evidential support.",
      killSwitch: {
        triggerEvent: "Source of lawful reason cannot be evidenced on the facts.",
        pivotRecommendation: "Pivot to alternative defence or basis of plea.",
      },
      nextAction: "Draft a lawful-reason note: source, statutory text, and evidence on this case.",
      confidence: computeConfidence({ sources: [reason], dependsOnMissingEvidence: false }),
      sourceDisciplineNote: noteFor([reason]),
    });
  }

  return out;
}

// -- Forensic ---------------------------------------------------------------

export function buildForensicMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const fo = get(signals, "signal:forensic-outstanding");
  const med = get(signals, "signal:medical-awaited");
  const out: CaseMove[] = [];

  if (fo) {
    out.push({
      id: "move:forensic-strategy",
      title: "Hold forensic position open until report and underlying data served",
      category: "forensic",
      triggerSignals: ["forensic / lab report outstanding"],
      sourceSignals: [fo.id],
      unsupportedAssumptions: [
        "Whether the report supports or undermines the defence cannot be assessed before service.",
      ],
      leveragePoint:
        "Forensic content unknown — defence position cannot be safely closed; defence expert can be reserved if delay continues.",
      recommendedMove:
        "Send a written request for the forensic report and the underlying data. Reserve the right to instruct a defence expert if not served by a stated date.",
      whyItMatters: "Forensic evidence often determines the trial; closing position before it is served creates risk in both directions.",
      crownCounter: {
        expectedMove: "Crown may seek to serve forensic evidence late and resist defence expert delay arguments.",
        defenceResponse: "Document the chase trail; request adjournment / direction at the next hearing if forensic remains outstanding.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether late forensic disclosure threatens trial fairness or readiness.",
        reasonablenessTest: "Has the defence had a fair opportunity to consider and respond to the forensic evidence?",
      },
      risk: "Forensic content, when served, may strongly support the prosecution case.",
      killSwitch: {
        triggerEvent: "Served forensic clearly identifies the defendant or proves a contested element.",
        pivotRecommendation: "Reassess plea posture; consider damage limitation and credit before next hearing.",
      },
      nextAction: "Send forensic disclosure request with stated cut-off; diary review for defence expert decision.",
      confidence: computeConfidence({ sources: [fo], dependsOnMissingEvidence: true }),
      sourceDisciplineNote: noteFor([fo]),
    });
  }

  if (med) {
    out.push({
      id: "move:medical-strategy",
      title: "Hold injury / medical position open until records served",
      category: "medical",
      triggerSignals: ["medical evidence awaited"],
      sourceSignals: [med.id],
      unsupportedAssumptions: [
        "Whether the medical records support or undermine the defence cannot be assessed before service.",
      ],
      leveragePoint:
        "Medical content unknown — defence cannot safely close on injury / fitness issues until records are served.",
      recommendedMove:
        "Request the medical / A&E records via the prosecution and, where appropriate, with client consent direct from the trust. Reserve any expert needs.",
      whyItMatters: "Medical content can change the level of charge and the credit available for an early plea.",
      crownCounter: {
        expectedMove: "Crown may rely on summary statements pending full records.",
        defenceResponse: "Press for full records before settling defence position.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the case can fairly proceed without full medical material.",
        reasonablenessTest: "Has the defence been given a fair opportunity to consider the medical evidence?",
      },
      risk: "Medical records may support more serious charging than currently shown.",
      killSwitch: {
        triggerEvent: "Records show injury level inconsistent with the defence narrative.",
        pivotRecommendation: "Reassess plea posture; consider basis of plea or charge representations.",
      },
      nextAction: "Issue dual-track medical request (prosecution + consent route).",
      confidence: computeConfidence({ sources: [med], dependsOnMissingEvidence: true }),
      sourceDisciplineNote: noteFor([med]),
    });
  }

  return out;
}

// -- Phone evidence ---------------------------------------------------------

export function buildPhoneEvidenceMoves(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const pd = get(signals, "signal:phone-download-outstanding");
  if (!pd) return [];
  return [
    {
      id: "move:phone-download-strategy",
      title: "Hold position on phone download until report served",
      category: "phone_evidence",
      triggerSignals: ["phone download outstanding"],
      sourceSignals: [pd.id],
      unsupportedAssumptions: [
        "Whether the download supports or undermines the defence cannot be assessed before service.",
      ],
      leveragePoint:
        "Phone download content is unknown — defence position on messaging-based inferences cannot be safely closed.",
      recommendedMove:
        "Request the phone / device download report and any keyword / search terms list applied. Reserve s.78 PACE points on scope and proportionality of seizure.",
      whyItMatters: "Phone downloads often anchor inferences (supply, intent, association); the defence position must remain open until they are reviewed.",
      crownCounter: {
        expectedMove: "Crown may serve a curated extract rather than the full download.",
        defenceResponse: "Press for the underlying report and the keyword / search terms used; flag any over-broad seizure.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether the seizure and processing of the download were lawful and proportionate.",
        reasonablenessTest: "Was the download obtained and processed lawfully and proportionately?",
      },
      risk: "Download content may strongly support prosecution inference (e.g. supply messaging).",
      killSwitch: {
        triggerEvent: "Download produces clear inculpatory messaging.",
        pivotRecommendation: "Reassess plea posture; consider damage limitation and credit before next hearing.",
      },
      nextAction: "Issue download disclosure request and diary review of seizure lawfulness.",
      confidence: computeConfidence({ sources: [pd], dependsOnMissingEvidence: true }),
      sourceDisciplineNote: noteFor([pd]),
    },
  ];
}

// -- No safe strategy -------------------------------------------------------

export function buildNoSafeStrategyMove(
  signals: ReadonlyArray<CaseMoveSignal>,
  _input: BuildCaseMovesInput,
): CaseMove[] {
  const thin = get(signals, "signal:thin-bundle");
  if (!thin) return [];
  // Pull in any disclosure-gap signals as supporting context.
  const supporting = signals.filter(
    (s) =>
      s.id !== "signal:thin-bundle" &&
      (s.source === "missing_evidence" ||
        s.source === "outstanding_evidence" ||
        s.id === "signal:exhibit-list-blank" ||
        s.id === "signal:exhibit-list-limited" ||
        s.id === "signal:interview-missing"),
  );
  const sources = [thin, ...supporting];
  return [
    {
      id: "move:no-safe-strategy",
      title: "Pause final strategy: bundle is too thin to commit",
      category: "no_safe_strategy",
      triggerSignals: ["thin bundle", ...supporting.map((s) => s.label)],
      sourceSignals: sources.map((s) => s.id),
      unsupportedAssumptions: [
        "Final defence position cannot be set without the missing material; nothing about its content is assumed.",
      ],
      leveragePoint:
        "Strategic discipline: do not commit to a defence narrative the served material cannot yet support.",
      recommendedMove:
        "Defer final strategy. Issue a single consolidated disclosure request covering every outstanding item, with a stated deadline. Set a calendar review for the day after the deadline.",
      whyItMatters: "Committing to a defence narrative the bundle cannot yet support is one of the highest-risk things a defence team can do.",
      crownCounter: {
        expectedMove: "Crown may treat absence of a fixed defence position as weakness.",
        defenceResponse: "Document each outstanding item and the chase trail; the burden remains on the prosecution.",
      },
      judgeConstraint: {
        considerationsTheJudgeWillWeigh: "Whether case can proceed fairly without the missing material; whether directions are needed.",
        reasonablenessTest: "Has the defence acted reasonably in waiting for material before committing position?",
      },
      risk: "Adverse perception at PTPH if not framed as disclosure-driven.",
      killSwitch: {
        triggerEvent: "Outstanding material is served and changes the picture materially.",
        pivotRecommendation: "Re-run case assessment immediately; revise / serve defence statement as appropriate.",
      },
      nextAction: "Send consolidated disclosure request and diary post-deadline review.",
      confidence: computeConfidence({ sources, dependsOnMissingEvidence: true }),
      sourceDisciplineNote: noteFor(sources),
    },
  ];
}

// ---------------------------------------------------------------------------
// Dedupe + leverage + main entry
// ---------------------------------------------------------------------------

/**
 * Stable dedupe by move id, preserving first occurrence (which preserves the
 * order of the builder pipeline).
 */
export function dedupeMoves(moves: ReadonlyArray<CaseMove>): CaseMove[] {
  const seen = new Set<string>();
  const out: CaseMove[] = [];
  for (const m of moves) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

/** Build leverage points by grouping signals into thematic buckets. */
function buildLeverage(signals: ReadonlyArray<CaseMoveSignal>): CaseMoveLeverage[] {
  const out: CaseMoveLeverage[] = [];

  const disclosureSignals = signals.filter(
    (s) =>
      s.source === "missing_evidence" ||
      s.source === "outstanding_evidence" ||
      s.id === "signal:exhibit-list-blank" ||
      s.id === "signal:exhibit-list-limited" ||
      s.id === "signal:interview-missing" ||
      s.id === "signal:cctv-not-identified",
  );
  if (disclosureSignals.length > 0) {
    out.push({
      id: "leverage:disclosure-pressure",
      label: "Disclosure pressure",
      description:
        "Outstanding or missing material gives the defence a structured CPIA-driven reason to delay final commitment, force the Crown to demonstrate compliance, and reserve fairness arguments.",
      signals: disclosureSignals.map((s) => s.id),
      strength: disclosureSignals.length >= 3 ? "high" : disclosureSignals.length === 2 ? "medium" : "low",
    });
  }

  const interviewSignals = signals.filter((s) => s.id.startsWith("signal:interview-"));
  if (interviewSignals.length > 0) {
    out.push({
      id: "leverage:interview-discipline",
      label: "Interview discipline",
      description:
        "Aligning interview content (no comment / prepared statement / admission / denial) with the defence statement controls adverse-inference and credibility risk.",
      signals: interviewSignals.map((s) => s.id),
      strength: interviewSignals.length >= 2 ? "medium" : "low",
    });
  }

  const defencePositionSignals = signals.filter((s) =>
    [
      "signal:id-disputed",
      "signal:dishonesty-disputed",
      "signal:intent-disputed",
      "signal:causation-disputed",
      "signal:self-defence-raised",
      "signal:lawful-excuse-raised",
      "signal:lawful-reason-raised",
      "signal:driving-standard-disputed",
      "signal:supply-inference-disputed",
    ].includes(s.id),
  );
  if (defencePositionSignals.length > 0) {
    out.push({
      id: "leverage:defence-element-attack",
      label: "Element-level defence attack",
      description:
        "Where specific elements are in issue (intent, dishonesty, ID, causation, self-defence, lawful excuse / reason, driving standard, supply inference), the prosecution must prove each to the criminal standard.",
      signals: defencePositionSignals.map((s) => s.id),
      strength: defencePositionSignals.length >= 2 ? "high" : "medium",
    });
  }

  return out;
}

/** Compute the engine's overall risk level from signals + moves. */
function computeOverallRisk(
  signals: ReadonlyArray<CaseMoveSignal>,
  moves: ReadonlyArray<CaseMove>,
): "low" | "medium" | "high" {
  if (moves.some((m) => m.category === "no_safe_strategy")) return "high";
  const disclosureGapCount = signals.filter(
    (s) => s.source === "missing_evidence" || s.source === "outstanding_evidence",
  ).length;
  if (disclosureGapCount >= 3) return "high";
  if (disclosureGapCount >= 1) return "medium";
  // Defence positions raised but no missing material: still medium (they're contested).
  if (
    signals.some((s) =>
      ["signal:id-disputed", "signal:intent-disputed", "signal:dishonesty-disputed", "signal:causation-disputed"].includes(s.id),
    )
  ) {
    return "medium";
  }
  return "low";
}

/** Compute deterministic blockedOrUnsafeRoutes labels. */
function computeBlockedRoutes(
  signals: ReadonlyArray<CaseMoveSignal>,
  moves: ReadonlyArray<CaseMove>,
): string[] {
  const out: string[] = [];
  if (moves.some((m) => m.category === "no_safe_strategy")) {
    out.push("Final defence position — blocked until outstanding material served.");
  }
  if (
    has(signals, "signal:cctv-full-outstanding") ||
    has(signals, "signal:cctv-not-identified") ||
    has(signals, "signal:cctv-partial-only")
  ) {
    out.push("Any factual claim about what CCTV shows — unsafe until full footage served.");
  }
  if (has(signals, "signal:forensic-outstanding")) {
    out.push("Closing forensic position — unsafe until report and underlying data served.");
  }
  if (has(signals, "signal:medical-awaited")) {
    out.push("Closing injury / fitness position — unsafe until medical records served.");
  }
  if (has(signals, "signal:phone-download-outstanding")) {
    out.push("Closing position on messaging-based inferences — unsafe until phone download served.");
  }
  if (has(signals, "signal:interview-missing")) {
    out.push("Reliance on the interview narrative — unsafe until interview record served.");
  }
  return out;
}

/** Produce a deterministic next-best-actions list from moves. */
function computeNextBestActions(moves: ReadonlyArray<CaseMove>): string[] {
  const out: string[] = [];
  // Prioritise no_safe_strategy first, then disclosure, then defence positions.
  const order: CaseMoveCategory[] = [
    "no_safe_strategy",
    "disclosure",
    "forensic",
    "medical",
    "phone_evidence",
    "interview",
    "identification",
    "intent",
    "dishonesty",
    "causation",
    "self_defence",
    "lawful_excuse",
    "lawful_reason",
    "driving_standard",
    "supply_inference",
    "damage_limitation",
    "witness",
  ];
  for (const cat of order) {
    for (const m of moves) {
      if (m.category === cat && m.nextAction && !out.includes(m.nextAction)) {
        out.push(m.nextAction);
      }
    }
  }
  return out;
}

/**
 * Main entry: turn already-known case signals into tactical defence moves.
 *
 * Pure and deterministic. Does not read the file system, network, env or DB.
 */
export function buildCaseMoves(input: BuildCaseMovesInput): CaseMovesResult {
  const signals = detectSignals(input);

  const moves = dedupeMoves([
    ...buildNoSafeStrategyMove(signals, input),
    ...buildDisclosureMoves(signals, input),
    ...buildForensicMoves(signals, input),
    ...buildPhoneEvidenceMoves(signals, input),
    ...buildInterviewMoves(signals, input),
    ...buildIdentificationMoves(signals, input),
    ...buildIntentDishonestyMoves(signals, input),
    ...buildSelfDefenceMoves(signals, input),
    ...buildLawfulExcuseMoves(signals, input),
  ]);

  const leverage = buildLeverage(signals);
  const blockedOrUnsafeRoutes = computeBlockedRoutes(signals, moves);
  const overallRiskLevel = computeOverallRisk(signals, moves);
  const nextBestActions = computeNextBestActions(moves);

  // Sort signals and leverage by id for stable output. Moves keep pipeline order.
  const sortedSignals = [...signals].sort(byId);
  const sortedLeverage = [...leverage].sort(byId);

  const sourceDisciplineSummary =
    "All moves derived only from supplied input fields. Missing material is framed as disclosure pressure or no-safe-strategy, never as a finding of fact for the defence.";

  return {
    signals: sortedSignals,
    leverage: sortedLeverage,
    moves,
    blockedOrUnsafeRoutes,
    overallRiskLevel,
    nextBestActions,
    sourceDisciplineSummary,
  };
}

/**
 * Short, debug-only human-readable summary. Not for solicitor-facing UI.
 */
export function summariseCaseMoves(result: CaseMovesResult): string {
  const sigCount = result.signals.length;
  const moveCount = result.moves.length;
  // Pick the strongest leverage point (sorted by strength then id for determinism).
  const leverageRank: Record<CaseMoveLeverage["strength"], number> = { high: 0, medium: 1, low: 2 };
  const ranked = [...result.leverage].sort((a, b) => {
    const s = leverageRank[a.strength] - leverageRank[b.strength];
    return s !== 0 ? s : byId(a, b);
  });
  const mainLeverage = ranked[0]?.label.toLowerCase() ?? "no clear leverage point";
  const noSafe = result.moves.find((m) => m.category === "no_safe_strategy");
  const mainRisk = noSafe
    ? "no safe final strategy until missing material is chased"
    : result.overallRiskLevel === "high"
      ? "multiple disclosure gaps blocking safe assessment"
      : result.overallRiskLevel === "medium"
        ? "contested elements or partial disclosure to manage"
        : "no high-priority risks detected from supplied signals";
  return `Detected ${sigCount} signal${sigCount === 1 ? "" : "s"} and ${moveCount} move${moveCount === 1 ? "" : "s"}. Main leverage: ${mainLeverage}. Main risk: ${mainRisk}.`;
}
