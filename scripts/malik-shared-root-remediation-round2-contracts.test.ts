/**
 * Malik shared-root remediation — Round 2 contracts.
 *
 * Fixture-independent. Proves logical-document segmentation, ranked anchors,
 * fail-closed attribution, relationships-after-segmentation, and cross-exit
 * enforcement. No Malik IDs, names, RF identifiers or truth-key wording.
 *
 * Run: npx tsx scripts/malik-shared-root-remediation-round2-contracts.test.ts
 */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import {
  detectCompiledBundleSegments,
  listBoundaryCandidates,
  readBoundaryTitleFromPage,
  splitPageUnitsIntoLogicalDocuments,
} from "@/lib/criminal/compiled-bundle-segmentation";
import { buildPageUnitsFromCompiledPageTexts } from "@/lib/upload/pdf-page-units";
import {
  bindFindingAnchors,
  buildCanonicalPipelineFromDocumentUnits,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import {
  buildAuthenticatedMatterCanonicalFromDocuments,
  type CaseDocumentRow,
} from "@/lib/criminal/authenticated-matter-canonical";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import {
  buildAttributionModel,
  defendantScopeForLabel,
  isMalformedPersonCandidate,
  looksLikePersonName,
  nameHasNonDefendantRole,
} from "@/lib/criminal/attribution-model";
import {
  isGenericOnlyNeedle,
  rankAnchorsForQuery,
} from "@/lib/criminal/finding-anchor-rank";
import {
  enforceCrossExitConsistency,
} from "@/lib/criminal/cross-exit-contradiction-scanner";
import { buildCanonicalEvidenceState } from "@/lib/criminal/evidence-state-canonical";
import {
  generateCriminalStrategyPdf,
  solicitorReadableLabel,
} from "@/lib/pdf/criminal-strategy-pdf";

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

function page(compiled: number, text: string, source: number | null = null) {
  return {
    pageNumber: source,
    compiledPage: compiled,
    text,
    pageIdentityKnown: true as const,
  };
}

/** Multi-document compiled PDF — invented fixture, no case-specific names. */
function compiledBundlePages(): string[] {
  return [
    "DIGITAL CASE SYSTEM - PROSECUTION CASE PAPERS\nsource page 1 of 1\nIndex of documents.",
    "MG5 - Offence report / case summary\nsource page 1 of 2\nCase summary narrative.",
    "MG5 - Offence report / case summary\nsource page 2 of 2\nFurther summary. Mentions a witness statement later.",
    "INDICTMENT\nsource page 1 of 1\nFIRST INDICTMENT - SUPERSEDED\nCount 1: theft. Alex Rivers is charged on count 1.",
    "INDICTMENT\nsource page 1 of 1\nPROPOSED AMENDED INDICTMENT\nThis amended indictment replaces the original.\nCount 1: robbery. Alex Rivers is charged on count 1.\nCount 2: assault. Blake Quinn is charged on count 2.",
    "MG6 - Disclosure and service record\nsource page 1 of 2\nInterview recording served on papers. Interview transcript incomplete.\nMaster CCTV export outstanding. CCTV clips served on papers.\nFull phone download / source export served.",
    "MG6 continuation - disclosure and service\nsource page 2 of 2\nSee attached: Scene photograph pack. Attachment not on file.",
    "WITNESS STATEMENT\nsource page 1 of 2\nDraft statement (MG11). The person was wearing a blue jacket.\nComplainant Casey Morgan describes the incident.",
    "WITNESS STATEMENT\nsource page 2 of 2\nDraft continuation. No charge allocation here.",
    "WITNESS STATEMENT\nsource page 1 of 1\nFinal signed MG11 statement. The person was wearing a red coat.",
    "Exhibit schedule\nsource page 1 of 2\nExhibit AB/1: kitchen knife recovered at scene.",
    "Exhibit schedule\nsource page 2 of 2\nExhibit AB/1: mobile telephone recovered from vehicle.",
    "NOTICE OF HEARING\nsource page 1 of 1\nDated 1 March 2026. Listed for trial on 14 May 2026.",
    "NOTICE OF HEARING\nsource page 1 of 1\nDated 2 April 2026. The case has been relisted to 9 July 2026.",
    "Custody record extract\nsource page 1 of 1\nCustody arrival 14:05. Interview commenced 14:12. Recorded by Sgt Rowe.",
    "Mobile device extraction and attribution report\nsource page 1 of 1\nThe handset was recovered from Alex Rivers. The account is registered to Blake Quinn. Messages were extracted. Authorship cannot be established.",
    "Clinical record extract\nsource page 1 of 1\nMedical report: soft tissue injury consistent with blunt trauma. Clinical causation discussed. No identification opinion.",
  ];
}

function asUploadedFromCompiled(pageTexts: string[]): UploadedDocumentUnit[] {
  const units = buildPageUnitsFromCompiledPageTexts(pageTexts);
  const drafts = splitPageUnitsIntoLogicalDocuments({
    parentId: "compiled-parent",
    parentTitle: "Compiled case papers",
    pageUnits: units,
  });
  return drafts.map((d, i) => ({
    id: d.id,
    title: d.title,
    documentType: d.documentType,
    uploadOrder: i + 1,
    pages: d.pages,
    fullText: d.pages.map((p) => p.text).join("\f"),
  }));
}

function asCaseDocumentRow(pageTexts: string[], aiUnavailable = false): CaseDocumentRow {
  const units = buildPageUnitsFromCompiledPageTexts(pageTexts);
  const text = units.map((u) => u.text).join("\f");
  return {
    id: "compiled-1",
    name: "Compiled case papers.pdf",
    raw_text: text,
    extracted_text: text,
    updated_at: "2026-04-01T10:00:00Z",
    extracted_json: {
      pages: units.map((u) => ({
        compiledPage: u.compiledPage,
        sourcePage: u.sourcePage,
        text: u.text,
        textLayerEmpty: u.textLayerEmpty,
      })),
      pageCount: units.length,
      ...(aiUnavailable
        ? { aiSummary: null, extractionError: "AI extraction failed: HTTP 429" }
        : { aiSummary: "summary available" }),
    },
  };
}

async function contractSegmentation() {
  section("1-3 — LOGICAL-DOCUMENT SEGMENTATION");
  const pageTexts = compiledBundlePages();
  const units = buildPageUnitsFromCompiledPageTexts(pageTexts);

  await check("multi-document compiled PDF remains multiple logical documents", () => {
    const segments = detectCompiledBundleSegments(units);
    assert.ok(segments.length >= 8, `expected many segments, got ${segments.length}`);
    assert.ok(
      segments.filter((s) => s.identitySupported).length >= 8,
      "supported identities must be present",
    );
    const drafts = splitPageUnitsIntoLogicalDocuments({
      parentId: "p",
      parentTitle: "Compiled",
      pageUnits: units,
    });
    assert.ok(drafts.length >= 8);
    assert.ok(drafts.every((d) => d.pages.every((p) => p.compiledPage > 0)));
  });

  await check("authenticated loader unitCount reflects logical documents, not parent upload", () => {
    const built = buildAuthenticatedMatterCanonicalFromDocuments([
      asCaseDocumentRow(pageTexts),
    ]);
    assert.equal(built.canonical.pageUnitCount, pageTexts.length);
    assert.ok(
      built.canonical.unitCount >= 8,
      `unitCount collapsed to ${built.canonical.unitCount} — segmentation not wired`,
    );
    assert.ok(built.canonical.unitCount > 1);
  });

  await check("HTTP 429 fallback path yields the same logical unitCount", () => {
    const normal = buildAuthenticatedMatterCanonicalFromDocuments([
      asCaseDocumentRow(pageTexts, false),
    ]);
    const fallback = buildAuthenticatedMatterCanonicalFromDocuments([
      asCaseDocumentRow(pageTexts, true),
    ]);
    assert.equal(fallback.canonical.unitCount, normal.canonical.unitCount);
    assert.equal(fallback.canonical.pageUnitCount, normal.canonical.pageUnitCount);
  });

  await check("body mentions do not create false boundaries", () => {
    const units2 = buildPageUnitsFromCompiledPageTexts([
      "Custody record extract\nsource page 1 of 1\nDetainee booked in.",
      "Continuation of custody log.\nThe officer later produced a witness statement, which is exhibited separately.",
    ]);
    const segments = detectCompiledBundleSegments(units2);
    assert.equal(segments.length, 1, "body mention of witness statement must not split");
    assert.equal(readBoundaryTitleFromPage(units2[1]!.text), null);
  });

  await check("continuation pages retain logical identity", () => {
    const units2 = buildPageUnitsFromCompiledPageTexts([
      "WITNESS STATEMENT\nsource page 1 of 3\nPart one.",
      "WITNESS STATEMENT\nsource page 2 of 3\nPart two.",
      "WITNESS STATEMENT\nsource page 3 of 3\nPart three.",
    ]);
    const segments = detectCompiledBundleSegments(units2);
    assert.equal(segments.length, 1);
    assert.equal(segments[0]!.startCompiledPage, 1);
    assert.equal(segments[0]!.endCompiledPage, 3);
    assert.equal(segments[0]!.sourceDocumentType, "statement");
  });

  await check("pagination restart with same form title starts a new logical document", () => {
    const units2 = buildPageUnitsFromCompiledPageTexts([
      "MG5 - Offence report / case summary\nsource page 1 of 2\nA.",
      "MG5 - Offence report / case summary\nsource page 2 of 2\nB.",
      "MG5 - Offence report / case summary\nsource page 1 of 1\nC — new instance.",
    ]);
    const segments = detectCompiledBundleSegments(units2);
    assert.ok(segments.length >= 2, `expected split on pagination restart, got ${segments.length}`);
  });
}

async function contractAnchors() {
  section("4-5 — ANCHOR MATCHING");
  const docs = asUploadedFromCompiled(compiledBundlePages());

  await check("generic terms cannot bind provenance", () => {
    assert.equal(isGenericOnlyNeedle("phone"), true);
    assert.equal(isGenericOnlyNeedle("hearing"), true);
    const ranked = rankAnchorsForQuery(
      docs.flatMap((d) =>
        d.pages.map((p) => ({
          sourceDocumentTitle: d.title,
          sourceDocumentType: d.documentType ?? null,
          sourcePage: p.pageNumber != null ? `p.${p.pageNumber}` : null,
          compiledPage: p.compiledPage != null ? `p.${p.compiledPage}` : null,
          pageIdentityKnown: true,
          text: p.text,
        })),
      ),
      { needle: "phone" },
    );
    assert.equal(ranked.primary, null);
    assert.equal(ranked.unresolved, true);
    assert.match(ranked.limitation ?? "", /generic/i);
  });

  await check("phone finding binds via unique/relationship signals, not a complainant page", () => {
    const bind = bindFindingAnchors(docs, {
      relationshipPhrase: "full phone download",
      needle: "full phone download / source export served",
      preferredDocumentType: "disclosure_record",
      modality: "generic",
    });
    assert.ok(bind.primary, "expected a ranked phone-download anchor");
    assert.ok(
      /disclosure|mg6|service/i.test(
        `${bind.primary!.sourceDocumentTitle} ${bind.primary!.sourceDocumentType}`,
      ),
      `phone finding bound to wrong document: ${bind.primary!.sourceDocumentTitle}`,
    );
    assert.ok(
      !/witness|complainant|casey/i.test(bind.primary!.sourceDocumentTitle),
      "must not bind to complainant statement",
    );
  });

  await check("ambiguous anchors remain unresolved and keep all candidates", () => {
    const bind = bindFindingAnchors(docs, {
      uniqueLabel: "AB/1",
      needle: "Exhibit AB/1",
      preferredDocumentType: "exhibit_list",
    });
    assert.equal(bind.unresolved, true);
    assert.ok(bind.all.length >= 2, "both exhibit pages must be retained");
    assert.match(bind.limitation ?? "", /candidate anchors preserved/i);
  });

  await check("hearing lifecycle binds to the competing notices themselves", () => {
    const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
    assert.ok(pipeline.hearingLifecycle.latest);
    assert.ok(pipeline.hearingLifecycle.superseded.length >= 1);
    assert.equal(pipeline.hearingLifecycle.conflict, true);
    const finding = pipeline.findings.find((f) => f.kind === "hearing_notice_lifecycle");
    assert.ok(finding);
    assert.match(
      `${finding!.provenance.sourceDocumentTitle}`,
      /hearing|notice/i,
    );
  });
}

async function contractAttribution() {
  section("6-8 — ATTRIBUTION FAIL-CLOSED");

  const pages = [
    {
      text: "INDICTMENT\nCount 1: robbery. Alex Rivers is charged on count 1.\nCount 2: assault. Blake Quinn is charged on count 2.",
      sourceDocumentTitle: "Amended indictment",
      sourceDocumentType: "indictment",
      sourcePage: "p.1",
      compiledPage: "p.5",
      pageIdentityKnown: true,
    },
    {
      text: "WITNESS STATEMENT\nComplainant Casey Morgan describes the incident. Officer PC Dale attended. Custody Sgt Rowe booked the detainee.",
      sourceDocumentTitle: "Witness statement",
      sourceDocumentType: "statement",
      sourcePage: "p.1",
      compiledPage: "p.8",
      pageIdentityKnown: true,
    },
    {
      text: "recordedSgt RoweCustody system entry for the detention log.",
      sourceDocumentTitle: "Custody record",
      sourceDocumentType: "custody_record",
      sourcePage: "p.1",
      compiledPage: "p.15",
      pageIdentityKnown: true,
    },
    {
      text: "Northgate Constabulary Digital Forensics Unit report. The handset was recovered from Alex Rivers. The account is registered to Blake Quinn. Messages extracted; authorship cannot be established.",
      sourceDocumentTitle: "Telecoms report",
      sourceDocumentType: "telecoms_report",
      sourcePage: "p.1",
      compiledPage: "p.16",
      pageIdentityKnown: true,
    },
    {
      text: "Evidence schedule: Scene photograph pack served — relates to Alex Rivers only on this page.",
      sourceDocumentTitle: "Disclosure record",
      sourceDocumentType: "disclosure_record",
      sourcePage: "p.2",
      compiledPage: "p.6",
      pageIdentityKnown: true,
    },
  ];

  await check("complainants/officers/organisations are not defendants", () => {
    const model = buildAttributionModel(pages);
    assert.ok(model.defendants.includes("Alex Rivers"));
    assert.ok(model.defendants.includes("Blake Quinn"));
    assert.ok(!model.defendants.includes("Casey Morgan"), "complainant must not enter roster");
    assert.ok(!model.defendants.some((d) => /dale|rowe/i.test(d)), "officers must not enter roster");
    assert.ok(!model.defendants.some((d) => /constabulary|unit/i.test(d)));
  });

  await check("malformed OCR-concatenated names are rejected", () => {
    assert.equal(isMalformedPersonCandidate("recordedSgt RoweCustody system"), true);
    assert.equal(looksLikePersonName("recordedSgt RoweCustody system"), false);
  });

  await check("evidence scope is not broadcast to all rows", () => {
    const model = buildAttributionModel(pages);
    const photoScope = defendantScopeForLabel(
      "Scene photograph pack",
      pages[4]!.text,
      model.defendants,
    );
    assert.deepEqual(photoScope, ["Alex Rivers"]);

    const witnessScope = defendantScopeForLabel(
      "Complainant account",
      pages[1]!.text,
      model.defendants,
    );
    assert.deepEqual(witnessScope, [], "witness page must not inherit case defendants");

    const docs = asUploadedFromCompiled(compiledBundlePages());
    const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
    const scopes = pipeline.evidenceRows.map((r) => r.defendants ?? []);
    const nonEmpty = scopes.filter((s) => s.length > 0).length;
    assert.ok(
      nonEmpty < pipeline.evidenceRows.length || pipeline.evidenceRows.length === 0,
      "must not assign defendants to every evidence row",
    );
    // Specifically: no single name on all rows.
    for (const name of pipeline.attribution.defendants) {
      const onAll =
        pipeline.evidenceRows.length > 0 &&
        pipeline.evidenceRows.every((r) => (r.defendants ?? []).includes(name));
      assert.equal(onAll, false, `${name} was broadcast to all rows`);
    }
  });

  await check("phone ownership/account/authorship remain distinct", () => {
    const model = buildAttributionModel(pages);
    assert.ok(model.deviceOwnership.some((d) => d.person === "Alex Rivers"));
    assert.ok(model.accountAssociation.some((a) => a.person === "Blake Quinn"));
    assert.ok(
      model.messageAuthorship.some((m) => m.basis === "not_established"),
      "absence of express authorship must remain not_established",
    );
    assert.ok(!model.defendants.includes("Casey Morgan"));
  });

  await check("nameHasNonDefendantRole detects complainant/officer spans", () => {
    assert.equal(
      nameHasNonDefendantRole("Casey Morgan", "Complainant Casey Morgan describes the incident."),
      true,
    );
    assert.equal(
      nameHasNonDefendantRole("Alex Rivers", "Alex Rivers is charged on count 1."),
      false,
    );
  });
}

async function contractRelationshipsAndEnforcement() {
  section("9-12 — RELATIONSHIPS AFTER SEGMENTATION + ENFORCEMENT");
  const docs = asUploadedFromCompiled(compiledBundlePages());
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, {
    caseId: "round2-case",
    allegation: "Robbery",
  });
  const { pipeline } = surfaces;

  await check("all relationship models operate after segmentation", () => {
    assert.ok(pipeline.charges.some((c) => c.documentRole === "superseded" || /theft|unresolved/i.test(c.offence)));
    assert.ok(pipeline.charges.some((c) => c.documentRole === "amended" || c.documentRole === "operative"));
    assert.ok(pipeline.findings.some((f) => f.kind === "draft_vs_signed"));
    assert.ok(pipeline.findings.some((f) => f.kind === "referenced_absent_attachment"));
    assert.ok(pipeline.findings.some((f) => f.kind === "exhibit_label_collision"));
    assert.ok(pipeline.findings.some((f) => f.kind === "hearing_notice_lifecycle"));
    assert.ok(pipeline.findings.some((f) => f.kind === "recording_vs_transcript"));
    assert.ok(
      pipeline.evidenceState.items.some((i) => /master/i.test(i.label) && i.state === "missing"),
    );
    assert.ok(
      pipeline.evidenceState.items.some((i) => /clip/i.test(i.label) && i.state === "served"),
    );
    assert.ok(pipeline.suppressedChaseLabels.some((l) => /phone/i.test(l)) ||
      !pipeline.chaseLabels.some((l) => /phone download/i.test(l) && !/full phone/i.test(l)));
  });

  await check("earlier values keep their own compiled-page provenance", () => {
    const superseded = pipeline.charges.find((c) => c.documentRole === "superseded");
    const operative = pipeline.charges.find(
      (c) => c.documentRole === "amended" || c.documentRole === "operative",
    );
    assert.ok(superseded && operative);
    assert.notEqual(superseded!.sourceDocumentTitle, operative!.sourceDocumentTitle);
    assert.ok(superseded!.compiledPage || superseded!.sourcePage || superseded!.pageIdentityKnown);
  });

  await check("contradiction findings actually block/rewrite unsafe exits", () => {
    const evidence = buildCanonicalEvidenceState([
      {
        label: "Interview recording",
        state: "served",
        sourceDocumentTitle: "MG6",
        sourceDocumentType: "disclosure_record",
        sourcePage: "p.1",
        compiledPage: "p.6",
        pageIdentityKnown: true,
      },
      {
        label: "Interview transcript",
        state: "incomplete",
        sourceDocumentTitle: "MG6",
        sourceDocumentType: "disclosure_record",
        sourcePage: "p.1",
        compiledPage: "p.6",
        pageIdentityKnown: true,
      },
      {
        label: "Master CCTV export",
        state: "missing",
        sourceDocumentTitle: "MG6",
        sourceDocumentType: "disclosure_record",
        sourcePage: "p.1",
        compiledPage: "p.6",
        pageIdentityKnown: true,
      },
      {
        label: "CCTV clips",
        state: "served",
        sourceDocumentTitle: "MG6",
        sourceDocumentType: "disclosure_record",
        sourcePage: "p.1",
        compiledPage: "p.6",
        pageIdentityKnown: true,
      },
    ]);

    const enforcement = enforceCrossExitConsistency(
      [
        {
          exit: "disclosure_chase",
          texts: [
            "Please provide the interview recording — it is outstanding.",
            "The master CCTV export has been served and is complete.",
          ],
          limitations: [],
        },
        {
          exit: "strategy",
          texts: [
            "PACE is OK and there was no breach.",
            "Identification is strong on the medical report.",
            "We advise considering a guilty plea at the next hearing.",
          ],
          limitations: [],
        },
      ],
      {
        evidence,
        requiredLimitations: [],
        support: { identification: false, intent: false, pleaAdvice: false, medicalInjury: true },
        paceConflict: true,
        attributionEstablished: false,
      },
    );

    assert.ok(enforcement.actions.length >= 3, "expected enforcement actions");
    const joined = enforcement.sanitizedExits.flatMap((e) => e.texts).join("\n");
    assert.ok(!/PACE is OK/i.test(joined), "PACE SAFE must be removed");
    assert.ok(!/Identification is strong/i.test(joined));
    assert.ok(!/guilty plea/i.test(joined));
    assert.ok(!/master CCTV export has been served/i.test(joined));
    assert.match(joined, /PACE status is unknown|conflicted/i);
  });

  await check("PACE UNKNOWN can never become SAFE on live surfaces", () => {
    const conflictDocs: UploadedDocumentUnit[] = [
      {
        id: "custody",
        title: "Custody record extract",
        documentType: "custody_record",
        uploadOrder: 1,
        pages: [
          page(1, "Custody record extract\nCustody arrival 15:00. Interview commenced 14:10.", 1),
        ],
      },
    ];
    const live = buildLiveProductionSurfacesFromDocumentUnits(conflictDocs);
    const clock = live.pipeline.findings.find((f) => f.kind === "custody_interview_clock");
    assert.ok(clock?.custodyInterviewClock?.conflict);
    const allText = [
      ...live.composedProse.limitations,
      live.composedProse.courtLine ?? "",
      ...live.copyLines.map((c) => c.text),
    ].join("\n");
    assert.ok(!/\bPACE\s+is\s+OK\b/i.test(allText));
    assert.ok(!/\bno\s+breach\b/i.test(allText));
  });

  await check("medical limitations cannot be contradicted by recommendation prose", () => {
    const enforcement = enforceCrossExitConsistency(
      [
        {
          exit: "strategy",
          texts: [
            "The medical report confirms identification of the defendant and proves intent.",
          ],
          limitations: [
            "Medical material may support injury or clinical causation where sourced; it does not establish identification or intent.",
          ],
        },
      ],
      {
        evidence: buildCanonicalEvidenceState([
          {
            label: "Medical report",
            state: "served",
            sourceDocumentTitle: "Clinical record",
            sourceDocumentType: "medical_report",
            sourcePage: "p.1",
            compiledPage: "p.17",
            pageIdentityKnown: true,
          },
        ]),
        requiredLimitations: [
          "Medical material may support injury or clinical causation where sourced; it does not establish identification or intent.",
        ],
        support: { identification: false, intent: false, pleaAdvice: false, medicalInjury: true },
      },
    );
    assert.ok(enforcement.actions.some((a) => a.code === "medical_overreach"));
    assert.match(
      enforcement.sanitizedExits[0]!.texts.join(" "),
      /does not establish identification or intent/i,
    );
  });

  await check("live production surfaces apply enforcement to chase items", () => {
    assert.ok(
      !surfaces.disclosureChase.items.some(
        (i) => /recording/i.test(i.label) && !/transcript/i.test(i.label),
      ),
      "served recording must not remain as a chase item after enforcement",
    );
    assert.equal(Array.isArray(surfaces.crossExitEnforcement), true);
  });
}

async function contractStrategyPdf() {
  section("13 — STRATEGY PDF");
  const docs = asUploadedFromCompiled(compiledBundlePages());
  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs);

  await check("solicitor-readable labels replace machine tokens", () => {
    assert.equal(solicitorReadableLabel("disclosure_chase"), "Disclosure chase");
    assert.equal(solicitorReadableLabel("not_safely_confirmed"), "Not safely confirmed");
    assert.match(solicitorReadableLabel("master_media"), /Master media/i);
  });

  await check("strategy PDF uses canonical charge/hearing and readable labels", async () => {
    const operative = surfaces.charges.find(
      (c) => c.documentRole === "amended" || c.documentRole === "operative",
    );
    const buffer = await generateCriminalStrategyPdf({
      caseId: "round2",
      title: "Round 2 matter",
      generatedAt: new Date("2026-04-01T12:00:00Z").toISOString(),
      offenceLabel: operative?.offence ?? surfaces.charges[0]?.offence ?? "Under review",
      nextHearingType: "Case management",
      nextHearingDate: surfaces.pipeline.hearingLifecycle.latest?.hearingDateIso ?? "2026-07-09",
      hearingLifecycleNote: surfaces.pipeline.hearingLifecycle.conflictDescription,
      primaryStrategy: "disclosure_chase",
      charges: surfaces.charges.map((c) => ({
        count: c.count,
        offence: c.offence,
        defendants: c.defendants ?? [],
        documentRole: c.documentRole,
        status: c.status,
        sourceLabel: c.sourceDocumentTitle,
      })),
      pressurePoints: [{ label: "master_media", reason: "Outstanding on papers" }],
      provenanceLimitations: surfaces.pdf.limitations.slice(0, 8),
    });
    assert.equal(buffer.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.ok(buffer.length > 1000);
  });
}

async function main() {
  await contractSegmentation();
  await contractAnchors();
  await contractAttribution();
  await contractRelationshipsAndEnforcement();
  await contractStrategyPdf();
  console.log(`\nmalik-shared-root-remediation-round2-contracts: ${passed} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
