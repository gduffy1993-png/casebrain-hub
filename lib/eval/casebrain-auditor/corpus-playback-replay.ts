import fs from "node:fs";
import path from "node:path";
import { runCorpusPlaybackChecks } from "./corpus-playback-checks";
import { writeCorpusPlaybackArtifacts } from "./corpus-playback-report";
import type { CorpusCasePlayback } from "./corpus-playback-types";

export const CORPUS_PLAYBACK_REPLAY_SLUG = "corpus-playback-replay";

export function loadPlaybackSnapshots(casesDir: string): CorpusCasePlayback[] {
  if (!fs.existsSync(casesDir)) return [];
  const out: CorpusCasePlayback[] = [];
  for (const file of fs.readdirSync(casesDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8")) as CorpusCasePlayback & {
        review?: unknown;
      };
      const { review: _r, findings: _f, ...rest } = raw;
      out.push({ ...rest, findings: [] });
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Re-run playback checks on frozen case JSON (no battleboard rebuild). */
export function replayPlaybackChecksFromSnapshots(
  snapshots: CorpusCasePlayback[],
): CorpusCasePlayback[] {
  return snapshots.map((p) => ({
    ...p,
    findings: runCorpusPlaybackChecks(p),
  }));
}

export function runReplayLatestChecks(opts: {
  artifactRoot: string;
  orgId: string;
  sourceSlug?: string;
  quietConsole?: boolean;
}): { outDir: string; playbacks: CorpusCasePlayback[] } {
  const sourceSlug = opts.sourceSlug ?? "corpus-playback";
  const casesDir = path.join(opts.artifactRoot, "latest", sourceSlug, "cases");
  const snapshots = loadPlaybackSnapshots(casesDir);
  if (!snapshots.length) {
    throw new Error(`No snapshots in ${casesDir} — run full playback first.`);
  }
  const playbacks = replayPlaybackChecksFromSnapshots(snapshots);
  const { outDir, summary } = writeCorpusPlaybackArtifacts(opts.artifactRoot, playbacks, opts.orgId, {
    slug: CORPUS_PLAYBACK_REPLAY_SLUG,
    skipSprint: true,
  });
  if (!opts.quietConsole) {
    console.log(`Replay (check-only): ${playbacks.length} cases from ${sourceSlug}`);
    console.log(`Unsafe: ${summary.unsafeCount} | Needs review: ${summary.needsReviewCount}`);
    console.log(`Out: ${outDir}`);
  }
  return { outDir, playbacks };
}
