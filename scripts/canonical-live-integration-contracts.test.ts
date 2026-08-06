/**
 * Live integration + adversarial contracts.
 * Calls real production builders via buildLiveProductionSurfacesFromDocumentUnits —
 * not a parallel synthetic surfacePayload.
 *
 * Run: npx tsx scripts/canonical-live-integration-contracts.test.ts
 */
import assert from "node:assert/strict";

import { buildCanonicalMatterStateV1 } from "@/lib/criminal/canonical-matter-state";
import {
  buildCanonicalPipelineFromDocumentUnits,
  findPageAnchorsForText,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import {
  analyseCustodyInterviewClocks,
  observeTimestampsFromPage,
} from "@/lib/criminal/timestamp-chronology";
import {
  compareOperativePrecedence,
  resolveOperativeDocumentPrecedence,
  buildDocumentRelationshipNode,
} from "@/lib/criminal/document-relationship-model";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function fixtureDocuments(): UploadedDocumentUnit[] {
  return [
    {
      id: "doc-indictment-original",
      title: "Original indictment",
      documentType: "indictment",
      documentDate: "2024-01-10",
      versionNumber: 1,
      uploadOrder: 1,
      pages: [
        {
          pageNumber: 2,
          compiledPage: 2,
          text: "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968. Particulars: On 1 January 2024 stole a wallet.",
        },
      ],
      // fullText present MUST NOT discard page units for provenance
      fullText:
        "Original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8 Theft Act 1968. Particulars: On 1 January 2024 stole a wallet.",
    },
    {
      id: "doc-indictment-amended",
      title: "Amended indictment",
      documentType: "indictment",
      documentDate: "2024-03-01",
      versionNumber: 2,
      replacesDocumentId: "doc-indictment-original",
      uploadOrder: 5,
      pages: [
        {
          pageNumber: 14,
          compiledPage: 14,
          text: "Amended indictment (version 2) dated 1 March 2024. Replaces original indictment. Count 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968. Particulars: On 1 January 2024 at High Street stole a wallet from V.",
        },
      ],
    },
    {
      id: "doc-draft-mg11",
      title: "Draft MG11 complainant statement",
      documentType: "statement",
      uploadOrder: 2,
      pages: [
        {
          pageNumber: 20,
          text: "Draft statement. The complainant was wearing a blue jacket. Location: High Street.",
        },
      ],
    },
    {
      id: "doc-signed-mg11",
      title: "Final signed MG11 complainant statement",
      documentType: "statement",
      uploadOrder: 3,
      pages: [
        {
          pageNumber: 22,
          text: "Final signed MG11. The complainant was wearing a red coat. Location: High Street.",
        },
      ],
    },
    {
      id: "doc-custody",
      title: "Custody and interview record",
      documentType: "custody_record",
      uploadOrder: 4,
      pages: [
        {
          pageNumber: 40,
          compiledPage: 97,
          text: [
            "Custody arrival at 14:05.",
            "Interview recording served.",
            "Interview transcript incomplete.",
            "Interview commenced at 14:12 after caution.",
            "See attached: Full phone download pack. Attachment not on file.",
          ].join("\n"),
        },
      ],
    },
    {
      id: "doc-exhibits",
      title: "Exhibit list",
      documentType: "exhibit_list",
      uploadOrder: 6,
      pages: [
        {
          pageNumber: 80,
          text: [
            "Exhibit EX/1 Kitchen knife recovered from scene.",
            "Exhibit EX/1 Mobile phone handset.",
            "CCTV stills served. Master CCTV export outstanding.",
            "Full phone download / source export served on papers.",
            "BWV footage served.",
          ].join("\n"),
        },
      ],
    },
  ];
}

console.log("Clock negatives / scoped conflicts");
check("normal custody-then-interview sequence is NOT flagged", () => {
  const obs = observeTimestampsFromPage({
    text: "Custody arrival at 14:05.\nInterview commenced at 14:12.",
    sourceDocumentTitle: "Custody record",
    sourcePage: "p.40",
  });
  const analysis = analyseCustodyInterviewClocks(obs);
  assert.equal(analysis.conflict, false);
  assert.equal(analysis.impossibleChronology.length, 0);
  assert.equal(analysis.sameEventConflicts.length, 0);
});

check("competing timestamps for the SAME event ARE flagged", () => {
  const obs = [
    ...observeTimestampsFromPage({
      text: "Custody arrival at 14:05.",
      sourceDocumentTitle: "Custody log A",
      sourcePage: "p.1",
    }),
    ...observeTimestampsFromPage({
      text: "Custody arrival at 14:20.",
      sourceDocumentTitle: "Custody log B",
      sourcePage: "p.2",
    }),
  ];
  const analysis = analyseCustodyInterviewClocks(obs);
  assert.equal(analysis.conflict, true);
  assert.ok(analysis.sameEventConflicts.length >= 1);
  assert.ok(analysis.sameEventConflicts[0]!.observations.every((o) => o.sourceDocumentTitle));
  assert.ok(analysis.sameEventConflicts[0]!.observations.every((o) => o.sourcePage));
});

check("interview before custody arrival is impossible chronology", () => {
  const obs = observeTimestampsFromPage({
    text: "Interview commenced at 13:50.\nCustody arrival at 14:05.",
    sourceDocumentTitle: "Custody record",
    sourcePage: "p.40",
  });
  const analysis = analyseCustodyInterviewClocks(obs);
  assert.equal(analysis.conflict, true);
  assert.ok(analysis.impossibleChronology.length >= 1);
});

console.log("Operative precedence");
check("latest amended instrument is operative; earlier remains superseded (not array order)", () => {
  const amendedFirst = [
    buildDocumentRelationshipNode({
      id: "amended",
      title: "Amended indictment",
      documentType: "indictment",
      haystack: "amended indictment version 2",
      documentDate: "2024-03-01",
      versionNumber: 2,
      replacesDocumentId: "original",
      uploadOrder: 99,
    }),
    buildDocumentRelationshipNode({
      id: "original",
      title: "Original indictment",
      documentType: "indictment",
      haystack: "original indictment superseded",
      documentDate: "2024-01-10",
      versionNumber: 1,
      uploadOrder: 1,
    }),
  ];
  const reversed = [...amendedFirst].reverse();
  const a = resolveOperativeDocumentPrecedence(amendedFirst);
  const b = resolveOperativeDocumentPrecedence(reversed);
  assert.equal(a.operative?.id, "amended");
  assert.equal(b.operative?.id, "amended");
  assert.ok(a.superseded.some((n) => n.id === "original"));
  assert.ok(b.superseded.some((n) => n.id === "original"));
  assert.ok(compareOperativePrecedence(a.operative!, a.superseded[0]!) > 0);
});

console.log("Live multi-document pipeline → real production builders");
check("integration: production builders contain required relationship findings", () => {
  const docs = fixtureDocuments();
  const live = buildLiveProductionSurfacesFromDocumentUnits(docs, {
    caseId: "integration-case",
    allegation: "Robbery",
  });
  const { pipeline, charges, keyFacts, truthMap, disclosureChase, warRoom, controlRoom, composedProse, api, matterState } =
    live;

  // Operative + superseded charges — independently extracted
  const roles = charges.map((c) => c.documentRole);
  assert.ok(
    roles.some((r) => r === "operative" || r === "amended"),
    `expected operative/amended charge, got ${roles.join(",")}`,
  );
  assert.ok(roles.some((r) => r === "superseded"), `expected superseded charge, got ${roles.join(",")}`);
  const operative = charges.find((c) => c.documentRole === "amended" || c.documentRole === "operative")!;
  const superseded = charges.find((c) => c.documentRole === "superseded")!;
  assert.notEqual(
    operative.sourceDocumentTitle,
    superseded.sourceDocumentTitle,
    "operative and superseded must bind different instruments",
  );
  assert.ok(
    /robbery/i.test(superseded.offence) || /unresolved/i.test(superseded.offence),
    "superseded wording must come from earlier instrument or be explicitly unresolved",
  );
  assert.ok(
    superseded.offence !== operative.offence ||
      superseded.sourcePage !== operative.sourcePage ||
      /unresolved/i.test(superseded.offence),
    "must not be a silent clone of the operative charge",
  );

  // Draft/signed via Key Facts (real builder path)
  const keyEvidenceText = [
    ...keyFacts.evidence.map((f) => f.text),
    ...keyFacts.risks.map((f) => f.text),
    ...keyFacts.disclosure.map((f) => f.text),
  ].join("\n");
  assert.ok(
    /draft|clothing|blue|red|signed/i.test(keyEvidenceText),
    "draft/signed clothing change missing from key facts",
  );
  assert.ok(pipeline.findings.some((f) => f.kind === "draft_vs_signed" && f.earlierValuesPreserved?.length));

  // Recording served / transcript incomplete on truth map (Five Answers builder)
  assert.ok(
    truthMap.evidenceState.rows.some((r) => /recording/i.test(r.label) && r.existence === "served"),
    "truth map missing served interview recording",
  );
  assert.ok(
    truthMap.evidenceState.rows.some((r) => /transcript/i.test(r.label) && r.existence === "incomplete"),
    "truth map missing incomplete transcript",
  );

  assert.ok(
    pipeline.findings.some((f) => f.kind === "referenced_absent_attachment"),
    "referenced-absent attachment finding missing",
  );
  assert.ok(
    pipeline.findings.some((f) => f.kind === "exhibit_label_collision"),
    "exhibit collision finding missing",
  );

  // Served alias suppression: production matter state with a real chase request
  // (not adapter-injected probes) drops phone when full phone download is served.
  assert.ok(
    live.pipeline.evidenceRows.some(
      (r) => /full phone download/i.test(r.label) && r.existence === "served",
    ),
    "fixture must derive served full phone download from pages",
  );
  const matterWithPhoneChase = buildCanonicalMatterStateV1({
    caseId: "integration-case",
    allegation: "Robbery",
    evidenceRows: pipeline.evidenceRows.map((r) => ({
      label: r.label,
      existence: r.existence as
        | "served"
        | "missing"
        | "incomplete"
        | "referred_only"
        | "not_safely_confirmed"
        | "unknown",
      reliability: "needs_review" as const,
      note: r.note ?? undefined,
    })),
    chaseItems: [
      { label: "Phone download / source export", baseStatus: "Outstanding" },
      { label: "Master CCTV export", baseStatus: "Outstanding" },
    ],
    documents: docs,
  });
  assert.ok(
    !matterWithPhoneChase.chase.items.some((c) => /phone download/i.test(c.label)),
    "served phone alias must not remain as chase item on matter state",
  );
  assert.ok(
    !disclosureChase.items.some((i) => /phone download/i.test(i.label) && !/full phone/i.test(i.label)),
    "disclosure chase must suppress phone alias when full phone download served",
  );

  // Clock: normal custody-then-interview must NOT be a scoped conflict
  const clockFinding = pipeline.findings.find((f) => f.kind === "custody_interview_clock");
  assert.ok(clockFinding);
  assert.equal(
    clockFinding!.custodyInterviewClock?.conflict,
    false,
    "normal custody@14:05 then interview@14:12 must not be flagged as conflict",
  );

  assert.ok(matterState.documentRelationships.operativeDocumentId === "doc-indictment-amended");
  assert.ok(matterState.documentRelationships.supersededDocumentIds.includes("doc-indictment-original"));
  assert.ok(matterState.findings.length >= 3);

  // Real War Room / Control Room / copy / API / composed prose
  assert.ok(
    warRoom.doNotOverstate.some((l) => /draft|recording|exhibit|attachment|clock|document/i.test(l)) ||
      warRoom.collapseRisks.some((l) => /draft|recording|exhibit|attachment|clock|document/i.test(l)),
    "War Room must render canonical findings",
  );
  assert.ok(controlRoom.findings.length > 0);
  assert.ok(live.copyLines.every((l) => l.provenanceLine));
  assert.ok(api.findings.length > 0);
  assert.ok(api.documentRoles.some((d) => d.role === "amended" || d.role === "operative"));
  assert.ok(api.documentRoles.some((d) => d.role === "superseded"));
  assert.ok(composedProse.clientDisclaimer.includes("Provenance"));
  assert.ok(live.exportPack.sections.length > 0);
});

check("impossible chronology propagates as unresolved clock finding on live matter state", () => {
  const docs = fixtureDocuments().map((d) => {
    if (d.id !== "doc-custody") return d;
    return {
      ...d,
      pages: [
        {
          pageNumber: 40,
          compiledPage: 97,
          text: "Interview commenced at 13:50.\nCustody arrival at 14:05.\nInterview recording served.\nInterview transcript incomplete.",
        },
      ],
    };
  });
  const matter = buildCanonicalMatterStateV1({
    evidenceRows: [],
    chaseItems: [],
    documents: docs,
  });
  const clock = matter.findings.find((f) => f.kind === "custody_interview_clock");
  assert.ok(clock);
  assert.equal(clock!.unresolved, true);
  assert.ok(/before custody arrival|13:50|14:05|impossible|commenced/i.test(clock!.summary));
});

console.log("Adversarial integration");
check("bundle without BWV/recording/phone/CCTV does not create served rows", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "bare-1",
      title: "Cover letter",
      documentType: "case_document",
      uploadOrder: 1,
      pages: [{ pageNumber: 1, text: "Dear Sirs, please find enclosed the papers for this matter. No schedules attached." }],
    },
    {
      id: "bare-2",
      title: "Case outline",
      documentType: "case_document",
      uploadOrder: 2,
      pages: [{ pageNumber: 2, text: "The defendant faces one count. Directions are sought." }],
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const servedMedia = pipeline.evidenceRows.filter(
    (r) =>
      r.existence === "served" &&
      /\b(bwv|recording|phone|cctv|footage|download)\b/i.test(r.label),
  );
  assert.equal(
    servedMedia.length,
    0,
    `must not invent served media rows, got: ${servedMedia.map((r) => r.label).join(", ")}`,
  );
});

check("operative charge is never copied into an earlier instrument", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "earlier",
      title: "Original indictment",
      documentType: "indictment",
      documentDate: "2024-01-01",
      versionNumber: 1,
      uploadOrder: 1,
      pages: [
        {
          pageNumber: 3,
          text: "Original indictment. This instrument is superseded. No extractable count particulars appear on this page alone.",
        },
      ],
    },
    {
      id: "later",
      title: "Amended indictment",
      documentType: "indictment",
      documentDate: "2024-06-01",
      versionNumber: 2,
      replacesDocumentId: "earlier",
      uploadOrder: 2,
      pages: [
        {
          pageNumber: 10,
          text: "Amended indictment. Count 1: Jordan Vale is charged with wounding with intent contrary to section 18 Offences Against the Person Act 1861. Particulars: On 2 Feb 2024 at Dock Road caused GBH to V.",
        },
      ],
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const operative = pipeline.charges.find((c) => c.documentRole === "amended" || c.documentRole === "operative");
  const earlier = pipeline.charges.find((c) => c.documentRole === "superseded");
  assert.ok(operative, "operative charge required");
  assert.ok(earlier, "earlier instrument must still appear");
  assert.ok(/wounding|section 18/i.test(operative!.offence));
  assert.ok(
    /unresolved/i.test(earlier!.offence) || !/wounding with intent|section 18/i.test(earlier!.offence),
    "must not clone operative wounding charge onto earlier instrument",
  );
  assert.equal(earlier!.sourceDocumentTitle, "Original indictment");
  assert.notEqual(earlier!.sourceDocumentTitle, operative!.sourceDocumentTitle);
});

check("finding on page 19 is not attributed to page 1", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "multi",
      title: "Multi-page custody pack",
      documentType: "custody_record",
      uploadOrder: 1,
      fullText: "Cover sheet only. Real content is on later pages.",
      pages: [
        { pageNumber: 1, text: "Cover sheet. Index only." },
        {
          pageNumber: 19,
          text: "Interview recording served. Interview transcript incomplete. Custody arrival at 09:00. Interview commenced at 09:20.",
        },
      ],
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  const rt = pipeline.findings.find((f) => f.kind === "recording_vs_transcript");
  assert.ok(rt, "recording/transcript finding required");
  assert.ok(rt!.provenance.sourcePage);
  assert.match(rt!.provenance.sourcePage!, /p\.19/);
  assert.doesNotMatch(rt!.provenance.sourcePage!, /^p\.1$/);
  const anchors = findPageAnchorsForText(docs[0]!, /interview recording served/i);
  assert.ok(anchors.every((a) => a.pageNumber === 19));
  assert.ok(!anchors.some((a) => a.pageNumber === 1));
});

check("actual production builders receive and render the same canonical finding", () => {
  const docs = fixtureDocuments();
  const live = buildLiveProductionSurfacesFromDocumentUnits(docs);
  const draftFinding = live.pipeline.findings.find((f) => f.kind === "draft_vs_signed");
  assert.ok(draftFinding);
  const rendered =
    live.warRoom.doNotOverstate.join("\n") +
    "\n" +
    live.warRoom.collapseRisks.join("\n") +
    "\n" +
    live.keyFacts.evidence.map((e) => e.text).join("\n") +
    "\n" +
    live.controlRoom.findings.map((f) => f.summary).join("\n") +
    "\n" +
    live.api.findings.map((f) => f.summary).join("\n");
  assert.ok(
    rendered.includes(draftFinding!.summary) ||
      rendered.toLowerCase().includes("draft versus signed") ||
      /blue|red|clothing/i.test(rendered),
    "draft/signed finding must appear in War Room / Key Facts / Control Room / API from the same canonical finding",
  );
  assert.ok(
    live.controlRoom.findings.some((f) => f.kind === draftFinding!.kind),
    "Control Room findings must be the serialized canonical findings",
  );
});

check("absent relationship stays unresolved rather than being manufactured", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "thin",
      title: "Thin papers",
      documentType: "case_document",
      uploadOrder: 1,
      pages: [{ pageNumber: 5, text: "Directions hearing listed. No attachments referenced." }],
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(docs);
  assert.equal(
    pipeline.findings.filter((f) => f.kind === "referenced_absent_attachment").length,
    0,
    "must not manufacture absent-attachment findings",
  );
  assert.equal(
    pipeline.findings.filter((f) => f.kind === "recording_vs_transcript").length,
    0,
    "must not manufacture recording/transcript findings",
  );
  assert.equal(
    pipeline.findings.filter((f) => f.kind === "exhibit_label_collision").length,
    0,
    "must not manufacture exhibit collisions",
  );
  // Document role finding may still be absent (no charge instrument). Absence → unresolved, not invented served media.
  assert.ok(pipeline.evidenceRows.every((r) => r.sourcePage != null));
});

console.log(`\ncanonical-live-integration-contracts: ${passed} checks passed`);
