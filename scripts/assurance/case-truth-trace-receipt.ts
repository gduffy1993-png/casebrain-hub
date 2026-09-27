export type OutputType =
  | "identity"
  | "evidence_status"
  | "chase_request"
  | "court_line"
  | "client_summary"
  | "procedural_instruction"
  | "furniture"
  | "provenance"
  | "inventory_row"
  | "unknown_factual";

export type SourceClass =
  | "source_backed"
  | "derived_from_absence"
  | "user_entered"
  | "procedural_instruction"
  | "generated_from_missing_expected_material"
  | "unsupported";

export type TruthState =
  | "served"
  | "outstanding"
  | "missing"
  | "not_safely_confirmed"
  | "referred_only"
  | "incomplete"
  | "draft"
  | "needs_confirmation"
  | "mixed"
  | "none";

export type Transformation =
  | "direct_quote"
  | "status_normalise"
  | "family_collapse"
  | "absence_inference"
  | "schedule_gap"
  | "boilerplate"
  | "generated_gap_template"
  | "unknown";

export type HardBucket =
  | "unsupported_factual_statement"
  | "wrong_defendant_source_bleed"
  | "incorrect_evidence_status"
  | "incorrect_provenance"
  | "duplicate_conflicting_output"
  | "unsafe_strengthening_of_source_wording"
  | "cross_surface_disagreement"
  | "stale_state_output";

export type SoftBucket =
  | "ugly_title"
  | "repetition"
  | "generic_boilerplate_clutter"
  | "weak_wording"
  | "furniture_copy_button_noise";

export type OutputReceipt = {
  output: string;
  outputType: OutputType;
  truthState: TruthState;
  sourceDocument: string | null;
  sourcePage: string | null;
  sourceRef: string | null;
  supportingText: string | null;
  transformation: Transformation;
  sourceClass: SourceClass;
  confidence: number;
  guard: string;
  finalWording: string;
};

export const HARD_BUCKETS: HardBucket[] = [
  "unsupported_factual_statement",
  "wrong_defendant_source_bleed",
  "incorrect_evidence_status",
  "incorrect_provenance",
  "duplicate_conflicting_output",
  "unsafe_strengthening_of_source_wording",
  "cross_surface_disagreement",
  "stale_state_output",
];

export const SOFT_BUCKETS: SoftBucket[] = [
  "ugly_title",
  "repetition",
  "generic_boilerplate_clutter",
  "weak_wording",
  "furniture_copy_button_noise",
];

const STATUS_WORD_RE =
  /\b(?:served|on file|outstanding|missing|not served|not yet served|not safely confirmed|unclear|incomplete|overdue|due soon|needs confirmation|referred only)\b/i;
const ASSERTIVE_GAP_RE = /\b(?:outstanding|missing|not served|not yet served|overdue|due soon|chase|please provide)\b/i;
const FURNITURE_RE =
  /\b(?:copy (?:cps )?chase|copy court(?: line| wording)?|copy client-safe summary|copy safe court line|flag this section|open (?:file|papers|cps chase|court position)|more detail|upgrade)\b/i;
const PROCEDURAL_RE =
  /\b(?:please provide|solicitor review required|record (?:a )?provisional position|review the cited source|record whether the material is served|confirm in writing why it is not available|check source before sending)\b/i;
const GENERATED_GAP_RE =
  /\b(?:full 999 audio|full cad incident log|full phone download|full phone extraction|source extraction|subscriber \/ account data|full cctv master)\b/i;
const ABSENCE_SOURCE_RE =
  /\b(?:not (?:yet )?(?:served|attached|listed|supplied|included)|no (?:reference|mention|listing|entry)|outstanding|absent|not in papers)\b/i;
const PAGE_RE = /\bpage\s+(\d{1,4})\b|\|\s*(\d{1,4}(?:-\d{1,4})?)\s*\|/i;
const KNOWN_DEFENDANTS = [
  "leon hale",
  "taylor brookes",
  "ellis dunn",
  "isaac patel",
  "layla davies",
  "jordan hale",
  "marcus vale",
  "arden vale",
  "morgan ellis",
];

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normal(text: string): string {
  return compact(text).toLowerCase();
}

export function inferOutputType(path: string, surface: string, text: string): OutputType {
  const p = `${path} ${surface}`.toLowerCase();
  const n = normal(text);
  if (FURNITURE_RE.test(n) && n.length < 80) return "furniture";
  if (/^(overdue|due soon|served|chased|received|not started|total|all)$/i.test(n)) return "furniture";
  if (PROCEDURAL_RE.test(n) && !STATUS_WORD_RE.test(n) && !/\b(?:mg\d|ex[-/])/i.test(n)) {
    return "procedural_instruction";
  }
  if (p.includes("client") || p.includes("summary")) return "client_summary";
  if (p.includes("court") || /safe court line|asks the court to record/i.test(text)) return "court_line";
  if (p.includes("chase") || /^please provide/i.test(text)) return "chase_request";
  if (p.includes("identity") || p.includes("casetitle") || p.includes("clientlabel") || p.includes("allegation") || p.includes("offencelabel")) {
    return "identity";
  }
  if (p.includes("provenance") || /\bprovenance\b|state:\s/i.test(text)) return "provenance";
  if (p.includes("papers") || p.includes("inventory") || p.includes("fiveanswer")) return "inventory_row";
  if (STATUS_WORD_RE.test(text) || ASSERTIVE_GAP_RE.test(text)) return "evidence_status";
  if (PROCEDURAL_RE.test(n)) return "procedural_instruction";
  if (FURNITURE_RE.test(n)) return "furniture";
  return "unknown_factual";
}

export function inferTruthState(text: string): TruthState {
  const n = normal(text);
  const hedged = n
    .replace(/\bnot\s+(?:yet\s+|fully\s+)?served\b/g, " ")
    .replace(/\b(?:if|once|until|when|unless|pending)\s+(?:\w+\s+){0,12}served\b/g, " ")
    .replace(/\b(?:on|from)\s+served\s+material\b/g, " ")
    .replace(/\b(?:or|and|with)\s+served\s+evidence\b/g, " ")
    .replace(/\b(?:primary\s+)?route on file\b/g, " ")
    .replace(/\bon file:/g, " ")
    .replace(/\bif proved\b/g, " ");
  const served =
    /\b(?:served|on file)\b/.test(hedged) ||
    (/\bon the papers\b/.test(n) && !/\bnot\b/.test(n) && !/\bonly partly\b/.test(n));
  const outstanding = /\b(?:outstanding|not served|not yet served|overdue|due soon|not on the papers yet)\b/.test(n);
  const missing = /\bmissing\b/.test(n);
  const review = /\b(?:not safely confirmed|unclear|needs confirmation)\b/.test(n);
  const referred = /\breferred only\b/.test(n);
  const draft = /\b(?:draft|unsigned)\b/.test(n);
  const incomplete = /\bincomplete\b/.test(n);
  const hits = [served, outstanding || missing, review, referred, draft || incomplete].filter(Boolean).length;
  if (hits > 1) return "mixed";
  if (served) return "served";
  if (outstanding) return "outstanding";
  if (missing) return "missing";
  if (review) return "not_safely_confirmed";
  if (referred) return "referred_only";
  if (draft) return "draft";
  if (incomplete) return "incomplete";
  if (/\bneeds confirmation\b/.test(n)) return "needs_confirmation";
  return "none";
}

export function looksFactual(outputType: OutputType, text: string): boolean {
  if (outputType === "furniture" || outputType === "procedural_instruction") return false;
  if (
    outputType === "identity" ||
    outputType === "evidence_status" ||
    outputType === "court_line" ||
    outputType === "client_summary" ||
    outputType === "inventory_row" ||
    outputType === "provenance" ||
    outputType === "unknown_factual"
  ) {
    return true;
  }
  return STATUS_WORD_RE.test(text) || ASSERTIVE_GAP_RE.test(text);
}

export function inferTransformation(
  sourceClass: SourceClass,
  sourceMethod: "ref" | "token" | "none" | "not-on-git",
  text: string,
): Transformation {
  if (sourceClass === "procedural_instruction") return "boilerplate";
  if (sourceClass === "generated_from_missing_expected_material") return "generated_gap_template";
  if (sourceClass === "derived_from_absence") return "absence_inference";
  if (sourceMethod === "ref") return /cad and 999|cctv stills and timing/i.test(text) ? "family_collapse" : "status_normalise";
  if (sourceMethod === "token") return "direct_quote";
  return "unknown";
}

export function classifySourceClass(input: {
  text: string;
  path: string;
  outputType: OutputType;
  sourceMethod: "ref" | "token" | "none" | "not-on-git";
  sourceQuote?: string;
  sourceText: string | null;
}): SourceClass {
  const n = normal(input.text);
  if (input.outputType === "furniture" || input.outputType === "procedural_instruction" || PROCEDURAL_RE.test(n)) {
    return "procedural_instruction";
  }
  if (/\b(?:user entered|solicitor note|record position|flagged by user)\b/i.test(`${input.path} ${input.text}`)) {
    return "user_entered";
  }
  if (
    /^(needs review(?: before relying)?|not safely confirmed|provisional(?: — check papers)?|solicitor review required|served on bundle — brief plan ledger\.?|overdue|due soon|served|chased|received|not started|total|all)$/i.test(
      n,
    )
  ) {
    return "procedural_instruction";
  }
  if (input.sourceMethod === "ref" || (input.sourceMethod === "token" && (input.sourceQuote?.length ?? 0) >= 8)) {
    return "source_backed";
  }
  if (input.sourceText && GENERATED_GAP_RE.test(input.text) && ABSENCE_SOURCE_RE.test(input.sourceText) && familyMentionedInSource(input.text, input.sourceText)) {
    return "generated_from_missing_expected_material";
  }
  if (input.sourceText && ASSERTIVE_GAP_RE.test(input.text) && isAbsenceDerivation(input.text, input.sourceText)) {
    return "derived_from_absence";
  }
  if (input.sourceMethod === "not-on-git") {
    return looksFactual(input.outputType, input.text) ? "unsupported" : "procedural_instruction";
  }
  if (looksFactual(input.outputType, input.text)) return "unsupported";
  return "procedural_instruction";
}

function familyMentionedInSource(text: string, sourceText: string): boolean {
  const n = normal(text);
  const s = normal(sourceText);
  if (/\b(?:999|cad)\b/.test(n)) return /\b(?:999|cad|ex-mur-012)\b/.test(s);
  if (/\bphone|subscriber|extraction\b/.test(n)) return /\b(?:phone|subscriber|tel\/|cell-site|extraction)\b/.test(s);
  if (/\bcctv|master footage\b/.test(n)) return /\b(?:cctv|master footage|export log)\b/.test(s);
  return false;
}

function isAbsenceDerivation(text: string, sourceText: string): boolean {
  const n = normal(text);
  const lines = sourceText.split(/\r?\n/).map(compact);
  const tokens = n.split(/[^a-z0-9]+/).filter((t) => t.length >= 5).slice(0, 6);
  return lines.some((line) => {
    const ln = normal(line);
    if (!ABSENCE_SOURCE_RE.test(ln)) return false;
    return tokens.filter((token) => ln.includes(token)).length >= 1;
  });
}

export function extractSourcePage(quote?: string): string | null {
  if (!quote) return null;
  const hit = quote.match(PAGE_RE);
  return hit ? (hit[1] || hit[2] || null) : null;
}

export function extractSourceDocument(path: string, quote?: string): string | null {
  if (quote && /\bmg6|mg5|mg11|disclosure schedule|bundle\b/i.test(quote)) {
    const named = quote.match(/\b(?:MG\d{1,2}[A-Z]?|disclosure schedule|charge sheet|bundle)\b/i);
    if (named) return named[0];
  }
  if (/file-extract|source-extract|bundle-text|front-matter/i.test(path)) return "file_source_extract";
  if (/casebrain-output/i.test(path)) return "saved_casebrain_output";
  return null;
}

export function inferGuard(sourceClass: SourceClass, flags: string[]): string {
  if (flags.includes("unsupported_factual_statement") || sourceClass === "unsupported") {
    return "fail: factual output has no source class/explanation";
  }
  if (sourceClass === "source_backed") return "pass: source-backed";
  if (sourceClass === "derived_from_absence") return "pass: derived from stated absence";
  if (sourceClass === "generated_from_missing_expected_material") return "explained: generated from expected missing material";
  if (sourceClass === "user_entered") return "explained: user-entered";
  if (sourceClass === "procedural_instruction") return "explained: procedural/furniture";
  return "fail: unclassified factual";
}

export function buildReceipt(input: {
  text: string;
  path: string;
  surface: string;
  refs: string[];
  sourceMethod: "ref" | "token" | "none" | "not-on-git";
  sourceQuote?: string;
  sourceText: string | null;
  confidence: number;
}): { receipt: OutputReceipt; sourceClass: SourceClass } {
  const outputType = inferOutputType(input.path, input.surface, input.text);
  const sourceClass = classifySourceClass({
    text: input.text,
    path: input.path,
    outputType,
    sourceMethod: input.sourceMethod,
    sourceQuote: input.sourceQuote,
    sourceText: input.sourceText,
  });
  const receipt: OutputReceipt = {
    output: input.text,
    outputType,
    truthState: inferTruthState(input.text),
    sourceDocument: extractSourceDocument(input.path, input.sourceQuote),
    sourcePage: extractSourcePage(input.sourceQuote),
    sourceRef: input.refs[0] ?? null,
    supportingText: input.sourceQuote ?? null,
    transformation: inferTransformation(sourceClass, input.sourceMethod, input.text),
    sourceClass,
    confidence: input.confidence,
    guard: inferGuard(sourceClass, []),
    finalWording: input.text,
  };
  return { receipt, sourceClass };
}

export function hardBucketFor(flag: string): HardBucket | null {
  switch (flag) {
    case "unsupported_factual_statement":
    case "unclassified_factual":
    case "no_source_for_assertive_output":
      return "unsupported_factual_statement";
    case "wrong_defendant_source_bleed":
    case "wrong_charge_or_identity":
      return "wrong_defendant_source_bleed";
    case "incorrect_evidence_status":
    case "served_and_outstanding_same_line":
      return "incorrect_evidence_status";
    case "incorrect_provenance":
    case "phone_output_without_phone_source":
    case "999_audio_without_audio_source":
      return "incorrect_provenance";
    case "duplicate_conflicting_output":
      return "duplicate_conflicting_output";
    case "unsafe_strengthening_of_source_wording":
      return "unsafe_strengthening_of_source_wording";
    case "cross_surface_disagreement":
      return "cross_surface_disagreement";
    case "stale_state_output":
    case "stuck_building_state":
      return "stale_state_output";
    default:
      return null;
  }
}

export function softBucketFor(flag: string): SoftBucket | null {
  switch (flag) {
    case "ugly_title":
      return "ugly_title";
    case "repetition":
      return "repetition";
    case "generic_solicitor_clutter":
    case "generic_boilerplate_clutter":
      return "generic_boilerplate_clutter";
    case "compound_mixed_status_output":
    case "weak_wording":
    case "review_only_with_deadline_pressure":
      return "weak_wording";
    case "furniture_copy_button_noise":
    case "internal_language_leak":
      return "furniture_copy_button_noise";
    default:
      return null;
  }
}

export { classifyEvidenceSubFamily as materialFamily } from "@/lib/criminal/evidence-family-owner";

export function statusBucket(state: TruthState | string): "served" | "outstanding" | "review" | "other" {
  if (state === "served") return "served";
  if (state === "outstanding" || state === "missing") return "outstanding";
  if (state === "not_safely_confirmed" || state === "needs_confirmation" || state === "referred_only") return "review";
  return "other";
}

export function conflictingStatus(a: string, b: string): boolean {
  const left = statusBucket(a);
  const right = statusBucket(b);
  if (left === "other" || right === "other") return false;
  if ((left === "review" && right === "outstanding") || (left === "outstanding" && right === "review")) {
    return false;
  }
  return left !== right;
}

export function defendantBleed(text: string, sourceText: string | null): string | null {
  if (!sourceText) return null;
  const src = normal(sourceText);
  const out = normal(text);
  const sourceHits = KNOWN_DEFENDANTS.filter((name) => src.includes(name));
  const outputHits = KNOWN_DEFENDANTS.filter((name) => out.includes(name));
  if (sourceHits.length === 0 || outputHits.length === 0) return null;
  const foreign = outputHits.find((name) => !sourceHits.includes(name));
  return foreign ?? null;
}

export function unsafeStrengthening(text: string, sourceQuote?: string): boolean {
  const basis = normal(sourceQuote ?? "");
  if (!basis) return false;
  const n = normal(text);
  const sourceWeak = /\b(?:referred only|draft|summary only|stills|not safely confirmed|not attached|extract only)\b/.test(basis);
  const outputStrong = /\b(?:served|on file|confirms|proves|establishes)\b/.test(n.replace(/\bnot\s+(?:yet\s+)?served\b/g, " "));
  return sourceWeak && outputStrong && !/\b(?:summary|stills|draft|extract)\b/.test(n);
}

export function staleAgainstFile(generatedText: string, fileText: string | null): boolean {
  const g = normal(generatedText);
  if (/\bbuilding matter brief\b/.test(g)) return true;
  if (!fileText) return false;
  const f = normal(fileText);
  if (/\boutstanding phone\b/.test(g) && /\bex-mur-012\b/.test(f) && !/\boutstanding phone\b/.test(f.slice(0, 2500))) {
    return true;
  }
  if (/\band,\b/.test(generatedText) && /\bex-mur-012\b/.test(f)) return true;
  if (/\bfull 999 audio\b/.test(g) && /\bcad and 999 summaries original audio\/log\b/.test(f) && !/\bfull 999 audio\b/.test(f)) {
    return true;
  }
  return false;
}
