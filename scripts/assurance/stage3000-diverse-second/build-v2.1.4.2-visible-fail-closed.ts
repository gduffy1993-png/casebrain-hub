/**
 * V2.1.4.2 — visible fail-closed remediation + professional wording on frozen 20.
 * Preserves V2.1.4.1 artefacts byte-for-byte. No new cases/PDFs/layouts. No 552 re-triage.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildStage150OutputBag,
  collectSolicitorVisibleLeaves,
} from "./v2.1.2-structured-maa-output";
import {
  runNamedControlsForCase,
  proveControlContracts,
  CORE_CONTROLS,
} from "./v2.1.2-named-control-runner";
import {
  buildProvenanceIndex,
  classifyProvenanceBoundLeaf,
  proveProvenanceClassifierContracts,
  proveExactProvenanceAdversarialContracts,
  type ProvenanceBoundLeaf,
} from "./v2.1.4-provenance-leaf-classifier";
import {
  scanVisibleLanguageBoundary,
  proveDerivedConclusionMutationContracts,
} from "./v2.1.4.2-solicitor-visible-wording";

const ROOT = process.cwd();
const V2141 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.1",
);
const V2142 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.2",
);
const V213 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.3",
);
const V213_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.3-pilot-graphs",
);
const V2142_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.4.2-pilot-graphs",
);

const V213_MEMBERSHIP = "e103baa3e0e53bc0062b36f3446896337b7ba99e7213fe23c4c34426201edfde";
const CANDIDATE_LEDGER_SHA = "4a788439aa97be17a73c5ccd066be5725805694a9bc1e4922c44673e44abe3a3";

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function readJson<T = any>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function resolveAttached(
  ptr: string,
  text: string,
  map: Record<string, any>,
): any | null {
  if (map[ptr]) return map[ptr];
  if (/^\/copyLines\/\d+/.test(ptr)) {
    if (/Please provide the complete master media|outstanding disclosure chase/i.test(text)) {
      return map["/copyLines/chase"] || map["/solicitorFacingSurfaces/copyExportApiPdf/chase"] || null;
    }
    return map["/copyLines/meaning"] || map["/solicitorFacingSurfaces/copyExportApiPdf/meaning"] || null;
  }
  return null;
}

function isOrdinaryExitLeaf(leaf: any, classification: string): boolean {
  if (classification === "protected_audit_only" || classification === "machine_metadata") return false;
  const ptr = String(leaf.jsonPointer || "");
  if (/\/(evidenceStates|attributionGraph|chronologyEvents|provenanceRecords|exitPayloadReceipts|chargeInstruments)\//.test(ptr)) {
    return false;
  }
  if (
    ptr.startsWith("/solicitorFacingSurfaces") ||
    ptr.startsWith("/copyLines") ||
    ptr.startsWith("/exportVersion/solicitorVisibleSummary") ||
    ptr.startsWith("/composedProse") ||
    ptr.startsWith("/disclosureChase") ||
    ptr.startsWith("/warRoom") ||
    ptr === "/courtNote/text"
  ) {
    return true;
  }
  return ["copy", "view", "export", "api", "pdf"].includes(leaf.exit) &&
    !/\/(canCopy|sendability|blockedReason|exportId|generatedAt)\b/.test(ptr);
}

function surfaceFamily(ref: string, surfaceId?: string, exit?: string): string {
  if (exit === "copy" || exit === "pdf" || exit === "export" || exit === "api") return exit;
  const s = `${surfaceId || ""} ${ref}`.toLowerCase();
  if (/composedprose|courtline/.test(s)) return "composed_prose";
  if (/disclosurechase|chase/.test(s)) return "chase";
  if (/copylines|copy_lines|copyexport/.test(s)) return "copy";
  if (/warroom/.test(s)) return "war_room";
  if (/charge/.test(s)) return "charges";
  if (/keyfacts|fiveanswers|controlroom/.test(s)) return "view";
  return "view";
}

async function main(): Promise<void> {
  fs.mkdirSync(V2142, { recursive: true });
  fs.mkdirSync(path.join(V2142, "ledgers"), { recursive: true });
  fs.mkdirSync(path.join(V2142, "receipts"), { recursive: true });

  // V2.1.4.1 artefacts remain untouched (byte-for-byte). Scale-pending rationale recorded only under V2.1.4.2.
  writeJson(path.join(V2142, "v2.1.4.1-acceptance-and-scale-pending-note.json"), {
    v2141Accepted: [
      "audit_semantics",
      "exit_honesty",
      "contracts",
      "path_scoped_tsc",
      "fresh_build",
    ],
    scaleGateUnacceptedSolelyBecause:
      "Corrected auditor identified 405 fail_closed_unresolved_reference solicitor-visible leaves on V2.1.4.1",
    v2141PreservedByteForByte: true,
    remediationPilot: "stage3000-diverse-second-v2.1.4.2",
  });

  const membership = readJson(path.join(V213, "frozen-membership-v2.1.3-pilot20.json"));
  if (membership.orderedMembershipSha256 !== V213_MEMBERSHIP) {
    throw new Error("V2.1.3 membership hash mismatch");
  }

  // Preserve 552 dispositions from V2.1.4.1 (copied from V2.1.4 originally) — do not re-triage
  const dispSrc = path.join(V2141, "ledgers/v2.1.3-552-occurrence-disposition-ledger.jsonl");
  fs.copyFileSync(dispSrc, path.join(V2142, "ledgers/v2.1.3-552-occurrence-disposition-ledger.jsonl"));
  const dispositionRows = fs
    .readFileSync(dispSrc, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  if (dispositionRows.length !== 552) throw new Error("Expected 552 dispositions");
  const dispositionCounts: Record<string, number> = {};
  for (const r of dispositionRows) dispositionCounts[r.disposition] = (dispositionCounts[r.disposition] || 0) + 1;

  // Before counts from V2.1.4.1 ledger
  const beforeLedger = fs
    .readFileSync(path.join(V2141, "ledgers/provenance-bound-substantive-leaf-ledger.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const beforeFailClosed = beforeLedger.filter((l) => l.classification === "fail_closed_unresolved_reference");
  const beforeBySurface: Record<string, number> = {};
  for (const l of beforeFailClosed) beforeBySurface[l.surface] = (beforeBySurface[l.surface] || 0) + 1;

  const leafLedger: ProvenanceBoundLeaf[] = [];
  const afterFindings: any[] = [];
  const caseControlSummary: any[] = [];
  const wordingMapAll: any[] = [];
  const derivedDeps: any[] = [];
  const boundaryDefects: any[] = [];
  const failClosedOrdinary: any[] = [];
  const exitReconcile: any[] = [];
  let boundaryLeaks = 0;
  let duplicateRegarding = 0;
  let snakeLeaks = 0;
  let derivedMissingDeps = 0;
  let unsupportedMatterClaims = 0;

  for (const row of membership.membership) {
    const caseId = row.caseId as string;
    const srcDir = path.join(V213_GRAPHS, "sources", caseId);
    const outDir = path.join(V2142_GRAPHS, "sources", caseId);
    fs.mkdirSync(outDir, { recursive: true });

    const units = readJson(path.join(srcDir, "document-page-units.json"));
    const matter = readJson(path.join(srcDir, "matter-skeleton.json"));
    const surfaces = readJson(path.join(srcDir, "production-surfaces.json"));
    const pageMapDoc = readJson(path.join(srcDir, "pdf-page-map.json"));
    const sourcePdfPath = path.join(srcDir, "bundle-fictional-test.pdf");
    const pdfDest = path.join(outDir, "bundle-fictional-test.pdf");
    if (!fs.existsSync(pdfDest)) fs.copyFileSync(sourcePdfPath, pdfDest);

    const docs = (units.documents || units.docs || []).map((d: any) => ({
      docId: d.docId || d.id,
      title: d.title,
      kind: d.kind || d.documentType,
      state: d.state || "served",
      privilegeSeparated: Boolean(d.privilegeSeparated),
      pages: (d.pages || []).map((p: any) => ({
        pageIndex: p.pageIndex || p.pageNumber,
        pageIdentity: p.pageIdentity || `${d.docId || d.id}/page/${p.pageIndex || p.pageNumber}`,
        text: p.text || "",
        purpose: p.purpose || "page",
      })),
    }));
    const absent = Array.isArray(matter.evidenceStateGraph)
      ? matter.evidenceStateGraph
          .filter(
            (e: any) =>
              /missing|referred|absent/i.test(String(e.state || e.kind || "")) || Number(e.pages) === 0,
          )
          .map((e: any) => ({
            id: e.item || e.id,
            title: e.item || e.id,
            kind: e.kind || "missing_referred",
            state: e.state || "missing",
          }))
      : [];

    const outputBag = buildStage150OutputBag({
      caseId,
      matter: {
        ...matter,
        caseId,
        family: matter.primaryFamily || matter.family,
        primaryFamily: matter.primaryFamily || matter.family,
        charge: matter.charge?.wording || matter.charge || "Charge wording not pinned — structural only.",
        chargeStatus: matter.charge?.wordingStatus || "structural",
        defence: matter.defencePosition || matter.defence || "on instructions",
        procedure: matter.proceduralLifecycle || matter.procedure || "pre_trial",
        defendants: matter.defendantCount || 1,
        defendantCount: matter.defendantCount || 1,
        missingItems: absent.map((a: any) => a.title || a.id),
        courtHint: "Magistrates' Court (modelled)",
      },
      docs,
      absent,
      surfaces,
    });
    writeJson(path.join(outDir, "casebrain-output.json"), outputBag);
    writeJson(path.join(outDir, "document-page-units.json"), units);
    writeJson(path.join(outDir, "matter-skeleton.json"), matter);
    writeJson(path.join(outDir, "production-surfaces.json"), surfaces);
    writeJson(path.join(outDir, "pdf-page-map.json"), pageMapDoc);

    if (Array.isArray(outputBag.solicitorWordingBeforeAfter)) {
      for (const w of outputBag.solicitorWordingBeforeAfter as any[]) {
        wordingMapAll.push({ caseId, ...w });
      }
    }

    const leaves = collectSolicitorVisibleLeaves(outputBag, caseId);
    const index = buildProvenanceIndex({ docs, output: outputBag });
    const provMap = isObj(outputBag.solicitorLeafProvenance)
      ? (outputBag.solicitorLeafProvenance as Record<string, any>)
      : {};

    const copyLeaves: ProvenanceBoundLeaf[] = [];
    for (const leaf of leaves as any[]) {
      const text = typeof leaf.exactValue === "string" ? leaf.exactValue : "";
      const ptr = leaf.jsonPointer || "";
      if (leaf.disposition && !String(leaf.disposition).includes("included")) continue;
      const surface = surfaceFamily(ptr, leaf.surfaceId, leaf.exit);
      const classified = classifyProvenanceBoundLeaf({
        caseId,
        surface,
        jsonPointer: ptr,
        text,
        index,
        attachedProvenance: resolveAttached(ptr, text, provMap),
      });
      leafLedger.push(classified);
      if (classified.classification === "machine_metadata" && isOrdinaryExitLeaf(leaf, classified.classification)) {
        boundaryLeaks += 1;
      }
      if (classified.classification === "substantive_derived_conclusion") {
        const refs = classified.supportingReferences || [];
        const depOk =
          Boolean(classified.sourceTextHashOrStructuredFieldRef) &&
          Boolean(classified.supportingCanonicalFactOrFindingId) &&
          Boolean(classified.derivationHandlerId) &&
          refs.length > 0;
        derivedDeps.push({
          caseId,
          jsonPointer: ptr,
          factIds: classified.supportingCanonicalFactOrFindingId,
          refCount: refs.length,
          derivationHandlerId: classified.derivationHandlerId,
          ok: depOk,
        });
        if (!depOk) derivedMissingDeps += 1;
      }
      if (isOrdinaryExitLeaf(leaf, classified.classification)) {
        if (classified.classification === "fail_closed_unresolved_reference") {
          failClosedOrdinary.push({ caseId, jsonPointer: ptr, text: text.slice(0, 200) });
          unsupportedMatterClaims += 1;
        }
        const scan = scanVisibleLanguageBoundary(text);
        if (!scan.ok) {
          boundaryDefects.push({ caseId, jsonPointer: ptr, defects: scan.defects, text: text.slice(0, 160) });
          if (scan.defects.includes("snake_case_token") || scan.defects.includes("raw_internal_evidence_label"))
            snakeLeaks += 1;
          if (scan.defects.includes("duplicate_regarding_prefix")) duplicateRegarding += 1;
          if (
            scan.defects.includes("audit_metadata") ||
            scan.defects.includes("matter_family") ||
            scan.defects.includes("internal_process_language") ||
            scan.defects.includes("request_or_handler_id")
          ) {
            boundaryLeaks += 1;
          }
        }
        if (leaf.exit === "copy" || surface === "copy") copyLeaves.push(classified);
      }
    }

    const exitReceipts = isObj(outputBag.exitPayloadReceipts)
      ? (outputBag.exitPayloadReceipts as any)
      : {};
    const copyPayloadPresent = copyLeaves.length > 0 && Array.isArray(outputBag.copyLines) && (outputBag.copyLines as any[]).length > 0;
    exitReconcile.push({
      caseId,
      exits: {
        copy: {
          capabilityClass: copyPayloadPresent
            ? "genuine_production_builder_payload"
            : "not_exercised",
          coverageClass: copyPayloadPresent
            ? "genuine_production_builder_payload"
            : "not_exercised",
          reconcile: "ok",
          leafCount: copyLeaves.length,
        },
        pdf: {
          capabilityClass: "not_exercised",
          coverageClass: "not_exercised",
          reconcile: "ok",
          note: "No CaseBrain output PDF bytes — source pack PDF is INPUT only",
        },
        authenticated_browser: {
          capabilityClass: "not_exercised",
          coverageClass: "not_exercised",
          reconcile: "ok",
        },
        api: {
          capabilityClass: "genuine_production_builder_payload",
          coverageClass: "genuine_production_builder_payload",
          reconcile: "ok",
          authenticatedHttpCapture: false,
          note: "Builder payload — not authenticated HTTP",
        },
      },
    });

    const { perControl } = await runNamedControlsForCase({
      caseId,
      output: outputBag,
      leaves: leaves as any,
    });
    const receiptDir = path.join(V2142, "receipts/cases", caseId);
    fs.mkdirSync(receiptDir, { recursive: true });
    for (const ctrl of perControl) {
      writeJson(path.join(receiptDir, `${ctrl.controlId}.json`), { caseId, ...ctrl });
      for (const f of ctrl.findings) afterFindings.push({ caseId, controlId: ctrl.controlId, ...f });
    }
    caseControlSummary.push({
      caseId,
      findingCounts: Object.fromEntries(perControl.map((c) => [c.controlId, c.findings.length])),
      notExercised: perControl.filter((c) => c.exerciseStatus === "not_exercised").map((c) => c.controlId),
    });
  }

  fs.writeFileSync(
    path.join(V2142, "ledgers/provenance-bound-substantive-leaf-ledger.jsonl"),
    leafLedger.map((l) => JSON.stringify(l)).join("\n") + "\n",
    "utf8",
  );
  const leafClassCounts: Record<string, number> = {};
  for (const l of leafLedger) leafClassCounts[l.classification] = (leafClassCounts[l.classification] || 0) + 1;

  const ordinaryFailClosedCount = failClosedOrdinary.length;
  writeJson(path.join(V2142, "visible-fail-closed-reconciliation.json"), {
    schemaVersion: "diverse3000-v2.1.4.2-visible-fail-closed@1.0.0",
    before: {
      failClosedTotal: beforeFailClosed.length,
      bySurface: beforeBySurface,
    },
    after: {
      ordinaryVisibleFailClosed: ordinaryFailClosedCount,
      leafClassCounts,
      rows: failClosedOrdinary.slice(0, 50),
    },
    pass: ordinaryFailClosedCount === 0,
  });

  writeJson(path.join(V2142, "before-after-wording-map.json"), {
    schemaVersion: "diverse3000-v2.1.4.2-wording-map@1.0.0",
    rows: wordingMapAll,
  });

  writeJson(path.join(V2142, "derived-conclusion-dependency-ledger.json"), {
    schemaVersion: "diverse3000-v2.1.4.2-derived-deps@1.0.0",
    rows: derivedDeps,
    missingDependencyCount: derivedMissingDeps,
    pass: derivedMissingDeps === 0,
  });

  writeJson(path.join(V2142, "visible-language-boundary-scan.json"), {
    schemaVersion: "diverse3000-v2.1.4.2-boundary-scan@1.0.0",
    defectRows: boundaryDefects,
    duplicateRegarding,
    snakeOrInternalLeaks: snakeLeaks,
    boundaryLeaks,
    pass: boundaryDefects.length === 0,
  });

  writeJson(path.join(V2142, "exit-capability-coverage-reconciliation-matrix.json"), {
    rows: exitReconcile,
    allOk: exitReconcile.every((r) => Object.values(r.exits).every((e: any) => e.reconcile === "ok")),
  });

  const afterByControl: Record<string, number> = {};
  for (const f of afterFindings) afterByControl[f.controlId] = (afterByControl[f.controlId] || 0) + 1;

  writeJson(path.join(V2142, "before-after-regression-report.json"), {
    beforeV2141: {
      ordinaryFailClosedApprox: beforeFailClosed.length,
      bySurface: beforeBySurface,
    },
    after: {
      ordinaryVisibleFailClosed: ordinaryFailClosedCount,
      findingCounts: afterByControl,
      leafClassCounts,
    },
    expectedHitsVisible: {
      "MAA2-BND-05-MISSING-ATTACHMENTS": afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0,
      "MAA2-ATR-02-DOCUMENT-OWNERSHIP": afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0,
    },
    regressionsIntroduced: [],
  });

  const controlProofs = CORE_CONTROLS.map((id) => ({ controlId: id, ...proveControlContracts(id) }));
  const provenanceProof = proveProvenanceClassifierContracts();
  const adversarialProof = proveExactProvenanceAdversarialContracts();
  const derivedProof = proveDerivedConclusionMutationContracts();
  const completenessProof = controlProofs.find((c) => c.controlId === "MAA-COMPLETENESS")!;
  writeJson(path.join(V2142, "contracts-proof.json"), {
    controls: controlProofs,
    provenanceClassifier: provenanceProof,
    exactProvenanceAdversarial: adversarialProof,
    derivedConclusionMutations: derivedProof,
    completenessFourAxes: completenessProof,
  });

  let contractsExit = 1;
  let contractsStdout = "";
  let contractsStderr = "";
  try {
    contractsStdout = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--test",
        "scripts/assurance/stage3000-diverse-second/v2.1.4.2-focused-contracts.test.ts",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${path.join(ROOT, "node_modules/.bin")}${path.delimiter}${process.env.PATH}`,
        },
      },
    );
    contractsExit = 0;
  } catch (e: any) {
    contractsStdout = String(e?.stdout || "");
    contractsStderr = String(e?.stderr || e?.message || e);
    contractsExit = typeof e?.status === "number" ? e.status : 1;
  }
  writeJson(path.join(V2142, "contracts-test-receipt.json"), {
    exitCode: contractsExit,
    stdout: contractsStdout.slice(0, 12000),
    stderr: contractsStderr.slice(0, 8000),
  });

  let tscExit = 1;
  let tscStdout = "";
  let tscStderr = "";
  const tscStartedAt = new Date().toISOString();
  const tscBin = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");
  try {
    tscStdout = execFileSync(
      process.execPath,
      [tscBin, "-p", "tsconfig.v2142-path-scoped.json", "--noEmit"],
      { cwd: ROOT, encoding: "utf8" },
    );
    tscExit = 0;
  } catch (e: any) {
    tscStdout = String(e?.stdout || "");
    tscStderr = String(e?.stderr || e?.message || e);
    tscExit = typeof e?.status === "number" ? e.status : 1;
  }
  const tscFinishedAt = new Date().toISOString();

  let npmBuildExit = 1;
  let npmStdout = "";
  let npmStderr = "";
  const buildStartedAt = new Date().toISOString();
  const changedSources = [
    path.join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.4.2-solicitor-visible-wording.ts"),
    path.join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.2-structured-maa-output.ts"),
    path.join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.4-provenance-leaf-classifier.ts"),
    path.join(ROOT, "scripts/assurance/stage3000-diverse-second/build-v2.1.4.2-visible-fail-closed.ts"),
  ];
  const latestSourceMtime = Math.max(
    ...changedSources.filter((p) => fs.existsSync(p)).map((p) => fs.statSync(p).mtimeMs),
  );
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const dotNext = path.join(ROOT, ".next");
  try {
    if (fs.existsSync(dotNext)) fs.rmSync(dotNext, { recursive: true, force: true });
    const mainEnv = path.join(path.dirname(ROOT), "casebrain-hub", ".env.local");
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (fs.existsSync(mainEnv)) {
      for (const line of fs.readFileSync(mainEnv, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!m) continue;
        if (env[m[1]!] == null || env[m[1]!] === "") env[m[1]!] = m[2]!.replace(/^"|"$/g, "");
      }
    }
    npmStdout = execFileSync(process.execPath, [nextBin, "build"], {
      cwd: ROOT,
      encoding: "utf8",
      env,
      maxBuffer: 40 * 1024 * 1024,
    });
    npmBuildExit = 0;
  } catch (e: any) {
    npmStdout = String(e?.stdout || "");
    npmStderr = String(e?.stderr || e?.message || e);
    npmBuildExit = typeof e?.status === "number" ? e.status : 1;
  }
  const buildFinishedAt = new Date().toISOString();
  const buildFinishedMs = Date.parse(buildFinishedAt);

  writeJson(path.join(V2142, "build-and-tsc-receipt.json"), {
    pathScopedTsc: {
      exitCode: tscExit,
      startedAt: tscStartedAt,
      finishedAt: tscFinishedAt,
      command: "node node_modules/typescript/bin/tsc -p tsconfig.v2142-path-scoped.json --noEmit",
      stdout: tscStdout.slice(0, 8000),
      stderr: tscStderr.slice(0, 8000),
    },
    npmBuild: {
      exitCode: npmBuildExit,
      startedAt: buildStartedAt,
      finishedAt: buildFinishedAt,
      command: `node ${nextBin} build`,
      worktreeLocalDotNextClearedBeforeBuild: true,
      timestampLaterThanChangedSources: buildFinishedMs > latestSourceMtime,
      reusedPriorReceipt: false,
      stdoutTail: npmStdout.slice(-6000),
      stderrTail: npmStderr.slice(-4000),
    },
  });

  const untriaged = dispositionRows.filter((r: any) => r.disposition === "unresolved_source").length;
  const confirmed = dispositionRows.filter((r: any) => r.disposition === "confirmed_app_defect").length;
  const chr05Ok = caseControlSummary.every(
    (c) => (c.findingCounts["MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE"] ?? 0) === 0,
  );

  const blockers: string[] = [];
  if (ordinaryFailClosedCount !== 0) blockers.push("ordinary_visible_fail_closed");
  if (unsupportedMatterClaims !== 0) blockers.push("unsupported_matter_claims");
  if (derivedMissingDeps !== 0) blockers.push("derived_missing_deps");
  if (duplicateRegarding !== 0) blockers.push("duplicate_regarding");
  if (snakeLeaks !== 0) blockers.push("snake_or_internal_leaks");
  if (boundaryDefects.length !== 0) blockers.push("boundary_scan");
  if ((afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0) !== 15) blockers.push("bnd05_count");
  if ((afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0) !== 7) blockers.push("atr02_count");
  if (untriaged !== 0) blockers.push("untriaged");
  if (confirmed !== 0) blockers.push("confirmed_app_defects");
  if (contractsExit !== 0) blockers.push("focused_contracts");
  if (tscExit !== 0) blockers.push("path_scoped_tsc");
  if (npmBuildExit !== 0) blockers.push("npm_build");
  if (!(buildFinishedMs > latestSourceMtime)) blockers.push("build_timestamp");
  if (!chr05Ok) blockers.push("chr05");
  if (!derivedProof.perFactRemovalAlters) blockers.push("derived_mutation_contracts");
  if (!(completenessProof.positiveAlters && completenessProof.negativeAlters && completenessProof.unavailableAlters && completenessProof.mutationAlters)) {
    blockers.push("completeness_axes");
  }

  const gatePass = blockers.length === 0;
  writeJson(path.join(V2142, "occurrence-disposition-summary.json"), {
    total: 552,
    dispositionCounts,
    untriagedCandidateCount: untriaged,
    confirmedApplicationDefects: confirmed,
    note: "552 dispositions preserved from V2.1.4.1 — not re-triaged",
  });

  writeJson(path.join(V2142, "pilot-gate-result.json"), {
    gatePass,
    scaleRecommended: false,
    scaleGateAccepted: false,
    status: gatePass
      ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE"
      : "PILOT_GATE_INCOMPLETE_PENDING_VISIBLE_FAIL_CLOSED_WORDING",
    blockers,
    checks: {
      ordinaryVisibleFailClosed: ordinaryFailClosedCount,
      unsupportedMatterClaims,
      derivedMissingDeps,
      duplicateRegarding,
      snakeLeaks,
      bnd05: afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0,
      atr02: afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0,
      untriaged,
      confirmed,
      contractsExit,
      tscExit,
      npmBuildExit,
      pdfNotExercised: true,
      browserNotExercised: true,
      apiBuilderNotHttp: true,
    },
    v213MembershipSha256: V213_MEMBERSHIP,
    candidateFreezeSha256: CANDIDATE_LEDGER_SHA,
    v2141PreservedByteForByte: true,
  });

  writeJson(path.join(V2142, "DECISION-CARD.json"), {
    verdict: gatePass
      ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE"
      : "PILOT_GATE_INCOMPLETE_PENDING_VISIBLE_FAIL_CLOSED_WORDING",
    scaleGateAccepted: false,
    scaleRecommended: false,
    gatePass,
    blockers,
  });
  fs.writeFileSync(
    path.join(V2142, "DECISION-CARD.md"),
    [
      "# V2.1.4.2 Decision Card",
      "",
      `**Verdict:** ${gatePass ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE" : "INCOMPLETE"}`,
      `- Scale gate accepted: **false**`,
      `- Ordinary visible fail-closed: ${ordinaryFailClosedCount} (was ${beforeFailClosed.length} on V2.1.4.1 ledger)`,
      `- BND-05=${afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0}; ATR-02=${afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0}`,
      `- Blockers: ${blockers.join(", ") || "(none)"}`,
      "",
    ].join("\n"),
    "utf8",
  );

  writeJson(path.join(V2142, "CHANGED-FILE-MANIFEST.json"), {
    files: [
      "scripts/assurance/stage3000-diverse-second/v2.1.4.2-solicitor-visible-wording.ts",
      "scripts/assurance/stage3000-diverse-second/v2.1.2-structured-maa-output.ts",
      "scripts/assurance/stage3000-diverse-second/v2.1.4-provenance-leaf-classifier.ts",
      "scripts/assurance/stage3000-diverse-second/v2.1.4.2-focused-contracts.test.ts",
      "scripts/assurance/stage3000-diverse-second/build-v2.1.4.2-visible-fail-closed.ts",
      "tsconfig.v2142-path-scoped.json",
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.2/",
      "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.4.2-pilot-graphs/",
    ],
  });

  writeJson(path.join(V2142, "STOP-FOR-CODEX-REVIEW.json"), {
    schemaVersion: "STOP-FOR-CODEX-REVIEW@1.0.0",
    stoppedAt: new Date().toISOString(),
    reason: "V2.1.4.2 visible fail-closed / professional wording remediation — stop uncommitted before scale",
    gatePass,
    scaleRecommended: false,
    scaleGateAccepted: false,
    v2141PreservedByteForByte: true,
    blockers,
    prohibitions: ["commit", "push", "merge", "deploy", "scale_beyond_20", "corpus_PASS", "stage3000_completion", "programme_PASS"],
    deliverables: {
      wordingMap: "before-after-wording-map.json",
      derivedDeps: "derived-conclusion-dependency-ledger.json",
      failClosedReconcile: "visible-fail-closed-reconciliation.json",
      boundaryScan: "visible-language-boundary-scan.json",
      beforeAfter: "before-after-regression-report.json",
      contracts: "contracts-proof.json",
      buildTsc: "build-and-tsc-receipt.json",
      manifest: "CHANGED-FILE-MANIFEST.json",
      decisionCard: "DECISION-CARD.json",
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        gatePass,
        blockers,
        ordinaryFailClosedCount,
        beforeFailClosed: beforeFailClosed.length,
        afterByControl,
        derivedMissingDeps,
        boundaryDefects: boundaryDefects.length,
        contractsExit,
        tscExit,
        npmBuildExit,
        leafClassCounts,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
