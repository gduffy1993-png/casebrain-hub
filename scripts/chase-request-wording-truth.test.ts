/**
 * A request must read as a request.
 *
 * Flattening welds a schedule row's status cell onto its description
 * (`EX-MUR-002MG5 Case SummaryServed summary/draft`). Left welded, the card asks for
 * "MG5 Case Summary Served summary/draft" — wording no one can send, which states the item is
 * served in the middle of asking for it. The description is what is asked for; the status is what
 * the schedule says about it; the two must not be the same string.
 *
 * The opposite must hold too: stripping the status must not strip the description, leaving a card
 * that names a reference and nothing else.
 */
import assert from "node:assert/strict";

import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  parseScheduleRef,
  normaliseBundleMaterials,
} from "../lib/criminal/bundle-material-normalizer";

// --- A reference welded to its description is still a reference ---

assert.equal(
  parseScheduleRef("EX-MUR-001Charge SheetServed summary/draft"),
  "EX-MUR-001",
  "an exhibit reference welded to its description must still parse",
);
assert.equal(
  parseScheduleRef("2Charge sheet extractServedEX-MUR-001"),
  "EX-MUR-001",
  "an index row carrying its reference last must still parse",
);

// --- The status cell leaves the label, but not the row ---

const EXHIBIT_LIST = `
=== SECTION: MG6 DISCLOSURE SCHEDULE ===
EX-MUR-001Charge SheetServed summary/draft
EX-MUR-002MG5 Case SummaryServed summary/draft
EX-MUR-021Interview SummaryFull recording/transcript outstanding
MG6C/002 Full medical report absent Injury severity and causation incomplete
`;

const rows = normaliseBundleMaterials(EXHIBIT_LIST);

const mg5 = rows.find((r) => r.scheduleRef === "EX-MUR-002");
assert.ok(mg5, "EX-MUR-002 must reach the ledger");
assert.doesNotMatch(
  mg5!.label,
  /\bserved\b/i,
  `the description must not carry the status cell — got: ${mg5!.label}`,
);
assert.match(
  `${mg5!.detail ?? ""}`,
  /served summary\/draft/i,
  "the status cell must survive on the row even after leaving the label",
);

// A schedule table's tab number identifies the row's place in the table, not the document.
const indexRows = normaliseBundleMaterials(`
=== SECTION: MG6 DISCLOSURE SCHEDULE ===
10CCTV stills and timing noteMaster footage outstandingEX-MUR-009
11CAD and 999 summariesOriginal audio/log outstandingEX-MUR-012
`);
for (const row of indexRows) {
  assert.doesNotMatch(
    row.label,
    /^\d{1,2}\s/,
    `a row number is table furniture, not part of the material's name — got: ${row.label}`,
  );
}
assert.ok(
  indexRows.some((r) => /^CCTV stills/i.test(r.label)),
  `the description must survive the row number being removed — got: ${indexRows.map((r) => r.label).join(" | ")}`,
);

const medical = rows.find((r) => r.scheduleRef === "MG6C/002");
assert.ok(medical, "MG6C/002 must reach the ledger");
assert.match(
  medical!.displayLine,
  /MG6C\/002.*absent.*Injury severity/i,
  `both the status and the detail must survive on the display line — got: ${medical!.displayLine}`,
);

// --- No chase card may state the item is served while asking for it ---

const brief = buildDisclosureChaseBrief({
  caseId: "chase-request-wording",
  caseTitle: "Exhibit list case",
  clientLabel: "Client",
  allegation: "Murder",
  stage: "Crown Court",
  hearingStatus: "Listed",
  hearingDateIso: null,
  bundleHealth: "partial",
  positionStatus: "provisional",
  battleboard: null,
  bundleText: EXHIBIT_LIST,
} as never);

for (const item of brief.items) {
  assert.doesNotMatch(
    item.label,
    /\bserved\b/i,
    `a request must not state the item is served — got: ${item.label}`,
  );
  assert.doesNotMatch(
    item.draftChaseWording,
    /\bserved summary\/draft\b/i,
    `copy-out wording must not carry a status cell — got: ${item.draftChaseWording}`,
  );
  // A card naming only a reference asks for nothing identifiable.
  const withoutRef = item.label.replace(
    /\b(?:MG\d{1,2}[A-Z]?(?:\/\d{1,4})?|EX-[A-Z]{2,4}-\d{2,4}|[A-Z]{1,5}\/\d{1,3}|O\d{2})\b/g,
    "",
  );
  assert.match(
    withoutRef,
    /[A-Za-z]{4,}/,
    `a request must name the material, not just its reference — got: ${item.label}`,
  );
}

// --- Material the schedule states is absent outranks material served in summary form ---

const ranked = brief.primaryItems.map((i) => i.label);
const interviewAt = ranked.findIndex((l) => /interview/i.test(l));
const chargeSheetAt = ranked.findIndex((l) => /charge sheet/i.test(l));
if (interviewAt >= 0 && chargeSheetAt >= 0) {
  assert.ok(
    interviewAt < chargeSheetAt,
    `an outstanding item must outrank one served in summary form — board was: ${ranked.join(" || ")}`,
  );
}

console.log(`chase-request-wording-truth: PASS (${brief.items.length} cards checked)`);
