#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { GOLD_MANUAL_PROOF_SET_V1 } from "../lib/eval/gold-manual-proof-set/catalog";
import {
  chargeMismatchLooksLikeEncro,
  demoteGenericMg6Chase,
  enrichChasePresentation,
  gateCourtLineForFamily,
  isGenericMg6ChaseLabel,
  presentDoNotOverstateForFamily,
  resolveFamilyChaseLabels,
  resolveFamilyCourtLine,
} from "../lib/eval/gold-manual-proof-set/presentation-gates";

assert.equal(GOLD_MANUAL_PROOF_SET_V1.length, 20, "20 gold cases");
const ids = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.goldId));
assert.equal(ids.size, 20, "unique gold ids");
const sources = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.sourceCaseId));
assert.equal(sources.size, 20, "unique source cases");
const families = new Set(GOLD_MANUAL_PROOF_SET_V1.map((c) => c.familySlot));
assert.equal(families.size, 20, "unique family slots");

for (const c of GOLD_MANUAL_PROOF_SET_V1) {
  assert.match(c.goldId, /^CASE-\d{2}$/);
  assert.ok(c.familyLabel.length > 3);
  assert.ok(c.sourceCaseId.startsWith("demo-audit-"));
  assert.ok(c.reviewMinutesTarget <= 10);
}

const case08 = GOLD_MANUAL_PROOF_SET_V1.find((c) => c.goldId === "CASE-08");
assert.ok(case08);
assert.equal(case08!.familyLabel, "charge mismatch");
assert.equal(case08!.sourceCaseId, "demo-audit-69-charge-mg5-hearing");
assert.notEqual(case08!.sourceCaseId, "demo-audit-25-charge-bundle-mismatch");

assert.equal(isGenericMg6ChaseLabel("MG6 / unused schedule clarification"), true);
assert.equal(isGenericMg6ChaseLabel("MG6C clarification on unused material"), true);
assert.equal(isGenericMg6ChaseLabel("Full phone download"), false);

const demoted = demoteGenericMg6Chase([
  { label: "Full phone download" },
  { label: "MG6C clarification on unused material" },
  { label: "Subscriber / account data" },
]);
assert.deepEqual(
  demoted.map((d) => d.label),
  ["Full phone download", "Subscriber / account data"],
);
const lastResort = demoteGenericMg6Chase([{ label: "MG6 / unused schedule clarification" }]);
assert.equal(lastResort.length, 1);

const digitalOnOrder = gateCourtLineForFamily(
  "domestic order / restraining order breach",
  "The defence asks the court to record per MG6C that message/account material remains outstanding.",
);
assert.ok(digitalOnOrder && /sealed order|service-proof/i.test(digitalOnOrder));
assert.ok(!/message\/account/i.test(digitalOnOrder!));

const phoneOk = gateCourtLineForFamily(
  "phone harassment / attribution",
  "The defence asks the court to record per MG6C that screenshot/message material is served.",
);
assert.equal(phoneOk?.includes("screenshot"), true);

const chargeCourt = resolveFamilyCourtLine("charge mismatch");
assert.ok(chargeCourt && /charge wording, MG5 summary, and hearing\/listing/i.test(chargeCourt));
assert.equal(
  gateCourtLineForFamily("charge mismatch", "Position remains provisional on the current papers — listed material families are not safely confirmed in the bundle yet."),
  chargeCourt,
);

const medicalCourt = gateCourtLineForFamily(
  "medical injury report missing",
  "The defence asks the court to record outstanding medical, video and sequence material.",
);
assert.ok(medicalCourt && /hospital records, consultant report, and injury photographs/i.test(medicalCourt));
assert.ok(!/listed material families/i.test(medicalCourt!));

assert.equal(
  chargeMismatchLooksLikeEncro("Encro message extracts handle attribution platform/source"),
  true,
);
assert.equal(
  chargeMismatchLooksLikeEncro("Charge wording MG5 offence summary listing date conflict"),
  false,
);

assert.ok(resolveFamilyChaseLabels("bad redaction").some((l) => /unredacted/i.test(l)));
assert.ok(resolveFamilyChaseLabels("charge mismatch").some((l) => /charge sheet|MG5/i.test(l)));

const enriched = enrichChasePresentation(
  "medical injury report missing",
  [{ label: "MG6 / unused schedule clarification" }],
  ["hospital records", "consultant medical report", "injury photographs"],
);
assert.equal(enriched.length, 3);
assert.ok(!enriched.some((e) => /mg6/i.test(e.label)));
assert.ok(enriched.some((e) => /hospital/i.test(e.label)));

const keepSubstantive = enrichChasePresentation(
  "phone harassment / attribution",
  [
    { label: "Full phone download" },
    { label: "Subscriber / account data" },
    { label: "MG6C clarification on unused material" },
  ],
  ["full phone download", "subscriber/account data", "full message export"],
);
assert.ok(keepSubstantive.every((e) => !/mg6c clarification/i.test(e.label)));
assert.ok(keepSubstantive.some((e) => /phone download/i.test(e.label)));

const chargeOverstate = presentDoNotOverstateForFamily("charge mismatch", [
  "safely confirms guilt",
  "fully proved on current disclosure",
  "Do not import ABE unless the papers support it.",
  "Do not import phone extraction/metadata unless the papers support it.",
  "Do not overstate charge alignment on current papers",
]);
assert.ok(chargeOverstate.includes("unsafe proof/outcome wording blocked"));
assert.ok(!chargeOverstate.some((s) => /safely confirms guilt|ABE|phone extraction/i.test(s)));
assert.ok(chargeOverstate.some((s) => /charge alignment/i.test(s)));

const prisonOverstate = presentDoNotOverstateForFamily("prison calls / call logs", [
  "safely confirms guilt",
  "Do not import phone extraction/metadata unless the papers support it.",
  "Do not import ABE unless the papers support it.",
]);
assert.deepEqual(prisonOverstate, ["unsafe proof/outcome wording blocked"]);

console.log("gold-manual-proof-set.test.ts: PASS");
