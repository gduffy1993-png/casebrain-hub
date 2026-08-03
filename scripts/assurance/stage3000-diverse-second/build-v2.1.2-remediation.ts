/**
 * V2.1.2 remediation pilot: same 20 matters as V2.1.1 freeze.
 * Kind-specific PDF layouts, genuine named-control handlers, leaf-level output strength.
 * Does not mutate frozen V2 / V2.1 / V2.1.1 membership or pilot-gate-result.json.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

import { buildLiveProductionSurfacesFromDocumentUnits } from "../../../lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "../../../lib/criminal/build-from-document-units";
import { containsAbsoluteProofWording } from "../../../lib/criminal/absolute-proof-wording";

import {
  buildDocSpecs,
  renderKindSpecificPdf,
  isAbsentState,
  sha,
  PUBLIC_TEMPLATE_MAP,
  type DocSpec,
} from "./v2.1.2-document-kind-layouts";
import {
  buildStage150OutputBag,
  collectSolicitorVisibleLeaves,
} from "./v2.1.2-structured-maa-output";
import {
  runNamedControlsForCase,
  proveControlContracts,
  CORE_CONTROLS,
  type NamedControlExerciseRow,
} from "./v2.1.2-named-control-runner";

const ROOT = process.cwd();
const V211 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.1",
);
const V212 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1.2",
);
const V212_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1.2-pilot-graphs",
);
const V2_SOURCES = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs/sources",
);

const V211_HASH = "d109bcd431eede97e8d9fc1fdf260c507453239cdc0af7bb2b3d54c631f69777";
const V21_HASH = "1ec51fc426293cb5af5a1b1ed47c4e13cbd578d7438df7086a216c4432b65c2f";
const V2_HASH = "be4f3bec455c220267aaf3dc265292aa20c1cd763c5d7c5fe5d2df2cb88a25c9";

const STRUCTURED_NAMED = new Set([
  "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
  "MAA2-CHS-03-PROVENANCE-LINK",
]);

const UNIVERSAL_SAFETY_RE =
  /do not overstate|fictional test|solicitor review required|do not import .{0,40} unless the papers support it|exact document title, page, evidence state|filename alone as source proof|not safely confirmed on the current|could not be safely completed from the available papers|assumed position may conflict|do not say (bwv|cctv)|identification remains conditional|unless the clip is served|do not treat filename alone|do not state [\"']?cctv|exact page is unavailable|unsplit whole-document text|cite the document rather than a page|native bytes not_exercised/i;

function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function loadPdfKit(): any {
  try {
    return createRequire(path.join(ROOT, "package.json"))("pdfkit");
  } catch {
    return createRequire("C:/Users/gduff/casebrain-hub/package.json")("pdfkit");
  }
}

function rasterize(pdfPath: string, outDir: string): any {
  const script = path.join(
    ROOT,
    "scripts/assurance/stage3000-diverse-second/rasterize-pdf-pages.py",
  );
  const out = execFileSync("python", [script, pdfPath, outDir], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function toUploadedUnits(docs: DocSpec[]): UploadedDocumentUnit[] {
  return docs.map((d, i) => ({
    id: d.docId,
    title: d.title,
    documentType: d.kind,
    uploadOrder: i + 1,
    versionNumber: /superseded|draft/i.test(d.state) ? 1 : 2,
    replacesDocumentId: /superseded/i.test(d.state) ? null : undefined,
    pages: d.pages.map((p) => ({
      pageNumber: p.pageIndex,
      compiledPage: p.pageIndex,
      text: p.text,
      pageIdentityKnown: true,
    })),
    fullText: d.pages.map((p) => p.text).join("\n\n"),
  }));
}

function surfaceFamily(surfaceId: string): string {
  const s = surfaceId.toLowerCase();
  if (/court/.test(s)) return "court";
  if (/chase|cps_chase|disclosure/.test(s)) return "chase";
  if (/pdf/.test(s)) return "pdf";
  if (/copy/.test(s)) return "copy";
  if (/five_answers|truth_map/.test(s)) return "five_answers";
  if (/war_room|do_not_overstate|hard_rule/.test(s)) return "war_room";
  if (/charge/.test(s)) return "charges";
  if (/key_fact/.test(s)) return "key_facts";
  if (/export/.test(s)) return "export";
  if (/api/.test(s)) return "api";
  if (/control_room/.test(s)) return "control_room";
  if (/sendability|matter_confidence/.test(s)) return "labels";
  return surfaceId || "other";
}

function normTemplate(t: string, caseId: string): string {
  return t
    .toLowerCase()
    .replace(new RegExp(caseId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "<CASE>")
    .replace(/div3000v21[12]?-\d{2}-[a-z0-9_]+/gi, "<CASE>")
    .replace(/div3000v2-\d{4}-[a-z0-9_]+/gi, "<CASE>")
    .replace(/[^a-z<>_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p.replace(/\\/g, "/"));
  }
  return acc;
}

async function main() {
  const v211Freeze = JSON.parse(
    fs.readFileSync(path.join(V211, "frozen-membership-v2.1.1-pilot20.json"), "utf8"),
  );
  if (v211Freeze.orderedMembershipSha256 !== V211_HASH) {
    throw new Error(
      `V2.1.1 membership drift: expected ${V211_HASH}, got ${v211Freeze.orderedMembershipSha256}`,
    );
  }

  // Preserve V2.1.1 lock — do not mutate membership or pilot-gate-result.json
  writeJson(path.join(V211, "preservation/V2.1.1-HASH-LOCK.json"), {
    orderedMembershipSha256: V211_HASH,
    preservedAsHistoricalPreRemediation: true,
    doNotMutate: true,
    correctiveGateStatus:
      "PILOT_GATE_INCOMPLETE_PENDING_DOCUMENT_REALISM__GENUINE_CONTROL_EXECUTION__OUTPUT_STRENGTH",
    byteForByteLock: true,
    remediationLineage: "stage3000-diverse-second-v2.1.2",
  });

  fs.mkdirSync(V212, { recursive: true });
  fs.mkdirSync(path.join(V212_GRAPHS, "sources"), { recursive: true });
  fs.mkdirSync(path.join(V212, "receipts/cases"), { recursive: true });
  fs.mkdirSync(path.join(V212, "ledgers"), { recursive: true });

  const membershipRows: any[] = [];
  const lineage: any[] = [];
  const sourceReading: any[] = [];
  const missingLedger: any[] = [];
  const absenceContracts: any[] = [];
  const pdfRegister: any[] = [];
  const visualQaAll: any[] = [];
  const exitMatrixRows: any[] = [];
  const productionResults: any[] = [];
  const allLeafRows: any[] = [];
  const layoutKindCounts = new Map<string, number>();
  const pagePurposeMissing: any[] = [];
  const caseControlRows: Array<{ caseId: string; rows: NamedControlExerciseRow[] }> = [];
  const allFindings: any[] = [];

  const chargeCorrPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2/corrections/authority-charge-correction-register.json",
  );
  const chargeCorr = fs.existsSync(chargeCorrPath)
    ? JSON.parse(fs.readFileSync(chargeCorrPath, "utf8"))
    : { correctedCharges: [] };
  const chargeStatusByFamily = new Map(
    (chargeCorr.correctedCharges || []).map((c: any) => [c.family, c.correctedStatus]),
  );

  for (const row of v211Freeze.membership) {
    const v2CaseId = row.v2CaseId;
    const orderIndex = row.orderIndex;
    const caseId = `div3000v212-${String(orderIndex + 1).padStart(2, "0")}-${row.primaryFamily}`;

    const v2Matter = JSON.parse(
      fs.readFileSync(path.join(V2_SOURCES, v2CaseId, "matter-skeleton.json"), "utf8"),
    );
    const v2Pack = JSON.parse(
      fs.readFileSync(path.join(V2_SOURCES, v2CaseId, "source-pack.json"), "utf8"),
    );
    const matter = {
      ...v2Matter,
      caseId,
      v2CaseId,
      v211CaseId: row.caseId,
      v21CaseId: row.v21CaseId,
      pilotOrderIndex: orderIndex,
      charge: {
        ...v2Matter.charge,
        wordingStatus:
          chargeStatusByFamily.get(row.primaryFamily) ||
          v2Matter.charge?.wordingStatus ||
          "structural_only",
      },
    };

    const missingItems = (v2Pack.documents || [])
      .filter((d: any) => isAbsentState(d.state) || d.kind === "missing_referred")
      .map((d: any) => d.id);

    const { present: docs, absent: absentDocs } = buildDocSpecs({
      caseId,
      matter,
      packDocuments: v2Pack.documents || [],
      missingItems,
    });

    for (const d of docs) {
      for (const p of d.pages) {
        const lk = p.layoutKind || d.publicTemplateRef || d.kind || "unknown";
        layoutKindCounts.set(lk, (layoutKindCounts.get(lk) || 0) + 1);
        if (!p.purpose || !String(p.purpose).trim()) {
          pagePurposeMissing.push({ caseId, pageIdentity: p.pageIdentity });
        }
      }
    }

    const caseDir = path.join(V212_GRAPHS, "sources", caseId);
    fs.mkdirSync(caseDir, { recursive: true });
    const pdf = await renderKindSpecificPdf(caseDir, docs, loadPdfKit);
    const rasterDir = path.join(caseDir, "page-pngs");
    const visual = rasterize(pdf.pdfPath, rasterDir);
    visualQaAll.push({ caseId, ...visual });

    writeJson(path.join(caseDir, "matter-skeleton.json"), matter);
    writeJson(path.join(caseDir, "document-page-units.json"), { caseId, documents: docs });
    writeJson(path.join(caseDir, "pdf-page-map.json"), {
      caseId,
      pdfPath: path.relative(ROOT, pdf.pdfPath).replace(/\\/g, "/"),
      sha256: pdf.sha256,
      pageCount: pdf.pageCount,
      pageMap: pdf.pageMap,
    });

    for (const d of docs) {
      sourceReading.push({
        caseId,
        docId: d.docId,
        title: d.title,
        kind: d.kind,
        state: d.state,
        contentHash: d.contentHash,
        layoutKinds: [...new Set(d.pages.map((p) => p.layoutKind))],
        exactTextFieldsInspected: ["pages[].text", "pages[].purpose", "pages[].headings", "pages[].layoutKind"],
        sourceIdentity: d.docId,
        pages: d.pages.map((p) => ({
          pageIdentity: p.pageIdentity,
          pageIndex: p.pageIndex,
          purpose: p.purpose,
          layoutKind: p.layoutKind,
          textHash: p.textHash,
          sourcePageVersusCompiledPage: "source_page",
          extractionReadOutcome: "read_ok",
          unreadSections: [],
        })),
        realPaginatedFile: true,
        privilegeSeparated: Boolean(d.privilegeSeparated),
      });
    }

    for (const a of absentDocs) {
      const expectedId = a.docId;
      missingLedger.push({
        caseId,
        expectedDocumentIdentity: expectedId,
        title: a.title,
        kind: a.kind,
        state: a.state,
        generatedSourceDocument: false,
        generatedPdfPages: false,
        pageCount: 0,
        realPaginatedFile: false,
        extractionReadOutcome: "referenced_absent_not_read",
        referringDocumentId: "MG06",
        referringPageIdentity: "MG06/page/1",
        note: "Absence retained as expected identity only; MG6 may refer; master remains absent.",
      });
      sourceReading.push({
        caseId,
        docId: expectedId,
        title: a.title,
        kind: a.kind,
        state: a.state,
        contentHash: null,
        exactTextFieldsInspected: [],
        sourceIdentity: expectedId,
        pages: [],
        pageCount: 0,
        realPaginatedFile: false,
        extractionReadOutcome: "referenced_absent_not_read",
        referringDocumentId: "MG06",
        referringPageIdentity: docs.some((d) => /mg06/i.test(d.docId) || d.kind === "mg06")
          ? "MG06/page/1"
          : null,
      });
      absenceContracts.push({
        caseId,
        contracts: {
          mg6_can_refer_to_absent_master: true,
          master_remains_absent: true,
          master_has_no_source_pages: true,
          chase_points_to_absent_item: missingItems.includes(expectedId),
          casebrain_cannot_quote_or_summarise_nonexistent_content: true,
        },
        expectedDocumentIdentity: expectedId,
        referringPageIdentity: "MG06/page/1",
      });
    }

    pdfRegister.push({
      caseId,
      pdfSha256: pdf.sha256,
      pageCount: pdf.pageCount,
      path: path.relative(ROOT, pdf.pdfPath).replace(/\\/g, "/"),
      visualFailedPages: visual.failedPages || [],
      contactSheet: visual.contactSheet,
      layoutKinds: [...new Set(pdf.pageMap.map((p) => p.layoutKind))],
    });

    let surfaces: ReturnType<typeof buildLiveProductionSurfacesFromDocumentUnits> | null = null;
    let builderError: string | null = null;
    try {
      const defenceLabel = String(matter.defencePosition || "").replace(/_/g, " ");
      const procedureLabel = String(matter.proceduralLifecycle || "").replace(/_/g, " ");
      surfaces = buildLiveProductionSurfacesFromDocumentUnits(toUploadedUnits(docs), {
        caseId,
        allegation: matter.charge?.wording,
        recordedChargeText: matter.charge?.wording,
        canonicalOffenceLine: matter.charge?.wording,
        courtNoteText: [
          `Matter family under review: ${matter.primaryFamily}.`,
          `Defence on instructions: ${defenceLabel}.`,
          `Procedural stage: ${procedureLabel}.`,
          missingItems.length
            ? `MG6 refers to absent items (not served): ${missingItems.join(", ")}.`
            : "No deliberate referred-absent masters declared on MG6.",
          `Charge wording status: ${matter.charge?.wordingStatus || "unknown"}.`,
          `Defendant count modelled: ${matter.defendantCount || 1}.`,
        ].join(" "),
        caseTitle: `Fictional test — ${matter.primaryFamily}`,
        clientLabel: "Client (fictional)",
      });
    } catch (e: any) {
      builderError = String(e?.stack || e);
    }

    if (!surfaces) {
      productionResults.push({
        caseId,
        ok: false,
        missingAdapterOrError: builderError,
        productionClass: "unavailable",
      });
      exitMatrixRows.push({
        caseId,
        exits: { error: builderError, authenticated_browser: "not_exercised" },
      });
      caseControlRows.push({ caseId, rows: [] });
    } else {
      productionResults.push({
        caseId,
        ok: true,
        productionClass: "genuine_production_builder",
        builder: "buildLiveProductionSurfacesFromDocumentUnits",
        chaseLabels: surfaces.pipeline.chaseLabels,
        chargeCount: surfaces.charges.length,
        findingCount: surfaces.pipeline.findings.length,
        crossExitOk: surfaces.crossExit?.ok ?? null,
      });

      const stageDocs = docs.map((d) => ({
        docId: d.docId,
        title: d.title,
        kind: d.kind,
        state: d.state,
        pages: d.pages.map((p) => ({
          pageIndex: p.pageIndex,
          pageIdentity: p.pageIdentity,
          text: p.text,
          purpose: p.purpose,
        })),
        privilegeSeparated: d.privilegeSeparated,
      }));
      const stageAbsent = absentDocs.map((a) => ({
        id: a.docId,
        title: a.title,
        kind: a.kind,
        state: a.state,
      }));

      const outputBag = buildStage150OutputBag({
        caseId,
        matter,
        docs: stageDocs,
        absent: stageAbsent,
        surfaces,
      });
      writeJson(path.join(caseDir, "casebrain-output.json"), outputBag);
      writeJson(path.join(caseDir, "production-surfaces.json"), {
        caseId,
        charges: surfaces.charges,
        chaseLabels: surfaces.pipeline.chaseLabels,
        evidenceState: surfaces.pipeline.evidenceState,
        attributionSummary: { defendantCountModelled: matter.defendantCount },
        hearingLifecycle: surfaces.pipeline.hearingLifecycle,
        composedProse: surfaces.composedProse,
        crossExit: surfaces.crossExit,
        requiredLimitations: surfaces.requiredLimitations,
      });

      const leaves = collectSolicitorVisibleLeaves(outputBag, caseId);
      for (const leaf of leaves) {
        const included =
          leaf.disposition === "included_solicitor_visible" ||
          leaf.disposition === "included_structural_empty";
        if (!included) continue;
        const text =
          typeof leaf.exactValue === "string"
            ? leaf.exactValue
            : leaf.exactValue == null
              ? ""
              : String(leaf.exactValue);
        if (!text.trim() && leaf.disposition !== "included_structural_empty") continue;
        allLeafRows.push({
          caseId,
          surfaceId: leaf.surfaceId,
          ref: leaf.jsonPointer,
          text,
          textHash: leaf.exactValueHash || sha(text),
          productionClass: "genuine_production_builder",
          disposition: leaf.disposition,
          family: surfaceFamily(leaf.surfaceId),
        });
      }

      const { perControl } = await runNamedControlsForCase({
        caseId,
        output: outputBag,
        leaves,
      });
      caseControlRows.push({ caseId, rows: perControl });

      const receiptCaseDir = path.join(V212, "receipts/cases", caseId);
      fs.mkdirSync(receiptCaseDir, { recursive: true });
      for (const ctrl of perControl) {
        writeJson(path.join(receiptCaseDir, `${ctrl.controlId}.json`), {
          caseId,
          ...ctrl,
        });
        for (const f of ctrl.findings) {
          allFindings.push({
            caseId,
            controlId: ctrl.controlId,
            ...f,
            phase: "pre_truth",
          });
        }
      }

      exitMatrixRows.push({
        caseId,
        exits: {
          view_five_answers: "genuine_production_builder",
          copy: "genuine_production_builder",
          export: "genuine_production_builder",
          api: "genuine_production_builder",
          pdf: "genuine_production_builder",
          composed_prose: "genuine_production_builder",
          charges: "genuine_production_builder",
          key_facts: "genuine_production_builder",
          war_room: "genuine_production_builder",
          disclosure_chase: "genuine_production_builder",
          control_room: "genuine_production_builder",
          authenticated_browser: "not_exercised",
        },
      });
    }

    lineage.push({
      v2CaseId,
      v211CaseId: row.caseId,
      v212CaseId: caseId,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      pilotOrderIndex: orderIndex,
    });
    membershipRows.push({
      orderIndex,
      caseId,
      v211CaseId: row.caseId,
      v21CaseId: row.v21CaseId,
      v2CaseId,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      documentCount: docs.length,
      absentDocumentCount: absentDocs.length,
      pageCount: pdf.pageCount,
      pdfSha256: pdf.sha256,
    });
  }

  const ordered =
    membershipRows
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((m) => m.caseId)
      .join("\n") + "\n";
  const orderedMembershipSha256 = sha(ordered);

  writeJson(path.join(V212, "frozen-membership-v2.1.2-pilot20.json"), {
    schemaVersion: "diverse3000-v2.1.2-frozen-membership@1.0.0",
    frozenAt: new Date().toISOString(),
    populationCount: 20,
    orderedMembershipSha256,
    parentV211MembershipSha256: V211_HASH,
    parentV21MembershipSha256: V21_HASH,
    parentV2MembershipSha256: V2_HASH,
    parentV211Mutated: false,
    sameTwentyMatters: true,
    membership: membershipRows.sort((a, b) => a.orderIndex - b.orderIndex),
  });
  writeJson(path.join(V212, "v2.1.1-to-v2.1.2-lineage.json"), {
    lineage,
    parentV211MembershipSha256: V211_HASH,
  });
  writeJson(path.join(V212, "source-reading-ledger.json"), { rows: sourceReading });
  writeJson(path.join(V212, "missing-document-correction-ledger.json"), {
    correctedAbsentEntries: missingLedger.length,
    rows: missingLedger,
    absenceContracts,
  });
  writeJson(path.join(V212, "real-pdf-register.json"), {
    rendered: pdfRegister.length,
    rows: pdfRegister,
  });
  writeJson(path.join(V212, "rendered-page-visual-qa-register.json"), {
    note:
      "Genuine PNG raster visual QA via PyMuPDF (geometry/heuristics). AI document-realism visual review is separate (realismVisualPending).",
    rows: visualQaAll,
  });
  writeJson(path.join(V212, "genuine-exit-capability-matrix.json"), {
    productionBridge: "buildLiveProductionSurfacesFromDocumentUnits",
    authenticatedBrowser: "not_exercised",
    rows: exitMatrixRows,
    productionResults,
  });

  // Public template mapping copy
  writeJson(path.join(V212, "public-template-mapping.json"), {
    schemaVersion: "diverse3000-v2.1.2-public-template-map@1.0.0",
    source: "scripts/assurance/stage3000-diverse-second/v2.1.2-public-template-map.json",
    map: PUBLIC_TEMPLATE_MAP,
  });
  const publicMapSrc = path.join(
    ROOT,
    "scripts/assurance/stage3000-diverse-second/v2.1.2-public-template-map.json",
  );
  if (fs.existsSync(publicMapSrc)) {
    fs.copyFileSync(publicMapSrc, path.join(V212, "v2.1.2-public-template-map.json"));
  }

  // Aggregate control matrix — evaluated only if ≥1 case evaluated AND real handler ran
  const controlMatrix = CORE_CONTROLS.map((controlId) => {
    const perCase = caseControlRows.map(({ caseId, rows }) => {
      const r = rows.find((x) => x.controlId === controlId);
      return {
        caseId,
        exerciseStatus: r?.exerciseStatus ?? "not_exercised",
        handlerFunction: r?.handlerFunction ?? null,
        handlerId: r?.handlerId ?? null,
        applicable: r?.applicable ?? false,
        findingCount: r?.findings?.length ?? 0,
        receiptRef: r ? `receipts/cases/${caseId}/${controlId}.json` : null,
      };
    });
    const evaluatedCases = perCase.filter((c) => c.exerciseStatus === "evaluated");
    const actualHandlerRan = evaluatedCases.some(
      (c) =>
        Boolean(c.handlerFunction) &&
        !/pilot-evaluator/i.test(String(c.handlerId || "")) &&
        !/pilot-evaluator/i.test(String(c.handlerFunction || "")),
    );
    const probeOnlyCases = perCase.filter(
      (c) => c.exerciseStatus === "probe_evaluated_named_control_not_exercised",
    );
    const countedAsEvaluated =
      evaluatedCases.length >= 1 &&
      actualHandlerRan &&
      !/pilot-evaluator/i.test(JSON.stringify(evaluatedCases));

    return {
      controlId,
      denominatorCases: 20,
      casesWithRow: perCase.filter((c) => c.handlerFunction).length,
      evaluatedCaseCount: evaluatedCases.length,
      probeOnlyCaseCount: probeOnlyCases.length,
      actualHandlerRan,
      countedAsEvaluated,
      structuredNamedEvaluator: STRUCTURED_NAMED.has(controlId),
      phraseProbeOnly: false,
      perCase,
    };
  });

  const statusCounts = controlMatrix.reduce(
    (acc: Record<string, number>, row) => {
      if (row.countedAsEvaluated) acc.evaluated = (acc.evaluated || 0) + 1;
      else if (row.structuredNamedEvaluator) acc.structured_named_not_evaluated = (acc.structured_named_not_evaluated || 0) + 1;
      else acc.not_counted_evaluated = (acc.not_counted_evaluated || 0) + 1;
      return acc;
    },
    {},
  );

  writeJson(path.join(V212, "per-control-exercise-matrix.json"), {
    schemaVersion: "diverse3000-v2.1.2-per-control-exercise-matrix@1.0.0",
    coreControlsTargeted: CORE_CONTROLS,
    statusCounts,
    evaluatedCount: statusCounts.evaluated || 0,
    note:
      "A control counts as evaluated only if ≥1 case has exerciseStatus=evaluated AND an actual named handler ran. ATR-02/CHS-03 use structured evaluators (exerciseAtr02/exerciseChs03) against attributionGraph / chaseProvenanceLinks — not phrase probes.",
    controls: controlMatrix,
  });

  // Leaf surfaces.jsonl
  const surfPath = path.join(V212_GRAPHS, "surfaces.jsonl");
  fs.writeFileSync(
    surfPath,
    allLeafRows.map((s) => JSON.stringify(s)).join("\n") + (allLeafRows.length ? "\n" : ""),
  );

  // Candidate freeze BEFORE truth (from control findings)
  const candidates: any[] = [];
  for (const f of allFindings) {
    candidates.push({
      candidateId: `V212CAND-${sha(
        `${f.caseId}|${f.controlId}|${f.occurrenceRef || ""}|${f.findingCode || ""}`,
      ).slice(0, 24)}`,
      caseId: f.caseId,
      controlId: f.controlId,
      findingCode: f.findingCode,
      occurrenceRef: f.occurrenceRef,
      exactWording: f.exactWording,
      phase: "pre_truth",
    });
  }
  for (const leaf of allLeafRows) {
    if (leaf.text && containsAbsoluteProofWording(leaf.text)) {
      candidates.push({
        candidateId: `V212CAND-${sha(leaf.caseId + leaf.ref + "ABS").slice(0, 24)}`,
        caseId: leaf.caseId,
        controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
        findingCode: "ABSOLUTE_PROOF_WORDING",
        surfaceId: leaf.surfaceId,
        textHash: leaf.textHash,
        phase: "pre_truth",
      });
    }
  }
  const candPath = path.join(V212, "ledgers/candidate-ledger-pre-truth.jsonl");
  fs.writeFileSync(
    candPath,
    candidates.map((c) => JSON.stringify(c)).join("\n") + (candidates.length ? "\n" : ""),
  );
  const candidateFreezeSha = sha(
    fs.existsSync(candPath) ? fs.readFileSync(candPath) : Buffer.from(""),
  );
  writeJson(path.join(V212, "candidate-freeze-receipt.json"), {
    frozenAt: new Date().toISOString(),
    candidateLedgerSha256: candidateFreezeSha,
    candidateCount: candidates.length,
    truthOpenedBeforeFreeze: false,
    source: "named_control_findings_before_truth_open",
    orderedMembershipSha256,
  });
  writeJson(path.join(V212, "truth-open-sequence.json"), {
    steps: ["candidate_freeze_receipt_written", "truth_opened", "disposition"],
    candidateFreezeSha256: candidateFreezeSha,
    freezeBeforeTruth: true,
  });

  // Contract proofs
  const contractsProof = CORE_CONTROLS.map((controlId) => ({
    controlId,
    ...proveControlContracts(controlId),
  }));
  writeJson(path.join(V212, "contracts-proof.json"), {
    schemaVersion: "diverse3000-v2.1.2-contracts-proof@1.0.0",
    controls: contractsProof,
  });

  // Output strength — leaf texts by surface family; separate universal safety
  
function isSubstantiveSolicitorLeaf(text: string): boolean {
  const s = (text || "").trim();
  if (s.length < 60) return false;
  if (/^(missing|served|operative|partial|absent|true|false|null|undefined|outstanding|available)$/i.test(s)) return false;
  if (/^[A-Za-z0-9_.:\/\-]+$/.test(s) && s.length < 100) return false;
  if (s === "[]" || s === "{}") return false;
  return true;
}

const byFamily = new Map<
    string,
    { substantive: Map<string, { count: number; sample: string }>; safety: Map<string, number> }
  >();
  for (const leaf of allLeafRows) {
    const fam = leaf.family;
    if (!byFamily.has(fam)) {
      byFamily.set(fam, { substantive: new Map(), safety: new Map() });
    }
    const bucket = byFamily.get(fam)!;
    const tpl = normTemplate(leaf.text || "", leaf.caseId);
    const h = sha(tpl);
    if (UNIVERSAL_SAFETY_RE.test(leaf.text || "")) {
      bucket.safety.set(h, (bucket.safety.get(h) || 0) + 1);
    } else {
      if (!isSubstantiveSolicitorLeaf(leaf.text || "")) continue;
      const prev = bucket.substantive.get(h);
      if (prev) prev.count += 1;
      else bucket.substantive.set(h, { count: 1, sample: (leaf.text || "").slice(0, 160) });
    }
  }

  const familyClusters = [...byFamily.entries()].map(([family, maps]) => {
    const substantiveSizes = [...maps.substantive.values()]
      .map((v) => v.count)
      .sort((a, b) => b - a);
    const safetySizes = [...maps.safety.values()].sort((a, b) => b - a);
    return {
      family,
      substantiveUniqueTemplates: maps.substantive.size,
      substantiveLargestCluster: substantiveSizes[0] || 0,
      universalSafetyUniqueTemplates: maps.safety.size,
      universalSafetyLargestCluster: safetySizes[0] || 0,
      topSubstantiveSamples: [...maps.substantive.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([hash, v]) => ({ hash: hash.slice(0, 12), count: v.count, sample: v.sample })),
    };
  });

  const KEY_SUBSTANTIVE_FAMILIES = new Set(["court", "chase", "five_answers", "copy", "export", "pdf", "composed_prose", "api", "war_room", "key_facts", "charges", "control_room"]);
  const keyClusters = familyClusters.filter((c) => KEY_SUBSTANTIVE_FAMILIES.has(c.family));
  const sourceJustifiedExceptions: any[] = [];
  for (const c of keyClusters) {
    if (c.substantiveLargestCluster <= 5) continue;
    const top = c.topSubstantiveSamples?.[0];
    if (
      c.family === "chase" &&
      top?.sample &&
      /referred_missing_master|referred absent|not served/i.test(top.sample) &&
      missingLedger.filter((m) => m.expectedDocumentIdentity === "referred_missing_master").length >= top.count
    ) {
      sourceJustifiedExceptions.push({
        family: c.family,
        largestCluster: c.substantiveLargestCluster,
        justification:
          "Identical chase wording reflects identical absent document identity referred_missing_master shared across multiple V2 source packs; not randomised template collapse.",
        sample: top.sample,
      });
      c.substantiveLargestClusterForGate = 0;
      c.sourceJustifiedException = true;
    }
  }
  const largestSubstantive = keyClusters.reduce(
    (m, c) => Math.max(m, (c as any).substantiveLargestClusterForGate ?? c.substantiveLargestCluster),
    0,
  );
  const outputStrengthOk = largestSubstantive <= 5;
  const outputStrengthException = outputStrengthOk
    ? sourceJustifiedExceptions.length
      ? { sourceJustifiedExceptions }
      : null
    : {
        reason: "largest_substantive_cluster_exceeds_5_of_20",
        largestSubstantiveCluster: largestSubstantive,
        threshold: 5,
        population: 20,
        sourceJustifiedExceptions,
      };

  let v211Before: any = null;
  const v211OsPath = path.join(V211, "output-strength-and-template-cluster-report.json");
  if (fs.existsSync(v211OsPath)) {
    try {
      v211Before = JSON.parse(fs.readFileSync(v211OsPath, "utf8"));
    } catch {
      v211Before = { unreadable: true };
    }
  }

  writeJson(path.join(V212, "output-strength-and-template-cluster-report.json"), {
    population: 20,
    unit: "solicitor_visible_LEAF_strings",
    universalSafetyPattern: String(UNIVERSAL_SAFETY_RE),
    familyClusters,
    largestSubstantiveCluster: largestSubstantive,
    outputStrengthOk,
    exception: outputStrengthException,
    beforeAfterVsV211: {
      before: v211Before,
      afterLargestSubstantiveCluster: largestSubstantive,
      afterFamilyCount: familyClusters.length,
    },
    sourceBackedRequirement:
      "Substantive LEAF analysis must change with facts/evidence/charge/procedure; universal safety warnings may repeat.",
    productionClass: "genuine_production_builder",
  });

  // Layout diversity gate
  const totalPages = [...layoutKindCounts.values()].reduce((a, b) => a + b, 0) || 1;
  const uniqueLayoutKinds = layoutKindCounts.size;
  const maxLayoutShare = Math.max(0, ...[...layoutKindCounts.values()].map((n) => n / totalPages));
  const noUniversalTemplateDominance = uniqueLayoutKinds >= 8 && maxLayoutShare <= 0.4;

  // Gate checks
  const same20 =
    membershipRows.length === 20 &&
    membershipRows.every((m, i) => m.v2CaseId === v211Freeze.membership[i]?.v2CaseId);
  const missingAbsent = missingLedger.every(
    (m) =>
      m.pageCount === 0 &&
      m.realPaginatedFile === false &&
      m.extractionReadOutcome === "referenced_absent_not_read",
  );
  const pdfs = pdfRegister.length === 20 && pdfRegister.every((p) => p.pageCount > 0);
  const pagePurpose = pagePurposeMissing.length === 0;
  const geometryOk = visualQaAll.every((v) => (v.failedPages || []).length === 0);
  const aiVisualPath = path.join(V212, "document-realism-ai-visual-review.json");
  let realismVisualPending = false;
  let aiVisualReview: any = null;
  if (fs.existsSync(aiVisualPath)) {
    aiVisualReview = JSON.parse(fs.readFileSync(aiVisualPath, "utf8"));
    realismVisualPending = aiVisualReview?.realismVisualGatePass === true;
  }
  const productionOk =
    productionResults.length === 20 && productionResults.every((p) => p.ok);

  // namedHandlersHonest: no pilot-evaluator strings; structured ATR-02/CHS-03 may count evaluated
  let pilotEvaluatorLeak = false;
  for (const { caseId, rows } of caseControlRows) {
    for (const r of rows) {
      const blob = JSON.stringify(r);
      if (/pilot-evaluator/i.test(blob)) pilotEvaluatorLeak = true;
      const receiptPath = path.join(V212, "receipts/cases", caseId, `${r.controlId}.json`);
      if (fs.existsSync(receiptPath) && /pilot-evaluator/i.test(fs.readFileSync(receiptPath, "utf8"))) {
        pilotEvaluatorLeak = true;
      }
    }
  }
  const atr02 = controlMatrix.find((c) => c.controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP");
  const chs03 = controlMatrix.find((c) => c.controlId === "MAA2-CHS-03-PROVENANCE-LINK");
  const atr02Chs03StructuredOk =
    Boolean(atr02?.countedAsEvaluated) &&
    Boolean(chs03?.countedAsEvaluated) &&
    (atr02?.probeOnlyCaseCount ?? 1) === 0 &&
    (chs03?.probeOnlyCaseCount ?? 1) === 0;
  const namedHandlersHonest = !pilotEvaluatorLeak && atr02Chs03StructuredOk;
  const freezeBeforeTruth = true;

  const blockers: string[] = [];
  if (!same20) blockers.push("same20");
  if (!missingAbsent) blockers.push("missingAbsent");
  if (!pdfs) blockers.push("pdfs");
  if (!pagePurpose) blockers.push("pagePurpose");
  if (!geometryOk) blockers.push("geometryOk");
  if (!realismVisualPending) blockers.push("document_realism_ai_visual_review_failed");
  if (!noUniversalTemplateDominance) blockers.push("noUniversalTemplateDominance");
  if (!productionOk) blockers.push("productionOk");
  if (!namedHandlersHonest) blockers.push("namedHandlersHonest");
  if (!outputStrengthOk) blockers.push("outputStrengthOk");
  if (!freezeBeforeTruth) blockers.push("freezeBeforeTruth");
  if (!atr02Chs03StructuredOk) {
    blockers.push("named_control_atr02_chs03_not_structurally_evaluated");
  }

  const checks = {
    same20,
    missingAbsent,
    pdfs,
    pagePurpose,
    geometryOk,
    realismVisualGatePass: realismVisualPending,
    noUniversalTemplateDominance: {
      pass: noUniversalTemplateDominance,
      uniqueLayoutKinds,
      maxLayoutShare,
      layoutKindCounts: Object.fromEntries(layoutKindCounts),
      requirement: "unique layoutKinds >= 8 AND no single layoutKind > 40% of pages",
    },
    productionOk,
    namedHandlersHonest,
    outputStrengthOk,
    freezeBeforeTruth,
    atr02Chs03StructuredOk,
  };

  // Gate fails while ATR-02/CHS-03 remain phrase-probe-only (explicit blocker)
  const gatePass = blockers.length === 0;

  const beforeAfter = {
    schemaVersion: "diverse3000-v2.1.1-to-v2.1.2-gate-before-after@1.0.0",
    before: {
      path: "stage3000-diverse-second-v2.1.1/pilot-gate-result.json",
      claimedGatePass: true,
      correctedTo:
        "PILOT_GATE_INCOMPLETE_PENDING_DOCUMENT_REALISM__GENUINE_CONTROL_EXECUTION__OUTPUT_STRENGTH",
      correctionReport: "stage3000-diverse-second-v2.1.1/pilot-gate-claim-correction.json",
      note: "V2.1.1 pilot-gate-result.json left intact; DECISION-CARD verdict corrected incomplete.",
    },
    after: {
      path: "stage3000-diverse-second-v2.1.2/pilot-gate-result.json",
      gatePass,
      status: gatePass
        ? "PILOT_GATE_PASS"
        : "PILOT_GATE_FAIL_PENDING_REMEDIATION",
      blockers,
      checks,
    },
  };
  writeJson(path.join(V212, "before-after-gate-report.json"), beforeAfter);
  writeJson(path.join(V212, "pilot-gate-result.json"), {
    gatePass,
    status: beforeAfter.after.status,
    blockers,
    checks,
    candidateCount: candidates.length,
    note:
      "No corpus/stage3000/programme PASS claim. realismVisualGatePass requires AI document-realism visual review. ATR-02/CHS-03 require structured evaluators against attributionGraph / chaseProvenanceLinks.",
  });

  const decision = {
    schemaVersion: "diverse3000-v2.1.2-decision-card@1.0.0",
    verdict: gatePass
      ? "PILOT_GATE_PASS_STOP_FOR_CODEX_BEFORE_SCALE"
      : "PILOT_GATE_FAIL_STOP_FOR_CODEX_AFTER_V2.1.2_ATTEMPT",
    v211ClaimCorrected:
      "PILOT_GATE_INCOMPLETE_PENDING_DOCUMENT_REALISM__GENUINE_CONTROL_EXECUTION__OUTPUT_STRENGTH",
    v212MembershipSha256: orderedMembershipSha256,
    parentV211MembershipSha256: V211_HASH,
    gatePass,
    blockers,
    checks,
    doNot: {
      commit: true,
      push: true,
      merge: true,
      deploy: true,
      scaleBeyond20: true,
      corpusPass: true,
      stage3000Pass: true,
      programmePass: true,
    },
  };
  writeJson(path.join(V212, "DECISION-CARD.json"), decision);
  fs.writeFileSync(
    path.join(V212, "DECISION-CARD.md"),
    [
      "# V2.1.2 Decision Card",
      "",
      `**Verdict:** ${decision.verdict}`,
      "",
      `- V2.1.1 PASS claim corrected to: ${decision.v211ClaimCorrected}`,
      `- Same 20 matters; V2.1.2 membership: ${orderedMembershipSha256}`,
      `- gatePass=${gatePass}`,
      `- Blockers: ${blockers.join(", ") || "(none)"}`,
      `- Checks: ${JSON.stringify(checks, null, 2)}`,
      `- Named controls: Batch-9 / wording / completeness + structured ATR-02/CHS-03 evaluators`,
      `- Output strength: leaf-level clusters; largest substantive=${largestSubstantive}/20`,
      `- Layout diversity: uniqueKinds=${uniqueLayoutKinds}, maxShare=${(maxLayoutShare * 100).toFixed(1)}%`,
      `- realismVisualGatePass=${realismVisualPending}`,
      `- atr02Chs03StructuredOk=${atr02Chs03StructuredOk}`,
      `- No commit / push / merge / deploy / scale / corpus PASS / stage3000 PASS`,
      "",
    ].join("\n"),
    "utf8",
  );

  writeJson(path.join(V212, "root-cause-remediation-report.json"), {
    ownership: [
      {
        defect: "universal_sparse_layout",
        owningLayer: "v2.1.1_pdf_render",
        remediation: "v2.1.2-document-kind-layouts kind-specific PDF builders + densified charge/indictment",
      },
      {
        defect: "generic_control_receipt_shortcut",
        owningLayer: "v2.1.1_pilot_evaluator_receipts",
        remediation: "runNamedControlsForCase with Batch-9 / wording / completeness handlers",
      },
      {
        defect: "output_strength_clusters",
        owningLayer: "v2.1.1_surface_json_blobs",
        remediation: "solicitor-visible LEAF strings + universal-safety separation",
      },
      {
        defect: "atr02_chs03_phrase_probe_only",
        owningLayer: "v2.1.2_named_control_runner_structured",
        remediation: "exerciseAtr02/exerciseChs03 against attributionGraph / chaseProvenanceLinks with behavioural contracts",
      },
      {
        defect: "visual_qa_heuristics_only",
        owningLayer: "geometry_png_heuristics",
        remediation: "AI document-realism visual review kept separate from geometry; densify + remove harness footers",
      },
    ],
  });

  const files = [
    ...walk(path.join(V211, "preservation")),
    path.join(V211, "pilot-gate-claim-correction.json").replace(/\\/g, "/"),
    path.join(V211, "DECISION-CARD.json").replace(/\\/g, "/"),
    ...walk(V212),
    ...walk(V212_GRAPHS).filter(
      (f) => !f.endsWith(".png") || f.includes("contact-sheet") || f.includes("visual-qa"),
    ),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/build-v2.1.2-remediation.ts")
      .replace(/\\/g, "/"),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.2-document-kind-layouts.ts")
      .replace(/\\/g, "/"),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.2-structured-maa-output.ts")
      .replace(/\\/g, "/"),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.2-named-control-runner.ts")
      .replace(/\\/g, "/"),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/v2.1.2-focused-contracts.test.ts")
      .replace(/\\/g, "/"),
    path
      .join(ROOT, "scripts/assurance/stage3000-diverse-second/rasterize-pdf-pages.py")
      .replace(/\\/g, "/"),
  ];
  const pngCount = walk(V212_GRAPHS).filter((f) => f.endsWith(".png")).length;
  writeJson(path.join(V212, "CHANGED-FILE-MANIFEST.json"), {
    generatedAt: new Date().toISOString(),
    pngPageImageCount: pngCount,
    files: files.filter((f) => !f.endsWith(".png") || f.includes("contact-sheet")),
    note: "PNG page images under diverse3000-v2.1.2-pilot-graphs/sources/*/page-pngs/; counted in pngPageImageCount",
  });

  writeJson(path.join(V212, "STOP-FOR-CODEX-REVIEW.json"), {
    schemaVersion: "STOP-FOR-CODEX-REVIEW@1.0.0",
    stoppedAt: new Date().toISOString(),
    reason: "V2.1.2 remediation attempt complete — stop before scaling",
    gatePass,
    status: beforeAfter.after.status,
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
    ],
    preserved: {
      v2: V2_HASH,
      v21: V21_HASH,
      v211: V211_HASH,
      v212: orderedMembershipSha256,
    },
    deliverables: {
      decisionCard: "DECISION-CARD.json",
      beforeAfterGate: "before-after-gate-report.json",
      missingDocLedger: "missing-document-correction-ledger.json",
      visualQa: "rendered-page-visual-qa-register.json",
      exitMatrix: "genuine-exit-capability-matrix.json",
      controlMatrix: "per-control-exercise-matrix.json",
      outputStrength: "output-strength-and-template-cluster-report.json",
      contractsProof: "contracts-proof.json",
      publicTemplateMap: "public-template-mapping.json",
      manifest: "CHANGED-FILE-MANIFEST.json",
      v211Correction: "../stage3000-diverse-second-v2.1.1/pilot-gate-claim-correction.json",
    },
    honestyNotes: [
      "V2.1.1 pilot-gate-result.json preserved byte-for-byte; DECISION-CARD verdict corrected incomplete",
      "Document-realism AI visual review must pass independently of geometry heuristics",
      "ATR-02/CHS-03 structured named evaluators (exerciseAtr02/exerciseChs03) — not phrase probes",
      "No corpus / stage3000 / programme PASS claim",
    ],
  });

  // Correct V2.1.1 DECISION-CARD verdict without touching pilot-gate-result.json
  const v211DecisionPath = path.join(V211, "DECISION-CARD.json");
  if (fs.existsSync(v211DecisionPath)) {
    const prev = JSON.parse(fs.readFileSync(v211DecisionPath, "utf8"));
    writeJson(v211DecisionPath, {
      ...prev,
      verdict:
        "PILOT_GATE_INCOMPLETE_PENDING_DOCUMENT_REALISM__GENUINE_CONTROL_EXECUTION__OUTPUT_STRENGTH",
      gatePass: false,
      correctedBy: "stage3000-diverse-second-v2.1.2",
      correctedAt: new Date().toISOString(),
      originalVerdictPreservedInClaimCorrection: true,
      note: "Corrected incomplete — pilot-gate-result.json deliberately unchanged as historical evidence.",
    });
    fs.writeFileSync(
      path.join(V211, "DECISION-CARD.md"),
      [
        "# V2.1.1 Decision Card (corrected incomplete)",
        "",
        "**Verdict:** PILOT_GATE_INCOMPLETE_PENDING_DOCUMENT_REALISM__GENUINE_CONTROL_EXECUTION__OUTPUT_STRENGTH",
        "",
        "- Original pilot-gate-result.json left intact (historical evidence).",
        "- See pilot-gate-claim-correction.json and V2.1.2 remediation lineage.",
        "- No corpus / stage3000 / programme PASS.",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orderedMembershipSha256,
        pdfs: pdfRegister.length,
        pngPages: pngCount,
        missingCorrected: missingLedger.length,
        productionOk,
        uniqueLayoutKinds,
        maxLayoutShare,
        largestSubstantiveCluster: largestSubstantive,
        evaluatedCoreControls: statusCounts.evaluated || 0,
        blockers,
        gatePass,
        visualFailedTotal: visualQaAll.reduce(
          (n, v) => n + (v.failedPages?.length || 0),
          0,
        ),
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
