/**
 * Material status truth — flattened schedule cells must not change an item's status.
 *
 * When a PDF schedule is flattened, its cells arrive joined without whitespace
 * (`bank source statementsOutstandingNot in papers supplied`). Every status pattern
 * in the normaliser is word-boundary based, so a joined cell hides the negative
 * wording and the trailing positive word wins — an outstanding item is read as served.
 *
 * Assertions run in opposite directions on purpose: each state must survive, and no
 * state may be upgraded or softened into another.
 *
 * Run: npx tsx scripts/material-status-truth.test.ts
 */
import assert from "node:assert/strict";
import {
  classifyMaterialStatus,
  deglueScheduleText,
} from "../lib/criminal/bundle-material-normalizer";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import type { MaterialStatus } from "../lib/criminal/bundle-truth-types";

const STATUS_TRUTH_CASES: Array<{
  glued: string;
  spaced: string;
  expected: MaterialStatus;
  why: string;
}> = [
  {
    glued: "MG6/04bank source statementsOutstandingNot in papers supplied",
    spaced: "MG6/04 bank source statements Outstanding Not in papers supplied",
    expected: "outstanding",
    why: "outstanding must not be upgraded to served by a trailing 'supplied'",
  },
  {
    glued: "MG6/05CCTV continuity logOutstandingAwaiting export",
    spaced: "MG6/05 CCTV continuity log Outstanding Awaiting export",
    expected: "outstanding",
    why: "outstanding must not soften to unclear",
  },
  {
    glued: "MG6/01custody record extractServedContained in papers",
    spaced: "MG6/01 custody record extract Served Contained in papers",
    expected: "served",
    why: "a genuinely served row must stay served and must not be dropped",
  },
  {
    glued: "MG6/06analyst certificateReferred onlyExport not served",
    spaced: "MG6/06 analyst certificate Referred only Export not served",
    expected: "referred_only",
    why: "referred-only must not become served",
  },
  {
    glued: "MG6/07final medical reportPartialInterim note only",
    spaced: "MG6/07 final medical report Partial Interim note only",
    // Interim/partial extract wording is owned by the draft state, not partial.
    expected: "draft",
    why: "an interim extract must not be read as served",
  },
  {
    glued: "MG6/08MG11 witness statementUnsignedDraft awaiting signature",
    spaced: "MG6/08 MG11 witness statement Unsigned Draft awaiting signature",
    expected: "unsigned",
    why: "unsigned must not be read as served",
  },
];

for (const { glued, spaced, expected, why } of STATUS_TRUTH_CASES) {
  assert.equal(classifyMaterialStatus(spaced), expected, `spaced form: ${why}`);
  assert.equal(classifyMaterialStatus(glued), expected, `flattened form: ${why}`);
}

// Status wording welded on with no capital at the join.
const WELDED_TAIL_CASES: Array<{ line: string; expected: MaterialStatus; why: string }> = [
  {
    line: "BWV/4 Photo stillnot served",
    expected: "outstanding",
    why: "'stillnot served' is not served",
  },
  {
    line: "CCTV/3 Body worn videonot served",
    expected: "outstanding",
    why: "'videonot served' is not served",
  },
  {
    line: "TEL/5 Medical notepartial",
    expected: "draft",
    why: "a partial note is not served",
  },
  {
    line: "AB/2 Phone download referencereferenced only",
    expected: "referred_only",
    why: "referenced-only stays referred-only",
  },
  {
    line: "EX/03 Continuity note Eastmoor Policeoutstanding",
    expected: "outstanding",
    why: "welded 'outstanding' must still register",
  },
  {
    line: "CCTV/3 Property continuity noteserved",
    expected: "served",
    why: "welded 'served' must be recognised rather than dropped to unclear",
  },
  {
    line: "MG6/01 forensic submission noteservedavailable in bundle",
    expected: "served",
    why: "status welded mid-cell must still be read",
  },
  {
    line: "MG6/05 full CCTV masteroutstandingrequested / not attached",
    // The schedule states outstanding; "requested / not attached" is the reason, so this
    // is a gap rather than the softer referred-only state.
    expected: "outstanding",
    why: "outstanding stated mid-cell must win over the referred-only reading",
  },
  {
    line: "MG6/02 charge sheetservedlisted as served",
    expected: "served",
    why: "served stated twice must not be lost",
  },
  {
    line: "MG6/06 custody record pages 3-5outstanding requested / not attached",
    expected: "outstanding",
    why: "status welded to a page range must still be read",
  },
  {
    line: "O01full interview transcript Outstanding Listed but not attached",
    expected: "outstanding",
    why: "outstanding stated must win over listed-but-not-attached",
  },
  {
    line: "BWV referred on schedule but not served — outstanding.",
    expected: "outstanding",
    why: "outstanding stated must win over referred-on-schedule",
  },
  {
    line: "3search recordoutstandingrequested",
    expected: "outstanding",
    why: "a numbered MG6 cell with no letter-code still states outstanding",
  },
];

for (const { line, expected, why } of WELDED_TAIL_CASES) {
  assert.equal(classifyMaterialStatus(line), expected, why);
}

// Ordinary words ending in status wording must survive intact.
for (const untouched of [
  "MG6/11 exhibit continuity preserved",
  "MG6/12 officer account observed",
  "MG6/13 court time reserved",
  "MG6/14 review of the account is impartial",
  "MG6/15 service of the exhibit is pending, depending on the officer in case",
  // Brand and device names keep their internal capital.
  "Original WhatsApp export not served.",
  "MG6/16 iPhone handset download outstanding",
  "MG6/17 YouTube upload referred only",
]) {
  assert.equal(deglueScheduleText(untouched), untouched, `must not split: ${untouched}`);
}

// Service stated as a condition describes what would follow, not what is on file.
for (const conditional of [
  "WitnessesComplainant, police officer, civilian witness where served",
  "MG11 statements will be relied on if served before trial",
  "Exhibit continuity to be reviewed once served",
  "MG6/09 phone download subject to service by the officer in case",
]) {
  assert.notEqual(
    classifyMaterialStatus(conditional),
    "served",
    `conditional service is not proof of service: ${conditional}`,
  );
}

// Unclear stays unclear: no negative wording present, but nothing states service either.
assert.equal(
  classifyMaterialStatus("MG6/10 exhibit continuity note for the trial bundle"),
  "unclear",
);

// De-glue must not damage already-readable wording, schedule references or device names.
for (const untouched of [
  "MG6/03 bank schedule extract Served Contained in papers",
  "MG6C/002 — Full medical report absent — injury severity incomplete",
  "MG11 complainant statement — draft unsigned — not final",
  "iPhone download outstanding",
  "O05 999 audio Outstanding Listed but not attached",
]) {
  assert.equal(deglueScheduleText(untouched), untouched, `must not rewrite: ${untouched}`);
}

assert.equal(
  deglueScheduleText("O05999 audio Outstanding Listed but not attached"),
  "O05 999 audio Outstanding Listed but not attached",
  "unused-item code welded to 999 audio must split",
);
assert.equal(
  deglueScheduleText("O05999audio Outstanding"),
  "O05 999 audio Outstanding",
  "unused-item code welded to 999audio must split",
);

// Ledger level: a flattened schedule must report the same served count as the spaced one.
const FLATTENED_SCHEDULE = `
MG6 disclosure schedule
MG6/001custody record extractServedContained in papers
MG6/003bank schedule extractServedContained in papers
MG6/004bank source statementsOutstandingNot in papers supplied
MG6/005CCTV continuity logOutstandingAwaiting export
MG6/007final medical reportOutstandingRequested from officer in case
`.trim();

const SPACED_SCHEDULE = FLATTENED_SCHEDULE.split("\n")
  .map((line) => deglueScheduleText(line))
  .join("\n");

const flattened = buildBundleTruthLedger({ bundleText: FLATTENED_SCHEDULE });
const spaced = buildBundleTruthLedger({ bundleText: SPACED_SCHEDULE });

const statusByRef = (ledger: { materials: Array<{ scheduleRef: string | null; status: MaterialStatus }> }) =>
  Object.fromEntries(ledger.materials.filter((m) => m.scheduleRef).map((m) => [m.scheduleRef!, m.status]));

const flattenedByRef = statusByRef(flattened);
const spacedByRef = statusByRef(spaced);

assert.deepEqual(
  flattenedByRef,
  spacedByRef,
  "flattening a schedule must not change any row status",
);
assert.equal(flattenedByRef["MG6/004"], "outstanding", "bank source statements are outstanding");
assert.equal(flattenedByRef["MG6/005"], "outstanding", "CCTV continuity log is outstanding");
assert.equal(flattenedByRef["MG6/001"], "served", "custody record extract is served");
assert.equal(
  flattened.materials.filter((m) => m.status === "served").length,
  2,
  "only the two rows marked Served may count as served",
);

console.log("material-status-truth.test.ts: all assertions passed");
