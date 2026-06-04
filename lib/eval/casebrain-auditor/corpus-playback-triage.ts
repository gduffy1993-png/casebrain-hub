import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import { redactPlaybackSnippet } from "./corpus-playback-redact";
import type { CorpusCasePlayback, PlaybackSummary } from "./corpus-playback-types";

type TriageClass =
  | "safe_product_fix"
  | "auditor_check_false_positive"
  | "bucket_c_lab_noise"
  | "needs_human_solicitor_review"
  | "needs_pdf_bundle_fidelity"
  | "low_priority_polish";

type TriageGroup = {
  fingerprint: string;
  classification: TriageClass;
  count: number;
  affectedA: number;
  affectedB: number;
  affectedC: number;
  examples: string[];
  whyRemains: string;
  releaseImpact: string;
  recommendedAction: string;
  autoFixSafe: boolean;
  likelyFiles: string[];
  ignoreForNow: boolean;
};

const GROUP_META: Record<string, Omit<TriageGroup, "fingerprint" | "count" | "affectedA" | "affectedB" | "affectedC" | "examples">> = {
  "routing.unknown_with_metadata": {
    classification: "needs_human_solicitor_review",
    whyRemains: "Offence phrase not in conservative family map (motoring, procedural, mixed, novel tags).",
    releaseImpact: "Low for A+B unless roster cases appear here.",
    recommendedAction: "Batch human mapping table (18-human-mapping-decisions.md); extend inferAuditorFamily only when phrase repeats.",
    autoFixSafe: false,
    likelyFiles: ["lib/eval/casebrain-auditor/real-case-collector.ts"],
    ignoreForNow: false,
  },
  "anchor.malformed": {
    classification: "needs_pdf_bundle_fidelity",
    whyRemains: "Cut-off MG/BWV/page-glue anchors from bundle text extraction.",
    releaseImpact: "Low — product filters most from visible surfaces.",
    recommendedAction: "Bundle fidelity lane; optional stricter sanitizer only.",
    autoFixSafe: true,
    likelyFiles: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
    ignoreForNow: true,
  },
  "routing.charge_vs_route_family": {
    classification: "safe_product_fix",
    whyRemains: "Primary route title family still disagrees with charge metadata on messy eval bundles.",
    releaseImpact: "Low for A+B; learning radar on C.",
    recommendedAction: "Shared route pick / offence inference (canary-verify).",
    autoFixSafe: true,
    likelyFiles: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-collector.ts"],
    ignoreForNow: false,
  },
  "routing.charge_vs_workflow_profile": {
    classification: "safe_product_fix",
    whyRemains: "Bundle/title signals outweighed charge row in workflow profile resolution.",
    releaseImpact: "Low for A+B.",
    recommendedAction: "Prefer charge family when allegation text is clear.",
    autoFixSafe: true,
    likelyFiles: ["lib/eval/casebrain-auditor/real-case-collector.ts"],
    ignoreForNow: false,
  },
  "chase.wrong_family_label": {
    classification: "auditor_check_false_positive",
    whyRemains: "Broad leakage regex on chase lines (e.g. phone on violence).",
    releaseImpact: "None.",
    recommendedAction: "Tighten chase wrong-family rules to clearly cross-family labels only.",
    autoFixSafe: true,
    likelyFiles: ["lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
    ignoreForNow: false,
  },
  "profile_leakage.pwits_fraud": {
    classification: "bucket_c_lab_noise",
    whyRemains: "Messy eval bundles mix families in collapsed text.",
    releaseImpact: "None on A+B.",
    recommendedAction: "Monitor; filter only if on solicitor-visible surfaces.",
    autoFixSafe: false,
    likelyFiles: ["lib/criminal/pilot-workflow.ts"],
    ignoreForNow: true,
  },
};

function classifyGroup(checkId: string, cases: CorpusCasePlayback[]): TriageGroup {
  const base = GROUP_META[checkId] ?? {
    classification: "bucket_c_lab_noise" as TriageClass,
    whyRemains: "Repeated eval-corpus pattern; not production roster.",
    releaseImpact: "None unless A+B affected.",
    recommendedAction: "Monitor in canary pack.",
    autoFixSafe: false,
    likelyFiles: ["lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
    ignoreForNow: true,
  };
  const meta = { ...base };
  const affectedA = cases.filter((p) => p.corpusBucket === "A").length;
  const affectedB = cases.filter((p) => p.corpusBucket === "B").length;
  const affectedC = cases.filter((p) => p.corpusBucket === "C").length;
  if (affectedA + affectedB > 0 && checkId.startsWith("routing.")) {
    meta.classification = "needs_human_solicitor_review";
    meta.ignoreForNow = false;
  }
  const examples = cases.slice(0, 3).map((p) => {
    const f = p.findings.find((x) => x.checkId === checkId);
    return `${redactPlaybackSnippet(p.caseTitle)} (${p.corpusBucket}): ${f?.message ?? "—"}`;
  });
  return {
    fingerprint: checkId,
    count: cases.length,
    affectedA,
    affectedB,
    affectedC,
    examples,
    ...meta,
  };
}

export function writeRemainingIssuesTriage(
  outDir: string,
  playbacks: CorpusCasePlayback[],
  summary: PlaybackSummary,
): void {
  const byCheck = new Map<string, CorpusCasePlayback[]>();
  for (const p of playbacks) {
    for (const f of p.findings) {
      const list = byCheck.get(f.checkId) ?? [];
      if (!list.some((x) => x.caseId === p.caseId)) list.push(p);
      byCheck.set(f.checkId, list);
    }
  }

  const groups = [...byCheck.entries()]
    .map(([id, cases]) => classifyGroup(id, cases))
    .sort((a, b) => b.count - a.count);

  const lines = [
    "# Remaining issues triage",
    "",
    `Baseline: ${summary.generatedAt}`,
    `Full corpus: **${summary.unsafeCount}** unsafe, **${summary.needsReviewCount}** needs review`,
    `Roster A+B: **${summary.rosterUnsafeCount}** unsafe, **${summary.rosterNeedsReviewCount}** needs review`,
    "",
    "## Classification key",
    "",
    "1. safe product fix | 2. auditor false positive | 3. bucket C lab noise | 4. human review | 5. PDF fidelity | 6. polish",
    "",
  ];

  for (const g of groups) {
    lines.push(`## \`${g.fingerprint}\` — ${g.classification}`, "");
    lines.push(`| Metric | Value |`, `|--------|------:|`, `| Count | ${g.count} |`, `| A | ${g.affectedA} |`, `| B | ${g.affectedB} |`, `| C | ${g.affectedC} |`, "");
    lines.push(`- **Why remains:** ${g.whyRemains}`);
    lines.push(`- **Release impact:** ${g.releaseImpact}`);
    lines.push(`- **Action:** ${g.recommendedAction}`);
    lines.push(`- **Auto-fix safe:** ${g.autoFixSafe}`);
    lines.push(`- **Ignore for now:** ${g.ignoreForNow}`);
    lines.push(`- **Files:** ${g.likelyFiles.join(", ")}`);
    lines.push("- **Examples:**");
    for (const ex of g.examples) lines.push(`  - ${ex}`);
    lines.push("");
  }

  fs.writeFileSync(path.join(outDir, "16-remaining-issues-triage.md"), lines.join("\n"), "utf8");
}

export function writeHumanMappingDecisions(
  outDir: string,
  playbacks: CorpusCasePlayback[],
): void {
  const phrases = new Map<string, { family: string | null; cases: CorpusCasePlayback[] }>();
  for (const p of playbacks) {
    if (!p.findings.some((f) => f.checkId === "routing.unknown_with_metadata")) continue;
    const key = redactPlaybackSnippet(p.inferenceText.slice(0, 80) || p.allegedOffence || "unknown");
    const entry = phrases.get(key) ?? { family: p.inferredChargeFamily, cases: [] };
    entry.cases.push(p);
    phrases.set(key, entry);
  }

  const sorted = [...phrases.entries()].sort((a, b) => b[1].cases.length - a[1].cases.length).slice(0, 25);

  const lines = [
    "# Human mapping decisions (batch unlock)",
    "",
    "_Do not auto-decide. Each row unlocks many `routing.unknown_with_metadata` cases if confirmed._",
    "",
    "| Offence phrase (redacted) | Guessed family | Count | Why unsure | Suggested family |",
    "|---------------------------|----------------|------:|------------|------------------|",
  ];

  for (const [phrase, { family, cases }] of sorted) {
    const roster = cases.filter((c) => isProductionScoredBucket(c.corpusBucket)).length;
    lines.push(
      `| ${phrase} | ${family ?? "null"} | ${cases.length} (roster ${roster}) | Not in conservative map | _human_ |`,
    );
  }

  lines.push("", "## Roster routing needs_review", "");
  for (const p of playbacks.filter((x) => isProductionScoredBucket(x.corpusBucket))) {
    const routing = p.findings.filter((f) => f.section === "routing_mismatch");
    if (!routing.length) continue;
    lines.push(`- **${redactPlaybackSnippet(p.caseTitle)}** (${p.corpusBucket}): ${routing.map((f) => f.checkId).join(", ")}`);
  }

  fs.writeFileSync(path.join(outDir, "18-human-mapping-decisions.md"), lines.join("\n"), "utf8");
}

export function writeFinalReviewSummary(
  outDir: string,
  summary: PlaybackSummary,
  opts: { canarySize: number; replayLatestAdded: boolean },
): void {
  const lines = [
    "# Final review summary",
    "",
    "## Fixed this loop",
    "- Canary pack + fast canary/replay commands",
    "- Charge-first workflow profile when allegation is clear",
    "- Chase wrong-family check tightened (cross-family only)",
    "- Malformed anchor only when visible on solicitor surfaces",
    "- Expanded offence inference (harassment, weapons, simple possession)",
    "",
    "## Metrics",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| A+B unsafe | ${summary.rosterUnsafeCount} |`,
    `| A+B needs_review | ${summary.rosterNeedsReviewCount} |`,
    `| Full unsafe | ${summary.unsafeCount} |`,
    `| Full needs_review | ${summary.needsReviewCount} |`,
    `| Canary pack size | ${opts.canarySize} |`,
    "",
    `**Replay-latest:** ${opts.replayLatestAdded ? "yes" : "no"}`,
    "",
    "## Remains",
    "- See 16-remaining-issues-triage.md and 18-human-mapping-decisions.md",
    "- Bucket C routing: learning radar only",
    "- PDF/bundle fidelity for malformed anchors and truth",
    "",
    "## Merge",
    "- PR on corpus-playback safe for A+B gate review",
    "- Do not merge to main until human sign-off on roster needs_review",
    "",
  ];
  fs.writeFileSync(path.join(outDir, "17-final-review-summary.md"), lines.join("\n"), "utf8");
}
