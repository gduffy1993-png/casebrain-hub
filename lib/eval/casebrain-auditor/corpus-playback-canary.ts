import fs from "node:fs";
import path from "node:path";
import { isProductionScoredBucket } from "./corpus-bucket";
import { runCorpusPlaybackChecks } from "./corpus-playback-checks";
import { collectCorpusCasePlayback } from "./corpus-playback-collector";
import { loadPlaybackSnapshots, replayPlaybackChecksFromSnapshots } from "./corpus-playback-replay";
import { writeCorpusPlaybackArtifacts } from "./corpus-playback-report";
import { fetchRealCaseRowsByIds } from "./real-case-collector";
import type { CorpusCasePlayback } from "./corpus-playback-types";
import type { UserRoleMode } from "./types";

export const CORPUS_PLAYBACK_CANARY_SLUG = "corpus-playback-canary";
export const CANARY_PACK_FILENAME = "canary-pack.json";

const PRIORITY_FINGERPRINTS = [
  "routing.unknown_with_metadata",
  "anchor.malformed",
  "routing.charge_vs_route_family",
  "routing.charge_vs_workflow_profile",
  "routing.charge_vs_workflow_profile",
  "routing.generic_with_charge_family",
  "chase.wrong_family_label",
  "chase.duplicate_label",
  "profile_leakage.pwits_fraud",
  "profile_leakage.violence_pwits",
  "profile_leakage.violence_fraud",
  "profile_leakage.fraud_cctv",
  "profile_leakage.pwits_cctv",
  "court.overconfident_wording",
  "hearing.overconfident_wording",
  "police.unsupported_interview",
  "thin_bundle.overconfident",
];

export type CanaryPack = {
  generatedAt: string;
  sourcePlaybackAt: string | null;
  caseIds: string[];
  reasons: Record<string, string[]>;
};

function caseSeverityRank(p: CorpusCasePlayback): number {
  const unsafe = p.findings.filter((f) => f.severity === "unsafe").length;
  const review = p.findings.length - unsafe;
  const roster = isProductionScoredBucket(p.corpusBucket) ? 1000 : 0;
  return roster + unsafe * 10 + review;
}

export function buildCanaryPackFromPlaybacks(
  playbacks: CorpusCasePlayback[],
  sourcePlaybackAt: string | null,
): CanaryPack {
  const selected = new Map<string, string[]>();
  const add = (caseId: string, reason: string) => {
    const list = selected.get(caseId) ?? [];
    if (!list.includes(reason)) list.push(reason);
    selected.set(caseId, list);
  };

  for (const p of playbacks) {
    if (isProductionScoredBucket(p.corpusBucket)) add(p.caseId, "production_roster");
  }

  const byCheck = new Map<string, CorpusCasePlayback[]>();
  for (const p of playbacks) {
    for (const f of p.findings) {
      const list = byCheck.get(f.checkId) ?? [];
      list.push(p);
      byCheck.set(f.checkId, list);
    }
  }

  const fingerprintOrder = [
    ...new Set([
      ...PRIORITY_FINGERPRINTS,
      ...[...byCheck.keys()].filter((k) => {
        const cases = byCheck.get(k)!;
        return cases.some((p) => p.findings.find((f) => f.checkId === k && f.severity === "unsafe"));
      }),
      ...[...byCheck.keys()].filter((k) => {
        const cases = byCheck.get(k)!;
        return cases.some((p) => p.findings.find((f) => f.checkId === k && f.severity === "needs_review"));
      }),
    ]),
  ];

  for (const checkId of fingerprintOrder) {
    const cases = byCheck.get(checkId);
    if (!cases?.length) continue;
    const sorted = [...cases].sort((a, b) => caseSeverityRank(b) - caseSeverityRank(a));
    const isUnsafe = checkId.includes("unsafe") || sorted[0]?.findings.some((f) => f.checkId === checkId && f.severity === "unsafe");
    const limit = PRIORITY_FINGERPRINTS.includes(checkId) ? 3 : isUnsafe ? 3 : 2;
    for (const p of sorted.slice(0, limit)) {
      add(p.caseId, checkId);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourcePlaybackAt,
    caseIds: [...selected.keys()],
    reasons: Object.fromEntries(selected),
  };
}

export function writeCanaryPack(artifactRoot: string, pack: CanaryPack): string {
  const outDir = path.join(artifactRoot, "latest", "corpus-playback");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, CANARY_PACK_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), "utf8");
  return filePath;
}

export function readCanaryPack(artifactRoot: string): CanaryPack | null {
  const filePath = path.join(artifactRoot, "latest", "corpus-playback", CANARY_PACK_FILENAME);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as CanaryPack;
  } catch {
    return null;
  }
}

export async function runCanaryPlaybackLive(opts: {
  artifactRoot: string;
  orgId: string;
  userRole: UserRoleMode;
  caseIds?: string[];
  quietConsole?: boolean;
}): Promise<{ outDir: string; playbacks: CorpusCasePlayback[]; pack: CanaryPack }> {
  const playbackDir = path.join(opts.artifactRoot, "latest", "corpus-playback");
  let pack = readCanaryPack(opts.artifactRoot);
  if (!pack || opts.caseIds?.length) {
    const snapshots = loadPlaybackSnapshots(path.join(playbackDir, "cases"));
    const summaryPath = path.join(playbackDir, "playback-summary.json");
    let sourceAt: string | null = null;
    if (fs.existsSync(summaryPath)) {
      try {
        sourceAt = (JSON.parse(fs.readFileSync(summaryPath, "utf8")) as { generatedAt?: string }).generatedAt ?? null;
      } catch {
        sourceAt = null;
      }
    }
    const sourcePlaybacks =
      snapshots.length > 0 ?
        snapshots.map((s) => ({ ...s, findings: runCorpusPlaybackChecks(s) }))
      : [];
    if (!sourcePlaybacks.length) {
      throw new Error("No playback snapshots — run full corpus-playback first.");
    }
    pack = buildCanaryPackFromPlaybacks(sourcePlaybacks, sourceAt);
    if (opts.caseIds?.length) {
      pack.caseIds = [...new Set([...pack.caseIds, ...opts.caseIds])];
    }
    writeCanaryPack(opts.artifactRoot, pack);
  }

  const rows = await fetchRealCaseRowsByIds(opts.orgId, pack.caseIds);
  const playbacks: CorpusCasePlayback[] = [];
  for (const row of rows) {
    try {
      const pb = await collectCorpusCasePlayback(row, opts.orgId, { userRole: opts.userRole });
      if (pb) playbacks.push(pb);
    } catch (err) {
      if (!opts.quietConsole) {
        console.warn(`[canary] skip ${row.caseId}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  const { outDir, summary } = writeCorpusPlaybackArtifacts(opts.artifactRoot, playbacks, opts.orgId, {
    slug: CORPUS_PLAYBACK_CANARY_SLUG,
    skipSprint: true,
  });

  if (!opts.quietConsole) {
    console.log(`Canary pack: ${pack.caseIds.length} ids | Collected: ${playbacks.length}`);
    console.log(`Canary playback: ${outDir}`);
    console.log(
      `Unsafe: ${summary.unsafeCount} | Needs review: ${summary.needsReviewCount} | Roster unsafe: ${summary.rosterUnsafeCount}`,
    );
  }

  return { outDir, playbacks, pack };
}

export function runCanaryReplayChecks(opts: {
  artifactRoot: string;
  orgId: string;
}): { outDir: string; playbacks: CorpusCasePlayback[]; pack: CanaryPack } {
  const pack = readCanaryPack(opts.artifactRoot);
  if (!pack) throw new Error("canary-pack.json missing — build from full playback first.");

  const fullCasesDir = path.join(opts.artifactRoot, "latest", "corpus-playback", "cases");
  const all = loadPlaybackSnapshots(fullCasesDir);
  const idSet = new Set(pack.caseIds);
  const snapshots = all.filter((p) => idSet.has(p.caseId));
  const playbacks = replayPlaybackChecksFromSnapshots(snapshots);

  const { outDir, summary } = writeCorpusPlaybackArtifacts(opts.artifactRoot, playbacks, opts.orgId, {
    slug: CORPUS_PLAYBACK_CANARY_SLUG,
    skipSprint: true,
  });

  console.log(`Canary replay (frozen): ${playbacks.length} cases`);
  console.log(
    `Unsafe: ${summary.unsafeCount} | Needs review: ${summary.needsReviewCount} | Roster unsafe: ${summary.rosterUnsafeCount}`,
  );
  return { outDir, playbacks, pack };
}
