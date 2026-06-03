import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import { redactPlaybackSnippet } from "./corpus-playback-redact";
import type { CorpusCasePlayback, PlaybackFinding, PlaybackSummary } from "./corpus-playback-types";
import type { AuditorFamilyProfile } from "./types";

type ScorecardRow = {
  checkId: string;
  section: string;
  affectedCount: number;
  affectedA: number;
  affectedB: number;
  affectedC: number;
  solicitorRisk: "low" | "medium" | "high" | "critical";
  fixConfidence: "low" | "medium" | "high";
  autoFixSafe: boolean;
  likelySharedCause: string;
  likelyFiles: string[];
  expectedImpact: string;
  recommendedPriority: "P0" | "P1" | "P2" | "P3" | "Review";
};

const DO_NOT_SAY_PHRASES: Array<{
  phrase: string;
  whyRisky: string;
  saferWording: string;
}> = [
  { phrase: "proves", whyRisky: "States Crown case as fact", saferWording: "may support if served and consistent" },
  { phrase: "confirms", whyRisky: "Overstates served material", saferWording: "may bear on if served and reconciled" },
  { phrase: "establishes guilt", whyRisky: "Legal outcome language", saferWording: "may bear on the Crown case if served" },
  { phrase: "admitted", whyRisky: "Unsupported admission", saferWording: "interview position remains to be tested against served record" },
  { phrase: "no issue", whyRisky: "Dismisses live Crown limbs", saferWording: "remains conditional pending served material" },
  { phrase: "safe to argue", whyRisky: "Outcome prediction", saferWording: "may assist if proved on served material" },
  { phrase: "Crown will lose", whyRisky: "Outcome prediction", saferWording: "not for product surfaces" },
  { phrase: "defence wins", whyRisky: "Outcome prediction", saferWording: "not for product surfaces" },
  { phrase: "CCTV shows", whyRisky: "Unserved footage stated as fact", saferWording: "CCTV may support if served and consistent" },
  { phrase: "CAD confirms", whyRisky: "999/CAD overstated", saferWording: "CAD/999 timing may affect sequence if served" },
  { phrase: "client accepted", whyRisky: "No source for acceptance", saferWording: "instructions/interview position to be confirmed" },
  { phrase: "interview narrows route", whyRisky: "Interview not served", saferWording: "interview denial to be tested against served record" },
];

export function countRosterUnsafe(playbacks: CorpusCasePlayback[]): number {
  return playbacks
    .filter((p) => isProductionScoredBucket(p.corpusBucket))
    .flatMap((p) => p.findings)
    .filter((f) => f.severity === "unsafe").length;
}

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
  for (const [checkId, ids] of map) {
    out.set(
      checkId,
      [...ids].map((id) => cases.get(id)!).filter(Boolean),
    );
  }
  return out;
}

function scoreRow(checkId: string, cases: CorpusCasePlayback[]): ScorecardRow {
  const findings = cases.flatMap((p) => p.findings.filter((f) => f.checkId === checkId));
  const section = findings[0]?.section ?? "routing_mismatch";
  const affectedA = cases.filter((p) => p.corpusBucket === "A").length;
  const affectedB = cases.filter((p) => p.corpusBucket === "B").length;
  const affectedC = cases.filter((p) => p.corpusBucket === "C").length;
  const rosterHit = affectedA + affectedB > 0;
  const unsafe = findings.some((f) => f.severity === "unsafe");

  let solicitorRisk: ScorecardRow["solicitorRisk"] = "low";
  if (rosterHit && unsafe) solicitorRisk = "critical";
  else if (rosterHit || (unsafe && affectedC < 20)) solicitorRisk = "high";
  else if (unsafe) solicitorRisk = "medium";
  else if (cases.length > 30) solicitorRisk = "medium";

  const sharedRules: Record<string, { cause: string; files: string[]; auto: boolean; conf: ScorecardRow["fixConfidence"] }> =
    {
      "routing.charge_vs_route_family": {
        cause: "Primary route not aligned to charge/workflow profile",
        files: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
        auto: true,
        conf: "high",
      },
      "routing.charge_vs_workflow_profile": {
        cause: "Workflow profile resolution vs charge metadata",
        files: ["lib/eval/casebrain-auditor/real-case-collector.ts", "lib/criminal/pilot-workflow.ts"],
        auto: true,
        conf: "high",
      },
      "hearing.overconfident_wording": {
        cause: "Proof/confirm language on hearing/court lines",
        files: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
        auto: true,
        conf: "high",
      },
      "court.overconfident_wording": {
        cause: "Proof/confirm language on court lines",
        files: ["lib/criminal/pilot-workflow.ts"],
        auto: true,
        conf: "high",
      },
      "profile_leakage.violence_pwits": {
        cause: "PWITS wording on violence profile surfaces",
        files: ["lib/criminal/pilot-workflow.ts", "lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
        auto: true,
        conf: "high",
      },
      "profile_leakage.pwits_fraud": {
        cause: "Fraud wording on PWITS surfaces",
        files: ["lib/criminal/pilot-workflow.ts"],
        auto: true,
        conf: "medium",
      },
      "routing.unknown_with_metadata": {
        cause: "Unmapped offence text (motoring/procedural/mixed)",
        files: ["lib/eval/casebrain-auditor/real-case-collector.ts"],
        auto: false,
        conf: "low",
      },
      "chase.duplicate_label": {
        cause: "Duplicate disclosure chase labels",
        files: ["lib/criminal/pilot-workflow.ts"],
        auto: true,
        conf: "high",
      },
    };

  const rule = sharedRules[checkId] ?? {
    cause: "Case-specific or low-repeat pattern",
    files: ["lib/eval/casebrain-auditor/corpus-playback-checks.ts"],
    auto: false,
    conf: "low" as const,
  };

  let recommendedPriority: ScorecardRow["recommendedPriority"] = "P2";
  if (rosterHit && unsafe) recommendedPriority = "P0";
  else if (rosterHit || (unsafe && cases.length >= 10)) recommendedPriority = "P1";
  else if (cases.length >= 25) recommendedPriority = "P1";
  else if (checkId.startsWith("anchor.")) recommendedPriority = "P3";
  else if (!rule.auto) recommendedPriority = "Review";

  const autoFixSafe =
    rule.auto &&
    rule.conf === "high" &&
    (rosterHit || cases.length >= 8) &&
    solicitorRisk !== "low";

  return {
    checkId,
    section,
    affectedCount: cases.length,
    affectedA,
    affectedB,
    affectedC,
    solicitorRisk,
    fixConfidence: rule.conf,
    autoFixSafe,
    likelySharedCause: rule.cause,
    likelyFiles: rule.files,
    expectedImpact: rosterHit
      ? "Production A+B solicitor safety"
      : cases.length >= 20
        ? "Broad corpus noise reduction"
        : "Limited / bucket C",
    recommendedPriority,
  };
}

function writeScorecard(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const grouped = groupByCheck(playbacks);
  const rows = [...grouped.entries()]
    .map(([id, cases]) => scoreRow(id, cases))
    .sort((a, b) => {
      const pri = { P0: 0, P1: 1, P2: 2, P3: 3, Review: 4 };
      return pri[a.recommendedPriority] - pri[b.recommendedPriority] || b.affectedCount - a.affectedCount;
    });

  const lines = [
    "# Solicitor-grade scorecard",
    "",
    "_Generated from latest corpus playback. Production gate = A+B unsafe findings._",
    "",
    "| checkId | n | A | B | C | risk | fix conf | autoFix | priority |",
    "|---------|--:|--:|--:|--:|------|----------|---------|----------|",
  ];
  for (const r of rows) {
    lines.push(
      `| \`${r.checkId}\` | ${r.affectedCount} | ${r.affectedA} | ${r.affectedB} | ${r.affectedC} | ${r.solicitorRisk} | ${r.fixConfidence} | ${r.autoFixSafe} | ${r.recommendedPriority} |`,
    );
    lines.push(`- **Cause:** ${r.likelySharedCause}`);
    lines.push(`- **Files:** ${r.likelyFiles.join(", ")}`);
    lines.push(`- **Impact:** ${r.expectedImpact}`, "");
  }
  fs.writeFileSync(path.join(outDir, "07-solicitor-grade-scorecard.md"), lines.join("\n"), "utf8");
}

function writeBeforeAfter(
  outDir: string,
  summary: PlaybackSummary,
  rosterUnsafeBefore: number | null,
): void {
  const rosterUnsafeNow = summary.unsafeCount;
  const lines = [
    "# Before / after delta",
    "",
    `Run: ${summary.generatedAt}`,
    "",
    "## Counts",
    "",
    `| Metric | Previous | Current | Delta |`,
    `|--------|----------|---------|------:|`,
    `| Full corpus unsafe+review | — | ${summary.unsafeCount} unsafe, ${summary.needsReviewCount} review | — |`,
  ];
  if (summary.previousRunAt && summary.deltaChecks) {
    const top = Object.entries(summary.deltaChecks)
      .filter(([, d]) => d !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 15);
    lines.push("", "## Top check deltas", "");
    for (const [k, d] of top) lines.push(`- \`${k}\`: ${d > 0 ? "+" : ""}${d}`);
  }
  if (rosterUnsafeBefore != null) {
    lines.push("", "## Production A+B unsafe findings", "");
    lines.push(`- Previous run roster unsafe: **${rosterUnsafeBefore}**`);
    lines.push(`- Current run roster unsafe: **${summary.rosterUnsafeCount}**`);
    if (summary.deltaRosterUnsafe != null) {
      lines.push(`- Delta: **${summary.deltaRosterUnsafe > 0 ? "+" : ""}${summary.deltaRosterUnsafe}**`);
    }
  }
  fs.writeFileSync(path.join(outDir, "08-before-after-delta.md"), lines.join("\n"), "utf8");
}

function writeNextFixes(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const rows = [...groupByCheck(playbacks).entries()]
    .map(([id, cases]) => scoreRow(id, cases))
    .filter((r) => r.autoFixSafe || r.recommendedPriority === "P0" || r.recommendedPriority === "P1")
    .sort((a, b) => {
      const pri = { P0: 0, P1: 1, P2: 2, P3: 3, Review: 4 };
      return pri[a.recommendedPriority] - pri[b.recommendedPriority];
    });

  const lines = ["# Next fixes (ranked)", ""];
  for (const r of rows.slice(0, 25)) {
    lines.push(
      `## ${r.recommendedPriority} — \`${r.checkId}\` (${r.affectedCount} cases, A=${r.affectedA} B=${r.affectedB})`,
      "",
      `- **autoFixSafe:** ${r.autoFixSafe}`,
      `- **Cause:** ${r.likelySharedCause}`,
      `- **Files:** ${r.likelyFiles.join(", ")}`,
      "",
    );
  }
  fs.writeFileSync(path.join(outDir, "09-next-fixes-ranked.md"), lines.join("\n"), "utf8");
}

function abPlaybacks(playbacks: CorpusCasePlayback[]): CorpusCasePlayback[] {
  return playbacks.filter((p) => isProductionScoredBucket(p.corpusBucket));
}

function writeProductionAbPack(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const lines = ["# Production A+B solicitor review pack", "", `_Cases: ${abPlaybacks(playbacks).length}_`, ""];
  for (const p of abPlaybacks(playbacks)) {
    const unsafe = p.findings.filter((f) => f.severity === "unsafe");
    const review = p.findings.filter((f) => f.severity === "needs_review");
    const topLines = [...p.hearingLines, ...p.courtLines, p.solicitorSafeSummary ?? ""]
      .filter(Boolean)
      .slice(0, 3)
      .map((l) => redactPlaybackSnippet(l));
    const demoSafe = unsafe.length === 0;
    lines.push(`## ${redactPlaybackSnippet(p.caseTitle)}`, "");
    lines.push(`- **caseId:** \`${p.caseId}\` (${p.corpusBucket})`);
    lines.push(`- **Charge family:** ${p.inferredChargeFamily ?? "—"}`);
    lines.push(`- **Route family:** ${p.routeFamily ?? "—"}`);
    lines.push(`- **Primary route:** ${redactPlaybackSnippet(p.primaryRouteTitle ?? "—")}`);
    lines.push(`- **Workflow profile:** ${p.workflowProfile}`);
    lines.push(`- **Court/hearing risk:** ${unsafe.filter((f) => f.section === "court_and_hearing").length} unsafe`);
    lines.push(`- **Disclosure chase items:** ${p.disclosureChaseLabels.length}`);
    lines.push(`- **Thin bundle:** ${p.thinBundleStatus ? "yes" : "no"}`);
    lines.push(`- **Unsafe findings:** ${unsafe.length}`);
    lines.push(`- **Needs review:** ${review.length}`);
    lines.push(`- **Safe for demo/release:** ${demoSafe ? "yes (no unsafe playback findings)" : "no — review unsafe items"}`);
    lines.push("- **Top lines for human review:**");
    for (const l of topLines) lines.push(`  - ${l}`);
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "10-production-ab-review-pack.md"), lines.join("\n"), "utf8");
}

function writeContradictionMap(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const lines = ["# Contradiction map (A+B)", "", "_Visible patterns only — not legal conclusions._", ""];
  const groups: Record<string, string[]> = {
    charge_vs_route: [],
    route_vs_disclosure: [],
    source_vs_court_line: [],
    thin_bundle_vs_confidence: [],
    profile_vs_wording: [],
  };

  for (const p of abPlaybacks(playbacks)) {
    const title = redactPlaybackSnippet(p.caseTitle);
    if (p.inferredChargeFamily && p.routeFamily && p.inferredChargeFamily !== p.routeFamily) {
      groups.charge_vs_route.push(
        `${title}: charge ${p.inferredChargeFamily} vs route ${p.routeFamily} (${redactPlaybackSnippet(p.primaryRouteTitle ?? "")})`,
      );
    }
    if (p.inferredChargeFamily && p.workflowProfile !== "generic" && p.inferredChargeFamily !== p.workflowProfile) {
      groups.charge_vs_route.push(`${title}: charge ${p.inferredChargeFamily} vs profile ${p.workflowProfile}`);
    }
    if (p.thinBundleStatus && p.findings.some((f) => f.checkId.includes("overconfident"))) {
      groups.thin_bundle_vs_confidence.push(`${title}: thin bundle with overconfident wording flagged`);
    }
    for (const f of p.findings.filter((x) => x.section === "profile_leakage" && x.severity === "unsafe")) {
      groups.profile_vs_wording.push(`${title}: ${f.checkId} — ${f.message}`);
    }
    for (const f of p.findings.filter((x) => x.section === "court_and_hearing")) {
      groups.source_vs_court_line.push(`${title}: ${f.checkId}`);
    }
    for (const f of p.findings.filter((x) => x.section === "disclosure_chase")) {
      groups.route_vs_disclosure.push(`${title}: ${f.checkId}`);
    }
  }

  for (const [key, items] of Object.entries(groups)) {
    lines.push(`## ${key}`, "");
    if (!items.length) lines.push("_None flagged._", "");
    else for (const i of items) lines.push(`- ${i}`);
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "11-contradiction-map.md"), lines.join("\n"), "utf8");
}

const ROUTE_DEPS: Record<string, string[]> = {
  fraud_account_control: [
    "bank export / schedules",
    "device/login/IP",
    "mailbox/email",
    "account ownership",
  ],
  pwits_phone_attribution: [
    "phone extraction",
    "SIM/subscriber",
    "search BWV + seizure continuity",
    "drug/cash continuity",
  ],
  robbery_identification: [
    "CCTV master + continuity",
    "ID procedure",
    "999/CAD",
    "complainant first account",
  ],
  violence_domestic_assault: [
    "complainant MG11",
    "BWV",
    "medical/injury",
    "999/CAD",
    "self-defence context",
  ],
};

function writeDependencyMap(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const lines = ["# Missing document dependencies (A+B)", ""];
  for (const p of abPlaybacks(playbacks)) {
    const fam =
      (p.workflowProfile !== "generic" ? p.workflowProfile : p.inferredChargeFamily) as AuditorFamilyProfile | null;
    const deps = fam && fam in ROUTE_DEPS ? ROUTE_DEPS[fam as keyof typeof ROUTE_DEPS] : ["served source material"];
    lines.push(`## ${redactPlaybackSnippet(p.caseTitle)}`, "");
    lines.push(`- **Primary route:** ${redactPlaybackSnippet(p.primaryRouteTitle ?? "—")}`);
    lines.push(`- **Route depends on:** ${deps.join("; ")}`);
    lines.push(`- **Missing/uncertain:** thin=${p.thinBundleStatus}, docs=${p.documentCount}`);
    lines.push(
      `- **Unsafe if:** served material returns consistent with Crown on primary route without instructions`,
    );
    lines.push(`- **Chase principle:** chase ${deps[0]} first for this family`, "");
  }
  fs.writeFileSync(path.join(outDir, "12-missing-document-dependencies.md"), lines.join("\n"), "utf8");
}

function writeDoNotSayList(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const corpusText = playbacks
    .flatMap((p) => [...p.hearingLines, ...p.courtLines, p.solicitorSafeSummary ?? ""])
    .join("\n");
  const lines = ["# Do not say (solicitor safety)", ""];
  for (const { phrase, whyRisky, saferWording } of DO_NOT_SAY_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const found = re.test(corpusText);
    const fixedThisSprint = [
      "proves",
      "confirms participation",
      "establishes guilt",
      "interview narrows",
    ].some((p) => phrase.toLowerCase().includes(p));
    lines.push(`## "${phrase}"`, "");
    lines.push(`- **Why risky:** ${whyRisky}`);
    lines.push(`- **Safer wording:** ${saferWording}`);
    lines.push(`- **Where found:** ${found ? "present in corpus playback text" : "not detected in sampled lines"}`);
    lines.push(`- **Fixed this sprint:** ${fixedThisSprint ? "partial — softenSolicitorSourceWording + check tuning" : "monitor"}`);
    lines.push("");
  }
  fs.writeFileSync(path.join(outDir, "13-do-not-say-list.md"), lines.join("\n"), "utf8");
}

function hearingReadiness(p: CorpusCasePlayback): "Green" | "Amber" | "Red" {
  const unsafe = p.findings.filter((f) => f.severity === "unsafe");
  if (unsafe.length) return "Red";
  if (p.thinBundleStatus || p.findings.length > 2) return "Amber";
  if (p.inferredChargeFamily && p.routeFamily && p.inferredChargeFamily !== p.routeFamily) return "Amber";
  return "Green";
}

function writeHearingReadiness(outDir: string, playbacks: CorpusCasePlayback[]): void {
  const lines = ["# Hearing readiness (A+B workflow only)", "", "_Not legal outcome — workflow alignment._", ""];
  for (const p of abPlaybacks(playbacks)) {
    const status = hearingReadiness(p);
    lines.push(
      `- **${redactPlaybackSnippet(p.caseTitle)}** (${p.corpusBucket}): **${status}** — route=${p.routeFamily ?? "—"}, unsafe=${p.findings.filter((f) => f.severity === "unsafe").length}, review=${p.findings.filter((f) => f.severity !== "unsafe").length}`,
    );
  }
  fs.writeFileSync(path.join(outDir, "14-hearing-readiness.md"), lines.join("\n"), "utf8");
}

export type PlaybackReviewEntry = {
  caseId: string;
  guessedFamily: AuditorFamilyProfile | null;
  whyUncertain: string;
  evidenceNeeded: string[];
  fieldsNeededBeforeStrictGrading: string[];
  canPromoteToConfirmed: false;
};

export function buildPlaybackReviewQueue(playbacks: CorpusCasePlayback[]): PlaybackReviewEntry[] {
  const out: PlaybackReviewEntry[] = [];
  for (const p of playbacks) {
    const uncertainRouting = p.findings.some(
      (f) =>
        f.checkId === "routing.unknown_with_metadata" ||
        f.checkId === "routing.generic_with_charge_family",
    );
    const chargeRoute = p.findings.some((f) => f.checkId.startsWith("routing.charge"));
    if (!uncertainRouting && !chargeRoute) continue;
    out.push({
      caseId: p.caseId,
      guessedFamily: p.inferredChargeFamily ?? p.auditorFamily,
      whyUncertain: chargeRoute
        ? `Charge/route/profile tension (${p.inferredChargeFamily ?? "?"} vs ${p.routeFamily ?? "?"})`
        : "Offence text present but family mapping uncertain",
      evidenceNeeded: [
        "Exact charge sheet / indictment wording",
        "Served MG5/MG6 and key schedules",
        "Human confirmation of primary workflow family",
      ],
      fieldsNeededBeforeStrictGrading: [
        "defendant label",
        "exact allegation",
        "court/stage",
        "workflow family",
        "expected primary route title",
      ],
      canPromoteToConfirmed: false,
    });
  }
  return out.slice(0, 80);
}

function writeTrainingCandidates(outDir: string, playbacks: CorpusCasePlayback[]): number {
  const pathJsonl = path.join(outDir, "training-candidates.jsonl");
  const rows: string[] = [];
  let n = 0;
  for (const p of playbacks) {
    for (const f of p.findings) {
      if (f.severity !== "unsafe" && !f.checkId.startsWith("routing.charge")) continue;
      const row = {
        issueId: `${p.caseId}:${f.checkId}`,
        caseBucket: p.corpusBucket,
        caseFamily: p.inferredChargeFamily ?? p.workflowProfile,
        surface: f.section,
        badOutputSnippet: f.snippet,
        whyWrong: f.message,
        correctFixPrinciple: "Shared pilot-workflow rule — conditional wording and family alignment",
        suggestedBetterOutput: null as string | null,
        fixType: f.checkId.split(".")[0],
        sourceGroundingStatus: "needs_review",
        approvedForTraining: false,
        needsHumanReview: true,
        trainingUse: f.section === "disclosure_chase" ? "disclosure_chase" : "profile_rule",
      };
      rows.push(JSON.stringify(row));
      n++;
      if (n >= 500) break;
    }
    if (n >= 500) break;
  }
  fs.writeFileSync(pathJsonl, rows.join("\n") + (rows.length ? "\n" : ""), "utf8");
  return n;
}

export function writeCorpusPlaybackSprintArtifacts(
  outDir: string,
  playbacks: CorpusCasePlayback[],
  summary: PlaybackSummary,
  opts?: { rosterUnsafeBaseline?: number; learningLogLines?: string[] },
): void {
  fs.mkdirSync(outDir, { recursive: true });
  writeScorecard(outDir, playbacks);
  writeBeforeAfter(outDir, summary, opts?.rosterUnsafeBaseline ?? null);
  writeNextFixes(outDir, playbacks);
  writeProductionAbPack(outDir, playbacks);
  writeContradictionMap(outDir, playbacks);
  writeDependencyMap(outDir, playbacks);
  writeDoNotSayList(outDir, playbacks);
  writeHearingReadiness(outDir, playbacks);

  const review = buildPlaybackReviewQueue(playbacks);
  fs.writeFileSync(
    path.join(outDir, "playback-review-queue.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: review }, null, 2),
    "utf8",
  );

  writeTrainingCandidates(outDir, playbacks);

  const log = opts?.learningLogLines ?? [
    "Sprint artifacts generated from playback run — see git commits for code fixes.",
  ];
  fs.writeFileSync(
    path.join(outDir, "15-learning-log.md"),
    ["# Learning log", "", ...log.map((l) => `- ${l}`), ""].join("\n"),
    "utf8",
  );
}

export function appendLearningLogLine(outDir: string, line: string): void {
  const file = path.join(outDir, "15-learning-log.md");
  const prev = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "# Learning log\n\n";
  fs.writeFileSync(file, `${prev.trimEnd()}\n- ${line}\n`, "utf8");
}

