import { createHash } from "crypto";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeFileSync, writeSync } from "fs";
import { basename, dirname, join, relative } from "path";

import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { buildClientPacketSummary } from "@/lib/criminal/evidence-family-owner";
import {
  HARD_BUCKETS,
  SOFT_BUCKETS,
  buildReceipt,
  conflictingStatus,
  defendantBleed,
  hardBucketFor,
  looksFactual,
  materialFamily,
  softBucketFor,
  staleAgainstFile,
  statusBucket,
  unsafeStrengthening,
  type HardBucket,
  type OutputReceipt,
  type SoftBucket,
} from "./case-truth-trace-receipt";

type Severity = "P0" | "P1" | "P2" | "P3";
type Verdict = "RIGHT" | "WRONG" | "POINTLESS" | "CHECK";
type SourceKind = "local-case-output" | "live-tab-capture" | "surface-sweep" | "current-packet";

export type OutputLine = {
  id: string;
  sourceKind: SourceKind;
  caseId: string;
  surface: string;
  path: string;
  text: string;
  refs: string[];
  sourceMatch: {
    method: "ref" | "token" | "none" | "not-on-git";
    confidence: number;
    quote?: string;
  };
  verdict: Verdict;
  flags: string[];
  receipt: OutputReceipt;
  gold20: boolean;
};

type TraceFinding = {
  severity: Severity;
  code: string;
  caseId: string;
  surface: string;
  message: string;
  output: string;
  sourceQuote?: string;
  path?: string;
  class: "hard" | "soft" | "historical";
  hardBucket?: HardBucket;
  softBucket?: SoftBucket;
  sourceClass?: string;
  gold20: boolean;
};

type SweepRecord = {
  unique_key?: string;
  case_key?: string;
  source_id?: string;
  backend_case_id?: string;
  productSha?: string;
  route?: string;
  failReasons?: string[];
  inventFlags?: string[];
  muteFlags?: string[];
  modalityFlags?: string[];
  contradictionFlags?: string[];
  dateRoleFlags?: string[];
  courtClaims?: string[];
  papersClaims?: string[];
  clientClaims?: string[];
  overviewClaims?: string[];
  fileClaims?: string[];
  evidence?: Record<string, boolean>;
};

type CounterMap = Record<string, number>;

type RunSummary = {
  generatedAt: string;
  head: string | null;
  mode: "receipt";
  scanned: {
    localCases: number;
    liveTabCases: number;
    sweepRecords: number;
    outputLines: number;
    sourceBackedLines: number;
    noSourceLines: number;
    notOnGitLines: number;
    findings: number;
    receiptBackedLines: number;
    unsupportedFactualLines: number;
  };
  severityCounts: Record<Severity, number>;
  corpus: {
    hard: CounterMap;
    soft: CounterMap;
    hardTotal: number;
    softTotal: number;
  };
  gold20Acceptance: {
    cases: number;
    outputLines: number;
    hard: CounterMap;
    soft: CounterMap;
    hardTotal: number;
    softTotal: number;
  };
  topCodes: Array<{ code: string; count: number }>;
  topHardCodes: Array<{ code: string; count: number }>;
  topSurfaces: Array<{ surface: string; count: number }>;
  note: string;
};

const DEFAULT_OUT_ROOT = "artifacts/casebrain-qa/assurance/case-truth-trace-v1";
const LOCAL_CASE_ROOT = "artifacts/evidence-state-audit-local/cases";
const LIVE_TAB_ROOTS = [
  "artifacts/casebrain-qa/gold20",
  "artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-pr101-final",
  "artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-pr101-chase-fix",
  "artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-pr101-canonical",
];
const GOLD20_RECEIPT_PATH = "artifacts/casebrain-qa/gold20/display-receipt.json";
const GOLD20_UPLOAD_PATH = "artifacts/casebrain-qa/gold20/upload-results.json";
const LIVE_ALIAS_IDS: Record<string, string[]> = {
  hale: [
    "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
    "9b555b7b-d520-4c33-a661-9ed93acc0fe1",
    "3d52134b-6251-424a-8688-7c70fea3d379",
  ],
  brookes: ["2dcdc59d-ff44-4bc8-ac31-bd11a954a59e", "223a4ea7-d426-4b7d-ae28-083252a910b2"],
  dunn: ["a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01"],
  davies: ["687cf5a6-6898-4257-baef-33e33ace08df"],
  patel: ["ed3c9806-3227-4ee9-ad86-9784e6000084", "7e763777-94a8-4958-a190-a35ef6ddb259"],
};

const SWEEP_FILES = [
  { surface: "overview", path: "artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/overview-sweep.ndjson" },
  { surface: "papers", path: "artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1/papers-sweep.ndjson" },
  { surface: "file", path: "artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/file-sweep.ndjson" },
  { surface: "client", path: "artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/client-sweep.ndjson" },
  { surface: "court", path: "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/court-sweep.ndjson" },
];

const STATUS_WORD_RE =
  /\b(?:served|on file|outstanding|missing|not served|not yet served|not safely confirmed|unclear|incomplete|overdue|due soon|needs confirmation|referred only)\b/i;
const ASSERTIVE_GAP_RE = /\b(?:outstanding|missing|not served|not yet served|overdue|due soon|chase|please provide)\b/i;
const GENERIC_CLUTTER_RE =
  /\b(?:review the cited source before relying on this item|record whether the material is served, incomplete, unclear or still awaited|solicitor review required before sending)\b/i;
const INTERNAL_LANGUAGE_RE = /\b(?:undefined|null|nan|\[object object\]|raw enum|builder input|requestid|stack trace)\b/i;
const REF_RE =
  /\b(?:MG\d{1,2}[A-Z]?(?:\/\d{1,4})?|MG6C?\/\d{1,4}|EX[-/][A-Z0-9-]+|O\d{1,3}|S\d{1,3}|TEL\/\d{1,3}|CCTV\/\d{1,3}|BWV\/\d{1,3})\b/gi;

const STOPWORDS = new Set([
  "and",
  "are",
  "before",
  "case",
  "cited",
  "confirm",
  "current",
  "disclosed",
  "file",
  "from",
  "full",
  "item",
  "material",
  "materials",
  "not",
  "on",
  "or",
  "papers",
  "provide",
  "record",
  "review",
  "served",
  "source",
  "status",
  "the",
  "this",
  "whether",
  "with",
]);

const SEVERITY_RANK: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normal(text: string): string {
  return compact(text).toLowerCase();
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function readText(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readJson(path: string): unknown | null {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function listDirs(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .map((entry) => join(path, entry))
    .filter((entry) => statSync(entry).isDirectory());
}

function refsIn(text: string): string[] {
  return [...new Set([...text.matchAll(REF_RE)].map((match) => match[0].toUpperCase()))];
}

function sourceLines(sourceText: string): string[] {
  return sourceText
    .split(/\r?\n/)
    .map(compact)
    .filter((line) => line.length >= 8 && !/^[-=#]+$/.test(line))
    .slice(0, 5000);
}

function tokens(text: string): Set<string> {
  return new Set(
    normal(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
  );
}

export function findSourceMatch(text: string, sourceText: string | null): OutputLine["sourceMatch"] {
  if (!sourceText) {
    return { method: "not-on-git", confidence: 0 };
  }

  const lines = sourceLines(sourceText);
  const refs = refsIn(text);
  for (const ref of refs) {
    const hit = lines.find((line) => line.toUpperCase().includes(ref));
    if (hit) return { method: "ref", confidence: 0.95, quote: hit.slice(0, 260) };
  }

  const outTokens = tokens(text);
  if (outTokens.size < 2) return { method: "none", confidence: 0 };

  let best: { score: number; line: string } | null = null;
  for (const line of lines) {
    const lineTokens = tokens(line);
    let overlap = 0;
    for (const token of outTokens) {
      if (lineTokens.has(token)) overlap += 1;
    }
    if (!best || overlap > best.score) best = { score: overlap, line };
  }

  const confidence = best ? best.score / Math.max(4, outTokens.size) : 0;
  if (best && best.score >= 2 && confidence >= 0.25) {
    return { method: "token", confidence: Number(confidence.toFixed(2)), quote: best.line.slice(0, 260) };
  }
  return { method: "none", confidence: 0 };
}

export function classifyOutput(text: string, sourceText: string | null): { verdict: Verdict; flags: string[] } {
  const n = normal(text);
  const flags: string[] = [];

  if (hasAffirmativeServedClaim(n) && /\b(?:outstanding|missing|not served|not yet served)\b/.test(n)) {
    flags.push(isLikelyDirectStatusContradiction(n) ? "served_and_outstanding_same_line" : "compound_mixed_status_output");
  }
  if (/\b(?:not safely confirmed|unclear|needs confirmation)\b/.test(n) && /\b(?:overdue|due soon)\b/.test(n)) {
    flags.push("review_only_with_deadline_pressure");
  }
  if (sourceText !== null && /\b(?:phone download|phone extraction|source extraction|subscriber|account data)\b/.test(n)) {
    if (
      !hasPositiveSourceLine(
        sourceText,
        /\b(?:phone download|phone extraction|source extraction|device extraction|subscriber|account data|tel\/|mobile download)\b/i,
      )
    ) {
      flags.push("phone_output_without_phone_source");
    }
  }
  if (sourceText !== null && /\b(?:999 audio|999 recording|emergency call audio)\b/.test(n)) {
    if (
      !hasPositiveSourceLine(
        sourceText,
        /\b(?:999 audio|999 recording|emergency call audio|call recording)\b/i,
      )
    ) {
      flags.push("999_audio_without_audio_source");
    }
  }
  if (GENERIC_CLUTTER_RE.test(text)) flags.push("generic_solicitor_clutter");
  if (INTERNAL_LANGUAGE_RE.test(text)) flags.push("internal_language_leak");
  if (/\bbuilding matter brief\b/i.test(text)) flags.push("stuck_building_state");
  if (/\band,\b/.test(text) || /Outstanding phone/i.test(text)) flags.push("weak_wording");
  if (/copy (?:cps )?chase|copy court|copy safe court line/i.test(text) && compact(text).length < 48) {
    flags.push("furniture_copy_button_noise");
  }

  if (flags.some((flag) => flag.includes("without") || flag.includes("same_line") || flag.includes("stuck"))) {
    return { verdict: "WRONG", flags };
  }
  if (flags.includes("generic_solicitor_clutter")) return { verdict: "POINTLESS", flags };
  return { verdict: "CHECK", flags };
}

function hasPositiveSourceLine(sourceText: string | null, pattern: RegExp): boolean {
  if (!sourceText) return false;
  return sourceText.split(/\r?\n/).some((rawLine) => {
    const line = compact(rawLine);
    if (!pattern.test(line)) return false;
    if (
      /\b(?:no\s+(?:reference|mention|listed|listing|entry|phone|device|download|extraction|subscriber|999|audio|recording|call)|without|absent)\b.{0,80}\b(?:phone|device|download|extraction|subscriber|999|audio|recording|call)?\b/i.test(
        line,
      )
    ) {
      return false;
    }
    return true;
  });
}

function hasAffirmativeServedClaim(normalizedText: string): boolean {
  const masked = normalizedText
    .replace(/\bnot\s+yet\s+served\b/g, " ")
    .replace(/\bnot\s+served\b/g, " ")
    .replace(/\bunserved\b/g, " ")
    .replace(/\bconfirm\s+on\s+file\b/g, " ")
    .replace(/\bif\s+served\b/g, " ");
  return /\b(?:served|on file|provided|attached|included|supplied)\b/.test(masked);
}

function isLikelyDirectStatusContradiction(normalizedText: string): boolean {
  if (/\bserved\s+(?:and|\/)\s+outstanding\s+material\b/.test(normalizedText)) return false;
  if (/\[(?:served|on file)\][^\n]{0,80}\[(?:outstanding|missing)\]/i.test(normalizedText)) return true;
  if (/\b(?:served|on file)\b\s*(?:[|/,;-]\s*)?(?:but|yet|and)\s*(?:outstanding|missing|not served|not yet served)\b/.test(normalizedText)) {
    return true;
  }
  if (/\b(?:outstanding|missing)\b\s*(?:[|/,;-]\s*)?(?:but|yet|and)\s*(?:served|on file)\b/.test(normalizedText)) {
    return true;
  }
  return false;
}

function severityFor(code: string): Severity {
  if (
    [
      "served_and_outstanding_same_line",
      "phone_output_without_phone_source",
      "999_audio_without_audio_source",
      "wrong_charge_or_identity",
      "wrong_defendant_source_bleed",
      "cross_surface_disagreement",
      "stale_state_output",
      "unsafe_strengthening_of_source_wording",
      "unsupported_factual_statement",
    ].includes(code)
  ) {
    return "P0";
  }
  if (
    [
      "incorrect_evidence_status",
      "incorrect_provenance",
      "duplicate_conflicting_output",
      "stuck_building_state",
      "no_source_for_assertive_output",
    ].includes(code)
  ) {
    return "P1";
  }
  if (["review_only_with_deadline_pressure", "internal_language_leak", "compound_mixed_status_output"].includes(code)) {
    return "P2";
  }
  if (["generic_solicitor_clutter", "weak_wording", "furniture_copy_button_noise", "ugly_title", "repetition"].includes(code)) {
    return "P3";
  }
  return "P3";
}

function stringsFromUnknown(value: unknown, path = "$", out: Array<{ path: string; text: string }> = []): Array<{ path: string; text: string }> {
  if (typeof value === "string") {
    const text = compact(value);
    if (text.length >= 8) out.push({ path, text });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => stringsFromUnknown(entry, `${path}[${index}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      stringsFromUnknown(entry, `${path}.${key}`, out);
    }
  }
  return out;
}

function surfaceFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.includes("evidencestates") || lower.includes("warningsandgaps")) return "chase";
  if (lower.includes("fiveanswersevidencerows")) return "papers";
  if (lower.includes("casetruth") || lower.includes("caseidentity")) return "identity";
  if (lower.includes("court")) return "court";
  if (lower.includes("client")) return "client";
  return "output-json";
}

function shouldKeepOutputLine(path: string, text: string): boolean {
  if (text.length > 900) return false;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return false;
  if (/^[a-f0-9-]{20,}$/i.test(text)) return false;
  return (
    STATUS_WORD_RE.test(text) ||
    ASSERTIVE_GAP_RE.test(text) ||
    GENERIC_CLUTTER_RE.test(text) ||
    INTERNAL_LANGUAGE_RE.test(text) ||
    /\bbuilding matter brief\b/i.test(text) ||
    /Outstanding phone|\band,\b/.test(text) ||
    refsIn(text).length > 0 ||
    /\.(?:label|title|note|courtNote|evidenceAnchor|allegation|offenceLabel|charge|court|caseTitle|clientLabel)$/i.test(path)
  );
}

function sourceForLocalCase(caseDir: string): string | null {
  return (
    readText(join(caseDir, "source-extract.txt")) ??
    readText(join(caseDir, "bundle-text.md")) ??
    readText(join(caseDir, "front-matter-scan.txt"))
  );
}

function emptyHard(): CounterMap {
  return Object.fromEntries(HARD_BUCKETS.map((key) => [key, 0]));
}

function emptySoft(): CounterMap {
  return Object.fromEntries(SOFT_BUCKETS.map((key) => [key, 0]));
}

function collectCaseIds(value: unknown, into: Set<string>): void {
  if (typeof value === "string" && /^[0-9a-f-]{20,}$/i.test(value)) into.add(value.toLowerCase());
  if (Array.isArray(value)) value.forEach((entry) => collectCaseIds(entry, into));
  else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "caseId" || key === "backend_case_id" || key === "caseIds") collectCaseIds(entry, into);
      else if (typeof entry === "object") collectCaseIds(entry, into);
    }
  }
}

function loadGold20Ids(): Set<string> {
  const ids = new Set<string>();
  collectCaseIds(readJson(GOLD20_RECEIPT_PATH), ids);
  collectCaseIds(readJson(GOLD20_UPLOAD_PATH), ids);
  for (const aliases of Object.values(LIVE_ALIAS_IDS)) {
    for (const id of aliases) ids.add(id.toLowerCase());
  }
  return ids;
}

const GOLD20_IDS = loadGold20Ids();

function isGold20(caseId: string, path = ""): boolean {
  const id = caseId.toLowerCase();
  if (GOLD20_IDS.has(id)) return true;
  if (LIVE_ALIAS_IDS[id]) return true;
  return /gold20|live-hale|live-auth-pr101/i.test(path);
}

function liveCaseId(dir: string, file: string): string {
  const receipt = readJson(join(dir, "receipt.json")) as { caseId?: string } | null;
  if (receipt?.caseId) return receipt.caseId;
  const base = basename(file).toLowerCase();
  for (const name of Object.keys(LIVE_ALIAS_IDS)) {
    if (base.startsWith(`${name}-`) || base === name || basename(dir).toLowerCase().includes(name)) {
      return LIVE_ALIAS_IDS[name][0] ?? name;
    }
  }
  return basename(dir);
}

function finalizeLine(partial: Omit<OutputLine, "receipt" | "gold20" | "verdict" | "flags"> & {
  flags: string[];
  verdict: Verdict;
  sourceText: string | null;
}): OutputLine {
  const built = buildReceipt({
    text: partial.text,
    path: partial.path,
    surface: partial.surface,
    refs: partial.refs,
    sourceMethod: partial.sourceMatch.method,
    sourceQuote: partial.sourceMatch.quote,
    sourceText: partial.sourceText,
    confidence: partial.sourceMatch.confidence,
  });
  const flags = [...partial.flags];
  if (
    looksFactual(built.receipt.outputType, partial.text) &&
    built.sourceClass === "unsupported" &&
    partial.sourceMatch.method !== "not-on-git"
  ) {
    flags.push("unsupported_factual_statement");
  }
  if (partial.sourceMatch.method === "none" && ASSERTIVE_GAP_RE.test(partial.text) && built.sourceClass === "unsupported") {
    if (!flags.includes("unsupported_factual_statement")) flags.push("no_source_for_assertive_output");
  }
  const bleed = defendantBleed(partial.text, partial.sourceText);
  if (bleed) flags.push("wrong_defendant_source_bleed");
  if (unsafeStrengthening(partial.text, partial.sourceMatch.quote)) {
    flags.push("unsafe_strengthening_of_source_wording");
  }
  const receipt = {
    ...built.receipt,
    sourceClass: built.sourceClass,
    guard: built.receipt.guard,
  };
  if (flags.includes("unsupported_factual_statement")) {
    receipt.guard = "fail: factual output has no source class/explanation";
  }
  return {
    ...partial,
    flags,
    verdict: flags.length ? classifyVerdictFromFlags(flags) : partial.verdict,
    receipt,
    gold20: isGold20(partial.caseId, partial.path),
  };
}

function traceLocalCases(root: string): OutputLine[] {
  const lines: OutputLine[] = [];
  for (const caseDir of listDirs(root)) {
    const outputPath = join(caseDir, "casebrain-output.json");
    const output = readJson(outputPath);
    if (!output) continue;
    const caseId =
      typeof (output as { caseId?: unknown }).caseId === "string"
        ? ((output as { caseId: string }).caseId)
        : basename(caseDir);
    const sourceText = sourceForLocalCase(caseDir);
    for (const entry of stringsFromUnknown(output)) {
      if (!shouldKeepOutputLine(entry.path, entry.text)) continue;
      const sourceMatch = findSourceMatch(entry.text, sourceText);
      const classified = classifyOutput(entry.text, sourceText);
      lines.push(
        finalizeLine({
          id: `local:${caseId}:${hash(entry.path + entry.text)}`,
          sourceKind: "local-case-output",
          caseId,
          surface: surfaceFromPath(entry.path),
          path: relative(process.cwd(), outputPath).replace(/\\/g, "/") + ":" + entry.path,
          text: entry.text,
          refs: refsIn(entry.text),
          sourceMatch,
          verdict: classified.verdict,
          flags: [...classified.flags],
          sourceText,
        }),
      );
    }
  }
  return lines;
}

function classifyVerdictFromFlags(flags: string[]): Verdict {
  if (flags.some((flag) => severityFor(flag) === "P0" || severityFor(flag) === "P1")) return "WRONG";
  if (flags.includes("generic_solicitor_clutter")) return "POINTLESS";
  return "CHECK";
}

function traceLiveTabs(root: string): OutputLine[] {
  const lines: OutputLine[] = [];
  if (!existsSync(root)) return lines;
  const txtFiles = walkFiles(root).filter((file) => file.endsWith(".txt"));
  const grouped = new Map<string, string[]>();
  for (const file of txtFiles) {
    grouped.set(dirname(file), [...(grouped.get(dirname(file)) ?? []), file]);
  }
  for (const [dir, files] of grouped) {
    const sourceText =
      readText(join(dir, "file-extract.txt")) ??
      readText(join(dir, "source-extract.txt")) ??
      readText(join(dir, "file.txt"));
    for (const file of files) {
      if (basename(file).includes("extract")) continue;
      const text = readText(file) ?? "";
      const caseId = liveCaseId(dir, file);
      for (const rawLine of text.split(/\r?\n/)) {
        const outputText = compact(rawLine);
        if (!shouldKeepOutputLine(file, outputText)) continue;
        const sourceMatch = findSourceMatch(outputText, sourceText);
        const classified = classifyOutput(outputText, sourceText);
        lines.push(
          finalizeLine({
            id: `live:${caseId}:${basename(file)}:${hash(outputText)}`,
            sourceKind: "live-tab-capture",
            caseId,
            surface: normalizeLiveSurface(basename(file, ".txt")),
            path: relative(process.cwd(), file).replace(/\\/g, "/"),
            text: outputText,
            refs: refsIn(outputText),
            sourceMatch,
            verdict: classified.verdict,
            flags: [...classified.flags],
            sourceText,
          }),
        );
      }
    }
  }
  return lines;
}

function normalizeLiveSurface(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("overview")) return "overview";
  if (lower.includes("papers")) return "papers";
  if (lower.includes("disclosure-chase") || lower.includes("chase")) return "chase";
  if (lower.includes("summary") || lower.includes("client")) return "client";
  if (lower.includes("today") || lower.includes("court")) return "court";
  if (lower.includes("file")) return "file";
  return name;
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out;
}

function readNdjson(path: string): SweepRecord[] {
  const text = readText(path);
  if (!text) return [];
  const rows: SweepRecord[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as SweepRecord);
    } catch {
      // Keep running. A broken audit row is reported by the file-level summary.
    }
  }
  return rows;
}

function traceSweeps(): OutputLine[] {
  const out: OutputLine[] = [];
  for (const sweep of SWEEP_FILES) {
    for (const row of readNdjson(sweep.path)) {
      const caseId = row.backend_case_id ?? row.case_key ?? row.source_id ?? row.unique_key ?? "unknown-case";
      const claimArrays = [row.overviewClaims, row.courtClaims, row.papersClaims, row.clientClaims, row.fileClaims].filter(
        Array.isArray,
      ) as string[][];
      const claims = claimArrays.flat().slice(0, 80);
      const failFlags = [
        ...(row.failReasons ?? []),
        ...(row.inventFlags ?? []),
        ...(row.muteFlags ?? []),
        ...(row.modalityFlags ?? []),
        ...(row.contradictionFlags ?? []),
        ...(row.dateRoleFlags ?? []),
      ];
      if (failFlags.length > 0) {
        out.push(
          finalizeLine({
            id: `sweep:${sweep.surface}:${caseId}:flags:${hash(failFlags.join("|"))}`,
            sourceKind: "surface-sweep",
            caseId,
            surface: sweep.surface,
            path: `${sweep.path.replace(/\\/g, "/")}#${row.productSha ?? "unknown-sha"}`,
            text: `Sweep flags: ${[...new Set(failFlags)].join(", ")}`,
            refs: [],
            sourceMatch: { method: "not-on-git", confidence: 0 },
            verdict: "WRONG",
            flags: [...new Set(failFlags)],
            sourceText: null,
          }),
        );
      }
      for (const claim of claims) {
        const classified = classifyOutput(claim, null);
        out.push(
          finalizeLine({
            id: `sweep:${sweep.surface}:${caseId}:${hash(claim)}`,
            sourceKind: "surface-sweep",
            caseId,
            surface: sweep.surface,
            path: `${sweep.path.replace(/\\/g, "/")}#${row.productSha ?? "unknown-sha"}`,
            text: compact(claim),
            refs: refsIn(claim),
            sourceMatch: { method: "not-on-git", confidence: 0 },
            verdict: classified.flags.length ? classifyVerdictFromFlags(classified.flags) : "CHECK",
            flags: classified.flags,
            sourceText: null,
          }),
        );
      }
    }
  }
  return out;
}

function findingClass(line: OutputLine, flag: string): "hard" | "soft" | "historical" {
  if (line.sourceKind === "surface-sweep" || line.sourceMatch.method === "not-on-git") {
    if (!hardBucketFor(flag) && !softBucketFor(flag)) return "historical";
    if (line.sourceKind === "surface-sweep") return "historical";
  }
  if (hardBucketFor(flag)) return "hard";
  if (softBucketFor(flag)) return "soft";
  return "historical";
}

function findingForLine(line: OutputLine): TraceFinding[] {
  const findings: TraceFinding[] = [];
  const flags = line.flags.length ? line.flags : line.verdict === "POINTLESS" ? ["generic_solicitor_clutter"] : [];
  for (const flag of flags) {
    if (flag === "stuck_building_state" && line.sourceKind === "live-tab-capture") continue;
    const hard = hardBucketFor(flag);
    const soft = softBucketFor(flag);
    findings.push({
      severity: severityFor(flag),
      code: flag,
      caseId: line.caseId,
      surface: line.surface,
      message: messageForFlag(flag),
      output: line.text,
      sourceQuote: line.sourceMatch.quote,
      path: line.path,
      class: findingClass(line, flag),
      hardBucket: hard ?? undefined,
      softBucket: soft ?? undefined,
      sourceClass: line.receipt.sourceClass,
      gold20: line.gold20,
    });
  }
  return findings;
}

function emitCurrentPacketLines(baseLines: OutputLine[]): OutputLine[] {
  const fileByCase = loadCaseFileText(baseLines);
  const liveOrGold = new Set(
    baseLines
      .filter((line) => line.gold20 || line.sourceKind === "live-tab-capture")
      .map((line) => line.caseId),
  );
  const out: OutputLine[] = [];
  for (const [caseId, fileText] of fileByCase) {
    if (!liveOrGold.has(caseId) && !GOLD20_IDS.has(caseId.toLowerCase())) continue;
    try {
      const ledger = buildBundleTruthLedger({ bundleText: fileText });
      const client = buildClientPacketSummary({ rows: ledger.materials });
      out.push(
        finalizeLine({
          id: `packet:${caseId}:client:${hash(client)}`,
          sourceKind: "current-packet",
          caseId,
          surface: "client",
          path: `current-packet:${caseId}:client`,
          text: client,
          refs: [],
          sourceMatch: { method: "token", confidence: 0.8, quote: fileText.slice(0, 220) },
          verdict: "CHECK",
          flags: [],
          sourceText: fileText,
        }),
      );
      for (const row of ledger.materials.slice(0, 24)) {
        const text = `${row.label} ${row.status}`;
        out.push(
          finalizeLine({
            id: `packet:${caseId}:papers:${hash(text)}`,
            sourceKind: "current-packet",
            caseId,
            surface: "papers",
            path: `current-packet:${caseId}:papers`,
            text,
            refs: row.scheduleRef ? [row.scheduleRef] : [],
            sourceMatch: { method: "ref", confidence: 0.9, quote: row.displayLine || row.label },
            verdict: "CHECK",
            flags: [],
            sourceText: fileText,
          }),
        );
      }
    } catch {
      // Packet rebuild is optional for historical folders without a usable extract.
    }
  }
  return out;
}

export function detectCrossSurfaceDisagreements(lines: OutputLine[]): OutputLine[] {
  const extras: OutputLine[] = [];
  const hasCurrent = new Set(lines.filter((line) => line.sourceKind === "current-packet").map((line) => line.caseId));
  const groups = new Map<string, OutputLine[]>();
  for (const line of lines) {
    if (line.sourceKind === "surface-sweep") continue;
    if (hasCurrent.has(line.caseId) && line.sourceKind === "live-tab-capture") continue;
    if (line.receipt.truthState === "none" || line.receipt.truthState === "mixed") continue;
    const family = materialFamily(line.text, line.refs);
    if (family === "unkeyed" || family === "other") continue;
    const key = `${line.caseId}::${family}`;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  for (const [key, rows] of groups) {
    const decided = rows.some((row) => {
      const bucket = statusBucket(row.receipt.truthState);
      return bucket === "served" || bucket === "outstanding";
    });
    const bySurface = new Map<string, OutputLine>();
    for (const row of rows) {
      const bucket = statusBucket(row.receipt.truthState);
      if (bucket === "other") continue;
      if (
        bucket === "review" &&
        decided &&
        (row.surface === "client" || row.surface === "overview")
      ) {
        continue;
      }
      const prev = bySurface.get(row.surface);
      if (!prev) bySurface.set(row.surface, row);
    }
    const surfaces = [...bySurface.entries()];
    for (let i = 0; i < surfaces.length; i += 1) {
      for (let j = i + 1; j < surfaces.length; j += 1) {
        const [surfaceA, lineA] = surfaces[i]!;
        const [surfaceB, lineB] = surfaces[j]!;
        if (!conflictingStatus(lineA.receipt.truthState, lineB.receipt.truthState)) continue;
        const text = `${surfaceA} says ${lineA.receipt.truthState}; ${surfaceB} says ${lineB.receipt.truthState} for ${key.split("::")[1]}`;
        extras.push(
          finalizeLine({
            id: `cross:${lineA.caseId}:${hash(text)}`,
            sourceKind: lineA.sourceKind,
            caseId: lineA.caseId,
            surface: `${surfaceA}+${surfaceB}`,
            path: lineA.path,
            text,
            refs: [...new Set([...lineA.refs, ...lineB.refs])],
            sourceMatch: lineA.sourceMatch,
            verdict: "WRONG",
            flags: ["cross_surface_disagreement"],
            sourceText: lineA.sourceMatch.quote ?? null,
          }),
        );
      }
    }
  }
  return extras;
}

function loadCaseFileText(lines: OutputLine[]): Map<string, string> {
  const fileByCase = new Map<string, string>();
  for (const line of lines) {
    if (line.sourceKind === "surface-sweep") continue;
    const rawPath = line.path.split(":")[0] ?? line.path;
    const dir = existsSync(rawPath) && statSync(rawPath).isDirectory() ? rawPath : dirname(rawPath);
    const candidates = [
      join(dir, "file-extract.txt"),
      join(dir, "source-extract.txt"),
      join(dir, "file.txt"),
      join(dir, "bundle-text.md"),
      join(dir, "front-matter-scan.txt"),
    ];
    for (const candidate of candidates) {
      const text = readText(candidate);
      if (text && text.length > 80) {
        fileByCase.set(line.caseId, text);
        break;
      }
    }
    if (line.surface === "file") {
      fileByCase.set(line.caseId, `${fileByCase.get(line.caseId) ?? ""}\n${line.text}`);
    }
  }
  return fileByCase;
}

export function detectStaleStateOutputs(lines: OutputLine[]): OutputLine[] {
  const extras: OutputLine[] = [];
  const fileByCase = loadCaseFileText(lines);
  const currentClientByCase = new Map<string, string>();
  for (const [caseId, fileText] of fileByCase) {
    try {
      const ledger = buildBundleTruthLedger({ bundleText: fileText });
      currentClientByCase.set(
        caseId,
        buildClientPacketSummary({ rows: ledger.materials }),
      );
    } catch {
      // Keep the File packet even if the ledger cannot rebuild a client line.
    }
  }
  for (const line of lines) {
    if (line.sourceKind === "surface-sweep") continue;
    if (!["client", "court", "overview", "chase"].includes(line.surface)) continue;
    const fileText = fileByCase.get(line.caseId) ?? null;
    const currentClient = currentClientByCase.get(line.caseId);
    if (line.sourceKind === "live-tab-capture" && /\bbuilding matter brief\b/i.test(line.text)) {
      continue;
    }
    if (currentClient && !staleAgainstFile(currentClient, fileText)) {
      if (/\bbuilding matter brief\b/i.test(line.text)) continue;
    }
    if (!staleAgainstFile(line.text, fileText) && !/\bbuilding matter brief\b/i.test(line.text)) continue;
    extras.push(
      finalizeLine({
        id: `stale:${line.caseId}:${hash(line.id + line.text)}`,
        sourceKind: line.sourceKind,
        caseId: line.caseId,
        surface: line.surface,
        path: line.path,
        text: line.text,
        refs: line.refs,
        sourceMatch: line.sourceMatch,
        verdict: "WRONG",
        flags: ["stale_state_output"],
        sourceText: fileText,
      }),
    );
  }
  return extras;
}

function messageForFlag(flag: string): string {
  switch (flag) {
    case "served_and_outstanding_same_line":
      return "The same solicitor-facing output says served/on-file and outstanding/missing.";
    case "compound_mixed_status_output":
      return "One output mixes served and missing sub-items; likely needs splitting into cleaner solicitor rows.";
    case "review_only_with_deadline_pressure":
      return "Review-only/unclear material is being pushed as overdue or due soon.";
    case "phone_output_without_phone_source":
      return "Phone download/subscriber wording appears without a matching phone extraction source in the File text.";
    case "999_audio_without_audio_source":
      return "999 audio wording appears without a matching audio/recording source in the File text.";
    case "generic_solicitor_clutter":
      return "Generic review wording repeats furniture instead of giving a useful solicitor signal.";
    case "internal_language_leak":
      return "Internal/programming language leaked into an output.";
    case "stuck_building_state":
      return "The live tab did not finish building the matter brief.";
    case "no_source_for_assertive_output":
      return "Assertive chase/missing wording had no clear source line in the available File/PDF extract.";
    case "unsupported_factual_statement":
      return "Factual-looking solicitor output has no source class or explanation.";
    case "wrong_defendant_source_bleed":
      return "Output names a defendant that is not the defendant on the current File/source packet.";
    case "unsafe_strengthening_of_source_wording":
      return "Output strengthens a weak/partial source into served/proved language.";
    case "cross_surface_disagreement":
      return "The same material/family carries conflicting statuses across solicitor surfaces.";
    case "stale_state_output":
      return "A generated surface still reflects previous bundle truth after File/Papers changed.";
    default:
      return `Historical sweep flag still present: ${flag}.`;
  }
}

function countBy<T extends string>(items: T[]): Array<{ code: T; count: number }> {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || String(a.code).localeCompare(String(b.code)));
}

function clusterFindings(findings: TraceFinding[]): Array<{ code: string; severity: Severity; count: number; cases: string[]; examples: TraceFinding[] }> {
  const map = new Map<string, TraceFinding[]>();
  for (const finding of findings) {
    const key = `${finding.severity}:${finding.code}:${finding.surface}`;
    map.set(key, [...(map.get(key) ?? []), finding]);
  }
  return [...map.entries()]
    .map(([key, rows]) => {
      const [severity, code, surface] = key.split(":") as [Severity, string, string];
      return {
        code: `${surface}:${code}`,
        severity,
        count: rows.length,
        cases: [...new Set(rows.map((row) => row.caseId))].slice(0, 40),
        examples: rows.slice(0, 8),
      };
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count);
}

function getHead(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require("child_process") as typeof import("child_process");
    return String(execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })).trim();
  } catch {
    return null;
  }
}

function parseArg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function increment(map: CounterMap, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function writeJsonArray(path: string, rows: unknown[]): void {
  const fd = openSync(path, "w");
  writeSync(fd, "[\n");
  for (let i = 0; i < rows.length; i += 1) {
    writeSync(fd, `${JSON.stringify(rows[i])}${i + 1 < rows.length ? "," : ""}\n`);
  }
  writeSync(fd, "]\n");
  closeSync(fd);
}

function writeNextRoots(outDir: string, summary: RunSummary, findings: TraceFinding[]): void {
  const hard = findings.filter((finding) => finding.class === "hard");
  const goldHard = hard.filter((finding) => finding.gold20);
  const top = countBy(goldHard.length ? goldHard.map((f) => f.hardBucket ?? f.code) : hard.map((f) => f.hardBucket ?? f.code)).slice(0, 6);
  const examples = (code: string) =>
    (goldHard.length ? goldHard : hard)
      .filter((finding) => (finding.hardBucket ?? finding.code) === code)
      .slice(0, 6)
      .map((finding) => `- ${finding.caseId} / ${finding.surface}: ${finding.output.slice(0, 180)}`);

  const blocks = top.map((row, index) => {
    const title =
      row.code === "stale_state_output"
        ? "Client/generated surfaces still carry previous bundle truth"
        : row.code === "cross_surface_disagreement"
          ? "Same family disagrees across Overview / Papers / Chase / Court / Client"
          : row.code === "unsupported_factual_statement"
            ? "Factual solicitor lines with no source class"
            : row.code;
    return [
      `${index + 1}. ${title}`,
      `   - Hard bucket: \`${row.code}\` (${row.count})`,
      ...examples(row.code).map((line) => `   ${line}`),
      row.code === "stale_state_output"
        ? "   - Fix shape: rebuild Client Summary and court/overview lines from the current File/Papers packet, not a previous generated brief."
        : row.code === "cross_surface_disagreement"
          ? "   - Fix shape: one family/status owner shared by Overview, Papers, CPS Chase, Court, and Client."
          : "   - Fix shape: every factual line needs a receipt (source class + quote) or it must not render.",
    ].join("\n");
  });

  writeFileSync(
    join(outDir, "NEXT-ROOTS.md"),
    [
      "# Case truth receipt — next roots",
      "",
      `Run: \`${basename(outDir)}\``,
      `Head: \`${summary.head ?? "unknown"}\``,
      "Mode: receipt-mode assurance. Do not merge. Do not production deploy.",
      "",
      "## Gold 20 hard vs soft",
      "",
      `- Hard total: ${summary.gold20Acceptance.hardTotal}`,
      `- Soft total: ${summary.gold20Acceptance.softTotal}`,
      `- Hard buckets: ${JSON.stringify(summary.gold20Acceptance.hard)}`,
      "",
      "Soft wording is not a truth failure. Do not mix the two.",
      "",
      "## Shared product roots to fix next",
      "",
      ...(blocks.length ? blocks : ["No Gold 20 hard failures in this receipt run. Check corpus hard counters before closing the lane."]),
      "",
      "## Do not do next",
      "",
      "- Do not spend the next commit on ugly titles, copy-button furniture, or generic boilerplate.",
      "- Do not treat historical sweep flags as live Gold 20 proof.",
      "",
    ].join("\n"),
  );
}

export function runTrace(outDir: string): RunSummary {
  ensureDir(outDir);
  const localLines = traceLocalCases(LOCAL_CASE_ROOT);
  const liveLines = LIVE_TAB_ROOTS.flatMap((root) => traceLiveTabs(root));
  const sweepLines = traceSweeps();
  const baseLines = [...localLines, ...liveLines, ...sweepLines];
  const packetLines = emitCurrentPacketLines(baseLines);
  const scoredLines = [...baseLines, ...packetLines];
  const allLines = [...scoredLines, ...detectCrossSurfaceDisagreements(scoredLines), ...detectStaleStateOutputs(scoredLines)];
  const findings = allLines.flatMap(findingForLine);
  const clusters = clusterFindings(findings);
  const hardFindings = findings.filter((finding) => finding.class === "hard");
  const softFindings = findings.filter((finding) => finding.class === "soft");
  const corpusHard = emptyHard();
  const corpusSoft = emptySoft();
  const goldHard = emptyHard();
  const goldSoft = emptySoft();
  for (const finding of hardFindings) {
    if (finding.hardBucket) increment(corpusHard, finding.hardBucket);
    if (finding.gold20 && finding.hardBucket) increment(goldHard, finding.hardBucket);
  }
  for (const finding of softFindings) {
    if (finding.softBucket) increment(corpusSoft, finding.softBucket);
    if (finding.gold20 && finding.softBucket) increment(goldSoft, finding.softBucket);
  }

  const summary: RunSummary = {
    generatedAt: new Date().toISOString(),
    head: getHead(),
    mode: "receipt",
    scanned: {
      localCases: listDirs(LOCAL_CASE_ROOT).filter((dir) => existsSync(join(dir, "casebrain-output.json"))).length,
      liveTabCases: new Set(liveLines.map((line) => line.caseId)).size,
      sweepRecords: SWEEP_FILES.reduce((sum, sweep) => sum + readNdjson(sweep.path).length, 0),
      outputLines: allLines.length,
      sourceBackedLines: allLines.filter((line) => line.sourceMatch.method === "ref" || line.sourceMatch.method === "token").length,
      noSourceLines: allLines.filter((line) => line.sourceMatch.method === "none").length,
      notOnGitLines: allLines.filter((line) => line.sourceMatch.method === "not-on-git").length,
      findings: findings.length,
      receiptBackedLines: allLines.filter((line) => line.receipt.sourceClass === "source_backed").length,
      unsupportedFactualLines: allLines.filter((line) => line.receipt.sourceClass === "unsupported" && line.sourceMatch.method !== "not-on-git").length,
    },
    severityCounts: {
      P0: findings.filter((finding) => finding.severity === "P0").length,
      P1: findings.filter((finding) => finding.severity === "P1").length,
      P2: findings.filter((finding) => finding.severity === "P2").length,
      P3: findings.filter((finding) => finding.severity === "P3").length,
    },
    corpus: {
      hard: corpusHard,
      soft: corpusSoft,
      hardTotal: hardFindings.length,
      softTotal: softFindings.length,
    },
    gold20Acceptance: {
      cases: new Set(allLines.filter((line) => line.gold20).map((line) => line.caseId)).size,
      outputLines: allLines.filter((line) => line.gold20).length,
      hard: goldHard,
      soft: goldSoft,
      hardTotal: hardFindings.filter((finding) => finding.gold20).length,
      softTotal: softFindings.filter((finding) => finding.gold20).length,
    },
    topCodes: countBy(findings.map((finding) => finding.code)).slice(0, 20),
    topHardCodes: countBy(hardFindings.map((finding) => finding.hardBucket ?? finding.code)).slice(0, 12),
    topSurfaces: countBy(findings.map((finding) => finding.surface)).slice(0, 10).map(({ code, count }) => ({
      surface: code,
      count,
    })),
    note:
      "Receipt mode: every solicitor-facing factual line must carry output → type → truth state → source/ref → supporting text → transformation → source class → final wording. Soft wording is counted separately from Gold 20 hard truth failures. Historical sweeps without a source quote stay in the historical queue.",
  };

  writeFileSync(join(outDir, "trace-summary.json"), JSON.stringify(summary, null, 2));
  writeJsonArray(join(outDir, "output-lines.json"), allLines);
  writeJsonArray(join(outDir, "findings.json"), findings);
  writeFileSync(join(outDir, "finding-clusters.json"), JSON.stringify(clusters.slice(0, 400), null, 2));
  writeNextRoots(outDir, summary, findings);
  writeFileSync(
    join(outDir, "README.md"),
    [
      "# Case truth receipt",
      "",
      "Purpose: every solicitor-facing factual output is audited as:",
      "`output → output type → truth state → source document/page/ref → exact supporting text → transformation → source class → final wording`.",
      "",
      "If no source supports the line, it must be one of:",
      "`source_backed` / `derived_from_absence` / `user_entered` / `procedural_instruction` / `generated_from_missing_expected_material` / `unsupported`.",
      "Factual-looking output with no source class fails the audit.",
      "",
      "This does not edit product code, merge a PR, or deploy production.",
      "",
      "Files:",
      "- `trace-summary.json` - corpus + Gold 20 hard/soft counters.",
      "- `output-lines.json` - every captured line with a receipt.",
      "- `findings.json` - hard / soft / historical findings.",
      "- `finding-clusters.json` - grouped roots.",
      "- `NEXT-ROOTS.md` - next product fix, hard roots only.",
      "",
      "Hard counters are truth failures. Soft counters are wording/furniture only.",
      "",
    ].join("\n"),
  );

  return summary;
}

if (require.main === module) {
  const explicitOut = parseArg("out");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = explicitOut ?? join(DEFAULT_OUT_ROOT, `run-${stamp}`);
  const summary = runTrace(outDir);
  console.log(JSON.stringify({ outDir, summary }, null, 2));
}
