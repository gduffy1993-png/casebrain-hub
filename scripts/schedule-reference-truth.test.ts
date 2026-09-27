/**
 * Schedule reference truth.
 *
 * A material row's reference is how a solicitor asks for the item, and how the app tells two
 * separately listed items apart. Every "should parse" string below is a real line taken from the
 * seven QA cases; every "must not parse" string is a real line that must never be mistaken for a
 * schedule reference (case file numbers, URNs, dates, page chrome).
 */
import assert from "node:assert/strict";

import { parseScheduleRef } from "../lib/criminal/bundle-material-normalizer";

const SHOULD_PARSE: Array<[string, string]> = [
  // MG6 schedule cells, including the two-digit form these schedules actually use.
  ["MG6/04 bank source statements Outstanding Not in papers supplied", "MG6/04"],
  ["MG6/05 CCTV continuity log Outstanding Awaiting export", "MG6/05"],
  ["MG6/07 full interview transcript outstanding requested / not attached", "MG6/07"],
  ["MG6C/002 CCTV continuity statement", "MG6C/002"],
  ["MG6/1 early schedule entry", "MG6/1"],
  ["MG6-04 bank source statements", "MG6/04"],
  ["MG6 04 bank source statements", "MG6/04"],

  // Exhibit and unit references used across the same schedules.
  ["O01 full interview transcript Outstanding Listed but not attached", "O01"],
  ["O1 Full interview transcript Outstanding Requested / not served", "O1"],
  ["O3 CCTV full export Outstanding Requested / not served", "O3"],
  ["O02 CAD log full print Outstanding Not yet served", "O02"],
  ["O04 forensic continuity statement Outstanding Requested from OIC", "O04"],
  ["O05999 audio Outstanding Listed but not attached", "O05"],
  ["O05 999 audio Outstanding Listed but not attached", "O05"],
  ["EX/03 Continuity note Eastmoor Police outstanding", "EX/03"],
  ["EX/01 — item referred to in MG5 (listed).", "EX/01"],
  ["CCTV/2 External camera export Store manager Export log absent", "CCTV/2"],
  ["CCTV/3 Body worn video not served", "CCTV/3"],
  ["BWV/4 Photo still not served", "BWV/4"],
  ["AB/2 Phone download reference referenced only", "AB/2"],
  ["TEL/5 Property continuity note referenced only", "TEL/5"],
  ["DIG/4 Phone screenshot bundle DC Morgan Raw extraction absent", "DIG/4"],
  ["EV/1 digital evidence note", "EV/1"],
  ["6 MG11 Jordan Pike Draft witness statement EX-MUR-005", "EX-MUR-005"],
];

const MUST_NOT_PARSE = [
  // Case file / URN numbering is not a schedule reference for a piece of material.
  "URNNP/2026/000343 Statement of Lena Ross",
  "MG11 — witness statement CB-TB-439",
  "MG5 — case summary CB-TB-439",
  "Digital extraction / device note CB-TB-439",

  // Form names without an item number identify a form, not a listed item.
  "MG5 CASE SUMMARY",
  "MG11 witness statement",
  "MG6 disclosure schedule",

  // `CAD/999` names two kinds of log, not an item numbered 999.
  "CAD/999 — Bundle health note Partial served bundle",
  "11 CAD and 999 summaries Original audio/log outstanding",

  // Page and index chrome, dates, and OCR debris.
  "6 CAD / custody / interview note6-6",
  "Tab 1: Charge sheet / case details",
  "On 29/05/2026 at Albion Road, Ellis Dunn is alleged to have committed the above",
  "20:04 Initial call opened; caller reports incident at Albion Road CAD",
  "This statement is true to the best of my knowledge and belief",
];

for (const [line, expected] of SHOULD_PARSE) {
  assert.equal(parseScheduleRef(line), expected, `should parse ${expected} from: ${line}`);
}

for (const line of MUST_NOT_PARSE) {
  assert.equal(parseScheduleRef(line), null, `must not parse a reference from: ${line}`);
}

// The reference must be the item's own, not the first code anywhere in a long line.
assert.equal(
  parseScheduleRef("MG6/04 bank source statements — see also MG6/03 bank schedule extract"),
  "MG6/04",
  "takes the leading reference, not a cross-reference later in the line",
);

console.log(`schedule-reference-truth: ${SHOULD_PARSE.length + MUST_NOT_PARSE.length + 1} assertions PASS`);
