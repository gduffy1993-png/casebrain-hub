/**
 * ESA Stage-50 adapter contracts — load/validate only.
 * Does NOT run auditor controls or generate stage-50 findings.
 *
 * Run: npx tsx scripts/esa-stage50-adapter-contracts.test.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectTruthOutputConflation,
  findDuplicateCaseIds,
  loadEsaCasePacket,
  validateEsaAdapter,
  ESA_ADAPTER_ID,
  DEFAULT_ESA_CORPUS_ROOT,
} from "@/lib/eval/master-assurance-auditor/esa-adapter";
import { resolveCorpusForStage, STAGE_CORPUS_PLAN } from "@/lib/eval/master-assurance-auditor/corpus-plan";
import { sha256Hex } from "@/lib/eval/master-assurance-auditor/hashes";

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  ok  ${name}`);
  passed += 1;
}

function writeCase(
  root: string,
  caseId: string,
  files: {
    bundle?: string;
    output?: string | object;
    truth?: string | object;
    skipBundle?: boolean;
    skipOutput?: boolean;
    skipTruth?: boolean;
  } = {},
) {
  const dir = path.join(root, caseId);
  fs.mkdirSync(dir, { recursive: true });
  if (!files.skipBundle) {
    fs.writeFileSync(path.join(dir, "bundle-text.md"), files.bundle ?? `# ${caseId}\nbundle\n`);
  }
  if (!files.skipOutput) {
    const out =
      typeof files.output === "string"
        ? files.output
        : JSON.stringify(
            files.output ?? {
              caseId,
              generatedAt: "2026-07-29T00:00:00.000Z",
              fiveAnswersEvidenceRows: [
                { label: "CCTV clips", existence: "served", reliability: "needs_review" },
              ],
              warningsAndGaps: {
                doNotOverstate: ["Do not overstate CCTV."],
                chaseItems: [
                  {
                    label: "Full CCTV master",
                    copySuggestion: "Please provide Full CCTV master.",
                  },
                ],
              },
              courtNote: {
                text: "Court line for " + caseId,
                canCopy: true,
              },
            },
            null,
            2,
          );
    fs.writeFileSync(path.join(dir, "casebrain-output.json"), out);
  }
  if (!files.skipTruth) {
    const truth =
      typeof files.truth === "string"
        ? files.truth
        : JSON.stringify(
            files.truth ?? {
              caseId,
              offenceFamily: "test_family",
              offenceWording: "Test offence wording from truth only",
              evidenceItems: [
                {
                  evidence_item: "Full CCTV master",
                  evidence_type: "cctv",
                  correct_evidence_state: "missing",
                  chase_needed: true,
                  safe_to_rely_on: false,
                  must_not_say: ["CCTV proves guilt"],
                  source_page_anchor: "3",
                },
              ],
              mustNotSayGlobal: ["Truth-only global ban"],
            },
            null,
            2,
          );
    fs.writeFileSync(path.join(dir, "truth-key.json"), truth);
  }
  return dir;
}

async function main() {
  console.log("ESA STAGE-50 ADAPTER CONTRACTS\n");

  console.log("1 — BINDING / PLAN");
  await check("stage 50 plan binds esa-local-materialised adapter", () => {
    assert.equal(STAGE_CORPUS_PLAN["50"].adapterId, ESA_ADAPTER_ID);
    assert.equal(STAGE_CORPUS_PLAN["50"].requiredUniqueCases, 50);
  });
  await check("default ESA corpus root points at evidence-state-audit-local/cases", () => {
    assert.match(DEFAULT_ESA_CORPUS_ROOT.replace(/\\/g, "/"), /evidence-state-audit-local\/cases$/);
  });

  console.log("\n2 — MISSING FILES");
  await check("missing casebrain-output.json is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-miss-out-"));
    writeCase(tmp, "sim-miss-out", { skipOutput: true });
    const r = loadEsaCasePacket(path.join(tmp, "sim-miss-out"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_casebrain_output");
  });
  await check("missing truth-key.json is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-miss-truth-"));
    writeCase(tmp, "sim-miss-truth", { skipTruth: true });
    const r = loadEsaCasePacket(path.join(tmp, "sim-miss-truth"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_truth_key");
  });
  await check("missing bundle-text.md is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-miss-bundle-"));
    writeCase(tmp, "sim-miss-bundle", { skipBundle: true });
    const r = loadEsaCasePacket(path.join(tmp, "sim-miss-bundle"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_bundle_text");
  });

  console.log("\n3 — MALFORMED JSON");
  await check("malformed casebrain-output.json is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-bad-out-"));
    writeCase(tmp, "sim-bad-out", { output: "{not-json" });
    const r = loadEsaCasePacket(path.join(tmp, "sim-bad-out"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "malformed_casebrain_output");
  });
  await check("malformed truth-key.json is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-bad-truth-"));
    writeCase(tmp, "sim-bad-truth", { truth: "{nope" });
    const r = loadEsaCasePacket(path.join(tmp, "sim-bad-truth"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "malformed_truth_key");
  });

  console.log("\n4 — IDENTITY MISMATCH");
  await check("folder vs output.caseId mismatch is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-id-out-"));
    writeCase(tmp, "sim-folder-a", {
      output: {
        caseId: "sim-other-id",
        fiveAnswersEvidenceRows: [],
        courtNote: { text: "x", canCopy: true },
      },
    });
    const r = loadEsaCasePacket(path.join(tmp, "sim-folder-a"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "identity_mismatch");
  });
  await check("folder vs truth.caseId mismatch is rejected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-id-truth-"));
    writeCase(tmp, "sim-folder-b", {
      truth: {
        caseId: "sim-wrong-truth",
        evidenceItems: [
          {
            evidence_item: "x",
            correct_evidence_state: "missing",
          },
        ],
      },
    });
    const r = loadEsaCasePacket(path.join(tmp, "sim-folder-b"));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "identity_mismatch");
  });

  console.log("\n5 — DUPLICATES / SUFFICIENCY");
  await check("duplicate caseIds are rejected and counted", () => {
    assert.deepEqual(findDuplicateCaseIds(["sim-a", "sim-b", "sim-a", "SIM-B"]), [
      "sim-a",
      "SIM-B",
    ]);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-dup-"));
    writeCase(tmp, "sim-ok-1");
    writeCase(tmp, "sim-ok-2");
    const { report } = validateEsaAdapter({ corpusRoot: tmp, requiredUniqueCases: 2 });
    assert.equal(report.uniqueValidCaseCount, 2);
    assert.equal(report.totals.duplicateCount, 0);
    assert.ok(Array.isArray(report.duplicateCaseIds));
  });
  await check("fewer than 50 unique valid cases refuses stage-50 sufficiency", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-lt50-"));
    for (let i = 0; i < 3; i++) writeCase(tmp, `sim-lt-${i}`);
    const { report, cases } = validateEsaAdapter({
      corpusRoot: tmp,
      requiredUniqueCases: 50,
    });
    assert.equal(report.sufficientForStage50, false);
    assert.equal(cases.length, 0);
    assert.ok((report.refuseReason ?? "").includes("requires 50"));
  });

  console.log("\n6 — HASH SEPARATION");
  await check("bundle / output / truth are hashed independently", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-hash-"));
    const dir = writeCase(tmp, "sim-hash");
    const r = loadEsaCasePacket(dir);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const bundleHash = sha256Hex(fs.readFileSync(path.join(dir, "bundle-text.md")));
    const outHash = sha256Hex(fs.readFileSync(path.join(dir, "casebrain-output.json")));
    const truthHash = sha256Hex(fs.readFileSync(path.join(dir, "truth-key.json")));
    assert.equal(r.hashes.bundleTextSha256, bundleHash);
    assert.equal(r.hashes.casebrainOutputSha256, outHash);
    assert.equal(r.hashes.truthKeySha256, truthHash);
    assert.notEqual(r.hashes.bundleTextSha256, r.hashes.casebrainOutputSha256);
    assert.notEqual(r.hashes.casebrainOutputSha256, r.hashes.truthKeySha256);
  });

  console.log("\n7 — TRUTH / OUTPUT SEPARATION (NO CONFLATION)");
  await check("truth offenceWording is not used as actual allegation", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-no-alleg-"));
    const dir = writeCase(tmp, "sim-no-alleg");
    const r = loadEsaCasePacket(dir);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.materialisation.allegation, null);
    assert.ok(
      r.materialisation.truthExpectations.some((t) => t.evidenceItem === "Full CCTV master"),
    );
    assert.ok(
      !r.materialisation.surfaces.some((s) =>
        s.text.includes("Test offence wording from truth only"),
      ),
    );
  });
  await check("truth mustNotSayGlobal is not copied into doNotOverstate", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-no-dns-"));
    const dir = writeCase(tmp, "sim-no-dns");
    const r = loadEsaCasePacket(dir);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.ok(!r.materialisation.doNotOverstate.includes("Truth-only global ban"));
    assert.ok(r.materialisation.doNotOverstate.includes("Do not overstate CCTV."));
  });
  await check("detectTruthOutputConflation flags truth-only surface text", () => {
    const hit = detectTruthOutputConflation({
      outputTextBlob: "Court line about CCTV clips",
      truthEvidenceItems: ["Truth-only phantom unit"],
      truthMustNotSay: [],
      surfaceTexts: ["Truth-only phantom unit"],
    });
    assert.equal(hit.conflated, true);
    assert.ok(hit.offenders.includes("Truth-only phantom unit"));
  });
  await check("detectTruthOutputConflation passes when text is in output", () => {
    const hit = detectTruthOutputConflation({
      outputTextBlob: "Please provide Full CCTV master",
      truthEvidenceItems: ["Full CCTV master"],
      truthMustNotSay: [],
      surfaceTexts: ["Please provide Full CCTV master"],
    });
    assert.equal(hit.conflated, false);
  });

  console.log("\n8 — UNKNOWN EXITS / NOT INVENTED");
  await check("export/api/pdf/composed_prose are not invented from ESA snapshot", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-exits-"));
    const dir = writeCase(tmp, "sim-exits");
    const r = loadEsaCasePacket(dir);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const allExits = new Set(r.exitModesPresent);
    assert.ok(allExits.has("view"));
    assert.ok(allExits.has("copy")); // courtNote.canCopy true + chase copySuggestion
    assert.ok(!allExits.has("export"));
    assert.ok(!allExits.has("api"));
    assert.ok(!allExits.has("pdf"));
    assert.ok(!allExits.has("composed_prose"));
  });
  await check("validation report marks absent exits not_exercised", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-exit-rep-"));
    writeCase(tmp, "sim-exit-rep");
    const { report } = validateEsaAdapter({ corpusRoot: tmp, requiredUniqueCases: 1 });
    assert.equal(report.exitApplicability.export.status, "not_exercised");
    assert.equal(report.exitApplicability.api.status, "not_exercised");
    assert.equal(report.exitApplicability.pdf.status, "not_exercised");
    assert.equal(report.exitApplicability.composed_prose.status, "not_exercised");
    assert.equal(report.exitApplicability.view.status, "exercisable");
    assert.equal(report.controlsExecuted, false);
    assert.equal(report.findingsGenerated, false);
    assert.equal(report.dryRun, true);
  });

  console.log("\n9 — LIVE CORPUS DRY BIND (NO CONTROLS)");
  await check("live ESA corpus yields ≥50 unique valid cases without running controls", () => {
    const { report, cases } = validateEsaAdapter({
      corpusRoot: DEFAULT_ESA_CORPUS_ROOT,
      requiredUniqueCases: 50,
    });
    assert.equal(report.controlsExecuted, false);
    assert.equal(report.findingsGenerated, false);
    assert.ok(
      report.uniqueValidCaseCount >= 50,
      `expected ≥50 unique valid, got ${report.uniqueValidCaseCount}`,
    );
    assert.equal(report.sufficientForStage50, true);
    assert.equal(cases.length, 50);
    // No finding objects — cases are materialisations only
    for (const c of cases.slice(0, 3)) {
      assert.ok(c.caseId);
      assert.ok(Array.isArray(c.surfaces));
      assert.ok(Array.isArray(c.truthExpectations));
      assert.equal(c.allegation, null); // not invented from truth
    }
  });
  await check("resolveCorpusForStage(50) requires stratified freeze (no slice)", () => {
    const freezePath = path.join(
      "artifacts/casebrain-qa/assurance/master-auditor-v1/esa-stage50-sample-freeze",
      "STAGE-50-SAMPLE-FREEZE.json",
    );
    const { resolution, cases } = resolveCorpusForStage({ stage: "50" });
    assert.equal(resolution.adapterId, ESA_ADAPTER_ID);
    if (fs.existsSync(freezePath)) {
      assert.equal(resolution.refused, false);
      assert.equal(cases.length, 50);
      assert.equal(resolution.uniqueCaseCount, 50);
    } else {
      assert.equal(resolution.refused, true);
      assert.equal(cases.length, 0);
      assert.match(resolution.refuseReason ?? "", /stratified freeze|Do not use accepted\.slice/i);
    }
  });
  await check("stage 50 still refuses a gold-manual override with <50 ESA packets", () => {
    const { resolution, cases } = resolveCorpusForStage({
      stage: "50",
      corpusRootOverride: "artifacts/casebrain-qa/gold-manual-proof-set-v1",
    });
    assert.equal(resolution.refused, true);
    assert.equal(cases.length, 0);
  });

  console.log("\n10 — SOURCE ANCHORS / VERSION PRESERVED");
  await check("truth source_page_anchor preserved on expectations", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "esa-anchor-"));
    const dir = writeCase(tmp, "sim-anchor");
    const r = loadEsaCasePacket(dir);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const exp = r.materialisation.truthExpectations[0];
    assert.equal(exp?.sourcePageAnchor, "3");
    assert.equal(exp?.correctEvidenceState, "missing");
    assert.equal(exp?.chaseNeeded, true);
  });

  console.log(`\nesa-stage50-adapter-contracts: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
