/**
 * Chase rows must come from the schedule, not from templates.
 *
 * A gap the schedule states by reference is a request the solicitor can send, so it has to reach
 * the chase list carrying that reference. The opposite must hold just as firmly: prose the
 * extractor could not classify, and the schedule itself, must never become a request.
 */
import assert from "node:assert/strict";

import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const SCHEDULE_BUNDLE = `
=== SECTION: MG6 DISCLOSURE SCHEDULE ===
MG6/01 custody record extract Served Contained in papers
MG6/04 bank source statements Outstanding Not in papers supplied
MG6/05 CCTV continuity log Outstanding Awaiting export
MG6/06 analyst certificate Outstanding Awaiting export
MG6/03 unused material schedule Outstanding Not supplied
O03 independent witness statement Outstanding Continuity awaited
O04 forensic continuity statement Outstanding Requested from OIC

=== SECTION: MG5 CASE SUMMARY ===
The complainant states that money was moved between accounts over several weeks.
This statement is true to the best of my knowledge and belief and I make it knowing that
20:04 Initial call opened; caller reports incident at Albion Road
`;

const brief = buildDisclosureChaseBrief({
  caseId: "chase-source-named",
  caseTitle: "Source-named schedule case",
  clientLabel: "Client",
  allegation: "Concealing criminal property",
  stage: "Crown Court",
  hearingStatus: "Listed",
  hearingDateIso: null,
  bundleHealth: "partial",
  positionStatus: "provisional",
  battleboard: null,
  bundleText: SCHEDULE_BUNDLE,
});

const labels = brief.items.map((i) => i.label);
const board = labels.join(" || ");

// --- The schedule's own gaps must be askable ---

for (const ref of ["MG6/04", "MG6/05", "O03", "O04"]) {
  assert.ok(
    labels.some((l) => l.includes(ref)),
    `stated gap ${ref} must reach the chase list carrying its reference — board was: ${board}`,
  );
}

assert.ok(
  brief.items.some((i) => /bank source statements/i.test(i.label)),
  "the schedule's own words must survive onto the card, not a family template",
);

// --- Separately referenced items are separate material ---

const provenanceFamily = brief.items.filter((i) => /^O0[34]\b/.test(i.label));
assert.equal(
  provenanceFamily.length,
  2,
  "O03 and O04 share a chase family but are different documents, so both must stand",
);

assert.equal(
  new Set(brief.items.map((i) => i.label)).size,
  brief.items.length,
  "no two chase cards may carry the same label",
);

// --- The opposite direction: nothing invented, nothing chrome ---

assert.ok(
  !labels.some((l) => /true to the best of my knowledge/i.test(l)),
  "witness-statement boilerplate must never become a chase request",
);

assert.ok(
  !labels.some((l) => /initial call opened/i.test(l)),
  "a CAD timeline line must never become a chase request",
);

assert.ok(
  !labels.some((l) => /unused material schedule|unused schedule clarification/i.test(l)),
  "the schedule itself is not a listed item on it",
);

assert.ok(
  !labels.some((l) => /custody record extract/i.test(l) && !/outstanding|not served/i.test(l)),
  "material the schedule records as served must not be chased",
);

// --- Stated gaps take the slots ahead of templates ---

const firstCard = brief.primaryItems[0]?.label ?? "";
assert.ok(
  /MG6\/|O0\d/.test(firstCard),
  `a gap the schedule states should lead the board, not a template card — got: ${firstCard}`,
);

console.log(`chase-source-named-truth: PASS (${brief.items.length} cards, ${labels.filter((l) => /MG6\/|O0\d/.test(l)).length} source-named)`);
