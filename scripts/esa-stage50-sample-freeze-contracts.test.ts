/**
 * Stage-50 stratified sample freeze contracts.
 * Deterministic-repeat + no-duplicate. Does NOT run auditor controls.
 *
 * Run: npx tsx scripts/esa-stage50-sample-freeze-contracts.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  bucketOffenceFamily,
  buildCaseStrataProfile,
  freezeStage50Sample,
  selectStratifiedStage50Sample,
  STAGE50_SAMPLE_POLICY_VERSION,
  STAGE50_SAMPLE_SIZE,
  type CaseStrataProfile,
} from "@/lib/eval/master-assurance-auditor/esa-stage50-sample-freeze";
import {
  loadEsaCasePacket,
  DEFAULT_ESA_CORPUS_ROOT,
} from "@/lib/eval/master-assurance-auditor/esa-adapter";
import { sha256Hex } from "@/lib/eval/master-assurance-auditor/hashes";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  ok  ${name}`);
  passed += 1;
}

function fakeProfile(over: Partial<CaseStrataProfile> & { caseId: string }): CaseStrataProfile {
  const caseId = over.caseId;
  return {
    packetPath: `artifacts/evidence-state-audit-local/cases/${caseId}`,
    hashes: {
      bundleTextSha256: sha256Hex(`b-${caseId}`),
      casebrainOutputSha256: sha256Hex(`o-${caseId}`),
      truthKeySha256: sha256Hex(`t-${caseId}`),
    },
    familyRaw: "robbery_id",
    familyBucket: "robbery",
    evidenceTypeBuckets: ["cctv"],
    stateFlags: ["has_served", "has_missing"],
    issueTags: ["hearing"],
    complexityBand: "moderate",
    complexityScore: 20,
    truthItemCount: 5,
    surfaceCount: 8,
    missingFieldCount: 1,
    hasCopyableSurface: true,
    hasNonCopyableSurface: true,
    exitModesPresent: ["view", "copy"],
    outputShape: {
      hasFiveAnswers: true,
      hasEvidenceStates: true,
      hasChase: true,
      hasCourtNote: true,
      hasDoNotOverstate: true,
      missingFieldHeavy: false,
    },
    selectionKey: sha256Hex(`${STAGE50_SAMPLE_POLICY_VERSION}|${caseId}`),
    ...over,
  };
}

async function main() {
  console.log("ESA STAGE-50 SAMPLE FREEZE CONTRACTS\n");

  console.log("1 — POLICY");
  await check("policy version is esa-stage50-sample-v1", () => {
    assert.equal(STAGE50_SAMPLE_POLICY_VERSION, "esa-stage50-sample-v1");
    assert.equal(STAGE50_SAMPLE_SIZE, 50);
  });
  await check("family bucketing collapses aliases deterministically", () => {
    assert.equal(bucketOffenceFamily("robbery_id"), "robbery");
    assert.equal(bucketOffenceFamily("driving_motoring"), "motoring");
    assert.equal(bucketOffenceFamily("pwits_phone"), "drugs");
    assert.equal(bucketOffenceFamily("encro_encrypted_comms"), "encro_digital");
  });

  console.log("\n2 — NO DUPLICATES");
  await check("selectStratifiedStage50Sample never duplicates caseIds", () => {
    const profiles: CaseStrataProfile[] = [];
    for (let i = 0; i < 80; i++) {
      profiles.push(
        fakeProfile({
          caseId: `sim-${String(i).padStart(3, "0")}`,
          familyBucket: (
            [
              "robbery",
              "motoring",
              "drugs",
              "violence",
              "fraud",
              "sexual",
              "harassment_domestic",
              "weapons",
              "youth",
              "public_order",
              "custody_pace",
              "breach",
              "encro_digital",
              "perverting",
              "mixed_generic",
              "other",
            ] as const
          )[i % 16]!,
          evidenceTypeBuckets: (
            [
              "mg5",
              "bwv",
              "digital",
              "witness_statement",
              "custody_pace",
              "interview",
              "cctv",
              "encro",
              "inference",
              "other_typed",
            ] as const
          ).slice(0, (i % 5) + 1) as CaseStrataProfile["evidenceTypeBuckets"],
          stateFlags: [
            "has_served",
            "has_referred_only",
            "has_missing",
            "has_incomplete",
            "has_not_safely_confirmed",
            "has_inferred_only",
            "has_other_defendant_only",
          ].slice(0, (i % 7) + 1) as CaseStrataProfile["stateFlags"],
          issueTags: (
            [
              "attribution",
              "chronology",
              "hearing",
              "document_version",
              "extract_vs_full",
              "draft_vs_signed",
              "recording_vs_transcript",
              "clip_vs_master",
              "fn_incomplete_disclaimer_class",
            ] as const
          ).slice(0, (i % 5) + 1) as CaseStrataProfile["issueTags"],
          complexityBand: (["simple", "moderate", "complex"] as const)[i % 3]!,
        }),
      );
    }
    const { selected } = selectStratifiedStage50Sample({ profiles, sampleSize: 50 });
    assert.equal(selected.length, 50);
    const ids = selected.map((s) => s.caseId);
    assert.equal(new Set(ids).size, 50);
  });

  console.log("\n3 — DETERMINISTIC REPEAT");
  await check("same population yields identical ordered membership twice", () => {
    const profiles: CaseStrataProfile[] = [];
    for (let i = 0; i < 60; i++) {
      profiles.push(
        fakeProfile({
          caseId: `det-${String(i).padStart(3, "0")}`,
          familyBucket: (["robbery", "motoring", "drugs", "violence"] as const)[i % 4]!,
        }),
      );
    }
    const a = selectStratifiedStage50Sample({ profiles, sampleSize: 50 });
    const b = selectStratifiedStage50Sample({ profiles, sampleSize: 50 });
    assert.deepEqual(
      a.selected.map((s) => s.caseId),
      b.selected.map((s) => s.caseId),
    );
    assert.deepEqual(
      a.selected.map((s) => s.selectionReason),
      b.selected.map((s) => s.selectionReason),
    );
  });
  await check("selection is not accepted.slice(0,50) lexical order", () => {
    const profiles: CaseStrataProfile[] = [];
    for (let i = 0; i < 80; i++) {
      profiles.push(
        fakeProfile({
          caseId: `lex-${String(i).padStart(3, "0")}`,
          familyBucket: (
            [
              "robbery",
              "motoring",
              "drugs",
              "violence",
              "fraud",
              "sexual",
              "harassment_domestic",
              "weapons",
            ] as const
          )[i % 8]!,
        }),
      );
    }
    const { selected } = selectStratifiedStage50Sample({ profiles, sampleSize: 50 });
    const lexical = [...profiles]
      .map((p) => p.caseId)
      .sort()
      .slice(0, 50);
    const chosen = selected.map((s) => s.caseId);
    // Must differ from naive lexical slice OR at least not be identical membership order
    assert.notDeepEqual(chosen, lexical);
  });

  console.log("\n4 — BLIND TO AUDITOR / SEPARATION");
  await check("selectionReason never references pass/fail/defect findings", () => {
    const profiles = Array.from({ length: 60 }, (_, i) =>
      fakeProfile({ caseId: `blind-${i}` }),
    );
    const { selected } = selectStratifiedStage50Sample({ profiles, sampleSize: 50 });
    for (const s of selected) {
      assert.ok(!/pass|fail|defect|finding/i.test(s.selectionReason));
      assert.ok(s.selectionReason.startsWith("strata:") || s.selectionReason.startsWith("fill:"));
    }
  });
  await check("live freeze retains independent input hashes (source/output/truth)", () => {
    // Spot-check a few live packets for profile building without full freeze
    const sampleIds = ["sim-100", "sim-200", "sim-300"];
    for (const id of sampleIds) {
      const dir = path.join(DEFAULT_ESA_CORPUS_ROOT, id);
      if (!fs.existsSync(dir)) continue;
      const loaded = loadEsaCasePacket(dir);
      assert.equal(loaded.ok, true);
      if (!loaded.ok) continue;
      const profile = buildCaseStrataProfile(loaded);
      assert.equal(profile.hashes.bundleTextSha256.length, 64);
      assert.equal(profile.hashes.casebrainOutputSha256.length, 64);
      assert.equal(profile.hashes.truthKeySha256.length, 64);
      assert.notEqual(profile.hashes.bundleTextSha256, profile.hashes.truthKeySha256);
      assert.ok(profile.familyBucket);
      assert.equal(profile.caseId, id);
    }
  });

  console.log("\n5 — FULL LIVE FREEZE (NO CONTROLS)");
  await check("freezeStage50Sample returns exactly 50 unique cases with hash", () => {
    const freeze = freezeStage50Sample({
      corpusRoot: DEFAULT_ESA_CORPUS_ROOT,
      sampleSize: 50,
    });
    assert.equal(freeze.rules.controlsExecuted, false);
    assert.equal(freeze.rules.findingsGenerated, false);
    assert.equal(freeze.rules.blindToAuditorOutcomes, true);
    assert.equal(freeze.sampleSize, 50);
    assert.equal(freeze.membership.length, 50);
    assert.equal(new Set(freeze.membership.map((m) => m.caseId)).size, 50);
    assert.equal(freeze.orderedMembershipHash.length, 64);
    assert.ok(freeze.populationUniqueValid >= 50);
    assert.ok(freeze.excludedPopulationCount >= 0);
    assert.ok(freeze.coverage.familyBucketsCovered.length >= 8);
    assert.equal(freeze.coverage.exitApplicability.export.status, "not_exercised");
    assert.equal(freeze.coverage.exitApplicability.api.status, "not_exercised");
    assert.equal(freeze.coverage.exitApplicability.pdf.status, "not_exercised");
    assert.equal(freeze.coverage.exitApplicability.composed_prose.status, "not_exercised");
    // Every member has selection reason + strata
    for (const m of freeze.membership) {
      assert.ok(m.selectionReason);
      assert.ok(m.strata.caseId === m.caseId);
      assert.ok(m.strata.familyBucket);
    }
  });
  await check("two live freezes produce identical ordered membership hash", () => {
    const a = freezeStage50Sample({ corpusRoot: DEFAULT_ESA_CORPUS_ROOT, sampleSize: 50 });
    const b = freezeStage50Sample({ corpusRoot: DEFAULT_ESA_CORPUS_ROOT, sampleSize: 50 });
    assert.equal(a.orderedMembershipHash, b.orderedMembershipHash);
    assert.deepEqual(
      a.membership.map((m) => m.caseId),
      b.membership.map((m) => m.caseId),
    );
  });

  // tiny synthetic corpus refusal path
  await check("freeze throws when population cannot fill sample size", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-freeze-tiny-"));
    assert.throws(() => freezeStage50Sample({ corpusRoot: tmp, sampleSize: 50 }), /failed|required/i);
  });

  console.log(`\nesa-stage50-sample-freeze-contracts: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
