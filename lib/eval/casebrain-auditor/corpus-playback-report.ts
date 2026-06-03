import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import type {
  CorpusCasePlayback,
  PlaybackFinding,
  PlaybackSection,
  PlaybackSummary,
  SectionCounts,
} from "./corpus-playback-types";
import { writeCorpusPlaybackSprintArtifacts } from "./corpus-playback-sprint";
import { CORPUS_PLAYBACK_SLUG } from "./corpus-playback-types";

const SECTION_FILES: Record<PlaybackSection, string> = {
  routing_mismatch: "01-routing-mismatches.md",
  court_and_hearing: "02-court-and-hearing-lines.md",
  disclosure_chase: "03-disclosure-chase.md",
  thin_bundle_honesty: "04-thin-bundle-honesty.md",
  profile_leakage: "05-profile-leakage.md",
};

const SECTION_TITLES: Record<PlaybackSection, string> = {
  routing_mismatch: "Routing mismatches (charge / profile / route)",
  court_and_hearing: "Court, hearing, and police-station-adjacent lines",
  disclosure_chase: "Disclosure chase",
  thin_bundle_honesty: "Thin bundle honesty",
  profile_leakage: "Profile leakage and malformed anchors",
};

const MAX_EXAMPLES_PER_CHECK = 3;

function emptySectionCounts(): SectionCounts {
  return {
    routing_mismatch: 0,
    court_and_hearing: 0,
    disclosure_chase: 0,
    thin_bundle_honesty: 0,
    profile_leakage: 0,
  };
}

function buildSummary(
  playbacks: CorpusCasePlayback[],
  orgId: string,
  previous: PlaybackSummary | null,
): PlaybackSummary {
  const corpusBucketCounts = { A: 0, B: 0, C: 0 };
  const rosterCounts = { A: 0, B: 0, C: 0 };
  const sectionCounts = emptySectionCounts();
  const sectionCountsRoster = emptySectionCounts();
  const checkCounts: Record<string, number> = {};
  let unsafeCount = 0;
  let needsReviewCount = 0;
  let rosterUnsafeCount = 0;
  let rosterNeedsReviewCount = 0;

  for (const p of playbacks) {
    corpusBucketCounts[p.corpusBucket] += 1;
    if (isProductionScoredBucket(p.corpusBucket)) rosterCounts[p.corpusBucket] += 1;
    for (const f of p.findings) {
      sectionCounts[f.section] += 1;
      if (isProductionScoredBucket(p.corpusBucket)) sectionCountsRoster[f.section] += 1;
      checkCounts[f.checkId] = (checkCounts[f.checkId] ?? 0) + 1;
      if (f.severity === "unsafe") unsafeCount += 1;
      else needsReviewCount += 1;
      if (isProductionScoredBucket(p.corpusBucket)) {
        if (f.severity === "unsafe") rosterUnsafeCount += 1;
        else rosterNeedsReviewCount += 1;
      }
    }
  }

  const deltaChecks: Record<string, number> = {};
  if (previous?.checkCounts) {
    const keys = new Set([...Object.keys(previous.checkCounts), ...Object.keys(checkCounts)]);
    for (const k of keys) {
      deltaChecks[k] = (checkCounts[k] ?? 0) - (previous.checkCounts[k] ?? 0);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    orgId,
    totalCases: playbacks.length,
    corpusBucketCounts,
    rosterCounts,
    sectionCounts,
    sectionCountsRoster,
    checkCounts,
    unsafeCount,
    needsReviewCount,
    rosterUnsafeCount,
    rosterNeedsReviewCount,
    previousRunAt: previous?.generatedAt ?? null,
    deltaChecks,
    deltaRosterUnsafe: previous ? rosterUnsafeCount - (previous.rosterUnsafeCount ?? 0) : undefined,
  };
}

function groupFindings(
  playbacks: CorpusCasePlayback[],
  rosterOnly: boolean,
): Map<string, Array<{ playback: CorpusCasePlayback; finding: PlaybackFinding }>> {
  const map = new Map<string, Array<{ playback: CorpusCasePlayback; finding: PlaybackFinding }>>();
  for (const p of playbacks) {
    if (rosterOnly && !isProductionScoredBucket(p.corpusBucket)) continue;
    for (const f of p.findings) {
      const key = `${f.section}|${f.checkId}`;
      const list = map.get(key) ?? [];
      list.push({ playback: p, finding: f });
      map.set(key, list);
    }
  }
  return map;
}

function writeSectionMd(
  filePath: string,
  section: PlaybackSection,
  playbacks: CorpusCasePlayback[],
  rosterOnly: boolean,
): void {
  const grouped = groupFindings(playbacks, rosterOnly);
  const lines = [
    `# ${SECTION_TITLES[section]}`,
    "",
    rosterOnly ? "_Production roster (A+B) only._" : "_Full corpus._",
    "",
  ];

  const sectionKeys = [...grouped.keys()].filter((k) => k.startsWith(`${section}|`)).sort();
  if (sectionKeys.length === 0) {
    lines.push("_No findings in this section._", "");
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    return;
  }

  for (const key of sectionKeys) {
    const entries = grouped.get(key)!;
    const checkId = key.split("|")[1]!;
    lines.push(`## ${checkId}`, "");
    lines.push(`Total: **${entries.length}**`, "");
    for (const ex of entries.slice(0, MAX_EXAMPLES_PER_CHECK)) {
      lines.push(`### ${ex.playback.caseTitle}`, "");
      lines.push(`- **caseId:** \`${ex.playback.caseId}\` (${ex.playback.corpusBucket})`);
      lines.push(`- **severity:** ${ex.finding.severity}`);
      lines.push(`- **message:** ${ex.finding.message}`);
      lines.push(`- **snippet:** ${ex.finding.snippet}`, "");
    }
    if (entries.length > MAX_EXAMPLES_PER_CHECK) {
      lines.push(`_…and ${entries.length - MAX_EXAMPLES_PER_CHECK} more (see case JSON)._`, "");
    }
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

function write00Summary(outDir: string, summary: PlaybackSummary): void {
  const lines = [
    "# CaseBrain corpus playback — summary",
    "",
    `Generated: ${summary.generatedAt}`,
    `Org: ${summary.orgId}`,
    `Cases scanned: **${summary.totalCases}**`,
    "",
    "## Corpus buckets",
    "",
    `| A | B | C |`,
    `|--:|--:|--:|`,
    `| ${summary.corpusBucketCounts.A} | ${summary.corpusBucketCounts.B} | ${summary.corpusBucketCounts.C} |`,
    "",
    "## Production roster (A+B)",
    "",
    `Cases: **${summary.rosterCounts.A + summary.rosterCounts.B}** (A=${summary.rosterCounts.A}, B=${summary.rosterCounts.B})`,
    "",
    "## Findings (full corpus)",
    "",
    `| Section | Count |`,
    `|---------|------:|`,
  ];

  for (const [section, title] of Object.entries(SECTION_TITLES)) {
    lines.push(
      `| ${title} | ${summary.sectionCounts[section as PlaybackSection]} |`,
    );
  }

  lines.push("", "## Findings (roster A+B only)", "", `| Section | Count |`, `|---------|------:|`);
  for (const [section, title] of Object.entries(SECTION_TITLES)) {
    lines.push(
      `| ${title} | ${summary.sectionCountsRoster[section as PlaybackSection]} |`,
    );
  }

  lines.push(
    "",
    `**Unsafe:** ${summary.unsafeCount} · **Needs review:** ${summary.needsReviewCount}`,
    "",
    `**Roster A+B unsafe:** ${summary.rosterUnsafeCount} · **Roster needs review:** ${summary.rosterNeedsReviewCount}`,
    "",
  );

  if (summary.previousRunAt) {
    lines.push("## Delta vs previous run", "", `Previous: ${summary.previousRunAt}`, "");
    const deltas = Object.entries(summary.deltaChecks).filter(([, d]) => d !== 0);
    if (deltas.length === 0) lines.push("_No check count changes._", "");
    else {
      for (const [k, d] of deltas.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 20)) {
        lines.push(`- \`${k}\`: ${d > 0 ? "+" : ""}${d}`);
      }
    }
    lines.push("");
  }

  lines.push(
    "_Playback uses pilot-mode product path (battleboard + filters). Not PDF OCR truth. Artifacts are gitignored._",
    "",
  );

  fs.writeFileSync(path.join(outDir, "00-summary.md"), lines.join("\n"), "utf8");
}

export function writeCorpusPlaybackArtifacts(
  artifactRoot: string,
  playbacks: CorpusCasePlayback[],
  orgId: string,
): { outDir: string; summary: PlaybackSummary } {
  const outDir = path.join(artifactRoot, "latest", CORPUS_PLAYBACK_SLUG);
  fs.mkdirSync(outDir, { recursive: true });

  let previous: PlaybackSummary | null = null;
  const prevPath = path.join(outDir, "playback-summary.json");
  if (fs.existsSync(prevPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(prevPath, "utf8")) as PlaybackSummary;
    } catch {
      previous = null;
    }
  }

  const summary = buildSummary(playbacks, orgId, previous);
  fs.writeFileSync(prevPath, JSON.stringify(summary, null, 2), "utf8");

  write00Summary(outDir, summary);

  for (const [section, file] of Object.entries(SECTION_FILES)) {
    writeSectionMd(path.join(outDir, file), section as PlaybackSection, playbacks, false);
  }

  const casesDir = path.join(outDir, "cases");
  fs.mkdirSync(casesDir, { recursive: true });
  for (const p of playbacks) {
    const reviewFields = {
      canPromoteToConfirmed: false as const,
      needsHumanConfirmation: true,
      playbackReviewNote:
        p.findings.some((f) => f.checkId.startsWith("routing.")) ?
          "Routing/charge uncertainty — human confirmation required for real case."
        : undefined,
    };
    fs.writeFileSync(
      path.join(casesDir, `${p.caseId}.json`),
      JSON.stringify({ ...p, review: reviewFields }, null, 2),
      "utf8",
    );
  }

  writeCorpusPlaybackSprintArtifacts(outDir, playbacks, summary, {
    rosterUnsafeBaseline: previous?.rosterUnsafeCount,
    learningLogLines: [
      "Playback check tuning: lineLooksOverconfident ignores safe ‘do not overstate’ guidance.",
      "Leakage scans limited to solicitor-visible surfaces (not collapse-risk pool).",
      "inferFamilyFromRouteTitle: public-order routes map to violence, not robbery via ‘identification’.",
      "pickWorkflowPrimaryRoute: family pack_y routes preferred over multiparty meta routes.",
      "offence_label merges all charge rows for mixed-count inference.",
    ],
  });

  return { outDir, summary };
}

export { CORPUS_PLAYBACK_SLUG };
