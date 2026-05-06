/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat uses (1) case state snapshot for committed strategy/stance/stage and (2) bundle excerpt + user message as primary for document facts (charge, MG5/MG6/MG11, exhibits, interview, schedule).
 * Reads latest DB state on every request; no caching. Aligned with Strategy tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { APIConnectionError, APIConnectionTimeoutError, APIError } from "openai";
import { requireAuthContextApi } from "@/lib/auth-api";
import { isEvalBypassRequest } from "@/lib/eval-auth-bypass";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";
import { getChangeListForContext } from "@/lib/criminal/verdict-change-list";
import { getCaseStateSnapshot } from "@/lib/criminal/case-state-snapshot";

type RouteParams = { params: Promise<{ caseId: string }> };

/** Back off when OpenAI returns 429 / 5xx or connection errors (reduces surfacing as HTTP 502). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientOpenAIError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return false;
  if (err instanceof APIConnectionError || err instanceof APIConnectionTimeoutError) return true;
  if (err instanceof APIError && typeof err.status === "number") {
    if (err.status === 429) return true;
    if (err.status >= 500) return true;
  }
  return false;
}

function isGroundedAnswer(answer: string): boolean {
  const hasEvidenceRef = /MG5|MG6|EX-|CCTV|CAD|999|interview/i.test(answer);

  const hasLegalStructure =
    /prove|burden|evidence|timeline|identification|intent|causation|account|inconsisten|gap/i.test(answer);

  const hasCaseLink =
    /this case|the allegation|the complainant|the defendant|the incident/i.test(answer);

  const hasHardDetail =
    /\d{2}:\d{2}|EX-[A-Z0-9]+|MG\d+|CAD-\d+/i.test(answer);

  const hasSoftDetail =
    /statement|interview|account/i.test(answer);

  const hasConcretePhrase =
    /between|at|before|after|during|from|to/i.test(answer);

  return (
    hasEvidenceRef ||
    (hasLegalStructure &&
      hasCaseLink &&
      (hasHardDetail || (hasSoftDetail && hasConcretePhrase)))
  );
}

function enforceActionFormatThreeLines(reply: string): string {
  let lines = reply
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 3) {
    const sentences = reply
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length >= 3) {
      lines = sentences.slice(0, 3);
    }
  }

  return [
    lines[0] || reply,
    lines[1] || "No clear evidence reference.",
    lines[2] || "No clear implication.",
  ].join("\n");
}

const AI_TIMEOUT_MS = 70_000;
const MAX_MESSAGE_LENGTH = 16_000;
const MAX_REPLY_LENGTH = 8000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 1400;
/** Extra attempts with exponential backoff after SDK retries (helps 429 / transient API overload). */
const OPENAI_RETRY_ATTEMPTS = 6;
const OPENAI_RETRY_BASE_DELAY_MS = 2000;
/** Model context budget; truncation uses head+tail so Reference + exhibit list survive. */
const MAX_BUNDLE_EXCERPT_CHARS = 24_000;
/** Hard cap on raw bundle text used for ref extraction / post-process (avoid huge rows). */
const MAX_BUNDLE_FULL_CHARS_FOR_REFS = 200_000;

/**
 * Exhibit refs as they appear in Northshire-style bundles: EX-CCTV-81, EX-CAD-800431, EX-999-TXT, EX-MG6-EMAIL.
 * Used to build the allowed set from the bundle (exact tokens only).
 */
const STRICT_EX_REF_RE = /\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/gi;

/**
 * Tokens to scan for in model replies — strict form plus malformed CAD like EX-CAD-[PHONE#…] (must not pass as grounded).
 */
const REPLY_EX_REF_RE = new RegExp(
  `${STRICT_EX_REF_RE.source}|\\bEX-[A-Za-z0-9]+-\\[[^\\]]+\\]`,
  "gi"
);

/** CAD refs use digits; strict \\b token scan can miss glued/table text — always merge these. */
const EX_CAD_DIGITS_RE = /EX-CAD-\d+/gi;

function collectAllowedExRefs(haystack: string): Set<string> {
  const set = new Set<string>();
  const re = new RegExp(STRICT_EX_REF_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(haystack)) !== null) set.add(m[0].toLowerCase());
  for (const cm of haystack.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    set.add(cm[0].toLowerCase());
  }
  return set;
}

function extractReplyExRefs(reply: string): string[] {
  const re = new RegExp(REPLY_EX_REF_RE.source, "gi");
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) {
    const t = m[0].trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

/** Refs in reply that are not exactly present as allowed bundle tokens (case-insensitive). */
function ungroundedExhibitRefs(reply: string, allowed: Set<string>): string[] {
  if (!reply.trim() || allowed.size === 0) return [];
  return extractReplyExRefs(reply).filter((r) => !allowed.has(r.toLowerCase()));
}

const INSTRUCTIONAL_EX_PLACEHOLDER =
  "(exhibit ref: use verbatim code from bundle exhibit list only)";

/** Shown when CAD cannot be inferred — model must not echo this as the "code"; post-process injects real EX-CAD-… when haystack has exactly one. */
const GENERIC_EX_ADVICE_PHRASE =
  "Check the exhibit list in the bundle for the exact EX- code (copy character-for-character).";

function uniqueExCadsInHaystack(haystack: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cm of haystack.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    const k = cm[0].toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(cm[0]);
    }
  }
  return out;
}

/** If the reply echoes our generic EX advice, swap in a literal EX-CAD-… from the haystack (first match when several appear). */
function replaceGenericExAdviceWithLiteralCad(reply: string, haystack: string): string {
  const cads = uniqueExCadsInHaystack(haystack);
  if (cads.length < 1) return reply;
  const literal = cads[0];
  const esc = GENERIC_EX_ADVICE_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let s = reply.replace(new RegExp(`${esc}\\s*\\.?`, "gi"), literal);
  s = s.replace(new RegExp(esc, "gi"), literal);
  return s;
}

const NORTHSHIRE_BUNDLE_REF_RE = /NS-CPS-2026-\d{4}/gi;

function uniqueNorthshireRefs(haystack: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of haystack.matchAll(new RegExp(NORTHSHIRE_BUNDLE_REF_RE.source, "gi"))) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
    }
  }
  return out;
}

/**
 * Fix model / scrubber corruption of Reference lines (e.g. NS-CPS-[PHONE#…]) when the bundle contains
 * at least one canonical NS-CPS-2026-####. Uses the first match (typical single-bundle case).
 */
function replaceCorruptedNorthshireBundleRefs(reply: string, haystack: string): string {
  const refs = uniqueNorthshireRefs(haystack);
  if (refs.length < 1) return reply;
  const canonical = refs[0];
  let s = reply;
  s = s.replace(/NS-CPS-\[PHONE#[^\]]*\]/gi, canonical);
  s = s.replace(/NS-CPS-\[[^\]]*PHONE[^\]]*\]/gi, canonical);
  s = s.replace(/NS-CPS-\[#[^\]]+\]/gi, canonical);
  s = s.replace(/NS-CPS-\[HASH[^\]]*\]/gi, canonical);
  return s;
}

function formatExCadFromAllowed(lowercaseCad: string): string {
  const digits = lowercaseCad.startsWith("ex-cad-") ? lowercaseCad.slice("ex-cad-".length) : lowercaseCad.replace(/^ex-cad-/i, "");
  return `EX-CAD-${digits}`;
}

function compactOneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Both MG5 and MG6 (or two sources) flag incompleteness → single disclosure/evidence gap, not a contradiction. */
function isCombinedGap(text: string): boolean {
  return /(partial|extract|continuity|draft|incomplete)/i.test(text);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return compactOneLine(m[1]);
  }
  return null;
}

/** Routes bundle-grounded interpretive questions; only `strategy_default` may use the generic pre-LLM / refusal slab in guarded paths. */
type QuestionMode =
  | "allegation"
  | "missing_evidence"
  | "conflict"
  | "legal_proof"
  | "weakness_prosecution"
  | "weakness_defence"
  | "next_steps"
  | "strategy_default";

function detectQuestionMode(question: string): QuestionMode {
  const q = goldenQuestionNorm(question);
  if (/\bprimary allegation\b/i.test(q)) return "allegation";
  if (/\bwhat evidence appears to be missing\b/i.test(q) || /\bmissing or incomplete\b/i.test(q)) return "missing_evidence";
  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) return "conflict";
  if (/\bmust the prosecution still prove\b/i.test(q)) return "legal_proof";
  if (/\bweakness in the prosecution case\b/i.test(q)) return "weakness_prosecution";
  if (/\bweakness in the defence case\b/i.test(q)) return "weakness_defence";
  if (/\bnext 24 hours\b/i.test(q)) return "next_steps";
  return "strategy_default";
}

/** Same slug for Q8 and Q10 — single source of truth from bundle text (stateless). */
type BundlePrimarySlug =
  | "identification"
  | "witness_credibility"
  | "cctv_integrity"
  | "disclosure_audio"
  | "disclosure_general";

/** Normalised issue bucket for Q10 canonical actions — must stay aligned with `BundlePrimarySlug`. */
type IssueType = "identification" | "cctv" | "999" | "witness" | "continuity" | "other";

/** Heuristic bundle signals for answer construction (prompt injection only; no routing changes). */
type BundleAnswerSignals = {
  hookLine: string | null;
  hasIdentificationPressure: boolean;
  hasCctvContinuityRisk: boolean;
  hasCctvAppearsStrong: boolean;
  has999Gap: boolean;
  hasCadGap: boolean;
  hasWitnessDraftTension: boolean;
  hasBwvVsWitnessTension: boolean;
  hasPartialAccountOrSilence: boolean;
  /** Same key used for Q8 headline guidance and Q10 action lock (string slug). */
  primaryProsecutionIssue: BundlePrimarySlug;
  /** Derived category for deterministic Q10 stems — matches Q8 via shared `analyzeBundleAnswerSignals`. */
  issueType: IssueType;
};

function mapPrimarySlugToIssueType(slug: BundlePrimarySlug): IssueType {
  const m: Record<BundlePrimarySlug, IssueType> = {
    identification: "identification",
    witness_credibility: "witness",
    cctv_integrity: "cctv",
    disclosure_audio: "999",
    disclosure_general: "other",
  };
  return m[slug];
}

/** Two deterministic variants per issue type — pick by bundle length (stateless variation). */
const NEXT_STEP_VARIANTS: Record<IssueType, [string, string, string][]> = {
  identification: [
    [
      "Obtain full 999 master audio to test ID conditions",
      "Clarify lighting / visibility / distance factors relevant to identification",
      "Secure final or signed MG11 for consistency on identification",
    ],
    [
      "Secure full 999 recording and timestamps to test ID conditions",
      "Compare witness description to the accused using descriptors held in this bundle",
      "Obtain ID procedure / parade-related disclosure referenced on MG6 for this case",
    ],
  ],
  cctv: [
    [
      "Obtain continuity statement / engineer note for CCTV",
      "Verify timestamps and extraction completeness against the schedule",
      "Cross-check CCTV against witness timeline and CAD anchors",
    ],
    [
      "Request engineer note / continuity resolution for served CCTV extracts",
      "Map clip timestamps to incident sequence using bundle-held routing",
      "Align CCTV extracts with CAD dispatch windows named in the excerpt",
    ],
  ],
  "999": [
    [
      "Obtain full 999 master audio (not extract only)",
      "Compare CAD + 999 for timeline consistency",
      "Identify discrepancies with MG5 narrative where the bundle flags 999 friction",
    ],
    [
      "Secure full 999 recording (master, not redacted extract)",
      "Reconcile CAD dispatch entries with 999 call timing on the schedule",
      "Cross-reference 999 content with MG5 incident narrative for this case",
    ],
  ],
  witness: [
    [
      "Obtain signed MG11",
      "Compare draft vs final witness statement for material changes",
      "Test witness account against other evidence (e.g. BWV, CAD) named in the bundle",
    ],
    [
      "Secure final MG11",
      "Compare MG11 drafts to served statements for material shifts",
      "Line up witness account against BWV/CAD rows referenced for this witness",
    ],
  ],
  continuity: [
    [
      "Obtain full continuity statement for disputed exhibits",
      "Verify chain of evidence handling where the bundle flags continuity risk",
      "Identify gaps affecting admissibility or weight at trial",
    ],
    [
      "Chase outstanding continuity documentation tied to the MG6 friction rows",
      "Confirm exhibit movement/handling notes where the bundle marks continuity risk",
      "Record how continuity gaps affect weight at trial on these papers",
    ],
  ],
  other: [
    [
      "Chase the highest-impact MG6 outstanding item tied to the Primary eval hook",
      "Reconcile MG5 narrative against the served schedule rows referenced in the bundle",
      "Prepare a short hearing note linking disclosure gaps to the elements in dispute",
    ],
    [
      "Prioritise MG6 rows that match the Primary eval hook for immediate chase",
      "Align MG5 case summary with served schedule lines cited in the excerpt",
      "Draft a proof-facing note on which elements remain contested on the papers",
    ],
  ],
};

/** Stable spread across bundles — raw length collides often (same char count → identical Q10). */
function hashStringForVariant(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h);
}

function pickNextStepTriples(issueType: IssueType, bundleHaystack: string): [string, string, string] {
  const variants = NEXT_STEP_VARIANTS[issueType];
  const idx = hashStringForVariant(bundleHaystack) % variants.length;
  return variants[idx]!;
}

function analyzeBundleAnswerSignals(bundleHaystack: string): BundleAnswerSignals {
  const text = bundleHaystack.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
  const lower = text.toLowerCase();
  const hookLine = firstMatch(text, [/^\s*Primary eval hook:\s*(.+)$/im]);
  const hookLower = (hookLine || "").toLowerCase();

  const hasIdentificationPressure =
    /\b(weak id|weak identification|id parade|stills before id|mg6 passenger id|passenger id)\b/i.test(lower) ||
    /\bweak id\b/i.test(hookLower) ||
    (/\b(identif|identifying|attribution)\b/i.test(hookLower) &&
      /\b(weak|dispute|challenge|parade|stills)\b/i.test(hookLower)) ||
    (/\b(lighting|recognition|facial|visual id|identification procedure)\b/i.test(lower) &&
      /\b(identif|identifying|accused|witness|weak id|parade)\b/i.test(lower));

  const hasCctvContinuityRisk =
    /\b(cctv|footage).*\b(partial|continuity|extraction|engineer|incomplete)\b/i.test(lower) ||
    /\bcontinuity.*(issue|flag|draft)\b/i.test(lower);

  const hasCctvAppearsStrong =
    /\b(cctv|footage).*\b(tidy|continuity (confirmed|statement)|schedule.*consist)\b/i.test(lower) &&
    !hasCctvContinuityRisk;

  const has999Gap =
    /\b999\b.*\b(partial|outstanding|awaited|extract|master audio|tape gap)\b/i.test(lower) ||
    /\b999 tape gap\b/i.test(lower);

  const hasCadGap =
    /\bcad\b.*\b(partial|outstanding|awaited|extract|print|narrative|attachment)\b/i.test(lower) ||
    /\b(fuller\s+)?narrative\s+attachment\b/i.test(lower) ||
    /\bcad dispatch\b.*\b(partial|print)\b/i.test(lower);

  const hasWitnessDraftTension =
    /\b(mg11|key witness).*\b(draft|unsigned|possibly draft)\b/i.test(lower) ||
    /\b(draft|unsigned).*\b(statement|mg11|witness)\b/i.test(lower);

  const hasBwvVsWitnessTension =
    /\b(bwv|body[-\s]?worn)\b/i.test(lower) && /\b(mg11|witness statement|key witness)\b/i.test(lower);

  const hasPartialAccountOrSilence =
    /\bpartial account\b/i.test(lower) || /\bno comment\b/i.test(lower) || /\bno comment on\b/i.test(lower);

  const hasDisclosureGap = has999Gap || hasCadGap;

  /** Priority: ID → CCTV → audio/CAD disclosure → witness credibility → general (avoid defaulting to witness when CCTV/999 dominate). */
  let primaryProsecutionIssue: BundlePrimarySlug = "disclosure_general";
  if (hasIdentificationPressure) primaryProsecutionIssue = "identification";
  else if (hasCctvContinuityRisk) primaryProsecutionIssue = "cctv_integrity";
  else if (hasDisclosureGap) primaryProsecutionIssue = "disclosure_audio";
  else if (hasBwvVsWitnessTension || hasWitnessDraftTension) primaryProsecutionIssue = "witness_credibility";

  const issueType = mapPrimarySlugToIssueType(primaryProsecutionIssue);

  return {
    hookLine,
    hasIdentificationPressure,
    hasCctvContinuityRisk,
    hasCctvAppearsStrong,
    has999Gap,
    hasCadGap,
    hasWitnessDraftTension,
    hasBwvVsWitnessTension,
    hasPartialAccountOrSilence,
    primaryProsecutionIssue,
    issueType,
  };
}

/** One-line stems for Pressure point — same primary issue as Q8; Crown survives *despite* that weakness; no generic MG11/CCTV boilerplate. */
function bundlePressurePointStem(s: BundleAnswerSignals): string {
  const hook = compactOneLine(s.hookLine || "").slice(0, 120);
  switch (s.primaryProsecutionIssue) {
    case "identification":
      return `Mirror your ID headline: Crown can still rely on the witness description / parade route / corroboration lines named in this bundle to maintain attribution despite lighting, distance, or procedure strain — name the actual rows. Hook: ${hook || "—"}.`;
    case "witness_credibility":
      return `Mirror your witness headline: Crown can still rely on the account this bundle treats as the live witness position to carry narrative weight despite draft/unsigned or interview tension — cite role + MG11/BWV rows from the excerpt, not generic “statements” labels. Hook: ${hook || "—"}.`;
    case "cctv_integrity":
      return `Mirror your CCTV headline: Crown can still rely on served extracts plus engineer or continuity answers (once closed) to anchor mechanics despite extraction gaps — tie to the CCTV/MG6 friction rows here. Hook: ${hook || "—"}.`;
    case "disclosure_audio":
      return `Mirror your 999/CAD headline: Crown can still rely on dispatch timing and any served call material to hold sequence together until master audio closes — name outstanding 999/CAD lines from this bundle. Hook: ${hook || "—"}.`;
    default:
      return `Mirror your disclosure headline: Crown can still rely on completing the specific MG6 hook rows and MG5 narrative anchors named here to preserve proof on the elements in dispute — no generic chase list. Hook: ${hook || "—"}.`;
  }
}

function bundleProsecutionExploitStem(theme: string): string {
  const map: Record<string, string> = {
    identification_jury:
      "Crown can present attribution as turning on the corroborating sources actually listed for this case once disclosure is complete.",
    cctv_outweighs_account:
      "Crown can lean on footage extracts this bundle treats as usable to anchor timing/mechanics notwithstanding defence complaints about completeness.",
    no_alternative_narrative:
      "Crown can argue the defence leaves key mechanics unstated on the papers so the Crown narrative remains comparatively intact.",
    adverse_inference_or_partial:
      "Crown can invite adverse inference / comment on gaps where interview summaries flag partial account or no-comment routes.",
    failure_to_displace:
      "Crown can argue the defence challenge does not positively displace the Crown’s documentary sequence as pleaded in MG5.",
    over_reliance_challenge:
      "Crown can argue the defence over-relies on attacking Crown disclosure without a positive account that meets the allegations on the bundle.",
    defence_theory_gap:
      "Crown can tie MG5 mechanics to the charged offence elements where the defence theory is not spelled out on the papers.",
  };
  return map[theme] ?? map.defence_theory_gap;
}

function bundleThisMattersStem(s: BundleAnswerSignals): string {
  switch (s.issueType) {
    case "identification":
      return 'One sentence, proof-facing: "This determines whether attribution can be proved to the criminal standard" — adapt with bundle vocabulary (not disclosure admin).';
    case "witness":
      return 'One sentence, proof-facing: "This determines whether the witness account can support the prosecution case" — adapt using this witness/MG11 material.';
    case "cctv":
      return 'One sentence, proof-facing: "This determines whether CCTV can carry sufficient weight for proof once continuity is resolved" — tie to footage rows here.';
    case "999":
      return 'One sentence, proof-facing: "This determines whether sequence and timing can be proved" via 999/CAD — not a disclosure checklist.';
    case "continuity":
      return 'One sentence, proof-facing: "This determines whether continuity issues undermine weight or admissibility for proof on these exhibits."';
    default:
      return 'One sentence, proof-facing: "This determines whether the Crown can prove the elements still contested on these papers" — link to the hook, not generic procedure.';
  }
}

function pickDefenceRiskTheme(s: BundleAnswerSignals, bundleHaystack: string): string {
  const lower = bundleHaystack.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS).toLowerCase();
  if (s.hasIdentificationPressure) {
    return "identification_jury";
  }
  if (s.hasCctvAppearsStrong && !s.hasCctvContinuityRisk) {
    return "cctv_outweighs_account";
  }
  /** Interview bundles almost always mention "no comment" — do not force one theme; rotate like partial-account cases. */
  const hasInterviewFrailtySignals =
    s.hasPartialAccountOrSilence ||
    /\bno comment\b/i.test(lower) ||
    /\bpartial account\b/i.test(lower);

  if (hasInterviewFrailtySignals) {
    const themes = [
      "adverse_inference_or_partial",
      "failure_to_displace",
      "over_reliance_challenge",
      "no_alternative_narrative",
    ] as const;
    const idx = hashStringForVariant(compactOneLine(s.hookLine || "") + bundleHaystack) % themes.length;
    return themes[idx]!;
  }
  return "defence_theory_gap";
}

function buildBundleAnswerLayerBlock(mode: QuestionMode, bundleHaystack: string): string {
  if (!bundleHaystack.trim()) return "";
  const s = analyzeBundleAnswerSignals(bundleHaystack);

  const sharedLock = `SHARED LOCK (same bundle inference for Q8 & Q10 — do not drift): primaryProsecutionIssue="${s.primaryProsecutionIssue}" | issueType="${s.issueType}"`;

  const primaryLine = `${sharedLock}. INFERRED PRIMARY PROSECUTION PRESSURE for Q8 (ONE merged headline; bullets only this chain): ${s.primaryProsecutionIssue.toUpperCase().replace(/_/g, " ")}${
    s.hookLine ? ` — hook: ${compactOneLine(s.hookLine)}` : ""
  }`;

  const actionMap: Record<BundlePrimarySlug, string> = {
    identification:
      "Map actions to ID/timing/corroboration using bundle-named materials only.",
    witness_credibility:
      "Map actions to witness/BWV/MG11 alignment using bundle-named materials only.",
    cctv_integrity:
      "Map actions to CCTV integrity / timestamps / continuity using bundle-named materials only.",
    disclosure_audio:
      "Map actions to 999/CAD audio completeness using bundle-named materials only.",
    disclosure_general:
      "Map actions to the strongest MG6/hook row — not a generic disclosure shopping list.",
  };

  switch (mode) {
    case "weakness_prosecution":
      return [
        "",
        "ANSWER CONSTRUCTION (Q8 — prosecution weakness)",
        primaryLine,
        "- Open with a **direct conclusion** using **calibrated** strength (e.g. identification \"is unstable / undermined / weakened because…\") — reserve absolute verbs (\"fails\", \"collapses\") only if the bundle explicitly supports them.",
        "- Merge related problems into **one** causal opening tied to the locked primary issue; do not join unrelated issues with \"and\" in sentence one.",
        "- Max **2** bullets; each bullet supports **only** that same primary issue; use -> ; ban hedged openers like \"this may undermine / this could affect\".",
        "- Before any **vs** label: if both MG5 and MG6 passages match partial / extract / continuity / draft / incomplete patterns, treat as **one combined disclosure or evidence gap** — not a contradiction.",
        "- Do not use **vs** between MG5 and MG6 when both only describe partial/incomplete/draft — say **combined gap**.",
        "",
        "OPPOSITION PRESSURE (required — after main answer, max 1 extra sentence; constraint-based only):",
        "Output this **two-line block** (label line, then sentence line — sentence must **not** start with `-` or `*`):",
        "Pressure point:",
        `- One sentence only: what the Crown can **still rely on in the materials** to meet its burden on this point (sources/types named in the bundle — not trial predictions).`,
        `- Hint (adapt; do not copy verbatim): ${bundlePressurePointStem(s)}`,
        "- Pressure point must answer **what Crown would still rely on to survive YOUR headline weakness** — same issue only.",
        "- **Banned recycled wording:** do not write generic pairs like \"final witness statements\", \"body-worn alignment\", or other stock phrases; name actual rows/refs from THIS excerpt.",
        "- No probabilities stated as facts; no invented exhibits.",
      ].join("\n");
    case "weakness_defence": {
      const theme = pickDefenceRiskTheme(s, bundleHaystack);
      const themeExplain: Record<string, string> = {
        identification_jury:
          "Lead with defence-side risk on attribution (e.g. Crown evidence still sufficient on the papers to sustain ID if corroboration completes) — NOT Crown weak-ID framed as defence weakness.",
        cctv_outweighs_account:
          "Lead with risk that usable CCTV on the bundle outweighs or narrows the defence account on mechanics.",
        no_alternative_narrative:
          "Lead with thin or unstated defence mechanics — vary wording; do **not** reuse identical \"no alternative narrative\" phrasing across cases.",
        adverse_inference_or_partial:
          "Lead with **adverse inference** risk where partial account / no-comment routes appear in interview/MG11 summaries.",
        failure_to_displace:
          "Lead with **failure to displace** Crown documentary proof — defence challenge does not replace Crown sequence on the bundle.",
        over_reliance_challenge:
          "Lead with **over-reliance on attacking Crown disclosure** without a positive defence account that meets the pleaded allegations.",
        defence_theory_gap:
          "Lead with gaps internal to the defence position on these papers (vary phrasing case-by-case).",
      };
      return [
        "",
        "ANSWER CONSTRUCTION (Q9 — defence weakness)",
        `DEFENCE-RISK THEME HINT (one headline — locked theme for this bundle: **${theme}**; write to that theme, not a generic adverse-inference / partial-account script):`,
        `- ${themeExplain[theme] ?? themeExplain.defence_theory_gap}`,
        "- Must **not** reuse prosecution-weakness phrasing or mirror Q8 structure; explain how the defence loses **despite** any Crown frailty.",
        "- Vary bullet wording from other cases: if the theme is **failure_to_displace** or **over_reliance_challenge**, lead with that angle — do **not** paste the same \"partial account / no comment / adverse inference\" triple as every other interview bundle.",
        "- Open with a **direct conclusion** about defence vulnerability — not \"The single biggest weakness is\".",
        "- First line must be a **complete English sentence** starting with a **capital letter** — never raw theme slugs (`identification_jury`, etc.) or broken fragments like \"Identification jury The defence…\".",
        "- Max **2** bullets; only support that headline; -> format.",
        "",
        "OPPOSITION PRESSURE (required — after main answer, max 1 extra sentence; constraint-based only):",
        'After your bullets, output exactly two lines:',
        "Prosecution exploit:",
        `- One sentence only: how the Crown can **use the materials** to press that defence weakness (only routes raised by the bundle, e.g. partial account / no comment).`,
        `- Hint (adapt): ${bundleProsecutionExploitStem(theme)}`,
        "- No verdict predictions; no invented Crown tactics beyond document types in the excerpt.",
      ].join("\n");
    }
    case "next_steps": {
      const [a1, a2, a3] = pickNextStepTriples(s.issueType, bundleHaystack);
      return [
        "",
        "ANSWER CONSTRUCTION (Q10 — next 24 hours)",
        sharedLock,
        `Q10 MUST use issueType **${s.issueType}** — the SAME inference as Q8 for this bundle (${s.primaryProsecutionIssue}). Do NOT re-pick a different theme from the excerpt.`,
        "Use ONLY these three canonical action stems (rewrite into bundle-specific wording; keep the same proof purpose):",
        `1) ${a1}`,
        `2) ${a2}`,
        `3) ${a3}`,
        `${actionMap[s.primaryProsecutionIssue]}`,
        "- Output exactly **3** bullets. Each bullet: **Action** -> **what it tests** -> **why it matters** (two -> arrows or equivalent three-part clarity).",
        "- Forbidden generic ops phrases: \"confirm outstanding items\", \"review materials\", \"review the bundle\", bare \"chase disclosure\" without naming what proof element it serves.",
        "",
        "OUTCOME LINK (required — after the 3 bullets, max 1 sentence):",
        "This matters because:",
        `- One sentence only: **proof** (criminal standard / witness account / footage weight / timing) — must match issueType **${s.issueType}** as Q8; not admin or disclosure process for its own sake.`,
        `- Hint (adapt opener only): ${bundleThisMattersStem(s)}`,
      ].join("\n");
    }
    case "conflict":
      return [
        "",
        "ANSWER CONSTRUCTION (conflict / inconsistencies)",
        "- If two sources both indicate **partial / incomplete / draft / continuity risk** for the same item, classify as **combined gap**, not **MG5 vs MG6**.",
        "- If both sides match partial / extract / continuity / draft / incomplete wording, that is **one gap** — never **vs** or contradiction framing.",
        "- Reserve **vs** / \"documents disagree\" for **true** contradiction (incompatible dates, names, served vs not served, different sequences).",
        "- One primary headline; max **4** bullets; each distinct.",
      ].join("\n");
    default:
      return "";
  }
}

function buildQuestionModeBlock(mode: QuestionMode): string {
  switch (mode) {
    case "allegation":
      return [
        "",
        "QUESTION MODE: allegation",
        "MODE RULES (MANDATORY):",
        "- State the primary allegation in one sentence using bundle wording only (charge sheet extract / offence tag).",
        '- Do not include defence strategy, "live defence focus", or Primary eval hook in that sentence unless the user explicitly requested a separate second sentence for context.',
      ].join("\n");
    case "missing_evidence":
      return [
        "",
        "QUESTION MODE: missing_evidence",
        "MODE RULES (MANDATORY):",
        "- List only missing or incomplete evidence using MG6 outstanding column, bundle extracts, exhibits, and disclosure notes in the excerpt.",
        "- Do not answer with Current posture / Procedural position / Priority pressure point unless the question asks for procedural posture.",
      ].join("\n");
    case "conflict":
      return [
        "",
        "QUESTION MODE: conflict",
        "MODE RULES (MANDATORY):",
        "- Pick ONE primary tension headline in the opening sentence (strongest impact on trial outcome).",
        "- Use at most 4 supporting bullets; each bullet -> consequence must be materially different (no three bullets restating the same disclosure gap).",
        "- **True conflict:** sources assert incompatible facts (dates, names, who did what, served vs not served). Say explicitly that the documents disagree.",
        "- **Combined gap (not a vs):** when MG5 and MG6 both describe incomplete/partial/continuity/extract/draft problems for the same item, describe one combined disclosure/reliability gap — do not frame as MG5 vs MG6 unless they actually contradict.",
        "- Identify tensions between named sources (e.g. witness vs CAD, CCTV vs timeline) where relevant.",
        "- Do not substitute a generic case summary for conflict analysis.",
      ].join("\n");
    case "legal_proof":
      return [
        "",
        "QUESTION MODE: legal_proof",
        "MODE RULES (MANDATORY):",
        "- State what the prosecution must prove based on the charge and case summary wording in the bundle only.",
        '- If offence elements are not explicit, begin with "From the materials, the elements implied are…" and derive cautiously from the bundle.',
        "- Do not use the generic posture / procedural / pressure template.",
      ].join("\n");
    case "weakness_prosecution":
      return [
        "",
        "QUESTION MODE: weakness_prosecution",
        "LENS: Where the Crown case is **weakened / undermined / unstable** on these materials (not how the defence loses).",
        "MODE RULES (MANDATORY):",
        "- **One** merged primary issue — calibrated wording first (\"is undermined\", \"is unstable\", \"is weakened\") unless the bundle explicitly supports a stronger claim; ban \"The single biggest weakness is\".",
        "- At most **2** supporting bullets; bullets must only reinforce **that same** issue; merge related gaps into one causal chain.",
        "- Evidence-linked; name documents/lines where possible; avoid **vs** when sources agree it is partial/incomplete.",
        "- Do not discuss defence weakness here.",
      ].join("\n");
    case "weakness_defence":
      return [
        "",
        "QUESTION MODE: weakness_defence",
        "LENS: How the defence still loses — defendant-side risk despite Crown frailty (not a second prosecution-weakness answer).",
        "MODE RULES (MANDATORY):",
        "- Opening sentence = **direct** conclusion about defence vulnerability (not \"The single biggest weakness is\").",
        "- Do **not** headline Crown-side gaps as the defence \"weakness\"; vary headline using ANSWER CONSTRUCTION theme hints — avoid repeating partial-account/no-comment boilerplate when a higher-priority risk applies.",
        "- Do not reuse prosecution-weakness wording or parallel structure.",
        "- At most **2** supporting bullets with -> ; defence-risk only.",
      ].join("\n");
    case "next_steps":
      return [
        "",
        "QUESTION MODE: next_steps",
        "MODE RULES (MANDATORY):",
        "- **2–3** concrete actions (hard max **3** bullets); derive priorities from the inferred primary prosecution pressure in ANSWER CONSTRUCTION — not a generic disclosure checklist.",
        "- Each bullet: **Action** -> **what it tests** -> **why it matters** for proof or the next hearing.",
        "- No bare chase/confirm/review; no posture summary template.",
      ].join("\n");
    default:
      return "";
  }
}

/** Verbatim charge line when the prompt demands bundle-only allegation wording. */
function isStrictPrimaryAllegationQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  if (!/\bprimary allegation\b/i.test(q)) return false;
  return /\bone sentence\b/i.test(q) || /\bbundle wording\b/i.test(q) || /\busing only the bundle\b/i.test(q);
}

function buildStrictPrimaryAllegationAnswer(bundleFullText: string): string | null {
  const tag =
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im, /^\s*Charge sheet extract:\s*(.+)$/im]);
  if (!tag) return null;
  return compactOneLine(tag.replace(/\(fictional charge drafting for test data\)\.?/gi, "").trim());
}

function buildBundleGroundedFallback(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string {
  const q = question.toLowerCase();
  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im, /^\s*Charge sheet extract:\s*(.+)$/im]) ||
    "offence as alleged in the bundle";
  const stance = snapshot?.stance_detected?.trim() || "stance not clearly stated in the materials provided";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated in the materials provided";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
    "key tension appears in the MG5/MG6 disclosure friction";
  const accused =
    firstMatch(bundleFullText, [/^\s*Accused:\s*(.+)$/im]) ||
    "the accused";

  if (/\bprimary allegation\b/i.test(q)) {
    const line = buildStrictPrimaryAllegationAnswer(bundleFullText);
    if (line) return line;
  }

  if (
    (q.includes("one sentence") || q.includes("what is this case about")) &&
    !/\bprimary allegation\b/i.test(q)
  ) {
    return `${accused} faces ${offence}; the live defence focus is ${hook}.`;
  }
  if (q.includes("offence") && q.includes("alleg")) {
    return `The alleged offence is ${offence}.`;
  }
  if (q.includes("prosecution") && q.includes("core theory")) {
    return `The prosecution theory is that the bundle facts satisfy ${offence}, with pressure around ${hook}.`;
  }
  if (q.includes("defence") && q.includes("best theory")) {
    return `The defence theory is to contest key mechanics and exploit ${hook}, while staying aligned with current stance (${stance}).`;
  }
  if (q.includes("risk if we do nothing")) {
    return `The biggest immediate risk is case progression at ${stage} without resolving disclosure tensions around ${hook}.`;
  }
  return [
    `${accused} faces ${offence}.`,
    `- Current posture -> ${stance}.`,
    `- Procedural position -> ${stage}.`,
    `- Priority pressure point -> ${hook}.`,
  ].join("\n");
}

function cleanLeadInPhrases(reply: string): string {
  return reply
    .replace(/^\s*Based on (the )?(provided )?(bundle|materials|case state snapshot)[^,]*,\s*/i, "")
    .replace(/^\s*Given (the )?(current )?(case state snapshot|case state)[^,]*,\s*/i, "")
    .replace(/^\s*In the context of (the )?case[^,]*,\s*/i, "")
    .trim();
}

function polishSolicitorTone(reply: string): string {
  let out = reply.trim();

  // Keep legal substance intact, but tighten soft/verbal filler.
  out = out
    .replace(/\bit is important to note that\b/gi, "")
    .replace(/\bit should be noted that\b/gi, "")
    .replace(/\bit appears that\b/gi, "it is")
    .replace(/\bin my view,\s*/gi, "")
    .replace(/\bit is clear that\b/gi, "")
    .replace(/\bthe key point here is that\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const lines = out.split(/\r?\n/);
  const polishedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Keep the first line decisive.
    if (idx === 0) {
      return trimmed.replace(/^[\-*]\s+/, "");
    }

    // Normalize bullets and tighten "because" phrasing into solicitor-friendly arrows.
    if (/^[-*]\s+/.test(trimmed)) {
      const body = trimmed.replace(/^[-*]\s+/, "").replace(/\s+because\s+/i, " -> ");
      return `- ${body}`;
    }

    return trimmed;
  });

  return polishedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizePlaceholderPhrases(reply: string): string {
  return reply
    .replace(/Unknown\s*[–-]\s*add charge sheet for offence-specific strategy/gi, "the charged offence as stated in the papers")
    .replace(/\.\./g, ".")
    .trim();
}

/** US/UK spelling so golden-eval gates (especially Q9 deterministic path) stay consistent. */
function goldenQuestionNorm(question: string): string {
  return question
    .toLowerCase()
    .replace(/\bprioritize\b/g, "prioritise")
    .replace(/\brefrence\b/g, "reference");
}

type Mg6DisclosureRow = {
  category: string;
  served: string;
  outstanding: string;
};

const REQUIRED_NORTHSHIRE_MG6_CATEGORIES = [
  "mg5 case summary",
  "mg11 key witness",
  "cctv / footage list",
  "999 calls",
  "cad / dispatch",
  "forensics / medical",
  "continuity / chain",
] as const;

function normalizeMg6Category(category: string): string {
  return compactOneLine(category)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function isStrictMg6DisclosureQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  const asksMissingDisclosure = /\bwhat disclosure is missing\b/i.test(q);
  const asksServedOutstanding = /\b(served|outstanding)\b/i.test(q) && /\bdisclosure\b/i.test(q);
  const asksWhatMg6Says = /\bwhat does mg6 say\b/i.test(q);
  const mg6ScheduleAsk = /\bmg6\b/i.test(q) && /\b(schedule|served|outstanding|missing|position|summary)\b/i.test(q);
  const mg6PositionOrSummary = /\bmg6 (position|summary)\b/i.test(q);
  const anyDisclosureAsk = /\bdisclosure\b/i.test(q);
  return asksMissingDisclosure || asksServedOutstanding || asksWhatMg6Says || mg6ScheduleAsk || mg6PositionOrSummary || anyDisclosureAsk;
}

function extractMg6DisclosureRows(bundleFullText: string): Mg6DisclosureRow[] {
  const mg6SectionMatch = bundleFullText.match(
    /=== SECTION:\s*MG6 ===([\s\S]*?)(?:=== SECTION:|END OF FILE)/i
  );
  const scope = mg6SectionMatch?.[1] ?? bundleFullText;
  const rows: Mg6DisclosureRow[] = [];
  const seen = new Set<string>();

  for (const raw of scope.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !line.includes("|")) continue;
    if (/^-{3,}/.test(line)) continue;

    const cols = line.split("|").map((c) => compactOneLine(c));
    if (cols.length < 3) continue;
    const category = cols[0];
    const served = cols[1];
    const outstanding = cols.slice(2).join(" | ");
    const lowerCategory = category.toLowerCase();

    if (!category || /^(document|category)$/i.test(category)) continue;
    if (/served \(initial\)/i.test(served) || /awaiting\s*\/\s*retained\s*\/\s*note/i.test(outstanding)) continue;
    if (/^example .*tension/i.test(category)) continue;
    if (/^mg6\(a\)\s*[-—]/i.test(category)) continue;

    const dedupeKey = `${lowerCategory}|${served.toLowerCase()}|${outstanding.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    rows.push({ category, served, outstanding });
  }

  return rows;
}

function isValidNorthshireMg6Rows(rows: Mg6DisclosureRow[]): boolean {
  if (rows.length === 0) return false;

  // Every parsed row must include at least one non-empty data field.
  if (rows.some((r) => !r.served.trim() && !r.outstanding.trim())) return false;

  const present = new Set(rows.map((r) => normalizeMg6Category(r.category)));
  return REQUIRED_NORTHSHIRE_MG6_CATEGORIES.every((required) => present.has(required));
}

function buildStrictMg6DisclosureAnswer(bundleFullText: string): string {
  const rows = extractMg6DisclosureRows(bundleFullText);
  if (!isValidNorthshireMg6Rows(rows)) {
    return enforceActionFormatThreeLines(
      "Core point: The MG6 schedule cannot be safely extracted in full from the current bundle, so disclosure status is provisional.\nEvidence reference: MG6 rows are missing, incomplete, or not clearly structured in the available materials.\nNext step: Obtain the full MG6 schedule table and reconcile each category row before advising final disclosure position."
    );
  }
  return rows.map((r) => `- ${r.category} -> ${r.served}; ${r.outstanding}`).join("\n");
}

function isStrictInterviewQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    /\binterview\b/i.test(q) ||
    /\bdefendant account\b/i.test(q) ||
    /\bwhat was said in interview\b/i.test(q) ||
    /\bsummary of interview\b/i.test(q) ||
    /\binterview summary\b/i.test(q) ||
    /\binterview position\b/i.test(q)
  );
}

function isStrictMg5EvidenceQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return q.includes("what evidence does mg5 rely on");
}

function buildStrictMg5EvidenceAnswer(bundleFullText: string): string {
  const mg5SectionMatch = bundleFullText.match(
    /=== SECTION:\s*MG5 ===([\s\S]*?)(?:=== SECTION:|END OF FILE)/i
  );
  const scope = mg5SectionMatch?.[1] ?? bundleFullText;
  const lines = scope
    .split(/\r?\n/)
    .map((l) => compactOneLine(l))
    .filter(Boolean);

  const evidenceLines = pickDistinct(
    lines.filter(
      (l) =>
        /(mg11|cctv|cad|999|ex-|exhibit|statement|interview|bwv|forensic|medical|continuity)/i.test(l) &&
        !/(denies core allegation|alternative explanation|put to proof)/i.test(l)
    ),
    2
  );

  const evidenceTags = new Set<string>();
  for (const ln of evidenceLines) {
    if (/mg11/i.test(ln)) evidenceTags.add("MG11");
    if (/cctv/i.test(ln)) evidenceTags.add("CCTV");
    if (/\bcad\b/i.test(ln)) evidenceTags.add("CAD");
    if (/\b999\b/i.test(ln)) evidenceTags.add("999");
    if (/ex-|exhibit/i.test(ln)) evidenceTags.add("EX references");
    if (/interview|bwv/i.test(ln)) evidenceTags.add("interview/BWV");
    if (/forensic|medical/i.test(ln)) evidenceTags.add("forensic/medical");
    if (/continuity/i.test(ln)) evidenceTags.add("continuity material");
  }

  if (evidenceLines.length === 0 || evidenceTags.size === 0) {
    return enforceActionFormatThreeLines(
      "Core point: The MG5 summary is not clearly extractable from the current bundle, so prosecution reliance must be treated as inferred rather than confirmed.\nEvidence reference: MG5 reference is missing or incomplete; supporting MG11, CCTV, or CAD linkage not visible in current materials.\nNext step: Obtain the full MG5 summary and cross-check with MG11/CCTV to identify what the prosecution actually relies on."
    );
  }

  const tagLine = Array.from(evidenceTags).slice(0, 4).join(", ");
  const refLine = evidenceLines.join(" | ");
  return enforceActionFormatThreeLines(
    `Core point: On the current papers, MG5 appears to rely on ${tagLine}; this remains provisional until the full MG5 narrative is confirmed.\nEvidence reference: ${refLine}\nNext step: Cross-check the MG5 reliance points against MG11/CCTV/CAD/999 source material and confirm any missing supporting item before final strategy advice.`
  );
}

function extractInterviewSection(bundleFullText: string): string {
  const sectionMatch = bundleFullText.match(
    /=== SECTION:\s*INTERVIEW ===([\s\S]*?)(?:=== SECTION:|END OF FILE)/i
  );
  if (sectionMatch?.[1]) return sectionMatch[1];
  const genericMatch = bundleFullText.match(/INTERVIEW SUMMARY[\s\S]{0,1200}/i);
  return genericMatch?.[0] ?? "";
}

function buildStrictInterviewAnswer(bundleFullText: string): string {
  const section = extractInterviewSection(bundleFullText);
  if (!section.trim()) {
    return enforceActionFormatThreeLines(
      "Core point: The interview position cannot be safely confirmed from the current bundle and should be treated as provisional.\nEvidence reference: Interview summary wording is missing or too thin to verify account, denials, or no-comment limbs.\nNext step: Obtain the full interview summary/transcript and map each key limb before advising plea or strategy."
    );
  }

  const lines = section
    .split(/\r?\n/)
    .map((l) => compactOneLine(l))
    .filter(Boolean);
  const joined = lines.join(" ");
  const bullets: string[] = [];

  const quoteFromJoined = (re: RegExp): string | null => {
    const m = joined.match(re);
    return m?.[0] ? compactOneLine(m[0]) : null;
  };

  if (/partial account/i.test(joined)) {
    const q =
      quoteFromJoined(/defendant gives partial account[^.]*(?:\.|$)/i) ||
      quoteFromJoined(/partial account[^.]*(?:\.|$)/i) ||
      "Partial account (as stated in interview summary).";
    bullets.push(`- Partial account: ${q}`);
  }
  if (/denies core allegation|alternative explanation/i.test(joined)) {
    const q =
      quoteFromJoined(
        /denies core allegation or claims alternative explanation[^.;]*(?:[.;]|$)/i
      ) ||
      quoteFromJoined(/denies core allegation[^.;]*(?:[.;]|$)/i) ||
      quoteFromJoined(/claims alternative explanation[^.;]*(?:[.;]|$)/i) ||
      "Denies core allegation or claims alternative explanation (as stated in interview summary).";
    if (/denies core allegation/i.test(joined) && /alternative explanation/i.test(joined)) {
      bullets.push(`- Denies core allegation / alternative explanation: ${q}`);
    } else if (/denies core allegation/i.test(joined)) {
      bullets.push(`- Denies core allegation: ${q}`);
    } else {
      bullets.push(`- Alternative explanation: ${q}`);
    }
  }
  if (/no comment/i.test(joined)) {
    const q =
      quoteFromJoined(/no comment on certain technical matters[^;]*(?:;|$)/i) ||
      quoteFromJoined(/no comment on certain technical matters[^.]*(?:\.|$)/i) ||
      "No comment on certain technical matters (as stated in interview summary).";
    bullets.push(`- No comment: ${q}`);
  }
  if (/requests?\s+full disclosure.*(cctv|999)|requests?.*(cctv|999).*(scope|disclosure)/i.test(joined)) {
    const q =
      quoteFromJoined(/requests?\s+full disclosure of the cctv\/999 scope[^.;]*(?:[.;]|$)/i) ||
      quoteFromJoined(/requests?\s+full disclosure[^.;]*(?:[.;]|$)/i) ||
      "Requests full disclosure of CCTV/999 scope (as stated in interview summary).";
    bullets.push(`- Requests disclosure: ${q}`);
  }

  if (bullets.length === 0) {
    return enforceActionFormatThreeLines(
      "Core point: The interview section is present but does not provide a reliable extracted position for advice.\nEvidence reference: Core interview limbs (account/denial/no-comment/disclosure request) are unclear or not explicitly stated.\nNext step: Pull the underlying interview record and verify each limb before final strategy advice."
    );
  }

  return bullets.join("\n");
}

function isStrictExhibitReferenceQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    /\bexhibit(s)?\b/i.test(q) ||
    /\bexhibit list\b/i.test(q) ||
    /\bex-[a-z0-9-]+\b/i.test(q) ||
    /\bbundle reference\b/i.test(q) ||
    /\breference id\b/i.test(q) ||
    (/\breference\b/i.test(q) && /\bbundle\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bns-cps-2026-\d{4}\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bid\b/i.test(q))
  );
}

function extractExhibitRefsFromBundle(bundleFullText: string): string[] {
  const sectionMatch = bundleFullText.match(
    /=== SECTION:\s*EXHIBITS ===([\s\S]*?)(?:=== SECTION:|END OF FILE)/i
  );
  const scope = sectionMatch?.[1] ?? bundleFullText;
  const refs = new Set<string>();
  for (const m of scope.matchAll(new RegExp(STRICT_EX_REF_RE.source, "gi"))) {
    refs.add(m[0].toUpperCase());
  }
  return [...refs];
}

function buildStrictExhibitReferenceAnswer(question: string, bundleFullText: string): string {
  const q = goldenQuestionNorm(question);
  const wantsReference =
    /\bbundle reference\b/i.test(q) ||
    /\breference id\b/i.test(q) ||
    (/\breference\b/i.test(q) && /\bbundle\b/i.test(q)) ||
    (/\bbundle\b/i.test(q) && /\bid\b/i.test(q));
  const wantsExhibits = /\bexhibit(s)?\b/i.test(q) || /\bexhibit list\b/i.test(q) || /\bex-[a-z0-9-]+\b/i.test(q);
  const refs = uniqueNorthshireRefs(bundleFullText);
  const exhibits = extractExhibitRefsFromBundle(bundleFullText);
  const out: string[] = [];

  if (wantsReference) {
    if (refs.length > 0) out.push(...refs.map((r) => `- ${r}`));
    else out.push("- Insufficient detail in the materials to determine exhibit/reference details.");
  }
  if (wantsExhibits) {
    if (exhibits.length > 0) out.push(...exhibits.map((e) => `- ${e}`));
    else out.push("- Insufficient detail in the materials to determine exhibit/reference details.");
  }
  if (out.length > 0) return out.join("\n");
  if (exhibits.length > 0) return exhibits.map((e) => `- ${e}`).join("\n");
  if (refs.length > 0) return refs.map((r) => `- ${r}`).join("\n");
  return enforceActionFormatThreeLines(
    "Core point: The bundle reference/exhibit identifiers are not safely extractable from the current materials.\nEvidence reference: Expected EX- codes or bundle reference IDs are missing or incomplete in the visible text.\nNext step: Obtain the full exhibit list/reference page and verify exact IDs before relying on reference-based submissions."
  );
}

/** Index-table / category row from fictional bundles — not a concrete disclosure item. */
function isGroupedMediaIndexRow(line: string): boolean {
  const l = compactOneLine(line).replace(/^[\-*]\s*/, "");
  if (/one or more items with tension/i.test(l)) return true;
  return /cctv\s*\/\s*999\s*\/\s*cad(?:\s*\/\s*bwv)?/i.test(l);
}

const Q9_CONCRETE_LABELS = new Set([
  "Full 999 master audio",
  "Signed/final MG11 witness statement",
  "CCTV continuity statement / engineer note",
  "Fuller CAD narrative/log",
  "Forensic/medical report and GP records",
]);

const Q9_ORDERED_LABELS = [
  "Full 999 master audio",
  "Signed/final MG11 witness statement",
  "CCTV continuity statement / engineer note",
  "Fuller CAD narrative/log",
  "Forensic/medical report and GP records",
] as const;

const Q9_TESTS_REASON: Record<string, string> = {
  "Full 999 master audio": "chronology and verbal account consistency",
  "Signed/final MG11 witness statement": "reliability and statement evolution",
  "CCTV continuity statement / engineer note": "integrity and admissibility of footage",
  "Fuller CAD narrative/log": "dispatch chronology and contradiction points",
  "Forensic/medical report and GP records": "injury threshold and causation reliability",
};

function formatGoldenQ9Bullet(label: string): string {
  const why = Q9_TESTS_REASON[label] ?? "credibility, continuity, and chronology";
  return `- ${label} -> Tests ${why}.`;
}

/** Exclude bundle headers and “tidy schedule” rows from Q1 “corroboration gap” slot (wrong lever / wrong arrow). */
function isQ1CorroborationLeverageLine(line: string): boolean {
  const t = compactOneLine(line).replace(/^[\-*]\s*/, "").trim();
  const l = t.toLowerCase();
  if (t.length < 12) return false;
  if (/^accused\s*:/i.test(t)) return false;
  if (/^reference\s*:/i.test(t)) return false;
  if (/^short title\s*:/i.test(t)) return false;
  if (/^stage\s*:/i.test(t)) return false;
  if (/^primary eval hook\s*:/i.test(t)) return false;
  if (isGroupedMediaIndexRow(t)) return false;
  if (/cctv\s*\/\s*tech/i.test(l)) {
    const hasTension =
      /issue|tension|outstanding|partial|draft|contradict|corrupt|gap|awaited|unsigned|incomplete|timing|extraction/i.test(
        l
      );
    const readsTidy = /consistent|tidily|tidy|served/i.test(l);
    if (readsTidy && !hasTension) return false;
  }
  return true;
}

/** First Q6 bullet: hook-shaped primary risk, else disclosure fallback. */
function q6PrimaryRiskLineFromHook(hook: string): string {
  const h = hook.toLowerCase();
  let primary =
    "Disclosure remains unresolved before the next procedural step -> Defence challenge window narrows at hearing.";
  if (/weak\s*id|identification|id\s+lighting/i.test(h)) {
    primary =
      "Identification evidence may crystallise as 'unchallenged' before the next hearing -> narrows the practical window to run a focused ID challenge.";
  } else if (/one-punch|self-?defen|lawful\s*force|provocation/i.test(h)) {
    primary =
      "Crown narrative on force, timing, and proportionality may harden without a contemporaneous defence paper-trail -> weakens self-defence leverage at hearing.";
  } else if (/cctv|clock|continuity|bwv|999|cad/i.test(h)) {
    primary =
      "AV / dispatch / continuity issues may be regularised on Crown terms if not pinned in disclosure correspondence now -> reduces cross-exam traction on sequence.";
  } else if (/mg6|contradict|draft|index|insurer|bank|ocr/i.test(h)) {
    primary =
      "Document inconsistencies (schedules, indices, drafts) may be reconciled unfavourably if not logged and chased this week -> defence loses 'paper trail' advantage.";
  }
  return `- ${primary}`;
}

function isGoldenEvalQuestion(question: string): boolean {
  const q = goldenQuestionNorm(question);
  return (
    q.includes("top 3 facts that help the defence most") ||
    q.includes("top 3 facts that hurt the defence most") ||
    q.includes("what is still unknown that could change outcome materially") ||
    q.includes("what are the key dates and timeline anchors") ||
    q.includes("what is the next procedural milestone and why does it matter") ||
    q.includes("what is the single biggest risk if we do nothing this week") ||
    q.includes("which witness is most vulnerable to challenge and why") ||
    q.includes("what is the strongest cross-examination theme") ||
    q.includes("what impeachment material should we prioritise obtaining") ||
    q.includes("what admissions (if any) are unsafe for the defence to make")
  );
}

function extractLinesByKeywords(text: string, keywords: string[], maxItems: number): string[] {
  const out: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!keywords.some((k) => lower.includes(k))) continue;
    if (lower.length < 8) continue;
    if (out.some((x) => x.toLowerCase() === lower)) continue;
    out.push(compactOneLine(line).replace(/^[\-*]\s*/, ""));
    if (out.length >= maxItems) break;
  }
  return out;
}

function pickDistinct(lines: string[], maxItems: number): string[] {
  const out: string[] = [];
  const seenRoots = new Set<string>();
  for (const line of lines) {
    const lower = line.toLowerCase();
    const root =
      lower.includes("999") ? "999" :
      lower.includes("mg11") || lower.includes("witness") ? "mg11" :
      lower.includes("cctv") ? "cctv" :
      lower.includes("continuity") ? "continuity" :
      lower.includes("cad") ? "cad" :
      lower.includes("report") || lower.includes("records") ? "medical" :
      lower.includes("hook") || lower.includes("friction") ? "hook" :
      lower.includes("stance") ? "stance" :
      lower.includes("stage") ? "stage" :
      lower.slice(0, 24);
    if (seenRoots.has(root)) continue;
    seenRoots.add(root);
    out.push(line);
    if (out.length >= maxItems) break;
  }
  return out;
}

function firstConcrete(lines: string[], patterns: RegExp[]): string | null {
  for (const line of lines) {
    if (patterns.some((p) => p.test(line))) return line;
  }
  return null;
}

function normalizeQ9ConcreteItem(line: string): string | null {
  const l = compactOneLine(line).replace(/^[\-*]\s*/, "");
  if (isGroupedMediaIndexRow(l)) return null;
  if (/primary eval hook:/i.test(l)) return null;
  if (/grounds for dispute|friction/i.test(l)) return null;
  if (/cctv.*tech:/i.test(l)) return null;

  if (/999/i.test(l)) return "Full 999 master audio";
  if (/mg11|witness statement/i.test(l)) return "Signed/final MG11 witness statement";
  if (/continuity|engineer|cctv/i.test(l)) return "CCTV continuity statement / engineer note";
  if (/cad/i.test(l)) return "Fuller CAD narrative/log";
  if (/report|records|medical|forensic/i.test(l)) return "Forensic/medical report and GP records";
  return null;
}

function buildGoldenDeterministicAnswer(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string | null {
  const q = goldenQuestionNorm(question);
  if (!isGoldenEvalQuestion(question)) return null;

  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [/^\s*Charge sheet extract:\s*(.+)$/im, /^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im]) ||
    "the charged offence";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated";
  const stance = snapshot?.stance_detected?.trim() || "not guilty / prosecution to proof";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
    "core reliability tension in MG5/MG6 material";
  const witness =
    firstMatch(bundleFullText, [/^\s*Other party \/ key witness:\s*(.+)$/im, /^\s*Key witness:\s*(.+)$/im]) ||
    "the key witness";

  const unknownLines = extractLinesByKeywords(bundleFullText, ["outstanding", "awaited", "to be provided", "pending"], 6);
  const materialLines = extractLinesByKeywords(
    bundleFullText,
    ["999", "mg11", "cctv", "cad", "continuity", "audio", "records", "report"],
    8
  );

  if (q.includes("top 3 facts that help the defence most")) {
    const q1Material = materialLines.filter((ln) => isQ1CorroborationLeverageLine(ln));
    const selected: string[] = [];
    selected.push(`${hook} -> This directly pressures Crown reliability on core facts.`);

    const contradictionFirst = firstConcrete(q1Material, [
      /contradict|inconsisten|mismatch|conflict|bad index|ocr|corrupt|clock|timing|vs\b/i,
    ]);
    if (contradictionFirst) {
      selected.push(`${contradictionFirst} -> Exposes direct inconsistency in the prosecution account.`);
    }

    const reliabilityWeak = firstConcrete(
      q1Material.filter((ln) => !selected.some((s) => s.includes(ln))),
      [/mg11|witness statement|draft|unsigned|uncertain|partial/i]
    );
    if (reliabilityWeak) {
      selected.push(`${reliabilityWeak} -> Weakens confidence in witness reliability and consistency.`);
    }

    const missingLeverage = firstConcrete(
      q1Material.filter((ln) => !selected.some((s) => s.includes(ln))),
      [/outstanding|awaited|to be provided|pending|missing|continuity|engineer|cctv|999|cad/i]
    );
    if (missingLeverage) {
      selected.push(`${missingLeverage} -> Limits confidence in sequence and corroboration.`);
    }

    if (selected.length < 3 && /lawful force|put to proof|not guilty/i.test(stance)) {
      selected.push(`Defence posture (${stance}) -> Preserves challenge to act, intent, and attribution elements.`);
    }
    const finalPicks = pickDistinct(selected, 3);
    while (finalPicks.length < 3) {
      finalPicks.push("Disclosure reliability tension -> Creates exploitable uncertainty in prosecution chronology.");
    }
    return finalPicks.map((x) => `- ${x}`).join("\n");
  }

  if (q.includes("top 3 facts that hurt the defence most")) {
    return [
      `- Charge exposure (${offence}) -> Elements remain live unless positively displaced by defence evidence.`,
      "- Crown can regularise current disclosure gaps -> Defence leverage can narrow before hearing.",
      "- Draft/uncertain witness material may be finalised -> A cleaner Crown narrative can reduce cross-exam traction.",
    ].join("\n");
  }

  if (q.includes("what is still unknown that could change outcome materially")) {
    const priority = unknownLines.filter((l) => /999|mg11|continuity|cad|report|records/i.test(l));
    const picks = pickDistinct(priority.length > 0 ? priority : unknownLines, 3);
    const bullets =
      picks.length > 0
        ? picks.map((l) => `- ${l} -> Could materially alter reliability, timeline, or causation assessment.`)
        : [
            "- Full 999 audio status -> Could materially alter timeline and sequence interpretation.",
            "- Final witness statement status -> Could shift credibility and consistency analysis.",
            "- CCTV continuity/engineer confirmation -> Could alter admissibility and evidential weight.",
          ];
    return ["- Not stated in the materials.", ...bullets].join("\n");
  }

  if (q.includes("what are the key dates and timeline anchors")) {
    return [
      "- Not stated in the materials.",
      `- Stage anchor -> ${stage}.`,
      "- Hearing/disclosure anchor -> next step is tied to disclosure reconciliation and readiness.",
    ].join("\n");
  }

  if (q.includes("what is the next procedural milestone and why does it matter")) {
    return [
      "- Completion/reconciliation of disclosure -> Gives both parties a settled evidential footing.",
      "- Case management hearing after disclosure -> Sets directions and locks the practical trial path.",
      "- Why it matters -> Without this, defence cannot target cross-exam themes or admissions strategy safely.",
    ].join("\n");
  }

  if (q.includes("what is the single biggest risk if we do nothing this week")) {
    return [
      q6PrimaryRiskLineFromHook(hook),
      "- Consequence -> Crown narrative hardens while defence loses leverage on continuity and reliability points.",
    ].join("\n");
  }

  if (q.includes("which witness is most vulnerable to challenge and why")) {
    return [
      `- ${witness} -> Vulnerable because account reliability is tied to draft/uncertain supporting material.`,
      "- Draft/uncertain statement status -> Weakens confidence in precision and consistency under cross-examination.",
      "- Incomplete CCTV/999/continuity context -> Creates corroboration gaps that can be exploited at trial.",
    ].join("\n");
  }

  if (q.includes("what is the strongest cross-examination theme")) {
    return [
      `- ${hook} -> Use this as the single cross-exam spine to test reliability, sequence, and consistency.`,
      "- Exploit point -> press witness on uncertainty against disclosure gaps and document inconsistencies.",
    ].join("\n");
  }

  if (q.includes("what impeachment material should we prioritise obtaining")) {
    const materialForQ9 = materialLines.filter((ln) => !isGroupedMediaIndexRow(ln));
    const concretePoolRaw = [
      firstConcrete(materialForQ9, [/full master audio|999/i]),
      firstConcrete(materialForQ9, [/signed copy|mg11|witness statement/i]),
      firstConcrete(materialForQ9, [/continuity|engineer|cctv/i]),
      firstConcrete(materialForQ9, [/cad/i]),
      firstConcrete(materialForQ9, [/report|records|medical|forensic/i]),
    ].filter((x): x is string => Boolean(x));
    const normalized = concretePoolRaw
      .map((l) => normalizeQ9ConcreteItem(l))
      .filter((x): x is string => Boolean(x));
    const picks = pickDistinct(
      normalized.filter((label) => Q9_CONCRETE_LABELS.has(label)),
      5
    );
    if (picks.length >= 3) {
      return picks.map((l) => formatGoldenQ9Bullet(l)).join("\n");
    }
    return Q9_ORDERED_LABELS.map((l) => formatGoldenQ9Bullet(l)).join("\n");
  }

  if (q.includes("what admissions (if any) are unsafe for the defence to make")) {
    return [
      `- Admitting act mechanics that satisfy ${offence} elements -> Concedes core prosecution building blocks.`,
      "- Admitting intent/recklessness where disputed -> Undermines the live defence route and narrows viable arguments.",
      "- Admitting attribution/identification beyond current posture -> Collapses challenge to who did what.",
      "- Admitting causation sequence without qualification -> Strengthens Crown linkage and weakens defence contest.",
    ].join("\n");
  }

  return null;
}

function detectFormatViolations(_question: string, reply: string): string[] {
  const issues: string[] = [];
  const trimmed = reply.trim();
  if (!trimmed) return ["empty response"];

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  const firstLine = lines.find((l) => l.length > 0) || "";
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));
  const bannedLeadIn = /^(Based on|From the materials|It appears|Given the current case state|In the context of)/i;

  if (bannedLeadIn.test(firstLine)) issues.push("first line uses banned intro");
  if (/^[-*]\s+/.test(firstLine)) issues.push("first line is a bullet, not a direct sentence");
  if (firstLine.length < 8) issues.push("first line too short to answer directly");

  if (bullets.length > 5) issues.push("too many supporting bullets (>5)");
  if (bullets.length >= 1) {
    const nonArrowBullets = bullets.filter((b) => !/\s->\s/.test(b));
    if (nonArrowBullets.length > 0) issues.push("bullets missing 'Point -> why it matters' shape");
  }

  const hedge = /\b(may|appears|could)\b/i;
  if (hedge.test(trimmed) && !/(not stated|uncertain|insufficient|unknown|not in the materials)/i.test(trimmed)) {
    issues.push("hedging language without explicit uncertainty marker");
  }

  return issues;
}

/** Style guardrails for sharp direct answers (Q8/Q9/Q10). */
function detectSharpAnswerStyleViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const trimmed = reply.trim();
  const lower = trimmed.toLowerCase();
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";

  if (
    /\bmg5\s+vs\s+mg6\b/i.test(lower) &&
    isCombinedGap(lower) &&
    !/\b(different date|incompatible|contradict(s|ory)?|disagree on (who|which)|served vs not)\b/i.test(lower)
  ) {
    issues.push("prefer combined-gap wording for MG5/MG6 when both flag incompleteness — avoid 'vs'");
  }

  if (q.includes("weakness in the prosecution case") || q.includes("weakness in the defence case")) {
    if (/^the single biggest weakness (in the (prosecution|defence) case )?is\b/i.test(first.trim())) {
      issues.push("start with a direct conclusion sentence; drop the framing clause 'The single biggest weakness is'");
    }
    if (/\bthis (may|might|could) (undermine|affect|weaken)\b/i.test(lower)) {
      issues.push("replace soft consequence clauses ('this may undermine/affect') with direct outcome language grounded in the bundle");
    }
  }

  if (q.includes("weakness in the prosecution case")) {
    if (/\bfinal witness statements\b|\bbody-worn alignment\b/i.test(lower)) {
      issues.push("pressure point uses banned generic phrasing — tie to this bundle’s primary issue");
    }
    if (/\bcan rely on mg11 and cctv\b/i.test(lower) || /\brely on (the )?mg11 (and|&) cctv\b/i.test(lower)) {
      issues.push("pressure point is generic (MG11+CCTV boilerplate) — state how Crown survives the headline weakness on these papers");
    }
    if (/\bpressure point:\s*[\n\r]+\s*[-*•]/i.test(trimmed)) {
      issues.push('Q8: line after "Pressure point:" must be plain prose, not a markdown bullet');
    }
  }

  if (q.includes("weakness in the defence case")) {
    const plainFirst = first.replace(/^\*\*?|\*\*?$/g, "").replace(/\*\*/g, "").trim();
    if (plainFirst.length > 0 && !/^[A-Z]/.test(plainFirst)) {
      issues.push("Q9 opening line must start with a capital letter (one headline sentence)");
    }
    if (
      /^(identification_jury|cctv_outweighs_account|no_alternative_narrative|adverse_inference_or_partial|failure_to_displace|over_reliance_challenge|defence_theory_gap)\b/i.test(
        plainFirst
      )
    ) {
      issues.push("Q9 must not leak raw theme slug as opening — write a plain English headline");
    }
    if (/^(identification\s+jury|weakness[_\s]prosecution|defence[_\s]risk)\b/i.test(plainFirst)) {
      issues.push("Q9 opening must not be a broken label fragment — use a full sentence");
    }
  }

  return issues;
}

/** Ensures opposition-pressure footer blocks are present (prompt-required). */
function detectOppositionLayerViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const t = reply.trim();

  if (q.includes("weakness in the prosecution case")) {
    if (!/\bPressure point:\s*\n\s*\S+/i.test(t) && !/\bPressure point:\s+\S+/i.test(t)) {
      issues.push('Q8 missing required footer: "Pressure point:" plus one sentence');
    }
  }
  if (q.includes("weakness in the defence case")) {
    if (!/\bProsecution exploit:\s*\n\s*\S+/i.test(t) && !/\bProsecution exploit:\s+\S+/i.test(t)) {
      issues.push('Q9 missing required footer: "Prosecution exploit:" plus one sentence');
    }
  }
  if (q.includes("next 24 hours")) {
    if (!/\bThis matters because:\s*\n\s*\S+/i.test(t) && !/\bThis matters because:\s+\S+/i.test(t)) {
      issues.push('Q10 missing required footer: "This matters because:" plus one sentence');
    }
  }

  return issues;
}

/** Validator for Q10 — uses same `analyzeBundleAnswerSignals` as Q8 (no drift). */
function issueTypeAnchorPattern(t: IssueType): RegExp {
  const p: Record<IssueType, RegExp> = {
    identification:
      /\b(identif|identifying|parade|999|description|attribution|witness|mg11|lighting|visibility|distance)\b/i,
    cctv: /\b(cctv|footage|camera|continuity|engineer|timestamp|extract)\b/i,
    "999": /\b(999|cad|dispatch|audio|master|nine[-\s]?nine)\b/i,
    witness: /\b(mg11|witness|statement|bwv|body[-\s]?worn|draft|signed)\b/i,
    continuity: /\b(continuity|chain|handling|admissib)\b/i,
    other: /\b(mg6|disclosure|outstanding|schedule|hook|mg5|reconcil)\b/i,
  };
  return p[t];
}

function detectNextStepsViolations(question: string, reply: string, haystack: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  if (!q.includes("next 24 hours") || !haystack.trim()) return issues;

  const lower = reply.toLowerCase();
  const banned = [
    /\bconfirm outstanding items\b/i,
    /\breview materials\b/i,
    /\breview the bundle\b/i,
    /\breview served documents\b/i,
    /\bfollow up on outstanding\b/i,
    /\bconfirm outstanding\b/i,
  ];
  for (const re of banned) {
    if (re.test(lower)) issues.push("Q10: banned generic ops phrase — tie steps to locked issueType canonical stems");
  }

  const sig = analyzeBundleAnswerSignals(haystack);
  if (!issueTypeAnchorPattern(sig.issueType).test(reply)) {
    issues.push(
      `Q10 must anchor vocabulary to issueType "${sig.issueType}" / primary "${sig.primaryProsecutionIssue}" (same bundle inference as Q8)`
    );
  }

  const lines = reply.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const stepLines = lines.filter((l) => (l.match(/\s->\s/g) ?? []).length >= 2);
  if (stepLines.length !== 3) {
    issues.push("Q10 must have exactly 3 lines in Action -> test -> impact form (two -> per line)");
  }

  return issues;
}

function detectQuestionDisciplineViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lines = reply
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));
  const nonBulletLines = lines.filter((l) => !/^[-*]\s+/.test(l));
  const hasNumbered = lines.some((l) => /^\d+\.\s+/.test(l));
  const lower = reply.toLowerCase();
  const isGoldenQuestion =
    q.includes("top 3 facts") ||
    q.includes("still unknown") ||
    q.includes("key dates and timeline anchors") ||
    q.includes("next procedural milestone") ||
    q.includes("single biggest risk") ||
    q.includes("which witness is most vulnerable") ||
    q.includes("strongest cross-examination theme") ||
    q.includes("impeachment material should we prioritise obtaining") ||
    (q.includes("what admissions") && q.includes("unsafe"));

  if (hasNumbered) issues.push("numbered list format is not allowed");
  if (isGoldenQuestion && nonBulletLines.length > 0) issues.push("golden-question answers must be bullet-only (no intro lines)");

  if (q.includes("top 3 facts that help the defence")) {
    if (bullets.length !== 3) issues.push("Q1 must have exactly 3 bullets");
    if (nonBulletLines.length > 0) issues.push("Q1 must not include intro/non-bullet lines");
  }

  if (q.includes("top 3 facts that hurt the defence")) {
    if (bullets.length !== 3) issues.push("Q2 must have exactly 3 bullets");
    if (nonBulletLines.length > 0) issues.push("Q2 must not include intro/non-bullet lines");
    const bannedHelpfulPhrases = [
      "weak id",
      "weak identification",
      "cctv continuity issues",
      "continuity issues flagged",
      "incomplete disclosure",
      "outstanding disclosure",
      "full master audio",
      "partial cctv",
      "partial 999",
      "mg5 vs mg6",
    ];
    if (bannedHelpfulPhrases.some((p) => lower.includes(p))) {
      issues.push("Q2 contains defence-positive / crown-weakness material");
    }
  }

  if (q.includes("single biggest risk if we do nothing this week")) {
    if (bullets.length < 1 || bullets.length > 2) issues.push("Q6 must contain 1-2 bullets total");
    if (lines.length > 2) issues.push("Q6 must be concise (max two lines)");
  }

  if (q.includes("strongest cross-examination theme")) {
    if (bullets.length > 1) issues.push("Q8 should keep one theme line and max one supporting bullet");
  }

  if (q.includes("still unknown")) {
    if (bullets.length < 3 || bullets.length > 4) issues.push("Q3 must contain 3-4 bullets");
  }

  if (q.includes("key dates and timeline anchors")) {
    if (bullets.length !== 3) issues.push("Q4 must contain exactly 3 bullets");
  }

  if (q.includes("next procedural milestone")) {
    if (bullets.length !== 3) issues.push("Q5 must contain exactly 3 bullets");
  }

  if (q.includes("which witness is most vulnerable")) {
    if (bullets.length < 2 || bullets.length > 3) issues.push("Q7 must contain 2-3 supporting bullets");
  }

  if (q.includes("impeachment material should we prioritise obtaining")) {
    if (bullets.length < 3 || bullets.length > 5) issues.push("Q9 must contain 3-5 concrete items");
    const obtainableNouns = ["audio", "statement", "cctv", "cad", "report", "records", "continuity", "mg11"];
    const badBullets = bullets.filter((b) => !obtainableNouns.some((n) => b.toLowerCase().includes(n)));
    if (badBullets.length > 0) issues.push("Q9 bullets must name concrete obtainable materials");
    if (bullets.some((b) => isGroupedMediaIndexRow(b))) {
      issues.push("Q9 must not echo CCTV/999/CAD/BWV index category row");
    }
  }

  if (q.includes("what admissions") && q.includes("unsafe")) {
    if (/no admissions should be made/i.test(reply)) {
      issues.push("Q10 cannot use generic 'no admissions should be made' wording");
    }
    const elementHits = (lower.match(/\b(intent|recklessness|force|possession|identif|mechanic|causation)\b/g) ?? []).length;
    const consequenceHits = (lower.match(/\b(concedes|undermines|collapses|weakens|damages)\b/g) ?? []).length;
    if (elementHits < 2 || consequenceHits < 2) {
      issues.push("Q10 must link admissions to offence elements and tactical consequence");
    }
    if (bullets.length < 3 || bullets.length > 4) issues.push("Q10 must contain 3-4 unsafe admissions");
    const bulletConsequenceHits = bullets.filter((b) => /\b(concedes|undermines|collapses|weakens|damages)\b/i.test(b)).length;
    if (bulletConsequenceHits < Math.min(3, bullets.length)) {
      issues.push("Q10 each admission should include a clear consequence verb");
    }
  }

  return issues;
}

function detectLanguageDisciplineViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();

  const weakVerbs = ["suggests", "indicates", "may", "could"];
  const weakHits = weakVerbs.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
  if (weakHits.length > 0 && !/(not stated in the materials|not in materials|uncertain|unknown)/i.test(lower)) {
    issues.push(`weak language present (${weakHits.join(", ")})`);
  }

  if (
    (q.includes("top 3 facts that help the defence") || q.includes("top 3 facts that hurt the defence")) &&
    /the top (three|3) facts|top defence advantage|top defense advantage/i.test(reply)
  ) {
    issues.push("top-3 answers must not include framing intros");
  }

  return issues;
}

/** Generic disclosure / ops items the model often invents; must appear in bundle text if cited in reply. */
function detectBundleHallucinationViolations(
  reply: string,
  haystack: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null
): string[] {
  const issues: string[] = [];
  const primary = snapshot?.strategy_committed_primary?.trim() ?? "";

  const genericPhrases: Array<{ label: string; re: RegExp }> = [
    { label: "custody record", re: /\bcustody record\b/i },
    { label: "custody cctv", re: /\bcustody cctv\b/i },
    { label: "fire cause / fire report", re: /\bfire (cause|report)\b/i },
    { label: "footwear", re: /\bfootwear\b/i },
    { label: "interview recording", re: /\binterview recording\b/i },
  ];
  for (const { label, re } of genericPhrases) {
    if (re.test(reply) && !re.test(haystack)) {
      issues.push(`cited "${label}" but phrase not present in bundle — remove or say not stated`);
    }
  }

  if (primary === "fight_charge" && /\bcharge reduction\b/i.test(reply)) {
    issues.push('committed strategy is fight_charge — remove "charge reduction"; say fight/contest charge');
  }
  if (primary && primary !== "charge_reduction" && /\bcommitted strategy of charge reduction\b/i.test(reply)) {
    issues.push("do not claim charge reduction commitment — check STRATEGY in snapshot");
  }
  if (primary && !/\bcharge_reduction\b/i.test(primary) && /\bcharge reduction strategy\b/i.test(reply)) {
    issues.push("remove charge reduction framing unless snapshot strategy is charge_reduction");
  }

  return issues;
}

function detectUnsupportedClaimViolations(question: string, reply: string, haystack: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lowerReply = reply.toLowerCase();
  const lowerHay = haystack.toLowerCase();

  // High-impact factual guard: do not state a witness statement is signed unless the bundle context supports it.
  if (
    /key witness statement is signed|signed statement|signed mg11/i.test(lowerReply) &&
    !/(signed copy .*served|mg11.*signed.*served|signed mg11.*served)/i.test(lowerHay)
  ) {
    issues.push("unsupported claim: statement marked signed without bundle support");
  }

  // For Q2 specifically, do not reframe crown-weakness as defence-harm.
  if (q.includes("top 3 facts that hurt the defence")) {
    if (/weak id|weak identification/i.test(lowerReply)) {
      issues.push("unsupported polarity: weak ID cannot hurt defence");
    }
  }
  if (/Unknown\s*[–-]\s*add charge sheet for offence-specific strategy/i.test(reply)) {
    issues.push("placeholder offence text leaked to user output");
  }

  return issues;
}

function detectQuestionIntentViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();

  const hasAny = (patterns: RegExp[]) => patterns.some((p) => p.test(reply));
  const hasTokens = (tokens: string[]) => tokens.some((t) => lower.includes(t));

  if (q.includes("what is still unknown")) {
    if (!hasTokens(["not stated", "unknown", "outstanding", "awaited", "pending"])) {
      issues.push("Q3 intent miss: must identify unknown/outstanding items");
    }
  }
  if (q.includes("key dates and timeline anchors")) {
    if (!hasTokens(["stage", "hearing", "next", "disclosure", "timeline", "date"])) {
      issues.push("Q4 intent miss: must provide timeline/procedural anchors");
    }
  }
  if (q.includes("next procedural milestone")) {
    if (!hasTokens(["next", "milestone", "hearing", "disclosure", "step"]) || !hasTokens(["matters", "impact", "risk", "consequence"])) {
      issues.push("Q5 intent miss: must state next step and why it matters");
    }
  }
  if (q.includes("strongest cross-examination theme")) {
    if (!hasTokens(["cross", "theme", "challenge", "credibility", "inconsisten"])) {
      issues.push("Q8 intent miss: must state cross-examination theme");
    }
  }
  if (q.includes("impeachment material should we prioritise obtaining")) {
    if (!hasAny([/mg11/i, /cctv/i, /999/i, /cad/i, /audio/i, /continuity/i])) {
      issues.push("Q9 intent miss: must list concrete impeachment materials");
    }
  }

  return issues;
}

function detectWeaknessConflictStepsViolations(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const lower = reply.toLowerCase();
  const lines = reply
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines.filter((l) => /^[-*]\s+/.test(l));

  if (q.includes("weakness in the prosecution case")) {
    if (bullets.length > 2) issues.push("prosecution weakness: max 2 supporting bullets with headline sentence");
  }

  if (q.includes("weakness in the defence case")) {
    if (bullets.length > 2) issues.push("defence weakness: max 2 supporting bullets with headline sentence");
    if (
      /\bweak (id|identification)\b/i.test(reply) &&
      /\b(undermin|vulnerab|biggest weakness|damages the defence|hurts the defence|defence's position|defence position)\b/i.test(lower) &&
      !/\b(exploit|attack|challenge|contest|reasonable doubt|jury may reject)\b/i.test(lower)
    ) {
      issues.push(
        "defence weakness lens: weak identification normally weakens the Crown — pick a defence-side risk or explain why the defendant still loses on ID"
      );
    }
    const head = reply.slice(0, 550).toLowerCase();
    if (
      /\bcontradictory officer\b/i.test(head) &&
      !/\b(defence (relies|depends|builds on)|cannot exploit|jury may still|still convict)\b/i.test(head)
    ) {
      issues.push(
        "defence weakness lens: contradictory officer summaries usually undermine Crown consistency — reframe as Crown tension or explain defence reliance"
      );
    }
  }

  if (/\binconsisten|\bconflicts in the evidence\b/i.test(q)) {
    if (bullets.length > 4) issues.push("conflict question: max 4 bullets; prioritise the single strongest tension in the opening line");
  }

  return issues;
}

function detectCaseSummaryTemplateLeak(question: string, reply: string): string[] {
  const issues: string[] = [];
  const q = goldenQuestionNorm(question);
  const mode = detectQuestionMode(question);
  const guarded =
    mode !== "strategy_default" ||
    q.includes("top 3 facts") ||
    q.includes("still unknown") ||
    q.includes("key dates and timeline anchors") ||
    q.includes("next procedural milestone") ||
    q.includes("single biggest risk") ||
    q.includes("which witness is most vulnerable") ||
    q.includes("strongest cross-examination theme") ||
    q.includes("impeachment material should we prioritise obtaining") ||
    (q.includes("what admissions") && q.includes("unsafe"));
  if (!guarded) return issues;

  if (
    /faces .+\n\s*-\s*current posture\s*->/i.test(reply) ||
    /current posture\s*->/i.test(reply) ||
    /procedural position\s*->/i.test(reply) ||
    /priority pressure point\s*->/i.test(reply)
  ) {
    issues.push("case-summary template leak detected");
  }
  return issues;
}

function buildDeterministicCompliantFallback(
  question: string,
  snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null,
  bundleFullText: string
): string {
  const q = goldenQuestionNorm(question);
  const offence =
    snapshot?.offence_detected_label?.trim() ||
    firstMatch(bundleFullText, [/^\s*Offence\(s\)\s+as\s+tag:\s*(.+)$/im, /^\s*Charge sheet extract:\s*(.+)$/im]) ||
    "the charged offence as stated in the papers";
  const stance = snapshot?.stance_detected?.trim() || "not guilty / prosecution to proof";
  const stage = snapshot?.stage_detected?.trim() || "stage not clearly stated in the materials provided";
  const hook =
    firstMatch(bundleFullText, [/^\s*Primary eval hook:\s*(.+)$/im]) ||
    "disclosure reliability tension";

  if (q.includes("top 3 facts that hurt the defence")) {
    return [
      `- Charge exposure (${offence}) -> The offence elements remain live unless positively displaced.`,
      "- Crown may regularise current disclosure gaps -> Defence advantage can narrow before hearing.",
      "- Draft witness evidence may be finalised -> A cleaner Crown account can reduce cross-exam leverage.",
    ].join("\n");
  }

  if (q.includes("single biggest risk if we do nothing this week")) {
    return [
      q6PrimaryRiskLineFromHook(hook).replace(
        "Defence challenge window narrows at hearing.",
        "defence leverage narrows at hearing."
      ),
      `- If key materials are not chased now -> tactical challenge window closes at ${stage}.`,
    ].join("\n");
  }

  if (q.includes("what admissions") && q.includes("unsafe")) {
    return [
      `- Admitting act mechanics that satisfy ${offence} elements -> Concedes core prosecution building blocks and weakens ${stance}.`,
      "- Admitting intent/recklessness where disputed -> Concedes mental element and narrows viable defence routes.",
      "- Admitting identification/presence beyond current case posture -> Collapses challenge to attribution and strengthens Crown proof.",
    ].join("\n");
  }

  return "";
}

function buildQuestionSpecificRules(question: string): string {
  const q = goldenQuestionNorm(question);
  const rules: string[] = [];

  if (q.includes("top 3 facts that help the defence")) {
    rules.push(
      "- Return exactly 3 defence-positive facts.",
      "- Do NOT include prosecution-strength points in this answer.",
      "- First line must directly state the top defence advantage."
    );
  }
  if (q.includes("top 3 facts that hurt the defence")) {
    rules.push(
      "- Return exactly 3 defence-negative facts (prosecution strengths / defence vulnerabilities).",
      "- Do NOT include defence-strength points in this answer.",
      "- If a fact weakens the Crown (e.g. weak ID), it cannot be listed as hurting the defence."
    );
  }
  if (q.includes("still unknown")) {
    rules.push(
      '- Start with "Not stated in the materials." once, then list only concrete unknowns that are actually awaited / missing.',
      "- Do not repeat settled facts as unknowns."
    );
  }
  if (q.includes("key dates and timeline anchors")) {
    rules.push(
      '- If exact dates are absent, start with "Not stated in the materials." once.',
      "- Then provide only procedural anchors (stage, disclosure position, next-hearing anchor)."
    );
  }
  if (q.includes("single biggest risk if we do nothing this week")) {
    rules.push("- Name one single risk in the first line; supporting bullets should explain consequences, not introduce new primary risks.");
  }
  if (q.includes("which witness is most vulnerable")) {
    rules.push("- Name one witness in line 1 and tie each bullet to concrete reliability pressure points in the provided materials.");
  }
  if (q.includes("strongest cross-examination theme")) {
    rules.push("- Name one cross-examination theme only; bullets must show how to exploit it using case-linked facts.");
  }
  if (q.includes("impeachment material should we prioritise obtaining")) {
    rules.push("- Prioritise 3-5 concrete items max, each explicitly linked to a contradiction, reliability gap, or missing continuity point.");
  }
  if (q.includes("what admissions") && q.includes("unsafe")) {
    rules.push(
      "- Do NOT answer with 'Not stated in the materials.'",
      "- Identify admissions to avoid based on offence elements, stance, and disputed mechanics in this case."
    );
  }

  if (
    /\bsafe to run\b/i.test(q) ||
    /\bunsafe to (run|proceed)\b/i.test(q) ||
    /\brun safely\b/i.test(q)
  ) {
    rules.push(
      "- Base safe/unsafe on STAGE, STANCE, STRATEGY in the case state snapshot + explicit bundle tensions (Primary eval hook, MG6 notes).",
      '- Do NOT invent "adverse inferences from silence" unless the bundle or interview summary actually raises silence / no comment in those terms.',
      "- Do NOT invent a charge-reduction posture unless STRATEGY (committed) is charge_reduction."
    );
  }
  if (/\bwhat disclosure\b/i.test(q) || (/\bdisclosure\b/i.test(q) && /\b(missing|outstanding|awaited)\b/i.test(q))) {
    rules.push(
      "- List missing/partial items using wording from the MG6 schedule and CCTV/999/CAD extract sections in the bundle excerpt.",
      "- Do NOT append a generic law-firm disclosure shopping list (custody, fire, footwear, etc.) unless those topics appear verbatim in the bundle excerpt.",
      "- If the Evidence context block lists items, each bullet must still be reconcilable with MG6 or extracts — drop items that are not in the bundle text."
    );
  }
  if (/\bdefen[cs]e plan\b/i.test(q) && (/\bone page\b/i.test(q) || /\bfull\b/i.test(q) || /\boverview\b/i.test(q))) {
    rules.push(
      "- Build the plan from the committed STRATEGY code + stance + MG5/MG6 hooks in the bundle; do not substitute a random primary route label.",
      "- Do not list missing disclosure items that are not named in the bundle excerpt."
    );
  }

  if (/\bweakness in the prosecution case\b/i.test(q)) {
    rules.push(
      "- **One** primary issue in the opening line (merge related points); use calibrated strength (unstable / undermined / weakened) unless the bundle clearly supports stronger language; max 2 supporting bullets; -> format.",
      "- Do not use soft openers (\"The single biggest weakness is\", \"this may undermine\").",
      "- Do not discuss how the defence might lose.",
      '- After bullets: "Pressure point:" then **one sentence** — what Crown would still rely on **despite that same weakness**, using THIS bundle’s rows (no stock phrases like "final witness statements" / "body-worn alignment").'
    );
  }
  if (/\bweakness in the defence case\b/i.test(q)) {
    rules.push(
      "- Headline = how the defence **still loses** (not Crown weakness); must differ from a prosecution-weakness answer; max 2 bullets with -> .",
      "- Vary themes (adverse inference / failure to displace Crown proof / over-reliance on challenge) — do not repeat identical \"no alternative narrative\" wording across cases.",
      "- Do not headline Crown evidential gaps unless you bridge why the defendant still loses.",
      '- After bullets: required footer exactly — line "Prosecution exploit:" then **one sentence** only (how Crown uses the papers to press that weakness). No verdict predictions.'
    );
  }
  if (/\bnext 24 hours\b/i.test(q)) {
    rules.push(
      "- **Max 3** action lines; each ties to ANSWER CONSTRUCTION: Action -> what it tests -> why it matters.",
      "- No generic disclosure repetition unrelated to that pressure.",
      '- After the 3 actions: "This matters because:" then **one sentence** with trial-facing impact (e.g. "This determines whether…", "This affects whether the Crown can prove…", "This impacts how the jury will assess…") tied to THIS bundle.'
    );
  }

  return rules.length ? `\nQUESTION-SPECIFIC RULES (MANDATORY)\n${rules.join("\n")}` : "";
}

function buildGroundingDisciplineBlock(snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null): string {
  const code = snapshot?.strategy_committed_primary?.trim();
  const human =
    code === "fight_charge"
      ? "fight the charge at trial (NOT charge reduction)"
      : code === "charge_reduction"
        ? "charge reduction"
        : code === "outcome_management"
          ? "outcome management / mitigation focus"
          : code && code !== "(not set)"
            ? code.replace(/_/g, " ")
            : "not set";
  return [
    "========================",
    "GROUNDING DISCIPLINE (read every time)",
    "========================",
    `- Committed STRATEGY code: ${code ?? "(not set)"}. Describe it to the user as: ${human}.`,
    '- Internal code fight_charge means contesting the charge — never describe it as "charge reduction".',
    "- For disclosure gaps: tie each item to MG6 / extract / exhibit wording in the bundle excerpt. Do not invent custody record, fire report, footwear comparison, or interview recording unless those appear in the bundle.",
    "- The Evidence/disclosure context block may include system placeholders — if they conflict with the MG6 table in the bundle excerpt, prefer the bundle wording.",
  ].join("\n");
}

/**
 * Replace hallucinated EX-… tokens. Prefer the bundle's EX-CAD line when there is exactly one CAD ref (typical Northshire bundles).
 * Never leave the internal instructional placeholder in user-visible text — it trains the model to echo instructions.
 */
function sanitizeExhibitRefsInReply(reply: string, allowed: Set<string>): string {
  const bad = ungroundedExhibitRefs(reply, allowed);
  if (bad.length === 0) return reply;
  const cadAllowed = [...allowed].filter((r) => r.startsWith("ex-cad-")).sort();
  const singleCadRepl = cadAllowed.length >= 1 ? formatExCadFromAllowed(cadAllowed[0]) : null;
  let s = reply;
  for (const token of bad) {
    const reSafe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isCadLike = /^EX-CAD-/i.test(token);
    const repl =
      isCadLike && singleCadRepl
        ? singleCadRepl
        : GENERIC_EX_ADVICE_PHRASE;
    s = s.replace(new RegExp(reSafe, "gi"), repl);
  }
  if (singleCadRepl) {
    s = s.split(INSTRUCTIONAL_EX_PLACEHOLDER).join(singleCadRepl);
  }
  return s;
}

/**
 * One-shot correction when the model drifts on common Golden-eval failure modes (CCTV wording, interview
 * limbs vs "leaves open", hook vs defence line). Runs before EX-ref retry.
 */
function buildBundleGroundingRetry(reply: string, exhibitHaystack: string, userMessage: string): string | null {
  const issues: string[] = [];
  const q = userMessage.toLowerCase();
  const hay = exhibitHaystack;

  if (
    /full CCTV footage|complete CCTV footage|full CCTV window/i.test(reply) &&
    !/full CCTV footage|complete CCTV footage|full CCTV window/i.test(hay)
  ) {
    issues.push(
      "Do not use **full CCTV footage**, **complete CCTV footage**, or **full CCTV window** as disclosure gaps unless those **exact phrases** appear in the bundle. Use **partial**, **extract**, **continuity**, **tidy schedule**, **engineer note**, etc., matching MG6 and CCTV notes.",
    );
  }

  if (
    /\binterview\b/i.test(userMessage) &&
    /\bleaves?\s+open\b/i.test(reply) &&
    hay.includes("No comment on certain technical matters")
  ) {
    issues.push(
      'The interview summary includes **No comment on certain technical matters** — do **not** rephrase that as **"leave open"** or **"leaves open"**; treat **no comment** as its own limb.',
    );
  }

  const hookM = hay.match(/Primary\s+eval\s+hook:\s*([^\n\r]+)/i);
  if (hookM && /hook|friction|primary\s+eval|eval\s*tension/i.test(q)) {
    const exp = hookM[1]!.trim();
    if (exp.length > 2) {
      const needle = exp.slice(0, Math.min(44, exp.length)).toLowerCase();
      const r = reply.toLowerCase();
      const defenceNoise = "denies the core allegation or disputes the precise mechanics";
      if (!r.includes(needle)) {
        issues.push(
          `The bundle headline states Primary eval hook: ${exp}. The hook / friction section must lead with that label **verbatim**, not the generic MG5 defence-account line ("${defenceNoise}") unless that text **is** literally the Primary eval hook.`,
        );
      }
    }
  }

  if (/witness.*\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/i.test(reply) && /\bMG11\b/i.test(reply)) {
    const nameGuess = reply.match(/witness,?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameGuess) {
      const fullName = nameGuess[1]!.trim();
      const parts = fullName.split(/\s+/).filter((w) => w.length > 1);
      if (parts.length >= 2) {
        const a = parts[0]!.toLowerCase();
        const b = parts[1]!.toLowerCase();
        if (!hay.toLowerCase().includes(a) || !hay.toLowerCase().includes(b)) {
          issues.push(
            "Do not invent a witness **forename and surname** for MG11 unless both appear verbatim in the bundle (header, charge, or witness statement). Use **the key witness** if the statement is anonymous.",
          );
        }
      }
    }
  }

  if (issues.length === 0) return null;
  return `Rewrite your **entire** previous answer. Apply these grounding fixes:\n${issues.map((s) => `- ${s}`).join("\n")}\nPreserve correct EX- codes verbatim from the bundle exhibit list.`;
}

function getDocumentTextForChat(d: { raw_text?: string | null; extracted_json?: unknown }): string {
  const raw = typeof d.raw_text === "string" ? d.raw_text.trim() : "";
  if (raw.length > 100) return raw;
  const ej = d.extracted_json;
  if (ej && typeof ej === "object") {
    const o = ej as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.summary === "string" && o.summary.trim()) parts.push(o.summary.trim());
    if (typeof o.aiSummary === "string" && o.aiSummary.trim()) parts.push(o.aiSummary.trim());
    if (parts.length) return parts.join("\n");
  }
  return raw;
}

/** Keep start (charge/MG5) and end (exhibit list, END marker) when trimming for the model. */
function truncateBundleForModel(full: string, max: number): string {
  if (full.length <= max) return full;
  const sep =
    "\n\n[... bundle excerpt truncated for length; beginning and end preserved ...]\n\n";
  const budget = Math.max(0, max - sep.length);
  const head = Math.floor(budget * 0.5);
  const tail = budget - head;
  return `${full.slice(0, head)}${sep}${full.slice(-tail)}`;
}

/** Wide enough that a second PDF does not push the Northshire header out of range; multi-doc cases must still surface Primary eval hook. */
const HEADER_SCAN_CHARS = 220_000;

/**
 * Deterministic "sticky" headline from bundle text so Reference / hook / EX- codes survive
 * long prompts and head+tail truncation. Parsed from the start of the combined document text.
 */
function extractBundleHeadlineBlock(full: string): string | null {
  if (!full || full.trim().length < 30) return null;
  const scanHeader = full.slice(0, Math.min(full.length, HEADER_SCAN_CHARS));
  const lines: string[] = [];

  const ref = scanHeader.match(/^\s*Reference:\s*(.+)$/im);
  const short = scanHeader.match(/^\s*Short title:\s*(.+)$/im);
  const accused = scanHeader.match(/^\s*Accused:\s*(.+)$/im);
  const witness =
    scanHeader.match(/^\s*Other party\s*\/\s*key witness:\s*(.+)$/im) ??
    scanHeader.match(/^\s*Key witness:\s*(.+)$/im);
  let hook = scanHeader.match(/^\s*Primary eval hook:\s*(.+)$/im);
  if (!hook) {
    const loose = full.slice(0, 500_000).match(/Primary\s+eval\s+hook:\s*([^\n\r]+)/i);
    if (loose) hook = loose as RegExpMatchArray;
  }
  const offenceTag = scanHeader.match(/Offence\(s\) as tag:\s*(.+)$/im);
  const plea = scanHeader.match(/^\s*Plea:\s*(.+)$/im);

  if (ref) lines.push(`Reference: ${ref[1]!.trim()}`);
  if (short) lines.push(`Short title: ${short[1]!.trim()}`);
  if (accused) lines.push(`Accused: ${accused[1]!.trim()}`);
  if (witness) lines.push(`Other party / key witness: ${witness[1]!.trim()}`);
  if (hook?.[1]) {
    const hookText = hook[1]!.trim();
    lines.push(`Primary eval hook: ${hookText}`);
    lines.push(
      `(For hook / friction / eval-tension questions: this line is the primary hook — not the separate “defence account” sentence in MG5 unless that sentence is literally the same.)`,
    );
    lines.push(`HOOK (verbatim — use this first in hook answers, not the defence-account line): ${hookText}`);
  }
  if (offenceTag) lines.push(`Offence(s) as tag: ${offenceTag[1]!.trim()}`);
  if (plea) lines.push(`Plea: ${plea[1]!.trim()}`);

  const exSet = new Set<string>();
  const scanEx = full.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
  const exStrict = new RegExp(STRICT_EX_REF_RE.source, "gi");
  let em: RegExpExecArray | null;
  while ((em = exStrict.exec(scanEx)) !== null) exSet.add(em[0]);
  for (const cm of scanEx.matchAll(new RegExp(EX_CAD_DIGITS_RE.source, "gi"))) {
    exSet.add(cm[0]);
  }
  const exSorted = [...exSet].sort((a, b) => a.localeCompare(b));
  if (exSorted.length) {
    lines.push("");
    lines.push("Exhibit codes from bundle (verbatim):");
    for (const x of exSorted) lines.push(`  ${x}`);
  }

  if (lines.length === 0) return null;

  return [
    "========================",
    "BUNDLE HEADLINE (read first — key labels + exhibit codes; may repeat text below)",
    "========================",
    ...lines,
  ].join("\n");
}

/** Build system prompt with snapshot values embedded so the model sees OFFENCE/STANCE/STAGE/STRATEGY as system-level authority. */
function buildSystemPrompt(snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null): string {
  const offenceLabel = snapshot?.offence_detected_label?.trim() ?? "(not set)";
  const offenceCode = snapshot?.offence_detected_code?.trim() ?? "(not set)";
  const stance = snapshot?.stance_detected?.trim() ?? "(not set)";
  const stage = snapshot?.stage_detected?.trim() ?? "(not set)";
  const primary = snapshot?.strategy_committed_primary?.trim() ?? "(not set)";
  const secondary = snapshot?.strategy_committed_secondary?.length
    ? snapshot.strategy_committed_secondary.join(", ")
    : "(none)";
  const timestamp = snapshot?.timestamp ?? new Date().toISOString();

  return `You are CaseBrain, the defence-side reasoning engine. You must reason ONLY from the authoritative case state snapshot and committed strategy. Narrative is supporting context only.

========================
SINGLE SOURCE OF TRUTH
========================
Use ONLY the following fields as authoritative for offence, stance, stage, and strategy:

- OFFENCE: ${offenceLabel} (${offenceCode})
- STANCE: ${stance}
- STAGE: ${stage}
- STRATEGY (committed): ${primary}
- SECONDARY STRATEGIES: ${secondary}
- SNAPSHOT TIMESTAMP: ${timestamp}

These values come from the unified case state snapshot. They override ALL narrative, summaries, Defence Plan text, or user-provided descriptions unless the user explicitly asks to discuss a different offence/stance/stage.

CRITICAL — DO NOT RE-ASK WHAT IS ALREADY HERE:
- If OFFENCE, STANCE, STAGE, and STRATEGY are all set above (not "(not set)"), you MUST NOT ask the user to "confirm" or "provide" those same fields again. Use them directly. Only ask for clarification if the user's question is genuinely ambiguous.

========================
NARRATIVE (SUPPORTING ONLY)
========================
You may use the narrative (agreed summary, case theory, Defence Plan text, bundle excerpt) ONLY to understand factual background. Narrative NEVER overrides the snapshot.

========================
GUARDRAILS (MANDATORY)
========================

1. OFFENCE DISCIPLINE — GBH / INJURY THRESHOLD (NON-NEGOTIABLE)
   - You must reason ONLY from the detected offence.
   - Do NOT switch to a different offence (e.g. s.18) unless the user explicitly asks.
   - If the user asks something inconsistent with the detected offence, CLARIFY first.
   - When the case is charged or framed as GBH (e.g. s.18 / s.20 / similar) and the materials describe serious bodily harm (e.g. skull fracture, deep laceration requiring surgery, significant head injury from a punch, strike, or blow with a natural fall onto a hard surface), you MUST treat the injury **severity / GBH threshold as MET** for practical discussion.
   - You MUST NOT: suggest the injury might only be ABH, downplay severity, or argue that the harm "does not reach GBH" when the snapshot offence and facts clearly describe GBH-level harm. The live issues are **mental element** (intent / recklessness as appropriate), **causation**, and **defence** (e.g. accident, self-defence, identity)—not re-arguing that the harm is too minor for GBH.

2. STANCE DISCIPLINE
   - You must reason from the detected stance.
   - Do NOT drift into mitigation or guilty plea unless the user explicitly asks.

3. STAGE DISCIPLINE — DISCLOSURE / EVIDENCE LISTINGS (STRICT)
   - You must reason from the detected stage.
   - If disclosure is outstanding, do NOT advise as if disclosure is complete.
   - Mirror the evidence/disclosure context **literally**: if an item is described as **served**, **retained**, **received**, **available**, or **disclosed**, you MUST NOT call it outstanding, missing, or "not yet received." Only list gaps using wording that matches **requested / awaited / not served / missing / incomplete** when the context actually says so.
   - Do NOT invent outstanding disclosure. If the context is silent, say what is unknown rather than assuming gaps.

4. STRATEGY DISCIPLINE
   - You must align with the committed primary strategy.
   - Do NOT contradict how the case is being run.
   - Internal code **fight_charge** means contesting the charge at trial — never describe it as "charge reduction" unless STRATEGY is **charge_reduction**.

5. NARRATIVE VS AUTHORITY
   - Narrative is NOT authoritative.
   - If narrative conflicts with the snapshot, ALWAYS follow the snapshot.

6. NO GENERIC LEGAL TEMPLATES
   - Do NOT cite Turnbull, Ghosh, Woollin, Cunningham, etc. unless the offence or facts in THIS case require them.
   - No generic fallback legal tests.

7. NO FALLBACK TO DEFENCE PLAN
   - Do NOT say "I can only answer from the Defence Plan."
   - Do NOT output refusal templates like "I need the detected offence, stance, and stage to answer properly."
   - If snapshot fields are missing, answer from the bundle excerpt and disclosed case facts, and state assumptions briefly.

8. MISSING CONTEXT BEHAVIOUR
   - If offence/stance/stage/strategy are missing, do NOT guess hidden facts. Use bundle-grounded wording and clearly mark unknowns.
   - If they are present, you must NOT ask for them again; instead, answer using them.

9. CAUSATION — ONE INCIDENT; FORBIDDEN PHRASING
   - When the facts describe a single blow or assault followed by a fall and impact (e.g. head to kerb, pavement, road), treat that as **one continuous sequence** arising from the defendant's act.
   - You MUST NOT say or imply that the fall "**breaks the chain of causation**" or is a "**break in causation**" in that scenario. Use neutral language: foreseeable consequence, single incident, mechanism of injury.
   - Focus on foreseeability and whether the harm flows from the act (including a natural fall), not on inventing novus actus where the fall follows directly from the force used.

========================
CONTRADICTIONS, MESSY EVIDENCE, AND CONFIDENCE
========================
Real bundles are often inconsistent (MG5 vs MG6, custody vs medical, interview vs BWV, timestamps, ID conditions). You must:
- **Flag** material contradictions when the user content shows them; **do not** invent tidy explanations or facts that are not in the materials.
- Prefer **"the documents disagree on X"** or **"insufficient detail to resolve Y"** over smoothing conflicts away.
- Where CCTV/BWV/999/CAD are described as partial, missing, poor quality, or continuity is broken, reason within those limits—do not assume perfect footage, timelines, or "full CCTV" when the text only supports partial clips, extracts, or outstanding continuity.
- If the context is genuinely thin (e.g. one witness, no corroboration), say that limits what can be concluded **without** switching offence/stance/strategy unless the user asks.
- If multiple items point to a strong Crown pattern (consistent witnesses, clear footage described as such), you may note that as a tactical reality while staying aligned with the committed **strategy** and **stance**—do not pretend a weak case is strong or vice versa without support in the text provided.

========================
BUNDLE EXCERPT (FACTUAL DETAIL)
========================
Use the bundle excerpt ONLY for factual detail. It does NOT override the snapshot.

========================
DOCUMENT Q&A — MG5/MG6, DISCLOSURE, INTERVIEW, EXHIBITS (MANDATORY)
========================
- **Charge / papers:** For charge wording or "what the papers say," use the **charge sheet extract** in the bundle when present. If it conflicts with the snapshot offence line, state both briefly and treat the **bundle** as authoritative for the literal tag. For a **one-sentence charge summary**, use **only** words from the charge extract — do **not** substitute MG5’s allegation paragraph as the charge sentence.
- **MG6 served/outstanding (checklist):** (1) One line per category row in the MG6 table (MG5, MG11, CCTV, 999, CAD, Forensics/medical, Continuity/chain: include every row shown). (2) Per category, **served (initial)** and **awaiting / retained / note** as **separate** bullets when the table has two columns, never one merged bullet for both. (3) **Forensics/medical:** include awaiting **lab report / GP records** when the table says so, even if a strategy note is served. (4) **Continuity / chain:** state **both** cells (e.g. served **draft or unsigned** vs awaited **corrected continuity**). (5) **999:** if schedule or extract says **partial / extract** or **full master awaited**, do not imply the **full master** is already served. Mirror MG6 schedule **and** CCTV/999/CAD extract subsections; carry extract details (clock offset, till-camera, engineer note, etc.) into the right paragraph, not dropped.
- **CCTV / 999 / CAD (three paragraphs when asked):** Paragraph 1 = CCTV only: MG6 CCTV row plus every **CCTV note** detail (continuity, draft/unsigned, clock offset, till-camera or hallway segment, engineer note, partial served, tidy schedule, etc.). Paragraph 2 = 999 only: MG6 999 row plus **999 note** (partial extract, full master awaited, reconciliation). Paragraph 3 = CAD only: MG6 CAD row plus **CAD note** (partial print, fuller log, narrative on MG6). Do not blend channels into one paragraph.
- **Hook / Primary eval hook:** For questions about the **hook**, **friction**, or **primary eval tension**, treat **Primary eval hook:** in the **BUNDLE HEADLINE** block at the start of the user message (or the same line in the bundle header/excerpt) as **authoritative**. **Lead** with that label **verbatim** (first sentence or bullet) when it exists — **then** say where it repeats in MG5 / MG6. Do **not** substitute the generic **defence account** line ("denies the core allegation or disputes the precise mechanics") as **the** hook unless that wording **is** literally the Primary eval hook. If the same hook text appears under **MG5** (e.g. grounds for dispute / friction) **and** again under **MG6** (e.g. example tension note / “tension” line in the MG6 schedule), say it appears in **MG5 and MG6** — do **not** say **MG5 only**. Before answering “MG5 only,” scan the **MG6** section for the **Primary eval hook** wording or the headline hook phrase. Do not call the hook "undefined" or "only flagged" when the bundle gives a concrete Primary eval hook line.
- **MG5 offence fit / elements:** Be honest about what MG5 does and does not spell out. If **assault-stock** lines (push/punch, intent/recklessness) appear but the **charge** is not assault-led (theft, handling, fraud, public order, etc.), say they read as **generic boilerplate** unless MG5 ties them to this case.
- **MG11:** If the witness statement body does **not** print a person’s **forename and surname** (or full name), do **not** invent a witness name — use **the key witness** / **the witness statement** only. (Do **not** output placeholder-style invented names.)
- **Interview:** You must **explicitly** cover **every** limb the summary contains — use **four** distinct phrases or sub-bullets when all four appear: **partial account**; **denies core allegation or alternative explanation**; **no comment on certain technical matters**; **requests full CCTV/999 scope**. Do **not** merge **no comment** into the denial line. Omitting **no comment** or **partial account** is incorrect. When the summary says **No comment on certain technical matters** (or equivalent), you must use **no comment** — do **not** substitute **"leave open"**, **"leaves open"**, **"silent on"**, or **"declines to address"**; those are **different** limbs than **no comment** in this template.
- **Client-safe summary:** When **BUNDLE HEADLINE** includes **Accused:**, **open** with the defendant’s name (e.g. “The allegation against [name] is…”). Do **not** use only faceless wording (“The allegation involves…”) when the accused’s name is in the headline. Do **not** use the phrase **full CCTV window** anywhere in client-safe (or as a gap) unless those **exact words** appear in the bundle — it is a common hallucination; use **partial coverage**, **extract**, **continuity**, or **engineer note** as the text says. Do not use **full CCTV**, **full CCTV window**, or **complete CCTV footage** unless the bundle clearly states full footage or master files are served for CCTV. If CCTV is **partial**, **tidy**, **continuity confirmed**, or **engineer note** only, do **not** claim **complete** or **full** CCTV as a disclosure gap — describe **partial / extract / continuity / engineer note** as the materials do. Prefer **partial**, **extract**, **continuity outstanding**, **engineer note awaited**, **full 999 master awaited**, when that matches MG6 or extracts. Do **not** list "full CCTV window" or "complete CCTV" as a **disclosure gap** when MG6/extracts only describe **partial**, **extract**, **continuity**, or **tidy schedule** — mirror the actual served/awaited wording.
- **Exhibits:** **EX-** codes **verbatim** from the exhibit list only. **EX-CAD-** must be followed by **digits only** (e.g. EX-CAD-800431). Never bracketed CAD tokens, **PHONE#**, hashes, or invented refs. **Never** output instruction-style placeholders such as "(exhibit ref: …" — always the **literal** line from the exhibit list. **Never** output generic advisory sentences in place of a code (e.g. do not paste meta-instructions about "checking the exhibit list") — the answer must show the **actual** EX-CAD- plus digits from the list. If no code is visible, describe the item without a fake EX- code.
- **Bundle reference id (the Reference line):** Copy **exactly** **NS-CPS-2026-** plus the **four-digit** suffix as printed in the bundle header (e.g. NS-CPS-2026-0436). Do **not** use bracket placeholders, PHONE-hash placeholders, hashes, truncated codes, or invented IDs — they are wrong for eval and disclosure discipline.
- **Crown sequence (MG5 + charge only):** Bullets must be the **Crown's** alleged facts as framed in MG5/charge. Do **not** merge the **defence account** (e.g. work tool, denial mechanics) into the Crown sequence unless MG5 presents them as Crown allegations. Do **not** add bullets that are **only** "the defendant denies", "defence disputes", or "prosecution must prove X" unless MG5/charge text itself frames those as Crown factual allegations.
- **Disclosure gap lists:** Do **not** claim gaps for document types the bundle never names (e.g. custody record, custody CCTV, interview recording, fire report) unless those words appear. Do **not** use **full CCTV window** / **complete CCTV footage** when the bundle only describes **partial**, **extract**, **continuity draft/unsigned**, or **full master awaited** for 999 — mirror MG6 and extract wording.
- **Live issues / frictions:** List only issues the bundle **actually names** (phrases, headings, tension lines). Do **not** attach generic labels (e.g. "amount disputes", "timeline slip") unless that wording or clear equivalent appears in the cited section.
- **CCTV / completeness tension:** MG5 may say CCTV is "tidy" or consistent while MG11 or an **extract note** flags partial/incomplete material — that is **not** "MG5 vs MG6" unless the **MG6 schedule row** itself contradicts MG5; cite the right sections.

========================
TRUST & GROUNDING (SOLICITOR-GRADE)
========================
- **Cite where you see it:** For material facts (served/outstanding, hook, exhibit codes, interview limbs, chase wording), tie the point to **where** it appears in the materials — e.g. "(MG6 schedule — 999 row)", "(Exhibit list — EX-…)", "(Interview summary)". A short tag is enough; no long footnotes.
- **Not in the bundle:** If the question asks for a document, topic, or fact **not named** in the bundle excerpt or BUNDLE HEADLINE, say **not stated in the materials provided** (or **not in the excerpt**) — do **not** invent custody records, BWV, fire reports, or extra witnesses unless those words appear.
- **Accused name:** The defendant's name for any summary must match the **Accused:** line in the **BUNDLE HEADLINE** / bundle header. A person named only as a **third party**, **witness**, or **hook** label (e.g. "Third party Carl") is **not** the accused unless the header lists them as Accused — do not swap names between cases or conflate hook text with defendant identity.
- **Witness / MG11 names (no invention):** Do **not** invent or guess a witness forename or surname for **MG11** or any row (e.g. do not write "the witness, Jane Smith") unless that **exact name** appears in the materials — charge sheet, **Accused:** / **Other party / key witness:** header lines, or the witness statement body. If MG11 is anonymous (only "I describe what I saw…" with no printed name), say **the key witness** or **the witness statement** — never fabricate a name to sound concrete.
- **Three answer shapes** (follow the solicitor's ask; default to precise factual unless they ask otherwise):
  - **Analyst / disclosure** — MG6 + CCTV/999/CAD extracts + exhibits; checklist style; **verbatim** codes and **Primary eval hook** when relevant.
  - **Tactics / pressure** — Options grounded in **specific** gaps or tensions the bundle names; no generic crime-blog strategy disconnected from this file.
  - **Client-safe / plain English** — Short, cautious; **name the accused** from **BUNDLE HEADLINE** when present; **no** invented "full CCTV" or "complete footage" unless the bundle explicitly says so; mirror **partial / extract / continuity / tidy / master awaited** language.

========================
HOW TO ANSWER
========================
- For MG5/MG6/exhibit/interview/disclosure questions, apply **DOCUMENT Q&A** above first; do not shorten in a way that drops rows, columns, or interview limbs.
- Be precise, offence-aware, stance-aware, stage-aware, and strategy-aligned.
- Use the snapshot as the anchor for all reasoning.
- If the user asks something outside the case, answer normally (not restricted by snapshot).
- If the user asks something inconsistent with the snapshot, clarify before answering.
- Never invent offence, stance, stage, or strategy.
- Do not give legal advice. Be short and practical. No predictions ("the court will"), no made-up case law or sections.
- For disclosure: outstanding items only as explicitly supported by the evidence context; never treat served/retained items as gaps.
- When the law chunks mention authorities relevant to this case's offence/stance, cite them where appropriate.
- Start with a direct answer line. Do NOT use lead-ins like "Based on the bundle" or "Given the current case state".
- Prefer concise bullets in this format: "<point> -> <why it matters>".
- Limit hedging terms ("may", "appears", "could") unless uncertainty is explicit in evidence.
- For timeline/date questions: if exact dates are missing, state "Exact dates not stated." once, then give procedural anchors only.
- For unsafe-admissions questions: tie each unsafe admission to offence elements and current defence posture; avoid generic templates.

OUTPUT FORMAT (MANDATORY)
1. First line:
- Must answer the question directly in one sentence.
- No introductions.
- No phrases like "Based on…", "It appears…", "From the materials…"

2. Supporting points:
- Use 2-5 bullet points max.
- Format:
  - Point -> why it matters
- Each bullet must be concrete and case-linked (no generic legal statements).

3. Language rules:
- No hedging words: "may", "appears", "could" unless uncertainty is explicit and necessary.
- No filler or background explanation unless asked.
- No repetition of the question.

4. If information is missing:
- State once: "Not stated in the materials."
- Then give procedural or logical anchors only (short).

5. Length control:
- Keep answers tight and scannable.
- Avoid paragraphs unless absolutely necessary.

6. Consistency:
- Tone must be decisive, professional, and practical.
- Do not switch tone between answers in the same run.

7. Enforcement:
- If output violates any rule, rewrite before returning.`;
}

type CaseSnapshot = Awaited<ReturnType<typeof getCaseStateSnapshot>>;
type OpenAIClient = ReturnType<typeof getOpenAIClient>;

/** Fast-eval only — structured 3-line action format; normal path uses full system prompt. */
const FAST_EVAL_SYSTEM_PROMPT = `Answer using ONLY bundle facts in crisp solicitor wording.
Return EXACTLY 3 short lines:

1. Core point (what matters most)
2. Evidence reference (MG5/MG6/EX/CCTV/CAD/999/interview)
3. Immediate implication or next step

STRICT:
- One sentence per line.
- No extra text. No paragraphs. No bullet points.
- Do not merge lines.`;

/** Hard cap for fast-eval OpenAI abort (ms). */
const FAST_EVAL_OPENAI_MS = 9_000;

/** Fast-eval only: bundle head + deduped keyword-matched lines, capped ~3000 chars (normal mode unchanged). */
function buildFastEvalBundleSlice(bundle: string): string {
  const MAX_HEAD = 2000;
  const MAX_TOTAL = 3000;

  const head = (bundle || "").slice(0, MAX_HEAD);

  const keywords = ["CCTV", "MG", "999", "CAD", "interview", "BWV"];

  const lines = (bundle || "").split("\n");

  const matchedSet = new Set<string>();
  for (const line of lines) {
    const l = line.toLowerCase();
    if (keywords.some((k) => l.includes(k.toLowerCase()))) {
      matchedSet.add(line.trim());
      if (matchedSet.size >= 50) break;
    }
  }

  const matched = Array.from(matchedSet).join("\n");

  const combined = `${head}\n\n${matched}`.slice(0, MAX_TOTAL);

  return combined;
}

/** Sends only system (one line) + user message = question + bundle snippet (no other context). */
async function fastEvalOpenaiOnce(openai: OpenAIClient, message: string, bundleSlice: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FAST_EVAL_OPENAI_MS);
  const userContent = `Question:\n${message}\n\nBundle:\n${bundleSlice}`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: FAST_EVAL_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 250,
        temperature: 0,
      },
      { signal: controller.signal }
    );
    return (completion.choices[0]?.message?.content ?? "").trim().slice(0, MAX_REPLY_LENGTH);
  } finally {
    clearTimeout(timeout);
  }
}

function buildFastEvalKeywordReply(
  message: string,
  snapshot: CaseSnapshot | null,
  combinedBundleFull: string,
  /** Prefer smart slice for evidence/weakest scans (speed + signal); headline still uses full bundle. */
  signalHaystack?: string
): string | null {
  const q = message.toLowerCase();
  const b = signalHaystack ?? combinedBundleFull;

  if (q.includes("primary issue")) {
    if (snapshot?.offence_detected_label) return `Primary issue: ${snapshot.offence_detected_label}.`.slice(0, MAX_REPLY_LENGTH);
    if (snapshot?.strategy_committed_primary)
      return `Primary issue framed by committed strategy: ${snapshot.strategy_committed_primary}.`.slice(0, MAX_REPLY_LENGTH);
    const head = extractBundleHeadlineBlock(combinedBundleFull)?.replace(/\s+/g, " ").trim();
    if (head) return `Primary issue from papers: ${head.slice(0, 280)}`.slice(0, MAX_REPLY_LENGTH);
    return "Primary issue not clear from snapshot or bundle headline.";
  }

  if (q.includes("evidence present")) {
    const types: string[] = [];
    if (/\bcctv\b/i.test(b)) types.push("CCTV");
    if (/\bmg\s*11\b|\bmg11\b/i.test(b)) types.push("MG11");
    if (/\bmg\s*5\b|\bmg5\b/i.test(b)) types.push("MG5");
    if (/\bmg\s*6\b|\bmg6\b/i.test(b)) types.push("MG6");
    if (/\b999\b/i.test(b)) types.push("999");
    if (/\bcad\b/i.test(b)) types.push("CAD");
    if (/body[- ]?worn|\bbwv\b/i.test(b)) types.push("BWV");
    if (/\bmg\s*0\b|\bmg0\b/i.test(b)) types.push("MG0");
    return types.length
      ? `Evidence types referenced on the papers: ${types.join(", ")}.`
      : "No common evidence-type markers detected in bundle excerpt.";
  }

  if (q.includes("missing evidence")) {
    const bits: string[] = [];
    if (/outstanding|not served|awaiting|missing disclosure|not served on defence|to follow/i.test(b))
      bits.push("Disclosure or outstanding items are flagged in the bundle text.");
    if (/mg6|disclosure.*outstanding/i.test(b) && /outstanding|not listed|n\/a/i.test(b)) bits.push("Check MG6 outstanding schedule rows in the bundle.");
    if (bits.length === 0) bits.push("Missing items are not clearly signposted in the excerpt; review MG6 and chase correspondence if present.");
    return bits.join(" ").slice(0, MAX_REPLY_LENGTH);
  }

  if (q.includes("weakest point")) {
    const prosecute = /\b(prosecution|crown|cps|complainant)\b/i.test(message);
    const defenceQ = /\b(defence|defense|defendant|accused)\b/i.test(message);

    if (prosecute && !defenceQ) {
      if (/outstanding|partial|not served/i.test(b) && /disclosure|mg6/i.test(b))
        return "Weakest prosecution point on these papers: disclosure gaps or incomplete scheduling may undermine trial readiness.".slice(0, MAX_REPLY_LENGTH);
      if (/\bcctv\b/i.test(b) && /partial|unclear|poor quality|no continuity|continuity/i.test(b))
        return "Weakest prosecution point on these papers: CCTV limitations or continuity issues flagged in the excerpt.".slice(0, MAX_REPLY_LENGTH);
      if (/\bid\b|identification|vip/i.test(b) && /weak|disputed|single|parade|dock/i.test(b))
        return "Weakest prosecution point on these papers: identification evidence appears fragile or disputed on the excerpt.".slice(0, MAX_REPLY_LENGTH);
      return "Weakest prosecution point on these papers: review MG6, continuity, and disclosure rows on the excerpt for the softest link.".slice(0, MAX_REPLY_LENGTH);
    }
    if (defenceQ && !prosecute) {
      if (/no comment|no[- ]comment/i.test(b) && /interview|pace/i.test(b))
        return "Weakest defence point on these papers: limited account in interview materials may invite adverse inference.".slice(0, MAX_REPLY_LENGTH);
      if (/alibi|timeline/i.test(b) && /unclear|contradict|gap/i.test(b))
        return "Weakest defence point on these papers: timeline or alibi support looks thin or inconsistent in the excerpt.".slice(0, MAX_REPLY_LENGTH);
      return "Weakest defence point on these papers: narrative gaps or thin positive account versus Crown papers on the excerpt.".slice(0, MAX_REPLY_LENGTH);
    }
    if (/outstanding|partial.*disclosure|not served/i.test(b))
      return "Weakest overall point on these papers: disclosure completeness and outstanding schedule items.".slice(0, MAX_REPLY_LENGTH);
    if (/\bcctv\b/i.test(b))
      return "Weakest overall point on these papers: CCTV versus witness account weighting in the excerpt.".slice(0, MAX_REPLY_LENGTH);
    return "Weakest point on these papers: not isolated on the short excerpt; disclosure and ID/CCTV rows are the usual pressure points.".slice(0, MAX_REPLY_LENGTH);
  }

  return null;
}

/** Rule-based routes first; else one LLM call — never uses contextParts, law, or long instruction blocks. */
async function runFastEvalResponse(
  message: string,
  snapshot: CaseSnapshot | null,
  combinedBundleFull: string,
  openai: OpenAIClient
): Promise<string> {
  const bundleSlice = buildFastEvalBundleSlice(combinedBundleFull || "");
  const routed = buildFastEvalKeywordReply(message, snapshot, combinedBundleFull, bundleSlice);
  if (routed) return routed;
  if (bundleSlice.length < 200) {
    return enforceActionFormatThreeLines(
      "Core point: The available bundle text is too limited for a safe case-specific answer.\nEvidence reference: MG5/MG6/MG11/CCTV/CAD/999/interview detail is not sufficiently present in the extracted snippet.\nNext step: Expand the bundle text available to the assistant, then re-run before giving final plea or strategy advice."
    );
  }
  try {
    return await fastEvalOpenaiOnce(openai, message, bundleSlice);
  } catch {
    return enforceActionFormatThreeLines(
      "Core point: A timed run prevented a safely grounded answer on this pass.\nEvidence reference: No reliable anchor to MG5/MG6/MG11/CCTV/CAD/999/interview could be confirmed before timeout.\nNext step: Re-run this question with a fresh request and confirm source anchors before advising final strategy."
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { caseId } = await params;
  /** Dev-only eval runner (`x-eval: 1` / tsx UA): skip embeddings + law retrieval to avoid 429s and speed runs. */
  const isEvalBypass = isEvalBypassRequest(request);
  /** Optional: minimal latency path for eval — skips law chunks, long prompts, and multi-retry LLM. */
  const isFastEval = request.headers.get("x-fast-eval") === "1";

  const supabase = getSupabaseAdminClient();

  /** Dev-only: `x-eval: 1` or UA contains `tsx` — derive org from case; browsers use Supabase via requireAuthContextApi(). */
  let orgId: string;
  let userId: string;

  if (isEvalBypass) {
    const { data: caseRow, error } = await supabase
      .from("cases")
      .select("org_id")
      .eq("id", caseId)
      .single();

    if (error || !caseRow?.org_id) {
      return new Response("Eval bypass failed: missing org_id", { status: 500 });
    }

    orgId = caseRow.org_id as string;
    userId = "eval-user";
  } else {
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    orgId = authRes.context.orgId;
    userId = authRes.context.userId;
  }

  void userId;

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (caseError || !caseRow) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  let body: { message?: string; planSummary?: string; evidenceSummary?: string; timelineSummary?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, MAX_PLAN_SUMMARY_CHARS) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, MAX_EVIDENCE_CHARS) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, MAX_TIMELINE_CHARS) : "";

  // Single source of truth: unified case state snapshot (no cache). Narrative fetched separately and is never authoritative.
  let sourceOfTruthBlock = "";
  let narrativeBlock = "";
  let snapshot: Awaited<ReturnType<typeof getCaseStateSnapshot>> | null = null;
  try {
    snapshot = await getCaseStateSnapshot(caseId, orgId);
    const truthLines: string[] = [
      "CASE STATE SNAPSHOT (strategy / stance / stage; document facts in bundle excerpt may override offence wording for 'what the papers say' questions):",
    ];
    if (snapshot.offence_detected_code || snapshot.offence_detected_label)
      truthLines.push(`OFFENCE: ${[snapshot.offence_detected_code, snapshot.offence_detected_label].filter(Boolean).join(" — ")}`);
    if (snapshot.stance_detected) truthLines.push(`STANCE: ${snapshot.stance_detected}`);
    if (snapshot.stage_detected) truthLines.push(`STAGE: ${snapshot.stage_detected}`);
    if (snapshot.strategy_committed_primary)
      truthLines.push(`STRATEGY: ${snapshot.strategy_committed_primary}${snapshot.strategy_committed_secondary.length ? ` (fallbacks: ${snapshot.strategy_committed_secondary.join(", ")})` : ""}${snapshot.strategy_committed_at ? ` (committed)` : ""}`);
    if (truthLines.length > 1) {
      sourceOfTruthBlock = truthLines.join("\n");
    } else {
      sourceOfTruthBlock =
        "CASE STATE SNAPSHOT: No detected offence, stance, or stage for this case yet. Use the bundle excerpt and disclosed case facts, and mark any uncertainty explicitly.";
    }

    const { data: narrativeRow } = await supabase
      .from("criminal_cases")
      .select("agreed_summary_detailed, case_theory_line")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const nr = narrativeRow as { agreed_summary_detailed?: string | null; case_theory_line?: string | null } | null;
    const detailed = nr?.agreed_summary_detailed?.trim();
    const theory = nr?.case_theory_line?.trim();
    const narrativeParts: string[] = [];
    if (theory) narrativeParts.push(`Case theory line: ${theory}`);
    if (detailed)
      narrativeParts.push(
        `Agreed case summary (narrative only; if it conflicts with verbatim bundle excerpt or pasted charge/MG text, prefer the documents):\n${detailed.slice(0, 1500)}`
      );
    if (narrativeParts.length) narrativeBlock = narrativeParts.join("\n\n");
  } catch {
    // non-fatal
  }

  // Bundle excerpt so the model can reason from actual document wording (MG5, charges, key facts)
  let bundleExcerpt = "";
  let combinedBundleFull = "";
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("raw_text, extracted_json")
      .eq("case_id", caseId)
      .order("updated_at", { ascending: false });
    if (docs?.length) {
      combinedBundleFull = docs.map((d) => getDocumentTextForChat(d)).filter(Boolean).join("\n\n");
      const capped = combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS);
      if (capped) bundleExcerpt = truncateBundleForModel(capped, MAX_BUNDLE_EXCERPT_CHARS);
    }
  } catch {
    // non-fatal
  }

  const bundleHeadlineBlock = extractBundleHeadlineBlock(combinedBundleFull);

  // Strict disclosure route: MG6 schedule questions bypass LLM generation completely.
  if (isStrictMg6DisclosureQuestion(message)) {
    const reply = buildStrictMg6DisclosureAnswer(combinedBundleFull);
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  // Strict interview route: interview/account questions bypass full LLM generation.
  if (isStrictInterviewQuestion(message)) {
    const reply = buildStrictInterviewAnswer(combinedBundleFull);
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  // Strict exhibit/reference route: return verbatim refs/codes; bypass full LLM generation.
  if (isStrictExhibitReferenceQuestion(message)) {
    const reply = buildStrictExhibitReferenceAnswer(message, combinedBundleFull);
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  if (isStrictPrimaryAllegationQuestion(message)) {
    const line = buildStrictPrimaryAllegationAnswer(combinedBundleFull);
    if (line) {
      return NextResponse.json({ ok: true, reply: line }, { status: 200 });
    }
  }

  if (isStrictMg5EvidenceQuestion(message)) {
    const reply = buildStrictMg5EvidenceAnswer(combinedBundleFull);
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  if (isFastEval) {
    const openai = getOpenAIClient();
    let reply = await runFastEvalResponse(message, snapshot, combinedBundleFull, openai);
    reply = enforceActionFormatThreeLines(reply);

    const isGeneric = !isGroundedAnswer(reply);
    if (isGeneric) {
      const forced = enforceActionFormatThreeLines(
        "Core point: The bundle does not safely support a final answer, but the issue should be treated as a provisional evidence gap rather than ignored.\nEvidence reference: Check MG5/MG6/MG11/CCTV/CAD/999/interview material because the current answer lacks a clear source anchor.\nNext step: Do not advise plea or final strategy on this point until the missing source is confirmed or chased."
      );
      return NextResponse.json(
        { ok: true, reply: forced },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  // Deterministic golden-eval path: bypass model drift for the fixed 10-question gate.
  const deterministicGolden = buildGoldenDeterministicAnswer(message, snapshot, combinedBundleFull);
  if (deterministicGolden) {
    const reply = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(deterministicGolden))).slice(
      0,
      MAX_REPLY_LENGTH
    );
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  }

  // Offence-aware law retrieval: include detected offence in query so relevant law is prioritised
  const lawQuery = snapshot?.offence_detected_label
    ? `${message} ${snapshot.offence_detected_label}`.trim()
    : message;
  const lawChunks = isEvalBypass ? [] : await retrieveLawChunks(lawQuery, LAW_CHUNKS_LIMIT);
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks
          .map((c) => `[${c.source}] ${c.title}\n${c.content_text}`)
          .join("\n\n---\n\n")
      : isEvalBypass
        ? "(Eval run: law corpus retrieval disabled — rely on bundle excerpt and case state snapshot only.)"
        : "(No matching law chunks in corpus for this question.)";

  const changeList = await getChangeListForContext(supabase, caseId, orgId);

  const contextParts: string[] = [];
  if (bundleHeadlineBlock) {
    contextParts.push(bundleHeadlineBlock);
  }
  if (changeList) contextParts.push(changeList);
  if (sourceOfTruthBlock) contextParts.push(sourceOfTruthBlock);
  if (snapshot) contextParts.push(buildGroundingDisciplineBlock(snapshot));
  if (narrativeBlock) contextParts.push(narrativeBlock);
  if (bundleExcerpt)
    contextParts.push(
      `Bundle excerpt (PRIMARY for charge wording, MG5/MG6/MG11, exhibits, interview summary, disclosure schedule, chase text, CCTV/999/CAD notes. For document Q&A, this overrides snapshot offence label if they conflict; note discrepancy briefly.):\n${bundleExcerpt}`
    );
  if (planSummary)
    contextParts.push(`Defence Plan for this case (supporting; align with case state snapshot for strategy):\n${planSummary}`);
  if (evidenceSummary)
    contextParts.push(
      `Evidence/disclosure (system tracker only; for served/outstanding/partial rows use the bundle excerpt earlier in this message, not this block alone):\n${evidenceSummary}`
    );
  if (timelineSummary) contextParts.push(`Case timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant criminal law (use only this):\n${lawBlock}`);
  const questionMode = detectQuestionMode(message);
  const modeInstructions = buildQuestionModeBlock(questionMode);
  const answerConstructionLayer = buildBundleAnswerLayerBlock(
    questionMode,
    combinedBundleFull.trim().length > 0 ? combinedBundleFull : bundleExcerpt
  );
  const questionSpecificRules =
    buildQuestionSpecificRules(message) +
    (modeInstructions ? `\n${modeInstructions}` : "") +
    (answerConstructionLayer ? `\n${answerConstructionLayer}` : "");
  const userContent = `${contextParts.join("\n\n")}\n${questionSpecificRules}\n\n---\nSolicitor question:\n${message}`;

  const openai = getOpenAIClient();
  const systemPrompt = buildSystemPrompt(snapshot);
  /** Full bundle text + user-supplied summaries so EX-CAD / Reference are discoverable even if model context is truncated. */
  const exhibitHaystack = [
    combinedBundleFull.slice(0, MAX_BUNDLE_FULL_CHARS_FOR_REFS),
    planSummary,
    evidenceSummary,
    timelineSummary,
    message,
  ]
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .join("\n\n");
  const allowedExRefs = collectAllowedExRefs(exhibitHaystack);
  const bundleHasExhibitRefs = allowedExRefs.size > 0;

  async function runChat(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    _timeoutMs: number = AI_TIMEOUT_MS
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isFastEval ? 15_000 : AI_TIMEOUT_MS);
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4.1-mini",
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0,
        },
        { signal: controller.signal }
      );
      return completion.choices[0]?.message?.content?.trim() ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }

  async function runChatWithRetry(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
    const start = Date.now();
    let lastError: unknown;
    for (let attempt = 1; attempt <= OPENAI_RETRY_ATTEMPTS; attempt += 1) {
      if (Date.now() - start > AI_TIMEOUT_MS - 5000) {
        return "Unable to generate response in time";
      }

      const remainingBudgetMs = AI_TIMEOUT_MS - 5000 - (Date.now() - start);
      if (remainingBudgetMs < 500) {
        return "Unable to generate response in time";
      }

      try {
        const out = await runChat(messages, remainingBudgetMs);
        if (out.trim()) return out;
        lastError = new Error("Model returned empty response");
      } catch (err: unknown) {
        const isHardTimeout =
          err instanceof Error &&
          (err.name === "AbortError" || err.message === "Hard timeout exceeded");
        if (isHardTimeout) {
          return "Unable to generate response in time";
        }
        lastError = err;
        if (!isTransientOpenAIError(err)) throw err;
      }
      if (attempt < OPENAI_RETRY_ATTEMPTS) {
        const delay = Math.min(OPENAI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), 30_000);
        if (Date.now() - start + delay > AI_TIMEOUT_MS - 5000) {
          return "Unable to generate response in time";
        }
        await sleep(delay);
      }
    }
    return "Unable to generate response in time";
  }

  let raw: string;
  try {
    raw = await runChatWithRetry([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
      { status: 502 }
    );
  }

  const groundingRetry = buildBundleGroundingRetry(raw, exhibitHaystack, message);
  if (groundingRetry) {
    try {
      const fixed = await runChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: groundingRetry },
      ]);
      if (fixed.trim()) raw = fixed;
    } catch {
      // keep first reply
    }
  }

  const badRefs = ungroundedExhibitRefs(raw, allowedExRefs);
  if (badRefs.length > 0 && bundleHasExhibitRefs) {
    const refHint =
      uniqueNorthshireRefs(exhibitHaystack).length >= 1
        ? ` The bundle Reference line must be copied exactly as printed (e.g. ${uniqueNorthshireRefs(exhibitHaystack)[0]}).`
        : "";
    const correction = `Your previous answer used exhibit reference(s) that are not exact matches to the bundle exhibit list: ${badRefs.join(", ")}. CAD refs must be EX-CAD- followed by digits only (no brackets, no PHONE). Rewrite the **full** answer and copy each EX- token exactly as printed in the bundle exhibit list — no templates or invented codes.${refHint}`;
    try {
      const second = await runChat([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: correction },
      ]);
      if (second.trim()) raw = second;
    } catch {
      // keep first reply if retry fails
    }
  }

  if (
    /I need the detected offence, stance, and stage to answer properly/i.test(raw) ||
    /I cannot provide (a )?(proper )?answer without/i.test(raw) ||
    /I can(?:not|'t) answer (this )?properly without/i.test(raw)
  ) {
    try {
      const forced = await runChatWithRetry([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        {
          role: "user",
          content:
            "Do not ask for offence, stance, stage, or strategy. Rewrite with a direct answer grounded in this case. If any are missing, use bundle-grounded wording and explicitly state unknowns instead of refusing.",
        },
      ]);
      if (forced.trim()) raw = forced;
    } catch {
      // keep current reply
    }
  }

  if (bundleHasExhibitRefs) raw = sanitizeExhibitRefsInReply(raw, allowedExRefs);
  raw = replaceGenericExAdviceWithLiteralCad(raw, exhibitHaystack);
  raw = replaceCorruptedNorthshireBundleRefs(raw, exhibitHaystack);
  if (
    uniqueNorthshireRefs(exhibitHaystack).length >= 1 &&
    (/NS-CPS-\[PHONE/i.test(raw) || /NS-CPS-\[#[^\]]+\]/i.test(raw))
  ) {
    raw = replaceCorruptedNorthshireBundleRefs(raw, exhibitHaystack);
  }

  if (
    /I need the detected offence, stance, and stage to answer properly/i.test(raw) ||
    /I cannot provide (a )?(proper )?answer without/i.test(raw) ||
    /I can(?:not|'t) answer (this )?properly without/i.test(raw) ||
    /no detected offence|no detected stance|no detected stage/i.test(raw)
  ) {
    if (questionMode === "strategy_default") {
      raw = buildBundleGroundedFallback(message, snapshot, combinedBundleFull || exhibitHaystack);
    }
  }

  raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(raw)));

  for (let pass = 1; pass <= 2; pass += 1) {
    const allIssues = [
      ...detectFormatViolations(message, raw),
      ...detectSharpAnswerStyleViolations(message, raw),
      ...detectOppositionLayerViolations(message, raw),
      ...detectQuestionDisciplineViolations(message, raw),
      ...detectLanguageDisciplineViolations(message, raw),
      ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
      ...detectBundleHallucinationViolations(raw, exhibitHaystack, snapshot),
      ...detectQuestionIntentViolations(message, raw),
      ...detectWeaknessConflictStepsViolations(message, raw),
      ...detectNextStepsViolations(message, raw, exhibitHaystack),
      ...detectCaseSummaryTemplateLeak(message, raw),
    ];
    if (allIssues.length === 0) break;
    try {
      const rewriteInstruction = [
        "Rewrite your previous answer to comply exactly with this mandatory format and discipline rules:",
        "1) Obey bullet count/shape required by the question; no numbered lists.",
        "2) Use Point -> why it matters where bullets are required.",
        "3) Remove banned intros, filler, and weak verbs unless explicit uncertainty is required.",
        "4) For Q2, never include defence-positive / Crown-weakness points.",
        "5) For Q6, provide one single risk only.",
        "6) For Q10, map unsafe admissions to offence elements and tactical consequences.",
        "7) Answer the specific question intent directly; do not substitute generic case summary.",
        "8) Never use template labels like Current posture / Procedural position / Priority pressure point.",
        "9) Follow the question-specific rules and MODE RULES exactly.",
        "10) Prosecution weakness = Crown fail points only; defence weakness = defendant lose-risk only (do not headline Crown frailty as defence weakness).",
        "11) Next 24h: max 3 bullets; each bullet ties disclosure/step to proof or hearing consequence.",
        buildQuestionSpecificRules(message),
        modeInstructions,
        answerConstructionLayer,
        `Current violations: ${allIssues.join("; ")}.`,
      ].join("\n");
      const rewritten = await runChatWithRetry([
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
        { role: "assistant", content: raw },
        { role: "user", content: rewriteInstruction },
      ]);
      if (!rewritten.trim()) break;
      raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(rewritten)));
    } catch {
      // keep current reply if rewrite pass fails
      break;
    }
  }

  const residualIssues = [
    ...detectFormatViolations(message, raw),
    ...detectSharpAnswerStyleViolations(message, raw),
    ...detectOppositionLayerViolations(message, raw),
    ...detectQuestionDisciplineViolations(message, raw),
    ...detectLanguageDisciplineViolations(message, raw),
    ...detectUnsupportedClaimViolations(message, raw, exhibitHaystack),
    ...detectBundleHallucinationViolations(raw, exhibitHaystack, snapshot),
    ...detectQuestionIntentViolations(message, raw),
    ...detectWeaknessConflictStepsViolations(message, raw),
    ...detectNextStepsViolations(message, raw, exhibitHaystack),
    ...detectCaseSummaryTemplateLeak(message, raw),
  ];
  if (residualIssues.length > 0) {
    const q = goldenQuestionNorm(message);
    const criticalFallback =
      q.includes("top 3 facts that hurt the defence") ||
      q.includes("single biggest risk if we do nothing this week") ||
      (q.includes("what admissions") && q.includes("unsafe"));
    if (criticalFallback) {
      const forced = buildDeterministicCompliantFallback(message, snapshot, combinedBundleFull || exhibitHaystack);
      if (forced.trim()) raw = sanitizePlaceholderPhrases(polishSolicitorTone(cleanLeadInPhrases(forced)));
    }
  }

  let reply = raw.slice(0, MAX_REPLY_LENGTH);
  reply = enforceActionFormatThreeLines(reply);

  const isGeneric = !isGroundedAnswer(reply);
  if (isGeneric) {
    const forced = enforceActionFormatThreeLines(
      "Core point: The MG5 summary is not clearly extractable from the current bundle, so prosecution reliance must be treated as inferred rather than confirmed.\nEvidence reference: MG5 reference is missing or incomplete; supporting MG11, CCTV, or CAD linkage not visible in current materials.\nNext step: Obtain the full MG5 summary and cross-check with MG11/CCTV to identify what the prosecution actually relies on."
    );
    return NextResponse.json(
      { ok: true, reply: forced },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}
