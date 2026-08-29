/**
 * Solicitor fact record — unknown is legal; invented family is not.
 * Run: npx tsx scripts/solicitor-fact-record.test.ts
 */
import assert from "node:assert/strict";
import {
  buildSolicitorFactRecord,
  parseSolicitorFactRecordInput,
  SOLICITOR_FACT_RECORD_VERSION,
} from "@/lib/criminal/solicitor-fact-record";
import {
  NOT_CONFIRMED_ON_FILE,
  renderSolicitorFacts,
  solicitorTextAssertsUnconfirmedFamily,
} from "@/lib/criminal/solicitor-fact-renderer";
import {
  answerSolicitorFactQuestion,
  isSolicitorFactRecordQuestion,
} from "@/lib/criminal/solicitor-fact-chat";
import { buildSolicitorMatterStateVm } from "@/lib/criminal/solicitor-matter-state";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "unknown" };
}

{
  const empty = buildSolicitorFactRecord({});
  assert.equal(empty.version, SOLICITOR_FACT_RECORD_VERSION);
  assert.equal(empty.slots.charge.status, "unknown");
  assert.equal(empty.slots.family.status, "unknown");
  assert.equal(empty.slots.hearing.status, "unknown");
  const rendered = renderSolicitorFacts(empty);
  assert.match(rendered.chargeLine, new RegExp(NOT_CONFIRMED_ON_FILE));
  assert.match(rendered.familyLine, new RegExp(NOT_CONFIRMED_ON_FILE));
}

{
  const harass = buildSolicitorFactRecord({
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp screenshots MG11 complainant phone extraction subscriber",
  });
  assert.equal(harass.slots.charge.status, "confirmed");
  assert.equal(harass.slots.family.status, "confirmed");
  assert.match(harass.slots.family.value ?? "", /Harassment/);
  const hits = solicitorTextAssertsUnconfirmedFamily(
    "Consider intent to supply and PWITS continuity.",
    harass,
  );
  assert.equal(hits.length, 0, "confirmed harassment family uses the existing gate, not this lint");
}

{
  const uncertain = buildSolicitorFactRecord({
    allegation: "Matter under review",
    bundleHay: "Index page only. No charge sheet.",
  });
  assert.equal(uncertain.slots.family.status, "unknown");
  const leaks = solicitorTextAssertsUnconfirmedFamily(
    "This looks like PWITS with intent to supply.",
    uncertain,
  );
  assert.ok(leaks.includes("drugs supply / PWITS"));
}

{
  const sexualHay = "Complainant ABE interview. Sexual offences act. No GBH. No ABH.";
  const mapped = resolveSolicitorOffenceFamily({
    allegation: "Sexual assault",
    bundleHay: sexualHay,
  });
  assert.equal(mapped.family, "violence", "legacy resolver still maps sexual → violence");
  const record = buildSolicitorFactRecord({
    allegation: "Sexual assault",
    bundleHay: sexualHay,
    offenceFamily: mapped,
  });
  assert.equal(record.slots.family.status, "unknown");
  assert.equal(record.slots.family.source, "sexual_offence_not_confirmed_as_violence");
}

{
  const vm = buildSolicitorMatterStateVm({
    evidenceRows: [row("MG11 complainant", "served"), row("CCTV extract", "referred_only")],
    chaseCounters: { total: 2, overdue: 1, dueSoon: 0, chased: 0, received: 0, notStarted: 1 },
    allegation: "Theft of a bicycle",
    bundleHay: "Theft dishonest appropriation",
    caseId: "fact-record-test",
  });
  const hearing = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-09-04",
    asOf: new Date("2026-08-29T12:00:00Z"),
  });
  const record = buildSolicitorFactRecord({
    allegation: "Theft of a bicycle",
    bundleHay: "Theft dishonest appropriation",
    matterState: vm,
    hearing,
  });
  assert.equal(record.slots.evidenceServed.status, "confirmed");
  assert.equal(record.slots.evidenceServed.value, "1");
  assert.equal(record.slots.evidenceReferred.value, "1");
  assert.equal(record.slots.hearing.status, "confirmed");
  assert.ok(record.fingerprint);
  const rendered = renderSolicitorFacts(record);
  assert.match(rendered.evidenceCountsLine, /1 served/);
  assert.match(rendered.evidenceCountsLine, /1 referred/);
  assert.doesNotMatch(rendered.chatFactSheet, /PWITS/);
}

{
  assert.equal(isSolicitorFactRecordQuestion("What is confirmed on the file?"), true);
  assert.equal(isSolicitorFactRecordQuestion("What must the prosecution prove?"), false);
  assert.equal(isSolicitorFactRecordQuestion("What is the primary allegation?"), false);
  const rendered = renderSolicitorFacts(buildSolicitorFactRecord({ allegation: "Theft of a bicycle" }));
  const sheet = answerSolicitorFactQuestion("What is confirmed on the file?", rendered);
  assert.ok(sheet?.includes("Charge: Theft of a bicycle"));
  assert.equal(answerSolicitorFactQuestion("What must the prosecution prove?", rendered), null);
}

{
  const vm = buildSolicitorMatterStateVm({
    evidenceRows: [row("MG11 complainant", "served")],
    chaseCounters: { total: 1, overdue: 0, dueSoon: 0, chased: 0, received: 0, notStarted: 1 },
    allegation: "Theft of a bicycle",
    bundleHay: "Theft dishonest appropriation",
    caseId: "desk-payload",
  });
  const desk = buildSolicitorFactRecord({
    allegation: "Theft of a bicycle",
    bundleHay: "Theft dishonest appropriation",
    matterState: vm,
  });
  const parsed = parseSolicitorFactRecordInput(JSON.parse(JSON.stringify(desk)));
  assert.ok(parsed);
  assert.equal(parsed?.slots.evidenceServed.value, desk.slots.evidenceServed.value);
  assert.equal(parseSolicitorFactRecordInput({ version: "nope" }), null);
  const fromDesk = renderSolicitorFacts(parsed!);
  assert.match(fromDesk.evidenceCountsLine, /served/);
}

console.log("solicitor-fact-record.test.ts: PASS");
