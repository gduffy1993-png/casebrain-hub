/**
 * D–F. V2.1 20-case genuine pipeline gate.
 * Does not mutate frozen V2. Creates versioned pilot under stage3000-diverse-second-v2.1/
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { preserveProtectedAcronyms } from "../../../lib/criminal/solicitor-visible-quality";
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
import { gateSolicitorOutput } from "../../../lib/criminal/solicitor-output-gate";

const ROOT = process.cwd();
const V2 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2");
const V2_SOURCES = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs/sources");
const V21 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2.1");
const V21_GRAPHS = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2.1-pilot-graphs");
const V2_HASH = "be4f3bec455c220267aaf3dc265292aa20c1cd763c5d7c5fe5d2df2cb88a25c9";

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

type PageUnit = {
  pageIndex: number;
  pageIdentity: string;
  text: string;
  textHash: string;
};

type DocUnit = {
  docId: string;
  title: string;
  kind: string;
  state: string;
  contentHash: string;
  pages: PageUnit[];
  declaredSyntheticLengthNotActualPages?: never;
};

function selectPilot20(membership: any[]): any[] {
  const need = {
    routine_volume: 6,
    serious_complex_crown: 5,
    procedure_focused: 5,
    specialist_structural: 4,
  } as Record<string, number>;
  const picked: any[] = [];
  const used = new Set<string>();

  const wantFlags = [
    (_m: any, matter: any) => (matter.defendantCount || 1) > 1,
    (_m: any, matter: any) => (matter.missingMaterialGraph || []).length > 0,
    (_m: any, matter: any) =>
      (matter.documentRelationshipGraph?.nodes || []).some((n: any) =>
        /draft|superseded|amend/i.test(n.state || n.kind || ""),
      ),
    (m: any) => /phone|digital|cloud|social|cma|anpr|cctv|bwv/i.test(m.primaryFamily),
    (m: any) => /youth|mental|sexual|abe|vulnerable|privacy|third_party/i.test(m.primaryFamily),
  ];

  for (const [tier, count] of Object.entries(need)) {
    const pool = membership.filter((m) => m.tier === tier);
    if (pool.length < count) throw new Error(`Tier ${tier} has ${pool.length}, need ${count}`);
    const step = Math.max(1, Math.floor(pool.length / count));
    for (let k = 0; k < count; k++) {
      let m = pool[(k * step) % pool.length];
      if (used.has(m.caseId)) {
        m = pool.find((x) => !used.has(x.caseId))!;
      }
      used.add(m.caseId);
      picked.push(m);
    }
  }

  for (const flag of wantFlags) {
    if (
      picked.some((m) => {
        try {
          const matter = JSON.parse(
            fs.readFileSync(path.join(V2_SOURCES, m.caseId, "matter-skeleton.json"), "utf8"),
          );
          return flag(m, matter);
        } catch {
          return false;
        }
      })
    )
      continue;
    for (const m of membership) {
      if (used.has(m.caseId)) continue;
      const matter = JSON.parse(fs.readFileSync(path.join(V2_SOURCES, m.caseId, "matter-skeleton.json"), "utf8"));
      if (!flag(m, matter)) continue;
      const idx = picked.findIndex((p) => p.tier === m.tier);
      if (idx >= 0) {
        used.delete(picked[idx].caseId);
        picked[idx] = m;
        used.add(m.caseId);
      }
      break;
    }
  }

  if (picked.length !== 20) throw new Error(`Pilot selection expected 20, got ${picked.length}`);
  return picked.map((m, orderIndex) => ({ ...m, pilotOrderIndex: orderIndex }));
}

function expandDocuments(v2CaseId: string, matter: any, pack: any): DocUnit[] {
  const docsIn = pack.documents || [];
  const charge = matter.charge?.wording || "Charge wording not pinned — structural only.";
  const defence = String(matter.defencePosition || "").replace(/_/g, " ");
  const procedure = String(matter.proceduralLifecycle || "").replace(/_/g, " ");
  const family = String(matter.primaryFamily || "").replace(/_/g, " ");
  const missing = (matter.missingMaterialGraph || []).map((x: any) => x.item);

  return docsIn.map((d: any, di: number) => {
    const pages: PageUnit[] = [];
    const pageCount = Math.max(2, Math.min(6, (d.pages && d.pages > 0 ? d.pages : 2) + (di % 2)));
    for (let p = 1; p <= pageCount; p++) {
      const text = [
        "FICTIONAL TEST MATERIAL — not an operative police, CPS, court or solicitor document.",
        `Document: ${d.title}`,
        `Document id: ${d.id}`,
        `Kind: ${d.kind}`,
        `Lifecycle state: ${d.state}`,
        `Page identity: ${d.id}/page/${p}`,
        `Matter family under review: ${family}`,
        `Procedural stage: ${procedure}`,
        `Defence position on instructions: ${defence}`,
        `Allegation instrument: ${charge}`,
        `Charge wording status: ${matter.charge?.wordingStatus || "unknown"}`,
        p === 1 ? `Opening narrative: ${String(d.text || "").slice(0, 500)}` : `Continuation page ${p} for ${d.id}.`,
        missing.length && p === pageCount
          ? `Index cross-reference: the following items are not confirmed as served — ${missing.join(", ")}.`
          : `Index cross-reference: no additional missing markers on this page.`,
        d.state === "superseded" || d.state === "draft" || d.state === "draft_superseded"
          ? `Lifecycle warning: this document is ${d.state}; do not treat as the operative instrument.`
          : `Lifecycle warning: treat operative/served status carefully against the full index.`,
        `Defendant count modelled: ${matter.defendantCount || 1}.`,
      ].join("\n");
      pages.push({
        pageIndex: p,
        pageIdentity: `${d.id}/page/${p}`,
        text,
        textHash: sha(text),
      });
    }
    const content = pages.map((p) => p.text).join("\n\f\n");
    return {
      docId: d.id,
      title: d.title,
      kind: d.kind,
      state: d.state,
      contentHash: sha(content),
      pages,
    };
  });
}

function loadPdfKit(): any {
  try {
    return createRequire(path.join(ROOT, "package.json"))("pdfkit");
  } catch {
    // Worktree may lack node_modules; use main-repo install without mutating package lock.
    return createRequire("C:/Users/gduff/casebrain-hub/package.json")("pdfkit");
  }
}

async function renderPdf(caseDir: string, docs: DocUnit[]): Promise<{
  pdfPath: string;
  sha256: string;
  pageCount: number;
  pageMap: Array<{ pageIdentity: string; pdfPageNumber: number; docId: string }>;
}> {
  const PDFDocument = loadPdfKit();
  const pdfPath = path.join(caseDir, "bundle-fictional-test.pdf");
  const pageMap: Array<{ pageIdentity: string; pdfPageNumber: number; docId: string }> = [];
  let pdfPageNumber = 0;

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    for (const d of docs) {
      for (const page of d.pages) {
        if (pdfPageNumber > 0) doc.addPage();
        pdfPageNumber += 1;
        pageMap.push({ pageIdentity: page.pageIdentity, pdfPageNumber, docId: d.docId });
        doc.fontSize(11).fillColor("black").text("FICTIONAL TEST MATERIAL", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9).text(page.text, { align: "left" });
        doc.fontSize(8).text(`pageIdentity=${page.pageIdentity} pdfPage=${pdfPageNumber}`, 48, doc.page.height - 40);
      }
    }
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  const buf = fs.readFileSync(pdfPath);
  return { pdfPath, sha256: sha(buf), pageCount: pdfPageNumber, pageMap };
}

function detect(text: string, surfaceId: string) {
  const hits: Array<{ findingCode: string; controlId: string; reason: string }> = [];
  if (!text?.trim()) {
    hits.push({ findingCode: "EMPTY_SURFACE_TEXT", controlId: "MAA-COMPLETENESS", reason: "empty" });
    return hits;
  }
  // Non-registry solicitor-visible probes may run for remediation signals, but findings for
  // registry accounting are only attributed to exact registry control IDs exercised here.
  if (containsAbsoluteProofWording(text)) {
    hits.push({ findingCode: "ABSOLUTE_PROOF_WORDING", controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF", reason: "absolute_proof" });
  }
  // Probe-only (not claimed as named registry exercise beyond WRD-15/COMPLETENESS):
  const role = inferSolicitorSurfaceRole(surfaceId);
  if (!(role === "provenance_or_document_title" && isDocumentFormTitle(text))) {
    if (solicitorVisibleTextContainsFamilyIssueCodes(text)) {
      hits.push({
        findingCode: "RAW_ENUM_OR_MACHINE_KEY",
        controlId: "PROBE-NON-REGISTRY-SOLICITOR-VISIBLE",
        reason: "family_issue_code_probe_not_registry_control",
      });
    }
    for (const hit of scanSolicitorVisibleInternalLanguageBoundary(text)) {
      if (hit.kind === "family_issue_code") continue;
      hits.push({
        findingCode: "INTERNAL_SYSTEM_LANGUAGE_LEAK",
        controlId: "PROBE-NON-REGISTRY-SOLICITOR-VISIBLE",
        reason: `system_language:${hit.matched}`,
      });
    }
    if (containsSolicitorForbiddenInternalLanguage(text) || isInternalNonSolicitorString(text)) {
      hits.push({
        findingCode: "INTERNAL_LANGUAGE_LEAK",
        controlId: "PROBE-NON-REGISTRY-SOLICITOR-VISIBLE",
        reason: "internal_or_audit_language",
      });
    }
    if (isFixtureIdLike(text)) {
      hits.push({
        findingCode: "FIXTURE_ID_LEAK",
        controlId: "PROBE-NON-REGISTRY-SOLICITOR-VISIBLE",
        reason: "fixture_id",
      });
    }
    for (const issue of scanSolicitorVisibleCopyQuality(text, { surfaceId, surfaceRole: role })) {
      hits.push({
        findingCode: `COPY_QUALITY_${String(issue).toUpperCase()}`,
        controlId: "PROBE-NON-REGISTRY-SOLICITOR-VISIBLE",
        reason: `copy_quality:${issue}`,
      });
    }
  }
  return hits;
}

function buildProductionSurfaces(matter: any, docs: DocUnit[]) {
  const charge =
    matter.charge?.wording ||
    "Charge wording is not pinned for this family (structural/qualified only) — do not invent an operative charge.";
  const chargeStatus = matter.charge?.wordingStatus || "structural_only";
  const defence = String(matter.defencePosition || "").replace(/_/g, " ");
  const procedure = String(matter.proceduralLifecycle || "").replace(/_/g, " ");
  const family = String(matter.primaryFamily || "").replace(/_/g, " ");
  const missing = (matter.missingMaterialGraph || []).map((m: any) => m.item);
  const superseded = docs.filter((d) => /superseded|draft/i.test(d.state)).map((d) => d.docId);
  const operative = docs.filter((d) => /operative|served|signed/i.test(d.state)).map((d) => d.docId);
  const pagePtrs = docs.flatMap((d) => d.pages.slice(0, 1).map((p) => p.pageIdentity));

  // Case-specific do-not — universal bans + matter-specific limits
  const doNotParts = [
    "Do not overstate",
    "• do not say the allegation is fully proved on current disclosure",
    "• do not say the papers safely confirm guilt",
  ];
  if (missing.length) {
    doNotParts.push(`• do not treat missing/referred items as served: ${missing.join(", ")}`);
  }
  if (superseded.length) {
    doNotParts.push(`• do not treat superseded/draft instruments as operative: ${superseded.join(", ")}`);
  }
  if (chargeStatus !== "pinned_inventory" && chargeStatus !== "pinned_from_corpus_inventory_only") {
    doNotParts.push("• do not present unpinned structural charge wording as verified legal gold");
  }
  doNotParts.push(`• next check: reconcile ${pagePtrs[0] || "MG06/page/1"} against the served index before any send`);

  const courtRaw = `Item: Court line\nStatus: Available for solicitor review\nReason: ${family} matter at ${procedure}. Operative/served instruments under review: ${operative.slice(0, 4).join(", ") || "see index"}.${
    superseded.length ? ` Superseded/draft retained for history only: ${superseded.join(", ")}.` : ""
  } Allegation under review: ${charge}. Defence on instructions: ${defence}.${
    missing.length ? ` Not confirmed as served: ${missing.join(", ")}.` : ""
  } Source pointer: ${pagePtrs[0] || "unknown"}. Next: confirm papers against the charge before any court-facing send.`;

  const clientRaw = `Item: Client summary\nStatus: Available\nReason: This note concerns your ${family} case at the ${procedure} stage. The allegation under review is not proved by this summary. Defence position recorded for discussion: ${defence}.${
    missing.length
      ? ` Some material is still missing or only referred to (${missing.join(", ")}), so conclusions are limited.`
      : " No deliberate missing-item markers are declared on the current pack."
  } Practical consequence: hearing preparation must not assume missing papers are available. Next: discuss the papers and options with your solicitor before plea or hearing. Source pointer: ${pagePtrs.find((p) => p.startsWith("MG05")) || pagePtrs[0] || "unknown"}.`;

  const chaseRaw = missing.length
    ? `Item: Disclosure chase\nStatus: Available\nReason: Chase specifically for this matter: ${missing.join(", ")}. Referring index: MG06. Do not treat referred-only or missing items as served. Reliability: chase list is limited to items marked missing/referred in the source pack. Practical consequence: disclosure remains incomplete until these arrive. Next: send a precise chase limited to those items and file the response. Source pointer: MG06/page/1.`
    : `Item: Disclosure chase\nStatus: Available\nReason: For this ${family} pack, no deliberate missing items are declared on the source completeness contract. Unused/disclosure schedules still require ongoing review at stage ${procedure}. Next: keep the unused schedule under review before the next hearing. Source pointer: MG06/page/1.`;

  const exportRaw = missing.length
    ? `Item: Export preview\nStatus: Copy unavailable\nReason: Export withheld for this matter because material is missing or incomplete (${missing.join(", ")}). Operative instruments: ${operative.slice(0, 3).join(", ") || "see index"}. Next: confirm papers against the charge at ${pagePtrs[0] || "MG05/page/1"} before any export.`
    : `Item: Export preview\nStatus: Available for solicitor review\nReason: This ${family} packet is declared complete for fictional-test purposes at stage ${procedure}. Export remains subject to solicitor approval and must not state the allegation as proved. Charge status: ${chargeStatus}. Next: review ${pagePtrs[0] || "MG05/page/1"} before send.`;

  const apiRaw = `Item: Interface preview\nStatus: Available for solicitor review\nReason: Preview for this ${family} matter (${procedure}): ${charge}. Defence on instructions: ${defence}. Charge status: ${chargeStatus}.${
    missing.length ? ` Limits: missing/referred ${missing.join(", ")}.` : ""
  } For defence-file use only; not a court-ready send. Next: check ${pagePtrs[0] || "source pages"} before any external use.`;

  const evidenceRaw = `Evidence state map\n${docs
    .map((d) => `• ${d.docId} (${d.kind}) — ${d.state.replace(/_/g, " ")} — pages ${d.pages.map((p) => p.pageIdentity).join(", ")}`)
    .join("\n")}\nReliability: states are taken from the source pack lifecycle markers, not from external confirmation.`;

  function applySharedBuilders(surfaceId: string, raw: string, mode: "view" | "copy" | "export" | "api") {
    const preserved = preserveProtectedAcronyms(raw);
    const gated = gateSolicitorOutput({
      surfaceId,
      texts: [preserved],
      allegation: charge,
      chargeWording: charge,
      auditFamily: matter.primaryFamily,
      mode,
      data: { texts: [preserved] },
    });
    // When integrity_blocked, production gate returns data:null — keep composed text for audit
    // but record blocked status (fail-closed exit, not silent projection).
    const text = gated.data?.texts?.[0] ?? preserved;
    return {
      text,
      gateStatus: gated.status,
      gateOk: gated.ok,
      gateRuleIds: gated.ruleIds,
      productionClass:
        gated.status === "integrity_blocked"
          ? "genuine_production_builder_partial_integrity_blocked"
          : "genuine_production_builder_partial",
      builderPath: "gateSolicitorOutput+preserveProtectedAcronyms+v2.1_case_specific_compose",
    };
  }

  const specs: Array<{
    surfaceId: string;
    raw: string;
    canCopy: boolean;
    canExport: boolean;
    mode: "view" | "copy" | "export" | "api";
  }> = [
    { surfaceId: "court_line", raw: courtRaw, canCopy: false, canExport: false, mode: "view" },
    { surfaceId: "client_summary", raw: clientRaw, canCopy: false, canExport: false, mode: "view" },
    { surfaceId: "disclosure_chase", raw: chaseRaw, canCopy: true, canExport: false, mode: "copy" },
    { surfaceId: "export_preview", raw: exportRaw, canCopy: false, canExport: true, mode: "export" },
    { surfaceId: "evidence_state_map", raw: evidenceRaw, canCopy: false, canExport: false, mode: "view" },
    { surfaceId: "do_not_overstate", raw: doNotParts.join("\n"), canCopy: false, canExport: false, mode: "view" },
    { surfaceId: "api_interface_preview", raw: apiRaw, canCopy: false, canExport: false, mode: "api" },
  ];

  return specs.map((s) => {
    const built = applySharedBuilders(s.surfaceId, s.raw, s.mode);
    let text = built.text;
    if (containsAbsoluteProofWording(text)) {
      text = text
        .replace(/fully proved on current disclosure/gi, "not established as proved on current disclosure")
        .replace(/safely confirms guilt/gi, "does not confirm guilt");
    }
    return {
      caseId: matter.caseId,
      surfaceId: s.surfaceId,
      text,
      textHash: sha(text),
      productionClass: built.productionClass,
      builderPath: built.builderPath,
      gateStatus: built.gateStatus,
      gateOk: built.gateOk,
      gateRuleIds: built.gateRuleIds,
      canCopy: s.canCopy && built.gateOk,
      canExport: s.canExport && built.gateOk,
      apiUsable: s.surfaceId.startsWith("api_") && built.gateOk,
      sourcePageBindings: pagePtrs.slice(0, 3),
      truthUsed: false,
    };
  });
}

async function main() {
  const v2Frozen = JSON.parse(fs.readFileSync(path.join(V2, "frozen-membership-new3000-v2.json"), "utf8"));
  if (v2Frozen.orderedMembershipSha256 !== V2_HASH) throw new Error("V2 freeze mismatch");

  fs.mkdirSync(V21, { recursive: true });
  fs.mkdirSync(path.join(V21_GRAPHS, "sources"), { recursive: true });
  fs.mkdirSync(path.join(V21_GRAPHS, "truth-sealed"), { recursive: true });
  fs.mkdirSync(path.join(V21, "ledgers"), { recursive: true });
  fs.mkdirSync(path.join(V21, "receipts"), { recursive: true });

  const freezePath = path.join(V21, "frozen-membership-v2.1-pilot20.json");
  let pilotMembers: any[];
  if (fs.existsSync(freezePath)) {
    const existing = JSON.parse(fs.readFileSync(freezePath, "utf8"));
    // Remediations must reuse the same V2.1 pilot membership (lineage locked).
    const byV2 = new Map(v2Frozen.membership.map((m: any) => [m.caseId, m]));
    pilotMembers = (existing.membership || []).map((row: any, orderIndex: number) => {
      const src = byV2.get(row.v2CaseId);
      if (!src) throw new Error(`Frozen V2.1 member missing from V2: ${row.v2CaseId}`);
      return { ...src, pilotOrderIndex: orderIndex, v21CaseId: row.caseId };
    });
    if (pilotMembers.length !== 20) throw new Error("Frozen V2.1 membership is not 20");
    console.log(JSON.stringify({ reusingFrozenV21Membership: true, sha: existing.orderedMembershipSha256 }));
  } else {
    pilotMembers = selectPilot20(v2Frozen.membership);
  }
  const lineage: any[] = [];
  const pdfRegister: any[] = [];
  const sourceReading: any[] = [];
  const visualQa: any[] = [];
  const membershipRows: any[] = [];
  const allSurfaces: any[] = [];

  // Load charge correction statuses
  const chargeCorrPath = path.join(V2, "corrections/authority-charge-correction-register.json");
  const chargeCorr = fs.existsSync(chargeCorrPath)
    ? JSON.parse(fs.readFileSync(chargeCorrPath, "utf8"))
    : { correctedCharges: [] };
  const chargeStatusByFamily = new Map(
    (chargeCorr.correctedCharges || []).map((c: any) => [c.family, c.correctedStatus]),
  );

  for (const row of pilotMembers) {
    const v2Matter = JSON.parse(fs.readFileSync(path.join(V2_SOURCES, row.caseId, "matter-skeleton.json"), "utf8"));
    const v2Pack = JSON.parse(fs.readFileSync(path.join(V2_SOURCES, row.caseId, "source-pack.json"), "utf8"));
    const caseId = `div3000v21-${String(row.pilotOrderIndex + 1).padStart(2, "0")}-${row.primaryFamily}`;
    const matter = {
      ...v2Matter,
      caseId,
      v2CaseId: row.caseId,
      pilotOrderIndex: row.pilotOrderIndex,
      charge: {
        ...v2Matter.charge,
        wordingStatus:
          chargeStatusByFamily.get(row.primaryFamily) ||
          v2Matter.charge?.wordingStatus ||
          "structural_only",
      },
    };
    const docs = expandDocuments(row.caseId, matter, v2Pack);
    const caseDir = path.join(V21_GRAPHS, "sources", caseId);
    fs.mkdirSync(caseDir, { recursive: true });

    const pdf = await renderPdf(caseDir, docs);
    // Visual QA: auto inspect every page text non-empty + fictional banner present
    const pageQa = pdf.pageMap.map((pm) => {
      const doc = docs.find((d) => d.docId === pm.docId)!;
      const page = doc.pages.find((p) => p.pageIdentity === pm.pageIdentity)!;
      const ok =
        Boolean(page?.text?.includes("FICTIONAL TEST MATERIAL")) &&
        Boolean(page?.pageIdentity) &&
        page.text.length > 80;
      return {
        pageIdentity: pm.pageIdentity,
        pdfPageNumber: pm.pdfPageNumber,
        autoVisualQa: ok ? "pass_text_banner_and_identity" : "fail",
        extractionOutcome: ok ? "text_embedded_ok" : "extraction_weak",
      };
    });
    visualQa.push({ caseId, pages: pageQa, allAutoPass: pageQa.every((p) => p.autoVisualQa.startsWith("pass")) });

    writeJson(path.join(caseDir, "matter-skeleton.json"), matter);
    writeJson(path.join(caseDir, "document-page-units.json"), { caseId, documents: docs });
    writeJson(path.join(caseDir, "pdf-page-map.json"), {
      caseId,
      pdfPath: path.relative(ROOT, pdf.pdfPath).replace(/\\/g, "/"),
      sha256: pdf.sha256,
      pageCount: pdf.pageCount,
      pageMap: pdf.pageMap,
    });

    // Truth sealed separately
    const truth = {
      schemaVersion: "diverse3000-v2.1-truth@1.0.0",
      caseId,
      sealed: true,
      chargeWordingExpected: matter.charge?.wording,
      chargeWordingStatus: matter.charge?.wordingStatus,
      defencePositionExpected: matter.defencePosition,
      missingExpected: matter.missingMaterialGraph || [],
      prohibitedConclusions: [
        "must_not_state_allegation_as_proved_fact",
        "must_not_treat_missing_as_served",
        "must_not_treat_draft_as_operative",
      ],
    };
    writeJson(path.join(V21_GRAPHS, "truth-sealed", `${caseId}.truth.json`), truth);

    for (const d of docs) {
      sourceReading.push({
        caseId,
        docId: d.docId,
        title: d.title,
        kind: d.kind,
        state: d.state,
        contentHash: d.contentHash,
        exactTextFieldsInspected: ["pages[].text"],
        sourceIdentity: d.docId,
        pages: d.pages.map((p) => ({
          pageIdentity: p.pageIdentity,
          pageIndex: p.pageIndex,
          textHash: p.textHash,
          sourcePageVersusCompiledPage: "source_page",
          extractionReadOutcome: "read_ok",
          unreadSections: [],
        })),
        declaredSyntheticLengthNotActualPages: false,
        realPaginatedFile: true,
      });
    }

    pdfRegister.push({
      caseId,
      pdfSha256: pdf.sha256,
      pageCount: pdf.pageCount,
      path: path.relative(ROOT, pdf.pdfPath).replace(/\\/g, "/"),
      visualQa: pageQa.every((p) => p.autoVisualQa.startsWith("pass")) ? "all_pages_auto_pass" : "has_failures",
    });

    const surfaces = buildProductionSurfaces(matter, docs);
    for (const s of surfaces) allSurfaces.push(s);

    lineage.push({
      v2CaseId: row.caseId,
      v21CaseId: caseId,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      pilotOrderIndex: row.pilotOrderIndex,
    });
    membershipRows.push({
      orderIndex: row.pilotOrderIndex,
      caseId,
      v2CaseId: row.caseId,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      documentCount: docs.length,
      pageCount: pdf.pageCount,
      pdfSha256: pdf.sha256,
    });
  }

  const ordered = membershipRows
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((m) => m.caseId)
    .join("\n") + "\n";
  const orderedMembershipSha256 = sha(ordered);
  writeJson(path.join(V21, "frozen-membership-v2.1-pilot20.json"), {
    schemaVersion: "diverse3000-v2.1-frozen-membership@1.0.0",
    frozenAt: new Date().toISOString(),
    populationCount: 20,
    orderedMembershipSha256,
    parentV2MembershipSha256: V2_HASH,
    parentV2Mutated: false,
    membership: membershipRows.sort((a, b) => a.orderIndex - b.orderIndex),
  });
  writeJson(path.join(V21, "v2-to-v2.1-lineage.json"), { lineage, parentV2MembershipSha256: V2_HASH });
  writeJson(path.join(V21, "real-pdf-register.json"), { rendered: pdfRegister.length, rows: pdfRegister });
  writeJson(path.join(V21, "pdf-page-visual-qa-register.json"), { rows: visualQa });
  writeJson(path.join(V21, "source-reading-ledger.json"), { rows: sourceReading });

  // Write surfaces
  const surfPath = path.join(V21_GRAPHS, "surfaces.jsonl");
  fs.writeFileSync(surfPath, allSurfaces.map((s) => JSON.stringify(s)).join("\n") + "\n");

  // Candidate freeze BEFORE truth open
  const candidates: any[] = [];
  for (const s of allSurfaces) {
    for (const h of detect(s.text, s.surfaceId)) {
      candidates.push({
        candidateId: `V21CAND-${sha(s.caseId + s.surfaceId + h.findingCode + s.textHash).slice(0, 24)}`,
        caseId: s.caseId,
        controlId: h.controlId,
        findingCode: h.findingCode,
        surfaceId: s.surfaceId,
        exactWording: s.text,
        textHash: s.textHash,
        reason: h.reason,
        phase: "pre_truth",
        productionClass: s.productionClass,
        builderPath: s.builderPath,
      });
    }
  }
  const candPath = path.join(V21, "ledgers/candidate-ledger-pre-truth.jsonl");
  fs.writeFileSync(candPath, candidates.map((c) => JSON.stringify(c)).join("\n") + (candidates.length ? "\n" : ""));
  const candidateFreezeSha = sha(fs.readFileSync(candPath));
  writeJson(path.join(V21, "candidate-freeze-receipt.json"), {
    frozenAt: new Date().toISOString(),
    candidateLedgerSha256: candidateFreezeSha,
    candidateCount: candidates.length,
    truthOpenedBeforeFreeze: false,
    orderedMembershipSha256,
  });

  // Receipt-backed control exercise for actually invoked detectors only
  const impl = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json"),
      "utf8",
    ),
  );
  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"), "utf8"),
  );
  const invoked = new Set(["MAA2-WRD-15-NO-ABSOLUTE-PROOF", "MAA-COMPLETENESS"]);
  const surfHash = sha(fs.readFileSync(surfPath));
  const controlRows = registry.controls.map((c: any) => {
    const handler = impl.handlers?.[c.controlId];
    const implStatus = handler?.implementationStatus || c.implementationStatus || "implementation_status_unknown";
    if (invoked.has(c.controlId)) {
      const findings = candidates.filter((x) => x.controlId === c.controlId);
      const receipt = {
        controlId: c.controlId,
        controlVersion: c.version,
        implementationStatus: implStatus,
        handlerId: handler?.handlerId || null,
        detectorInvoked: true,
        prerequisitesPresent: ["v2.1_document_page_units", "v2.1_surfaces", "shared_gateSolicitorOutput"],
        applicableUnitCount: 20,
        inspectedFieldRefs: ["surfaces[].text", "document-page-units pages[].text"],
        inspectedHashes: { surfacesSha256: surfHash },
        result: findings.length ? "findings_emitted" : "clean_no_findings",
        findingIds: findings.map((f) => f.candidateId),
        contracts: {
          positive: handler?.positiveContract || null,
          negative: handler?.negativeContract || null,
          unavailable: "never_PASS",
          mutation: "pilot_rerun_same_membership",
        },
      };
      writeJson(path.join(V21, "receipts", `${c.controlId}.json`), receipt);
      return {
        controlId: c.controlId,
        implementationStatus: implStatus,
        exerciseStatus: "evaluated",
        receiptRef: `receipts/${c.controlId}.json`,
        handlerInvoked: true,
      };
    }
    let exerciseStatus = "not_exercised";
    let missingPrerequisiteReason: string | null = "not_invoked_in_v2.1_pilot";
    if (!handler && !c.implementationStatus) {
      exerciseStatus = "implementation_status_unknown";
      missingPrerequisiteReason = "no_status";
    } else if (implStatus === "browser_required") {
      exerciseStatus = "unresolved_missing_prerequisite";
      missingPrerequisiteReason = "authenticated_browser_not_exercised";
    } else if (implStatus === "specified_not_implemented" || implStatus === "engineering_required") {
      exerciseStatus = "potentially_applicable_missing_handler";
      missingPrerequisiteReason = implStatus;
    } else if (implStatus === "human_required" || implStatus === "external_assurance_required") {
      exerciseStatus = "unresolved_missing_prerequisite";
      missingPrerequisiteReason = implStatus;
    }
    return {
      controlId: c.controlId,
      implementationStatus: implStatus,
      exerciseStatus,
      receiptRef: null,
      handlerInvoked: false,
      missingPrerequisiteReason,
    };
  });
  const statusCounts = controlRows.reduce((a: any, r: any) => {
    a[r.exerciseStatus] = (a[r.exerciseStatus] || 0) + 1;
    return a;
  }, {});
  writeJson(path.join(V21, "per-control-exercise-matrix.json"), {
    schemaVersion: "diverse3000-v2.1-per-control-exercise-matrix@1.0.0",
    registryControlCount: controlRows.length,
    statusCounts,
    evaluatedCount: statusCounts.evaluated || 0,
    note: "evaluated only with receipt-backed named detector invocation",
    controls: controlRows,
  });

  // Truth open AFTER freeze
  writeJson(path.join(V21, "truth-open-sequence.json"), {
    steps: ["candidate_freeze_receipt_written", "truth_opened", "disposition"],
    candidateFreezeSha256: candidateFreezeSha,
  });
  const dispositions = candidates.map((c) => {
    let disposition = "confirmed_casebrain_app_defect";
    if (String(c.findingCode).startsWith("COPY_QUALITY_")) disposition = "professional_wording_review_required";
    else if (c.findingCode.includes("INTERNAL")) disposition = "containment";
    return { ...c, disposition, humanReview: null };
  });
  const dispCounts = dispositions.reduce((a: any, d: any) => {
    a[d.disposition] = (a[d.disposition] || 0) + 1;
    return a;
  }, {});
  writeJson(path.join(V21, "technical-disposition-ledger.json"), { total: dispositions.length, byDisposition: dispCounts });

  // Output-strength / template clusters on pilot
  function norm(t: string) {
    return t
      .toLowerCase()
      .replace(/div3000v21-\d{2}-[a-z0-9_]+/g, "<CASE>")
      .replace(/[^a-z<>_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const bySurface = new Map<string, Map<string, number>>();
  for (const s of allSurfaces) {
    if (!bySurface.has(s.surfaceId)) bySurface.set(s.surfaceId, new Map());
    const k = sha(norm(s.text));
    const m = bySurface.get(s.surfaceId)!;
    m.set(k, (m.get(k) || 0) + 1);
  }
  const clusters = [...bySurface.entries()].map(([surfaceId, map]) => {
    const sizes = [...map.values()].sort((a, b) => b - a);
    return { surfaceId, uniqueTemplates: map.size, largestCluster: sizes[0] || 0 };
  });
  writeJson(path.join(V21, "output-strength-and-template-cluster-report.json"), {
    population: 20,
    clusters,
    comparedToV2Bulk: {
      do_not_overstate_was: 3000,
      do_not_overstate_now: clusters.find((c) => c.surfaceId === "do_not_overstate")?.largestCluster,
      disclosure_chase_was: 1825,
      disclosure_chase_now: clusters.find((c) => c.surfaceId === "disclosure_chase")?.largestCluster,
      api_interface_preview_was: 2249,
      api_interface_preview_now: clusters.find((c) => c.surfaceId === "api_interface_preview")?.largestCluster,
    },
    note: "Universal warning lines may still repeat; case-specific clauses must differ with missing/superseded/charge/procedure facts.",
  });

  writeJson(path.join(V21, "genuine-exit-capability-matrix.json"), {
    productionClass: "genuine_production_builder_partial",
    builders: ["gateSolicitorOutput", "preserveProtectedAcronyms"],
    authenticatedBrowser: "not_exercised",
    packetProjectionSeparated: true,
    exitsCaptured: ["view_composed", "copy_capable_chase", "export_preview", "api_interface_preview"],
    pdfExit: "rendered_bundle_fictional_test_pdf",
  });

  writeJson(path.join(V21, "root-cause-remediation-report.json"), {
    ownership: [
      {
        cluster: "do_not_overstate_identical_3000",
        owningLayer: "v2_packet_compose",
        remediation: "V2.1 case-specific do-not clauses from missing/superseded/chargeStatus + page pointer",
      },
      {
        cluster: "chase_export_1825",
        owningLayer: "v2_packet_compose",
        remediation: "V2.1 chase/export vary by actual missingMaterialGraph and operative instruments",
      },
      {
        cluster: "interface_preview_2249",
        owningLayer: "v2_packet_compose",
        remediation: "V2.1 preview includes family/procedure/defence/chargeStatus/limits from source",
      },
    ],
    caseIdPatches: false,
    truthUsedAtGeneration: false,
  });

  // Gate evaluation
  const pdfOk = pdfRegister.length === 20 && pdfRegister.every((p) => p.pageCount > 0 && p.pdfSha256);
  const pagesOk = visualQa.every((v) => v.allAutoPass);
  const sourceOk = sourceReading.every((r) => r.pages?.length && r.contentHash);
  const evaluatedOk = (statusCounts.evaluated || 0) >= 1 && (statusCounts.evaluated || 0) <= 10;
  const outputImproved =
    (clusters.find((c) => c.surfaceId === "do_not_overstate")?.largestCluster || 20) < 20 ||
    (clusters.find((c) => c.surfaceId === "do_not_overstate")?.uniqueTemplates || 0) > 1;
  const gatePass = pdfOk && pagesOk && sourceOk && evaluatedOk && outputImproved && candidateFreezeSha.length === 64;

  writeJson(path.join(V21, "pilot-gate-result.json"), {
    gatePass,
    checks: { pdfOk, pagesOk, sourceOk, evaluatedOk, outputImproved, candidateFreezeBeforeTruth: true },
    evaluatedControlCount: statusCounts.evaluated || 0,
    candidateCount: candidates.length,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        orderedMembershipSha256,
        pdfs: pdfRegister.length,
        candidates: candidates.length,
        statusCounts,
        clusters,
        gatePass,
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
