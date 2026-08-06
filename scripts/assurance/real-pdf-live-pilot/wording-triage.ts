/**
 * Real-PDF Live Pilot v1 — wording triage on solicitor-visible strings.
 *
 * Scope: pilot-output triage only, over whatever solicitor-visible strings this
 * pilot's 20 cases actually produced. This is NOT a review of the historical ~1.7M
 * occurrence corpus referenced elsewhere in the programme, and must never be reported
 * as one. Denominators below are always explicit about what was scanned.
 */
import { isMidWordSolicitorTruncation } from "@/lib/criminal/charge-allegation-completeness";
import type { SolicitorVisibleStringRow } from "./pdf-materialise";

export type WordingIssueKind =
  | "absolute_proof_claim"
  | "snake_case_enum_leak"
  | "internal_id_leak"
  | "broken_do_not_or_regarding"
  | "acronym_casing"
  | "truncation";

export type WordingIssue = {
  kind: WordingIssueKind;
  caseId: string;
  surface: string;
  exactString: string;
  normalisedTemplate: string;
};

const ABSOLUTE_PROOF_PATTERNS: RegExp[] = [
  /\b(proves?|establishes?|confirms?)\s+(that\s+)?(the\s+)?(defendant|client)('s)?\s+(guilt|innocence)\b/i,
  /\b100%\s*(certain|guaranteed|proven)\b/i,
  /\bbeyond\s+(all|any)\s+doubt\b/i,
  /\babsolutely\s+(certain|guaranteed|proven)\b/i,
  /\bconclusively\s+(proves?|establishes?)\b/i,
  /\bdefinitely\s+(guilty|committed|innocent)\b/i,
];

const SNAKE_CASE_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+){1,}\b/g;
// Words that are legitimately snake_case-shaped but not internal enum leaks.
const SNAKE_CASE_ALLOWLIST = new Set<string>([]);

const INTERNAL_ID_PATTERNS: RegExp[] = [
  /\breal-pdf-live-pilot-v1-rp-\d{2}\b/i,
  /\blive[-_]integration([-_]case)?\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
];

const BROKEN_DO_NOT_RE = /\bDo not\b\s*(?:[.,;:]|$)/m;
const BROKEN_REGARDING_RE = /\bRegarding\b\s*(?:[.,;:]|$)/m;

const ACRONYM_TARGETS = ["bwv", "cctv", "mg5", "mg6"];
const ACRONYM_RE = new RegExp(`\\b(${ACRONYM_TARGETS.join("|")})\\b`, "gi");

function normaliseTemplate(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function pushIssue(
  out: WordingIssue[],
  kind: WordingIssueKind,
  caseId: string,
  surface: string,
  exactString: string,
): void {
  out.push({
    kind,
    caseId,
    surface,
    exactString,
    normalisedTemplate: `${kind}::${normaliseTemplate(exactString)}`,
  });
}

/**
 * Detect the specific defect patterns named in this programme. Deliberately narrow
 * (regex-anchored on known-bad shapes) rather than a broad NLP sweep, so every hit is
 * independently inspectable and false-positive risk stays low.
 */
export function detectWordingIssues(rows: SolicitorVisibleStringRow[]): WordingIssue[] {
  const issues: WordingIssue[] = [];

  for (const row of rows) {
    const { caseId, surface, text } = row;

    for (const re of ABSOLUTE_PROOF_PATTERNS) {
      const m = text.match(re);
      if (m) pushIssue(issues, "absolute_proof_claim", caseId, surface, m[0]);
    }

    for (const m of text.matchAll(SNAKE_CASE_RE)) {
      const token = m[0];
      if (!SNAKE_CASE_ALLOWLIST.has(token.toLowerCase())) {
        pushIssue(issues, "snake_case_enum_leak", caseId, surface, token);
      }
    }

    for (const re of INTERNAL_ID_PATTERNS) {
      const m = text.match(re);
      if (m) pushIssue(issues, "internal_id_leak", caseId, surface, m[0]);
    }

    const doNotMatch = text.match(BROKEN_DO_NOT_RE);
    if (doNotMatch) pushIssue(issues, "broken_do_not_or_regarding", caseId, surface, doNotMatch[0]);
    const regardingMatch = text.match(BROKEN_REGARDING_RE);
    if (regardingMatch)
      pushIssue(issues, "broken_do_not_or_regarding", caseId, surface, regardingMatch[0]);

    for (const m of text.matchAll(ACRONYM_RE)) {
      const token = m[0];
      if (token !== token.toUpperCase()) {
        pushIssue(issues, "acronym_casing", caseId, surface, token);
      }
    }

    if (isMidWordSolicitorTruncation(text)) {
      pushIssue(issues, "truncation", caseId, surface, text.slice(-40));
    }
  }

  return issues;
}

export type WordingDenominatorSummary = {
  schemaVersion: "real-pdf-live-pilot-wording-denominator-summary@1.0.0";
  scopeNote: string;
  totalStringsScanned: number;
  totalCasesScanned: number;
  totalSurfacesScanned: number;
  occurrences: number;
  exactStrings: number;
  normalisedTemplates: number;
  casesWithIssues: number;
  surfacesWithIssues: number;
  byKind: Record<WordingIssueKind, number>;
};

export function buildWordingDenominatorSummary(
  rows: SolicitorVisibleStringRow[],
  issues: WordingIssue[],
): WordingDenominatorSummary {
  const byKind: Record<WordingIssueKind, number> = {
    absolute_proof_claim: 0,
    snake_case_enum_leak: 0,
    internal_id_leak: 0,
    broken_do_not_or_regarding: 0,
    acronym_casing: 0,
    truncation: 0,
  };
  for (const issue of issues) byKind[issue.kind] += 1;

  return {
    schemaVersion: "real-pdf-live-pilot-wording-denominator-summary@1.0.0",
    scopeNote:
      "Pilot-output triage only, over the solicitor-visible strings produced by this 20-case pilot run. " +
      "This is NOT a review of the ~1.7M historical occurrence corpus and must not be cited as one.",
    totalStringsScanned: rows.length,
    totalCasesScanned: new Set(rows.map((r) => r.caseId)).size,
    totalSurfacesScanned: new Set(rows.map((r) => r.surface)).size,
    occurrences: issues.length,
    exactStrings: new Set(issues.map((i) => i.exactString)).size,
    normalisedTemplates: new Set(issues.map((i) => i.normalisedTemplate)).size,
    casesWithIssues: new Set(issues.map((i) => i.caseId)).size,
    surfacesWithIssues: new Set(issues.map((i) => i.surface)).size,
    byKind,
  };
}

export type WordingIssueDisposition =
  | "genuine_product_defect"
  | "source_wording"
  | "duplicate"
  | "detector_false_positive";

export type DispositionedWordingIssue = WordingIssue & {
  disposition: WordingIssueDisposition;
  dispositionReason: string;
};

/**
 * Classify every detected wording hit into exactly one disposition:
 *  - genuine_product_defect: a real product-layer wording defect, first occurrence of
 *    its (kind, normalisedTemplate) group.
 *  - duplicate: same (kind, normalisedTemplate) as an already-classified occurrence —
 *    the underlying root cause is counted once, not once per occurrence/case.
 *  - detector_false_positive: the detector's own pattern is too broad for this exact
 *    hit (kept narrow and explicit — see SNAKE_CASE_ALLOWLIST below).
 *  - source_wording: the flagged text is a verbatim quotation of the frozen source
 *    document content (never rewritten) rather than product-composed prose.
 *
 * The zero-confirmed-defect gate for truncation/snake_case_enum_leak/acronym_casing
 * counts ONLY genuine_product_defect dispositions — duplicates of an already-counted
 * defect and non-defect dispositions are reported but never re-counted against the gate.
 */
export function classifyWordingIssueDispositions(
  issues: WordingIssue[],
): DispositionedWordingIssue[] {
  const seenGroups = new Set<string>();
  return issues.map((issue) => {
    const groupKey = `${issue.kind}::${issue.normalisedTemplate}`;
    if (seenGroups.has(groupKey)) {
      return {
        ...issue,
        disposition: "duplicate" as const,
        dispositionReason:
          "Same normalised template already classified for this kind — root cause counted once, not per occurrence.",
      };
    }
    seenGroups.add(groupKey);

    // Provenance/document-title surfaces may legitimately echo verbatim source text
    // (e.g. a scanned document title) that this pilot must never rewrite.
    const isVerbatimProvenanceSurface = /^(?:pdf:provenance_line|copy:court_line)$/.test(issue.surface);

    if (issue.kind === "snake_case_enum_leak" && SNAKE_CASE_ALLOWLIST.has(issue.exactString.toLowerCase())) {
      return {
        ...issue,
        disposition: "detector_false_positive" as const,
        dispositionReason: "Token is on the reviewed allowlist of legitimate snake_case-shaped identifiers.",
      };
    }

    if (isVerbatimProvenanceSurface && issue.kind === "acronym_casing") {
      return {
        ...issue,
        disposition: "source_wording" as const,
        dispositionReason:
          "Casing anomaly appears inside a verbatim source-document provenance quotation, not product-composed prose.",
      };
    }

    return {
      ...issue,
      disposition: "genuine_product_defect" as const,
      dispositionReason: "First occurrence of this (kind, normalisedTemplate) group on a product-composed surface.",
    };
  });
}

export type WordingTriageDispositionSummary = {
  schemaVersion: "real-pdf-live-pilot-wording-triage-disposition@1.0.0";
  generatedAt: string;
  scopeNote: string;
  totalOccurrences: number;
  countsByKindAndDisposition: Record<WordingIssueKind, Record<WordingIssueDisposition, number>>;
  genuineProductDefectGate: {
    gatedKinds: WordingIssueKind[];
    genuineProductDefectCounts: Record<string, number>;
    genuineProductDefectTotal: number;
    gatePasses: boolean;
  };
  issues: DispositionedWordingIssue[];
};

const GATED_KINDS: WordingIssueKind[] = ["truncation", "snake_case_enum_leak", "acronym_casing"];
const ALL_DISPOSITIONS: WordingIssueDisposition[] = [
  "genuine_product_defect",
  "source_wording",
  "duplicate",
  "detector_false_positive",
];
const ALL_KINDS: WordingIssueKind[] = [
  "absolute_proof_claim",
  "snake_case_enum_leak",
  "internal_id_leak",
  "broken_do_not_or_regarding",
  "acronym_casing",
  "truncation",
];

export function buildWordingTriageDispositionSummary(
  issues: WordingIssue[],
): WordingTriageDispositionSummary {
  const dispositioned = classifyWordingIssueDispositions(issues);

  const countsByKindAndDisposition = Object.fromEntries(
    ALL_KINDS.map((kind) => [
      kind,
      Object.fromEntries(ALL_DISPOSITIONS.map((d) => [d, 0])) as Record<WordingIssueDisposition, number>,
    ]),
  ) as Record<WordingIssueKind, Record<WordingIssueDisposition, number>>;

  for (const d of dispositioned) {
    countsByKindAndDisposition[d.kind][d.disposition] += 1;
  }

  const genuineProductDefectCounts: Record<string, number> = {};
  for (const kind of GATED_KINDS) {
    genuineProductDefectCounts[kind] = countsByKindAndDisposition[kind].genuine_product_defect;
  }
  const genuineProductDefectTotal = Object.values(genuineProductDefectCounts).reduce((a, b) => a + b, 0);

  return {
    schemaVersion: "real-pdf-live-pilot-wording-triage-disposition@1.0.0",
    generatedAt: new Date().toISOString(),
    scopeNote:
      "Pilot-output triage only, over the solicitor-visible strings produced by this 20-case pilot run. " +
      "Dispositions classify each detected hit; the zero-confirmed-defect gate counts genuine_product_defect " +
      "only for truncation, snake_case_enum_leak and acronym_casing.",
    totalOccurrences: issues.length,
    countsByKindAndDisposition,
    genuineProductDefectGate: {
      gatedKinds: GATED_KINDS,
      genuineProductDefectCounts,
      genuineProductDefectTotal,
      gatePasses: genuineProductDefectTotal === 0,
    },
    issues: dispositioned,
  };
}

export type WordingRootCauseEntry = {
  kind: WordingIssueKind;
  normalisedTemplate: string;
  occurrenceCount: number;
  caseIds: string[];
  exampleExactStrings: string[];
  suspectedRootCause: string;
  remediationOwnership: string;
  status: "unresolved";
};

const ROOT_CAUSE_HINTS: Record<WordingIssueKind, string> = {
  absolute_proof_claim:
    "Composed-prose/finding wording asserts certainty of guilt/innocence beyond what evidence state supports.",
  snake_case_enum_leak:
    "An internal enum/state token was interpolated into solicitor-visible text without going through solicitorReadableLabel() or an equivalent humaniser.",
  internal_id_leak:
    "An internal case/document identifier leaked into solicitor-visible text instead of a human-facing label.",
  broken_do_not_or_regarding:
    "A sentence template was truncated or a variable substitution failed, leaving a dangling 'Do not' / 'Regarding' fragment.",
  acronym_casing:
    "A known legal acronym (BWV/CCTV/MG5/MG6) was rendered in non-standard casing, likely from unnormalised source text or a lowercase template literal.",
  truncation:
    "Text was cut at a fixed character/line limit without checking for a mid-word boundary (see isMidWordSolicitorTruncation).",
};

export function buildWordingRootCauseRegister(issues: WordingIssue[]): WordingRootCauseEntry[] {
  const groups = new Map<string, WordingIssue[]>();
  for (const issue of issues) {
    const key = `${issue.kind}::${issue.normalisedTemplate}`;
    const arr = groups.get(key) ?? [];
    arr.push(issue);
    groups.set(key, arr);
  }
  return Array.from(groups.values())
    .map((group) => {
      const first = group[0]!;
      return {
        kind: first.kind,
        normalisedTemplate: first.normalisedTemplate,
        occurrenceCount: group.length,
        caseIds: Array.from(new Set(group.map((g) => g.caseId))).sort(),
        exampleExactStrings: Array.from(new Set(group.map((g) => g.exactString))).slice(0, 3),
        suspectedRootCause: ROOT_CAUSE_HINTS[first.kind],
        remediationOwnership: "CaseBrain product engineering (surface/copy layer owners)",
        status: "unresolved" as const,
      };
    })
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}
