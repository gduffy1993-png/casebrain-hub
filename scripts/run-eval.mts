/**
 * Local defence-plan-chat eval runner (file-based; does not touch API route code).
 *
 * API contract: POST body uses **message** (the route expects `message`, not `question`).
 *
 * Auth: set `EVAL_COOKIE` to your browser Cookie while logged in (e.g. __session=...),
 *       or requests return 401.
 *
 * Usage:
 *   EVAL_COOKIE="..." npx tsx scripts/run-eval.mts
 *   EVAL_COOKIE="..." npx tsx scripts/run-eval.mts --watch
 *
 * Env:
 *   EVAL_BASE_URL  (default http://localhost:3000)
 *   EVAL_COOKIE    session cookie string
 *   EVAL_BATCH_DELAY_MS  delay between 3-request batches (default 150)
 */

import { execSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Replace slots 6–40 with your real Supabase case UUIDs before a full production eval. */
const CASE_IDS: string[] = [
  "69a1f87b-901f-4457-9c37-1b959160ebc1",
  "0dbb6ec9-5d94-4141-9370-7ca525b7669b",
  "774c7346-b422-4c6a-abc0-10d1218bc36e",
  "b8df9313-1296-4f0b-8f66-c52f9f3e5a8c",
  "b535cea2-aa7d-4cb8-81a9-c2f105f36c61",
  ...Array.from({ length: 35 }, (_, i) => {
    const n = String(i + 1).padStart(12, "0");
    return `00000000-0000-4000-8000-${n}`;
  }),
];

const QUESTIONS: readonly string[] = [
  "What is the primary allegation in one sentence using only bundle wording?",
  "What is the single biggest weakness in the prosecution case?",
  "What is the single biggest weakness in the defence case?",
  "What should be done in the next 24 hours?",
] as const;

const QUESTION_KEYS = ["Q1", "Q8", "Q9", "Q10"] as const;
type QuestionKey = (typeof QUESTION_KEYS)[number];

const BASE_URL = (process.env.EVAL_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE = process.env.EVAL_COOKIE ?? "";
const BATCH_DELAY_MS = Math.max(0, parseInt(process.env.EVAL_BATCH_DELAY_MS ?? "150", 10) || 0);
const CONCURRENCY = 3;
const WATCH_INTERVAL_MS = 5 * 60 * 1000;

type CaseEvalRow = {
  caseId: string;
  results: Record<QuestionKey, string>;
};

function getVersionSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FlatTask = { caseId: string; key: QuestionKey; question: string };

function buildTasks(): FlatTask[] {
  const tasks: FlatTask[] = [];
  for (const caseId of CASE_IDS) {
    for (let i = 0; i < QUESTIONS.length; i++) {
      tasks.push({
        caseId,
        key: QUESTION_KEYS[i]!,
        question: QUESTIONS[i]!,
      });
    }
  }
  return tasks;
}

async function postQuestion(caseId: string, question: string): Promise<string> {
  const url = `${BASE_URL}/api/criminal/${caseId}/defence-plan-chat`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (COOKIE) {
    headers.Cookie = COOKIE;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: question }),
  });

  let data: { ok?: boolean; reply?: string; error?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return `[eval parse error] HTTP ${res.status}`;
  }

  if (data.ok && typeof data.reply === "string") {
    return data.reply;
  }

  return `[eval error] HTTP ${res.status} ${data.error ?? JSON.stringify(data)}`;
}

async function runEvalOnce(version: string): Promise<{ rows: CaseEvalRow[]; outfile: string }> {
  const tasks = buildTasks();
  const acc = new Map<string, Partial<Record<QuestionKey, string>>>();

  for (const id of CASE_IDS) {
    acc.set(id, { Q1: "", Q8: "", Q9: "", Q10: "" });
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const answers = await Promise.all(
      batch.map(async (t) => {
        const text = await postQuestion(t.caseId, t.question);
        return { ...t, text };
      })
    );
    for (const a of answers) {
      const row = acc.get(a.caseId)!;
      row[a.key] = a.text;
    }
    if (BATCH_DELAY_MS > 0 && i + CONCURRENCY < tasks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const rows: CaseEvalRow[] = CASE_IDS.map((caseId) => {
    const partial = acc.get(caseId)!;
    return {
      caseId,
      results: {
        Q1: partial.Q1 ?? "",
        Q8: partial.Q8 ?? "",
        Q9: partial.Q9 ?? "",
        Q10: partial.Q10 ?? "",
      },
    };
  });

  const outDir = path.join(__dirname, "..", "out");
  await mkdir(outDir, { recursive: true });
  const outfile = path.join(outDir, `eval-${version}.json`);
  await writeFile(outfile, JSON.stringify(rows, null, 2), "utf8");

  return { rows, outfile };
}

function scanPatterns(rows: CaseEvalRow[]): {
  phraseCounts: Record<string, number>;
  missingPressurePoint: number;
  missingProsecutionExploit: number;
  missingThisMatters: number;
} {
  const phrasePatterns = [
    { label: "partial account", re: /partial account/gi },
    { label: "adverse inference", re: /adverse inference/gi },
    { label: "Crown can still rely on", re: /crown can still rely on/gi },
    { label: "This matters because", re: /this matters because/gi },
  ] as const;

  const phraseCounts: Record<string, number> = {};
  for (const p of phrasePatterns) {
    phraseCounts[p.label] = 0;
  }

  let missingPressurePoint = 0;
  let missingProsecutionExploit = 0;
  let missingThisMatters = 0;

  for (const row of rows) {
    const q8 = row.results.Q8;
    const q9 = row.results.Q9;
    const q10 = row.results.Q10;

    const allText = `${row.results.Q1}\n${q8}\n${q9}\n${q10}`;

    for (const p of phrasePatterns) {
      const m = allText.match(p.re);
      phraseCounts[p.label] += m?.length ?? 0;
    }

    if (!/\bpressure point:/i.test(q8)) {
      missingPressurePoint++;
    }
    if (!/\bprosecution exploit:/i.test(q9)) {
      missingProsecutionExploit++;
    }
    if (!/\bthis matters because:/i.test(q10)) {
      missingThisMatters++;
    }
  }

  return { phraseCounts, missingPressurePoint, missingProsecutionExploit, missingThisMatters };
}

function printSummary(
  version: string,
  phraseCounts: Record<string, number>,
  missingPressurePoint: number,
  missingProsecutionExploit: number,
  missingThisMatters: number,
  caseCount: number
): void {
  console.log("");
  console.log("----------------------------------");
  console.log("EVAL SUMMARY");
  console.log("----------------------------------");
  console.log("");
  console.log(`Version: ${version}`);
  console.log("");
  console.log("Repetition (phrase occurrences across all answer text):");
  console.log(`- partial account: ${phraseCounts["partial account"] ?? 0} times`);
  console.log(`- adverse inference: ${phraseCounts["adverse inference"] ?? 0} times`);
  console.log(`- Crown can still rely on: ${phraseCounts["Crown can still rely on"] ?? 0} times`);
  console.log(`- This matters because: ${phraseCounts["This matters because"] ?? 0} times`);
  console.log("");
  console.log("Structure failures (per-case, answer missing expected label):");
  console.log(`- missing Pressure point (in Q8): ${missingPressurePoint} / ${caseCount}`);
  console.log(`- missing Prosecution exploit (in Q9): ${missingProsecutionExploit} / ${caseCount}`);
  console.log(`- missing This matters because (in Q10): ${missingThisMatters} / ${caseCount}`);
  console.log("");
  console.log("----------------------------------");
  console.log("");
}

async function main(): Promise<void> {
  const watch = process.argv.includes("--watch");
  const version = getVersionSha();

  if (!COOKIE) {
    console.warn("[run-eval] EVAL_COOKIE not set — expect 401 unless your route allows unauthenticated calls.");
  }

  const run = async () => {
    const { rows, outfile } = await runEvalOnce(version);
    console.log(`[run-eval] Wrote ${outfile}`);

    const { phraseCounts, missingPressurePoint, missingProsecutionExploit, missingThisMatters } =
      scanPatterns(rows);

    printSummary(version, phraseCounts, missingPressurePoint, missingProsecutionExploit, missingThisMatters, rows.length);
  };

  if (watch) {
    console.log(`[run-eval] Watch mode: every ${WATCH_INTERVAL_MS / 60000} minutes (Ctrl+C to stop)`);
    while (true) {
      await run();
      await sleep(WATCH_INTERVAL_MS);
    }
  } else {
    await run();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
