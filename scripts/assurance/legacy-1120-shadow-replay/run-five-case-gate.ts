import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type { UploadedDocumentUnit } from "@/lib/criminal/build-from-document-units";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import {
  chargeReadinessForCase,
  collectSolicitorVisibleStrings,
  extractPilotPdf,
  generateOutputPdfForCase,
} from "@/scripts/assurance/real-pdf-live-pilot/pdf-materialise";
import type { PilotEntry } from "@/scripts/assurance/real-pdf-live-pilot/pilot-20-definition";

const REPO_ROOT = process.cwd();
const ENV_FILE = process.env.CASEBRAIN_ENV_FILE || "C:/Users/gduff/casebrain-hub/.env.local";
const ARTEFACT_ROOT = path.join(
  REPO_ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay",
);
const PRIVATE_FREEZE = path.join(ARTEFACT_ROOT, "local-private-frozen-membership.json");
const FOCUS_SEQUENCES = (process.env.LEGACY_REPLAY_FOCUS_SEQUENCES || "")
  .split(",")
  .map((value) => Number.parseInt(value.trim(), 10))
  .filter((value) => Number.isInteger(value) && value > 0);
const FOCUS_CASE_IDS = (process.env.LEGACY_REPLAY_FOCUS_CASE_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (FOCUS_SEQUENCES.length && FOCUS_CASE_IDS.length) {
  throw new Error("Use only one focus selector: sequences or source case IDs");
}
const FOCUS_COUNT = FOCUS_SEQUENCES.length || FOCUS_CASE_IDS.length;
const REPLAY_LIMIT = FOCUS_COUNT || Number.parseInt(process.env.LEGACY_REPLAY_LIMIT || "5", 10);
if (FOCUS_COUNT === 0 && ![5, 20, 100, 1120].includes(REPLAY_LIMIT)) {
  throw new Error(`LEGACY_REPLAY_LIMIT must be one of 5, 20, 100 or 1120 (received ${REPLAY_LIMIT})`);
}
if (new Set(FOCUS_SEQUENCES).size !== FOCUS_SEQUENCES.length || FOCUS_SEQUENCES.some((value) => value > 1120)) {
  throw new Error("LEGACY_REPLAY_FOCUS_SEQUENCES must contain unique frozen sequence numbers between 1 and 1120");
}
if (new Set(FOCUS_CASE_IDS).size !== FOCUS_CASE_IDS.length) {
  throw new Error("LEGACY_REPLAY_FOCUS_CASE_IDS must contain unique source case IDs");
}
const RUN_ROOT = path.join(
  ARTEFACT_ROOT,
  process.env.LEGACY_REPLAY_RUN_NAME || "five-case-production-path-gate-v2-shared-root",
);

const ACCEPTANCE = {
  schemaVersion: "legacy-1120-deterministic-checkpoint-acceptance@1.0.0",
  lockedBeforeRun: true,
  checkpointCases: REPLAY_LIMIT,
  population: `${REPLAY_LIMIT} frozen legacy PDFs selected from the immutable 1,120 membership`,
  requiredForDeterministicBuilderGate: [
    "source object re-download hash matches frozen hash",
    "production PDF parser completes",
    "production surface builder completes",
    "genuine CaseBrain output PDF is generated",
    "incomplete charge state remains visible across named exits",
    "solicitor-visible internal/system language scanner has zero hits",
  ],
  requiredForFullProductionReplayGate: [
    "all deterministic builder requirements",
    "funded AI extraction request succeeds",
    "isolated shadow persistence succeeds",
    "authenticated HTTP/browser surfaces are exercised",
  ],
  failClosedRules: [
    "AI 429 is BLOCKED, never PASS",
    "builder projection is not authenticated application execution",
    "generated output PDF is not a source PDF",
    "automated wording scan is not solicitor approval",
  ],
};

type FrozenDocument = {
  documentId: string;
  name: string;
  storageRef: { bucket: string; objectPath: string } | null;
  storedSourceTextBytes: number;
  storedSourceTextSha256: string;
  object: { status: string; bytes: number; sha256: string | null; pdfMagic: boolean };
};
type FrozenRow = {
  sequence: number;
  caseId: string;
  organisationId: string;
  title: string;
  createdAt: string;
  evalPackId: string | null;
  evalPackName: string | null;
  documents: FrozenDocument[];
};
type FrozenManifest = {
  orderedMembershipSha256: string;
  rows: FrozenRow[];
};

function loadEnv(file: string): void {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function writeJson(fileName: string, value: unknown): void {
  fs.writeFileSync(path.join(RUN_ROOT, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeCheckpointStatus(value: unknown): void {
  const target = path.join(RUN_ROOT, "CHECKPOINT-STATUS.json");
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, target);
}

function encodeObjectPath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function download(ref: FrozenDocument["storageRef"]): Promise<Buffer> {
  if (!ref) throw new Error("Missing storage reference");
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(ref.bucket)}/${encodeObjectPath(ref.objectPath)}`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Storage download returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function aiCreditPreflight(): Promise<Record<string, unknown>> {
  const model = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply only OK" }],
      max_tokens: 2,
      temperature: 0,
    }),
  });
  let errorCode: string | null = null;
  let errorCategory: string | null = null;
  let modelReturned: string | null = null;
  try {
    const body = await response.json() as { model?: string; error?: { code?: string; type?: string; message?: string } };
    errorCode = body.error?.code || null;
    errorCategory = body.error?.type || (body.error?.message?.includes("no credits") ? "no_credits" : null);
    modelReturned = body.model || null;
  } catch {
    errorCategory = "unparseable_response";
  }
  return {
    attemptedAt: new Date().toISOString(),
    ok: response.ok,
    httpStatus: response.status,
    requestedModel: model,
    modelReturned,
    errorCode,
    errorCategory,
    secretRecorded: false,
  };
}

function selectFive(rows: FrozenRow[]): Array<{ row: FrozenRow; stratum: string }> {
  const oneDocRows = rows.filter((row) => row.documents.length === 1 && row.documents[0].object.status === "retrieved");
  const byBytes = [...oneDocRows].sort((a, b) => b.documents[0].object.bytes - a.documents[0].object.bytes);
  const recentNonEval = [...oneDocRows].reverse().find((row) => !row.evalPackId && !row.evalPackName);
  const duplicateHash = oneDocRows.find((row, index) =>
    oneDocRows.findIndex((candidate) => candidate.documents[0].object.sha256 === row.documents[0].object.sha256) !== index,
  );
  const median = [...oneDocRows].sort((a, b) => a.documents[0].object.bytes - b.documents[0].object.bytes)[Math.floor(oneDocRows.length / 2)];
  const small = [...oneDocRows].sort((a, b) => a.documents[0].object.bytes - b.documents[0].object.bytes)[0];
  const candidates: Array<{ row: FrozenRow | undefined; stratum: string }> = [
    { row: byBytes[0], stratum: "largest_pdf" },
    { row: recentNonEval, stratum: "recent_non_eval" },
    { row: duplicateHash, stratum: "exact_duplicate_source_member" },
    { row: median, stratum: "median_size" },
    { row: small, stratum: "smallest_pdf" },
  ];
  const selected: Array<{ row: FrozenRow; stratum: string }> = [];
  for (const candidate of candidates) {
    if (candidate.row && !selected.some((entry) => entry.row.caseId === candidate.row!.caseId)) {
      selected.push({ row: candidate.row, stratum: candidate.stratum });
    }
  }
  for (const row of oneDocRows) {
    if (selected.length >= 5) break;
    if (!selected.some((entry) => entry.row.caseId === row.caseId)) selected.push({ row, stratum: "deterministic_fill" });
  }
  if (selected.length !== 5) throw new Error(`Could not select five unique cases (selected ${selected.length})`);
  return selected;
}

/**
 * Deterministic checkpoint membership. The original five anchors are retained,
 * then distinct legacy evaluation-pack families and object-size quantiles are
 * added. This avoids a first-N sample while keeping every larger checkpoint a
 * superset of the five-case gate.
 */
function selectCheckpoint(rows: FrozenRow[], limit: number): Array<{ row: FrozenRow; stratum: string }> {
  if (limit === 5) return selectFive(rows);
  const eligible = rows.filter((row) =>
    row.documents.length === 1 && row.documents[0]?.object.status === "retrieved",
  );
  if (eligible.length < limit) throw new Error(`Only ${eligible.length} frozen single-PDF rows are eligible for ${limit}`);

  const selected = [...selectFive(rows)];
  const add = (row: FrozenRow | undefined, stratum: string): void => {
    if (!row || selected.length >= limit || selected.some((entry) => entry.row.caseId === row.caseId)) return;
    selected.push({ row, stratum });
  };

  const byFamily = new Map<string, FrozenRow[]>();
  for (const row of eligible) {
    const key = (row.evalPackName || row.evalPackId || "non_eval").trim().toLowerCase();
    const group = byFamily.get(key) ?? [];
    group.push(row);
    byFamily.set(key, group);
  }
  const families = [...byFamily.entries()].sort(([a], [b]) => a.localeCompare(b));
  const familySlots = Math.min(families.length, Math.max(0, Math.floor(limit * 0.6)));
  for (let i = 0; i < familySlots && selected.length < limit; i += 1) {
    const index = familySlots === 1 ? 0 : Math.round(i * (families.length - 1) / (familySlots - 1));
    const [family, group] = families[index]!;
    const representative = [...group].sort((a, b) =>
      b.documents[0]!.object.bytes - a.documents[0]!.object.bytes || a.caseId.localeCompare(b.caseId),
    )[0];
    add(representative, `evaluation_family:${family}`);
  }

  const byBytes = [...eligible].sort((a, b) =>
    a.documents[0]!.object.bytes - b.documents[0]!.object.bytes || a.caseId.localeCompare(b.caseId),
  );
  const remainingForQuantiles = limit - selected.length;
  for (let i = 0; i < remainingForQuantiles * 2 && selected.length < limit; i += 1) {
    const denominator = Math.max(1, remainingForQuantiles * 2 - 1);
    const index = Math.round(i * (byBytes.length - 1) / denominator);
    add(byBytes[index], `source_size_quantile:${i + 1}`);
  }

  for (const row of eligible) {
    if (selected.length >= limit) break;
    add(row, "deterministic_fill");
  }
  if (selected.length !== limit) throw new Error(`Could not select ${limit} unique cases (selected ${selected.length})`);
  return selected;
}

function scanVisibleStrings(rows: Array<{ surface: string; text: string }>): Array<Record<string, unknown>> {
  const findings: Array<Record<string, unknown>> = [];
  const checks: Array<{ code: string; pattern: RegExp }> = [
    { code: "RAW_ENUM_OR_SNAKE_CASE", pattern: /\b(?:[a-z]+_[a-z_]+|referred_only|other_defendant_only|not_exercised)\b/ },
    { code: "INTERNAL_SYSTEM_LANGUAGE", pattern: /\b(?:harness|detector|candidate ledger|stage[- ]?3000|fixture|protected audit|requestId=|evidenceUnitId=|Document lifecycle role|Document role (?:operative|amended|superseded|unknown)|Affirmative PACE OK|no-breach is forbidden)\b/i },
    { code: "DUPLICATE_DO_NOT", pattern: /\bdo not\s+do not\b/i },
    { code: "LOWERCASE_PROTECTED_ACRONYM", pattern: /\b(?:cctv|bwv|pace|mg5|mg6|mg11|abe|pet)\b/ },
    { code: "ELLIPSIS_TRUNCATION", pattern: /\.\.\.$|…$/ },
    { code: "MALFORMED_JOINED_SOURCE", pattern: /\b(?:servedserved|s\d+(?:cctv|bwv)|[a-z]{4,}(?:served|missing)(?:served|missing))\b/i },
    { code: "VISIBLE_EVALUATION_IDENTIFIER", pattern: /\b(?:legacy-shadow-five|CB-[A-Z0-9-]*(?:TEST|GOLD|THIN|40X40)[A-Z0-9_-]*)\b/i },
  ];
  for (const row of rows) {
    for (const check of checks) {
      if (check.pattern.test(row.text.trim())) {
        findings.push({ code: check.code, surface: row.surface, text: row.text.slice(0, 500), textSha256: sha256(row.text) });
      }
    }
  }
  return findings;
}

function sourceHasStrongChargeCue(text: string): boolean {
  const normalized = text
    .replace(/Charge(?=[A-Z])/g, "Charge: ")
    .replace(/Offence(?=[A-Z])/g, "Offence: ");
  return (
    /(?:^|\n)\s*(?:charge(?:\s+(?:sheet(?:\s+extract)?|wording))?|offence|statement of offence|count\s+\d+)\s*(?:[:\-]\s*|\r?\n\s*)/im.test(normalized) &&
    /\b(?:contrary to|particulars(?: of offence)?|section\s+\d+|s\.?\s*\d+|common law|is charged with|is alleged to have)\b/i.test(normalized)
  );
}

function assessSemanticExtraction(args: {
  text: string;
  structuredMeta: ReturnType<typeof extractCriminalCaseMeta> | null;
  surfaces: ReturnType<typeof buildLiveProductionSurfacesFromDocumentUnits> | null;
}): Array<{ code: string; detail: string }> {
  const defects: Array<{ code: string; detail: string }> = [];
  const hasChargeCue = sourceHasStrongChargeCue(args.text);
  const hasDefendantCue =
    /(?:^|\n)\s*(?:defendant|accused)\s*:\s*[A-Z][a-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+)+/m.test(args.text) ||
    /(?:Defendant|Accused)(?=[A-Z][a-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+)+)/m.test(args.text);

  if (hasChargeCue && !args.structuredMeta?.charges.length) {
    defects.push({ code: "SOURCE_CHARGE_NOT_EXTRACTED", detail: "Strong charge-page cue exists but structured charge extraction returned no rows." });
  }
  if (hasChargeCue && !args.surfaces?.pipeline.charges.length) {
    defects.push({ code: "SOURCE_CHARGE_NOT_PROPAGATED", detail: "Source-backed charge page did not reach canonical production surfaces." });
  }
  if (hasDefendantCue && !args.structuredMeta?.defendantName) {
    defects.push({ code: "SOURCE_DEFENDANT_NOT_EXTRACTED", detail: "A labelled defendant field exists but no defendant name was extracted." });
  }
  if (args.structuredMeta?.charges.some((charge) => /^[,;:]|\bnot every element\b/i.test(charge.location ?? ""))) {
    defects.push({ code: "PROSE_AS_CHARGE_LOCATION", detail: "Narrative prose was stored as a charge location." });
  }
  if (args.surfaces?.pipeline.charges.some((charge) => /^(?:old|earlier|new|current|amended|superseded)\s+version\.?$/i.test(charge.offence.trim()))) {
    defects.push({ code: "VERSION_HEADING_AS_CHARGE", detail: "A document-version heading was promoted as an offence." });
  }
  if (args.surfaces?.pipeline.charges.some((charge) => /^[/\-–—\s]*(?:alternative|lesser|related allegation)\b/i.test(charge.offence.trim()))) {
    defects.push({ code: "WORKING_NOTE_AS_CHARGE", detail: "A drafting or alternative-count note was promoted as an offence." });
  }
  if (args.surfaces?.pipeline.charges.some((charge) => /[,;:]$|\b(?:the|a|an)$/i.test(charge.location ?? ""))) {
    defects.push({ code: "INCOMPLETE_CHARGE_LOCATION", detail: "A charge location ends on punctuation or an unfinished article." });
  }
  if (args.surfaces?.pipeline.charges.some((charge) => /(?:\.\.\.|…|\b(?:at|of|to|with|and|in))\s*$/i.test(charge.offence.trim()))) {
    defects.push({ code: "OBJECTIVE_CHARGE_TRUNCATION", detail: "A canonical charge line ends mid-thought or on a joining word." });
  }
  if (args.surfaces?.pipeline.charges.some((charge) => charge.particulars && /(?:\.\.\.|…|\b(?:at|of|to|with|and|in|doing))\s*$/i.test(charge.particulars.trim()))) {
    defects.push({ code: "OBJECTIVE_PARTICULARS_TRUNCATION", detail: "Charge particulars end mid-thought or on a joining word." });
  }

  const hearingKeys = (args.structuredMeta?.hearings ?? []).map((hearing) =>
    `${hearing.date}|${(hearing.court ?? "").toLowerCase().replace(/^(?:at|hearing listed at|court)\s+/i, "")}`,
  );
  if (new Set(hearingKeys).size !== hearingKeys.length) {
    defects.push({ code: "DUPLICATE_HEARING_LISTING", detail: "The same court/date listing was emitted more than once." });
  }
  if ((args.structuredMeta?.hearings ?? []).some((hearing) => /Court[A-Z]|StationCourt|Hearing listed at/i.test(hearing.court ?? ""))) {
    defects.push({ code: "MALFORMED_COURT_NAME", detail: "A glued label or narrative prefix remains in the court name." });
  }
  return defects;
}

function sourceFactWindows(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const hits: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\b(?:defendant|accused|charge|offence|particulars|court|hearing)\b|(?:Defendant|Accused|Charge|Offence|Court|Hearing)(?=[A-Z])/i.test(lines[index] ?? "")) continue;
    const window = lines
      .slice(Math.max(0, index - 1), Math.min(lines.length, index + 3))
      .join(" | ")
      .replace(/\s+/g, " ")
      .trim();
    if (window && !hits.includes(window)) hits.push(window.slice(0, 500));
    if (hits.length >= 30) break;
  }
  return hits;
}

async function main(): Promise<void> {
loadEnv(ENV_FILE);
fs.mkdirSync(RUN_ROOT, { recursive: true });
writeJson("LOCKED-ACCEPTANCE-CONTRACT.json", ACCEPTANCE);

const freeze = JSON.parse(fs.readFileSync(PRIVATE_FREEZE, "utf8")) as FrozenManifest;
const selected = FOCUS_SEQUENCES.length
  ? FOCUS_SEQUENCES.map((sequence) => {
      const row = freeze.rows.find((candidate) => candidate.sequence === sequence);
      if (!row) throw new Error(`Frozen sequence ${sequence} was not found`);
      return { row, stratum: `focused_pre_remediation_failure:${sequence}` };
    })
  : FOCUS_CASE_IDS.length
    ? FOCUS_CASE_IDS.map((caseId) => {
        const row = freeze.rows.find((candidate) => candidate.caseId === caseId);
        if (!row) throw new Error(`Frozen source case ${caseId} was not found`);
        return { row, stratum: `focused_pre_remediation_failure:${caseId}` };
      })
  : selectCheckpoint(freeze.rows, REPLAY_LIMIT);
const selectionFingerprint = sha256(JSON.stringify({
  parentOrderedMembershipSha256: freeze.orderedMembershipSha256,
  replayLimit: REPLAY_LIMIT,
  caseIds: selected.map((entry) => entry.row.caseId),
}));
writeJson(`FROZEN-${REPLAY_LIMIT}-SELECTION.json`, {
  parentOrderedMembershipSha256: freeze.orderedMembershipSha256,
  selectionPolicy: "five fixed anchors + distinct evaluation-family representatives + source-size quantiles + deterministic fill",
  selected: selected.map(({ row, stratum }, index) => ({ sequence: index + 1, caseId: row.caseId, stratum, documentId: row.documents[0].documentId, frozenObjectSha256: row.documents[0].object.sha256 })),
});

const ai = await aiCreditPreflight();
writeJson("AI-EXTRACTION-PREFLIGHT.json", ai);

const caseResults: Array<Record<string, unknown>> = [];
const allWordingFindings: Array<Record<string, unknown>> = [];
const checkpointPath = path.join(RUN_ROOT, "CASE-RESULTS.checkpoint.jsonl");
const checkpointMetaPath = path.join(RUN_ROOT, "CHECKPOINT-METADATA.json");
const completedBySourceCaseId = new Map<string, Record<string, unknown>>();
if (fs.existsSync(checkpointPath)) {
  const meta = fs.existsSync(checkpointMetaPath)
    ? JSON.parse(fs.readFileSync(checkpointMetaPath, "utf8")) as { selectionFingerprint?: string }
    : null;
  if (meta?.selectionFingerprint !== selectionFingerprint) {
    throw new Error("Existing checkpoint does not match the frozen selection; refusing unsafe resume");
  }
  for (const line of fs.readFileSync(checkpointPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const row = JSON.parse(line) as Record<string, unknown>;
    const sourceCaseId = typeof row.sourceCaseId === "string" ? row.sourceCaseId : null;
    if (!sourceCaseId || completedBySourceCaseId.has(sourceCaseId)) {
      throw new Error("Checkpoint contains a missing or duplicate sourceCaseId");
    }
    completedBySourceCaseId.set(sourceCaseId, row);
  }
} else {
  fs.writeFileSync(checkpointPath, "");
  writeJson("CHECKPOINT-METADATA.json", {
    schemaVersion: "legacy-1120-checkpoint-metadata@1.0.0",
    selectionFingerprint,
    parentOrderedMembershipSha256: freeze.orderedMembershipSha256,
    replayLimit: REPLAY_LIMIT,
    appendOnly: true,
  });
}

for (let index = 0; index < selected.length; index += 1) {
  const { row, stratum } = selected[index];
  const completed = completedBySourceCaseId.get(row.caseId);
  if (completed) {
    caseResults.push(completed);
    const findings = Array.isArray(completed.wordingFindings)
      ? completed.wordingFindings as Array<Record<string, unknown>>
      : [];
    allWordingFindings.push(...findings.map((finding) => ({ caseId: completed.caseId, ...finding })));
    continue;
  }
  const document = row.documents[0];
  const caseId = `legacy-shadow-${REPLAY_LIMIT}-${String(index + 1).padStart(4, "0")}`;
  const buffer = await download(document.storageRef);
  const objectHash = sha256(buffer);
  const extraction = await extractPilotPdf(buffer, document.name);
  let surfaces = null;
  let surfacesError: string | null = null;
  let outputPdf = null;
  let chargeReadiness = null;
  let strings: Array<{ caseId: string; surface: string; text: string }> = [];
  let structuredMeta = null;
  let semanticDefects: Array<{ code: string; detail: string }> = [];

  if (extraction.ok) {
    const unit: UploadedDocumentUnit = {
      id: document.documentId,
      title: document.name,
      documentType: null,
      documentDate: null,
      uploadOrder: 0,
      pages: extraction.pageUnits,
      fullText: extraction.text,
    };
    try {
      surfaces = buildLiveProductionSurfacesFromDocumentUnits([unit], { caseId, caseTitle: row.title });
      structuredMeta = extractCriminalCaseMeta({ text: extraction.text, documentName: document.name });
      chargeReadiness = chargeReadinessForCase(caseId, surfaces);
      strings = collectSolicitorVisibleStrings(caseId, surfaces);
      const entry: PilotEntry = {
        id: caseId,
        fileName: document.name,
        absoluteSourcePath: "[supabase-storage-stream]",
        expectedSha256: document.object.sha256!,
        pageCount: extraction.pageCount || 0,
        primaryTest: stratum,
        strata: [stratum],
      };
      outputPdf = (await generateOutputPdfForCase(REPO_ROOT, entry, surfaces)).result;
      if (outputPdf.extractedText) {
        strings.push({
          caseId,
          surface: "generated_output_pdf:extracted_text",
          text: outputPdf.extractedText,
        });
      }
    } catch (error) {
      surfacesError = error instanceof Error ? error.message : String(error);
    }
    semanticDefects = assessSemanticExtraction({ text: extraction.text, structuredMeta, surfaces });
  }
  const wordingFindings = scanVisibleStrings(strings);
  allWordingFindings.push(...wordingFindings.map((finding) => ({ caseId, ...finding })));
  const caseResult: Record<string, unknown> = {
    sequence: index + 1,
    caseId,
    sourceCaseId: row.caseId,
    stratum,
    source: {
      name: document.name,
      frozenSha256: document.object.sha256,
      replaySha256: objectHash,
      hashMatches: objectHash === document.object.sha256,
      bytes: buffer.length,
    },
    extraction: {
      ok: extraction.ok,
      error: extraction.error,
      pageCount: extraction.pageCount,
      pagesWithText: extraction.pagesWithText,
      pagesWithoutText: extraction.pagesWithoutText,
      textLayerLimitation: extraction.textLayerLimitation,
    },
    structuredMeta,
    sourceFactWindows: sourceFactWindows(extraction.text),
    semanticDefects,
    canonicalCharges: surfaces?.pipeline.charges ?? [],
    surfacesBuilt: !!surfaces,
    surfacesError,
    solicitorVisibleStringCount: strings.length,
    wordingFindings,
    chargeReadiness,
    outputPdf,
    generatedOutputPdfWordingFindingCount: wordingFindings.filter(
      (finding) => finding.surface === "generated_output_pdf:extracted_text",
    ).length,
  };
  caseResults.push(caseResult);
  fs.appendFileSync(checkpointPath, `${JSON.stringify(caseResult)}\n`);
  if ((index + 1) % 20 === 0 || index + 1 === selected.length) {
    writeCheckpointStatus({
      schemaVersion: "legacy-1120-checkpoint-status@1.0.0",
      selectionFingerprint,
      completed: caseResults.length,
      required: selected.length,
      lastCompletedAt: new Date().toISOString(),
      resumable: caseResults.length < selected.length,
    });
  }
}

writeJson(`${REPLAY_LIMIT}-CASE-RESULTS.json`, caseResults);
writeJson("SOLICITOR-VISIBLE-WORDING-FINDINGS.json", allWordingFindings);

const deterministicGate = {
  sourceHashesMatch: caseResults.every((row: any) => row.source.hashMatches),
  extractionSucceeded: caseResults.every((row: any) => row.extraction.ok),
  surfacesBuilt: caseResults.every((row: any) => row.surfacesBuilt),
  outputPdfsGenerated: caseResults.every((row: any) => row.outputPdf?.generated),
  incompleteChargeSignalsPreserved: caseResults.every((row: any) => row.chargeReadiness?.incompleteStaysIncomplete !== false),
  visibleWordingFindingCount: allWordingFindings.length,
  semanticDefectCount: caseResults.reduce((sum: number, row: any) => sum + row.semanticDefects.length, 0),
  casesWithCanonicalCharge: caseResults.filter((row: any) => row.canonicalCharges.length > 0).length,
};
const deterministicGatePass = Object.entries(deterministicGate)
  .filter(([key]) => !["visibleWordingFindingCount", "semanticDefectCount", "casesWithCanonicalCharge"].includes(key))
  .every(([, value]) => value === true) &&
  deterministicGate.visibleWordingFindingCount === 0 &&
  deterministicGate.semanticDefectCount === 0;
const fullProductionReplayGatePass = deterministicGatePass && ai.ok === true && false;
const decision = {
  schemaVersion: "legacy-1120-deterministic-checkpoint-decision@1.0.0",
  generatedAt: new Date().toISOString(),
  parentOrderedMembershipSha256: freeze.orderedMembershipSha256,
  deterministicGate,
  deterministicGatePass,
  fullProductionReplayGatePass,
  fullProductionBlockers: [
    ...(ai.ok ? [] : [{ blocker: "OPENAI_EXTRACTION_CREDITS", evidence: ai }]),
    { blocker: "ISOLATED_SHADOW_PERSISTENCE_NOT_STARTED", reason: "Fail closed until AI extraction preflight succeeds." },
    { blocker: "AUTHENTICATED_BROWSER_NOT_EXERCISED", reason: "Requires deployed shadow workspace after the production preflight passes." },
  ],
  claims: {
    sourcePdfBytesExercised: true,
    deterministicProductionBuildersExercised: true,
    generatedCasebrainOutputPdfsExercised: true,
    fundedAiExtractionExercised: ai.ok === true,
    authenticatedApplicationExercised: false,
    solicitorApproval: false,
    programmePass: false,
  },
  status: fullProductionReplayGatePass
    ? `${REPLAY_LIMIT}_CASE_FULL_PRODUCTION_GATE_PASS`
    : "STOP_BLOCKED_BEFORE_SHADOW_PERSISTENCE",
};
writeJson("DECISION-CARD.json", decision);
writeJson("STOP-FOR-CODEX-REVIEW.json", decision);
process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
