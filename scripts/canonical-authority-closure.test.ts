#!/usr/bin/env npx tsx
/**
 * Canonical Authority Closure + Final Exit Closure invariants:
 * - CB-HIST-PRESENTATION-CANNOT-CREATE-EVIDENCE-STATE
 * - CB-HIST-PRESENTATION-MUST-PRESERVE-SEMANTICS
 * - CB-HIST-NO-CASE-IDENTITY-TRUTH-BRANCH
 * - CB-HIST-ALL-SURFACES-SHARE-RECONCILED-EVIDENCE-AUTHORITY
 * - CB-HIST-NSC-NOT-INCOMPLETE
 * - CB-HIST-EMPTY-CANONICAL-STATE-MUST-NOT-REHYDRATE-FROM-CHASE
 * - CB-HIST-NO-SOLICITOR-EXIT-MAY-REBUILD-EVIDENCE-FROM-CHASE
 * - CB-HIST-CANONICAL-AUTHORITY-MUST-PRESERVE-PROVENANCE
 * - CB-HIST-PRESENTATION-CANNOT-SUPPRESS-SOURCE-BACKED-FAMILY
 * - extracted_json-only ingest
 * - tenant existence isolation (lookup contract)
 *
 * Run: npx tsx scripts/canonical-authority-closure.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { expandTruthMapRowsForDisplay } from "../lib/criminal/five-answers/expand-truth-map-rows";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { evidenceRowFromSourceState } from "../lib/criminal/five-answers/evidence-trace";
import { countAuthoritativeEvidenceRows } from "../lib/criminal/overview-presentation";
import {
  displayChaseCardLabel,
  polishPresentationBlock,
  polishPresentationLine,
} from "../lib/criminal/demo-presentation-polish";
import {
  resolveWorkflowProfile,
  resolveWorkflowProfileFromSignals,
  resolveExplicitDemoFixtureFromContext,
} from "../lib/criminal/pilot-workflow";
import {
  EXISTENCE_MAPPING_POLICY_ID,
  mapRawExistenceToCanonical,
  buildCanonicalMatterStateV1,
} from "../lib/criminal/canonical-matter-state";
import { displayExistenceLabel } from "../lib/criminal/five-answers/display-labels";
import { buildLiveProductionSurfacesFromDocumentUnits } from "../lib/criminal/canonical-live-surface-adapter";
import { buildHearingMode } from "../lib/criminal/hearing-mode/build-hearing-mode";
import { buildExportPack } from "../lib/criminal/export-pack/build-export-pack";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import {
  mapCaseDocumentsToUploadedUnits,
  type CaseDocumentRow,
} from "../lib/criminal/authenticated-matter-canonical";
import { HISTORICAL_INVARIANTS } from "../lib/eval/master3000-quality/invariants";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { FiveAnswersEvidenceRow } from "../lib/criminal/five-answers/types";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const requiredIds = [
  "CB-HIST-PRESENTATION-CANNOT-CREATE-EVIDENCE-STATE",
  "CB-HIST-PRESENTATION-MUST-PRESERVE-SEMANTICS",
  "CB-HIST-NO-CASE-IDENTITY-TRUTH-BRANCH",
  "CB-HIST-ALL-SURFACES-SHARE-RECONCILED-EVIDENCE-AUTHORITY",
  "CB-HIST-NSC-NOT-INCOMPLETE",
  "CB-HIST-EMPTY-CANONICAL-STATE-MUST-NOT-REHYDRATE-FROM-CHASE",
  "CB-HIST-NO-SOLICITOR-EXIT-MAY-REBUILD-EVIDENCE-FROM-CHASE",
  "CB-HIST-CANONICAL-AUTHORITY-MUST-PRESERVE-PROVENANCE",
  "CB-HIST-PRESENTATION-CANNOT-SUPPRESS-SOURCE-BACKED-FAMILY",
  "CB-HIST-AUTHENTICATED-CANONICAL-FAILURE-MUST-NOT-FALLBACK-TO-CHASE-TRUTH",
];
for (const id of requiredIds) {
  assert.ok(
    HISTORICAL_INVARIANTS.some((i) => i.id === id),
    `missing invariant registry entry: ${id}`,
  );
}

function stubChase(primaryItems: DisclosureChaseBrief["primaryItems"]): DisclosureChaseBrief {
  return {
    primaryItems,
    items: primaryItems,
    additionalItems: [],
    disclosureSummary: "fixture",
    safeCourtLine: "Court note provisional",
  } as unknown as DisclosureChaseBrief;
}

function stubWarRoom(): HearingWarRoomBrief {
  return {
    safePositionToday: "Provisional court position",
    doNotOverstate: [],
    sayThis: [],
    instructionsNeeded: [],
    bundleContradictions: [],
  } as unknown as HearingWarRoomBrief;
}

// --- Presentation cannot invent evidence ---
{
  const rows = [evidenceRowFromSourceState("Screenshot / message pack", "served")];
  const out = expandTruthMapRowsForDisplay({
    rows,
    chase: stubChase([]),
    allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    doNotOverstate: [],
  });
  assert.equal(out.length, rows.length);
  assert.ok(!out.some((r) => /phone download/i.test(r.label)));
}

// --- Presentation must preserve semantics ---
{
  const polished = polishPresentationLine(
    "MG6 / unused schedule clarification appears outstanding on the current papers. remains outstanding",
    "harassment phone screenshot",
  );
  assert.match(polished, /MG6|unused schedule/i);
  assert.ok(!/phone download|source export/i.test(polished));
  assert.match(polishPresentationLine("appears outstanding on the current papers. remains outstanding"), /appears outstanding/);
}

// --- Case identity cannot create production truth ---
{
  assert.equal(
    resolveWorkflowProfile({
      caseTitle: "R v Marcus Vale",
      allegation: "Offence wording not safely extracted",
    }),
    "generic",
    "name alone must not force fraud profile",
  );
  assert.equal(
    resolveWorkflowProfile({
      caseTitle: "R v Marcus Vale",
      allegation: "Offence wording not safely extracted",
      profileHint: "fraud_account_control",
    }),
    "fraud_account_control",
    "explicit profileHint still works (eval/demo adapter)",
  );
  assert.equal(
    resolveExplicitDemoFixtureFromContext({ caseTitle: "R v Marcus Vale" }),
    "fraud_account_control",
    "explicit demo adapter remains available for eval harnesses",
  );
  assert.equal(
    resolveWorkflowProfileFromSignals({
      caseTitle: "Criminal matter",
      allegation: "Fraud by false representation — account takeover",
      bundleText: "bank transfer false representation account credentials",
    }),
    "fraud_account_control",
  );
}

// --- NSC ≠ incomplete ---
{
  assert.equal(EXISTENCE_MAPPING_POLICY_ID, "canonical-existence-map@1.2.0");
  assert.equal(mapRawExistenceToCanonical("not_safely_confirmed"), "not_safely_confirmed");
  assert.equal(mapRawExistenceToCanonical("incomplete"), "incomplete");
  assert.equal(displayExistenceLabel("not_safely_confirmed"), "Not safely confirmed");
  assert.equal(displayExistenceLabel("incomplete"), "Incomplete");

  const nscOnly = buildCanonicalMatterStateV1({
    evidenceRows: [evidenceRowFromSourceState("Complainant MG11", "not_safely_confirmed")],
    chaseItems: [],
  });
  assert.equal(nscOnly.evidence.counts.notSafelyConfirmed, 1);
  assert.equal(nscOnly.evidence.counts.incomplete, 0);
  assert.equal(nscOnly.mg11.status, "not_safely_confirmed");

  const incompleteOnly = buildCanonicalMatterStateV1({
    evidenceRows: [evidenceRowFromSourceState("Partial complainant MG11", "incomplete")],
    chaseItems: [],
  });
  assert.equal(incompleteOnly.evidence.counts.incomplete, 1);
  assert.equal(incompleteOnly.evidence.counts.notSafelyConfirmed, 0);
  assert.equal(incompleteOnly.mg11.status, "draft_or_unsigned");
}

// --- CB-HIST-EMPTY-CANONICAL-STATE-MUST-NOT-REHYDRATE-FROM-CHASE ---
{
  const chase = stubChase([
    {
      label: "Master CCTV footage",
      baseStatus: "Outstanding",
      whyItMatters: "Needed for continuity",
      draftChaseWording: "Please provide Master CCTV footage",
      source: "MG6",
    } as DisclosureChaseBrief["primaryItems"][number],
  ]);
  const warRoom = stubWarRoom();

  const emptyCanonical = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: [],
  });
  assert.equal(
    emptyCanonical.evidenceState.rows.length,
    0,
    "authoritative empty array must preserve zero rows",
  );

  const legacy = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: undefined,
  });
  assert.ok(
    legacy.evidenceState.rows.some((r) => /master cctv/i.test(r.label)),
    "undefined override remains the legacy chase-derived path",
  );

  // Opposite: genuinely supplied canonical outstanding evidence still renders.
  const outstanding: FiveAnswersEvidenceRow[] = [
    evidenceRowFromSourceState("Master CCTV footage", "missing"),
  ];
  const withCanonical = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: outstanding,
  });
  assert.equal(withCanonical.evidenceState.rows.length, 1);
  assert.equal(withCanonical.evidenceState.rows[0]!.existence, "missing");
  assert.match(withCanonical.evidenceState.rows[0]!.label, /master cctv/i);

  // Live Chromium defect: Overview counters were derived from a 12-row truncate of
  // canonical evidence — large bundles (e.g. Priya 74 / Leon 122) under-counted.
  const largeCanonical: FiveAnswersEvidenceRow[] = Array.from({ length: 40 }, (_, i) =>
    evidenceRowFromSourceState(
      i < 25 ? `Served exhibit ${i + 1}` : `Missing exhibit ${i + 1}`,
      i < 25 ? "served" : "missing",
    ),
  );
  const largeView = buildFiveAnswersView({
    allegation: "Assault occasioning actual bodily harm, s.47 OAPA 1861",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: largeCanonical,
  });
  assert.equal(
    largeView.evidenceState.rows.length,
    40,
    "canonical evidence override must not truncate before Overview counts",
  );
  assert.equal(
    largeView.evidenceState.rows.filter((r) => r.existence === "served").length,
    25,
  );
  assert.equal(
    largeView.evidenceState.rows.filter((r) => r.existence === "missing").length,
    15,
  );

  const overviewTotals = countAuthoritativeEvidenceRows(largeView.evidenceState.rows);
  assert.deepEqual(overviewTotals, {
    served: 25,
    referred: 0,
    missing: 15,
    incomplete: 0,
    notSafelyConfirmed: 0,
  });
}

// --- Clip/master + recording/transcript exact states across exits ---
{
  const docs = [
    {
      id: "u1",
      title: "MG6 schedule",
      documentType: "disclosure_schedule",
      uploadOrder: 1,
      pages: [
        {
          pageNumber: 1,
          compiledPage: 1,
          text: [
            "Charge: Robbery.",
            "CCTV clip AV/1 served on papers.",
            "Master CCTV footage outstanding — not attached.",
            "Interview recording served.",
            "Interview transcript outstanding — not served.",
          ].join("\n"),
          pageIdentityKnown: true,
        },
      ],
      fullText: "",
    },
  ];
  docs[0]!.fullText = docs[0]!.pages.map((p) => p.text).join("\n");

  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(docs, {
    caseId: "authority-clip-master",
    allegation: "Robbery",
  });

  const five = surfaces.truthMap.evidenceState.rows;
  const matter = surfaces.matterState.evidence.items;
  const chaseItems = surfaces.disclosureChase.items;
  const chaseLabels = chaseItems.map((i) => i.label).join(" | ");

  const findState = (
    rows: Array<{ label: string; existence?: string; state?: string }>,
    re: RegExp,
  ): string => {
    const hit = rows.find((r) => re.test(r.label));
    assert.ok(hit, `expected row matching ${re}`);
    return String(hit!.existence ?? hit!.state);
  };

  // Exact clip/master values — not merely presence/counts.
  assert.equal(findState(five, /cctv clip/i), "served", "Five Answers: clip served");
  assert.equal(findState(five, /master cctv/i), "missing", "Five Answers: master missing");
  assert.equal(findState(five, /interview recording/i), "served", "Five Answers: recording served");
  assert.ok(
    ["incomplete", "missing"].includes(findState(five, /interview transcript/i)),
    "Five Answers: transcript outstanding",
  );

  assert.equal(findState(matter, /cctv clip/i), "served", "Matter state: clip served");
  assert.equal(findState(matter, /master cctv/i), "missing", "Matter state: master missing");
  assert.equal(findState(matter, /interview recording/i), "served", "Matter state: recording served");
  assert.ok(
    ["incomplete", "missing"].includes(findState(matter, /interview transcript/i)),
    "Matter state: transcript outstanding",
  );

  // Same authority count.
  assert.equal(five.length, matter.length);

  // Provenance retained on reconciled projection (CB-HIST-CANONICAL-AUTHORITY-MUST-PRESERVE-PROVENANCE).
  const clipMatter = matter.find((r) => /cctv clip/i.test(r.label))!;
  assert.ok(clipMatter.sourceDocument || clipMatter.sourcePage || clipMatter.note, "clip has provenance");
  assert.match(String(clipMatter.sourceDocument ?? clipMatter.note), /MG6|schedule/i);

  // Hearing Mode + Export Pack must receive the same reconciled authority.
  const briefPlan = buildCriminalBriefPlan({
    bundleText: docs[0]!.fullText,
    missingMaterial: surfaces.disclosureChase.items.map((i) => i.label),
    allegation: "Robbery",
  });
  const override = five;
  const hearing = buildHearingMode({
    allegation: "Robbery",
    briefPlan,
    warRoom: surfaces.warRoom,
    chase: surfaces.disclosureChase,
    matterConfidence: null,
    doNotOverstate: surfaces.warRoom.doNotOverstate,
    primaryRouteTitle: "Live",
    evidenceRowsOverride: override,
  });
  assert.equal(findState(hearing.evidenceSnapshot, /cctv clip/i), "served", "Hearing: clip served");
  assert.equal(findState(hearing.evidenceSnapshot, /master cctv/i), "missing", "Hearing: master missing");
  assert.equal(
    findState(hearing.evidenceSnapshot, /interview recording/i),
    "served",
    "Hearing: recording served",
  );
  assert.ok(
    ["incomplete", "missing"].includes(findState(hearing.evidenceSnapshot, /interview transcript/i)),
    "Hearing: transcript outstanding",
  );

  const pack = buildExportPack({
    caseId: "authority-clip-master",
    allegation: "Robbery",
    warRoom: surfaces.warRoom,
    chase: surfaces.disclosureChase,
    briefPlan,
    matterConfidence: null,
    doNotOverstate: surfaces.warRoom.doNotOverstate,
    primaryRouteTitle: "Live",
    evidenceRowsOverride: override,
  });
  const gaps = pack.sections.find((s) => s.id === "evidence_gaps")!.textForClipboard;
  assert.match(gaps, /CCTV clip[\s\S]*\[Served\]/i);
  assert.match(gaps, /Master CCTV[\s\S]*\[Missing\]/i);
  assert.match(gaps, /Interview recording[\s\S]*\[Served\]/i);
  assert.ok(
    /Interview transcript[\s\S]*\[(?:Incomplete|Missing)\]/i.test(gaps),
    "Export gaps: transcript outstanding",
  );

  const liveGaps = surfaces.exportPack.sections.find((s) => s.id === "evidence_gaps")!.textForClipboard;
  const liveClipLine = liveGaps.split("\n").find((l) => /CCTV clip/i.test(l)) ?? "";
  assert.match(liveClipLine, /\[Served\]/i);
  assert.ok(!/\[Missing\]/i.test(liveClipLine), "served clip must not be Missing in export");
  assert.match(liveGaps, /Master CCTV[\s\S]*\[Missing\]/i);

  // Chase: served clip not outstanding; served recording not chased; master + transcript remain open.
  assert.ok(
    !chaseItems.some(
      (i) => /\bclip\b/i.test(i.label) && /Outstanding|Overdue|Missing/i.test(i.baseStatus),
    ),
    "served clip must not be chased as outstanding",
  );
  assert.ok(
    !chaseItems.some(
      (i) =>
        /interview recording/i.test(i.label) &&
        !/transcript/i.test(i.label) &&
        /Outstanding|Overdue|Missing|Not safely confirmed/i.test(i.baseStatus),
    ),
    "served recording must not be chased",
  );
  assert.ok(/master/i.test(chaseLabels), `master remains chaseable: ${chaseLabels}`);
  assert.ok(/transcript/i.test(chaseLabels), `transcript remains chaseable: ${chaseLabels}`);

  // Opposite: without override, Hearing Mode would rebuild from chase (legacy) — prove the bypass existed.
  const hearingBypass = buildHearingMode({
    allegation: "Robbery",
    briefPlan,
    warRoom: surfaces.warRoom,
    chase: surfaces.disclosureChase,
    matterConfidence: null,
    doNotOverstate: surfaces.warRoom.doNotOverstate,
    primaryRouteTitle: "Live",
    // intentionally omit evidenceRowsOverride
  });
  const bypassHay = hearingBypass.evidenceSnapshot.map((r) => `${r.label}|${r.existence}`).join("\n");
  assert.ok(
    !/cctv clip.*\|served/i.test(bypassHay) || hearingBypass.evidenceSnapshot.length !== five.length,
    "legacy Hearing Mode without override does not guarantee reconciled clip/master authority",
  );
}

// --- CB-HIST-PRESENTATION-CANNOT-SUPPRESS-SOURCE-BACKED-FAMILY ---
{
  const mixedHay =
    "Harassment phone screenshot message pack complainant MG11. Body-worn BWV of arrest. Custody record and PACE. CCTV of street. CAD log.";
  const block = [
    "Do not overstate phone attribution without the served export.",
    "BWV of the arrest is on the papers — check before reliance.",
    "Full custody record remains relevant to detention timing.",
    "CCTV of the street shows the approach — check before reliance.",
    "CAD / 999 timing still needs confirmation.",
  ].join("\n");
  const polished = polishPresentationBlock(block, mixedHay);
  assert.match(polished, /BWV/i);
  assert.match(polished, /custody/i);
  assert.match(polished, /CCTV/i);
  assert.match(polished, /phone|attribution/i);

  const digitalPlusCustody = polishPresentationBlock(
    "Phone extraction summary on file.\nCustody record pages cover detention clock.",
    "digital disclosure phone extraction custody record detention",
  );
  assert.match(digitalPlusCustody, /phone|extraction/i);
  assert.match(digitalPlusCustody, /custody/i);
}

// --- Chase-card display family anchored to item (not why prose) ---
{
  assert.match(
    displayChaseCardLabel({
      label: "Complainant MG11",
      whyItMatters: "Phone attribution and subscriber data still unclear",
      draftChaseWording: "Please provide phone download",
    }),
    /MG11|complainant|witness/i,
  );
  assert.ok(
    !/phone download|source extraction/i.test(
      displayChaseCardLabel({
        label: "Complainant MG11",
        whyItMatters: "Phone attribution and subscriber data still unclear",
      }),
    ),
  );

  assert.match(
    displayChaseCardLabel({
      label: "CCTV continuity / provenance",
      whyItMatters: "Phone handset attribution mentioned in schedule notes",
    }),
    /CCTV/i,
  );
  assert.ok(
    !/phone download/i.test(
      displayChaseCardLabel({
        label: "CCTV continuity / provenance",
        whyItMatters: "Phone handset attribution mentioned in schedule notes",
      }),
    ),
  );

  assert.match(
    displayChaseCardLabel({
      label: "Phone extraction source download",
      whyItMatters: "MG11 complainant statement still being reviewed",
    }),
    /phone|extraction|download/i,
  );

  assert.match(
    displayChaseCardLabel({
      label: "Additional source-material issues",
      mergedFrom: ["MG6C/014 — Full BWV export"],
      whyItMatters: "Phone notes elsewhere",
    }),
    /BWV|body/i,
  );
}

// --- extracted_json-only ingest ---
{
  const jsonOnly: CaseDocumentRow = {
    id: "json-only-1",
    name: "Compiled bundle",
    raw_text: "",
    extracted_text: "",
    extracted_json: {
      pages: ["Charge: Assault.\nCCTV master footage outstanding."],
    },
  };
  const units = mapCaseDocumentsToUploadedUnits([jsonOnly]);
  assert.ok(units.length >= 1, "extracted_json-only document must be ingested");
  assert.match(units.map((u) => u.fullText).join("\n"), /CCTV master/);

  const empty: CaseDocumentRow = {
    id: "empty-1",
    name: "Empty",
    raw_text: "",
    extracted_text: "",
    extracted_json: { pages: ["", "  "] },
  };
  assert.equal(mapCaseDocumentsToUploadedUnits([empty]).length, 0);
}

// --- Tenant existence isolation contract (no foreign existence signal) ---
{
  const page = fs.readFileSync("app/(protected)/cases/[caseId]/page.tsx", "utf8");
  assert.ok(!/existsElsewhere|different workspace|belongs to another account/i.test(page));
  assert.ok(!/demo\.loom\.taylor/i.test(page));
}

// --- Production callers must wire evidenceRowsOverride (static trace) ---
{
  const fiveUi = fs.readFileSync("components/criminal/five-answers/FiveAnswersView.tsx", "utf8");
  assert.match(fiveUi, /buildHearingMode\([\s\S]*evidenceRowsOverride/);
  assert.match(fiveUi, /buildExportPack\([\s\S]*evidenceRowsOverride/);
  assert.match(fiveUi, /suppressChaseDerivedEvidence/);
  assert.ok(
    !/evidenceRowsOverride:\s*evidenceRowsOverride\?\.length\s*\?\s*evidenceRowsOverride\s*:\s*undefined/.test(
      fiveUi,
    ),
    "FiveAnswersView must not convert authoritative [] to undefined",
  );

  const adapter = fs.readFileSync("lib/criminal/canonical-live-surface-adapter.ts", "utf8");
  assert.match(adapter, /buildExportPack\([\s\S]*evidenceRowsOverride:\s*evidenceRowsForFiveAnswers/);

  const hearingSrc = fs.readFileSync("lib/criminal/hearing-mode/build-hearing-mode.ts", "utf8");
  assert.match(hearingSrc, /evidenceRowsOverride:\s*input\.evidenceRowsOverride/);

  const exportSrc = fs.readFileSync("lib/criminal/export-pack/build-export-pack.ts", "utf8");
  assert.match(exportSrc, /evidenceRowsOverride/);
}

console.log("canonical-authority-closure.test.ts: PASS");
