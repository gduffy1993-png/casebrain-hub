/**
 * Phase 1 screenshot-derived shared-root regressions + opposite-direction cases.
 * Seeded by Isaac Patel source classes — no case-ID production branches.
 */
import assert from "node:assert/strict";
import {
  inferInterviewRecordingStateFromText,
  inferInterviewTranscriptStateFromText,
  isFragmentEvidenceLabel,
} from "../lib/criminal/build-from-document-units";
import { cad999DisplayLabel } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { workflowCourtRecordAsks, workflowDisclosureChaseLabels } from "../lib/criminal/pilot-workflow";
import { HISTORICAL_INVARIANTS } from "../lib/eval/master3000-quality/invariants";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan/build-brief-plan";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "1";

const required = [
  "CB-HIST-INTERVIEW-MODALITY-STATE-CANNOT-INVERT",
  "CB-HIST-CAD-MENTION-NOT-999-OUTSTANDING",
  "CB-HIST-WITNESS-MG11-NOT-COMPLAINANT-WITHOUT-ROLE",
  "CB-HIST-OFFENCE-FAMILY-CANNOT-INVENT-EVIDENCE-FAMILY",
];
for (const id of required) {
  assert.ok(
    HISTORICAL_INVARIANTS.some((i) => i.id === id),
    `missing invariant ${id}`,
  );
}

// --- 1A polarity ---
assert.equal(
  inferInterviewTranscriptStateFromText(
    "Where the full recording or transcript is not served and remains outstanding.",
  ),
  "missing",
  "transcript is not served must be missing",
);
assert.equal(
  inferInterviewTranscriptStateFromText("Interview transcript served on papers."),
  "served",
  "explicit served transcript remains served",
);
assert.equal(
  inferInterviewRecordingStateFromText("Interview recording missing from the bundle."),
  "missing",
);
assert.equal(
  inferInterviewRecordingStateFromText("Interview recording served on papers."),
  "served",
);
assert.equal(
  inferInterviewRecordingStateFromText("The custody note refers to an interview recording."),
  "not_safely_confirmed",
  "mere recording mention must not become served",
);

// Fragment polarity: "… is not served" must not become a served evidence label.
assert.equal(
  isFragmentEvidenceLabel("full recording or transcript is not"),
  true,
  "negative-polarity fragment must be rejected",
);

assert.equal(cad999DisplayLabel([]), "CAD log / timing material");
assert.equal(cad999DisplayLabel(["timing note"]), "CAD log / timing material");

// --- 1B CAD label ---
assert.equal(cad999DisplayLabel(["CAD timing compared with witness account"]), "CAD log / timing material");
assert.equal(cad999DisplayLabel(["999 call audio outstanding"]), "999 call audio");
assert.equal(
  cad999DisplayLabel(["CAD log", "999 call audio outstanding"]),
  "CAD / 999 audio material",
);

const cadOnlyBundle =
  "Affray. Witness note: there may be a timing issue compared with CAD or listing material. MG6: full CCTV master outstanding.";
const cadLabels = workflowDisclosureChaseLabels({
  caseTitle: "R v Seed Matter",
  allegation: "Affray, contrary to s3 Public Order Act 1986",
  bundleText: cadOnlyBundle,
}) ?? [];
assert.ok(
  !cadLabels.some((l) => /\b999\b/i.test(l)),
  `CAD-only bundle must not invent 999 chase labels: ${cadLabels.join(" | ")}`,
);
assert.ok(
  !cadLabels.some((l) => /\bBWV\b/i.test(l)),
  `Affray shape must not invent BWV chase labels: ${cadLabels.join(" | ")}`,
);
assert.ok(
  !cadLabels.some((l) => /\bcomplainant\b/i.test(l)),
  `MG11/CAD bundle without complainant role must not invent complainant chase: ${cadLabels.join(" | ")}`,
);
assert.ok(
  !cadLabels.some((l) => /CAD\s*\/\s*999/i.test(l)),
  `CAD-only must not use compound CAD/999 display label: ${cadLabels.join(" | ")}`,
);

// Opposite: explicit 999 outstanding still produces an appropriate chase/ask path.
const with999 = workflowDisclosureChaseLabels({
  caseTitle: "R v Seed Matter",
  allegation: "Affray, contrary to s3 Public Order Act 1986",
  bundleText: `${cadOnlyBundle}\nMG6: 999 call audio outstanding / not attached.`,
}) ?? [];
assert.ok(
  with999.some((l) => /\b999\b/i.test(l)),
  `explicit 999 outstanding must still chase: ${with999.join(" | ")}`,
);

// Opposite: explicit complainant retains complainant attribution.
const withComplainant = workflowCourtRecordAsks({
  caseTitle: "R v Seed Matter",
  allegation: "Affray",
  bundleText: "Complainant MG11 signed final statement outstanding. BWV at scene outstanding.",
}) ?? [];
assert.ok(
  withComplainant.some((l) => /\bcomplainant\b/i.test(l)),
  `explicit complainant must retain attribution: ${withComplainant.join(" | ")}`,
);
assert.ok(
  withComplainant.some((l) => /\bBWV\b/i.test(l)),
  `source-backed BWV must remain: ${withComplainant.join(" | ")}`,
);

// Brief-plan: CCTV-only source must not authorise BWV court asks or "remains live" theory.
const briefCadOnly = buildCriminalBriefPlan({
  allegation: "Affray, contrary to s3 Public Order Act 1986",
  bundleText: cadOnlyBundle,
});
const briefVisible = [
  briefCadOnly.chaseAngle,
  briefCadOnly.summaryAngle,
  briefCadOnly.todayAngle,
  briefCadOnly.mainIssue,
  ...briefCadOnly.missingEvidence.map((m) => m.label),
  ...briefCadOnly.requiredOutputItems.chase,
  ...briefCadOnly.requiredOutputItems.summary,
].join("\n");
assert.ok(!/\bBWV\b/i.test(briefVisible), `brief plan must not invent BWV: ${briefVisible}`);
assert.ok(
  !/self-defence\/first contact remains live|self-defence remains live/i.test(briefVisible),
  `brief plan must not assert self-defence remains live without source: ${briefVisible}`,
);
assert.ok(
  !/CCTV\/BWV/i.test(briefVisible),
  `brief plan must not keep CCTV/BWV compound on CCTV-only source: ${briefVisible}`,
);
assert.ok(
  !/\b999\b/i.test(briefVisible),
  `brief visible text must not invent 999 from CAD-only: ${briefVisible}`,
);

const briefWithBwv = buildCriminalBriefPlan({
  allegation: "Affray",
  bundleText: `${cadOnlyBundle}\nBWV at scene outstanding.`,
});
assert.ok(
  /\bBWV\b/i.test(
    [briefWithBwv.chaseAngle, ...briefWithBwv.missingEvidence.map((m) => m.label)].join("\n"),
  ),
  "source-backed BWV must remain in brief plan",
);

console.log("master-3000-phase1-screenshot-defect-regressions.test.ts: PASS");
