/**
 * MAA V2 every-word foundation remediation contracts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  detectsStillMasterCollapse,
  runChaseActionabilityEngine,
  runProfessionalWordingEngine,
} from "../lib/eval/master-assurance-auditor/v2/engines/shared-engines";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { FREEZE_HASH_STAGE50 } from "../lib/eval/master-assurance-auditor/v2/every-word/types";
import { PARTIAL_CONTROL_IDS } from "../lib/eval/master-assurance-auditor/v2/every-word/control-handler-registry";

const OUT = path.join(process.cwd(), "artifacts/casebrain-qa/assurance/master-auditor-v2");

describe("still/master collapse detector", () => {
  it("still_master_collapse_negative: stills served, master missing → no defect", () => {
    assert.equal(
      detectsStillMasterCollapse(
        "Grainy stills served — master timeline and continuity missing.",
      ),
      false,
    );
  });

  it("still_master_collapse_negative: clips served, master referred only → no defect", () => {
    assert.equal(
      detectsStillMasterCollapse("BWV clips served; master referred only."),
      false,
    );
  });

  it("still_master_collapse_positive: master footage served where only stills → candidate", () => {
    assert.equal(
      detectsStillMasterCollapse("Master footage served; grainy stills in exhibit list."),
      true,
    );
  });

  it("still_master_collapse_positive: stills are the full/master CCTV → candidate", () => {
    assert.equal(
      detectsStillMasterCollapse("The stills are the full master CCTV for the incident."),
      true,
    );
  });

  it("genuinely separate evidence units remain separate", () => {
    assert.equal(
      detectsStillMasterCollapse("Stills marked still; master marked missing."),
      false,
    );
  });
});

describe("wording and chase control-specific probes", () => {
  it("wrd_absolute_proof_positive / wrd_absolute_proof_negative", () => {
    const bad = {
      occurrenceId: "t1",
      caseId: "x",
      sourcePacketId: "x",
      packetRelativeFile: "casebrain-output.json" as const,
      jsonPointer: "/t",
      arrayIndex: null,
      parentObjectIdentity: "t",
      originalDataType: "string",
      surfaceId: "court_line",
      audience: "court",
      exit: "view" as const,
      copyable: true,
      blocked: false,
      exactFinalWording: "This absolutely proves guilt beyond doubt.",
      exactStringHash: "a",
      normalizedTemplate: "This absolutely proves guilt beyond doubt.",
      templateHash: "b",
      normalizationSlots: [],
      wordCount: 6,
      characterCount: 40,
      emptyOrWhitespace: false,
      nullWhereExpected: false,
      solicitorVisible: true,
      inclusion: "included" as const,
    };
    const good = { ...bad, occurrenceId: "t2", exactFinalWording: "The allegation remains unproven." };
    assert.ok(
      runProfessionalWordingEngine(
        { caseId: "x", output: {}, occurrences: [bad], truth: null },
        "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
      ).some((h) => h.findingCode === "WRD_ABSOLUTE_PROOF"),
    );
    assert.equal(
      runProfessionalWordingEngine(
        { caseId: "x", output: {}, occurrences: [good], truth: null },
        "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
      ).filter((h) => h.findingCode === "WRD_ABSOLUTE_PROOF").length,
      0,
    );
  });

  it("chs_empty_draft_positive / chs_empty_draft_negative", () => {
    const emptyOcc = {
      occurrenceId: "c1",
      caseId: "x",
      sourcePacketId: "x",
      packetRelativeFile: "casebrain-output.json" as const,
      jsonPointer: "/warningsAndGaps/chaseItems/0/copySuggestion",
      arrayIndex: 0,
      parentObjectIdentity: "chase",
      originalDataType: "string",
      surfaceId: "cps_chase_item",
      audience: "cps",
      exit: "copy" as const,
      copyable: true,
      blocked: false,
      exactFinalWording: "",
      exactStringHash: "e",
      normalizedTemplate: "",
      templateHash: "e",
      normalizationSlots: [],
      wordCount: 0,
      characterCount: 0,
      emptyOrWhitespace: true,
      nullWhereExpected: false,
      solicitorVisible: true,
      inclusion: "included" as const,
    };
    const filled = {
      ...emptyOcc,
      occurrenceId: "c2",
      exactFinalWording: "Please serve master BWV for 12:04.",
      emptyOrWhitespace: false,
    };
    assert.ok(
      runChaseActionabilityEngine(
        {
          caseId: "x",
          output: { warningsAndGaps: { chaseItems: [{ label: "CCTV", copySuggestion: "" }] } },
          occurrences: [emptyOcc],
          truth: null,
        },
        "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
      ).some((h) => h.findingCode === "CHS_EMPTY_DRAFT"),
    );
    assert.equal(
      runChaseActionabilityEngine(
        {
          caseId: "x",
          output: {
            warningsAndGaps: {
              chaseItems: [{ label: "CCTV", copySuggestion: "Please serve master BWV for 12:04." }],
            },
          },
          occurrences: [filled],
          truth: null,
        },
        "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
      ).filter((h) => h.findingCode === "CHS_EMPTY_DRAFT").length,
      0,
    );
  });
});

describe("independent inventory + remediation artefacts", () => {
  it("inventory is independent and classifies exportVersion / badges", () => {
    const sample = {
      caseId: "x",
      generatedAt: "t",
      source: "esa",
      exportVersion: {
        exportId: "e",
        reviewFooter: "Solicitor review required.",
        blockedReason: null,
        sendability: "needs_solicitor_review",
      },
      matterConfidence: {
        level: "needs_review",
        label: "Needs review",
        sourceBadges: ["missing"],
        doNotRelyYetReason: "Gaps.",
      },
      courtNote: { text: "Hello", sendabilityLabel: "ok", canCopy: true, blockedReason: null },
      truthKeyComparison: { ok: true },
    };
    const leaves = inventoryOutputLeaves("x", sample);
    const byPtr = Object.fromEntries(leaves.map((l) => [l.jsonPointer, l]));
    assert.equal(byPtr["/exportVersion/reviewFooter"]?.disposition, "included_solicitor_visible");
    assert.equal(byPtr["/exportVersion/blockedReason"]?.disposition, "included_structural_empty");
    assert.equal(byPtr["/exportVersion/sendability"]?.disposition, "excluded_non_wording_machine_state");
    assert.equal(
      byPtr["/matterConfidence/sourceBadges/0"]?.disposition,
      "excluded_non_wording_machine_state",
    );
    assert.equal(byPtr["/truthKeyComparison/ok"]?.disposition, "excluded_truth_comparison");
    assert.ok(leaves.every((l) => l.disposition));
  });

  it("source-to-ledger reconciliation identity holds", () => {
    const recon = JSON.parse(
      fs.readFileSync(path.join(OUT, "source-to-ledger-reconciliation.json"), "utf8"),
    );
    assert.equal(recon.identity, true);
    assert.equal(
      recon.sourceLeafCount,
      recon.includedLedgerRowCount + recon.excludedLedgerRowCount,
    );
  });

  it("status gate and capture status", () => {
    const stop = JSON.parse(fs.readFileSync(path.join(OUT, "STOP-FOR-CODEX-REVIEW.json"), "utf8"));
    assert.equal(stop.status, "CAPTURE_AND_CALIBRATION_FOUNDATION_COMPLETE");
    assert.equal(stop.foundationImplementationComplete, false);
    assert.equal(stop.overallAllowed, false);
    assert.equal(stop.stage150ExecutionAllowed, false);
    assert.equal(stop.freezeHash, FREEZE_HASH_STAGE50);
    assert.equal(stop.shadow.priorCandidatesDisposedAsFp, 2);
  });

  it("partially_implemented only for registered control-specific handlers", () => {
    const status = JSON.parse(
      fs.readFileSync(path.join(OUT, "v2-control-execution-status.json"), "utf8"),
    );
    const partial = status.controls.filter(
      (c: { implementationStatus: string }) => c.implementationStatus === "partially_implemented",
    );
    assert.equal(partial.length, PARTIAL_CONTROL_IDS.size);
    for (const c of partial) {
      assert.ok(PARTIAL_CONTROL_IDS.has(c.controlId), c.controlId);
      assert.ok(c.positiveNegativeContract && !c.positiveNegativeContract.endsWith("#positive"));
    }
  });

  it("FP dispositions preserve prior candidate IDs", () => {
    const fp = JSON.parse(fs.readFileSync(path.join(OUT, "v2-candidate-fp-dispositions.json"), "utf8"));
    const ids = fp.dispositions.map((d: { candidateId: string }) => d.candidateId).sort();
    assert.deepEqual(ids, [
      "V2CAND-be78a6ad0e4ae78e91cd1b2a",
      "V2CAND-e722e2d0dee4fac05b91b414",
    ]);
    assert.ok(fp.dispositions.every((d: { disposition: string }) => d.disposition === "detector_false_positive"));
  });

  it("blinding sequence proves truth after persisted ledger hash", () => {
    const proof = JSON.parse(
      fs.readFileSync(path.join(OUT, "actual-output-before-truth-proof.json"), "utf8"),
    );
    assert.equal(proof.aggregateProof.allTruthOpenedAfterLedgerHash, true);
    assert.equal(proof.aggregateProof.booleanAloneInsufficient, true);
    assert.equal(proof.cases[0].proof.hashIsOfPersistedBytes, true);
    assert.ok(proof.cases[0].persistedLedgerPath);
    assert.ok(fs.existsSync(proof.cases[0].persistedLedgerPath));
    assert.ok(
      proof.cases[0].ordering.indexOf("truth_open") >
        proof.cases[0].ordering.indexOf("occurrence_ledger_persisted"),
    );
  });

  it("human-readable sendabilityLabel is included; raw enum is not", () => {
    const sample = {
      courtNote: {
        text: "x",
        sendabilityLabel: "Solicitor review required",
        canCopy: false,
        blockedReason: null,
      },
      warningsAndGaps: {
        chaseItems: [{ label: "a", sendabilityLabel: "needs_solicitor_review", copySuggestion: "b" }],
      },
      exportVersion: { sendability: "needs_solicitor_review", reviewFooter: "f", blockedReason: null },
    };
    const leaves = inventoryOutputLeaves("x", sample);
    const byPtr = Object.fromEntries(leaves.map((l) => [l.jsonPointer, l]));
    assert.equal(
      byPtr["/courtNote/sendabilityLabel"]?.disposition,
      "included_solicitor_visible",
    );
    assert.equal(
      byPtr["/warningsAndGaps/chaseItems/0/sendabilityLabel"]?.disposition,
      "excluded_non_wording_machine_state",
    );
    assert.equal(byPtr["/exportVersion/sendability"]?.disposition, "excluded_non_wording_machine_state");
  });

  it("resume validation proves byte-identical ledger vs clean run", () => {
    const r = JSON.parse(fs.readFileSync(path.join(OUT, "shadow-resume-validation.json"), "utf8"));
    assert.equal(r.resumeProvenByTest, true);
    assert.equal(r.ledgerByteIdentical, true);
    assert.equal(r.candidatesByteIdentical, true);
    assert.equal(r.interruptedAfter, 10);
    assert.equal(r.resumedCount, 40);
    assert.ok(fs.existsSync(path.join(process.cwd(), r.checkpointPath)));
  });

  it("protected assets record blob IDs not tree IDs", () => {
    const p = JSON.parse(
      fs.readFileSync(path.join(OUT, "protected-assets-immutability.json"), "utf8"),
    );
    assert.ok(p.brain1.length >= 7);
    assert.ok(p.guardian.length >= 4);
    for (const f of [...p.brain1, ...p.guardian]) {
      assert.equal(f.baselineObjectType, "blob");
      assert.ok(f.baselineBlobId && /^[0-9a-f]{40}$/.test(f.baselineBlobId));
      assert.notEqual(f.baselineObjectType, "tree");
    }
  });
});
