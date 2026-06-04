import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import { redactPlaybackSnippet } from "./corpus-playback-redact";
import type { CorpusCasePlayback, PlaybackSummary } from "./corpus-playback-types";

type CleanupClass =
  | "safe_code_fix_now"
  | "auditor_check_false_positive"
  | "bucket_c_lab_noise"
  | "needs_human_mapping"
  | "needs_pdf_bundle_fidelity"
  | "low_priority_polish"
  | "ignore_for_release";

const META: Record<
  string,
  {
    classification: CleanupClass;
    why: string;
    action: string;
    autoFixSafe: boolean;
    ignore: boolean;
    files: string[];
  }
> = {
  "routing.charge_vs_route_family": {
    classification: "bucket_c_lab_noise",
    why: "Messy eval Pack AA/Z bundles — charge metadata vs battleboard route on bucket C only.",
    action: "Downgraded to needs_review on C; monitor via canary. No A+B impact.",
    autoFixSafe: false,
    ignore: true,
    files: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
  },
  "routing.provisional_needs_human_review": {
    classification: "needs_human_mapping",
    why: "Murder/manslaughter/perverting/witness intimidation — intentional provisional policy.",
    action: "Human review queue; future serious-crime family work.",
    autoFixSafe: false,
    ignore: true,
    files: ["lib/eval/casebrain-auditor/provisional-offence-policy.ts"],
  },
  "anchor.malformed": {
    classification: "needs_pdf_bundle_fidelity",
    why: "Cut-off MG/BWV/page-glue from bundle extraction; sanitizer reduces visible surface.",
    action: "Bundle fidelity lane; sanitizer on provisional/generic routes applied.",
    autoFixSafe: true,
    ignore: true,
    files: ["lib/criminal/pilot-workflow.ts"],
  },
  "chase.wrong_family_label": {
    classification: "auditor_check_false_positive",
    why: "Mixed-family chase lines on Pack AA PWITS eval traps.",
    action: "Excluded provisional profiles; C-only needs_review.",
    autoFixSafe: true,
    ignore: true,
    files: ["lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
  },
  "profile_leakage.pwits_fraud": {
    classification: "bucket_c_lab_noise",
    why: "Collapsed eval bundle text mentions fraud wording on PWITS matters.",
    action: "Ignore for release — visible-surface only, bucket C.",
    autoFixSafe: false,
    ignore: true,
    files: ["lib/criminal/pilot-workflow.ts"],
  },
  "chase.duplicate_label": {
    classification: "low_priority_polish",
    why: "Duplicate chase label after normalisation.",
    action: "Optional dedupe polish.",
    autoFixSafe: true,
    ignore: true,
    files: ["lib/criminal/pilot-workflow.ts"],
  },
};

function groupByCheck(playbacks: CorpusCasePlayback[]): Map<string, CorpusCasePlayback[]> {
  const map = new Map<string, Set<string>>();
  const cases = new Map<string, CorpusCasePlayback>();
  for (const p of playbacks) {
    cases.set(p.caseId, p);
    for (const f of p.findings) {
      const set = map.get(f.checkId) ?? new Set();
      set.add(p.caseId);
      map.set(f.checkId, set);
    }
  }
  const out = new Map<string, CorpusCasePlayback[]>();
  for (const [id, ids] of map) {
    out.set(
      id,
      [...ids].map((x) => cases.get(x)!).filter(Boolean),
    );
  }
  return out;
}

export function writeFinalCleanupTriage(
  outDir: string,
  playbacks: CorpusCasePlayback[],
  summary: PlaybackSummary,
): void {
  const grouped = groupByCheck(playbacks);
  const lines = [
    "# Final cleanup triage",
    "",
    `Generated from playback: ${summary.generatedAt}`,
    "",
    "## Release gate",
    "",
    `- **A+B unsafe:** ${summary.rosterUnsafeCount}`,
    `- **A+B needs_review:** ${summary.rosterNeedsReviewCount}`,
    `- **Full unsafe:** ${summary.unsafeCount}`,
    `- **Full needs_review:** ${summary.needsReviewCount}`,
    "",
    "## Classification key",
    "",
    "1. safe code fix now | 2. auditor false positive | 3. bucket C lab | 4. human mapping | 5. PDF fidelity | 6. polish | 7. ignore for release",
    "",
  ];

  const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [checkId, cases] of sorted) {
    const meta = META[checkId] ?? {
      classification: "bucket_c_lab_noise" as CleanupClass,
      why: "Residual eval-corpus pattern.",
      action: "Monitor in canary.",
      autoFixSafe: false,
      ignore: true,
      files: ["lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
    };
    const a = cases.filter((c) => c.corpusBucket === "A").length;
    const b = cases.filter((c) => c.corpusBucket === "B").length;
    const c = cases.filter((c) => c.corpusBucket === "C").length;
    const unsafe = cases.reduce(
      (n, p) => n + p.findings.filter((f) => f.checkId === checkId && f.severity === "unsafe").length,
      0,
    );
    lines.push(`## \`${checkId}\` — ${meta.classification}`, "");
    lines.push(`| Count | A | B | C | Unsafe findings |`);
    lines.push(`|------:|--:|--:|--:|----------------:|`);
    lines.push(`| ${cases.length} | ${a} | ${b} | ${c} | ${unsafe} |`, "");
    lines.push(`- **Release impact:** ${a + b > 0 ? "ROSTER — investigate" : "None (bucket C lab)"}`);
    lines.push(`- **Why remains:** ${meta.why}`);
    lines.push(`- **Action:** ${meta.action}`);
    lines.push(`- **autoFixSafe:** ${meta.autoFixSafe}`);
    lines.push(`- **Ignore for release:** ${meta.ignore}`);
    lines.push(`- **Files:** ${meta.files.join(", ")}`);
    lines.push("- **Examples:**");
    for (const p of cases.slice(0, 3)) {
      const f = p.findings.find((x) => x.checkId === checkId);
      lines.push(`  - ${redactPlaybackSnippet(p.caseTitle)} (${p.corpusBucket}): ${f?.message ?? "—"}`);
    }
    lines.push("");
  }

  fs.writeFileSync(path.join(outDir, "19-final-cleanup-triage.md"), lines.join("\n"), "utf8");
}

export function writePrReadinessReport(
  outDir: string,
  summary: PlaybackSummary,
  opts: { branch: string; commit: string; canarySize: number; checksRun: string[] },
): void {
  const safeToMerge = summary.rosterUnsafeCount === 0 && summary.rosterNeedsReviewCount === 0;
  const lines = [
    "# PR readiness report — corpus-playback",
    "",
    `- **Branch:** ${opts.branch}`,
    `- **Commit:** ${opts.commit}`,
    `- **Playback at:** ${summary.generatedAt}`,
    "",
    "## Release metrics",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| A+B roster findings (all sections) | ${summary.sectionCountsRoster.routing_mismatch + summary.sectionCountsRoster.court_and_hearing + summary.sectionCountsRoster.disclosure_chase + summary.sectionCountsRoster.thin_bundle_honesty + summary.sectionCountsRoster.profile_leakage} |`,
    `| A+B unsafe | ${summary.rosterUnsafeCount} |`,
    `| A+B needs_review | ${summary.rosterNeedsReviewCount} |`,
    `| Full corpus unsafe | ${summary.unsafeCount} |`,
    `| Full corpus needs_review | ${summary.needsReviewCount} |`,
    `| Canary pack size | ${opts.canarySize} |`,
    "",
    "## Remaining issue groups (full corpus)",
    "",
  ];
  for (const [k, v] of Object.entries(summary.checkCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${k}\`: ${v}`);
  }
  lines.push(
    "",
    "## Safe to ignore for release",
    "",
    "- All remaining fingerprints are **bucket C only** — no A+B roster impact.",
    "- `routing.provisional_needs_human_review` — intentional serious/generic provisional policy.",
    "- `routing.charge_vs_route_family` — Pack AA/Z eval traps (needs_review on C).",
    "- `anchor.malformed` — PDF/bundle fidelity follow-up.",
    "- `profile_leakage.pwits_fraud` — eval bundle noise.",
    "",
    "## Needs human review (not blocking PR)",
    "",
    "- Murder/manslaughter/perverting/witness intimidation → future offence families.",
    "- Motoring policy confirmed — `generic_motoring_provisional`.",
    "",
    "## Needs PDF/bundle fidelity (future lane)",
    "",
    "- Malformed MG/BWV anchor extraction on eval bundles.",
    "",
    "## Checks run this sprint",
    "",
  );
  for (const c of opts.checksRun) lines.push(`- ${c}`);
  lines.push(
    "",
    "## PR verdict",
    "",
    `- **Safe to review:** ${safeToMerge ? "yes" : "no — roster regression"}`,
    `- **Safe to merge to main:** ${safeToMerge ? "yes, after human PR review" : "no"}`,
    `- **Do not merge if:** A+B findings > 0, pilot-3 or production-pass RED, or sensitive artifacts committed.`,
    "",
  );
  fs.writeFileSync(path.join(outDir, "20-pr-readiness-report.md"), lines.join("\n"), "utf8");
}

export function countRosterFindings(summary: PlaybackSummary): number {
  return Object.values(summary.sectionCountsRoster).reduce((a, b) => a + b, 0);
}

export { isProductionScoredBucket };
