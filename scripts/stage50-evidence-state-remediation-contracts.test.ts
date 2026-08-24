/**
 * Stage-50 evidence-state shared remediation contracts (F01–F10).
 * Run: npx tsx scripts/stage50-evidence-state-remediation-contracts.test.ts
 *
 * No case-ID / fixture-specific patches — shared unit/state rules only.
 */

import assert from "node:assert/strict";
import {
  classifyMaterialStatus,
  lineIndicatesReferredOnly,
} from "@/lib/criminal/bundle-material-normalizer";
import {
  canonicalizeEvidenceExistence,
  reconcileEvidenceState,
  wordingIndicatesReferredOnly,
} from "@/lib/criminal/evidence-state-reconcile";
import {
  compareEvidenceStates,
  bindTruthMapRowForExpectation,
  evidenceUnitsAreDistinct,
  sameEvidenceUnitIdentity,
  applyTruthKeyMigrationOverlay,
  TRUTH_KEY_MIGRATION_V1_ENTRIES,
  TRUTH_KEY_MIGRATION_REGISTER_HASH,
  isPartialMg11ServedTruthDefect,
  runAllControls,
  type SavedCaseMaterialisation,
} from "@/lib/eval/master-assurance-auditor";
import {
  inferLedgerRowExistence,
  isAggregateLedgerLabel,
  isMg6ClarificationMetaLabel,
  isRecordingTranscriptBlendLabel,
  isCustodyPaceBlendLabel,
} from "@/lib/eval/evidence-state-audit/partial-media";
import { buildCasebrainAuditSnapshot } from "@/lib/eval/evidence-state-audit/build-audit-snapshot";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  ok  ${name}`);
  passed += 1;
}

function baseCase(
  over: Partial<SavedCaseMaterialisation> & { caseId: string },
): SavedCaseMaterialisation {
  return {
    sourceCaseId: null,
    familyLabel: null,
    allegation: "Theft",
    clientLabel: "X",
    surfaces: [],
    truthExpectations: [],
    truthMapRows: [],
    cpsChase: [],
    doNotOverstate: [],
    inputBundlePath: null,
    packetPath: "mut",
    builtAt: null,
    ...over,
  };
}

async function main() {
  console.log("F01 — MG6 referred-not-served → referred_only (not missing)");
  await check("classifyMaterialStatus: referred on MG6 — export not served", () => {
    assert.equal(
      classifyMaterialStatus(
        "MG6C/FUL — full lab report — referred on MG6 — export not served.",
      ),
      "referred_only",
    );
  });
  await check("reconcileEvidenceState: referred before not-served", () => {
    assert.equal(
      reconcileEvidenceState({
        label: "MG6C/HAN — handset download — referred on MG6 — export not served.",
      }),
      "referred_only",
    );
  });
  await check("canonicalize: referred label overrides raw missing", () => {
    assert.equal(
      canonicalizeEvidenceExistence({
        label: "MG6C/BWV — BWV full export — referred on MG6 — export not served.",
        rawExistence: "missing",
      }),
      "referred_only",
    );
  });
  await check("inferLedgerRowExistence: referred label → referred_only even in missing bucket", () => {
    assert.equal(
      inferLedgerRowExistence(
        "MG6C/CAL — calibration — referred on MG6 — export not served.",
        "missing",
      ),
      "referred_only",
    );
  });
  await check("negative: outstanding alone is NOT referred_only", () => {
    assert.equal(lineIndicatesReferredOnly("Full CCTV master footage — outstanding"), false);
    assert.equal(
      wordingIndicatesReferredOnly("Full CCTV master footage — outstanding"),
      false,
    );
    assert.equal(
      classifyMaterialStatus("Full CCTV master footage — outstanding"),
      "outstanding",
    );
  });

  console.log("\nF02 — Referred only: label must not become incomplete");
  await check("canonicalize: Referred only: prefix → referred_only", () => {
    assert.equal(
      canonicalizeEvidenceExistence({
        label: "Referred only: BWV; full custody record; PACE interview recording.",
        rawExistence: "incomplete",
      }),
      "referred_only",
    );
  });
  await check("classifyMaterialStatus: Referred only: line", () => {
    assert.equal(
      classifyMaterialStatus("Referred only: ABE interview; first complaint record."),
      "referred_only",
    );
  });

  console.log("\nF03 — outstanding alone stays unresolved (not forced referred_only)");
  await check("control emits outstanding_alone_unresolved not defect", () => {
    const c = baseCase({
      caseId: "MUT-F03",
      truthMapRows: [
        {
          label: "Full CCTV master footage — outstanding",
          existence: "missing",
          reliability: "needs_review",
        },
      ],
      truthExpectations: [
        {
          evidenceItem: "Full CCTV master footage",
          correctEvidenceState: "referred_only",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    const { findings } = runAllControls([c]);
    const f = findings.find((x) => x.controlId === "MAA-EVIDENCE-STATE");
    assert.ok(f);
    assert.equal(f!.verdict, "unresolved");
    assert.equal(f!.code, "outstanding_alone_unresolved");
  });
  await check("missing without referred language vs referred_only stays unresolved", () => {
    const c = baseCase({
      caseId: "MUT-F03b",
      truthMapRows: [
        {
          label: "CCTV full window / master footage",
          existence: "missing",
          reliability: "needs_review",
        },
      ],
      truthExpectations: [
        {
          evidenceItem: "Full CCTV master footage",
          correctEvidenceState: "referred_only",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    const { findings } = runAllControls([c]);
    const f = findings.find((x) => x.controlId === "MAA-EVIDENCE-STATE");
    assert.ok(f);
    assert.equal(f!.verdict, "unresolved");
    assert.equal(f!.code, "outstanding_alone_unresolved");
  });

  console.log("\nF04 — partial/incomplete ≠ served");
  await check("partial on export → incomplete via reconcile", () => {
    assert.equal(
      reconcileEvidenceState({ label: "MG11 officer — partial on export" }),
      "incomplete",
    );
  });
  await check("truth migration: partial MG11 served → incomplete", () => {
    assert.equal(isPartialMg11ServedTruthDefect("mg11 officer", "served"), true);
    const { expectations, applied } = applyTruthKeyMigrationOverlay({
      caseId: "sc-0002d",
      expectations: [
        {
          evidenceItem: "mg11 officer",
          correctEvidenceState: "served",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    assert.equal(applied.length, 1);
    assert.equal(expectations[0]!.correctEvidenceState, "incomplete");
  });
  await check("migration register has exactly 7 entries and stable hash", () => {
    assert.equal(TRUTH_KEY_MIGRATION_V1_ENTRIES.length, 7);
    assert.equal(TRUTH_KEY_MIGRATION_REGISTER_HASH.length, 64);
  });

  console.log("\nF05 — aggregate/meta rows must not bind");
  await check("aggregate Served material | rejected", () => {
    assert.equal(isAggregateLedgerLabel("Served material | 5+ | MG5; officer MG11"), true);
    const bound = bindTruthMapRowForExpectation({
      evidenceItem: "MG5",
      rows: [
        {
          label: "Served material | 5+ | MG5; officer MG11; custody summary extract",
          existence: "incomplete",
          reliability: "needs_review",
        },
        { label: "MG5", existence: "served", reliability: "needs_review" },
      ],
    });
    assert.equal(bound.ok, true);
    if (bound.ok) assert.equal(bound.row.label, "MG5");
  });
  await check("Source section meta row does not bind to charge sheet", () => {
    const bound = bindTruthMapRowForExpectation({
      evidenceItem: "charge sheet",
      rows: [
        {
          label: "*Source section:** Charge sheet / MG5 / witness material",
          existence: "incomplete",
          reliability: "needs_review",
        },
      ],
    });
    assert.equal(bound.ok, false);
  });
  await check("control: aggregate-only map → unresolved bind, not defect", () => {
    const c = baseCase({
      caseId: "MUT-F05",
      truthMapRows: [
        {
          label: "Served material | 5+ | MG5; DWP summary",
          existence: "incomplete",
          reliability: "needs_review",
        },
      ],
      truthExpectations: [
        {
          evidenceItem: "MG5",
          correctEvidenceState: "served",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    const { findings } = runAllControls([c]);
    const f = findings.find((x) => x.controlId === "MAA-EVIDENCE-STATE");
    assert.ok(f);
    assert.equal(f!.verdict, "unresolved");
    assert.notEqual(f!.code, "state_mismatch");
  });

  console.log("\nF06 — MG6 clarification ≠ MG6 document");
  await check("mg6 clarification meta detected", () => {
    assert.equal(
      isMg6ClarificationMetaLabel("MG6 / unused schedule clarification"),
      true,
    );
  });
  await check("mg6 expectation does not bind clarification row", () => {
    const bound = bindTruthMapRowForExpectation({
      evidenceItem: "mg6",
      rows: [
        {
          label: "MG6 / unused schedule clarification",
          existence: "unknown",
          reliability: "needs_review",
        },
      ],
    });
    assert.equal(bound.ok, false);
  });

  console.log("\nF07 — recording ≠ transcript; blended identities");
  await check("recording vs transcript are distinct units", () => {
    assert.equal(
      evidenceUnitsAreDistinct("interview recording", "interview transcript"),
      true,
    );
    assert.equal(
      sameEvidenceUnitIdentity("interview recording", "Interview recording / transcript"),
      false,
    );
  });
  await check("blended recording/transcript label rejected", () => {
    assert.equal(
      isRecordingTranscriptBlendLabel("Interview recording / transcript"),
      true,
    );
    assert.equal(isCustodyPaceBlendLabel("Full custody record / PACE material"), true);
    const bound = bindTruthMapRowForExpectation({
      evidenceItem: "interview recording",
      rows: [
        {
          label: "Interview recording / transcript",
          existence: "unknown",
          reliability: "needs_review",
        },
      ],
    });
    assert.equal(bound.ok, false);
  });
  await check("extract ≠ full download", () => {
    assert.equal(
      evidenceUnitsAreDistinct("custody extract", "full custody record"),
      true,
    );
  });
  await check("draft ≠ signed/final", () => {
    assert.equal(evidenceUnitsAreDistinct("draft MG11", "signed MG11"), true);
  });
  await check("clip/still ≠ master", () => {
    assert.equal(evidenceUnitsAreDistinct("CCTV stills", "master CCTV footage"), true);
  });

  console.log("\nF08 — other_defendant_only is more precise (compatible)");
  await check("ODO vs referred_only is compatible family", () => {
    const r = compareEvidenceStates({
      actualRaw: "other_defendant_only",
      expected: "referred_only",
    });
    assert.equal(r.equivalent, true);
    assert.equal(r.reason, "compatible_family");
  });
  await check("ODO vs missing is compatible", () => {
    assert.equal(
      compareEvidenceStates({ actualRaw: "other_defendant_only", expected: "missing" })
        .equivalent,
      true,
    );
  });
  await check("control: ODO vs referred_only → pass", () => {
    const c = baseCase({
      caseId: "MUT-F08",
      truthMapRows: [
        {
          label: "MG6C/CO — co-defendant-only — co-defendant download — not this defendant",
          existence: "other_defendant_only",
          reliability: "needs_review",
        },
      ],
      truthExpectations: [
        {
          evidenceItem: "co-defendant download",
          correctEvidenceState: "referred_only",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    const { findings } = runAllControls([c]);
    const f = findings.find((x) => x.controlId === "MAA-EVIDENCE-STATE");
    assert.ok(f);
    assert.equal(f!.verdict, "pass");
  });

  console.log("\nF09 — served when source proves served (amended indictment)");
  await check("snapshot marks amended indictment served from source", () => {
    const snap = buildCasebrainAuditSnapshot({
      caseId: "MUT-F09",
      clientLabel: "Test",
      allegation: "Theft",
      bundleText: [
        "=== SECTION: MG6 ===",
        "MG6C — UNUSED MATERIAL SCHEDULE",
        "MG6C/AME — amended indictment — served on bundle.",
        "MG6C/COU — court listing — referred on MG6 — export not served.",
      ].join("\n"),
    });
    const row = snap.fiveAnswersEvidenceRows.find((r) =>
      /amended indictment/i.test(r.label),
    );
    assert.ok(row, "amended indictment row present");
    assert.equal(row!.existence, "served");
  });

console.log("\nF09b — snapshot carries source case identity");
await check("snapshot output keeps client identity available to audit/UI consumers", () => {
  const snap = buildCasebrainAuditSnapshot({
      caseId: "MUT-F09B",
      clientLabel: "Morgan Ellis",
      allegation: "Theft",
      offenceLabel: "Theft",
      bundleText: [
        "Defendant: Morgan Ellis",
        "Charge: Theft, contrary to section 1 of the Theft Act 1968.",
        "MG6: CCTV continuity referred only.",
      ].join("\n"),
    });
  assert.equal(snap.caseIdentity?.clientLabel, "Morgan Ellis");
  assert.match(JSON.stringify(snap), /Morgan Ellis/);
});

console.log("\nF09d — snapshot carries court + listing date from source papers");
await check("clear PDF court and listing date surface in caseIdentity", () => {
  const snap = buildCasebrainAuditSnapshot({
    caseId: "MUT-F09D-LISTING",
    clientLabel: "Taylor Brookes",
    allegation: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    offenceLabel: "Harassment",
    caseTitle: "R v Taylor Brookes",
    bundleText: [
      "Defendant: Taylor Brookes",
      "Court: Northgate Magistrates' Court",
      "Statement of Offence:",
      "Harassment, contrary to section 2 of the Protection from Harassment Act 1997.",
      "PTPH listed — 15 July 2026, 10:00, Northgate Magistrates' Court.",
    ].join("\n"),
  });
  assert.match(String(snap.caseIdentity?.court || ""), /Northgate Magistrates/i);
  assert.ok(
    snap.caseIdentity?.hearingDateIso || snap.caseIdentity?.hearingDateRaw,
    "listing date must be carried when clear on papers",
  );
  const blob = JSON.stringify(snap);
  assert.match(blob, /Northgate Magistrates/i);
  assert.match(blob, /15 July 2026|2026-07-15/i);
});

console.log("\nF09c — source warnings and digital gaps stay in lane");
await check("must-not-say source warnings are not exposed as evidence rows", () => {
  const snap = buildCasebrainAuditSnapshot({
    caseId: "MUT-F09C-WARN",
    clientLabel: "Lee Patterson",
    allegation: "Violent disorder",
    offenceLabel: "Violent disorder",
    bundleText: [
      "Defendant: Lee Patterson",
      "MG5: Witness A: defendant present. Witness B cannot identify participant.",
      "Must not say: presence proves guilt | BWV shows assault by defendant",
      "MG6C/ID — ID procedure material — outstanding — not on bundle.",
    ].join("\n"),
  });
  assert.ok(
    !snap.fiveAnswersEvidenceRows.some((row) => /must not say|proves guilt/i.test(row.label)),
    "warning-only phrases must not become evidence rows",
  );
});

await check("source-specific digital gaps do not grow generic phone-download rows", () => {
  const snap = buildCasebrainAuditSnapshot({
    caseId: "MUT-F09C-DIGITAL",
    clientLabel: "Jude Parch",
    allegation: "Offence per charge sheet",
    offenceLabel: "Criminal",
    bundleText: [
      "Defendant: Jude Parch",
      "Message content suggests sender; platform attribution not served.",
      "MG6C/PLA — platform export — Jude Parch — referred on MG6 — export not served.",
      "MG6C/SUB — subscriber proof — Jude Parch — outstanding — not on bundle.",
      "MG6C/DIG — digital extraction scope annex (Parch / folio 186) — outstanding — not on bundle.",
    ].join("\n"),
  });
  const visibleRows = JSON.stringify(snap.fiveAnswersEvidenceRows);
  assert.doesNotMatch(visibleRows, /\bfull phone extraction\b/i);
  assert.doesNotMatch(visibleRows, /\bmetadata\/source download\b/i);
  assert.match(visibleRows, /subscriber proof/i);
  assert.match(visibleRows, /digital extraction scope annex/i);
});

  console.log("\nF10 — do not invent referred_only from outstanding medical");
  await check("outstanding medical → missing, not referred_only", () => {
    const snap = buildCasebrainAuditSnapshot({
      caseId: "MUT-F10",
      clientLabel: "Test",
      allegation: "Sexual assault",
      bundleText: [
        "=== SECTION: MG6 ===",
        "MG6C — UNUSED MATERIAL SCHEDULE",
        "MG6C/MED — medical — outstanding — not on bundle.",
        "MG6C/ABE — ABE — referred on MG6 — export not served.",
      ].join("\n"),
    });
    const med = snap.fiveAnswersEvidenceRows.find((r) =>
      /MG6C\/MED|medical — outstanding/i.test(r.label),
    );
    const abe = snap.fiveAnswersEvidenceRows.find((r) =>
      /MG6C\/ABE|ABE — referred/i.test(r.label),
    );
    const chaseMedical = snap.fiveAnswersEvidenceRows.find(
      (r) => r.label === "Medical / expert source report",
    );
    assert.ok(med);
    assert.equal(med!.existence, "missing");
    assert.ok(abe);
    assert.equal(abe!.existence, "referred_only");
    if (chaseMedical) {
      assert.notEqual(
        chaseMedical.existence,
        "referred_only",
        "chase org-source 'confirm on file' must not invent referred_only",
      );
    }
  });

  console.log("\nExits / domain distinctions");
  await check("served / incomplete / missing / referred_only remain distinct", () => {
    assert.equal(
      compareEvidenceStates({ actualRaw: "served", expected: "incomplete" }).equivalent,
      false,
    );
    assert.equal(
      compareEvidenceStates({ actualRaw: "missing", expected: "referred_only" }).equivalent,
      false,
    );
    assert.equal(
      compareEvidenceStates({ actualRaw: "incomplete", expected: "served" }).equivalent,
      false,
    );
    assert.equal(
      compareEvidenceStates({
        actualRaw: "not_safely_confirmed",
        expected: "incomplete",
      }).equivalent,
      true,
    );
  });
  await check("sibling referred vs missing bind to matching state rows", () => {
    const rows = [
      {
        label: "MG6C/ABE — ABE — referred on MG6 — export not served.",
        existence: "referred_only",
        reliability: "needs_review",
      },
      {
        label: "MG6C/ABE — ABE — outstanding — not on bundle.",
        existence: "missing",
        reliability: "needs_review",
      },
    ];
    const referred = bindTruthMapRowForExpectation({
      evidenceItem: "ABE",
      rows,
      expectedState: "referred_only",
    });
    const missing = bindTruthMapRowForExpectation({
      evidenceItem: "ABE",
      rows,
      expectedState: "missing",
    });
    assert.equal(referred.ok, true);
    assert.equal(missing.ok, true);
    if (referred.ok) assert.match(referred.row.label, /referred on MG6/i);
    if (missing.ok) assert.match(missing.row.label, /outstanding/i);
  });
  await check("genuine referred_only mismatch still defects", () => {
    const c = baseCase({
      caseId: "MUT-GENUINE",
      truthMapRows: [
        {
          label: "MG6C/FUL — full lab report — referred on MG6 — export not served.",
          existence: "missing",
          reliability: "needs_review",
        },
      ],
      truthExpectations: [
        {
          evidenceItem: "full lab report",
          correctEvidenceState: "referred_only",
          mustNotSay: [],
          sourcePageAnchor: null,
        },
      ],
    });
    // Without canonicalize on the row, missing vs referred_only is a defect —
    // proves detector still surfaces genuine mismatches.
    const { findings } = runAllControls([c]);
    const f = findings.find((x) => x.controlId === "MAA-EVIDENCE-STATE");
    assert.ok(f);
    assert.equal(f!.verdict, "defect");
    assert.equal(f!.code, "state_mismatch");
  });

  console.log(`\n${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
