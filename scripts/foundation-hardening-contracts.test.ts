/**
 * FINAL FOUNDATION HARDENING contracts.
 * Unknown page identity (all exits) + operative precedence + Assurance Engine receipts.
 *
 * Run: npx tsx scripts/foundation-hardening-contracts.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  composeAuthenticatedBundleSourceWithCanonical,
  mapCaseDocumentsToUploadedUnits,
  type CaseDocumentRow,
} from "@/lib/criminal/authenticated-matter-canonical";
import {
  anchorsOrDocumentOnly,
  buildCanonicalPipelineFromDocumentUnits,
  documentText,
  findPageAnchorsForText,
  isPageIdentityKnown,
  pageRefsForUnit,
  resolvePageUnits,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import {
  buildDocumentRelationshipNode,
  compareOperativePrecedence,
  operativePrecedenceBasis,
  resolveOperativeDocumentPrecedence,
  supersessionSupportFor,
} from "@/lib/criminal/document-relationship-model";
import {
  UNKNOWN_PAGE_IDENTITY_LIMITATION,
  UNKNOWN_PAGE_IDENTITY_PHRASE,
  attachFindingProvenance,
  buildFindingProvenance,
  classifyProvenanceCompleteness,
  containsSyntheticPageReference,
  formatFindingProvenanceLine,
  pageProvenanceForSurface,
} from "@/lib/criminal/finding-provenance";
import {
  ASSURANCE_CONTROLS,
  buildControlReceipt,
  listAssuranceControlIds,
  summariseReceipts,
  type AssuranceControlId,
  type ControlProofReceipt,
} from "@/lib/eval/assurance";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const runId = `assurance_foundation_${Date.now()}`;
const receipts: ControlProofReceipt[] = [];

function record(
  controlId: AssuranceControlId,
  status: ControlProofReceipt["status"],
  inputState: Record<string, unknown>,
  expectedResult: string,
  actualResult: string,
  detail: string,
) {
  receipts.push(
    buildControlReceipt({
      runId,
      controlId,
      status,
      inputState,
      expectedResult,
      actualResult,
      detail,
    }),
  );
}

const FORBIDDEN_PAGE_CLAIM = /\b(?:p\.1\b|page\s+1\b|p\.null\b|p\.undefined\b|p\.0\b)/i;

function collectExitTexts(surfaces: ReturnType<typeof buildLiveProductionSurfacesFromDocumentUnits>) {
  return {
    view: [
      ...surfaces.warRoom.doNotOverstate,
      ...surfaces.warRoom.collapseRisks,
      ...surfaces.keyFacts.evidence.map((e) => e.text),
      ...surfaces.keyFacts.disclosure.map((e) => e.text),
      ...surfaces.truthMap.evidenceState.rows.map((r) => `${r.label} ${r.note ?? ""}`),
      ...surfaces.disclosureChase.items.map((i) => `${i.label} ${i.whyItMatters} ${i.source}`),
    ].join("\n"),
    copy: surfaces.copyLines.map((c) => `${c.text}\n${c.provenanceLine}`).join("\n"),
    export: [
      ...surfaces.exportPack.sections.map((s) => `${s.title}\n${s.textForClipboard}`),
      ...surfaces.composedProse.limitations,
    ].join("\n"),
    api: JSON.stringify(surfaces.api),
    pdf: [...surfaces.pdf.provenanceLines, ...surfaces.pdf.limitations].join("\n"),
    composed_prose: [
      surfaces.composedProse.courtLine ?? "",
      surfaces.composedProse.cpsChase ?? "",
      surfaces.composedProse.clientDisclaimer,
      ...surfaces.composedProse.limitations,
    ].join("\n"),
  };
}

console.log("A — UNKNOWN PAGE IDENTITY");

check("unsplit fullText containing 'Page 19' never claims page 19 or p.1", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "unsplit-page19",
      title: "Unsplit custody bundle",
      documentType: "custody_record",
      uploadOrder: 1,
      pages: [],
      fullText:
        "Page 19 of the custody record. Custody arrival at 09:00. Interview recording served. Interview transcript incomplete. See Page 19 for caution.",
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const pages = resolvePageUnits(docs[0]!);
  assert.equal(pages.length, 1);
  assert.equal(isPageIdentityKnown(pages[0]!), false);
  assert.equal(pages[0]!.pageNumber, null);

  const anchors = findPageAnchorsForText(docs[0]!, /interview recording/i);
  assert.equal(anchors.length, 0, "exact-page anchors must not invent a page from 'Page 19' text");

  const docAnchors = anchorsOrDocumentOnly(docs[0]!, /interview recording/i);
  assert.equal(docAnchors.length, 1);
  assert.equal(docAnchors[0]!.pageIdentityKnown, false);
  assert.equal(docAnchors[0]!.sourcePage, null);

  const rt = pipeline.findings.find((f) => f.kind === "recording_vs_transcript");
  assert.ok(rt);
  assert.equal(rt!.provenance.pageIdentityKnown, false);
  assert.equal(rt!.provenance.sourcePage, null);
  assert.equal(rt!.provenance.compiledPage, null);
  assert.equal(classifyProvenanceCompleteness(rt!.provenance), "known_document_unknown_page");
  assert.match(rt!.provenanceLine, new RegExp(UNKNOWN_PAGE_IDENTITY_PHRASE.replace(/[()]/g, "\\$&"), "i"));
  assert.doesNotMatch(rt!.provenanceLine, FORBIDDEN_PAGE_CLAIM);
  assert.doesNotMatch(rt!.provenanceLine, /\bp\.19\b|page\s+19/i);
  assert.ok(!/missing provenance|provenance incomplete — solicitor review required$/i.test(rt!.provenanceLine));

  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, { caseId: "page19-string" });
  const exits = collectExitTexts(surfaces);
  for (const [exit, text] of Object.entries(exits)) {
    assert.doesNotMatch(text, FORBIDDEN_PAGE_CLAIM, `${exit} must not claim p.1`);
  }
  assert.match(exits.pdf, /exact page is unavailable|exact page unavailable/i);
  assert.match(exits.composed_prose, /exact page unavailable|Supporting document is identified/i);

  record(
    "AUD-PROV-UNKNOWN-PAGE",
    "PASS",
    { scenario: "unsplit_fullText_with_page19_string", documentId: "unsplit-page19" },
    "pageIdentityKnown=false; no p.1/p.19; limitation attached on all exits; not reported as missing provenance",
    `completeness=${classifyProvenanceCompleteness(rt!.provenance)}; line=${rt!.provenanceLine}`,
    "Unsplit text containing 'Page 19' correctly treated as unknown page identity across exits",
  );
});

check("mixed known-page units plus unsplit fallback text preserve exact pages only", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "mixed-known",
      title: "Split statement",
      documentType: "statement",
      uploadOrder: 1,
      pages: [
        { pageNumber: 4, compiledPage: 40, text: "Draft statement. Wearing a blue jacket.", pageIdentityKnown: true },
        { pageNumber: 5, compiledPage: 41, text: "Final signed MG11. Wearing a red coat.", pageIdentityKnown: true },
      ],
      fullText: "Whole-document fallback that also says Page 1 and Page 99 — must not displace page units.",
    },
    {
      id: "mixed-unsplit",
      title: "Unsplit cover letter",
      documentType: "case_document",
      uploadOrder: 2,
      pages: [],
      fullText: "Cover letter only. Interview recording served. Interview transcript incomplete.",
    },
  ];
  // When pages exist, resolvePageUnits must prefer them over fullText.
  const known = resolvePageUnits(docs[0]!);
  assert.equal(known.length, 2);
  assert.ok(known.every((p) => isPageIdentityKnown(p)));
  assert.equal(pageRefsForUnit(known[0]!).sourcePage, "p.4");
  assert.equal(pageRefsForUnit(known[0]!).compiledPage, "p.40");
  assert.doesNotMatch(documentText(docs[0]!), /Page 99/);

  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const draft = pipeline.findings.find((f) => f.kind === "draft_vs_signed");
  assert.ok(draft);
  assert.equal(draft!.provenance.pageIdentityKnown, true);
  assert.match(draft!.provenance.sourcePage ?? "", /p\.[45]/);
  assert.match(draft!.provenance.compiledPage ?? "", /p\.4[01]/);

  const unsplitRow = pipeline.evidenceRows.find(
    (r) => r.sourceDocumentTitle === "Unsplit cover letter" && /recording/i.test(r.label),
  );
  assert.ok(unsplitRow);
  assert.equal(unsplitRow!.pageIdentityKnown, false);
  assert.equal(unsplitRow!.sourcePage, null);

  record(
    "AUD-PROV-SOURCE-VS-COMPILED-PAGE",
    "PASS",
    {
      scenario: "mixed_known_plus_unsplit",
      knownSourcePages: known.map((p) => p.pageNumber),
      knownCompiledPages: known.map((p) => p.compiledPage),
    },
    "source p.4/p.5 and compiled p.40/p.41 preserved; unsplit sibling stays page-null",
    `draft.source=${draft!.provenance.sourcePage}; draft.compiled=${draft!.provenance.compiledPage}; unsplit.pageIdentityKnown=${unsplitRow!.pageIdentityKnown}`,
    "Source and compiled numbering kept distinct; fullText fallback did not shift pages",
  );
});

check("repeated wording on several pages lists every anchor page", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "repeat",
      title: "Exhibit list",
      documentType: "exhibit_list",
      uploadOrder: 1,
      pages: [
        { pageNumber: 7, text: "Exhibit EX/1 Kitchen knife recovered from scene.", pageIdentityKnown: true },
        { pageNumber: 8, text: "Blank page — OCR failed.", pageIdentityKnown: true },
        {
          pageNumber: 9,
          text: "Exhibit EX/1 Mobile phone handset. See attached: Scene photos pack. Attachment not on file.",
          pageIdentityKnown: true,
        },
        { pageNumber: 10, text: "", pageIdentityKnown: true },
        {
          pageNumber: 11,
          text: "[rotated page — OCR failed] Exhibit EX/1 Kitchen knife recovered from scene.",
          pageIdentityKnown: true,
        },
      ],
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const collision = pipeline.findings.find((f) => f.kind === "exhibit_label_collision");
  assert.ok(collision, "distinct EX/1 descriptions must collide");
  assert.match(collision!.provenance.sourcePage ?? "", /p\.(7|9|11)/);
  assert.doesNotMatch(collision!.provenanceLine, /^[^·]*p\.1\b/);

  const knifeAnchors = findPageAnchorsForText(docs[0]!, "Kitchen knife");
  assert.deepEqual(
    knifeAnchors.map((a) => a.pageNumber).sort((a, b) => (a ?? 0) - (b ?? 0)),
    [7, 11],
  );
  assert.ok(!knifeAnchors.some((a) => a.pageNumber === 1));
  assert.ok(!knifeAnchors.some((a) => a.pageNumber === 8 || a.pageNumber === 10), "blank/OCR-failed pages must not invent anchors");

  const limitation = pipeline.findings
    .map((f) => f.provenance.unresolvedConflictOrLimitation ?? "")
    .join(" ");
  // Multi-page knife anchors should be visible when rebound.
  assert.ok(knifeAnchors.length === 2);

  record(
    "AUD-PROV-FALSE-PAGE-DEFAULT",
    "PASS",
    {
      scenario: "repeated_wording_blank_rotated_ocr",
      knifePages: knifeAnchors.map((a) => a.pageNumber),
      blankPages: [8, 10],
    },
    "anchors only on genuine matching pages 7 and 11; never page 1; blank/OCR pages skipped",
    `knifePages=${knifeAnchors.map((a) => a.pageNumber).join(",")}; collisionPage=${collision!.provenance.sourcePage}`,
    `Repeated wording and blank/OCR pages handled; limitation=${limitation.slice(0, 120)}`,
  );
});

check("helpers previously capable of defaulting to page 1 refuse synthetic refs", () => {
  const bad = attachFindingProvenance({
    sourceDocumentTitle: "Unsplit custody",
    sourceDocumentType: "custody_record",
    sourcePage: "1",
    compiledPage: "p.null",
    pageIdentityKnown: false,
    evidenceState: "served",
  });
  assert.equal(bad.pageIdentityKnown, false);
  assert.equal(bad.provenance.sourcePage, null);
  assert.equal(bad.provenance.compiledPage, null);
  assert.equal(bad.completeness, "known_document_unknown_page");
  assert.doesNotMatch(bad.line, FORBIDDEN_PAGE_CLAIM);
  assert.ok(containsSyntheticPageReference("p.null"));
  assert.ok(containsSyntheticPageReference("page undefined"));
  assert.equal(containsSyntheticPageReference("p.19"), false);

  const surface = pageProvenanceForSurface(bad.provenance);
  assert.equal(surface.page, null);
  assert.equal(surface.pageNumber, null);
  assert.equal(surface.pageLabel, null);
  assert.equal(surface.sourcePage, null);

  // Authenticated mapper: raw_text only → pageIdentityKnown false, pageNumber null.
  const units = mapCaseDocumentsToUploadedUnits([
    {
      id: "auth-unsplit",
      name: "Auth unsplit.pdf",
      raw_text: "Interview recording served. Page 1 of papers.",
    },
  ]);
  assert.equal(units[0]!.pages[0]!.pageIdentityKnown, false);
  assert.equal(units[0]!.pages[0]!.pageNumber, null);
  assert.equal(pageRefsForUnit(units[0]!.pages[0]!).sourcePage, null);

  record(
    "AUD-PROV-FALSE-PAGE-DEFAULT",
    "PASS",
    {
      scenario: "helper_defaults",
      attemptedSourcePage: "1",
      attemptedCompiledPage: "p.null",
    },
    "pageIdentityKnown=false forces every page field null; synthetic refs refused",
    `line=${bad.line}; auth.pageNumber=${units[0]!.pages[0]!.pageNumber}`,
    "Shared provenance helpers and authenticated mapper refuse page-1 defaults",
  );
});

check("all production exits carry unknown-page limitation and keep factual text", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "exit-unsplit",
      title: "Unsplit interview note",
      documentType: "custody_record",
      uploadOrder: 1,
      pages: [],
      fullText:
        "Custody arrival at 10:00. Interview recording served. Interview transcript incomplete. Defendant denied the allegation.",
    },
  ];
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, { caseId: "all-exits" });
  const exits = collectExitTexts(surfaces);
  const exitNames = Object.keys(exits) as Array<keyof typeof exits>;
  const missingLimitation: string[] = [];
  const falsePageClaims: string[] = [];
  for (const name of exitNames) {
    const text = exits[name];
    if (!/exact page unavailable|Supporting document is identified|page identity unknown/i.test(text)) {
      // API serialisation uses structured fields — check those too.
      if (name === "api") {
        const parsed = JSON.parse(text) as {
          findings: Array<{
            pageIdentityKnown: boolean;
            sourcePage: string | null;
            pageIdentityNote: string | null;
            provenanceLine: string;
          }>;
        };
        for (const f of parsed.findings) {
          assert.equal(f.pageIdentityKnown, false);
          assert.equal(f.sourcePage, null);
          assert.ok(f.pageIdentityNote);
          assert.match(f.provenanceLine, /exact page unavailable/i);
        }
      } else {
        missingLimitation.push(name);
      }
    }
    if (FORBIDDEN_PAGE_CLAIM.test(text)) falsePageClaims.push(name);
  }
  assert.deepEqual(missingLimitation, [], `exits missing unknown-page limitation: ${missingLimitation.join(",")}`);
  assert.deepEqual(falsePageClaims, [], `exits claiming synthetic page: ${falsePageClaims.join(",")}`);

  // Factual text remains visible when otherwise safe.
  const factual = [
    exits.view,
    exits.copy,
    exits.api,
    ...surfaces.pipeline.findings.map((f) => f.summary),
  ].join("\n");
  assert.match(factual, /recording|transcript/i);

  record(
    "AUD-PROV-UNKNOWN-PAGE",
    "PASS",
    { scenario: "all_exits", exits: exitNames },
    "every exit attaches unknown-page limitation; no p.1/p.null; factual text still visible",
    `exitsChecked=${exitNames.join(",")}; missingLimitation=${missingLimitation.length}; falsePage=${falsePageClaims.length}`,
    "All-exit matrix closed for unknown page identity",
  );
});

console.log("\nB — OPERATIVE PRECEDENCE");

check("explicitly amended instrument wins even when uploaded earlier", () => {
  const amendedEarlier = buildDocumentRelationshipNode({
    id: "amended-early",
    title: "Amended indictment",
    documentType: "indictment",
    haystack: "Amended indictment replaces original indictment. Version 2 dated 2024-01-01.",
    replacesDocumentId: "original-late",
    documentDate: "2024-01-01",
    versionNumber: 2,
    uploadOrder: 1,
  });
  const originalLater = buildDocumentRelationshipNode({
    id: "original-late",
    title: "Original indictment",
    documentType: "indictment",
    haystack: "Original indictment.",
    documentDate: "2023-06-01",
    versionNumber: 1,
    uploadOrder: 9,
  });
  // Amended uploaded earlier (uploadOrder 1) but still wins via explicit replacement.
  const result = resolveOperativeDocumentPrecedence([originalLater, amendedEarlier]);
  assert.equal(result.operative?.id, "amended-early");
  assert.ok(result.superseded.some((n) => n.id === "original-late"));
  assert.equal(result.basis, "explicit_replacement");
  assert.equal(operativePrecedenceBasis(amendedEarlier, originalLater), "explicit_replacement");
  assert.ok(compareOperativePrecedence(amendedEarlier, originalLater) > 0);

  record(
    "AUD-DOC-OPERATIVE-PRECEDENCE",
    "PASS",
    {
      scenario: "amended_uploaded_earlier",
      amendedUploadOrder: 1,
      originalUploadOrder: 9,
      replacesDocumentId: "original-late",
    },
    "amended-early operative via explicit_replacement despite lower uploadOrder",
    `operative=${result.operative?.id}; basis=${result.basis}; superseded=${result.superseded.map((n) => n.id).join(",")}`,
    "Explicit replacement outranks upload order",
  );
});

check("later-uploaded duplicate does not supersede without supported relationship", () => {
  const earlier = buildDocumentRelationshipNode({
    id: "charge-a",
    title: "Charge sheet",
    documentType: "charge_sheet",
    haystack: "Charge sheet. Count 1 theft.",
    uploadOrder: 1,
  });
  const laterDuplicate = buildDocumentRelationshipNode({
    id: "charge-b",
    title: "Charge sheet",
    documentType: "charge_sheet",
    haystack: "Charge sheet. Count 1 theft.",
    uploadOrder: 2,
  });
  assert.equal(supersessionSupportFor(laterDuplicate, earlier), "unsupported");
  const result = resolveOperativeDocumentPrecedence([earlier, laterDuplicate]);
  // Upload order may choose the operative candidate as a fallback…
  assert.equal(result.operative?.id, "charge-b");
  assert.equal(result.basis, "upload_order");
  // …but must not silently mark the earlier instrument superseded.
  assert.ok(!result.superseded.some((n) => n.id === "charge-a"));
  assert.ok(result.unsupportedSupersessionCandidates.some((c) => c.id === "charge-a"));

  record(
    "AUD-DOC-SILENT-SUPERSESSION",
    "PASS",
    { scenario: "later_duplicate_no_relationship", earlierId: "charge-a", laterId: "charge-b" },
    "later duplicate may be operative via upload_order fallback but earlier is not silently superseded",
    `operative=${result.operative?.id}; superseded=${result.superseded.map((n) => n.id).join(",") || "(none)"}; unsupported=${result.unsupportedSupersessionCandidates.map((c) => c.id).join(",")}`,
    "Silent supersession closed — upload order is not documentary truth",
  );
  record(
    "AUD-DOC-UPLOAD-FALLBACK",
    "PASS",
    { scenario: "upload_order_fallback_only", basis: result.basis },
    "basis=upload_order only when no replacement/status/date/version distinguishes candidates",
    `basis=${result.basis}`,
    "Upload order used only as final fallback",
  );
});

check("updated_at DESC retrieval still ranks oldest→newest uploadOrder correctly", () => {
  // bundle-source supplies newest first.
  const rows: CaseDocumentRow[] = [
    {
      id: "newest",
      name: "Charge sheet",
      updated_at: "2024-06-10T12:00:00Z",
      raw_text: "Charge sheet. Count 1 robbery.",
    },
    {
      id: "oldest",
      name: "Charge sheet",
      updated_at: "2024-01-10T12:00:00Z",
      raw_text: "Charge sheet. Count 1 theft.",
    },
  ];
  const units = mapCaseDocumentsToUploadedUnits(rows);
  const newest = units.find((u) => u.id === "newest")!;
  const oldest = units.find((u) => u.id === "oldest")!;
  assert.ok(newest.uploadOrder > oldest.uploadOrder);

  const api = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "desc-order" });
  assert.equal(api.pipeline.precedence.operativeDocumentId, "newest");
  assert.equal(api.pipeline.precedence.basis, "upload_order");
  // No silent supersession on upload-order-only duplicates.
  assert.ok(!api.pipeline.precedence.supersededDocumentIds.includes("oldest"));
});

check("equal updated_at values produce deterministic results", () => {
  const rows: CaseDocumentRow[] = [
    {
      id: "doc-z",
      name: "Charge sheet",
      updated_at: "2024-05-01T00:00:00Z",
      raw_text: "Charge sheet Z. Count 1 theft.",
    },
    {
      id: "doc-a",
      name: "Charge sheet",
      updated_at: "2024-05-01T00:00:00Z",
      raw_text: "Charge sheet A. Count 1 theft.",
    },
  ];
  const first = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "tie-1" });
  const second = composeAuthenticatedBundleSourceWithCanonical([...rows].reverse(), {
    caseId: "tie-2",
  });
  assert.equal(first.pipeline.precedence.operativeDocumentId, second.pipeline.precedence.operativeDocumentId);
  assert.ok(
    first.pipeline.precedence.basis === "stable_tie_break" ||
      first.pipeline.precedence.basis === "upload_order",
  );

  record(
    "AUD-DOC-DETERMINISTIC-TIE",
    "PASS",
    {
      scenario: "equal_updated_at",
      orderA: rows.map((r) => r.id),
      orderB: [...rows].reverse().map((r) => r.id),
    },
    "identical operative result regardless of input array order",
    `operative=${first.pipeline.precedence.operativeDocumentId}; basis=${first.pipeline.precedence.basis}`,
    "Equal timestamps resolve deterministically",
  );
});

check("null/invalid updated_at values fail safely and stay deterministic", () => {
  const rows: CaseDocumentRow[] = [
    {
      id: "bad-ts",
      name: "Charge sheet",
      updated_at: "not-a-date",
      raw_text: "Charge sheet. Count 1 theft.",
    },
    {
      id: "null-ts",
      name: "Charge sheet",
      updated_at: null,
      raw_text: "Charge sheet. Count 1 robbery.",
    },
    {
      id: "invalid-date",
      name: "Charge sheet",
      updated_at: "Invalid Date",
      raw_text: "Charge sheet. Count 1 burglary.",
    },
  ];
  const a = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "null-ts-a" });
  const b = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "null-ts-b" });
  assert.equal(a.pipeline.precedence.operativeDocumentId, b.pipeline.precedence.operativeDocumentId);
  assert.ok(a.pipeline.precedence.operativeDocumentId);
  // Rerun identical.
  assert.deepEqual(
    a.pipeline.precedence.supersededDocumentIds,
    b.pipeline.precedence.supersededDocumentIds,
  );
});

check("rerunning the same inputs produces the identical operative result", () => {
  const rows: CaseDocumentRow[] = [
    {
      id: "orig",
      name: "Original indictment",
      updated_at: "2024-01-01T00:00:00Z",
      document_date: "2024-01-01",
      version_number: 1,
      raw_text:
        "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968.",
      extracted_json: {
        pages: [
          {
            pageNumber: 2,
            text: "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968.",
          },
        ],
      },
    },
    {
      id: "amd",
      name: "Amended indictment",
      updated_at: "2024-03-01T00:00:00Z",
      document_date: "2024-03-01",
      version_number: 2,
      replaces_document_id: "orig",
      raw_text:
        "Amended indictment (version 2). Replaces original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968. Particulars: stole a wallet from V.",
      extracted_json: {
        pages: [
          {
            pageNumber: 14,
            text: "Amended indictment (version 2). Replaces original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968. Particulars: stole a wallet from V.",
          },
        ],
      },
    },
  ];
  const run1 = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "idem-1", withSurfaces: true });
  const run2 = composeAuthenticatedBundleSourceWithCanonical(rows, { caseId: "idem-2", withSurfaces: true });
  assert.deepEqual(run1.pipeline.precedence, run2.pipeline.precedence);
  assert.equal(run1.pipeline.precedence.operativeDocumentId, "amd");
  assert.ok(run1.pipeline.precedence.supersededDocumentIds.includes("orig"));
  assert.equal(run1.pipeline.precedence.basis, "explicit_replacement");

  // Earlier wording remains visible as superseded and is never silently overwritten / cloned.
  const operative = run1.canonical.charges.find((c) => c.documentRole === "amended" || c.documentRole === "operative");
  const superseded = run1.canonical.charges.find((c) => c.documentRole === "superseded");
  assert.ok(operative && superseded);
  assert.notEqual(operative!.sourceDocumentTitle, superseded!.sourceDocumentTitle);
  assert.ok(
    superseded!.offence !== operative!.offence ||
      superseded!.sourcePage !== operative!.sourcePage ||
      /unresolved/i.test(superseded!.offence),
  );
  assert.ok(superseded!.sourceDocumentTitle === "Original indictment");

  const surfacesText = [
    ...run1.surfaces!.warRoom.doNotOverstate,
    ...run1.surfaces!.keyFacts.disclosure.map((d) => d.text),
    ...run1.surfaces!.api.findings.map((f) => f.summary),
  ].join("\n");
  assert.match(surfacesText, /operative|amended|earlier|superseded/i);

  record(
    "AUD-DOC-SILENT-SUPERSESSION",
    "PASS",
    {
      scenario: "earlier_wording_visible_no_clone",
      operativeOffence: operative!.offence,
      supersededOffence: superseded!.offence,
    },
    "superseded charge extracted from earlier instrument; never cloned from operative",
    `operativeDoc=${operative!.sourceDocumentTitle}; supersededDoc=${superseded!.sourceDocumentTitle}`,
    "Earlier wording preserved; no cloning",
  );
  record(
    "AUD-DOC-OPERATIVE-PRECEDENCE",
    "PASS",
    { scenario: "idempotent_rerun", basis: run1.pipeline.precedence.basis },
    "identical operative result on rerun; basis=explicit_replacement",
    JSON.stringify(run1.pipeline.precedence),
    "Rerun identity and precedence tiers verified",
  );
});

check("Assurance Engine registry exposes all seven permanent controls", () => {
  const ids = listAssuranceControlIds();
  assert.deepEqual(ids.sort(), [
    "AUD-DOC-DETERMINISTIC-TIE",
    "AUD-DOC-OPERATIVE-PRECEDENCE",
    "AUD-DOC-SILENT-SUPERSESSION",
    "AUD-DOC-UPLOAD-FALLBACK",
    "AUD-PROV-FALSE-PAGE-DEFAULT",
    "AUD-PROV-SOURCE-VS-COMPILED-PAGE",
    "AUD-PROV-UNKNOWN-PAGE",
  ]);
  assert.equal(ASSURANCE_CONTROLS.length, 7);
  // Every control must have at least one receipt from this run.
  for (const id of ids) {
    assert.ok(
      receipts.some((r) => r.controlId === id),
      `missing receipt for ${id}`,
    );
  }
  for (const r of receipts) {
    assert.ok(["PASS", "PARTIAL", "FAIL", "NOT_CHECKED"].includes(r.status));
    assert.ok(r.expectedResult.length > 0);
    assert.ok(r.actualResult.length > 0);
    assert.ok(r.affectedExits.length > 0);
    assert.equal(typeof r.inputState, "object");
  }
});

const summary = summariseReceipts(receipts);
const outDir = path.resolve(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/foundation-hardening-v1",
);
fs.mkdirSync(outDir, { recursive: true });
const report = {
  programme: "assurance-engine",
  runId,
  generatedAt: new Date().toISOString(),
  disclaimer:
    "Foundation hardening assurance receipts — not a corpus PASS. Do not commit / push / merge / deploy. Stop for review.",
  programmePassSupported: false,
  controls: ASSURANCE_CONTROLS,
  receipts,
  summary,
  contractsPassed: passed,
};
fs.writeFileSync(path.join(outDir, "ASSURANCE-REPORT.json"), JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "receipts.jsonl"),
  receipts.map((r) => JSON.stringify(r)).join("\n") + "\n",
);
const md = [
  "# Assurance checkpoint — foundation hardening",
  "",
  `| Control | Status | Detail |`,
  `| --- | --- | --- |`,
  ...receipts.map((r) => `| ${r.controlId} | ${r.status} | ${r.detail.replace(/\|/g, "/")} |`),
  "",
  `Summary: ${summary.pass} PASS / ${summary.partial} PARTIAL / ${summary.fail} FAIL / ${summary.notChecked} NOT_CHECKED`,
  "",
].join("\n");
fs.writeFileSync(path.join(outDir, "ASSURANCE-CHECKPOINT.md"), md);

console.log(`\nfoundation-hardening-contracts: ${passed} checks passed`);
console.log(`assurance receipts: ${summary.pass} PASS / ${summary.fail} FAIL → ${outDir}`);
if (summary.criticalFails > 0) process.exitCode = 1;
