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
  prefersFamilyChasePresentation,
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

const bwvOverstate = presentDoNotOverstateForFamily("BWV referred-only", [
  "BWV shows",
  "BWV confirms",
  "PACE safeguards were followed",
  "CCTV proves",
  "Encro handle",
]);
assert.ok(bwvOverstate.some((s) => /\bbwv\b/i.test(s)));
assert.ok(!bwvOverstate.some((s) => /\bcctv\b|\bencro\b/i.test(s)));

const cctvOverstate = presentDoNotOverstateForFamily("CCTV stills vs master footage", [
  "CCTV proves identity",
  "CCTV proves offence",
  "positive identification from stills",
  "Encro handle",
  "BWV shows",
]);
assert.ok(cctvOverstate.every((s) => !/\bencro\b|\bbwv\b/i.test(s)));
assert.ok(cctvOverstate.some((s) => /\bcctv\b/i.test(s)));

const phoneChase = enrichChasePresentation(
  "phone harassment / attribution",
  [
    { label: "Full phone download" },
    { label: "Subscriber / account data" },
    { label: "Full message export" },
    { label: "Call logs" },
    { label: "Final signed MG11" },
  ],
  ["full phone download", "subscriber/account data", "full message export", "call logs", "final signed MG11"],
);
assert.ok(!phoneChase.some((c) => /call logs/i.test(c.label)));
assert.ok(phoneChase.some((c) => /phone download/i.test(c.label)));

const bwvChase = enrichChasePresentation(
  "BWV referred-only",
  [
    { label: "Full BWV export" },
    { label: "Full custody record" },
    { label: "Interview audio" },
    { label: "Interview transcript" },
    { label: "PACE safeguards detail" },
  ],
  ["full BWV export", "full custody record", "interview audio", "interview transcript", "PACE safeguards detail"],
);
assert.ok(bwvChase.some((c) => /Interview audio \/ transcript/i.test(c.label)));
assert.ok(!bwvChase.some((c) => /^Interview audio$/i.test(c.label) || /PACE/i.test(c.label)));

const cctvChase = enrichChasePresentation(
  "CCTV stills vs master footage",
  [
    { label: "Master CCTV footage" },
    { label: "Full CCTV export" },
    { label: "CCTV Continuity / provenance" },
    { label: "audit trail" },
  ],
  ["master CCTV footage", "full CCTV export", "continuity/provenance", "audit trail"],
);
assert.ok(cctvChase.some((c) => /CCTV audit trail \/ source hash/i.test(c.label)));
assert.ok(!cctvChase.some((c) => /^audit trail$/i.test(c.label)));

const cctvCourt = gateCourtLineForFamily(
  "CCTV stills vs master footage",
  "The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage and continuity/provenance remain outstanding.",
);
assert.ok(cctvCourt && /full export/i.test(cctvCourt));

assert.equal(prefersFamilyChasePresentation("motoring SJP thin evidence"), true);
assert.equal(prefersFamilyChasePresentation("OCR/date/court mismatch"), true);
assert.equal(prefersFamilyChasePresentation("charge mismatch"), false);

const s172Chase = enrichChasePresentation(
  "motoring SJP thin evidence",
  [
    { label: "Device calibration certificate" },
    { label: "Full intoxilyser record" },
    { label: "CCTV / dashcam export" },
  ],
  ["device calibration certificate", "full intoxilyser record", "cctv/dashcam export"],
);
assert.ok(s172Chase.some((c) => /s172|identify driver|keeper|nomination|SJP/i.test(c.label)));
assert.ok(!s172Chase.some((c) => /intoxilyser|calibration/i.test(c.label)));

const s172Court = gateCourtLineForFamily(
  "motoring SJP thin evidence",
  "The defence asks the court to record per MG6C that procedure summary is served but device calibration remains outstanding.",
);
assert.ok(s172Court && /s172|keeper|nomination|driver identification/i.test(s172Court));
assert.ok(!/intoxilyser|calibration/i.test(s172Court!));

const s172Overstate = presentDoNotOverstateForFamily("motoring SJP thin evidence", [
  "Do not treat device summary as proof of reliability",
  'Do not state "CCTV stills served — master footage outstanding; ID not safely confirmed from current papers.',
]);
assert.ok(s172Overstate.some((s) => /device summary|reliability/i.test(s)));
assert.ok(!s172Overstate.some((s) => /cctv stills|master footage/i.test(s)));

const ocrChase = enrichChasePresentation(
  "OCR/date/court mismatch",
  [
    { label: "Master CCTV footage" },
    { label: "Full CCTV export" },
    { label: "CCTV Continuity / provenance" },
  ],
  ["master cctv footage", "full cctv export"],
);
assert.ok(ocrChase.some((c) => /listing|hearing|OCR|date verification/i.test(c.label)));
assert.ok(!ocrChase.some((c) => /master cctv|cctv export/i.test(c.label)));

const ocrCourt = gateCourtLineForFamily(
  "OCR/date/court mismatch",
  "The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage and continuity/provenance remain outstanding.",
);
assert.ok(ocrCourt && /OCR|listing|hearing/i.test(ocrCourt));
assert.ok(!/CCTV still|master CCTV/i.test(ocrCourt!));

const ocrOverstate = presentDoNotOverstateForFamily("OCR/date/court mismatch", [
  "positive identification from stills",
  "Do not treat stills alone as proof of identity or offence.",
]);
assert.ok(ocrOverstate.every((s) => !/stills|cctv/i.test(s)));
assert.ok(ocrOverstate.some((s) => /OCR|listing date/i.test(s)));

const chargeStill = enrichChasePresentation(
  "charge mismatch",
  [
    { label: "Corrected charge sheet" },
    { label: "Updated MG5" },
    { label: "Court listing confirmation / charge-MG5-listing alignment" },
  ],
  ["corrected charge sheet", "updated mg5", "court listing confirmation"],
);
assert.ok(chargeStill.some((c) => /charge sheet|MG5|listing/i.test(c.label)));

console.log("gold-manual-proof-set.test.ts: PASS");
