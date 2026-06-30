/**
 * Ged/Codex review decisions for possible false-suppression WARNINGs.
 * Pattern-based — audit/proof layer only.
 */
import type { RecordedSuppression } from "./proof-ledger-session";

export type FalseSuppressionDecision =
  | "correctly_suppressed"
  | "should_emit_cautious"
  | "suppress_but_improve_wording"
  | "harness_false_positive";

export type FalseSuppressionReviewRow = {
  caseId: string;
  candidatePreview: string;
  sourceFamily: string;
  decision: FalseSuppressionDecision;
  rationale: string;
};

const TRAP_OVERCLAIM_RE =
  /^(cctv stills prove id|stills are full cctv|encro proves supply)$/i;

const CONDITIONAL_COMPOUND_RE =
  /\bremain conditional on\b.*\b(full phone|full cctv|search|continuity|forensic|id procedure)\b/i;

export function classifyFalseSuppressionPattern(
  s: Pick<RecordedSuppression, "candidateText" | "sourceFamily" | "matchedTerms" | "reasonSuppressed">,
): { decision: FalseSuppressionDecision; rationale: string } {
  const text = s.candidateText.trim();

  if (TRAP_OVERCLAIM_RE.test(text) || /\bencro proves\b/i.test(text) || /\bcctv stills prove\b/i.test(text)) {
    return {
      decision: "correctly_suppressed",
      rationale:
        "Known overclaim/trap — bundle may mention the family but does not support the asserted proof level (stills≠ID, stills≠full CCTV, Encro≠proved supply).",
    };
  }

  if (/trap|overclaim/i.test(s.reasonSuppressed)) {
    return {
      decision: "correctly_suppressed",
      rationale: "Presentation gate removed overclaim or unsafe trap — not a missing chase line.",
    };
  }

  if (CONDITIONAL_COMPOUND_RE.test(text)) {
    const absent = s.matchedTerms.filter((m) => m.endsWith(":absent") || m.endsWith(":negated"));
    if (absent.length > 0) {
      return {
        decision: "harness_false_positive",
        rationale: `Compound line names multiple families; gate correctly dropped because ${absent.map((m) => m.split(":")[0]).join(", ")} absent/negated on bundle — not a false suppression.`,
      };
    }
    return {
      decision: "suppress_but_improve_wording",
      rationale: "Conditional strategic line — verify whether cautious provisional wording should surface elsewhere.",
    };
  }

  if (s.matchedTerms.some((m) => m.endsWith(":absent") || m.endsWith(":negated"))) {
    return {
      decision: "correctly_suppressed",
      rationale: "At least one named material family is absent or negated on the bundle.",
    };
  }

  return {
    decision: "suppress_but_improve_wording",
    rationale: "Bundle mentions family but line was dropped — solicitor should confirm chase vs caution.",
  };
}

export function reviewFalseSuppressions(
  caseId: string,
  suppressions: RecordedSuppression[],
): FalseSuppressionReviewRow[] {
  return suppressions
    .filter((s) => s.proofStatus === "needs_review_possible_false_suppression")
    .map((s) => {
      const { decision, rationale } = classifyFalseSuppressionPattern(s);
      return {
        caseId,
        candidatePreview: s.candidateText.slice(0, 100) + (s.candidateText.length > 100 ? "…" : ""),
        sourceFamily: String(s.sourceFamily),
        decision,
        rationale,
      };
    });
}

export const PRIOR_30_CASE_FALSE_SUPPRESSION_DECISIONS: FalseSuppressionReviewRow[] = [
  {
    caseId: "sim-380",
    candidatePreview: "CCTV stills prove ID",
    sourceFamily: "cctv",
    decision: "correctly_suppressed",
    rationale: "Overclaim trap — stills served but must not be stated as ID proof.",
  },
  {
    caseId: "sim-380",
    candidatePreview: "stills are full CCTV",
    sourceFamily: "cctv",
    decision: "correctly_suppressed",
    rationale: "Known unsafe trap — stills are not master/full CCTV.",
  },
  {
    caseId: "sim-389",
    candidatePreview: "Encro proves supply",
    sourceFamily: "encro_handle",
    decision: "correctly_suppressed",
    rationale: "Overclaim — handle mapping not served; Encro extracts alone do not prove supply.",
  },
  {
    caseId: "pilot-3-kian-doyle",
    candidatePreview: "Possession… remain conditional on full phone, search, continuity and forensic material.",
    sourceFamily: "compound",
    decision: "harness_false_positive",
    rationale: "Compound line gated because forensic material absent on bundle — correct suppression, not missing chase.",
  },
  {
    caseId: "pilot-3-leon-marsh",
    candidatePreview: "Identification… conditional on full CCTV, ID procedure material…",
    sourceFamily: "compound",
    decision: "harness_false_positive",
    rationale: "Compound conditional strategic line — partial family absence triggers gate correctly.",
  },
  {
    caseId: "sim-300",
    candidatePreview: "Identification… conditional on full CCTV, ID procedure material…",
    sourceFamily: "compound",
    decision: "harness_false_positive",
    rationale: "Same compound-CCTV conditional pattern — harness false positive after classifier fix.",
  },
  {
    caseId: "sim-388",
    candidatePreview: "Possession… conditional on full phone, search, continuity and forensic material.",
    sourceFamily: "compound",
    decision: "harness_false_positive",
    rationale: "Compound phone/forensic conditional — forensic absent on bundle.",
  },
];

export function renderFalseSuppressionReviewMarkdown(rows: FalseSuppressionReviewRow[]): string {
  const lines = [
    "## False-suppression review (Ged/Codex)",
    "",
  ];
  if (rows.length) {
    lines.push(
      "| Case | Family | Decision | Candidate | Rationale |",
      "|------|--------|----------|-----------|-----------|",
    );
    for (const r of rows) {
      const esc = (t: string) => t.replace(/\|/g, "/").slice(0, 80);
      lines.push(
        `| ${r.caseId} | ${r.sourceFamily} | **${r.decision}** | ${esc(r.candidatePreview)} | ${esc(r.rationale)} |`,
      );
    }
    lines.push("");
  } else {
    lines.push("- none flagged after pattern reclassification", "");
  }
  lines.push("### Prior 30-case warnings (reclassified)", "");
  lines.push(
    "| Case | Family | Decision | Candidate | Rationale |",
    "|------|--------|----------|-----------|-----------|",
  );
  for (const r of PRIOR_30_CASE_FALSE_SUPPRESSION_DECISIONS) {
    const esc = (t: string) => t.replace(/\|/g, "/").slice(0, 80);
    lines.push(
      `| ${r.caseId} | ${r.sourceFamily} | **${r.decision}** | ${esc(r.candidatePreview)} | ${esc(r.rationale)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
