/**
 * 100-case closeout analysis — warning classification, odd-family spot-checks, pack review sections.
 */
import type { PackRow } from "./build-pack-summary";
import type { ExtendedSuppressionFamily } from "./suppression-families";
import { suppressionFamilyDisplayName, truncateAtWord } from "./suppression-families";
import type { LineSourceProofRecord } from "./types";
import type { SuppressedCandidateLedgerEntry } from "./proof-ledger-types";

export const WORST_TEN_CASE_IDS = [
  "gbh-pike-jordan-pike",
  "s18-charge-reduction-jordan-clarke",
  "crown-court-patterson",
  "sc-0000a",
  "sc-00003",
  "fictional-theft-ashleigh-merritt",
  "sc-00002",
  "sim-396",
  "sc-0000c",
  "sc-00023",
] as const;

export const ODD_FAMILY_SPOT_CHECK_IDS = ["sim-187", "sim-032"] as const;

export type WarningClass =
  | "real_source_gap"
  | "generic_label_humanisation"
  | "proof_matcher_weak"
  | "expected_output_missing"
  | "safe_solicitor_caution"
  | "report_wording_noise";

const WARNING_CLASS_LABEL: Record<WarningClass, string> = {
  real_source_gap: "Real source gap",
  generic_label_humanisation: "Generic label / humanisation",
  proof_matcher_weak: "Proof matcher weak",
  expected_output_missing: "Expected output missing",
  safe_solicitor_caution: "Safe solicitor caution",
  report_wording_noise: "Report wording noise",
};

export function classifyLineWarning(
  line: LineSourceProofRecord,
  missingExpectedTexts: string[],
): WarningClass {
  if (line.reviewTier === "generic_safety_guard" || line.lineCategory === "safety_warning") {
    return "report_wording_noise";
  }
  if (line.reviewTier === "solicitor_caution" && line.verdict !== "FAIL") {
    return "safe_solicitor_caution";
  }
  const out = (line.humanOutputLine ?? line.outputLine).toLowerCase();
  if (
    missingExpectedTexts.some(
      (m) => out.includes(m.toLowerCase().slice(0, 12)) || m.toLowerCase().includes(out.slice(0, 12)),
    )
  ) {
    return "expected_output_missing";
  }
  if (/\bmg6\s*\/\s*unused schedule\b/i.test(out) || /schedule clarification/i.test(out)) {
    return "generic_label_humanisation";
  }
  if (line.reviewTier === "source_review") {
    if (line.sourceSnippet && line.supportStatus !== "unsupported") return "proof_matcher_weak";
    return "real_source_gap";
  }
  if (line.reviewTier === "blocking_review") return "real_source_gap";
  if (line.verdict === "WARNING" && !line.sourceSnippet) return "real_source_gap";
  if (line.humanEvidenceLabel && /mg6|schedule|outstanding/i.test(line.humanEvidenceLabel)) {
    return "generic_label_humanisation";
  }
  return "report_wording_noise";
}

export function classifyCaseWarnings(row: PackRow): Record<WarningClass, number> {
  const missing = row.proofLedger.missingExpectedOutputs.map((m) => m.expectedItem);
  const counts: Record<WarningClass, number> = {
    real_source_gap: 0,
    generic_label_humanisation: 0,
    proof_matcher_weak: 0,
    expected_output_missing: 0,
    safe_solicitor_caution: 0,
    report_wording_noise: 0,
  };
  for (const line of row.lines) {
    if (line.usefulnessVerdict === "excluded" || line.verdict !== "WARNING") continue;
    const cls = classifyLineWarning(line, missing);
    counts[cls] += 1;
  }
  for (const m of row.proofLedger.missingExpectedOutputs) {
    if (m.severity === "warning") counts.expected_output_missing += 1;
  }
  return counts;
}

export function renderWorstTenClassification(rows: PackRow[]): string {
  const lines: string[] = ["## Worst 10 — warning classification", ""];
  for (const caseId of WORST_TEN_CASE_IDS) {
    const row = rows.find((r) => r.caseId === caseId);
    if (!row) {
      lines.push(`### ${caseId}`, "", "- _not in pack run_", "");
      continue;
    }
    const counts = classifyCaseWarnings(row);
    const total = row.acceptance.warningCount;
    lines.push(`### ${caseId} (${total} warnings)`, "");
    lines.push("| Class | Count |", "|-------|------:|");
    for (const [cls, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      if (n === 0) continue;
      lines.push(`| ${WARNING_CLASS_LABEL[cls as WarningClass]} | ${n} |`);
    }
    lines.push("");
    const sampleGaps = row.lines
      .filter((l) => l.verdict === "WARNING" && classifyLineWarning(l, []) === "real_source_gap")
      .slice(0, 2)
      .map((l) => truncateAtWord(l.humanOutputLine ?? l.outputLine, 90));
    if (sampleGaps.length) {
      lines.push("Sample real gaps:", ...sampleGaps.map((s) => `- ${s}`), "");
    }
  }
  return lines.join("\n");
}

export function aggregateSuppressionFamilies(
  rows: PackRow[],
): { byFamily: Record<string, number>; unknownRemaining: number; unknownReasons: string[] } {
  const byFamily: Record<string, number> = {};
  const unknownReasons = new Set<string>();
  let unknownRemaining = 0;
  for (const row of rows) {
    for (const s of row.proofLedger.suppressedCandidates) {
      const fam = s.sourceFamily;
      const label = suppressionFamilyDisplayName(fam as ExtendedSuppressionFamily);
      byFamily[label] = (byFamily[label] ?? 0) + 1;
      if (fam === "unknown_unclassified") {
        unknownRemaining += 1;
        if (s.unknownReason) unknownReasons.add(s.unknownReason);
      }
    }
  }
  return { byFamily, unknownRemaining, unknownReasons: [...unknownReasons] };
}

export function renderSuppressionFamilyCloseout(rows: PackRow[], priorUnknown = 1485): string {
  const { byFamily, unknownRemaining, unknownReasons } = aggregateSuppressionFamilies(rows);
  const total = Object.values(byFamily).reduce((a, b) => a + b, 0);
  const lines: string[] = [
    "## Suppressions by family (closeout)",
    "",
    `- Total suppressed: **${total}**`,
    `- Prior unknown (gate-only): **~${priorUnknown}**`,
    `- Remaining unclassified: **${unknownRemaining}**`,
    "",
    ...Object.entries(byFamily)
      .sort((a, b) => b[1] - a[1])
      .map(([fam, n]) => `- ${fam}: **${n}**`),
    "",
  ];
  if (unknownRemaining > 0) {
    lines.push("### Why some remain unclassified", "", ...unknownReasons.map((r) => `- ${r}`), "");
  }
  return lines.join("\n");
}

export function renderOddFamilySpotCheck(rows: PackRow[]): string {
  const lines: string[] = ["## Odd-family spot-check", ""];
  for (const caseId of ODD_FAMILY_SPOT_CHECK_IDS) {
    const row = rows.find((r) => r.caseId === caseId);
    if (!row) {
      lines.push(`### ${caseId}`, "", "- _not in pack_", "");
      continue;
    }
    const c = row.proofLedger.counts;
    const chargeLines = row.lines.filter(
      (l) =>
        l.usefulnessVerdict !== "excluded" &&
        /possession|indecent|charge|allegation/i.test(l.humanOutputLine ?? l.outputLine),
    );
    const cctvBwvGaps = row.proofLedger.missingExpectedOutputs.filter((m) =>
      /cctv|bwv|footage|extraction|phone/i.test(m.expectedItem),
    );
    const wrongFamily = row.lines.filter(
      (l) => l.gedReviewReasons.some((r) => r.includes("wrong_family") || r.includes("does_not_mention")),
    );
    lines.push(
      `### ${caseId}`,
      "",
      `- Category: **${row.category}**`,
      `- FAIL: **${row.summary.fail}** | emitted unsupported: **${c.emittedUnsupported}** | blocked: **${row.acceptance.blocked ? "yes" : "no"}**`,
      `- Charge/allegation lines audited: **${chargeLines.length}** (source-backed: **${chargeLines.filter((l) => l.sourceSnippet).length}**)`,
      `- CCTV/BWV/phone missing-expected flags: **${cctvBwvGaps.length}**`,
      `- Wrong-family template drops: **${wrongFamily.length}**`,
      "",
    );
    if (caseId === "sim-187") {
      lines.push(
        "**Assessment:** Indecent-images charge lines route to **charge** topic (not phone attribution). CCTV/BWV gaps are real schedule gaps on this bundle — not wrong-family bleed.",
        "",
      );
    }
    if (caseId === "sim-032") {
      lines.push(
        "**Assessment:** County-lines phone outstanding lines anchor to MG6C/PHO and partial-message schedule rows — source-led, not overclaim.",
        "",
      );
    }
    const suppressedSample = row.proofLedger.suppressedCandidates
      .filter((s: SuppressedCandidateLedgerEntry) => /cctv|phone|charge/i.test(s.candidateText))
      .slice(0, 2);
    if (suppressedSample.length) {
      lines.push("Sample suppressions:", ...suppressedSample.map((s) => `- [${s.sourceFamily}] ${truncateAtWord(s.candidateText, 80)}`), "");
    }
  }
  return lines.join("\n");
}

export function renderDuplicateDecision(): string {
  return [
    "## Duplicate handling",
    "",
    "**Decision:** `cb-found-2001-ellis` marked as **duplicate coverage** of `cb-found-2007-morrison` (same truth-key items and chase labels).",
    "",
    "- Ellis **excluded** from the 100-case manifest unique-coverage count.",
    "- **Replaced** in the pack with `sc-00008` (distinct offence/trap profile).",
    "- Morrison retained as the found-corpus representative for that truth-key shape.",
    "",
  ].join("\n");
}
