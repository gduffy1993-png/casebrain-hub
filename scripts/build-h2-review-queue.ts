#!/usr/bin/env npx tsx
/**
 * H2 — build human review queue from Level 1 corpus lint (worst50 + pattern clusters).
 *
 * Run: npx tsx scripts/build-h2-review-queue.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LINT_REPORT = path.join(ROOT, "artifacts", "casebrain-qa", "bundle-fidelity-corpus-lint", "report.json");
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "h2-review-queue");

type WorstCase = {
  caseId: string;
  profile: string;
  offenceFamily: string;
  riskScore: number;
  partnerScore: number;
  criticalSurvivors: number;
  weirdnessCritical: number;
  weirdnessPolish: number;
  topFindings: Array<{ kind: string; severity: string; message: string; suggestedArea?: string }>;
};

type LintReport = {
  generatedAt: string;
  cases: number;
  dangerousWeirdnessCritical: number;
  weirdness: {
    topFindings: Array<{ kind: string; count: number }>;
    suggestedAreas: Array<{ area: string; count: number }>;
    byOffenceFamily: Array<{ offenceFamily: string; counts: Record<string, number> }>;
  };
  partnerScore: {
    averageScore: number;
    clusteredViolations: {
      topViolations: Array<{ kind: string; count: number }>;
    };
  };
  worst50: WorstCase[];
};

function classifyPattern(kind: string): "dangerous" | "polish" | "gate_noise" {
  const k = kind.toLowerCase();
  if (
    /wrong_family|unsafe_win|court_line_in_chase|prohibited_family|bwv.*fact|guardian|source_truth/.test(k)
  ) {
    return "dangerous";
  }
  if (/duplicate_chase|raw_fragment|partner_score|needs_review|metadata|weak/.test(k)) {
    return "polish";
  }
  return "gate_noise";
}

function main(): void {
  if (!fs.existsSync(LINT_REPORT)) {
    console.error(`Missing lint report: ${LINT_REPORT}`);
    console.error("Run: npx tsx scripts/bundle-fidelity-corpus-lint.ts --count 2200 --split all");
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(LINT_REPORT, "utf8")) as LintReport;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const patternQueue = report.weirdness.topFindings.map((row, index) => ({
    rank: index + 1,
    pattern: row.kind,
    count: row.count,
    classification: classifyPattern(row.kind),
    severity: classifyPattern(row.kind) === "dangerous" ? "dangerous" : classifyPattern(row.kind) === "polish" ? "polish" : "gate_noise",
    action: patternAction(row.kind),
    h2Priority:
      classifyPattern(row.kind) === "dangerous"
        ? "STOP — dangerous"
        : index === 0
          ? "P1 — repeated embarrassing pattern"
          : index < 3
            ? "P2"
            : "P3",
  }));

  const areaQueue = report.weirdness.suggestedAreas.map((row, index) => ({
    rank: index + 1,
    area: row.area,
    count: row.count,
    owner: row.area.includes("dedupe") ? "Codex — chase finalization" : "Cursor — gate only",
  }));

  const partnerQueue = report.partnerScore.clusteredViolations.topViolations.slice(0, 10).map((row, index) => ({
    rank: index + 1,
    violation: row.kind,
    count: row.count,
    note: "Partner Score polish — not pilot-blocking unless paired with dangerous weirdness",
  }));

  const worst50Sample = report.worst50.slice(0, 50).map((c, index) => ({
    rank: index + 1,
    caseId: c.caseId,
    profile: c.profile,
    offenceFamily: c.offenceFamily,
    riskScore: c.riskScore,
    partnerScore: c.partnerScore,
    topFinding: c.topFindings[0]?.kind ?? "none",
    dangerous: c.weirdnessCritical > 0 || c.criticalSurvivors > 0,
    reviewNote: c.weirdnessCritical > 0 ? "STOP — dangerous" : "Polish sample for pattern fix verification",
  }));

  const dangerousCount = worst50Sample.filter((c) => c.dangerous).length;

  const queue = {
    generatedAt: new Date().toISOString(),
    sourceLintReport: LINT_REPORT,
    sourceLintGeneratedAt: report.generatedAt,
    corpusCases: report.cases,
    dangerousWeirdnessCritical: report.dangerousWeirdnessCritical,
    partnerScoreAverage: report.partnerScore.averageScore,
    goldenPack: {
      target: 75,
      runnable: null,
      note: "Run grow-golden-pack.ts --target 75 then golden-case-pack-gate",
    },
    patternClassification: {
      dangerous: patternQueue.filter((p) => p.classification === "dangerous").length,
      polish: patternQueue.filter((p) => p.classification === "polish").length,
      gateNoise: patternQueue.filter((p) => p.classification === "gate_noise").length,
    },
    stopRule: {
      level1DangerousCritical: report.dangerousWeirdnessCritical,
      pilotBlocking: report.dangerousWeirdnessCritical > 0,
      note: "H2 fixes repeated patterns only — not one-off cherry-picks unless pattern rank P1.",
    },
    patternQueue,
    areaQueue,
    partnerQueue,
    worst50Sample,
    codexHandoff: {
      startWith: ["duplicate_chase_label dedupe in chase finalization", "raw_fragment_label cleanup in MG6 bucket titles"],
      deferUnlessP1: ["Taylor raw MG6 fragments — only if duplicate_chase_label fix does not resolve"],
      chaseContracts: path.join(OUT_DIR, "chase-output-contracts.json"),
    },
  };

  const chaseContracts = {
    version: "H2-draft-1",
    purpose: "Minimum solicitor-readable Disclosure Chase output — gate + human review",
    perItem: {
      title: "Human-readable material family label (no raw MG6 pipe fragments)",
      draftChaseWording: "Must start with 'Please provide' or equivalent CPS ask — never court-record line",
      courtLine: "Separate from draft; must not duplicate draft prefix",
      whyItMatters: "One sentence linked to route/disclosure fairness",
      maxPrimaryCards: "Prefer family collapse: 1× BWV, 1× custody/PACE, 1× digital — bucket overflow OK",
    },
    prohibited: [
      "Please provide the defence asks the court",
      "case collapses / this wins / guaranteed acquittal",
      "wrong-family route titles (PWITS on harassment, fraud on motoring, etc.)",
      "BWV/custody/drugs modality stated as proved fact when papers say referred/outstanding",
    ],
    polishAllowed: [
      "duplicate_chase_label in overflow bucket",
      "raw_fragment_label if single bucket and draft wording is clean",
      "metadata classifier needs_review on thin bundles",
    ],
    smokeAnchors: ["cb-fresh-001-taylor-brookes", "cb-fresh-002-jordan-hale"],
    goldPackTarget: 75,
  };

  fs.writeFileSync(path.join(OUT_DIR, "queue.json"), `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "chase-output-contracts.json"),
    `${JSON.stringify(chaseContracts, null, 2)}\n`,
    "utf8",
  );

  const md = [
    "# H2 Review Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    `Source lint: ${report.generatedAt} (${report.cases} cases)`,
    "",
    "## Stop rule",
    "",
    `- Dangerous weirdness critical: **${report.dangerousWeirdnessCritical}** (pilot-blocking if > 0)`,
    `- Partner Score avg: **${report.partnerScore.averageScore}**`,
    `- Worst50 dangerous samples: **${dangerousCount} / 50**`,
    "",
    "## Pattern queue (dangerous / polish / gate noise)",
    "",
    "| Rank | Pattern | Count | Class | Priority | Action |",
    "|------|---------|-------|-------|----------|--------|",
    ...patternQueue.map(
      (p) =>
        `| ${p.rank} | ${p.pattern} | ${p.count} | ${p.classification} | ${p.h2Priority} | ${p.action} |`,
    ),
    "",
    "## Suggested areas",
    "",
    ...areaQueue.map((a) => `- **${a.area}** (${a.count}) — ${a.owner}`),
    "",
    "## Codex handoff",
    "",
    "- Start: duplicate_chase_label + raw_fragment_label in chase finalization",
    "- Defer Taylor one-off unless pattern stays P1 after dedupe fix",
    "- Chase contracts: `artifacts/casebrain-qa/h2-review-queue/chase-output-contracts.json`",
    "",
    "## Golden pack growth",
    "",
    "Run `npx tsx scripts/grow-golden-pack.ts --target 75` then gate at `--min-runnable 75`.",
    "Run `npx tsx scripts/h2-confidence-report.ts --run-gate --target 75` for combined status.",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "REPORT.md"), `${md}\n`, "utf8");

  console.log("H2 review queue:");
  console.log(`  Patterns: ${patternQueue.length}`);
  console.log(`  Worst50 samples: ${worst50Sample.length}`);
  console.log(`  Dangerous in worst50: ${dangerousCount}`);
  console.log(`  Queue: ${path.join(OUT_DIR, "queue.json")}`);
  console.log(`  Report: ${path.join(OUT_DIR, "REPORT.md")}`);
  console.log(`  Chase contracts: ${path.join(OUT_DIR, "chase-output-contracts.json")}`);
}

function patternAction(kind: string): string {
  if (kind === "duplicate_chase_label") {
    return "Dedupe chase item labels + collapse overflow bucket lines (Codex)";
  }
  if (kind === "raw_fragment_label") {
    return "Normalize MG6/schedule fragments to family titles (Codex)";
  }
  if (kind === "wrong_family_bleed") {
    return "STOP — route guard / battleboard (Codex + gate)";
  }
  if (kind === "unsafe_win_language" || kind === "court_line_in_chase_draft") {
    return "STOP — weirdness filter + chase builder (Codex)";
  }
  return "Human sample review — confirm pattern before patch";
}

main();
