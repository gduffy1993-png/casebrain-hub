/**
 * MAA run over frozen diverse-3000 membership + materialised surfaces.
 * Truth opens only after candidate freeze. Resumable checkpoints.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";
import { containsAbsoluteProofWording } from "../../../lib/criminal/absolute-proof-wording";
import {
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
} from "../../../lib/criminal/solicitor-family-provenance";
import {
  isDocumentFormTitle,
  isFixtureIdLike,
  isInternalNonSolicitorString,
} from "../../../lib/criminal/solicitor-visible-sanitization";
import { containsSolicitorForbiddenInternalLanguage } from "../../../lib/criminal/solicitor-charge-model";
import {
  inferSolicitorSurfaceRole,
  scanSolicitorVisibleCopyQuality,
} from "../../../lib/criminal/solicitor-visible-quality";

const ROOT = process.cwd();
const PROG = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const SURF = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1/surfaces.jsonl",
);
const TRUTH_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/truth-sealed",
);
const CHECKPOINTS = [5, 20, 50, 150, 300, 500, 1000, 2000, 3000] as const;
const RESUME = process.argv.includes("--resume");
const PHASE2 = process.argv.includes("--post-remediation");

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(path.join(PROG, path.dirname(name)), { recursive: true });
  fs.writeFileSync(path.join(PROG, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function appendJsonl(name: string, rows: unknown[]): void {
  if (!rows.length) return;
  const p = path.join(PROG, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");
}
function headCommit(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

type Surface = {
  caseId: string;
  surfaceId: string;
  text: string;
  textHash: string;
};
type Mem = {
  orderIndex: number;
  caseId: string;
  sourceCompleteness: string;
};

function detect(text: string, surfaceId: string) {
  const hits: Array<{ findingCode: string; controlId: string; reason: string }> = [];
  if (!text?.trim()) {
    hits.push({ findingCode: "EMPTY_SURFACE_TEXT", controlId: "MAA-COMPLETENESS", reason: "empty" });
    return hits;
  }
  const role = inferSolicitorSurfaceRole(surfaceId);
  if (role === "provenance_or_document_title" && isDocumentFormTitle(text)) return hits;
  if (solicitorVisibleTextContainsFamilyIssueCodes(text)) {
    hits.push({
      findingCode: "RAW_ENUM_OR_MACHINE_KEY",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "family_issue_code",
    });
  }
  for (const hit of scanSolicitorVisibleInternalLanguageBoundary(text)) {
    if (hit.kind === "family_issue_code") continue;
    hits.push({
      findingCode: "INTERNAL_SYSTEM_LANGUAGE_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: `system_language:${hit.matched}`,
    });
  }
  if (containsSolicitorForbiddenInternalLanguage(text) || isInternalNonSolicitorString(text)) {
    hits.push({
      findingCode: "INTERNAL_LANGUAGE_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "internal_or_audit_language",
    });
  }
  if (isFixtureIdLike(text)) {
    hits.push({
      findingCode: "FIXTURE_ID_LEAK",
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: "fixture_id",
    });
  }
  if (containsAbsoluteProofWording(text)) {
    hits.push({
      findingCode: "ABSOLUTE_PROOF_WORDING",
      controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
      reason: "absolute_proof",
    });
  }
  for (const issue of scanSolicitorVisibleCopyQuality(text, { surfaceId, surfaceRole: role })) {
    hits.push({
      findingCode: `COPY_QUALITY_${String(issue).toUpperCase()}`,
      controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING",
      reason: `copy_quality:${issue}`,
    });
  }
  return hits;
}

async function loadSurfaces(needed: Set<string>): Promise<Map<string, Surface[]>> {
  const map = new Map<string, Surface[]>();
  const rl = readline.createInterface({ input: fs.createReadStream(SURF), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const s = JSON.parse(line) as Surface;
    if (!needed.has(s.caseId)) continue;
    if (!map.has(s.caseId)) map.set(s.caseId, []);
    map.get(s.caseId)!.push(s);
  }
  return map;
}

async function main(): Promise<void> {
  const runTag = PHASE2 ? "post-remediation" : "pre-remediation";
  const frozen = JSON.parse(fs.readFileSync(path.join(PROG, "frozen-membership-new3000.json"), "utf8")) as {
    membership: Mem[];
    orderedMembershipSha256: string;
  };
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"),
      "utf8",
    ),
  ) as { controls: Array<{ controlId: string }> };
  const impl = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json",
      ),
      "utf8",
    ),
  ) as { handlers: Record<string, { implementationStatus: string }> };

  const progressPath = path.join(PROG, `ledgers/maa-${runTag}-progress.json`);
  let start = 0;
  const candName = `ledgers/candidate-ledger-${runTag}.jsonl`;
  if (RESUME && fs.existsSync(progressPath)) {
    start = (JSON.parse(fs.readFileSync(progressPath, "utf8")) as { processed: number }).processed;
  } else if (fs.existsSync(path.join(PROG, candName))) {
    fs.unlinkSync(path.join(PROG, candName));
  }

  const needed = new Set(frozen.membership.map((m) => m.caseId));
  console.log(JSON.stringify({ phase: "load_surfaces", cases: needed.size }));
  const surfaces = await loadSurfaces(needed);
  let candidateCount = 0;
  let occurrenceCount = 0;
  const candBuf: unknown[] = [];

  for (let i = start; i < frozen.membership.length; i++) {
    const m = frozen.membership[i];
    const ss = surfaces.get(m.caseId) || [];
    occurrenceCount += ss.length;
    for (const s of ss) {
      const hits = detect(s.text, s.surfaceId);
      for (const h of hits) {
        const candidateId = `D3KCAND-${sha(m.caseId + s.surfaceId + h.findingCode + s.textHash).slice(0, 24)}`;
        candBuf.push({
          candidateId,
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          controlId: h.controlId,
          findingCode: h.findingCode,
          surfaceId: s.surfaceId,
          exactWording: s.text,
          textHash: s.textHash,
          exit: s.surfaceId.startsWith("api_")
            ? "api"
            : /export/i.test(s.surfaceId)
              ? "export"
              : "composed_prose",
          audience: /client/i.test(s.surfaceId)
            ? "client"
            : /court/i.test(s.surfaceId)
              ? "court"
              : "defence_solicitor",
          reason: h.reason,
          phase: "pre_truth",
        });
        candidateCount += 1;
      }
    }

    if (candBuf.length >= 200) appendJsonl(candName, candBuf.splice(0));

    const processed = i + 1;
    if (CHECKPOINTS.includes(processed as (typeof CHECKPOINTS)[number])) {
      if (candBuf.length) appendJsonl(candName, candBuf.splice(0));
      writeJson(`ledgers/maa-${runTag}-progress.json`, { processed, candidateCount, occurrenceCount });
      writeJson(`checkpoints/maa-${runTag}-checkpoint-${String(processed).padStart(4, "0")}.json`, {
        checkpoint: processed,
        candidateCount,
        occurrenceCount,
        truthUnopened: true,
        pass: true,
      });
      console.log(JSON.stringify({ maaCheckpoint: processed, candidateCount, runTag }));
    }
  }
  if (candBuf.length) appendJsonl(candName, candBuf.splice(0));
  const candPath = path.join(PROG, candName);
  if (!fs.existsSync(candPath)) {
    fs.mkdirSync(path.dirname(candPath), { recursive: true });
    fs.writeFileSync(candPath, "", "utf8");
  }

  const evaluatedControls = registry.controls.filter(
    (c) => c.controlId.includes("WRD") || c.controlId.includes("COMPLETENESS"),
  );
  writeJson("per-control-exercise-matrix.json", {
    schemaVersion: "diverse3000-per-control-exercise-matrix@1.0.0",
    runTag,
    registryControlCount: registry.controls.length,
    handlerMappedCount: Object.keys(impl.handlers || {}).length,
    evaluatedControlIds: evaluatedControls.map((c) => c.controlId),
    evaluatedCount: evaluatedControls.length,
    notExercisedCount: registry.controls.length - evaluatedControls.length,
    note: "Wording/completeness detectors evaluated on packet-local surfaces. Browser/heavy/security/external lanes remain not_exercised.",
    denominatorCases: frozen.membership.length,
  });

  const candBytes = fs.readFileSync(candPath);
  const candidateFreezeSha = sha(candBytes);
  writeJson("candidate-freeze-receipt.json", {
    schemaVersion: "diverse3000-candidate-freeze@1.0.0",
    runTag,
    frozenAt: new Date().toISOString(),
    candidateLedgerSha256: candidateFreezeSha,
    candidateCount,
    occurrenceCount,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    truthOpenedBeforeFreeze: false,
  });
  writeJson("truth-open-sequence.json", {
    schemaVersion: "diverse3000-truth-open-sequence@1.0.0",
    steps: [
      "candidate_freeze_receipt_written",
      "truth_keys_opened_from_sealed_lane",
      "technical_disposition_written",
    ],
    candidateFreezeSha256: candidateFreezeSha,
  });

  const candidates: Array<{
    candidateId: string;
    caseId: string;
    controlId: string;
    findingCode: string;
    reason: string;
  }> = [];
  const rl = readline.createInterface({ input: fs.createReadStream(candPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    candidates.push(JSON.parse(line));
  }
  const byCase = new Map<string, typeof candidates>();
  for (const c of candidates) {
    if (!byCase.has(c.caseId)) byCase.set(c.caseId, []);
    byCase.get(c.caseId)!.push(c);
  }

  const dispositions: unknown[] = [];
  const dispCounts: Record<string, number> = {};
  for (const m of frozen.membership) {
    const truthPath = path.join(TRUTH_ROOT, `${m.caseId}.truth.json`);
    const hasTruth = fs.existsSync(truthPath);
    const caseCands = byCase.get(m.caseId) || [];
    if (!hasTruth) {
      for (const c of caseCands) {
        dispositions.push({
          candidateId: c.candidateId,
          caseId: m.caseId,
          findingCode: c.findingCode,
          disposition: "unresolved_source",
          reason: "truth_key_missing_unexpected",
        });
        dispCounts.unresolved_source = (dispCounts.unresolved_source || 0) + 1;
      }
      continue;
    }
    const truthHash = sha(fs.readFileSync(truthPath));
    for (const c of caseCands) {
      let disposition = "confirmed_casebrain_app_defect";
      if (String(c.findingCode).startsWith("COPY_QUALITY_") || c.findingCode === "POSSIBLE_TRUNCATION") {
        disposition = "professional_wording_review_required";
      } else if (c.findingCode === "FIXTURE_ID_LEAK") {
        disposition = "harness_or_materialisation_defect";
      } else if (
        c.findingCode === "INTERNAL_LANGUAGE_LEAK" ||
        c.findingCode === "INTERNAL_SYSTEM_LANGUAGE_LEAK"
      ) {
        disposition = "containment";
      } else if (
        m.sourceCompleteness === "deliberate_truth_keyed_missing_source" &&
        c.findingCode === "EMPTY_SURFACE_TEXT"
      ) {
        disposition = "intentional_missing_source_correctly_contained";
      }
      dispositions.push({
        candidateId: c.candidateId,
        caseId: m.caseId,
        controlId: c.controlId,
        findingCode: c.findingCode,
        disposition,
        reason: c.reason,
        truthKeySha256: truthHash,
        humanReview: null,
        solicitorReview: null,
        legalReview: null,
      });
      dispCounts[disposition] = (dispCounts[disposition] || 0) + 1;
    }
  }

  const dispFile = `ledgers/technical-disposition-ledger-${runTag}.jsonl`;
  if (fs.existsSync(path.join(PROG, dispFile))) fs.unlinkSync(path.join(PROG, dispFile));
  for (let i = 0; i < dispositions.length; i += 500) {
    appendJsonl(dispFile, dispositions.slice(i, i + 500));
  }
  writeJson("technical-disposition-ledger.json", {
    schemaVersion: "diverse3000-technical-disposition-summary@1.0.0",
    runTag,
    total: dispositions.length,
    byDisposition: dispCounts,
  });

  const receiptName = PHASE2 ? "STOP-FOR-CODEX-REVIEW.json" : "maa-pre-remediation-receipt.json";
  writeJson(receiptName, {
    schemaVersion: "diverse3000-maa-receipt@1.0.0",
    runTag,
    stoppedAt: new Date().toISOString(),
    authorityBaselineCommit: "308b7cb633f83d7c998bc80adf87356de346b3e9",
    headCommit: headCommit(),
    populationCount: frozen.membership.length,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    registryControlCount: registry.controls.length,
    handlerMappedCount: Object.keys(impl.handlers || {}).length,
    processed: frozen.membership.length,
    occurrenceCount,
    candidateCount,
    dispositionCounts: dispCounts,
    programmePassSupported: false,
    stage3000CompletionAllowed: false,
    corpusPassSupported: false,
    uncommitted: true,
    firstCensusMembershipPreserved: "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae",
    doNot: [
      "claim_programme_PASS",
      "claim_corpus_PASS",
      "claim_stage3000_completion",
      "claim_model_trained",
      "claim_solicitor_approval",
      "commit_push_merge_deploy",
    ],
  });

  console.log(JSON.stringify({ ok: true, runTag, candidateCount, dispCounts }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
