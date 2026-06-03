#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import {
  inferFamilyFromRouteTitle,
  runCorpusPlaybackChecks,
} from "@/lib/eval/casebrain-auditor/corpus-playback-checks";
import type { CorpusCasePlayback } from "@/lib/eval/casebrain-auditor/corpus-playback-types";

function basePlayback(overrides: Partial<CorpusCasePlayback>): CorpusCasePlayback {
  return {
    caseId: "test-case",
    caseTitle: "Eval demo case",
    corpusBucket: "A",
    documentCount: 3,
    allegedOffence: "Section 18 GBH",
    charges: ["s18 GBH"],
    inferenceText: "section 18 gbh",
    inferredChargeFamily: "violence_domestic_assault",
    workflowProfile: "violence_domestic_assault",
    auditorFamily: "violence_domestic_assault",
    primaryRouteTitle: "Violence / complainant account / injury and participation pressure",
    routeFamily: "violence_domestic_assault",
    courtLines: [],
    hearingLines: [],
    policeStationAdjacentLines: [],
    disclosureChaseLabels: [],
    collapseRisks: [],
    evidenceAnchors: [],
    malformedLineCandidates: [],
    thinBundleStatus: false,
    overallStatus: "usable",
    solicitorSafeSummary: null,
    findings: [],
    ...overrides,
  };
}

function testPublicOrderNotRobbery() {
  const fam = inferFamilyFromRouteTitle("Public-order participation / identification / role pressure");
  assert.equal(fam, "violence_domestic_assault");
}

function testSafeProvesLineNotFlagged() {
  const p = basePlayback({
    hearingLines: [
      "Participation remains conditional — do not overstate what the account proves on the papers.",
    ],
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.equal(
    findings.filter((f) => f.checkId === "hearing.overconfident_wording").length,
    0,
    "safe guidance mentioning ‘proves’ should not fire",
  );
}

function testOverconfidentStillFlagged() {
  const p = basePlayback({
    hearingLines: ["CCTV confirms participation and establishes guilt."],
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.ok(findings.some((f) => f.checkId === "hearing.overconfident_wording"));
}

function testCollapseRiskPhoneNotLeakage() {
  const p = basePlayback({
    collapseRisks: ["Phone extraction may support Crown possession if served."],
    evidenceAnchors: [],
    solicitorSafeSummary: "Violence pressure route — conditional on complainant material.",
    hearingLines: ["Complainant account remains conditional on served MG11."],
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.equal(
    findings.filter((f) => f.checkId === "profile_leakage.violence_pwits").length,
    0,
    "PWITS mention only in collapse risk should not count as leakage",
  );
}

function testChargeRouteMismatch() {
  const p = basePlayback({
    inferredChargeFamily: "fraud_account_control",
    workflowProfile: "fraud_account_control",
    routeFamily: "pwits_phone_attribution",
    primaryRouteTitle: "Possession / knowledge / phone-attribution pressure",
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.ok(findings.some((f) => f.checkId === "routing.charge_vs_route_family"));
}

testPublicOrderNotRobbery();
testSafeProvesLineNotFlagged();
testOverconfidentStillFlagged();
testCollapseRiskPhoneNotLeakage();
function testChaseWrongFamilyNotPhoneOnViolence() {
  const p = basePlayback({
    workflowProfile: "violence_domestic_assault",
    disclosureChaseLabels: ["Chase full phone extraction and BWV if outstanding."],
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.equal(
    findings.filter((f) => f.checkId === "chase.wrong_family_label").length,
    0,
  );
}

function testMalformedHiddenWhenNotVisible() {
  const p = basePlayback({
    evidenceAnchors: ["Clean MG11 reference on file"],
    malformedLineCandidates: ["schedule12Served summary only"],
  });
  const findings = runCorpusPlaybackChecks(p);
  assert.equal(findings.filter((f) => f.checkId === "anchor.malformed").length, 0);
}

testChargeRouteMismatch();
testChaseWrongFamilyNotPhoneOnViolence();
testMalformedHiddenWhenNotVisible();
console.log("corpus-playback-checks.test.ts: ok");
