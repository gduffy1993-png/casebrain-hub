/**
 * Simple quality report for evals/dataset.json produced by scripts/run-eval.mts.
 *
 * Usage:
 *   npx tsx scripts/score-eval.mts
 *   npx tsx scripts/score-eval.mts path/to/dataset.json
 */

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type DatasetRow = {
  case_id: string;
  question: string;
  answer: string;
  timestamp?: string;
};

/** Expects `(answer || "").toLowerCase().trim()` for consistent scoring. */
function isGeneric(safeAnswer: string): boolean {
  return (
    /\bweak\b/.test(safeAnswer) ||
    /\bmay\b/.test(safeAnswer) ||
    /\bcould\b/.test(safeAnswer) ||
    /\bissues\b/.test(safeAnswer)
  );
}

/** Expects `(answer || "").toLowerCase().trim()`. */
function hasEvidence(safeAnswer: string): boolean {
  const u = safeAnswer.toUpperCase();
  return (
    u.includes("CCTV") ||
    safeAnswer.includes("999") ||
    u.includes("CAD") ||
    u.includes("MG")
  );
}

/** Expects `(answer || "").toLowerCase().trim()`. */
function hasAction(safeAnswer: string): boolean {
  if (safeAnswer.includes("->")) return true;
  const lines = safeAnswer.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 3) return true;
  const sentences = safeAnswer
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length >= 3;
}

/** Matches normal-path hard timeout and fast-eval OpenAI abort fallback. */
function isTimeoutAnswer(safeAnswer: string): boolean {
  return (
    safeAnswer.includes("unable to generate response in time") ||
    safeAnswer.includes("insufficient time to generate grounded answer")
  );
}

async function main(): Promise<void> {
  const argPath = process.argv[2];
  const datasetPath = path.resolve(
    argPath ?? path.join(__dirname, "..", "evals", "dataset.json")
  );

  let raw: string;
  try {
    raw = await readFile(datasetPath, "utf8");
  } catch {
    console.error(`[score-eval] Cannot read ${datasetPath}`);
    process.exit(1);
  }

  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    console.error(`[score-eval] Invalid JSON: ${datasetPath}`);
    process.exit(1);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.error("[score-eval] Expected a non-empty JSON array.");
    process.exit(1);
    return;
  }

  let generic = 0;
  let evidence = 0;
  let action = 0;
  let timeouts = 0;
  let scored = 0;
  const n = rows.length;

  for (const item of rows) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const answer = typeof r.answer === "string" ? r.answer : "";
    const safeAnswer = (answer || "").toLowerCase().trim();
    const isTimeout = isTimeoutAnswer(safeAnswer);
    if (isTimeout) {
      timeouts += 1;
      continue;
    }
    scored += 1;
    if (isGeneric(safeAnswer)) generic += 1;
    if (hasEvidence(safeAnswer)) evidence += 1;
    if (hasAction(safeAnswer)) action += 1;
  }

  const pctOf = (num: number, den: number) =>
    den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0.0%";

  console.log(`GENERIC RATE: ${pctOf(generic, scored)}`);
  console.log(`EVIDENCE RATE: ${pctOf(evidence, scored)}`);
  console.log(`ACTION FORMAT RATE: ${pctOf(action, scored)}`);
  console.log(`TIMEOUT RATE: ${pctOf(timeouts, n)}`);
  console.log(
    `(quality rates over ${scored} non-timeout answers; ${timeouts} timeouts of ${n} rows — ${datasetPath})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
