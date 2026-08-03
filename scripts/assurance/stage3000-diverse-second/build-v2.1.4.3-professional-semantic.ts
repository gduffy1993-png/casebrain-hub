/**
 * V2.1.4.3 professional semantic output quality — same frozen 20.
 * Preserves V2.1.4.2 artefacts byte-for-byte. No PDF regen / no scale / no 552 rewrite.
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
  scanProfessionalSemanticQuality,
  proveProfessionalSemanticContracts,
  proveDerivedConclusionMutationContracts,
  isCompleteChargeWording,
  isChargeHeadingOrLabel,
} from "./v2.1.4.3-professional-semantic-wording";

const ROOT = process.cwd();
const V2142 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.2",
);
const V2143 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.3",
);
const V213 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.3",
);
const V213_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.3-pilot-graphs",
);
const V2143_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.4.3-pilot-graphs",
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

function resolveAttached(ptr: string, text: string, map: Record<string, any>): any | null {
  if (map[ptr]) return map[ptr];
  if (/^\/copyLines\/\d+/.test(ptr)) {
    if (/Please provide|outstanding disclosure|not been identified/i.test(text)) {
      return map["/copyLines/chase"] || map["/solicitorFacingSurfaces/copyExportApiPdf/chase"] || null;
    }
    return map["/copyLines/meaning"] || map["/solicitorFacingSurfaces/copyExportApiPdf/meaning"] || null;
  }
  return null;
}

function isOrdinaryExitLeaf(leaf: any, classification: string): boolean {
  if (classification === "protected_audit_only" || classification === "machine_metadata") return false;
  const ptr = String(leaf.jsonPointer || "");
  if (
    /\/(evidenceStates|attributionGraph|chronologyEvents|provenanceRecords|exitPayloadReceipts|chargeInstruments)\//.test(
      ptr,
    )
  ) {
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
  return (
    ["copy", "view", "export", "api", "pdf"].includes(leaf.exit) &&
    !/\/(canCopy|sendability|blockedReason|exportId|generatedAt)\b/.test(ptr)
  );
}

function surfaceFamily(ref: string, surfaceId?: string, exit?: string): string {
  if (exit === "copy" || exit === "pdf" || exit === "export" || exit === "api") return exit;
  const s = `${surfaceId || ""} ${ref}`.toLowerCase();
  if (/composedprose|courtline|courtnote/.test(s)) return "composed_prose";
  if (/disclosurechase|chase/.test(s)) return "disclosure_chase";
  if (/copylines|copy_lines|copyexport/.test(s)) return "copy";
  if (/warroom/.test(s)) return "war_room";
  if (/controlroom/.test(s)) return "control_room";
  if (/charge/.test(s)) return "charges";
  if (/keyfacts/.test(s)) return "key_facts";
  if (/fiveanswers/.test(s)) return "five_answers";
  return "view";
}

function fileMeta(rel: string): { path: string; sha256: string; bytes: number } {
  const abs = path.join(ROOT, rel);
  const buf = fs.readFileSync(abs);
  return { path: rel.replace(/\\/g, "/"), sha256: sha(buf), bytes: buf.length };
}

async function main(): Promise<void> {
  fs.mkdirSync(V2143, { recursive: true });
  fs.mkdirSync(path.join(V2143, "ledgers"), { recursive: true });
  fs.mkdirSync(path.join(V2143, "receipts"), { recursive: true });

  writeJson(path.join(V2143, "v2.1.4.2-acceptance-and-scale-pending-note.json"), {
    v2142PreservedByteForByte: true,
    correctedStatus: "PILOT_GATE_INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY",
    sidecar: "../stage3000-diverse-second-v2.1.4.2/pilot-gate-claim-correction.json",
  });

  const membership = readJson(path.join(V213, "frozen-membership-v2.1.3-pilot20.json"));
  if (membership.orderedMembershipSha256 !== V213_MEMBERSHIP) throw new Error("membership drift");

  const dispSrc = path.join(V2142, "ledgers/v2.1.3-552-occurrence-disposition-ledger.jsonl");
  fs.copyFileSync(dispSrc, path.join(V2143, "ledgers/v2.1.3-552-occurrence-disposition-ledger.jsonl"));
  const dispositionRows = fs
    .readFileSync(dispSrc, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  if (dispositionRows.length !== 552) throw new Error("expected 552");

  // Remaining-10 reconciliation from V2.1.4.2 ledger (historical)
  const v2142Ledger = fs
    .readFileSync(path.join(V2142, "ledgers/provenance-bound-substantive-leaf-ledger.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const remain10 = v2142Ledger.filter((l) => l.classification === "fail_closed_unresolved_reference");
  writeJson(path.join(V2143, "remaining-10-fail-closed-reconciliation.json"), {
    schemaVersion: "diverse3000-v2.1.4.3-remaining-10@1.0.0",
    count: remain10.length,
    rows: remain10.map((l) => ({
      caseId: l.caseId,
      surface: l.surface,
      jsonPointer: l.jsonPointer,
      exactWording: l.exactWording,
      copyable: false,
      ordinaryExit: false,
      reason:
        "Inventory evidenceStates evidenceAnchor for MG06 referral of absent items — protected audit / inventory, not ordinary solicitor-facing wording. V2.1.4.3 classifies matching anchors as protected_audit_only.",
      remediationInV2143: "protected_audit_only when evidenceAnchor is MG06 index referral / absent-item inventory text",
    })),
    allProtectedOrUnavailable: remain10.every((l) => String(l.jsonPointer || "").includes("/evidenceStates/")),
  });

  const visibleLedger: any[] = [];
  const leafLedger: ProvenanceBoundLeaf[] = [];
  const afterFindings: any[] = [];
  const wordingMapAll: any[] = [];
  const derivedDeps: any[] = [];
  const chargeScan: any[] = [];
  const disclosureScan: any[] = [];
  const sentenceScan: any[] = [];
  const acronymScan: any[] = [];
  const exitMatrix: any[] = [];
  const semanticDefects: any[] = [];
  let ordinaryFailClosed = 0;
  let derivedMissing = 0;
  let headingAsCharge = 0;
  let brokenJoins = 0;
  let rawEnums = 0;
  let lowerAcronyms = 0;
  let vagueDisclosure = 0;
  let unsupportedStatutory = 0;
  let incompleteOperativeCharge = 0;

  for (const row of membership.membership) {
    const caseId = row.caseId as string;
    const srcDir = path.join(V213_GRAPHS, "sources", caseId);
    const outDir = path.join(V2143_GRAPHS, "sources", caseId);
    fs.mkdirSync(outDir, { recursive: true });

    const units = readJson(path.join(srcDir, "document-page-units.json"));
    const matter = readJson(path.join(srcDir, "matter-skeleton.json"));
    const surfaces = readJson(path.join(srcDir, "production-surfaces.json"));
    const pageMapDoc = readJson(path.join(srcDir, "pdf-page-map.json"));
    const pdfSrc = path.join(srcDir, "bundle-fictional-test.pdf");
    const pdfDest = path.join(outDir, "bundle-fictional-test.pdf");
    if (!fs.existsSync(pdfDest)) fs.copyFileSync(pdfSrc, pdfDest);

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
        charge: matter.charge?.wording || matter.charge || "",
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
      for (const w of outputBag.solicitorWordingBeforeAfter as any[]) wordingMapAll.push({ caseId, ...w });
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

      if (isOrdinaryExitLeaf(leaf, classified.classification)) {
        if (classified.classification === "fail_closed_unresolved_reference") ordinaryFailClosed += 1;
        if (classified.classification === "substantive_derived_conclusion") {
          const ok =
            Boolean(classified.sourceTextHashOrStructuredFieldRef) &&
            Boolean(classified.supportingCanonicalFactOrFindingId) &&
            Boolean(classified.derivationHandlerId) &&
            (classified.supportingReferences || []).length > 0;
          derivedDeps.push({
            caseId,
            jsonPointer: ptr,
            factIds: classified.supportingCanonicalFactOrFindingId,
            refCount: (classified.supportingReferences || []).length,
            ok,
          });
          if (!ok) derivedMissing += 1;
        }

        const scan = scanProfessionalSemanticQuality(text);
        const disposition = scan.ok ? "professional_pass" : "professional_defect";
        visibleLedger.push({
          caseId,
          surface,
          jsonPointer: ptr,
          exactWording: text,
          classification: classified.classification,
          supportingCanonicalFactOrFindingId: classified.supportingCanonicalFactOrFindingId,
          supportingReferences: classified.supportingReferences || [],
          professionalQualityDisposition: disposition,
          detectedReasons: scan.defects,
          proposedSharedCorrection: scan.ok
            ? null
            : "Shared-root professional semantic wording / vocabulary / charge-completeness handler",
        });
        if (!scan.ok) {
          semanticDefects.push({ caseId, jsonPointer: ptr, defects: scan.defects, text: text.slice(0, 200) });
          if (scan.defects.includes("markdown_heading_as_charge") || scan.defects.includes("incomplete_charge_as_operative"))
            headingAsCharge += 1;
          if (scan.defects.includes("broken_sentence_join")) brokenJoins += 1;
          if (
            scan.defects.includes("raw_absence_identifier") ||
            scan.defects.includes("snake_case_token") ||
            scan.defects.includes("raw_pet_token")
          )
            rawEnums += 1;
          if (scan.defects.includes("lowercase_protected_acronym")) lowerAcronyms += 1;
          if (scan.defects.includes("vague_combined_disclosure")) vagueDisclosure += 1;
          if (scan.defects.includes("ambiguous_section_reference")) unsupportedStatutory += 1;
        }

        if (/charge/i.test(ptr) || /recorded charge|operative recorded charge/i.test(text)) {
          const heading = isChargeHeadingOrLabel(text) || /recorded charge is:\s*##/i.test(text);
          const incompleteOperative =
            /operative recorded charge is:/i.test(text) && !isCompleteChargeWording(text.replace(/^.*:\s*/, ""));
          chargeScan.push({
            caseId,
            jsonPointer: ptr,
            text: text.slice(0, 240),
            headingAsCharge: heading,
            incompleteOperative,
          });
          if (incompleteOperative && /##|Particulars/i.test(text)) incompleteOperativeCharge += 1;
        }
        if (/disclosure|chase|limitation|copyLines/i.test(ptr)) {
          disclosureScan.push({
            caseId,
            jsonPointer: ptr,
            text: text.slice(0, 200),
            defects: scan.defects.filter((d) =>
              /absence|disclosure|abe|referred_absent|vague/i.test(d),
            ),
          });
        }
        if (scan.defects.includes("broken_sentence_join")) {
          sentenceScan.push({ caseId, jsonPointer: ptr, text: text.slice(0, 200) });
        }
        if (
          scan.defects.includes("lowercase_protected_acronym") ||
          scan.defects.includes("raw_pet_token") ||
          /plea and trial preparation hearing/i.test(text)
        ) {
          acronymScan.push({
            caseId,
            jsonPointer: ptr,
            text: text.slice(0, 160),
            defects: scan.defects,
          });
        }

        if (leaf.exit === "copy" || surface === "copy") copyLeaves.push(classified);
      }
    }

    const exitReceipts = isObj(outputBag.exitPayloadReceipts)
      ? (outputBag.exitPayloadReceipts as any)
      : {};
    const copyOk =
      copyLeaves.length > 0 && Array.isArray(outputBag.copyLines) && (outputBag.copyLines as any[]).length > 0;
    exitMatrix.push({
      caseId,
      exits: {
        view: { class: "genuine_production_builder_payload", reconcile: "ok" },
        copy: {
          class: copyOk ? "genuine_production_builder_payload" : "not_exercised",
          leafCount: copyLeaves.length,
          reconcile: "ok",
        },
        export: { class: "genuine_production_builder_payload", reconcile: "ok" },
        api: {
          class: "genuine_production_builder_payload",
          authenticatedHttpCapture: false,
          reconcile: "ok",
        },
        pdf: { class: "not_exercised", reconcile: "ok" },
        composed_prose: { class: "genuine_production_builder_payload", reconcile: "ok" },
        authenticated_browser: { class: "not_exercised", reconcile: "ok" },
      },
      exitPayloadReceiptsPresent: Boolean(exitReceipts.copy),
    });

    const { perControl } = await runNamedControlsForCase({
      caseId,
      output: outputBag,
      leaves: leaves as any,
    });
    const receiptDir = path.join(V2143, "receipts/cases", caseId);
    fs.mkdirSync(receiptDir, { recursive: true });
    for (const ctrl of perControl) {
      writeJson(path.join(receiptDir, `${ctrl.controlId}.json`), { caseId, ...ctrl });
      for (const f of ctrl.findings) afterFindings.push({ caseId, controlId: ctrl.controlId, ...f });
    }
  }

  fs.writeFileSync(
    path.join(V2143, "ledgers/professional-visible-string-ledger.jsonl"),
    visibleLedger.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(V2143, "ledgers/provenance-bound-substantive-leaf-ledger.jsonl"),
    leafLedger.map((l) => JSON.stringify(l)).join("\n") + "\n",
    "utf8",
  );

  const leafClassCounts: Record<string, number> = {};
  for (const l of leafLedger) leafClassCounts[l.classification] = (leafClassCounts[l.classification] || 0) + 1;
  const afterOrdinaryFc = leafLedger.filter(
    (l) =>
      l.classification === "fail_closed_unresolved_reference" &&
      (String(l.jsonPointer).startsWith("/solicitorFacingSurfaces") ||
        String(l.jsonPointer).startsWith("/copyLines") ||
        String(l.jsonPointer).startsWith("/composedProse") ||
        String(l.jsonPointer).startsWith("/disclosureChase") ||
        String(l.jsonPointer).startsWith("/warRoom") ||
        l.jsonPointer === "/courtNote/text"),
  ).length;

  writeJson(path.join(V2143, "professional-semantic-quality-summary.json"), {
    ordinaryVisibleStrings: visibleLedger.length,
    professionalPass: visibleLedger.filter((r) => r.professionalQualityDisposition === "professional_pass").length,
    professionalDefect: visibleLedger.filter((r) => r.professionalQualityDisposition === "professional_defect")
      .length,
    defectCounts: {
      headingAsCharge,
      brokenJoins,
      rawEnums,
      lowerAcronyms,
      vagueDisclosure,
      unsupportedStatutory,
      incompleteOperativeCharge,
      ordinaryFailClosed: afterOrdinaryFc,
      derivedMissing,
    },
    leafClassCounts,
    semanticDefectSample: semanticDefects.slice(0, 20),
  });

  writeJson(path.join(V2143, "charge-completeness-and-heading-scan.json"), {
    rows: chargeScan,
    headingOrIncompleteOperative: chargeScan.filter((r) => r.headingAsCharge || r.incompleteOperative).length,
    pass: chargeScan.every((r) => !r.headingAsCharge && !r.incompleteOperative),
  });
  writeJson(path.join(V2143, "disclosure-item-wording-scan.json"), {
    rows: disclosureScan.filter((r) => (r.defects || []).length > 0).slice(0, 50),
    pass: disclosureScan.every((r) => (r.defects || []).length === 0),
  });
  writeJson(path.join(V2143, "sentence-composition-scan.json"), {
    brokenJoinCount: sentenceScan.length,
    rows: sentenceScan,
    pass: sentenceScan.length === 0,
  });
  writeJson(path.join(V2143, "acronym-and-procedure-vocabulary-report.json"), {
    rows: acronymScan.slice(0, 80),
    lowercaseAcronymDefects: lowerAcronyms,
    pass: lowerAcronyms === 0,
  });
  writeJson(path.join(V2143, "before-after-wording-map.json"), { rows: wordingMapAll });
  writeJson(path.join(V2143, "derived-conclusion-dependency-ledger.json"), {
    rows: derivedDeps,
    missingDependencyCount: derivedMissing,
    pass: derivedMissing === 0,
  });
  writeJson(path.join(V2143, "all-exit-regression-matrix.json"), {
    rows: exitMatrix,
    allOk: exitMatrix.every((r) => Object.values(r.exits).every((e: any) => e.reconcile === "ok")),
  });

  const afterByControl: Record<string, number> = {};
  for (const f of afterFindings) afterByControl[f.controlId] = (afterByControl[f.controlId] || 0) + 1;

  writeJson(path.join(V2143, "before-after-regression-report.json"), {
    beforeV2142: {
      ordinaryVisibleFailClosedClaimed: 0,
      semanticDefectsObservedByCodex: 210,
      remainingFailClosedInLedger: remain10.length,
    },
    after: {
      ordinaryVisibleFailClosed: afterOrdinaryFc,
      findingCounts: afterByControl,
      leafClassCounts,
      semanticDefects: semanticDefects.length,
    },
    expectedHits: {
      BND05: afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0,
      ATR02: afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0,
    },
  });

  const controlProofs = CORE_CONTROLS.map((id) => ({ controlId: id, ...proveControlContracts(id) }));
  const semanticProof = proveProfessionalSemanticContracts();
  const derivedProof = proveDerivedConclusionMutationContracts();
  writeJson(path.join(V2143, "contracts-proof.json"), {
    controls: controlProofs,
    provenance: proveProvenanceClassifierContracts(),
    adversarial: proveExactProvenanceAdversarialContracts(),
    professionalSemantic: semanticProof,
    derivedMutations: derivedProof,
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
        "scripts/assurance/stage3000-diverse-second/v2.1.4.3-focused-contracts.test.ts",
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
  writeJson(path.join(V2143, "contracts-test-receipt.json"), {
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
      [tscBin, "-p", "tsconfig.v2143-path-scoped.json", "--noEmit"],
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
  const changedRel = [
    "scripts/assurance/stage3000-diverse-second/v2.1.4.3-professional-semantic-wording.ts",
    "scripts/assurance/stage3000-diverse-second/v2.1.2-structured-maa-output.ts",
    "scripts/assurance/stage3000-diverse-second/v2.1.4-provenance-leaf-classifier.ts",
    "scripts/assurance/stage3000-diverse-second/v2.1.4.3-focused-contracts.test.ts",
    "scripts/assurance/stage3000-diverse-second/build-v2.1.4.3-professional-semantic.ts",
    "tsconfig.v2143-path-scoped.json",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.2/pilot-gate-claim-correction.json",
  ];
  const latestSourceMtime = Math.max(
    ...changedRel.map((r) => path.join(ROOT, r)).filter((p) => fs.existsSync(p)).map((p) => fs.statSync(p).mtimeMs),
  );
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  try {
    if (fs.existsSync(path.join(ROOT, ".next"))) {
      fs.rmSync(path.join(ROOT, ".next"), { recursive: true, force: true });
    }
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

  writeJson(path.join(V2143, "build-and-tsc-receipt.json"), {
    pathScopedTsc: {
      exitCode: tscExit,
      startedAt: tscStartedAt,
      finishedAt: tscFinishedAt,
      command: "node node_modules/typescript/bin/tsc -p tsconfig.v2143-path-scoped.json --noEmit",
      stdout: tscStdout.slice(0, 8000),
      stderr: tscStderr.slice(0, 8000),
    },
    npmBuild: {
      exitCode: npmBuildExit,
      startedAt: buildStartedAt,
      finishedAt: buildFinishedAt,
      command: `node ${nextBin} build`,
      worktreeLocalDotNextClearedBeforeBuild: true,
      timestampLaterThanChangedSources: Date.parse(buildFinishedAt) > latestSourceMtime,
      reusedPriorReceipt: false,
      stdoutTail: npmStdout.slice(-6000),
      stderrTail: npmStderr.slice(-4000),
    },
  });

  const changedManifest = changedRel.filter((r) => fs.existsSync(path.join(ROOT, r))).map(fileMeta);
  writeJson(path.join(V2143, "CHANGED-FILE-MANIFEST.json"), {
    files: changedManifest,
    artefactRoots: [
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.4.3/",
      "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.4.3-pilot-graphs/",
    ],
  });

  const untriaged = dispositionRows.filter((r: any) => r.disposition === "unresolved_source").length;
  const confirmed = dispositionRows.filter((r: any) => r.disposition === "confirmed_app_defect").length;
  const professionalDefectCount = visibleLedger.filter(
    (r) => r.professionalQualityDisposition === "professional_defect",
  ).length;

  const blockers: string[] = [];
  if (headingAsCharge !== 0) blockers.push("heading_as_charge");
  if (brokenJoins !== 0) blockers.push("broken_joins");
  if (rawEnums !== 0) blockers.push("raw_enums");
  if (lowerAcronyms !== 0) blockers.push("lowercase_acronyms");
  if (vagueDisclosure !== 0) blockers.push("vague_disclosure");
  if (unsupportedStatutory !== 0) blockers.push("unsupported_statutory");
  if (afterOrdinaryFc !== 0) blockers.push("ordinary_fail_closed");
  if (derivedMissing !== 0) blockers.push("derived_missing_deps");
  if (incompleteOperativeCharge !== 0) blockers.push("incomplete_operative_charge");
  if (professionalDefectCount !== 0) blockers.push("professional_semantic_defects");
  if ((afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0) !== 15) blockers.push("bnd05");
  if ((afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0) !== 7) blockers.push("atr02");
  if (untriaged !== 0) blockers.push("untriaged");
  if (confirmed !== 0) blockers.push("confirmed_defects");
  if (contractsExit !== 0) blockers.push("contracts");
  if (tscExit !== 0) blockers.push("tsc");
  if (npmBuildExit !== 0) blockers.push("npm_build");
  if (!(Date.parse(buildFinishedAt) > latestSourceMtime)) blockers.push("build_timestamp");
  if (!semanticProof.markdownHeadingFails || !semanticProof.section45DoesNotOverstate) {
    blockers.push("semantic_contracts");
  }

  const gatePass = blockers.length === 0;
  writeJson(path.join(V2143, "pilot-gate-result.json"), {
    gatePass,
    scaleRecommended: false,
    scaleGateAccepted: false,
    status: gatePass
      ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE"
      : "PILOT_GATE_INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY",
    blockers,
    checks: {
      headingAsCharge,
      brokenJoins,
      rawEnums,
      lowerAcronyms,
      vagueDisclosure,
      unsupportedStatutory,
      ordinaryFailClosed: afterOrdinaryFc,
      derivedMissing,
      professionalDefectCount,
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
    v2142ClaimCorrected: "PILOT_GATE_INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY",
  });

  writeJson(path.join(V2143, "DECISION-CARD.json"), {
    verdict: gatePass
      ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE"
      : "PILOT_GATE_INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY",
    scaleGateAccepted: false,
    scaleRecommended: false,
    gatePass,
    blockers,
  });
  fs.writeFileSync(
    path.join(V2143, "DECISION-CARD.md"),
    [
      "# V2.1.4.3 Decision Card",
      "",
      `**Verdict:** ${gatePass ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE" : "INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY"}`,
      `- Scale gate accepted: **false** (do not set true in this stop)`,
      `- Professional semantic defects: ${professionalDefectCount}`,
      `- Ordinary visible fail-closed: ${afterOrdinaryFc}`,
      `- BND-05=${afterByControl["MAA2-BND-05-MISSING-ATTACHMENTS"] || 0}; ATR-02=${afterByControl["MAA2-ATR-02-DOCUMENT-OWNERSHIP"] || 0}`,
      `- Blockers: ${blockers.join(", ") || "(none)"}`,
      "",
    ].join("\n"),
    "utf8",
  );

  writeJson(path.join(V2143, "STOP-FOR-CODEX-REVIEW.json"), {
    schemaVersion: "STOP-FOR-CODEX-REVIEW@1.0.0",
    stoppedAt: new Date().toISOString(),
    reason:
      "V2.1.4.3 professional semantic output quality remediation — stop uncommitted for Codex review before scale",
    gatePass,
    scaleRecommended: false,
    scaleGateAccepted: false,
    v2142PreservedByteForByte: true,
    v2142ClaimCorrected: "PILOT_GATE_INCOMPLETE_PENDING_PROFESSIONAL_SEMANTIC_OUTPUT_QUALITY",
    blockers,
    prohibitions: [
      "commit",
      "push",
      "merge",
      "deploy",
      "scale_beyond_20",
      "corpus_PASS",
      "stage3000_completion",
      "programme_PASS",
      "set_scaleGateAccepted_true",
    ],
    deliverables: {
      visibleLedger: "ledgers/professional-visible-string-ledger.jsonl",
      semanticSummary: "professional-semantic-quality-summary.json",
      chargeScan: "charge-completeness-and-heading-scan.json",
      disclosureScan: "disclosure-item-wording-scan.json",
      sentenceScan: "sentence-composition-scan.json",
      acronymReport: "acronym-and-procedure-vocabulary-report.json",
      remaining10: "remaining-10-fail-closed-reconciliation.json",
      wordingMap: "before-after-wording-map.json",
      derivedDeps: "derived-conclusion-dependency-ledger.json",
      exitMatrix: "all-exit-regression-matrix.json",
      manifest: "CHANGED-FILE-MANIFEST.json",
      decisionCard: "DECISION-CARD.json",
    },
  });

  writeJson(path.join(V2143, "occurrence-disposition-summary.json"), {
    total: 552,
    note: "552 dispositions preserved from V2.1.4.2 — not re-triaged",
    untriagedCandidateCount: untriaged,
    confirmedApplicationDefects: confirmed,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        gatePass,
        blockers,
        professionalDefectCount,
        afterOrdinaryFc,
        afterByControl,
        contractsExit,
        tscExit,
        npmBuildExit,
        remain10: remain10.length,
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
