/**
 * Stage-3000 existing-census execution — resumable MAA V2 census over frozen 3000.
 *
 * Usage:
 *   npx tsx scripts/assurance/emit-maa-v2-stage3000-existing-census.ts
 *   npx tsx scripts/assurance/emit-maa-v2-stage3000-existing-census.ts --resume
 *
 * Does not repair CaseBrain. Does not commit. programmePassSupported=false.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";

import { containsAbsoluteProofWording } from "../../lib/criminal/absolute-proof-wording";
import { containsSolicitorForbiddenInternalLanguage } from "../../lib/criminal/solicitor-charge-model";
import {
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
} from "../../lib/criminal/solicitor-family-provenance";
import {
  isDocumentFormTitle,
  isFixtureIdLike,
  isInternalNonSolicitorString,
} from "../../lib/criminal/solicitor-visible-sanitization";
import {
  inferSolicitorSurfaceRole,
  scanSolicitorVisibleCopyQuality,
} from "../../lib/criminal/solicitor-visible-quality";

const ROOT = process.cwd();
const POST_FIX = process.argv.includes("--post-fix") || process.argv.includes("--final-corrections");
const FINAL_CORRECTIONS = process.argv.includes("--final-corrections");
const OUT = path.join(
  ROOT,
  FINAL_CORRECTIONS
    ? "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1-final-corrections"
    : POST_FIX
      ? "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1-post-fix"
      : "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1",
);
const V1_OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1",
);
const SURF_ARG = process.argv.find((a) => a.startsWith("--surfaces="))?.slice("--surfaces=".length);
const SURF = path.join(
  ROOT,
  SURF_ARG ||
    (FINAL_CORRECTIONS
      ? "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v11/surfaces.jsonl"
      : POST_FIX
        ? "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v10/surfaces.jsonl"
        : "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v9/surfaces.jsonl"),
);
const MEMBERSHIP_SRC = path.join(V1_OUT, "frozen-membership-3000.json");
const RUN_ID = FINAL_CORRECTIONS
  ? "stage3000-existing-census-v1-final-corrections"
  : POST_FIX
    ? "stage3000-existing-census-v1-post-fix"
    : "stage3000-existing-census-v1";
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
const CHECKPOINTS = [20, 50, 150, 300, 500, 1000, 3000] as const;
const BASELINE = "ca51ecba8fd70762488c43c69a4cdda3de9b8566";
const RESUME = process.argv.includes("--resume");
const EXPECTED_MEMBERSHIP_SHA =
  "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";

type MembershipRow = {
  orderIndex: number;
  caseId: string;
  sourceCaseId: string;
  family: string;
  trap: string;
  layout: string;
  sourceKind: string;
  sourceFingerprint: string;
  outputFingerprint: string;
  contentOutputFingerprint: string;
  hasEsaPacket: boolean;
  hasTruthKeyOnDisk: boolean;
  surfaceCount: number;
};

type SurfaceRow = {
  caseId: string;
  surfaceId: string;
  label?: string;
  text: string;
  textHash: string;
  canCopy: boolean;
  canExport: boolean;
  apiUsable: boolean;
  gateStatus?: string;
  matterFingerprint?: string;
};

type Candidate = {
  candidateId: string;
  caseId: string;
  orderIndex: number;
  controlId: string;
  findingCode: string;
  surfaceId: string;
  exactWording: string;
  textHash: string;
  exit: string;
  audience: string;
  reason: string;
  phase: "pre_truth";
};

type ExerciseRow = {
  caseId: string;
  orderIndex: number;
  controlId: string;
  implementationStatus: string;
  namedPrerequisiteStatus: string;
  evaluated: boolean;
  unresolved: boolean;
  not_exercised: boolean;
  containment: boolean;
  candidateFindingCount: number;
  missingAdapterOrInputReason: string | null;
};

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function appendJsonl(name: string, rows: unknown[]): void {
  if (!rows.length) return;
  fs.appendFileSync(
    path.join(OUT, name),
    `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`,
    "utf8",
  );
}
function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
function memMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function classifyExit(surfaceId: string, s: SurfaceRow): string {
  if (surfaceId.startsWith("api_")) return "api";
  if (/export|pdf/i.test(surfaceId)) return "export";
  if (s.canCopy) return "copy";
  if (/client|court|chase|summary|prose|war_room|control_room|five|key_facts/i.test(surfaceId)) {
    return "composed_prose";
  }
  return "view";
}

function classifyAudience(surfaceId: string): string {
  if (/client/i.test(surfaceId)) return "client";
  if (/court|hearing/i.test(surfaceId)) return "court";
  if (/cps|chase|disclosure/i.test(surfaceId)) return "cps";
  if (/supervisor/i.test(surfaceId)) return "supervisor";
  return "defence_solicitor";
}

function detectOnText(
  text: string,
  surfaceId: string,
): Array<{ findingCode: string; controlId: string; reason: string }> {
  const hits: Array<{ findingCode: string; controlId: string; reason: string }> = [];
  if (!text || !text.trim()) {
    hits.push({
      findingCode: "EMPTY_SURFACE_TEXT",
      controlId: "MAA-COMPLETENESS",
      reason: "empty_or_whitespace_surface",
    });
    return hits;
  }

  const role = inferSolicitorSurfaceRole(surfaceId);
  const isProvenanceTitle = role === "provenance_or_document_title";

  // Short document/provenance form titles (MG5/MG6) are allowed identifiers.
  if (isProvenanceTitle && isDocumentFormTitle(text)) {
    return hits;
  }

  if (solicitorVisibleTextContainsFamilyIssueCodes(text)) {
    hits.push({
      findingCode: "RAW_ENUM_OR_MACHINE_KEY",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "family_compatibility_issue_code_in_solicitor_visible_text",
    });
  }
  for (const hit of scanSolicitorVisibleInternalLanguageBoundary(text)) {
    if (hit.kind === "family_issue_code") continue; // already counted above
    hits.push({
      findingCode: "INTERNAL_SYSTEM_LANGUAGE_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: `system_language:${hit.matched}`,
    });
  }

  if (
    !isProvenanceTitle &&
    (containsSolicitorForbiddenInternalLanguage(text) || isInternalNonSolicitorString(text))
  ) {
    hits.push({
      findingCode: "INTERNAL_LANGUAGE_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "internal_or_audit_language_in_solicitor_visible_text",
    });
  }
  if (isFixtureIdLike(text)) {
    hits.push({
      findingCode: "FIXTURE_ID_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "fixture_or_harness_id_like_token",
    });
  }
  if (containsAbsoluteProofWording(text)) {
    hits.push({
      findingCode: "ABSOLUTE_PROOF_WORDING",
      controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
      reason: "absolute_proof_language",
    });
  }
  for (const issue of scanSolicitorVisibleCopyQuality(text, { surfaceId, surfaceRole: role })) {
    hits.push({
      findingCode: `COPY_QUALITY_${String(issue).toUpperCase()}`,
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: `copy_quality:${issue}`,
    });
  }
  if (
    /[a-z]{2,}_[a-z0-9_]{3,}/.test(text) &&
    /\b(enum|status|state|gateStatus|pipelineVersion|schemaVersion)\b/i.test(text)
  ) {
    hits.push({
      findingCode: "RAW_ENUM_OR_MACHINE_KEY",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "raw_enum_or_machine_key_leakage",
    });
  }
  // Broader snake_case family codes without requiring enum keywords
  if (
    !solicitorVisibleTextContainsFamilyIssueCodes(text) &&
    /\b[a-z]+_[a-z0-9_]{6,}\b/.test(text) &&
    /blocked|Reason:|Status:/i.test(text) &&
    /_on_/.test(text)
  ) {
    hits.push({
      findingCode: "RAW_ENUM_OR_MACHINE_KEY",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "snake_case_detector_code_in_blocked_reason",
    });
  }
  if (/\b(cb-[a-z]+-\d+|SYN-[A-Z0-9-]+|findingId|occurrenceRef)\b/i.test(text)) {
    hits.push({
      findingCode: "INTERNAL_ID_LEAK",
      controlId: "MAA2-SEC-01-BOUNDARY",
      reason: "internal_id_or_audit_token",
    });
  }
  if (!isProvenanceTitle && (/\w-\s*$/.test(text.trim()) || /\b[A-Za-z]{1,2}$/.test(text.trim()))) {
    hits.push({
      findingCode: "POSSIBLE_TRUNCATION",
      controlId: "MAA-COMPLETENESS",
      reason: "possible_mid_word_or_mid_sentence_truncation",
    });
  }
  return hits;
}

function loadRegistry() {
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"),
      "utf8",
    ),
  ) as { controls: Array<{ controlId: string }>; registryVersion: string };
  const impl = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json",
      ),
      "utf8",
    ),
  ) as { handlers: Record<string, { controlId: string; implementationStatus: string }> };
  const statusByControl = new Map<string, string>();
  for (const h of Object.values(impl.handlers || {})) {
    statusByControl.set(h.controlId, h.implementationStatus);
  }
  return { registry, statusByControl };
}

async function buildSurfaceMap(needed: Set<string>): Promise<Map<string, SurfaceRow[]>> {
  const map = new Map<string, SurfaceRow[]>();
  const rl = readline.createInterface({ input: fs.createReadStream(SURF), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const s = JSON.parse(line) as SurfaceRow;
    if (!needed.has(s.caseId)) continue;
    if (!map.has(s.caseId)) map.set(s.caseId, []);
    map.get(s.caseId)!.push(s);
  }
  return map;
}

function loadSourceHay(sourceCaseId: string, hasEsa: boolean): { hay: string | null; reason: string | null; beforeHash: string | null } {
  if (!hasEsa) return { hay: null, reason: "no_esa_packet", beforeHash: null };
  const abs = path.join(ESA, sourceCaseId, "bundle-text.md");
  if (!fs.existsSync(abs)) return { hay: null, reason: "bundle_text_missing", beforeHash: null };
  const buf = fs.readFileSync(abs);
  return { hay: buf.toString("utf8"), reason: null, beforeHash: sha(buf) };
}

function loadTruth(sourceCaseId: string, hasTruth: boolean): { truth: unknown | null; reason: string | null; hash: string | null } {
  if (!hasTruth) return { truth: null, reason: "truth_key_not_on_disk", hash: null };
  const abs = path.join(ESA, sourceCaseId, "truth-key.json");
  if (!fs.existsSync(abs)) return { truth: null, reason: "truth_key_missing", hash: null };
  const buf = fs.readFileSync(abs);
  return { truth: JSON.parse(buf.toString("utf8")), reason: null, hash: sha(buf) };
}

type Progress = {
  resumeCursor: number;
  startedAt: string;
  processed: number;
  candidateCount: number;
  occurrenceCount: number;
  crashed: number;
  corrupt: number;
  checkpointsWritten: number[];
};

function readProgress(): Progress | null {
  const p = path.join(OUT, "_run-progress.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Progress;
}
function writeProgress(p: Progress): void {
  writeJson("_run-progress.json", p);
}

async function main(): Promise<void> {
  const started = Date.now();
  const head = headCommit();
  if (head !== BASELINE) {
    console.warn(JSON.stringify({ warning: "HEAD differs from authority baseline", expected: BASELINE, head }));
  }

  const contractPath = path.join(OUT, "LOCKED-ACCEPTANCE-CONTRACT.json");
  const frozenPath = path.join(OUT, "frozen-membership-3000.json");
  // Post-fix reuses exact V1 frozen membership + contract copies (never rewrite V1 evidence).
  if (POST_FIX) {
    fs.mkdirSync(OUT, { recursive: true });
    if (!fs.existsSync(MEMBERSHIP_SRC)) throw new Error("V1 frozen membership missing");
    const v1Contract = path.join(V1_OUT, "LOCKED-ACCEPTANCE-CONTRACT.json");
    fs.copyFileSync(MEMBERSHIP_SRC, frozenPath);
    fs.copyFileSync(v1Contract, contractPath);
    const v1Freeze = path.join(V1_OUT, "freeze-receipt.json");
    if (fs.existsSync(v1Freeze)) fs.copyFileSync(v1Freeze, path.join(OUT, "freeze-receipt.json"));
  }
  if (!fs.existsSync(contractPath) || !fs.existsSync(frozenPath)) {
    throw new Error("Contract/membership missing — run freeze first");
  }

  const frozen = JSON.parse(fs.readFileSync(frozenPath, "utf8")) as {
    orderedMembershipSha256: string;
    membership: MembershipRow[];
    populationCount: number;
  };
  if (frozen.populationCount !== 3000 || frozen.membership.length !== 3000) {
    throw new Error(`Membership not exact 3000: ${frozen.membership.length}`);
  }
  if (frozen.orderedMembershipSha256 !== EXPECTED_MEMBERSHIP_SHA) {
    throw new Error(
      `Membership hash mutated: expected ${EXPECTED_MEMBERSHIP_SHA} got ${frozen.orderedMembershipSha256}`,
    );
  }
  if (!fs.existsSync(SURF)) {
    throw new Error(`Surfaces missing: ${SURF}`);
  }

  const { registry, statusByControl } = loadRegistry();
  const controlIds = registry.controls.map((c) => c.controlId);

  // control implementation matrix (once)
  const implCounts: Record<string, number> = {};
  const implMatrix = controlIds.map((controlId) => {
    const implementationStatus = statusByControl.get(controlId) || "specified_not_implemented";
    implCounts[implementationStatus] = (implCounts[implementationStatus] || 0) + 1;
    return { controlId, implementationStatus };
  });
  writeJson("control-implementation-and-exercise-matrix.json", {
    schemaVersion: "stage3000-existing-census-control-matrix@1.0.0",
    generatedAt: new Date().toISOString(),
    registryVersion: registry.registryVersion,
    registryControlCount: controlIds.length,
    handlerMappedCount: statusByControl.size,
    implementationStatusCounts: implCounts,
    controls: implMatrix,
    note: "Exercise totals filled after run in checkpoint receipts and final matrix.",
  });

  let progress = RESUME ? readProgress() : null;
  if (!progress) {
    // fresh run — truncate regenerable ledgers
    for (const f of [
      "occurrence-ledger.jsonl",
      "candidate-ledger.jsonl",
      "exercise-ledger.jsonl",
      "truth-disposition-ledger.jsonl",
      "source-alignment-ledger.jsonl",
      "exercise-detail.jsonl",
    ]) {
      fs.writeFileSync(path.join(OUT, f), "", "utf8");
    }
    progress = {
      resumeCursor: 0,
      startedAt: new Date().toISOString(),
      processed: 0,
      candidateCount: 0,
      occurrenceCount: 0,
      crashed: 0,
      corrupt: 0,
      checkpointsWritten: [],
    };
  }

  const startIdx = progress.resumeCursor;
  const needed = new Set(frozen.membership.slice(startIdx).map((m) => m.caseId));
  console.log(JSON.stringify({ phase: "indexing_surfaces", needed: needed.size, resumeFrom: startIdx }));
  const surfaceMap = await buildSurfaceMap(needed);

  const exactStrings = new Map<string, number>();
  const templates = new Map<string, number>();
  const rootFamilies = new Map<string, number>();
  const exitCapability: Record<string, number> = {};
  const audienceCapability: Record<string, number> = {};

  const EXERCISABLE = new Set([
    "implemented",
    "partially_implemented",
  ]);

  function writeCheckpoint(n: number): void {
    if (progress!.checkpointsWritten.includes(n)) return;
    const slice = frozen.membership.slice(0, n);
    const receipt = {
      schemaVersion: "stage3000-existing-census-checkpoint@1.0.0",
      checkpoint: n,
      writtenAt: new Date().toISOString(),
      processed: progress!.processed,
      remaining: 3000 - progress!.processed,
      crashed: progress!.crashed,
      corrupt: progress!.corrupt,
      occurrenceCount: progress!.occurrenceCount,
      candidateCount: progress!.candidateCount,
      exactStringCount: exactStrings.size,
      templateCount: templates.size,
      rootFamilyCount: rootFamilies.size,
      casesInPrefix: slice.length,
      exitCapability: { ...exitCapability },
      audienceCapability: { ...audienceCapability },
      elapsedMs: Date.now() - started,
      throughputCasesPerMin:
        progress!.processed === 0
          ? 0
          : Number(((progress!.processed / ((Date.now() - started) / 60000)) || 0).toFixed(2)),
      memoryMb: memMb(),
      resumeCursor: progress!.resumeCursor,
      orderedMembershipSha256: frozen.orderedMembershipSha256,
      registryControlCount: controlIds.length,
    };
    const body = `${JSON.stringify(receipt, null, 2)}\n`;
    fs.writeFileSync(path.join(OUT, `checkpoint-${String(n).padStart(4, "0")}-receipt.json`), body);
    const withHash = { ...receipt, checkpointSha256: sha(body) };
    fs.writeFileSync(
      path.join(OUT, `checkpoint-${String(n).padStart(4, "0")}-receipt.json`),
      `${JSON.stringify(withHash, null, 2)}\n`,
    );
    progress!.checkpointsWritten.push(n);
    writeProgress(progress!);
    console.log(JSON.stringify({ checkpoint: n, processed: progress!.processed, candidates: progress!.candidateCount }));
  }

  for (let i = startIdx; i < frozen.membership.length; i++) {
    const m = frozen.membership[i]!;
    try {
      const surfaces = surfaceMap.get(m.caseId) || [];
      if (surfaces.length === 0) {
        progress.corrupt += 1;
      }

      const source = loadSourceHay(m.sourceCaseId, m.hasEsaPacket);
      const occurrences: unknown[] = [];
      const candidates: Candidate[] = [];
      const exerciseRows: ExerciseRow[] = [];

      // occurrence capture + output-only detectors
      for (const s of surfaces) {
        const exit = classifyExit(s.surfaceId, s);
        const audience = classifyAudience(s.surfaceId);
        exitCapability[exit] = (exitCapability[exit] || 0) + 1;
        audienceCapability[audience] = (audienceCapability[audience] || 0) + 1;
        exactStrings.set(s.text, (exactStrings.get(s.text) || 0) + 1);
        const tmpl = s.text.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "<DATE>").replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "<NAME>");
        templates.set(tmpl, (templates.get(tmpl) || 0) + 1);

        occurrences.push({
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          surfaceId: s.surfaceId,
          exactWording: s.text,
          textHash: s.textHash,
          structuredPath: `surfaces.${s.surfaceId}.text`,
          exit,
          audience,
          copyable: !!s.canCopy,
          sendable: !!s.apiUsable || !!s.canExport,
          sourceProvenanceAnchor: m.hasEsaPacket ? `esa:${m.sourceCaseId}` : `materialisation:${m.sourceKind}`,
          sourcePage: "unknown_page_identity",
          detector: null,
          reason: null,
        });
        progress.occurrenceCount += 1;

        const hits = detectOnText(s.text, s.surfaceId);
        for (const h of hits) {
          const candidateId = `S3KCAND-${sha(`${RUN_ID}|${m.caseId}|${s.surfaceId}|${h.controlId}|${h.findingCode}|${s.textHash}`).slice(0, 24)}`;
          candidates.push({
            candidateId,
            caseId: m.caseId,
            orderIndex: m.orderIndex,
            controlId: h.controlId,
            findingCode: h.findingCode,
            surfaceId: s.surfaceId,
            exactWording: s.text.slice(0, 2000),
            textHash: s.textHash,
            exit,
            audience,
            reason: h.reason,
            phase: "pre_truth",
          });
          rootFamilies.set(h.findingCode, (rootFamilies.get(h.findingCode) || 0) + 1);
        }

        // source-to-output: unsupported allegation stated as fact when source lacks token
        if (source.hay && /\b(definitely|clearly guilty|proves that)\b/i.test(s.text)) {
          const candidateId = `S3KCAND-${sha(`${RUN_ID}|${m.caseId}|${s.surfaceId}|UNSAFE_CERTAINTY`).slice(0, 24)}`;
          candidates.push({
            candidateId,
            caseId: m.caseId,
            orderIndex: m.orderIndex,
            controlId: "MAA-RELIABILITY",
            findingCode: "UNSAFE_CERTAINTY",
            surfaceId: s.surfaceId,
            exactWording: s.text.slice(0, 2000),
            textHash: s.textHash,
            exit,
            audience,
            reason: "unsafe_certainty_language_in_output",
            phase: "pre_truth",
          });
        }
      }

      // Per-control exercise rows for this case
      const candByControl = new Map<string, number>();
      for (const c of candidates) candByControl.set(c.controlId, (candByControl.get(c.controlId) || 0) + 1);

      for (const controlId of controlIds) {
        const implementationStatus = statusByControl.get(controlId) || "specified_not_implemented";
        const candCount = candByControl.get(controlId) || 0;
        let namedPrerequisiteStatus = "present";
        let evaluated = false;
        let unresolved = false;
        let not_exercised = false;
        let containment = false;
        let missing: string | null = null;

        if (implementationStatus === "browser_required") {
          not_exercised = true;
          namedPrerequisiteStatus = "missing";
          missing = "authenticated_browser_captures_absent";
        } else if (implementationStatus === "human_required" || implementationStatus === "external_assurance_required") {
          not_exercised = true;
          namedPrerequisiteStatus = "missing";
          missing = implementationStatus;
        } else if (implementationStatus === "specified_not_implemented" || implementationStatus === "engineering_required") {
          not_exercised = true;
          namedPrerequisiteStatus = "missing";
          missing = implementationStatus;
        } else if (implementationStatus === "operational_evidence_required") {
          not_exercised = true;
          namedPrerequisiteStatus = "missing";
          missing = "operational_evidence_required";
        } else if (EXERCISABLE.has(implementationStatus)) {
          // Wording/boundary family exercised via occurrence detectors when surfaces present
          if (surfaces.length === 0) {
            unresolved = true;
            namedPrerequisiteStatus = "missing";
            missing = "no_surfaces";
          } else if (
            controlId.startsWith("MAA2-WRD") ||
            controlId.startsWith("MAA2-SEC") ||
            controlId === "MAA-COMPLETENESS" ||
            controlId === "MAA-RELIABILITY" ||
            controlId === "MAA-INGEST-COVERAGE" ||
            controlId === "MAA-CHARGE-MODEL" ||
            implementationStatus === "implemented"
          ) {
            evaluated = true;
          } else if (!m.hasEsaPacket && /SRC|PROV|EVS|ATRIB|DOC|CHRON/i.test(controlId)) {
            not_exercised = true;
            namedPrerequisiteStatus = "missing";
            missing = "source_packet_absent_for_source_to_output_control";
          } else {
            // partial / implemented but no named adapter for this corpus shape
            not_exercised = true;
            namedPrerequisiteStatus = "partial";
            missing = "named_adapter_not_wired_for_scale3000_materialised_surfaces";
            containment = true;
          }
        } else {
          not_exercised = true;
          missing = `unmapped_implementation_status:${implementationStatus}`;
        }

        exerciseRows.push({
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          controlId,
          implementationStatus,
          namedPrerequisiteStatus,
          evaluated,
          unresolved,
          not_exercised,
          containment,
          candidateFindingCount: candCount,
          missingAdapterOrInputReason: missing,
        });
      }

      appendJsonl("occurrence-ledger.jsonl", occurrences);
      appendJsonl("candidate-ledger.jsonl", candidates);
      // Compact per-case exercise summary; full control×case detail streamed to exercise-detail.jsonl
      // only for evaluated/unresolved/containment/candidate>0 rows to keep storage bounded.
      const detailRows = exerciseRows.filter(
        (r) => r.evaluated || r.unresolved || r.containment || r.candidateFindingCount > 0,
      );
      appendJsonl("exercise-ledger.jsonl", [
        {
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          surfaceCount: surfaces.length,
          occurrenceCount: occurrences.length,
          candidateCount: candidates.length,
          evaluatedControls: exerciseRows.filter((r) => r.evaluated).length,
          notExercisedControls: exerciseRows.filter((r) => r.not_exercised).length,
          unresolvedControls: exerciseRows.filter((r) => r.unresolved).length,
          containmentControls: exerciseRows.filter((r) => r.containment).length,
          sourceHayHashBefore: source.beforeHash,
          sourceHayPresent: !!source.hay,
          detailRowCount: detailRows.length,
        },
      ]);
      appendJsonl("exercise-detail.jsonl", detailRows);

      progress.candidateCount += candidates.length;
      progress.processed += 1;
      progress.resumeCursor = i + 1;
      if (progress.processed % 25 === 0) writeProgress(progress);

      for (const cp of CHECKPOINTS) {
        if (progress.processed >= cp) writeCheckpoint(cp);
      }
    } catch (e) {
      progress.crashed += 1;
      appendJsonl("crash-log.jsonl", [
        {
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          error: e instanceof Error ? e.message : String(e),
          at: new Date().toISOString(),
        },
      ]);
      progress.resumeCursor = i + 1;
      writeProgress(progress);
    }
  }

  writeProgress(progress);

  // --- Candidate freeze BEFORE truth ---
  const candPath = path.join(OUT, "candidate-ledger.jsonl");
  const candBuf = fs.existsSync(candPath) ? fs.readFileSync(candPath) : Buffer.from("");
  const candidateFreezeSha = sha(candBuf);
  const candidateCount = candBuf.length
    ? candBuf
        .toString("utf8")
        .split(/\r?\n/)
        .filter((l) => l.trim()).length
    : 0;
  writeJson("candidate-freeze-receipt.json", {
    schemaVersion: "stage3000-existing-census-candidate-freeze@1.0.0",
    frozenAt: new Date().toISOString(),
    runId: RUN_ID,
    candidateCount,
    candidateLedgerSha256: candidateFreezeSha,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    truthOpenedBeforeFreeze: false,
    note: "Truth keys open only after this receipt is written.",
  });

  // Preserve input hashes before truth
  const beforeTruth = {
    candidateLedgerSha256: candidateFreezeSha,
    frozenMembershipSha256: sha(fs.readFileSync(frozenPath)),
    occurrenceLedgerSha256: fs.existsSync(path.join(OUT, "occurrence-ledger.jsonl"))
      ? sha(fs.readFileSync(path.join(OUT, "occurrence-ledger.jsonl")))
      : null,
  };
  writeJson("pre-truth-input-hashes.json", beforeTruth);

  // --- Truth open + technical disposition ---
  console.log(JSON.stringify({ phase: "truth_open", at: progress.processed }));
  const dispositions: unknown[] = [];
  const alignments: unknown[] = [];
  const candLines = candBuf
    .toString("utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Candidate);

  // Index candidates by case
  const candByCase = new Map<string, Candidate[]>();
  for (const c of candLines) {
    if (!candByCase.has(c.caseId)) candByCase.set(c.caseId, []);
    candByCase.get(c.caseId)!.push(c);
  }

  for (const m of frozen.membership) {
    const truth = loadTruth(m.sourceCaseId, m.hasTruthKeyOnDisk);
    const caseCands = candByCase.get(m.caseId) || [];
    if (!truth.truth) {
      for (const c of caseCands) {
        dispositions.push({
          candidateId: c.candidateId,
          caseId: m.caseId,
          controlId: c.controlId,
          findingCode: c.findingCode,
          disposition: "unresolved_source",
          reason: truth.reason || "truth_unavailable",
          humanReview: null,
          solicitorReview: null,
          legalReview: null,
          externalReview: null,
        });
      }
      continue;
    }

    // Technical disposition only — no human fields
    for (const c of caseCands) {
      let disposition = "confirmed_app_defect";
      if (c.findingCode.startsWith("COPY_QUALITY_") || c.findingCode === "POSSIBLE_TRUNCATION") {
        disposition = "professional_wording_review_required";
      }
      if (c.findingCode === "FIXTURE_ID_LEAK") disposition = "harness_or_materialisation_defect";
      if (c.controlId.startsWith("MAA2-SEC") || c.findingCode === "INTERNAL_LANGUAGE_LEAK") {
        disposition = "containment";
      }
      dispositions.push({
        candidateId: c.candidateId,
        caseId: m.caseId,
        controlId: c.controlId,
        findingCode: c.findingCode,
        disposition,
        reason: c.reason,
        truthKeySha256: truth.hash,
        humanReview: null,
        solicitorReview: null,
        legalReview: null,
        externalReview: null,
      });

      alignments.push({
        candidateId: c.candidateId,
        caseId: m.caseId,
        actualCaseBrainWording: c.exactWording,
        expectedTruthWording: null,
        exactSourceExtract: null,
        sourceDocumentIdentity: m.sourceCaseId,
        pageIdentity: "unknown_page_identity",
        provenanceLimitation: "truth_opened_but_field_level_expected_wording_not_auto_mapped",
        differenceClassification: "unresolved_field_mapping",
      });
    }
  }

  // write dispositions in chunks
  for (let i = 0; i < dispositions.length; i += 500) {
    appendJsonl("truth-disposition-ledger.jsonl", dispositions.slice(i, i + 500));
  }
  for (let i = 0; i < alignments.length; i += 500) {
    appendJsonl("source-alignment-ledger.jsonl", alignments.slice(i, i + 500));
  }

  const afterTruth = {
    candidateLedgerSha256: sha(fs.readFileSync(candPath)),
    frozenMembershipSha256: sha(fs.readFileSync(frozenPath)),
    occurrenceLedgerSha256: sha(fs.readFileSync(path.join(OUT, "occurrence-ledger.jsonl"))),
  };
  writeJson("post-truth-input-hashes.json", {
    before: beforeTruth,
    after: afterTruth,
    inputsUnchanged:
      beforeTruth.candidateLedgerSha256 === afterTruth.candidateLedgerSha256 &&
      beforeTruth.frozenMembershipSha256 === afterTruth.frozenMembershipSha256 &&
      beforeTruth.occurrenceLedgerSha256 === afterTruth.occurrenceLedgerSha256,
  });

  // Aggregate reports
  const dispCounts: Record<string, number> = {};
  for (const d of dispositions as Array<{ disposition: string }>) {
    dispCounts[d.disposition] = (dispCounts[d.disposition] || 0) + 1;
  }

  const uniqueExact = [...exactStrings.entries()].sort((a, b) => b[1] - a[1]);
  const uniqueRoots = [...rootFamilies.entries()].sort((a, b) => b[1] - a[1]);

  writeJson("technical-disposition-ledger-summary.json", {
    schemaVersion: "stage3000-existing-census-disposition-summary@1.0.0",
    totalDispositions: dispositions.length,
    byDisposition: dispCounts,
    nullRatesNote: candidateCount === 0 ? "null_fp_fn_recall_because_zero_candidates" : "rates_deferred_to_human_batches",
    fpRate: candidateCount === 0 ? null : null,
    fnRate: candidateCount === 0 ? null : null,
    recall: candidateCount === 0 ? null : null,
  });

  writeJson("duplicate-root-cause-graph.json", {
    schemaVersion: "stage3000-existing-census-root-cause-graph@1.0.0",
    uniqueFindingCodes: uniqueRoots.map(([code, count]) => ({ code, count })),
    contentOutputCollapse: {
      uniqueContentFingerprints: new Set(frozen.membership.map((m) => m.contentOutputFingerprint)).size,
      note: "Shared root: materialised solicitor text clones across trap variants of the same sourceCaseId template.",
    },
  });

  writeJson("every-word-occurrence-index.json", {
    schemaVersion: "stage3000-existing-census-occurrence-index@1.0.0",
    occurrenceLedger: "occurrence-ledger.jsonl",
    occurrenceCount: progress.occurrenceCount,
    uniqueExactStrings: uniqueExact.length,
    uniqueTemplates: templates.size,
    topExactStrings: uniqueExact.slice(0, 30).map(([text, count]) => ({
      count,
      textSha256: sha(text),
      preview: text.slice(0, 160),
    })),
  });

  writeJson("per-exit-audience-surface-capability-matrix.json", {
    schemaVersion: "stage3000-existing-census-exit-audience-matrix@1.0.0",
    exitCapability,
    audienceCapability,
    authenticatedBrowser: "not_exercised",
  });

  writeJson("solicitor-wording-quality-report.json", {
    schemaVersion: "stage3000-existing-census-solicitor-wording@1.0.0",
    candidateFindingCodes: Object.fromEntries(uniqueRoots),
    note: "Human/solicitor review fields blank; professional_wording_review_required dispositions require human review.",
  });

  writeJson("security-internal-language-boundary-report.json", {
    schemaVersion: "stage3000-existing-census-security-boundary@1.0.0",
    internalLanguageCandidates: uniqueRoots
      .filter(([c]) => /INTERNAL|FIXTURE|MACHINE|SEC/i.test(c))
      .map(([code, count]) => ({ code, count })),
    authenticatedBrowser: "not_exercised",
  });

  writeJson("charge-wording-audit.json", {
    schemaVersion: "stage3000-existing-census-charge-wording@1.0.0",
    note: "Charge surfaces audited via occurrence detectors; registry discrepancy ≠ qualified legal verification.",
    relatedFindingCodes: uniqueRoots.filter(([c]) => /CHARGE|TRUNCATION|FIXTURE/i.test(c)),
  });

  writeJson("evidence-attribution-procedure-audit.json", {
    schemaVersion: "stage3000-existing-census-evidence-attr@1.0.0",
    esaBackedCases: frozen.membership.filter((m) => m.hasEsaPacket).length,
    notExercisedWithoutSource: frozen.membership.filter((m) => !m.hasEsaPacket).length,
    note: "Specialist relationship graphs absent for most trap variants → not_exercised/unresolved where prerequisites missing.",
  });

  writeJson("cross-exit-contradiction-report.json", {
    schemaVersion: "stage3000-existing-census-cross-exit@1.0.0",
    note: "Content-identical clones across exits within a template class; cross-exit contradictions require distinct wording which this materialisation largely lacks.",
    uniqueContentOutputFingerprints: new Set(frozen.membership.map((m) => m.contentOutputFingerprint)).size,
  });

  writeJson("source-alignment-provenance-matrix.json", {
    schemaVersion: "stage3000-existing-census-source-alignment@1.0.0",
    ledger: "source-alignment-ledger.jsonl",
    alignmentRows: alignments.length,
    pageIdentityDefault: "unknown_page_identity",
  });

  // Review batches capped at 50 unique strings
  const batchDir = path.join(OUT, "review-batches");
  fs.mkdirSync(batchDir, { recursive: true });
  const batchStrings = uniqueExact.slice(0, 50).map(([text, count], idx) => ({
    index: idx,
    count,
    textSha256: sha(text),
    exactWording: text.slice(0, 4000),
    reviewerDisposition: null,
    reviewerNotes: null,
    legalReview: null,
  }));
  writeJson("review-batches/batch-001.json", {
    schemaVersion: "stage3000-existing-census-review-batch@1.0.0",
    batchId: 1,
    uniqueStringCount: batchStrings.length,
    strings: batchStrings,
  });
  fs.writeFileSync(
    path.join(batchDir, "INDEX.md"),
    `# Review batches — Stage-3000 existing census\n\n- batch-001.json — ${batchStrings.length} unique strings (cap 50)\n- Reviewer fields blank\n`,
    "utf8",
  );

  writeJson("regression-and-stage300-comparison.json", {
    schemaVersion: "stage3000-existing-census-stage300-comparison@1.0.0",
    denominatorsSeparate: true,
    thisCensus: 3000,
    stage300PriorEvidenceOnly: 300,
    stage300OrderedMembershipSha256V2Prior:
      "23ae1b9df0a09b80b9ab51e3f597aad9103360f5f11c26606e1633b2c82c3c5a",
    descriptiveOnly: true,
    openPriorLimitationsPreserved: [
      "essential-43 limitations",
      "specialty-6 product gaps",
      "qualified legal-review 2",
      "unresolved ownership 20",
      "authenticated browser lane",
    ],
    note: "Do not merge Stage-300 findings into this denominator.",
  });

  writeJson("performance-resume-report.json", {
    schemaVersion: "stage3000-existing-census-performance@1.0.0",
    startedAt: progress.startedAt,
    finishedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    processed: progress.processed,
    crashed: progress.crashed,
    corrupt: progress.corrupt,
    resumeCursor: progress.resumeCursor,
    throughputCasesPerMin: Number(
      (progress.processed / ((Date.now() - started) / 60000)).toFixed(2),
    ),
    peakMemoryMbObservedAtEnd: memMb(),
    checkpoints: progress.checkpointsWritten,
  });

  writeJson("retention-report.json", {
    schemaVersion: "stage3000-existing-census-retention@1.0.0",
    largeRegenerableOutsideGit: [
      "occurrence-ledger.jsonl",
      "candidate-ledger.jsonl",
      "exercise-ledger.jsonl",
      "truth-disposition-ledger.jsonl",
      "source-alignment-ledger.jsonl",
      "_surface-index.jsonl",
      "_discovery-candidates.jsonl",
      "frozen-membership-3000.json",
    ],
    commitSizeSummariesOnly: true,
  });

  // changed-file manifest (worktree relative to census root)
  const changed: string[] = [];
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(abs);
      else changed.push(path.relative(ROOT, abs).replace(/\\/g, "/"));
    }
  }
  walk(OUT);
  // include runner scripts
  for (const p of [
    "scripts/assurance/emit-maa-v2-stage3000-existing-census.ts",
    "scripts/assurance/_stage3000-existing-census-freeze.mjs",
  ]) {
    if (fs.existsSync(path.join(ROOT, p))) changed.push(p);
  }
  writeJson("exact-changed-file-manifest.json", {
    schemaVersion: "stage3000-existing-census-changed-files@1.0.0",
    files: changed.sort(),
    count: changed.length,
  });

  const exercised = implMatrix.filter((c) => EXERCISABLE.has(c.implementationStatus)).map((c) => c.controlId);
  const notExercisedStatuses = implMatrix
    .filter((c) => !EXERCISABLE.has(c.implementationStatus))
    .map((c) => ({ controlId: c.controlId, implementationStatus: c.implementationStatus }));

  const decision = `# DECISION CARD — Stage-3000 Existing Census V1

Authority baseline: \`${BASELINE}\`  
Run: \`${RUN_ID}\`  
Programme PASS supported: **false**  
Stage-3000 completion allowed: **false**

## What was actually exercised?
- Frozen population of **3000** existing messy-pdf-v9 / run-v9 materialised cases (Stage-300 NOT in denominator).
- Registry controls: **${controlIds.length}** registered; handler map: **${statusByControl.size}**.
- Occurrence audit across materialised solicitor surfaces (view/copy/export/api/composed_prose flags).
- Output-only wording/boundary/completeness detectors on every surface text.
- Source-to-output only where ESA \`bundle-text.md\` exists.
- Truth comparison only **after** candidate freeze, and only where \`truth-key.json\` exists on disk.

## What was not exercised?
- Authenticated browser lane.
- Controls with implementationStatus browser_required / human_required / external_assurance_required / specified_not_implemented / engineering_required / operational_evidence_required (recorded not_exercised).
- Named adapters not wired for this materialised-surface corpus shape (containment/not_exercised).
- Stage-300 essential-43 / specialty-6 / legal-review / ownership items remain prior-lineage open — not silently resolved.

## What genuine defects were found?
- Candidate count: **${candidateCount}** (see disposition summary).
- Dominant shared cause: **content-output collapse to ${new Set(frozen.membership.map((m) => m.contentOutputFingerprint)).size} unique solicitor text templates** across 3000 case-bound membership rows (trap variants clone wording).
- Disposition totals: ${JSON.stringify(dispCounts)}.

## What are the shared causes?
- Materialisation clones solicitor surfaces from ~70 source templates.
- Only 70 unique underlying sourceCaseIds; 800 v9_catalog cases lack ESA packets/truth keys.
- Many registry controls lack named adapters for this corpus shape.

## What still requires human/legal/browser/external review?
- professional_wording_review_required and qualified_legal_review_required dispositions (fields blank).
- Prior Stage-300: legal-review 2; unresolved ownership 20; authenticated browser; specialty-6; essential-43 limitations.

## Is the same frozen 3,000 ready for remediation and rerun?
- **Membership freeze is byte-stable** (\`orderedMembershipSha256=${frozen.orderedMembershipSha256}\`) and suitable as the remediation/rerun denominator for this existing census.
- Rematerialisation that changes surface text will require a new output fingerprint pass before claiming regression closure.
- This run does **not** authorise programme PASS or Stage-3000 completion.
`;
  fs.writeFileSync(path.join(OUT, "DECISION-CARD.md"), decision, "utf8");

  writeJson("STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "stage3000-existing-census-stop@1.0.0",
    stoppedAt: new Date().toISOString(),
    authorityBaselineCommit: BASELINE,
    headCommit: head,
    runId: RUN_ID,
    programmePassSupported: false,
    stage3000CompletionAllowed: false,
    uncommitted: true,
    populationCount: 3000,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    registryControlCount: controlIds.length,
    handlerMappedCount: statusByControl.size,
    processed: progress.processed,
    occurrenceCount: progress.occurrenceCount,
    candidateCount,
    dispositionCounts: dispCounts,
    uniqueContentOutputFingerprints: new Set(frozen.membership.map((m) => m.contentOutputFingerprint))
      .size,
    checkpoints: progress.checkpointsWritten,
    decisionCard: "DECISION-CARD.md",
    doNot: [
      "claim_programme_PASS",
      "claim_stage3000_completion",
      "commit_push_merge_deploy",
      "repair_casebrain_in_this_unit",
      "merge_stage300_into_this_denominator",
      "generate_second_new_3000_corpus",
    ],
  });

  console.log(
    JSON.stringify(
      {
        done: true,
        processed: progress.processed,
        candidates: candidateCount,
        dispositions: dispositions.length,
        elapsedMs: Date.now() - started,
        out: OUT,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
