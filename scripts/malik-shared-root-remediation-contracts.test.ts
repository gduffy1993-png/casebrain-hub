/**
 * Shared-root remediation contracts.
 *
 * Fixture-independent: every fixture below is invented for the contract, uses generic
 * wording, and proves a shared rule rather than a particular document. Each contract
 * has a positive case (the rule fires when it should) and a negative case (the rule
 * does not fire when it should not), and the page-provenance contracts are run on both
 * the normal extraction path and the AI-unavailable fallback path.
 *
 * Run: npx tsx scripts/malik-shared-root-remediation-contracts.test.ts
 */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import zlib from "node:zlib";

import {
  buildPageUnitsFromCompiledPageTexts,
  pageUnitsFromExtractedText,
  readPrintedSourcePagination,
  summariseTextLayerCoverage,
} from "@/lib/upload/pdf-page-units";
import {
  assignSourceIdentityToPages,
  detectCompiledBundleSegments,
} from "@/lib/criminal/compiled-bundle-segmentation";
import {
  buildCanonicalPipelineFromDocumentUnits,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import {
  buildAuthenticatedMatterCanonicalFromDocuments,
  type CaseDocumentRow,
} from "@/lib/criminal/authenticated-matter-canonical";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import {
  buildCanonicalEvidenceState,
  chaseRequestAgainstCanonicalState,
  type EvidenceObservation,
} from "@/lib/criminal/evidence-state-canonical";
import { buildAttributionModel, authorshipVerdict } from "@/lib/criminal/attribution-model";
import { resolveHearingLifecycle, extractHearingNotices } from "@/lib/criminal/hearing-notice-lifecycle";
import { scanCrossExitConsistency } from "@/lib/criminal/cross-exit-contradiction-scanner";
import { generateCriminalStrategyPdf, pdfSafeText } from "@/lib/pdf/criminal-strategy-pdf";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    passed += 1;
    console.log(`  ok  ${name}`);
  });
}
function section(title: string) {
  console.log(`\n${title}`);
}

function page(
  pageNumber: number | null,
  compiledPage: number | null,
  text: string,
): UploadedDocumentUnit["pages"][number] {
  return { pageNumber, compiledPage, text, pageIdentityKnown: true };
}

function observation(
  label: string,
  state: EvidenceObservation["state"],
  overrides: Partial<EvidenceObservation> = {},
): EvidenceObservation {
  return {
    label,
    state,
    sourceDocumentTitle: "Case papers",
    sourceDocumentType: "case_document",
    sourcePage: "p.3",
    compiledPage: "p.3",
    pageIdentityKnown: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Exact-page fallback provenance (normal + AI-unavailable fallback)
// ---------------------------------------------------------------------------

const MULTI_PAGE_TEXT = [
  "WITNESS STATEMENT\nPage 1 of 3\nThe complainant describes a struggle at the doorway.",
  "Page 2 of 3\nInterview recording served on papers. Interview transcript incomplete.",
  "Page 3 of 3\nMaster CCTV export outstanding. CCTV clips served on papers.",
].join("\f");

function rowFor(extra: Record<string, unknown>): CaseDocumentRow {
  return {
    id: "doc-1",
    name: "Compiled case papers",
    raw_text: MULTI_PAGE_TEXT,
    extracted_text: MULTI_PAGE_TEXT,
    updated_at: "2026-02-01T09:00:00Z",
    extracted_json: extra,
  };
}

async function contractExactPageProvenance() {
  section("1 — EXACT-PAGE FALLBACK PROVENANCE");

  await check("multi-page native PDF text yields independent page units", () => {
    const units = pageUnitsFromExtractedText(MULTI_PAGE_TEXT);
    assert.ok(units, "form-feed separated text must split into page units");
    assert.equal(units!.length, 3);
    assert.deepEqual(units!.map((u) => u.compiledPage), [1, 2, 3]);
    assert.deepEqual(units!.map((u) => u.sourcePage), [1, 2, 3]);
  });

  await check("printed pagination is read only from the header/footer band", () => {
    assert.deepEqual(readPrintedSourcePagination("Page 7 of 9\nBody text."), {
      sourcePage: 7,
      sourcePageTotal: 9,
    });
    // Prose that merely mentions a page is not pagination.
    assert.equal(
      readPrintedSourcePagination("The witness refers to page 7 of the interview record."),
      null,
    );
  });

  await check("negative: unsplittable text never becomes a page unit", () => {
    assert.equal(pageUnitsFromExtractedText("One continuous document with no separators."), null);
  });

  await check("scanned/OCR pages keep compiled identity and declare no text layer", () => {
    const units = buildPageUnitsFromCompiledPageTexts([
      "CUSTODY RECORD\nDetention log entries follow.",
      "   ",
      "Signed by the custody officer.",
    ]);
    assert.deepEqual(units.map((u) => u.compiledPage), [1, 2, 3]);
    assert.equal(units[1]!.textLayerEmpty, true);
    assert.equal(units[0]!.textLayerEmpty, false);
    const coverage = summariseTextLayerCoverage(units);
    assert.equal(coverage.pagesWithoutText, 1);
    assert.match(coverage.limitation ?? "", /no extractable text layer/i);
    // A scanned page must not silently renumber the pages after it.
    assert.equal(units[2]!.compiledPage, 3);
  });

  await check("findings bind to the exact page under normal extraction", () => {
    const built = buildAuthenticatedMatterCanonicalFromDocuments([
      rowFor({ aiSummary: "AI summary available", summary: "s" }),
    ]);
    const withPages = built.canonical.findings.filter((f) => f.pageIdentityKnown);
    assert.ok(withPages.length > 0, "expected at least one exactly-paged finding");
    assert.ok(withPages.every((f) => f.sourcePage || f.compiledPage));
  });

  await check("AI-unavailable (HTTP 429) fallback produces identical page provenance", () => {
    const normal = buildAuthenticatedMatterCanonicalFromDocuments([
      rowFor({ aiSummary: "AI summary available", summary: "s" }),
    ]);
    const fallback = buildAuthenticatedMatterCanonicalFromDocuments([
      rowFor({ aiSummary: null, extractionError: "AI extraction failed: HTTP 429" }),
    ]);
    assert.equal(fallback.canonical.pageUnitCount, normal.canonical.pageUnitCount);
    assert.equal(fallback.canonical.pageUnitCount, 3);
    const project = (f: { sourcePage: string | null; compiledPage: string | null; pageIdentityKnown: boolean }) =>
      `${f.sourcePage}|${f.compiledPage}|${f.pageIdentityKnown}`;
    assert.deepEqual(
      fallback.canonical.findings.map(project),
      normal.canonical.findings.map(project),
      "fallback path must not lose or shift page provenance",
    );
    assert.ok(
      fallback.canonical.findings.some((f) => f.pageIdentityKnown),
      "fallback must still produce exactly-paged findings",
    );
  });

  await check("negative: unsplit whole-document text stays explicitly page-unknown", () => {
    const unsplit = buildAuthenticatedMatterCanonicalFromDocuments([
      {
        id: "doc-unsplit",
        name: "Unsplit papers",
        raw_text: "Statement referring to page 12 of the exhibit schedule. Exhibit AB/1 knife.",
        updated_at: "2026-02-01T09:00:00Z",
      },
    ]);
    assert.equal(unsplit.canonical.pageUnitCount, 1);
    for (const f of unsplit.canonical.findings) {
      assert.equal(f.pageIdentityKnown, false);
      assert.equal(f.sourcePage, null);
      assert.equal(f.compiledPage, null);
      assert.equal(f.pageLabel, null);
      assert.match(f.pageIdentityNote ?? "", /exact page is unavailable/i);
    }
  });

  await check("compiled and source pagination stay distinct and are never swapped", () => {
    const pipeline = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "d1",
        title: "Compiled bundle",
        documentType: "case_document",
        uploadOrder: 1,
        pages: [
          page(null, 40, "Exhibit CD/2: dark jacket recovered."),
          page(4, 41, "Exhibit CD/2: mobile telephone recovered."),
        ],
      },
    ]);
    const collision = pipeline.findings.find((f) => f.kind === "exhibit_label_collision");
    assert.ok(collision, "expected exhibit collision across the two compiled pages");
    // Compiled-only page identity is real, but must not be presented as source pagination.
    const anchors = collision!.supportingAnchors ?? [];
    assert.ok(anchors.length >= 2, "all candidate anchors must be preserved");
    assert.ok(anchors.some((a) => a.sourcePage === null && a.compiledPage === "p.40"));
    assert.ok(anchors.some((a) => a.sourcePage === "p.4" && a.compiledPage === "p.41"));
  });

  await check("repeated wording keeps every candidate anchor and stays unresolved", () => {
    const pipeline = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "d1",
        title: "Exhibit schedule",
        documentType: "exhibit_list",
        uploadOrder: 1,
        pages: [
          page(2, 2, "Exhibit EF/3: blue holdall recovered at scene."),
          page(9, 9, "Exhibit EF/3: blue rucksack recovered from vehicle."),
        ],
      },
    ]);
    const collision = pipeline.findings.find((f) => f.kind === "exhibit_label_collision");
    assert.ok(collision);
    assert.equal(collision!.unresolved, true, "ambiguous anchoring must remain unresolved");
    assert.match(
      collision!.provenance.unresolvedConflictOrLimitation ?? "",
      /all candidate anchors preserved/i,
    );
  });

  await check("document boundaries inside a compiled bundle are only claimed when evidenced", () => {
    const units = buildPageUnitsFromCompiledPageTexts([
      "INDICTMENT\nPage 1 of 1\nCount 1: robbery.",
      "WITNESS STATEMENT\nPage 1 of 2\nI saw two people run away.",
      "Page 2 of 2\nI did not see either face clearly.",
      "Continuation sheet with no heading of its own.",
    ]);
    const segments = detectCompiledBundleSegments(units);
    assert.ok(segments.length >= 2, `expected multiple segments, got ${segments.length}`);
    assert.equal(segments[0]!.sourceDocumentType, "indictment");
    assert.equal(segments[1]!.sourceDocumentType, "statement");

    const identities = assignSourceIdentityToPages(units);
    assert.equal(identities[0]!.sourceDocumentTitle, "INDICTMENT");
    assert.equal(identities[2]!.sourceDocumentTitle, "WITNESS STATEMENT");
    // Compiled position is always known even where the source document is not.
    assert.deepEqual(identities.map((i) => i.compiledPage), [1, 2, 3, 4]);
    // Page 3 prints "Page 2 of 2" — source pagination is read, never fabricated.
    assert.equal(identities[2]!.sourcePage, 2);
    assert.equal(identities[3]!.sourcePage, null);
  });

  await check("negative: prose mentioning a document type does not create a boundary", () => {
    const units = buildPageUnitsFromCompiledPageTexts([
      "CUSTODY RECORD\nDetainee booked in.",
      "The officer later produced a witness statement, which is exhibited separately.",
    ]);
    const segments = detectCompiledBundleSegments(units);
    assert.equal(segments.length, 1, "a passing mention must not split the bundle");
  });
}

// ---------------------------------------------------------------------------
// 2–6. Document-relationship materialisation
// ---------------------------------------------------------------------------

function relationshipDocuments(): UploadedDocumentUnit[] {
  return [
    {
      id: "instrument-original",
      title: "Original charge sheet",
      documentType: "charge_sheet",
      documentDate: "2026-01-04",
      uploadOrder: 1,
      pages: [
        page(1, 1, "CHARGE SHEET\nCount 1: theft from a shop, contrary to statute. Particulars: taking goods without payment."),
      ],
    },
    {
      id: "instrument-amended",
      title: "Amended indictment",
      documentType: "indictment",
      documentDate: "2026-02-11",
      uploadOrder: 2,
      replacesDocumentId: "instrument-original",
      pages: [
        page(1, 5, "INDICTMENT\nThis amended indictment replaces and supersedes the original charge sheet.\nCount 1: robbery, contrary to statute. Particulars: taking goods by force."),
      ],
    },
    {
      id: "statement-draft",
      title: "Draft statement",
      documentType: "statement",
      uploadOrder: 3,
      pages: [page(2, 9, "Draft statement (MG11). The person was wearing a blue jacket.")],
    },
    {
      id: "statement-signed",
      title: "Final signed MG11",
      documentType: "statement",
      uploadOrder: 4,
      pages: [page(2, 12, "Final signed MG11 statement. The person was wearing a red coat.")],
    },
    {
      id: "covering-email",
      title: "Covering email",
      documentType: "correspondence",
      uploadOrder: 5,
      pages: [page(1, 15, "See attached: Scene photograph pack. Attachment not on file.")],
    },
    {
      id: "exhibit-schedule",
      title: "Exhibit schedule",
      documentType: "exhibit_list",
      uploadOrder: 6,
      pages: [
        page(1, 18, "Exhibit GH/1: kitchen knife recovered at scene."),
        page(2, 19, "Exhibit GH/1: mobile telephone recovered from vehicle."),
      ],
    },
  ];
}

async function contractDocumentRelationships() {
  section("2-6 — DOCUMENT-RELATIONSHIP MATERIALISATION");
  const pipeline = buildCanonicalPipelineFromDocumentUnits(relationshipDocuments());

  await check("operative/superseded charge lifecycle materialises without cloning", () => {
    const roles = pipeline.charges.map((c) => c.documentRole);
    assert.ok(roles.includes("superseded"), `expected a superseded instrument, got ${roles.join(",")}`);
    assert.ok(
      roles.some((r) => r === "operative" || r === "amended"),
      `expected an operative instrument, got ${roles.join(",")}`,
    );
    const operative = pipeline.charges.find((c) => c.documentRole !== "superseded")!;
    const superseded = pipeline.charges.find((c) => c.documentRole === "superseded")!;
    assert.notEqual(operative.sourceDocumentTitle, superseded.sourceDocumentTitle);
    assert.notEqual(
      superseded.offence,
      operative.offence,
      "operative wording must not be cloned onto the earlier instrument",
    );
    // Earlier wording stays visible rather than being replaced.
    assert.ok(/theft|unresolved/i.test(superseded.offence));
  });

  await check("negative: an unrelated later upload does not supersede an instrument", () => {
    const noSupersession = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "a",
        title: "Indictment",
        documentType: "indictment",
        uploadOrder: 1,
        pages: [page(1, 1, "INDICTMENT\nCount 1: burglary, contrary to statute.")],
      },
      {
        id: "b",
        title: "Case summary",
        documentType: "case_document",
        uploadOrder: 2,
        pages: [page(1, 2, "Case summary for the court. No charge changes are recorded.")],
      },
    ]);
    assert.deepEqual(noSupersession.precedence.supersededDocumentIds, []);
  });

  await check("draft/signed changed fields are detected and earlier values preserved", () => {
    const finding = pipeline.findings.find((f) => f.kind === "draft_vs_signed");
    assert.ok(finding, "draft vs signed finding missing");
    assert.ok((finding!.earlierValuesPreserved ?? []).length > 0, "changed fields must be recorded");
    const changed = finding!.earlierValuesPreserved!;
    assert.ok(
      changed.some((c) => /blue/i.test(c.earlierValue) && /red/i.test(c.laterValue)),
      `earlier and later values must both survive: ${JSON.stringify(changed)}`,
    );
  });

  await check("negative: identical draft and signed text yields no phantom change", () => {
    const same = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "d",
        title: "Draft statement",
        documentType: "statement",
        uploadOrder: 1,
        pages: [page(1, 1, "Draft statement (MG11). The person was wearing a blue jacket.")],
      },
      {
        id: "s",
        title: "Final signed MG11",
        documentType: "statement",
        uploadOrder: 2,
        pages: [page(1, 2, "Final signed MG11 statement. The person was wearing a blue jacket.")],
      },
    ]);
    const finding = same.findings.find((f) => f.kind === "draft_vs_signed");
    assert.equal((finding?.earlierValuesPreserved ?? []).length, 0);
  });

  await check("duplicate exhibit label on different items is a collision, not a merge", () => {
    const collision = pipeline.findings.find((f) => f.kind === "exhibit_label_collision");
    assert.ok(collision, "exhibit collision finding missing");
    assert.equal(collision!.unresolved, true);
    assert.ok((collision!.exhibitCollision?.occurrences.length ?? 0) >= 2);
  });

  await check("negative: the same label for the same item is not a collision", () => {
    const noCollision = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "e",
        title: "Exhibit schedule",
        documentType: "exhibit_list",
        uploadOrder: 1,
        pages: [
          page(1, 1, "Exhibit JK/1: kitchen knife recovered at scene."),
          page(2, 2, "Exhibit JK/1: kitchen knife recovered at scene."),
        ],
      },
    ]);
    assert.ok(!noCollision.findings.some((f) => f.kind === "exhibit_label_collision"));
  });

  await check("referenced-but-absent attachment materialises with provenance", () => {
    const absent = pipeline.findings.find((f) => f.kind === "referenced_absent_attachment");
    assert.ok(absent, "referenced-absent finding missing");
    assert.equal(absent!.unresolved, true);
    assert.ok(
      absent!.provenance.sourceDocumentTitle,
      "an absent-attachment finding must still name the document that referenced it",
    );
  });

  await check("negative: an attachment that is on file is not reported absent", () => {
    const present = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "email",
        title: "Covering email",
        documentType: "correspondence",
        uploadOrder: 1,
        pages: [page(1, 1, "See attached: Scene photograph pack.")],
      },
      {
        id: "pack",
        title: "Scene photograph pack",
        documentType: "case_document",
        uploadOrder: 2,
        pages: [page(1, 2, "Scene photograph pack. Images 1 to 12.")],
      },
    ]);
    assert.ok(!present.findings.some((f) => f.kind === "referenced_absent_attachment"));
  });

  await check("latest hearing notice governs and the older notice is preserved", () => {
    const notices = extractHearingNotices([
      {
        documentId: "notice-1",
        documentTitle: "Notice of hearing",
        uploadOrder: 1,
        text: "NOTICE OF HEARING\nDated 1 March 2026. This case is listed for trial on 14 May 2026.",
        sourcePage: "p.1",
        compiledPage: "p.30",
        pageIdentityKnown: true,
      },
      {
        documentId: "notice-2",
        documentTitle: "Notice of hearing (relisted)",
        uploadOrder: 2,
        text: "NOTICE OF HEARING\nDated 2 April 2026. The case has been relisted to 9 July 2026.",
        sourcePage: "p.1",
        compiledPage: "p.34",
        pageIdentityKnown: true,
      },
    ]);
    assert.equal(notices.length, 2);
    const lifecycle = resolveHearingLifecycle(notices);
    assert.equal(lifecycle.latest?.documentId, "notice-2");
    assert.equal(lifecycle.basis, "issue_date");
    assert.equal(lifecycle.superseded.length, 1);
    assert.equal(lifecycle.superseded[0]!.documentId, "notice-1");
    assert.equal(lifecycle.conflict, true, "differing hearing dates must remain a live conflict");
    assert.match(lifecycle.conflictDescription ?? "", /2026-05-14/);
    assert.match(lifecycle.conflictDescription ?? "", /2026-07-09/);
  });

  await check("negative: a single hearing notice is not a conflict", () => {
    const lifecycle = resolveHearingLifecycle(
      extractHearingNotices([
        {
          documentId: "notice-only",
          documentTitle: "Notice of hearing",
          uploadOrder: 1,
          text: "NOTICE OF HEARING\nDated 2 April 2026. Listed for case management on 9 July 2026.",
          sourcePage: "p.1",
          compiledPage: "p.4",
          pageIdentityKnown: true,
        },
      ]),
    );
    assert.equal(lifecycle.conflict, false);
    assert.equal(lifecycle.basis, "single_notice");
    assert.equal(lifecycle.conflictDescription, null);
  });
}

// ---------------------------------------------------------------------------
// 7–9. Evidence-state and alias reconciliation
// ---------------------------------------------------------------------------

async function contractEvidenceState() {
  section("7-9 — EVIDENCE STATE AND ALIAS RECONCILIATION");

  await check("recording served + transcript incomplete never becomes a missing recording", () => {
    const state = buildCanonicalEvidenceState([
      observation("Interview recording", "served"),
      observation("Interview transcript", "incomplete"),
    ]);
    const recording = state.items.find((i) => /recording/i.test(i.label))!;
    const transcript = state.items.find((i) => /transcript/i.test(i.label))!;
    assert.equal(recording.state, "served");
    assert.equal(transcript.state, "incomplete");
    assert.notEqual(
      recording.modality,
      transcript.modality,
      "recording and transcript must remain distinct modalities",
    );
    assert.ok(
      !state.chaseRequests.some((r) => /recording/i.test(r.label)),
      "a served recording must not be chased",
    );
    const transcriptChase = state.chaseRequests.find((r) => /transcript/i.test(r.label));
    assert.ok(transcriptChase, "an incomplete transcript must still be chased");
    assert.match(transcriptChase!.reason, /incomplete/i);
  });

  await check("negative: a genuinely missing recording is still chased", () => {
    const state = buildCanonicalEvidenceState([observation("Interview recording", "missing")]);
    assert.ok(state.chaseRequests.some((r) => /recording/i.test(r.label)));
  });

  await check("master media missing stays distinct from served clips", () => {
    const state = buildCanonicalEvidenceState([
      observation("Master CCTV export", "missing"),
      observation("CCTV clips", "served"),
    ]);
    const master = state.items.find((i) => i.modality === "master_media")!;
    const clips = state.items.find((i) => i.modality === "clip_or_still")!;
    assert.equal(master.state, "missing");
    assert.equal(clips.state, "served");
    assert.ok(
      state.chaseRequests.some((r) => r.modality === "master_media"),
      "served clips must not satisfy the master export request",
    );
    assert.ok(!state.chaseRequests.some((r) => r.modality === "clip_or_still"));
  });

  await check("negative: served master media is not chased on the strength of clips", () => {
    const state = buildCanonicalEvidenceState([
      observation("Master CCTV export", "served"),
      observation("CCTV clips", "served"),
    ]);
    assert.deepEqual(state.chaseRequests, []);
  });

  await check("a served alias suppresses only the identical request", () => {
    const state = buildCanonicalEvidenceState([
      observation("Full phone download / source export", "served"),
      observation("Master CCTV export", "missing"),
    ]);
    const aliasRequest = chaseRequestAgainstCanonicalState(
      "Phone download / source export",
      state,
    );
    assert.equal(aliasRequest.chase, false, "an alias of served material must not be chased");
    assert.match(aliasRequest.reason ?? "", /already on file|served alias/i);

    const differentRequest = chaseRequestAgainstCanonicalState("Master CCTV export", state);
    assert.equal(differentRequest.chase, true, "a different item must still be chased");

    const genericRequest = chaseRequestAgainstCanonicalState("Further evidence", state);
    assert.equal(
      genericRequest.chase,
      true,
      "broad/generic material must not be satisfied by a specific served item",
    );
  });

  await check("subscriber material stays distinct from a served phone report", () => {
    const state = buildCanonicalEvidenceState([
      observation("Full phone download report", "served"),
      observation("Subscriber check for the handset number", "missing"),
    ]);
    const subscriber = state.items.find((i) => /subscriber/i.test(i.label))!;
    assert.equal(subscriber.state, "missing");
    assert.ok(
      state.chaseRequests.some((r) => /subscriber/i.test(r.label)),
      "a served phone report must not satisfy a subscriber/account request",
    );
  });

  await check("contradictory served/missing rows are flagged, never silently resolved", () => {
    const state = buildCanonicalEvidenceState([
      observation("Scene photograph pack", "served"),
      observation("Scene photograph pack", "missing", { sourcePage: "p.9", compiledPage: "p.9" }),
    ]);
    assert.equal(state.contradictions.length, 1);
    const item = state.items[0]!;
    assert.equal(item.state, "not_safely_confirmed");
    assert.equal(item.unresolved, true);
    assert.match(item.limitation ?? "", /contradict/i);
  });

  await check("negative: served + incomplete reconciles to incomplete, not a contradiction", () => {
    const state = buildCanonicalEvidenceState([
      observation("Scene photograph pack", "served"),
      observation("Scene photograph pack", "incomplete"),
    ]);
    assert.deepEqual(state.contradictions, []);
    assert.equal(state.items[0]!.state, "incomplete");
  });

  await check("Disclosure Chase consumes the canonical state instead of regenerating it", () => {
    const surfaces = buildLiveProductionSurfacesFromDocumentUnits([
      {
        id: "papers",
        title: "Case papers",
        documentType: "case_document",
        uploadOrder: 1,
        pages: [
          page(1, 1, "Interview recording served on papers. Interview transcript incomplete."),
          page(2, 2, "Master CCTV export outstanding. CCTV clips served on papers."),
        ],
      },
    ]);
    const chaseLabels = surfaces.disclosureChase.items.map((i) => i.label.toLowerCase());
    assert.ok(
      !chaseLabels.some((l) => /interview recording/.test(l) && !/transcript/.test(l)),
      `served recording must not appear as a chase item: ${chaseLabels.join(" | ")}`,
    );
    assert.ok(
      surfaces.pipeline.evidenceState.items.length > 0,
      "canonical evidence state must be populated for the chase surface to consume",
    );
  });
}

// ---------------------------------------------------------------------------
// 10–11. Attribution
// ---------------------------------------------------------------------------

const ATTRIBUTION_PAGES = [
  {
    text: "INDICTMENT\nCount 1: robbery. John Smith is charged on count 1.\nCount 2: handling. Peter Jones is charged on count 2.\nCount 3: possession of an offensive weapon.",
    sourceDocumentTitle: "Indictment",
    sourceDocumentType: "indictment",
    sourcePage: "p.1",
    compiledPage: "p.1",
    pageIdentityKnown: true,
  },
  {
    text: "Telecoms report. The handset was recovered from John Smith. The account is registered to Peter Jones. Messages were extracted from the chat application.",
    sourceDocumentTitle: "Telecoms report",
    sourceDocumentType: "telecoms_report",
    sourcePage: "p.6",
    compiledPage: "p.22",
    pageIdentityKnown: true,
  },
];

async function contractAttribution() {
  section("10-11 — ATTRIBUTION");

  await check("defendant allocation is materialised per count and stays isolated", () => {
    const model = buildAttributionModel(ATTRIBUTION_PAGES);
    const c1 = model.countAllocations.find((a) => a.countNumber === 1)!;
    const c2 = model.countAllocations.find((a) => a.countNumber === 2)!;
    assert.deepEqual(c1.defendants, ["John Smith"]);
    assert.deepEqual(c2.defendants, ["Peter Jones"]);
    assert.ok(!c1.defendants.includes("Peter Jones"), "counts must not leak across defendants");
  });

  await check("negative: a count with no named defendant stays explicitly unallocated", () => {
    const model = buildAttributionModel(ATTRIBUTION_PAGES);
    const c3 = model.countAllocations.find((a) => a.countNumber === 3)!;
    assert.equal(c3.unallocated, true);
    assert.deepEqual(c3.defendants, []);
  });

  await check("co-defendant contamination is warned about where several are named", () => {
    const model = buildAttributionModel(ATTRIBUTION_PAGES);
    assert.ok(model.contamination.length > 0);
    assert.ok(model.contamination.every((c) => c.otherDefendants.length > 0));
    assert.ok(model.contamination.every((c) => /do not carry this across/i.test(c.warning)));
  });

  await check("device ownership, account association and authorship stay separate", () => {
    const model = buildAttributionModel(ATTRIBUTION_PAGES);
    assert.ok(model.deviceOwnership.some((d) => d.person === "John Smith"));
    assert.ok(model.accountAssociation.some((a) => a.person === "Peter Jones"));

    const owner = authorshipVerdict(model, "John Smith");
    assert.equal(owner.attributed, false, "device possession must not establish authorship");
    assert.match(owner.limitation ?? "", /does not establish who wrote/i);

    const holder = authorshipVerdict(model, "Peter Jones");
    assert.equal(holder.attributed, false, "account association must not establish authorship");
  });

  await check("positive: express authorship evidence is attributed", () => {
    const model = buildAttributionModel([
      {
        ...ATTRIBUTION_PAGES[1]!,
        text: "Telecoms report. The handset was recovered from John Smith. The message was sent by Peter Jones.",
      },
    ]);
    assert.equal(authorshipVerdict(model, "Peter Jones").attributed, true);
    assert.equal(authorshipVerdict(model, "John Smith").attributed, false);
  });

  await check("defendant scope reaches evidence rows on the live pipeline", () => {
    const pipeline = buildCanonicalPipelineFromDocumentUnits([
      {
        id: "papers",
        title: "Case papers",
        documentType: "case_document",
        uploadOrder: 1,
        pages: [
          page(1, 1, ATTRIBUTION_PAGES[0]!.text),
          page(2, 2, "Telecoms report for John Smith served on papers."),
        ],
      },
    ]);
    assert.ok(pipeline.attribution.defendants.includes("John Smith"));
    assert.ok(
      pipeline.evidenceRows.every((r) => Array.isArray(r.defendants)),
      "every evidence row must carry a defendant scope field",
    );
  });
}

// ---------------------------------------------------------------------------
// 12–13. Cross-exit consistency and recommendation safety
// ---------------------------------------------------------------------------

async function contractCrossExit() {
  section("12-13 — CROSS-EXIT CONSISTENCY");

  const evidence = buildCanonicalEvidenceState([
    observation("Master CCTV export", "missing"),
    observation("Medical report", "served"),
  ]);
  const baseContext = {
    evidence,
    requiredLimitations: [
      "CCTV shows the doorway only; faces are not visible",
      "Device clock runs 12 minutes fast against the custody clock",
    ],
    support: { identification: false, intent: false, pleaAdvice: false, medicalInjury: true },
    hearing: { status: "Listed", dateIso: "2026-07-09" },
  };
  const compliantExits = [
    {
      exit: "war_room" as const,
      texts: [
        "Master CCTV export is outstanding and must be chased.",
        "The medical report supports the injury and its clinical causation.",
      ],
      limitations: baseContext.requiredLimitations,
      hearing: { status: "Listed", dateIso: "2026-07-09" },
    },
    {
      exit: "strategy" as const,
      texts: ["Identification remains unresolved on current disclosure."],
      limitations: baseContext.requiredLimitations,
      hearing: { status: "Listed", dateIso: "2026-07-09" },
    },
  ];

  await check("medical evidence may support injury and clinical causation", () => {
    const result = scanCrossExitConsistency(compliantExits, baseContext);
    assert.equal(result.ok, true, JSON.stringify(result.contradictions, null, 2));
  });

  await check("negative: medical evidence may not establish identification or intent", () => {
    const result = scanCrossExitConsistency(
      [
        {
          exit: "strategy",
          texts: ["The medical report confirms the defendant was the assailant and shows intent."],
          limitations: baseContext.requiredLimitations,
        },
      ],
      baseContext,
    );
    const codes = result.contradictions.map((c) => `${c.code}:${c.subject}`);
    assert.ok(codes.includes("medical_overreach:identification"), codes.join(","));
    assert.ok(codes.includes("medical_overreach:intent"), codes.join(","));
  });

  await check("unsupported recommendations are refused", () => {
    const result = scanCrossExitConsistency(
      [
        {
          exit: "strategy",
          texts: [
            "Identification is strong on the current material.",
            "We advise considering a guilty plea at the next hearing.",
          ],
          limitations: baseContext.requiredLimitations,
        },
      ],
      baseContext,
    );
    const subjects = result.contradictions
      .filter((c) => c.code === "unsupported_recommendation")
      .map((c) => c.subject);
    assert.ok(subjects.includes("identification"));
    assert.ok(subjects.includes("plea"));
  });

  await check("canonical missing state cannot be contradicted by another exit", () => {
    const result = scanCrossExitConsistency(
      [
        {
          exit: "disclosure_chase",
          texts: ["The master CCTV export has been served and is complete."],
          limitations: baseContext.requiredLimitations,
        },
      ],
      baseContext,
    );
    assert.ok(result.contradictions.some((c) => c.code === "served_state_contradicted"));
  });

  await check("served material is not re-chased on any exit", () => {
    const servedState = buildCanonicalEvidenceState([observation("Medical report", "served")]);
    const result = scanCrossExitConsistency(
      [{ exit: "disclosure_chase", texts: ["Please provide the medical report."], limitations: [] }],
      { ...baseContext, evidence: servedState, requiredLimitations: [] },
    );
    assert.ok(result.contradictions.some((c) => c.code === "alias_rechased"));
  });

  await check("CCTV limitations and clock discrepancies must survive every exit", () => {
    const result = scanCrossExitConsistency(
      [
        {
          exit: "pdf",
          texts: ["Master CCTV export is outstanding."],
          limitations: ["CCTV shows the doorway only; faces are not visible"],
        },
      ],
      baseContext,
    );
    const dropped = result.contradictions.filter((c) => c.code === "limitation_dropped");
    assert.equal(dropped.length, 1, "the clock discrepancy limitation must be reported as dropped");
    assert.match(dropped[0]!.subject, /clock/i);
  });

  await check("hearing lifecycle must agree across exits", () => {
    const result = scanCrossExitConsistency(
      [
        {
          exit: "control_room",
          texts: [],
          limitations: baseContext.requiredLimitations,
          hearing: { status: "Listed", dateIso: "2026-07-09" },
        },
        {
          exit: "api",
          texts: [],
          limitations: baseContext.requiredLimitations,
          hearing: { status: "Listed", dateIso: "2026-05-14" },
        },
      ],
      baseContext,
    );
    assert.ok(result.contradictions.some((c) => c.code === "hearing_lifecycle_disagreement"));
  });

  await check("live production surfaces produce zero cross-exit contradictions", () => {
    const surfaces = buildLiveProductionSurfacesFromDocumentUnits(relationshipDocuments());
    assert.equal(
      surfaces.crossExit.ok,
      true,
      JSON.stringify(surfaces.crossExit.contradictions, null, 2),
    );
    // The same limitation set must reach copy, export, PDF and composed prose.
    for (const limitation of surfaces.requiredLimitations) {
      assert.ok(surfaces.pdf.limitations.includes(limitation), `PDF exit dropped: ${limitation}`);
      assert.ok(
        surfaces.composedProse.limitations.includes(limitation),
        `composed prose dropped: ${limitation}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 14. Strategy PDF quality
// ---------------------------------------------------------------------------

/**
 * Read a generated PDF structurally rather than through pdf-parse: the bundled
 * pdf.js in pdf-parse cannot read pdfkit's cross-reference table (it fails on a
 * one-line pdfkit document too), so relying on it would test the reader, not the
 * export. Inflating the content streams checks exactly what a viewer would draw.
 */
function readPdfPages(buffer: Buffer): { pageCount: number; pages: string[]; text: string } {
  const streams: string[] = [];
  const startMarker = Buffer.from("stream");
  const endMarker = Buffer.from("endstream");
  let idx = 0;
  while ((idx = buffer.indexOf(startMarker, idx)) !== -1) {
    let start = idx + startMarker.length;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;
    const end = buffer.indexOf(endMarker, start);
    if (end === -1) break;
    try {
      streams.push(zlib.inflateSync(buffer.subarray(start, end)).toString("latin1"));
    } catch {
      streams.push(buffer.subarray(start, end).toString("latin1"));
    }
    idx = end + endMarker.length;
  }

  const decodeLiteral = (raw: string): string =>
    raw
      .slice(1, -1)
      .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, "$1");

  // pdfkit writes hex strings inside TJ arrays; literal strings are also valid PDF,
  // so both forms are decoded from the BT/ET blocks that actually draw text.
  const decodeHex = (raw: string): string => {
    const hex = raw.slice(1, -1).replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
  };

  const textOf = (content: string): string => {
    const out: string[] = [];
    const blocks = content.match(/BT[\s\S]*?ET/g) ?? [];
    for (const block of blocks) {
      const re = /<[0-9a-fA-F\s]*>|\((?:\\.|[^()\\])*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(block)) !== null) {
        out.push(m[0].startsWith("<") ? decodeHex(m[0]) : decodeLiteral(m[0]));
      }
    }
    return out.join("");
  };

  const pages = streams.filter((s) => s.includes("BT")).map(textOf);
  const pageCount = (buffer.toString("latin1").match(/\/Type\s*\/Page(?![s/])/g) ?? []).length;
  return { pageCount, pages, text: pages.join("\n") };
}

async function contractStrategyPdf() {
  section("14 — STRATEGY PDF QUALITY");

  await check("non-WinAnsi glyphs are replaced with readable equivalents", () => {
    assert.equal(pdfSafeText("\u2610 review the papers"), "[ ] review the papers");
    assert.equal(pdfSafeText("\u25CF item"), "\u2022 item");
    assert.equal(pdfSafeText("a \u2192 b"), "a -> b");
    // Anything still unrepresentable is dropped rather than rendered as noise.
    assert.equal(pdfSafeText("clean \u5B57 text"), "clean  text");
  });

  await check("strategy PDF is valid, paginated and populated from canonical state", async () => {
    const surfaces = buildLiveProductionSurfacesFromDocumentUnits(relationshipDocuments());
    const buffer = await generateCriminalStrategyPdf({
      caseId: "contract-case",
      title: "Contract matter",
      generatedAt: new Date("2026-03-01T10:00:00Z").toISOString(),
      offenceLabel: "Robbery",
      nextHearingType: "Case management",
      nextHearingDate: "2026-07-09",
      hearingLifecycleNote: "Later notice governs; earlier notice preserved on file.",
      charges: surfaces.charges.map((c) => ({
        count: c.count,
        offence: c.offence,
        defendants: c.defendants ?? [],
        documentRole: c.documentRole,
        status: c.status,
        sourceLabel: c.sourceDocumentTitle,
      })),
      hrsChecklist: ["Confirm the operative instrument", "Chase outstanding material"],
      pressurePoints: surfaces.pipeline.findings.slice(0, 6).map((f) => ({
        label: f.title,
        reason: f.summary,
      })),
      provenanceLimitations: surfaces.pdf.limitations.slice(0, 10),
    });

    assert.ok(Buffer.isBuffer(buffer) && buffer.length > 1000, "PDF buffer is too small");
    assert.equal(buffer.subarray(0, 5).toString("latin1"), "%PDF-", "missing PDF magic header");
    assert.ok(buffer.subarray(-1024).toString("latin1").includes("%%EOF"), "PDF is not terminated");

    const parsed = readPdfPages(buffer);
    assert.ok(parsed.pageCount >= 1, "PDF must contain at least one page");
    assert.equal(parsed.pages.length, parsed.pageCount, "every page must carry drawn text");
    assert.match(parsed.text, /Page 1 of \d+/, "readable pagination is missing");
    assert.match(parsed.text, /CHARGES/i, "charge block must be populated from canonical state");
    assert.match(parsed.text, /Case management/, "hearing fields must be populated");
    assert.match(parsed.text, /Provenance limitations/i, "limitations must reach the PDF exit");
    assert.ok(
      !/[\u2610\u25CF\uFFFD]/.test(parsed.text),
      "malformed bullet glyphs must not reach the PDF",
    );

    // A broken layout shows up as a page whose only drawn text is its footer.
    for (const [i, pageText] of parsed.pages.entries()) {
      const body = pageText.replace(/Page \d+ of \d+/g, "").trim();
      assert.ok(
        body.length > 60,
        `page ${i + 1} contains almost no content (${body.length} chars) — layout has broken`,
      );
    }
  });

  await check("negative: an empty strategy export still produces a valid readable PDF", async () => {
    const buffer = await generateCriminalStrategyPdf({
      caseId: "contract-case-empty",
      title: "Thin matter",
      generatedAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    });
    assert.equal(buffer.subarray(0, 5).toString("latin1"), "%PDF-");
    const parsed = readPdfPages(buffer);
    assert.equal(parsed.pageCount, 1, "a thin matter must not produce blank extra pages");
    assert.match(parsed.text, /Page 1 of 1/);
  });
}

async function main() {
  await contractExactPageProvenance();
  await contractDocumentRelationships();
  await contractEvidenceState();
  await contractAttribution();
  await contractCrossExit();
  await contractStrategyPdf();
  console.log(`\nmalik-shared-root-remediation-contracts: ${passed} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
