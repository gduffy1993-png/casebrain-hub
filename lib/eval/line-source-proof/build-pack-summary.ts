/**
 * Shared proof-ledger pack runner + summary for 30/100-case scales.
 */
import fs from "node:fs";
import path from "node:path";

import { runAcceptanceGates, type CaseAcceptanceReport } from "./acceptance-gates";
import { buildLineSourceProof, writeLineSourceProofArtifacts } from "./build-report";
import {
  renderFalseSuppressionReviewMarkdown,
  reviewFalseSuppressions,
  type FalseSuppressionReviewRow,
} from "./false-suppression-review";
import {
  renderDuplicateDecision,
  renderOddFamilySpotCheck,
  renderSuppressionFamilyCloseout,
  renderWorstTenClassification,
} from "./closeout-analysis";
import { fingerprintAuditCase, findDuplicates } from "../evidence-state-audit/diversity";
import { suppressionFamilyDisplayName, type ExtendedSuppressionFamily } from "./suppression-families";
import { DUPLICATE_COVERAGE_EXCLUDED } from "./hundred-case-manifest";
import type { LineSourceProofReport } from "./types";
import { buildSolicitorProofPacketModel } from "./render-solicitor-proof-packet";

export type PackCaseSpec = {
  id: string;
  shape: string;
  category: string;
  dir: string;
};

export type PackRow = LineSourceProofReport & {
  shape: string;
  category: string;
  acceptance: CaseAcceptanceReport;
  caseDir: string;
};

export type PackRunResult = {
  rows: PackRow[];
  stoppedEarly: boolean;
  falseSuppressionReview: FalseSuppressionReviewRow[];
};

const ROOT = process.cwd();
export const PROOF_OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "line-source-proof");

export function loadBundleText(caseDir: string): string {
  return fs.readFileSync(path.join(caseDir, "bundle-text.md"), "utf8");
}

export function runProofLedgerPack(
  manifest: PackCaseSpec[],
  options: { stopOnBlock?: boolean; writeArtifacts?: boolean } = {},
): PackRunResult {
  const { stopOnBlock = true, writeArtifacts = true } = options;
  const rows: PackRow[] = [];
  let stoppedEarly = false;
  const falseSuppressionReview: FalseSuppressionReviewRow[] = [];

  for (const spec of manifest) {
    const caseDir = path.join(ROOT, spec.dir);
    if (!fs.existsSync(path.join(caseDir, "bundle-text.md"))) {
      console.error(`SKIP missing bundle: ${spec.id}`);
      continue;
    }
    console.log(`\n=== ${spec.id} ===`);
    const bundleText = loadBundleText(caseDir);
    const report = buildLineSourceProof(caseDir);
    const acceptance = runAcceptanceGates(report, bundleText);
    if (writeArtifacts) {
      const { mdPath, packetPath } = writeLineSourceProofArtifacts(report);
      console.log(`  md: ${mdPath}`);
      console.log(`  packet: ${packetPath}`);
    }
    falseSuppressionReview.push(
      ...reviewFalseSuppressions(
        spec.id,
        report.proofLedger.suppressedCandidates.map((s) => ({
          candidateText: s.candidateText,
          sourceFamily: s.sourceFamily,
          matchedTerms: s.matchedTerms,
          reasonSuppressed: s.reasonSuppressed,
          proofStatus: s.proofStatus,
          surface: s.surface,
          searchedTerms: s.searchedTerms,
          supportingSourceFound: s.supportingSourceFound,
        })),
      ),
    );
    rows.push({ ...report, shape: spec.shape, category: spec.category, acceptance, caseDir });
    const c = report.proofLedger.counts;
    console.log(
      `  FAIL=${report.summary.fail}  emittedUnsupp=${c.emittedUnsupported}  suppressed=${c.suppressedCandidates}  falseSupp=${c.possibleFalseSuppressions}  blocked=${acceptance.blocked}`,
    );
    if (acceptance.blocked && stopOnBlock) {
      const fails = acceptance.gates.filter((g) => g.severity === "blocking" && !g.passed);
      console.error(`  BLOCKED: ${fails.map((f) => `${f.gate} (${f.detail})`).join("; ")}`);
      stoppedEarly = true;
      break;
    }
  }

  return { rows, stoppedEarly, falseSuppressionReview };
}

export function aggregatePackTotals(rows: PackRow[]) {
  return rows.reduce(
    (acc, r) => {
      const c = r.proofLedger.counts;
      const meaningful = r.lines.filter((l) => l.usefulnessVerdict !== "excluded").length;
      acc.meaningfulLines += meaningful;
      acc.fail += r.summary.fail;
      acc.emittedUnsupported += c.emittedUnsupported;
      acc.suppressed += c.suppressedCandidates;
      acc.suppressedUnsupported += c.suppressedUnsupported ?? 0;
      acc.rewrites += c.rewritesDowngrades;
      acc.missing += c.missingExpectedOutputs;
      acc.falseSupp += c.possibleFalseSuppressions;
      acc.blocked += r.acceptance.blocked ? 1 : 0;
      acc.warnings += r.summary.warning;
      return acc;
    },
    {
      meaningfulLines: 0,
      fail: 0,
      emittedUnsupported: 0,
      suppressed: 0,
      suppressedUnsupported: 0,
      rewrites: 0,
      missing: 0,
      falseSupp: 0,
      blocked: 0,
      warnings: 0,
    },
  );
}

export function renderSummaryTable(rows: PackRow[]): string {
  const header = `| Case | Category | FAIL | Emitted unsupp | Suppressed | Rewrites | Missing | False supp | Warnings | Blocked |
|------|----------|-----:|---------------:|-----------:|---------:|--------:|-----------:|---------:|:-------:|`;
  const lines = rows.map((r) => {
    const c = r.proofLedger.counts;
    const blocked = r.acceptance.blocked ? "yes" : "no";
    return `| ${r.caseId} | ${r.category.slice(0, 22)} | ${r.summary.fail} | ${c.emittedUnsupported} | ${c.suppressedCandidates} | ${c.rewritesDowngrades} | ${c.missingExpectedOutputs} | ${c.possibleFalseSuppressions} | ${r.summary.warning} | ${blocked} |`;
  });
  return [header, ...lines].join("\n");
}

export function renderCoverageByCategory(rows: PackRow[]): string {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.category] = (counts[r.category] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- ${k}: **${v}**`)
    .join("\n");
}

export function renderSolicitorProofIndex(rows: PackRow[], title = "Solicitor proof packet index"): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    "Controlled/anonymised proof only. This index links to solicitor-readable packets; full audit ledgers remain inside each case folder.",
    "",
    "## Headline",
    "",
    `- Cases: **${rows.length}**`,
    `- Emitted unsupported: **${rows.reduce((n, r) => n + r.proofLedger.counts.emittedUnsupported, 0)}**`,
    `- Emitted FAIL: **${rows.reduce((n, r) => n + r.summary.fail, 0)}**`,
    `- Blocked cases: **${rows.filter((r) => r.acceptance.blocked).length}**`,
    "",
    "## Packets",
    "",
    "| Case | Shape | Verdict | Proof mode | Top useful finding | Top refused overstatement | Top missing item | Packet |",
    "|------|-------|---------|------------|--------------------|---------------------------|------------------|--------|",
  ];

  for (const row of rows) {
    const model = buildSolicitorProofPacketModel(row);
    const useful = model.gotRight[0]?.text ?? "No top finding selected";
    const refused = model.refused[0]?.text ?? "No overstatement selected";
    const missing = model.missing[0]?.text ?? "No source-led missing item selected";
    const link = `./${row.caseId}/SOLICITOR-PROOF-PACKET.md`;
    lines.push(
      `| ${row.caseId} | ${model.caseShape.replace(/\|/g, "/")} | ${model.verdict} | ${model.proofMode} | ${useful.replace(/\|/g, "/")} | ${refused.replace(/\|/g, "/")} | ${missing.replace(/\|/g, "/")} | [open](${link}) |`,
    );
  }

  lines.push(
    "",
    "## How to read this",
    "",
    "- **PASS** means no emitted unsupported line was found in the proof run.",
    "- **PASS WITH WARNINGS** means the visible output stayed safe, but source gaps or solicitor-review items remain.",
    "- **Text-only controlled bundle** means the proof is against controlled extracted bundle text, not an original PDF.",
    "- **PDF-backed** means PDF page text was available and checked for supporting lines.",
    "",
  );

  return lines.join("\n");
}

export function buildReviewPacket(rows: PackRow[], manifest: PackCaseSpec[], worstN = 5): string {
  const worst = [...rows].sort((a, b) => b.acceptance.warningCount - a.acceptance.warningCount).slice(0, worstN);
  const falseSupp = rows.flatMap((r) =>
    r.proofLedger.suppressedCandidates
      .filter((s) => s.proofStatus === "needs_review_possible_false_suppression")
      .map((s) => ({ caseId: r.caseId, ...s })),
  );
  const missing = rows.flatMap((r) =>
    r.proofLedger.missingExpectedOutputs.map((m) => ({ caseId: r.caseId, ...m })),
  );
  const sourceUnavailable = rows.flatMap((r) =>
    r.lines
      .filter((l) => l.usefulnessVerdict !== "excluded" && l.supportStatus === "source_unavailable")
      .filter((l) => l.lineCategory === "chase_request" || l.lineCategory === "evidence_state")
      .slice(0, 2)
      .map((l) => ({
        caseId: r.caseId,
        surface: l.outputSurface,
        line: (l.humanOutputLine ?? l.outputLine).slice(0, 120),
      })),
  );
  const suppressByFamily: Record<string, number> = {};
  for (const r of rows) {
    for (const s of r.proofLedger.suppressedCandidates) {
      const label = suppressionFamilyDisplayName(s.sourceFamily as ExtendedSuppressionFamily);
      suppressByFamily[label] = (suppressByFamily[label] ?? 0) + 1;
    }
  }
  const warningClusters: Record<string, number> = {};
  for (const r of rows) {
    for (const l of r.lines) {
      if (l.usefulnessVerdict === "excluded") continue;
      if (l.verdict !== "WARNING") continue;
      const key = l.reviewTier;
      warningClusters[key] = (warningClusters[key] ?? 0) + 1;
    }
  }
  const fingerprints = rows
    .map((r) => {
      const spec = manifest.find((c) => c.id === r.caseId);
      return spec ? fingerprintAuditCase(path.join(ROOT, spec.dir), r.caseId) : null;
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof fingerprintAuditCase>>[];
  const dupes = findDuplicates(fingerprints);

  return [
    `## Worst ${worstN} cases by warning count`,
    "",
    ...worst.map(
      (r, i) =>
        `${i + 1}. **${r.caseId}** — warnings=${r.acceptance.warningCount}, falseSupp=${r.proofLedger.counts.possibleFalseSuppressions}, missing=${r.proofLedger.counts.missingExpectedOutputs}`,
    ),
    "",
    "## Top warning clusters (review tier)",
    "",
    ...Object.entries(warningClusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k, n]) => `- ${k}: **${n}**`),
    "",
    "## Remaining possible false suppressions (needs_review)",
    "",
    ...(falseSupp.length
      ? falseSupp.map(
          (s, i) =>
            `${i + 1}. **${s.caseId}** — ${s.sourceFamily}: ${s.candidateText.slice(0, 100)}…\n   - ${s.plainEnglishNote}`,
        )
      : ["- none"]),
    "",
    "## Missing expected (sample)",
    "",
    ...(missing.length
      ? missing.slice(0, 40).map((m, i) => `${i + 1}. **${m.caseId}** [${m.severity}] ${m.expectedItem.slice(0, 90)}`)
      : ["- none"]),
    "",
    "## Source-unavailable important lines (sample)",
    "",
    ...(sourceUnavailable.length
      ? sourceUnavailable.slice(0, 30).map((l, i) => `${i + 1}. **${l.caseId}** ${l.surface}: ${l.line}`)
      : ["- none"]),
    "",
    "## Suppressions by family",
    "",
    ...Object.entries(suppressByFamily)
      .sort((a, b) => b[1] - a[1])
      .map(([fam, n]) => `- ${fam}: **${n}**`),
    "",
    "## Duplicate / near-duplicate warnings",
    "",
    ...(dupes.length
      ? dupes.map((d) => `- **${d.severity}** ${d.caseA} ↔ ${d.caseB}: ${d.reason}`)
      : ["- none flagged"]),
    "",
  ].join("\n");
}

export function writePackSummary(options: {
  title: string;
  targetCount: number;
  manifest: PackCaseSpec[];
  result: PackRunResult;
  outBasename: string;
  extraSections?: string[];
  closeout?: boolean;
}): { totals: ReturnType<typeof aggregatePackTotals>; passed: boolean } {
  const { title, targetCount, manifest, result, outBasename, extraSections = [], closeout = false } = options;
  const { rows, stoppedEarly, falseSuppressionReview } = result;
  const totals = aggregatePackTotals(rows);
  const caseIds = rows.map((r) => r.caseId);
  const duplicateExcluded = DUPLICATE_COVERAGE_EXCLUDED;
  const uniqueCoverageCount = rows.filter((r) => !duplicateExcluded.has(r.caseId)).length;

  const closeoutSections = closeout
    ? [
        renderDuplicateDecision(),
        renderWorstTenClassification(rows),
        renderSuppressionFamilyCloseout(rows),
        renderOddFamilySpotCheck(rows),
        "",
        "## Proof mode",
        "",
        "- **100 text-only controlled cases** (unique coverage count excludes duplicate Ellis)",
        "- PDF-backed reference: `cb-fresh-002-jordan-hale-pdf-proof` (run separately)",
        "",
      ]
    : [];

  const summaryMd = [
    `# ${title}`,
    "",
    stoppedEarly ? `> **STOPPED EARLY** after ${rows.length} cases due to blocking gate failure.` : "",
    "",
    "## Case IDs",
    "",
    caseIds.map((id) => `- ${id}`).join("\n"),
    "",
    "## Coverage by category",
    "",
    renderCoverageByCategory(rows),
    "",
    "## Summary table",
    "",
    renderSummaryTable(rows),
    "",
    "## Pack totals",
    "",
    `- Cases run: **${rows.length}** / ${targetCount}`,
    ...(closeout ? [`- Unique coverage cases: **${uniqueCoverageCount}** (Ellis duplicate excluded from count)`] : []),
    `- Meaningful emitted lines: **${totals.meaningfulLines}**`,
    `- Total warnings: **${totals.warnings}**`,
    `- Emitted FAIL: **${totals.fail}**`,
    `- Emitted unsupported: **${totals.emittedUnsupported}**`,
    `- Suppressed candidates: **${totals.suppressed}**`,
    `- Suppressed unsupported: **${totals.suppressedUnsupported}**`,
    `- Rewrites/downgrades: **${totals.rewrites}**`,
    `- Missing expected: **${totals.missing}**`,
    `- Possible false suppressions (needs_review): **${totals.falseSupp}**`,
    `- BLOCKED cases: **${totals.blocked}**`,
    "",
    renderFalseSuppressionReviewMarkdown(falseSuppressionReview),
    "",
    buildReviewPacket(rows, manifest, targetCount >= 100 ? 10 : 5),
    "",
    ...closeoutSections,
    ...extraSections,
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(PROOF_OUT_DIR, `${outBasename}.md`), summaryMd);
  fs.writeFileSync(
    path.join(PROOF_OUT_DIR, `${outBasename}.json`),
    JSON.stringify(
      {
        caseIds,
        stoppedEarly,
        totals,
        falseSuppressionReview,
        cases: rows.map((r) => ({
          caseId: r.caseId,
          category: r.category,
          shape: r.shape,
          acceptance: r.acceptance,
          proofLedgerCounts: r.proofLedger.counts,
          summary: r.summary,
        })),
      },
      null,
      2,
    ),
  );

  if (targetCount >= 100) {
    fs.writeFileSync(
      path.join(PROOF_OUT_DIR, "SOLICITOR-PROOF-INDEX.md"),
      renderSolicitorProofIndex(rows, "Hundred-case solicitor proof packet index"),
    );
    fs.writeFileSync(
      path.join(PROOF_OUT_DIR, "SOLICITOR-PROOF-INDEX.json"),
      JSON.stringify(
        rows.map((row) => ({
          caseId: row.caseId,
          category: row.category,
          shape: row.shape,
          packet: `${row.caseId}/SOLICITOR-PROOF-PACKET.md`,
          model: buildSolicitorProofPacketModel(row),
          acceptance: row.acceptance,
        })),
        null,
        2,
      ),
    );
  }

  const passed = !stoppedEarly && totals.fail === 0 && totals.emittedUnsupported === 0 && totals.blocked === 0;
  return { totals, passed };
}
