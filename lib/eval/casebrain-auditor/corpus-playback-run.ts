import { collectCorpusCasePlayback } from "./corpus-playback-collector";
import { fetchRealCaseRows, type RealCaseRow } from "./real-case-collector";
import { writeCorpusPlaybackArtifacts, CORPUS_PLAYBACK_SLUG } from "./corpus-playback-report";
import type { CorpusCasePlayback } from "./corpus-playback-types";
import type { UserRoleMode } from "./types";

export type CorpusPlaybackRunOptions = {
  outDir: string;
  orgId: string;
  maxCases: number;
  chunkSize: number;
  userRole: UserRoleMode;
  quietConsole?: boolean;
  caseTimeoutMs?: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${ms}ms: ${label}`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function runCorpusPlaybackScan(
  opts: CorpusPlaybackRunOptions,
): Promise<{ outDir: string; playbacks: CorpusCasePlayback[]; rows: RealCaseRow[] }> {
  const playbacks: CorpusCasePlayback[] = [];
  const allRows: RealCaseRow[] = [];
  let offset = 0;
  let chunkIndex = 0;
  const timeout = opts.caseTimeoutMs ?? 120_000;

  while (allRows.length < opts.maxCases) {
    const limit = Math.min(opts.chunkSize, opts.maxCases - allRows.length);
    if (!opts.quietConsole) {
      console.log(`[playback] Chunk ${chunkIndex + 1}: offset=${offset} limit=${limit}`);
    }

    const { rows } = await fetchRealCaseRows(opts.orgId, { limit, offset, criminalOnly: true });
    if (rows.length === 0) break;

    for (const row of rows) {
      try {
        const pb = await withTimeout(
          collectCorpusCasePlayback(row, opts.orgId, { userRole: opts.userRole }),
          timeout,
          row.caseId,
        );
        if (pb) playbacks.push(pb);
      } catch (err) {
        if (!opts.quietConsole) {
          console.warn(`[playback] skip ${row.caseId}: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    allRows.push(...rows);
    offset += limit;
    chunkIndex += 1;
    if (rows.length < limit) break;
  }

  const { outDir, summary } = writeCorpusPlaybackArtifacts(opts.outDir, playbacks, opts.orgId);

  if (!opts.quietConsole) {
    console.log("");
    console.log(`Corpus playback: ${outDir}`);
    console.log(`Cases: ${playbacks.length} | Unsafe: ${summary.unsafeCount} | Needs review: ${summary.needsReviewCount}`);
    console.log(
      `Roster A+B findings: ${Object.values(summary.sectionCountsRoster).reduce((a, b) => a + b, 0)}`,
    );
  }

  return { outDir, playbacks, rows: allRows };
}

/** Second pass: build playback from rows already collected in a batch (no re-fetch list). */
export async function runCorpusPlaybackFromRows(
  rows: RealCaseRow[],
  opts: Omit<CorpusPlaybackRunOptions, "maxCases" | "chunkSize">,
): Promise<{ outDir: string; playbacks: CorpusCasePlayback[] }> {
  const playbacks: CorpusCasePlayback[] = [];
  const timeout = opts.caseTimeoutMs ?? 120_000;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (!opts.quietConsole && i % 50 === 0) {
      console.log(`[playback] Case ${i + 1}/${rows.length}`);
    }
    try {
      const pb = await withTimeout(
        collectCorpusCasePlayback(row, opts.orgId, { userRole: opts.userRole }),
        timeout,
        row.caseId,
      );
      if (pb) playbacks.push(pb);
    } catch {
      /* skip */
    }
  }

  const { outDir } = writeCorpusPlaybackArtifacts(opts.outDir, playbacks, opts.orgId);
  return { outDir, playbacks };
}

export { CORPUS_PLAYBACK_SLUG };
