#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { GOLD_MANUAL_PROOF_SET_V1 } from "../lib/eval/gold-manual-proof-set/catalog";
import {
  chargeMismatchLooksLikeEncro,
  demoteGenericMg6Chase,
  gateCourtLineForFamily,
  isGenericMg6ChaseLabel,
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

assert.equal(
  chargeMismatchLooksLikeEncro("Encro message extracts handle attribution platform/source"),
  true,
);
assert.equal(
  chargeMismatchLooksLikeEncro("Charge wording MG5 offence summary listing date conflict"),
  false,
);

console.log("gold-manual-proof-set.test.ts: PASS");
