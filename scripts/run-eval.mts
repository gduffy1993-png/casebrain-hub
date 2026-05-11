/**
 * Local defence-plan-chat eval runner: loads questions from eval/config/questions.json or EVAL_QUESTIONS_PATH,
 * runs every question for every case, writes evals/dataset.json.
 *
 * Score the dataset: npx tsx scripts/score-eval.mts
 *
 * IMPORTANT — POST body field name:
 *   The route reads **body.message** only (`question` is ignored → "message is required" → empty/error).
 *   This runner sends `{ message: "<question text>" }`.
 *
 * Auth:
 *   Set EVAL_COOKIE to the **full** Cookie header from DevTools while logged in on the **same host**
 *   as EVAL_BASE_URL (localhost vs production cookies differ).
 *
 * The app must be running first (e.g. `npm run dev` on :3000), or you will get ECONNREFUSED.
 *
 * Usage:
 *   EVAL_COOKIE="..." npx tsx scripts/run-eval.mts
 *   EVAL_DEBUG=1 EVAL_COOKIE="..." npx tsx scripts/run-eval.mts
 *   npx tsx scripts/run-eval.mts --verbose
 *
 * Case list:
 *   Loads real case UUIDs via GET /api/cases (same auth cookie). All cases by default; optional EVAL_MAX_CASES caps.
 *
 * Defence-plan chat (dev): send **x-eval: 1** — org is resolved from the case row; no Clerk cookie needed.
 * GET /api/cases still needs **EVAL_ORG_ID** in `.env.local` when not sending a session cookie.
 * Use **EVAL_ALLOW_NO_COOKIE=1** when running without **EVAL_COOKIE**.
 *
 * Env:
 *   EVAL_BASE_URL          (default http://localhost:3000)
 *   EVAL_COOKIE            required unless EVAL_ALLOW_NO_COOKIE=1 (bypass above still needs server env)
 *   EVAL_MAX_CASES         optional max cases after fetch (omit for all cases)
 *   EVAL_DEBUG / EVAL_VERBOSE  log raw HTTP body snippets (see below)
 *   EVAL_RAW_LOG_MAX       max responses to log (default 8)
 *   EVAL_BATCH_DELAY_MS    extra delay between concurrent batches (default 400); each POST also waits after (EVAL_REQUEST_GAP_MS)
 *   EVAL_REQUEST_GAP_MS    pause after each completed POST (default 2000; lower only if stable)
 *   EVAL_CONCURRENCY       parallel POSTs (default 1; use 2–3 only if stable)
 *   EVAL_ALLOW_NO_COOKIE   set to "1" to skip cookie check (expect 401s)
 *   EVAL_RUN_HOURS         if > 0, repeat eval passes until duration elapses (append-only dataset).
 *                          Default 0 = single pass (backward compatible).
 *   EVAL_QUESTIONS_PATH    optional path to questions JSON (relative to repo root or absolute); default eval/config/questions.json
 *
 * Stable multi-hour harvest (PowerShell example — set EVAL_COOKIE locally):
 *   $env:EVAL_RUN_HOURS = "8"
 *   $env:EVAL_CONCURRENCY = "1"
 *   $env:EVAL_REQUEST_GAP_MS = "2000"
 *   $env:EVAL_BATCH_DELAY_MS = "400"
 *   $env:EVAL_QUESTIONS_PATH = "eval/config/questions.harvest.json"
 *   npx tsx scripts/run-eval.mts
 */

import { existsSync } from "fs";
import { execSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { sortCasesForEvalScan } from "../lib/eval-case-sort";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

function resolveQuestionsPath(): string {
  const raw = process.env.EVAL_QUESTIONS_PATH?.trim();
  if (!raw) return path.join(repoRoot, "eval", "config", "questions.json");
  return path.isAbsolute(raw) ? raw : path.resolve(repoRoot, raw);
}

const QUESTIONS_PATH = resolveQuestionsPath();
const DATASET_PATH = path.join(__dirname, "..", "evals", "dataset.json");

type DatasetRow = {
  case_id: string;
  question: string;
  answer: string;
  timestamp: string;
};

const BASE_URL = (process.env.EVAL_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE_RAW = process.env.EVAL_COOKIE ?? "";
const COOKIE = COOKIE_RAW.trim();
const ALLOW_NO_COOKIE = process.env.EVAL_ALLOW_NO_COOKIE === "1";
const BATCH_DELAY_MS = Math.max(0, parseInt(process.env.EVAL_BATCH_DELAY_MS ?? "400", 10) || 0);
/** Parallel defence-plan-chat POSTs (default 1 to avoid OpenAI 429 / overload). Override with EVAL_CONCURRENCY. */
const CONCURRENCY = Math.max(1, parseInt(process.env.EVAL_CONCURRENCY ?? "1", 10) || 1);
const WATCH_INTERVAL_MS = 5 * 60 * 1000;

const DEBUG =
  process.env.EVAL_DEBUG === "1" ||
  process.env.EVAL_VERBOSE === "1" ||
  process.argv.includes("--verbose");
const RAW_LOG_MAX = Math.max(0, parseInt(process.env.EVAL_RAW_LOG_MAX ?? "8", 10) || 0);

/** Hours to keep looping (0 = one pass only). Set EVAL_RUN_HOURS=8 for overnight collection. */
const RUN_HOURS = Math.max(0, parseFloat(process.env.EVAL_RUN_HOURS ?? "0") || 0);

/** Delay between full eval passes in long-run mode (ms). */
const LONG_RUN_PASS_DELAY_MS = 2000;

/** Pause after each defence-plan-chat request completes (success or give-up). */
const REQUEST_GAP_MS = Math.max(0, parseInt(process.env.EVAL_REQUEST_GAP_MS ?? "2000", 10) || 0);

/** Pause before retrying a failed defence-plan-chat HTTP response. */
const POST_RETRY_DELAY_MS = 4000;

/** Retries after the first attempt (1 + POST_MAX_RETRIES attempts total). */
const POST_MAX_RETRIES = 4;

function shouldRetryDefenceChatResponse(res: Response): boolean {
  return !res.ok || res.status >= 500 || res.status === 429;
}

function retryBackoffMs(res: Response, attempt: number): number {
  if (res.status === 429) {
    return Math.min(60_000, 6000 * attempt);
  }
  return POST_RETRY_DELAY_MS;
}

async function loadQuestions(): Promise<string[]> {
  const raw = await readFile(QUESTIONS_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((q) => typeof q === "string")) {
    throw new Error(`[run-eval] ${QUESTIONS_PATH} must be a JSON array of strings`);
  }
  return parsed as string[];
}

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

/** Random prompt variation for the same underlying intent (sent to the API as `message`). */
function pickQuestionVariation(q: string): string {
  const variations = [
    q,
    q.replace("What is", "Where is"),
    q.replace("What is", "How does"),
    q.replace("What is", "Explain"),
    q.replace("What should", "What needs to"),
    q.replace("What", "Identify"),
  ];
  return variations[Math.floor(Math.random() * variations.length)]!;
}

async function loadExistingDatasetRows(): Promise<DatasetRow[]> {
  if (!existsSync(DATASET_PATH)) return [];
  try {
    const raw = await readFile(DATASET_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DatasetRow[];
  } catch {
    console.warn("[run-eval] Could not read/parse existing dataset; treating as empty.");
    return [];
  }
}

/**
 * Append-only persistence: never overwrites prior rows.
 * Logs every 50 rows reached in the combined file (e.g. 50, 100, …).
 */
async function appendRowsToDataset(newRows: DatasetRow[]): Promise<void> {
  if (newRows.length === 0) return;
  const existing = await loadExistingDatasetRows();
  const prev = existing.length;
  const merged = [...existing, ...newRows];
  const outDir = path.dirname(DATASET_PATH);
  await mkdir(outDir, { recursive: true });
  await writeFile(DATASET_PATH, JSON.stringify(merged, null, 2), "utf8");
  const next = merged.length;
  for (let m = 50; m <= next; m += 50) {
    if (m > prev && m <= next) {
      console.log(`Saved ${m} answers`);
    }
  }
}

/** defence-plan-chat returns `{ ok: true, reply }` — support alternates for debugging / proxies. */
function extractAiReply(parsed: unknown, httpStatus: number): string {
  if (typeof parsed !== "object" || parsed === null) {
    return `[eval] unexpected JSON (HTTP ${httpStatus})`;
  }
  const o = parsed as Record<string, unknown>;

  if (o.ok === true && typeof o.reply === "string") {
    return o.reply;
  }
  if (typeof o.reply === "string") {
    return o.reply;
  }
  if (typeof o.answer === "string") {
    return o.answer;
  }
  const data = o.data;
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.reply === "string") return d.reply;
    if (typeof d.answer === "string") return d.answer;
  }

  const errPart =
    typeof o.error === "string"
      ? o.error
      : typeof o.message === "string"
        ? o.message
        : JSON.stringify(parsed);
  return `[eval error] HTTP ${httpStatus} ${errPart}`;
}

let rawLogCount = 0;

/** Node fetch throws TypeError: fetch failed with cause ECONNREFUSED when nothing listens on host:port */
function isLikelyConnectionFailure(err: unknown): boolean {
  const s = String(err);
  if (/ECONNREFUSED/i.test(s)) return true;
  if (err instanceof Error && err.cause !== undefined) {
    const c = err.cause as { code?: string; errors?: Array<{ code?: string }> };
    if (c?.code === "ECONNREFUSED") return true;
    if (Array.isArray(c?.errors) && c.errors.some((e) => e?.code === "ECONNREFUSED")) return true;
  }
  return false;
}

/** Sent on every eval HTTP call: x-eval + x-fast-eval + UA `tsx`; GET /api/cases may need EVAL_ORG_ID. */
function baseEvalHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "x-eval": "1",
    "x-fast-eval": "1",
    "User-Agent": "CaseBrain-eval/tsx",
  };
  if (COOKIE.length > 0) {
    h.Cookie = COOKIE;
  }
  return h;
}

function exitConnectionHelp(url: string): never {
  console.error("");
  console.error("[run-eval] FATAL: Could not connect to the app.");
  console.error(`  Target: ${url}`);
  console.error(`  Cause: ECONNREFUSED — nothing is accepting HTTP on ${BASE_URL.replace(/\/$/, "")}`);
  console.error("  Fix: In a second terminal, start Next.js first:");
  console.error("       npm run dev");
  console.error("  Wait until you see something like 'Ready on http://localhost:3000', then re-run this script.");
  console.error("  If your app uses another port, set EVAL_BASE_URL (e.g. http://localhost:3001).");
  console.error("");
  process.exit(1);
}

/**
 * Fetch archived=false cases for the current org from GET /api/cases.
 * Response shape: `{ cases: { id: string, ... }[] }`.
 */
async function getCaseIds(): Promise<string[]> {
  const url = `${BASE_URL}/api/cases`;
  const maxAttempts = 5;

  let res!: Response;
  let text = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(url, { method: "GET", headers: baseEvalHeaders() });
    } catch (err: unknown) {
      if (isLikelyConnectionFailure(err)) {
        exitConnectionHelp(url);
      }
      throw new Error(`[run-eval] GET /api/cases failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    text = await res.text();

    if (DEBUG && rawLogCount < RAW_LOG_MAX) {
      console.log(`RAW RESPONSE (GET /api/cases HTTP ${res.status}):`, text.slice(0, 400));
      rawLogCount++;
    }

    if (res.status === 429 && attempt < maxAttempts) {
      await sleep(Math.min(60_000, 6000 * attempt));
      continue;
    }
    if (!res.ok && res.status >= 500 && attempt < maxAttempts) {
      await sleep(POST_RETRY_DELAY_MS);
      continue;
    }
    break;
  }

  if (!res.ok) {
    throw new Error(`[run-eval] GET /api/cases HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`[run-eval] GET /api/cases returned non-JSON: ${text.slice(0, 300)}`);
  }

  const o = parsed as Record<string, unknown>;
  const casesRaw = o.cases;
  if (!Array.isArray(casesRaw)) {
    throw new Error(
      `[run-eval] GET /api/cases: expected { cases: [] }, got: ${JSON.stringify(Object.keys(o)).slice(0, 80)}`
    );
  }

  const rows: { id: string; title?: string | null }[] = [];
  for (const item of casesRaw) {
    if (typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string") {
      const it = item as { id: string; title?: string | null };
      rows.push({ id: it.id, title: it.title });
    }
  }
  const sortedIds = sortCasesForEvalScan(rows).map((r) => r.id);

  const maxCases = process.env.EVAL_MAX_CASES ? parseInt(process.env.EVAL_MAX_CASES, 10) : null;

  const selectedCases =
    maxCases != null && Number.isFinite(maxCases) && maxCases > 0 ? sortedIds.slice(0, maxCases) : sortedIds;

  return selectedCases;
}

async function postQuestion(caseId: string, question: string): Promise<string> {
  const url = `${BASE_URL}/api/criminal/${caseId}/defence-plan-chat`;
  const maxAttempts = 1 + POST_MAX_RETRIES;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          ...baseEvalHeaders(),
          "Content-Type": "application/json",
          "x-fast-eval": "1",
        },
        body: JSON.stringify({
          message: question,
        }),
      });
    } catch (err: unknown) {
      if (isLikelyConnectionFailure(err)) {
        exitConnectionHelp(url);
      }
      if (attempt < maxAttempts) {
        await sleep(POST_RETRY_DELAY_MS);
        continue;
      }
      await sleep(REQUEST_GAP_MS);
      return "[error]";
    }

    const text = await res.text();

    if (DEBUG && rawLogCount < RAW_LOG_MAX) {
      console.log(`RAW RESPONSE (${caseId.slice(0, 8)}… HTTP ${res.status}):`, text.slice(0, 300));
      rawLogCount++;
    }

    const retryable = shouldRetryDefenceChatResponse(res);
    if (retryable && attempt < maxAttempts) {
      await sleep(retryBackoffMs(res, attempt));
      continue;
    }

    if (retryable) {
      await sleep(REQUEST_GAP_MS);
      return "[error]";
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      await sleep(REQUEST_GAP_MS);
      return `[eval parse error] HTTP ${res.status} non-JSON body=${text.slice(0, 240)}`;
    }

    const reply = extractAiReply(parsed, res.status);
    await sleep(REQUEST_GAP_MS);
    return reply;
  }

  await sleep(REQUEST_GAP_MS);
  return "[error]";
}

type FlatTask = { caseId: string; question: string };

function buildTasks(caseIds: string[], questions: string[]): FlatTask[] {
  const tasks: FlatTask[] = [];
  for (const caseId of caseIds) {
    for (const question of questions) {
      tasks.push({ caseId, question });
    }
  }
  return tasks;
}

function countEvalLikeAnswers(rows: DatasetRow[]): { errorLike: number; sample: string | null } {
  let errorLike = 0;
  let sample: string | null = null;
  const re = /^\[eval/i;
  for (const row of rows) {
    if (re.test(row.answer)) {
      errorLike++;
      if (!sample) sample = row.answer.slice(0, 200);
    }
  }
  return { errorLike, sample };
}

async function runEvalOnce(
  questions: string[],
  caseIds: string[]
): Promise<{ rows: DatasetRow[]; outfile: string }> {
  rawLogCount = 0;
  const tasks = buildTasks(caseIds, questions);
  const rows: DatasetRow[] = [];
  let pendingFlush: DatasetRow[] = [];

  async function enqueueRow(row: DatasetRow): Promise<void> {
    rows.push(row);
    pendingFlush.push(row);
    if (pendingFlush.length >= 50) {
      await appendRowsToDataset(pendingFlush);
      pendingFlush = [];
    }
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const answers = await Promise.all(
      batch.map(async (t) => {
        const question = pickQuestionVariation(t.question);
        const answer = await postQuestion(t.caseId, question);
        return { caseId: t.caseId, question, answer };
      })
    );
    for (const a of answers) {
      await enqueueRow({
        case_id: a.caseId,
        question: a.question,
        answer: a.answer,
        timestamp: new Date().toISOString(),
      });
    }
    if (BATCH_DELAY_MS > 0 && i + CONCURRENCY < tasks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  await appendRowsToDataset(pendingFlush);

  return { rows, outfile: DATASET_PATH };
}

async function main(): Promise<void> {
  const watch = process.argv.includes("--watch");
  const version = getVersionSha();

  let questions: string[];
  try {
    questions = await loadQuestions();
  } catch (e) {
    console.error(`[run-eval] Failed to load ${QUESTIONS_PATH}:`);
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
    return;
  }

  if (!ALLOW_NO_COOKIE && COOKIE.length === 0) {
    console.error(
      "[run-eval] FATAL: EVAL_COOKIE is empty or unset.\n" +
        "  PowerShell:  $env:EVAL_COOKIE = '<paste Cookie header from DevTools>'\n" +
        "  Or set EVAL_ALLOW_NO_COOKIE=1 only if you intentionally want unauthenticated calls.\n" +
        "  Cookie must be copied from the SAME origin as EVAL_BASE_URL."
    );
    process.exit(1);
  }

  if (COOKIE.length > 0) {
    console.log(`[run-eval] EVAL_COOKIE length=${COOKIE.length} (value not logged)`);
  }
  console.log(`[run-eval] EVAL_BASE_URL=${BASE_URL}`);
  console.log(`[run-eval] Questions: ${questions.length} (from ${QUESTIONS_PATH})`);
  console.log(`[run-eval] Git version: ${version}`);
  if (RUN_HOURS > 0) {
    console.log(`[run-eval] EVAL_RUN_HOURS=${RUN_HOURS} (time-based loop; single pass when 0)`);
  }
  console.log(`[run-eval] POST body field: message (required by defence-plan-chat; "question" is not read)`);
  if (!DEBUG) {
    console.log("[run-eval] Set EVAL_DEBUG=1 or pass --verbose to log first RAW RESPONSE bodies.");
  }

  const run = async (caseIds: string[]) => {
    const { rows, outfile } = await runEvalOnce(questions, caseIds);
    console.log(`[run-eval] Wrote ${rows.length} rows to ${outfile}`);

    const diagnostics = countEvalLikeAnswers(rows);
    console.log("");
    console.log("Diagnostics:");
    console.log(`- answers looking like transport/API errors: ${diagnostics.errorLike} / ${rows.length}`);
    if (diagnostics.sample) {
      console.log(`- sample: ${diagnostics.sample}`);
    }
    console.log("");
    console.log("Quality report: npx tsx scripts/score-eval.mts");
    console.log("");
  };

  const loadCasesOrExit = async (): Promise<string[]> => {
    let caseIds: string[];
    try {
      caseIds = await getCaseIds();
    } catch (e) {
      console.error("[run-eval] Failed to load cases from GET /api/cases:");
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    }

    if (caseIds.length === 0) {
      console.log("[run-eval] No cases found (empty list from /api/cases). Nothing to eval.");
      process.exit(0);
    }

    console.log(`[run-eval] Loaded ${caseIds.length} real cases`);
    return caseIds;
  };

  if (watch) {
    if (RUN_HOURS > 0) {
      console.warn("[run-eval] --watch ignores EVAL_RUN_HOURS (interval uses watch timer only).");
    }
    console.log(`[run-eval] Watch mode: every ${WATCH_INTERVAL_MS / 60000} minutes (Ctrl+C to stop)`);
    while (true) {
      const caseIds = await loadCasesOrExit();
      await run(caseIds);
      await sleep(WATCH_INTERVAL_MS);
    }
  } else if (RUN_HOURS > 0) {
    const startTime = Date.now();
    const maxDuration = RUN_HOURS * 60 * 60 * 1000;
    let runCount = 0;
    console.log(`[run-eval] Time-based eval: ${RUN_HOURS} hour(s) max (${Math.round(maxDuration / 60000)} mins)`);
    while (Date.now() - startTime < maxDuration) {
      runCount++;
      console.log(`RUN ${runCount} (elapsed: ${Math.round((Date.now() - startTime) / 60000)} mins)`);
      const caseIds = await loadCasesOrExit();
      await run(caseIds);
      await sleep(LONG_RUN_PASS_DELAY_MS);
    }
    console.log("Finished time-based eval run");
  } else {
    const caseIds = await loadCasesOrExit();
    await run(caseIds);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
