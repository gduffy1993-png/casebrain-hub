/**
 * MAA V2 Stage-150 Batch-4 honesty remediation contracts.
 * No Stage-150 freeze/run. Adapter ≠ detector. No APPROVED with min=0.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { STAGE150_PACKET_LOCAL_HANDLERS } from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import {
  STAGE150_BATCH4_FOUNDATION_SCAFFOLDS,
  STAGE150_BATCH4_HANDLERS,
  buildBatch4ContractResolutionAudit,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-registry";
import {
  BATCH4_DISPOSITIONS,
  BATCH4_REMAINING_SNI,
  BATCH4_SELECTED,
  batch4DispositionCounts,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-disposition";
import {
  BATCH4_CONTROL_CLASSIFICATIONS,
  BATCH4_FORTY_EIGHT,
  assertBatch4FortyEightHonesty,
  batch4HonestyStatusCounts,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-control-classification";
import {
  assessLegalAuthorityLane,
  fixtureEldVersionPairPresent,
  fixtureMultiAudience,
  fixturePinnedAuthorityRegistry,
  fixtureVersionedReceipts,
  readEldSourceChangeDrafting,
  readHeavySourceDocumentEvidence,
  readMultiAudiencePerspective,
  readPinnedLegalAuthorityRegistry,
  readVersionedDeterministicReceipts,
  BATCH4_INPUT_ADAPTER_DEFS,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-adapters";
import { evaluateAllBatch4 } from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-detectors";
import { buildBatch4ControlDenominators } from "../lib/eval/master-assurance-auditor/v2/stage150/batch4-denominators";
import {
  EVIDENCE_RETENTION_POLICY,
  projectEvidenceSizes,
} from "../lib/eval/master-assurance-auditor/v2/stage150/evidence-retention";
import {
  buildRetentionReceipt,
  reproduceInterruptedResumeIdentity,
  serializeReceiptLine,
} from "../lib/eval/master-assurance-auditor/v2/stage150/evidence-retention-writer";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { buildEvalContext } from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { assertNoEldMarkedRunnable, eldFoundationControlPosture } from "../lib/eval/master-assurance-auditor/v2/eld";

function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    courtNote: {
      text: "Ordinary professional court note. CCTV is served.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "ok", note: "served" }],
    evidenceStates: [{ inferredSourceState: "served", label: "CCTV", existenceLabel: "served" }],
    warningsAndGaps: { chaseItems: [], doNotOverstate: [] },
    exportVersion: { reviewFooter: "Solicitor review required.", sendability: "needs_solicitor_review" },
    ...over,
  };
}

describe("Batch-4 honesty classification of 55 controls", () => {
  it("covers exactly 55 with 48 adapter_foundation_only and 7 deferred", () => {
    assert.equal(BATCH4_CONTROL_CLASSIFICATIONS.length, 55);
    assert.equal(BATCH4_DISPOSITIONS.length, 55);
    assert.equal(BATCH4_SELECTED.length, 48);
    assert.equal(BATCH4_REMAINING_SNI.length, 7);
    assert.equal(BATCH4_FORTY_EIGHT.length, 48);
    assertBatch4FortyEightHonesty();
    const counts = batch4HonestyStatusCounts();
    assert.equal(counts.partially_implemented_detector, 0);
    assert.equal(counts.adapter_foundation_only, 48);
    assert.equal(counts.deferred_stage300, 7);
    assert.equal(counts.specified_not_implemented, 0);
    assert.ok(BATCH4_FORTY_EIGHT.every((c) => c.status === "adapter_foundation_only"));
  });

  it("does not register Batch-4 as packet-local partial handlers", () => {
    assert.equal(STAGE150_BATCH4_HANDLERS.length, 0);
    assert.equal(STAGE150_BATCH4_FOUNDATION_SCAFFOLDS.length, 48);
    const matrix = buildStage150ImplementationCapabilityMatrix();
    assert.equal(matrix.totals.stage150ControlCount, 161);
    assert.equal(matrix.totals.partially_implemented, 106);
    assert.equal(matrix.totals.implemented, 0);
    assert.equal(matrix.totals.specified_not_implemented, 55);
    assert.equal(STAGE150_PACKET_LOCAL_HANDLERS.length, 55 + 51);
    assert.equal(batch4DispositionCounts().stage150_essential_implement, 48);
  });

  it("records unresolved Batch-4 contract IDs", () => {
    const audit = buildBatch4ContractResolutionAudit();
    assert.equal(audit.allUnresolved, true);
    assert.equal(audit.resolvingPositive, 0);
    assert.equal(audit.scaffoldCount, 48);
  });
});

describe("Batch-4 adapters fail closed / authority lane / complete sets", () => {
  it("ESA-shaped packet leaves all Batch-4 adapters absent", () => {
    const out = base();
    assert.equal(readEldSourceChangeDrafting(out).present, false);
    assert.equal(readPinnedLegalAuthorityRegistry(out).present, false);
    assert.equal(readVersionedDeterministicReceipts(out).present, false);
    assert.equal(readMultiAudiencePerspective(out).present, false);
    assert.equal(readHeavySourceDocumentEvidence(out).present, false);
    assert.equal(assessLegalAuthorityLane(out).status, "authority_absent");
  });

  it("fixtures make adapters present without inventing live ESA bags", () => {
    assert.equal(readEldSourceChangeDrafting(base(fixtureEldVersionPairPresent())).present, true);
    assert.equal(readPinnedLegalAuthorityRegistry(base(fixturePinnedAuthorityRegistry())).present, true);
    assert.equal(readVersionedDeterministicReceipts(base(fixtureVersionedReceipts())).present, true);
    const multi = readMultiAudiencePerspective(base(fixtureMultiAudience()));
    assert.equal(multi.present, true);
    assert.equal(multi.completeAudienceSurfaceSet, true);
    assert.equal(multi.completePerspectiveSurfaceSet, true);
  });

  it("ELD refuses non-synthetic version pairs", () => {
    const out = base({
      eldVersionPair: {
        pairId: "live-case-not-synthetic",
        before: { versionId: "a", sentences: [] },
        after: { versionId: "b", sentences: [] },
      },
    });
    assert.equal(readEldSourceChangeDrafting(out).present, false);
  });

  it("authority lane distinguishes available / stale / unsupported", () => {
    assert.equal(
      assessLegalAuthorityLane(base(fixturePinnedAuthorityRegistry())).status,
      "pinned_local_authority_available",
    );
    const stale = base({
      pinnedAuthorityRegistry: {
        records: [
          {
            authorityId: "stale-1",
            officialSource: "local",
            jurisdiction: "E&W",
            effectiveDate: "1969-01-01",
            retrievalDate: "2020-01-01",
            registryVersionId: "v1",
            authorityType: "primary_legislation",
            currencyStatus: "stale",
          },
        ],
      },
    });
    assert.equal(assessLegalAuthorityLane(stale).status, "authority_stale");
    assert.equal(
      assessLegalAuthorityLane(base(fixturePinnedAuthorityRegistry()), {
        propositionText: "contrary to Theft Act without id",
      }).status,
      "proposition_unsupported",
    );
  });

  it("VDR requires runReceiptId and artefactReceipts", () => {
    const missing = base({
      versionedDeterministicReceipts: {
        sourceCaseHashes: {},
        frozenMembershipOrder: [],
        casebrainCommit: "x",
        schemaRegistryVersion: "y",
        detectorVersions: {},
        exactFindingIds: [],
      },
    });
    assert.equal(readVersionedDeterministicReceipts(missing).present, false);
  });

  it("incomplete audience set is not present", () => {
    const partial = base({
      audienceSurfaces: [
        { audienceId: "a-client", role: "client", text: "plain" },
        { audienceId: "a-court", role: "court", text: "court" },
      ],
    });
    assert.equal(readMultiAudiencePerspective(partial).present, false);
  });

  it("declares Batch-4 adapter defs", () => {
    assert.ok(BATCH4_INPUT_ADAPTER_DEFS.length >= 5);
    assert.ok(BATCH4_INPUT_ADAPTER_DEFS.every((a) => a.whenAbsent === "not_exercised"));
  });
});

describe("Batch-4 foundation probes + ELD posture", () => {
  it("evaluateAllBatch4 returns no defects on honest fixture authority (current)", () => {
    const ctx = buildEvalContext("b4", base(fixturePinnedAuthorityRegistry()));
    ctx.leaves = inventoryOutputLeaves("b4", ctx.output);
    const hits = evaluateAllBatch4(ctx).filter((h) => h.controlId.startsWith("MAA2-LEG"));
    assert.equal(hits.length, 0);
  });

  it("ELD foundation forbids runnable / fully exercised / implemented", () => {
    const posture = eldFoundationControlPosture();
    assert.ok(posture.every((p) => p.implementationStatus === "specified_not_implemented"));
    assertNoEldMarkedRunnable(posture);
  });
});

describe("Batch-4 denominators honesty", () => {
  it("never APPROVED_FOR_SELECTION with minEligible 0; Batch-4 PENDING_INPUT_ADAPTER", () => {
    const den = buildBatch4ControlDenominators();
    assert.equal(den.caseSelectionForbidden, true);
    assert.equal(den.approvedForSelectionCount, 0);
    assert.equal(den.counts.APPROVED_FOR_SELECTION, 0);
    assert.equal(den.counts.DEFERRED_STAGE300, 7);
    assert.equal(den.counts.PENDING_INPUT_ADAPTER, 48);
    assert.ok(den.counts.PENDING_CALIBRATION >= 106);
    for (const r of den.rows) {
      assert.ok(r.minimumEligibleCases >= 1, `${r.controlId} min must be >= 1`);
      assert.ok(r.denominatorUnit);
      assert.equal(r.reviewer, "");
      assert.equal(r.reviewDate, "");
      if (r.approvalState === "APPROVED_FOR_SELECTION") {
        assert.ok(r.eligibleCount >= r.minimumEligibleCases);
      }
    }
  });
});

describe("Batch-4 retention writer", () => {
  it("streams deterministic JSONL; interrupt/resume byte-identical", () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "b4-ret-test-"));
    const receipts = Array.from({ length: 8 }, (_, i) =>
      buildRetentionReceipt({
        receiptId: `t-${i}`,
        ordinal: i,
        controlId: "MAA2-VDR-01-SOURCE-CASE-HASHES",
        caseId: `c-${i}`,
        probeStatus: "not_exercised",
        namedControlExerciseStatus: "not_exercised",
        sha256Payload: "x",
        emittedAtEpochMs: 1000 + i,
      }),
    );
    const line = serializeReceiptLine(receipts[0]!);
    assert.ok(line.endsWith("\n"));
    assert.equal(line.split("\n").filter(Boolean).length, 1);
    const keys = Object.keys(JSON.parse(line));
    assert.deepEqual(keys, [
      "schemaVersion",
      "receiptId",
      "ordinal",
      "controlId",
      "caseId",
      "probeStatus",
      "namedControlExerciseStatus",
      "sha256Payload",
      "emittedAtEpochMs",
    ]);
    const result = reproduceInterruptedResumeIdentity({
      workDir,
      receipts,
      interruptAfter: 3,
    });
    assert.equal(result.byteIdentical, true);
    assert.equal(result.lineCount, 8);
    assert.equal(result.cleanSha256, result.resumedSha256);
  });

  it("size projections are labeled estimates", () => {
    assert.ok(EVIDENCE_RETENTION_POLICY.hardRules.some((r) => /Never delete or rewrite/i.test(r)));
    const proj = projectEvidenceSizes();
    assert.equal(proj.length, 3);
    assert.ok(proj.every((p) => p.measurementKind === "estimate"));
    assert.ok(proj.every((p) => /assumptions|Batch-3/i.test(p.estimateAssumptions)));
  });
});
