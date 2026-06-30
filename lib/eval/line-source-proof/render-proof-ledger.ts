import type { ProofLedger } from "./proof-ledger-types";
import { tierLabel } from "./review-tier";
import type { LineSourceProofReport } from "./types";
import { truncateAtWord } from "./suppression-families";

function verdictLabel(v: ProofLedger["solicitorSummary"]["verdict"]): string {
  if (v === "pass") return "PASS";
  if (v === "pass_with_warnings") return "PASS WITH WARNINGS";
  return "BLOCKED";
}

export function renderProofLedgerSummary(report: LineSourceProofReport): string[] {
  const ledger = report.proofLedger;
  const s = ledger.solicitorSummary;
  const c = ledger.counts;
  const meaningfulWarnings = report.summary.warning;
  const emittedUnsupp = c.emittedUnsupported;

  const warningSections: string[] = ["### Remaining warnings (grouped)", ""];
  const grouped = Object.entries(s.groupedWarnings).filter(([, items]) => items.length > 0);
  if (grouped.length) {
    for (const [bucket, items] of grouped) {
      warningSections.push(`**${bucket}**`, ...items.map((item) => `- ${item}`), "");
    }
  } else {
    warningSections.push("- None at warning tier on this case.", "");
  }

  return [
    "## Solicitor summary",
    "",
    `**Verdict:** ${verdictLabel(s.verdict)}`,
    "",
    `**Case shape:** ${s.caseShape}`,
    "",
    `**Proof mode:** ${s.proofMode === "pdf_backed" ? "PDF-backed (page + extracted text)" : "Text-only controlled bundle"}`,
    "",
    `**Case:** ${s.whatCaseIsAbout}`,
    "",
    "### What CaseBrain got right",
    "",
    ...(s.whatCaseBrainGotRight.map((x) => `- ${x}`)),
    "",
    "### What CaseBrain refused to say",
    "",
    ...(s.whatCaseBrainRefusedToSay.map((x) => `- ${x}`)),
    "",
    "### What CaseBrain softened",
    "",
    ...(s.whatWasRewrittenSafely.map((x) => `- ${x}`)),
    "",
    "### What may still be missing (source-led)",
    "",
    ...(s.whatMayBeMissing.length ? s.whatMayBeMissing.map((x) => `- ${x}`) : ["- No source-led gaps flagged on current papers."]),
    "",
    "### Main evidence gaps",
    "",
    ...(s.mainEvidenceGaps.length ? s.mainEvidenceGaps.map((g) => `- ${g}`) : ["- None flagged from truth key / bundle"]),
    "",
    "### What solicitor must review",
    "",
    ...(s.whatStillNeedsSolicitorReview.map((x) => `- ${x}`)),
    "",
    "### Key source anchors",
    "",
    ...(s.keySourceAnchors.map((x) => `- ${x}`)),
    "",
    ...warningSections,
    "### Proof ledger counts",
    "",
    `- Meaningful emitted lines: **${c.emittedLines}**`,
    `- Warnings on case: **${meaningfulWarnings}**`,
    `- Suppressed before display: **${c.suppressedCandidates}**`,
    `- Softened rewrites: **${c.rewritesDowngrades}**`,
    `- Missing expected (source-led): **${c.missingExpectedOutputs}**`,
    `- Clean source-backed: **${c.cleanSourceBacked}**`,
    `- Possible false suppressions: **${c.possibleFalseSuppressions}**`,
    `- PDF + text supported: **${c.pdfAndTextSupported}** | Text-only supported: **${c.textOnlySupported}**`,
    "",
    "### Unsupported output (clarified)",
    "",
    `- **Shown without source** (emitted unsupported): **${emittedUnsupp}**`,
    `- **Correctly suppressed before display**: **${c.suppressedUnsupported}**`,
    "",
    emittedUnsupp === 0 && c.suppressedUnsupported > 0
      ? "_When verdict is PASS, unsupported material is usually correctly suppressed before display — see suppressed ledger below._"
      : emittedUnsupp > 0
        ? "_Some lines were shown without bundle support — solicitor review required._"
        : "_No unsupported emitted output on this case._",
    "",
  ];
}

export function renderProofLedgerSections(ledger: ProofLedger): string[] {
  const lines: string[] = [
    "## Hot review queue",
    "",
    ...(ledger.hotReviewQueue.length
      ? ledger.hotReviewQueue.slice(0, 20).map(
          (q, i) =>
            `${i + 1}. **${tierLabel(q.tier)}** — ${q.surface}\n   - ${q.outputLine}\n   - ${q.reason}`,
        )
      : ["- none"]),
    "",
    "## 1. Emitted line ledger",
    "",
    ...(ledger.emittedLines.slice(0, 40).map((e, i) =>
      [
        `### ${i + 1}. ${e.category} — ${e.surface}`,
        "",
        `**Output:** ${truncateAtWord(e.outputLine, 200)}`,
        `**Verdict:** ${e.verdict} | **Tier:** ${tierLabel(e.reviewTier)} | **Proof chain:** ${e.proofChainStatus}`,
        e.evidenceState ? `**Evidence state:** ${e.evidenceState}` : "",
        e.sourceSnippet ? `**Source:** ${truncateAtWord(e.sourceSnippet, 120)}` : "**Source:** none",
        `**Why safe / limited:** ${e.plainEnglishExplanation}`,
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    )),
    ledger.emittedLines.length > 40
      ? `\n_…and ${ledger.emittedLines.length - 40} more emitted lines (see JSON)._`
      : "",
    "",
    "## 2. Suppressed candidate ledger",
    "",
    ...(ledger.suppressedCandidates.length
      ? ledger.suppressedCandidates.slice(0, 25).map((s, i) =>
          [
            `### ${i + 1}. ${s.sourceFamily} — ${s.surface}`,
            "",
            `**Candidate (not shown):** ${truncateAtWord(s.candidateText, 180)}`,
            `**Reason:** ${s.reasonSuppressed}`,
            `**Proof status:** ${s.proofStatus}`,
            `**Searched:** ${s.searchedTerms.join(", ") || "—"} | **Matched:** ${s.matchedTerms.join(", ") || "—"}`,
            `**Solicitor note:** ${s.plainEnglishNote}`,
            ...(s.unknownReason ? [`**Unclassified note:** ${s.unknownReason}`] : []),
            "",
          ].join("\n"),
        )
      : ["- none"]),
    "",
    "## 3. Rewrite / downgrade ledger",
    "",
    ...(ledger.rewritesDowngrades.length
      ? ledger.rewritesDowngrades.slice(0, 20).map((r, i) =>
          [
            `### ${i + 1}. ${r.changeType} — ${r.surface}`,
            "",
            `**Before:** ${truncateAtWord(r.originalCandidate, 150)}`,
            `**After:** ${truncateAtWord(r.finalOutput, 150)}`,
            `**Solicitor note:** ${r.solicitorFriendlyExplanation}`,
            "",
          ].join("\n"),
        )
      : ["- none"]),
    "",
    "## 4. Missing expected output ledger (source-led)",
    "",
    ...(ledger.missingExpectedOutputs.length
      ? ledger.missingExpectedOutputs.map(
          (m, i) =>
            `${i + 1}. **${m.severity.toUpperCase()}** — ${truncateAtWord(m.expectedItem, 100)}\n   - Basis: ${m.sourceBasis}\n   - ${m.plainEnglishNote}`,
        )
      : ["- none"]),
    "",
    "## 5. Source conflict ledger",
    "",
    ...(ledger.sourceConflicts.length
      ? ledger.sourceConflicts.map(
          (c, i) =>
            `${i + 1}. **${c.conflictType}**\n   - A: ${c.sourceA}\n   - B: ${c.sourceB}\n   - Safe resolution: ${c.safeResolution}\n   - Solicitor review: ${c.solicitorReviewRequired ? "yes" : "no"}`,
        )
      : ["- none"]),
    "",
    "## 6. Entity / person ledger",
    "",
    ...(ledger.entityRisks.length
      ? ledger.entityRisks.map(
          (e, i) =>
            `${i + 1}. **${e.riskType}** — ${e.entityLabel} (${e.role})\n   - ${e.plainEnglishNote}`,
        )
      : ["- none"]),
    "",
    "## 7. Surface safety ledger",
    "",
    ...(ledger.surfaceSafety.length
      ? ledger.surfaceSafety.map(
          (s, i) =>
            `${i + 1}. **${s.surface}** — ${s.issue}\n   - Line: ${truncateAtWord(s.outputLine, 120)}\n   - Safer: ${s.safeAlternative}`,
        )
      : ["- none"]),
    "",
    "## 8. PDF / text proof chain",
    "",
    ...(ledger.pdfTextProofChain.slice(0, 15).map((p, i) =>
      [
        `### ${i + 1}. ${p.surface}`,
        "",
        `**Output:** ${truncateAtWord(p.outputLine, 100)}`,
        `**PDF page:** ${p.pdfPageAvailable ? "yes" : "no"}${p.pageNumber ? ` (p.${p.pageNumber})` : ""}`,
        `**Status:** ${p.proofChainStatus}`,
        `**Note:** ${p.plainEnglishNote}`,
        "",
      ].join("\n"),
    )),
    ledger.pdfTextProofChain.length > 15
      ? `\n_…and ${ledger.pdfTextProofChain.length - 15} more proof-chain rows (see JSON)._`
      : "",
    "",
  ];
  return lines;
}
