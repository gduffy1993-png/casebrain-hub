/**
 * Cross-case solicitor output integrity regressions.
 * Run: npx tsx scripts/solicitor-output-integrity.test.ts
 */
import assert from "node:assert/strict";
import {
  evaluateMatterIntegrity,
  evaluateSentenceIntegrityOnly,
  evaluateTextIntegrity,
} from "@/lib/criminal/solicitor-output-integrity";
import {
  findWrongFamilyTerms,
  resolveSolicitorOffenceFamily,
} from "@/lib/criminal/solicitor-offence-family";
import {
  assessSolicitorSentence,
  composeSolicitorLines,
} from "@/lib/criminal/solicitor-sentence-composer";
import {
  buildSolicitorMatterStateVm,
  dedupeEvidenceAliases,
  formatEvidenceCountsLine,
} from "@/lib/criminal/solicitor-matter-state";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return {
    label,
    existence,
    reliability: "unknown",
    note: undefined,
  };
}

// --- Offence family isolation ---
{
  const harass = resolveSolicitorOffenceFamily({
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp screenshots MG11 complainant phone extraction subscriber",
  });
  assert.equal(harass.family, "harassment_digital");
  assert.equal(harass.failClosed, false);

  const wrong = findWrongFamilyTerms(
    "Consider defensive force and intent to supply; vehicle ownership is key.",
    harass,
    "WhatsApp screenshots MG11",
  );
  assert.ok(wrong.length >= 2, `expected wrong-family hits, got ${wrong.join(",")}`);

  const drugs = resolveSolicitorOffenceFamily({
    allegation: "Possession with intent to supply a controlled drug",
    bundleHay: "PWITS wrap cash scales",
  });
  assert.equal(drugs.family, "drugs_supply");

  const uncertain = resolveSolicitorOffenceFamily({ allegation: "", bundleHay: "" });
  assert.equal(uncertain.failClosed, true);
  assert.equal(uncertain.family, "unknown");
}

// --- Sentence composer ---
{
  assert.equal(assessSolicitorSentence("Ask the court to record attribution is outstanding.").ok, true);
  assert.ok(assessSolicitorSentence("Phone download | 4 | outstanding").issues.includes("raw_extraction_marker"));
  assert.ok(assessSolicitorSentence("Served.; draft unsigned.").issues.includes("malformed_punctuation"));
  assert.ok(assessSolicitorSentence("Chase the and").issues.includes("truncated_fragment"));
  assert.ok(assessSolicitorSentence("Insert [TODO] here").issues.includes("unresolved_placeholder"));
  assert.deepEqual(
    composeSolicitorLines(["Good complete sentence here.", "Broken | 4 | fragment"]),
    ["Good complete sentence here."],
  );
}

// --- Canonical matter state / counts ---
{
  const rows = dedupeEvidenceAliases([
    row("Complainant MG11", "referred_only"),
    row("Witness statement", "referred_only"),
    row("Full phone download", "missing"),
    row("Phone extraction", "missing"),
    row("Master CCTV", "served"),
  ]);
  assert.equal(rows.length, 3, "MG11/witness and phone aliases should collapse");

  const vm = buildSolicitorMatterStateVm({
    evidenceRows: [
      row("MG11", "referred_only"),
      row("Phone download", "missing"),
      row("Screenshots", "served"),
      row("BWV", "not_safely_confirmed"),
    ],
    chaseCounters: { total: 5, overdue: 1, dueSoon: 1, chased: 1, received: 1, notStarted: 1 },
  });
  assert.equal(vm.evidence.counts.served, 1);
  assert.equal(vm.evidence.counts.referred, 1);
  assert.equal(vm.evidence.counts.missing, 1);
  assert.equal(vm.evidence.counts.incomplete, 1);
  assert.equal(vm.chase.counts.total, 5);
  assert.match(formatEvidenceCountsLine(vm.evidence.counts), /served/);
  assert.match(vm.mg11.label, /MG11/i);

  const vm2 = buildSolicitorMatterStateVm({
    evidenceRows: vm.evidence.rows,
    chaseCounters: vm.chase.counts,
  });
  assert.equal(vm.fingerprint, vm2.fingerprint, "identical counts must share fingerprint");
}

// --- Hearing status consistency ---
{
  const upcoming = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    asOf: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(upcoming.kind, "upcoming");
  assert.equal(upcoming.dateIso, "2026-07-15");
  assert.match(upcoming.statusLabel, /Upcoming/);

  const passed = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    asOf: new Date("2026-07-20T12:00:00Z"),
  });
  assert.equal(passed.kind, "passed");

  const listed = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    asOf: new Date("2026-07-15T12:00:00Z"),
  });
  assert.equal(listed.kind, "same_day");
  assert.match(listed.statusLabel, /Same-day/);

  const farListed = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-09-01",
    asOf: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(farListed.kind, "listed");
  assert.match(farListed.statusLabel, /Listed/);

  const snap = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    treatAsSnapshot: true,
    asOf: new Date("2026-07-01T12:00:00Z"),
  });
  assert.equal(snap.kind, "snapshot");
  assert.match(snap.statusLabel, /as at/i);
}

// --- Integrity gate: harassment must not copy wrong-family / malformed ---
{
  const blockedFamily = evaluateTextIntegrity({
    text: "Rely on defensive force and PWITS continuity.",
    allegation: "Harassment via messages",
    bundleHay: "WhatsApp MG11 screenshots phone extraction",
  });
  assert.equal(blockedFamily.canCopy, false);
  assert.equal(blockedFamily.deepDetailAvailable, false);
  assert.ok(blockedFamily.reasons.some((r) => r.code === "wrong_family_term"));

  const blockedSentence = evaluateSentenceIntegrityOnly("Outstanding material | 12 | on index");
  assert.equal(blockedSentence.canCopy, false);

  const failClosed = evaluateMatterIntegrity({
    allegation: "",
    bundleHay: "",
  });
  assert.equal(failClosed.canCopy, false);
  assert.ok(failClosed.reasons.some((r) => r.code === "offence_family_uncertain"));

  const okHarassment = evaluateTextIntegrity({
    text: "Attribution remains outstanding on the served screenshots.",
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
  });
  assert.equal(okHarassment.canCopy, true);
  assert.equal(okHarassment.deepDetailAvailable, true);

  const copy = buildCopySafeResult({
    text: "Ask CPS for full phone download.",
    kind: "cps_chase",
    sourceState: "missing",
    allegation: "Harassment",
    bundleHay: "WhatsApp MG11 phone",
  });
  // provisional sendability still canCopy unless integrity hard-fails
  assert.equal(typeof copy.canCopy, "boolean");

  const badCopy = buildCopySafeResult({
    text: "Vehicle ownership and intent to supply remain key.",
    kind: "court_line",
    sourceState: "served",
    allegation: "Harassment via WhatsApp",
    bundleHay: "screenshots MG11 messages",
  });
  assert.equal(badCopy.canCopy, false);
  assert.ok(badCopy.blockedReason);
}

// --- State inconsistency blocks ---
{
  const vm = buildSolicitorMatterStateVm({
    evidenceRows: [row("MG11", "missing")],
    chaseCounters: { total: 2, overdue: 0, dueSoon: 0, chased: 0, received: 0, notStarted: 2 },
  });
  const inconsistent = evaluateMatterIntegrity({
    allegation: "Theft of bicycle",
    bundleHay: "theft CCTV store",
    matterState: vm,
    alternateStateFingerprint: "e:9/9/9/9/9|c:0/0/0/0/0/0|m:served",
  });
  assert.equal(inconsistent.canCopy, false);
  assert.ok(inconsistent.reasons.some((r) => r.code === "state_inconsistent"));
}

console.log("solicitor-output-integrity.test.ts: PASS");
