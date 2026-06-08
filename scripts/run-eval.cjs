#!/usr/bin/env node
/**
 * Defence-plan chat eval runner (Option A — local microscope, not "training").
 *
 * Prerequisites:
 *   - `npm run dev` (or production URL) running
 *   - Logged-in browser session: copy the Cookie header for your app domain
 *
 * Usage:
 *   set EVAL_COOKIE=__session=...   (PowerShell: $env:EVAL_COOKIE="...")
 *   set EVAL_CASE_IDS=id1,id2,id3
 *   node scripts/run-eval.cjs
 *
 * Or case list file (one UUID per line):
 *   node scripts/run-eval.cjs --cases path/to/cases.txt
 *
 * Env:
 *   EVAL_BASE_URL   default http://localhost:3000
 *   EVAL_COOKIE     required — full Cookie header value (semicolon-separated ok)
 *   EVAL_CASE_IDS   comma-separated UUIDs if not using --cases
 *   EVAL_DELAY_MS   pause between requests (default 400)
 *
 * Output: out/eval-<git-short-sha>.json (gitignored via `out`)
 */

/* eslint-disable no-console */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEFAULT_QUESTIONS = [
  {
    id: "Q1_allegation",
    text: "What is the primary allegation in one sentence using only bundle wording?",
  },
  {
    id: "Q8_prosecution_weakness",
    text: "What is the single biggest weakness in the prosecution case?",
  },
  {
    id: "Q9_defence_weakness",
    text: "What is the single biggest weakness in the defence case?",
  },
  {
    id: "Q10_next_24h",
    text: "What should be done in the next 24 hours?",
  },
];

const PHRASE_WATCHLIST = [
  "partial account",
  "adverse inference",
  "pressure point",
  "prosecution exploit",
  "crown can still",
  "this matters because",
  "no comment",
];

function parseArgs(argv) {
  const out = { casesFile: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--cases" && argv[i + 1]) {
      out.casesFile = argv[++i];
    }
  }
  return out;
}

function loadCaseIds(casesFile) {
  if (casesFile) {
    const p = path.resolve(casesFile);
    if (!fs.existsSync(p)) {
      throw new Error(`Case file not found: ${p}`);
    }
    return fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .map((l) => l.replace(/#.*$/, "").trim())
      .filter(Boolean);
  }
  const fromEnv = (process.env.EVAL_CASE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fromEnv;
}

function gitSha() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function countPhrases(answers) {
  const lowerWatch = PHRASE_WATCHLIST.map((p) => p.toLowerCase());
  const counts = Object.fromEntries(PHRASE_WATCHLIST.map((p) => [p, 0]));
  for (const text of answers) {
    const a = (text || "").toLowerCase();
    for (let i = 0; i < PHRASE_WATCHLIST.length; i++) {
      if (a.includes(lowerWatch[i])) {
        counts[PHRASE_WATCHLIST[i]]++;
      }
    }
  }
  return counts;
}

async function main() {
  const { casesFile } = parseArgs(process.argv);
  const base = (process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const cookie = process.env.EVAL_COOKIE || "";
  const delayMs = Math.max(0, parseInt(process.env.EVAL_DELAY_MS || "400", 10) || 0);
  const caseIds = loadCaseIds(casesFile);

  if (!cookie) {
    console.error(
      "Missing EVAL_COOKIE. While logged in, copy the browser Cookie (e.g. __session=...) for this app and set the env var."
    );
    process.exit(1);
  }
  if (caseIds.length === 0) {
    console.error("No case IDs. Set EVAL_CASE_IDS=id1,id2 or: node scripts/run-eval.cjs --cases cases.txt");
    process.exit(1);
  }

  const sha = gitSha();
  const shortSha = sha === "unknown" ? "unknown" : sha.slice(0, 7);
  const runs = [];

  for (const caseId of caseIds) {
    for (const q of DEFAULT_QUESTIONS) {
      const url = `${base}/api/criminal/${caseId}/defence-plan-chat`;
      let res;
      let data;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
          },
          body: JSON.stringify({ message: q.text }),
        });
        data = await res.json();
      } catch (e) {
        runs.push({
          case_id: caseId,
          question_id: q.id,
          question: q.text,
          status: 0,
          ok: false,
          answer: null,
          error: e instanceof Error ? e.message : String(e),
        });
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      const answer = data && typeof data.reply === "string" ? data.reply : null;
      runs.push({
        case_id: caseId,
        question_id: q.id,
        question: q.text,
        status: res.status,
        ok: Boolean(data && data.ok),
        answer,
        error: !data || !data.ok ? data?.error || res.statusText || "error" : null,
      });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const outDir = path.join(process.cwd(), "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, `eval-${shortSha}.json`);
  const payload = {
    git_sha: sha,
    git_short: shortSha,
    base_url: base,
    created_at: new Date().toISOString(),
    questions: DEFAULT_QUESTIONS.map((q) => q.id),
    case_ids: caseIds,
    row_count: runs.length,
    runs,
  };
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");

  const answers = runs.map((r) => r.answer);
  const phraseHits = countPhrases(answers);

  console.log(`Wrote ${outFile} (${runs.length} rows)  git=${shortSha}`);
  console.log("Phrase hits (how many rows contain phrase):");
  for (const [k, v] of Object.entries(phraseHits)) {
    console.log(`  ${k}: ${v}/${runs.length}`);
  }
  const failed = runs.filter((r) => !r.ok).length;
  if (failed) {
    console.log(`\n${failed} request(s) not ok — check answer.error or HTTP status in JSON.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
