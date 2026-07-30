/**
 * MAA V2 Stage-150 Batch-7 contracts — honesty-corrected EVS-01 + ATR-01 partial.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  statusForStage150Control,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import {
  buildEvalContext,
  evaluateControl,
  evaluateEvidenceIdentityState,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { evaluateAllBatch2 } from "../lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { missingPrerequisite } from "../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import {
  BATCH7_PROMOTION_ELIGIBLE_IDS,
  BATCH7_SELECTED_CONTROL_IDS,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch7-selection";
import { buildBatch7Audit } from "../lib/eval/master-assurance-auditor/v2/stage150/batch7-audit";
import { buildBatch7HonestReceipt } from "../lib/eval/master-assurance-auditor/v2/stage150/batch7-receipts";
import {
  buildEvidenceDimensionDomainRegistryDoc,
  domainsAreDisjoint,
} from "../lib/eval/master-assurance-auditor/v2/stage150/evidence-dimension-domain-registry";
import {
  BATCH5_IMPLEMENTED_IDS,
  BATCH6_IMPLEMENTED_IDS,
  BATCH7_IMPLEMENTED_IDS,
  BATCH7_IMMUTABLE_PROMOTION_REGISTRY,
  STAGE150_IMPLEMENTED_IDS,
  ZERO_CANDIDATE_RATE_NOTE,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { buildControlRateRow } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-triage";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { BATCH6_RETURNED_IDS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch6-overpromotion-disposition";

function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    courtNote: {
      text: "Ordinary professional court note. CCTV is served. Continuity is incomplete.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [
      { label: "CCTV", existence: "served", reliability: "needs_review", note: "served" },
    ],
    evidenceStates: [
      { inferredSourceState: "served", label: "CCTV", existenceLabel: "served", evidenceAnchor: "page 12" },
    ],
    warningsAndGaps: { chaseItems: [], doNotOverstate: ["Do not overstate CCTV continuity."] },
    exportVersion: { reviewFooter: "Solicitor review required." },
    ...over,
  };
}

function ctxFrom(output: Record<string, unknown>) {
  const ctx = buildEvalContext("b7", output);
  ctx.leaves = inventoryOutputLeaves("b7", output);
  return ctx;
}

function evsHits(output: Record<string, unknown>) {
  return evaluateAllBatch2(ctxFrom(output)).filter((h) => h.findingCode === "EVS_DIMENSION_COLLAPSE");
}

describe("Batch-7 honesty / selection", () => {
  it("domains are disjoint from canonical schema + observed tokens", () => {
    const doc = buildEvidenceDimensionDomainRegistryDoc();
    assert.equal(doc.domainsDisjoint, true);
    assert.equal(doc.promotionEligible, true);
    assert.equal(doc.intersection.length, 0);
    assert.ok(doc.existenceDomain.permitted.includes("other_defendant_only"));
    assert.ok(doc.reliabilityDomain.permitted.includes("needs_review"));
    assert.equal(domainsAreDisjoint(), true);
  });

  it("audits remaining partials; ATR-01 returned; EVS-01 promotable when domains clear", () => {
    const audit = buildBatch7Audit();
    assert.equal(audit.remainingPartialCount, 99);
    assert.deepEqual([...BATCH7_SELECTED_CONTROL_IDS].sort(), [
      "MAA2-ATR-01-DEFENDANT-SEPARATION",
      "MAA2-EVS-01-DIMENSION-SEPARATION",
    ]);
    assert.deepEqual([...BATCH7_PROMOTION_ELIGIBLE_IDS], ["MAA2-EVS-01-DIMENSION-SEPARATION"]);
    assert.equal(audit.rows.find((r) => r.controlId === "MAA2-EVS-01-DIMENSION-SEPARATION")!.bucket, "promotable_now");
    assert.equal(audit.rows.find((r) => r.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION")!.bucket, "returned_atr01");
    assert.ok(!BATCH7_IMPLEMENTED_IDS.has("MAA2-ATR-01-DEFENDANT-SEPARATION"));
    for (const id of BATCH6_RETURNED_IDS) {
      assert.ok(!BATCH7_IMPLEMENTED_IDS.has(id), id);
    }
  });

  it("preserves Batch-5/6; totals 8 implemented / 98 partial / 55 SNI; ATR partial; gates false", () => {
    assert.equal(BATCH5_IMPLEMENTED_IDS.size, 5);
    assert.equal(BATCH6_IMPLEMENTED_IDS.size, 2);
    assert.equal(BATCH7_IMPLEMENTED_IDS.size, 1);
    assert.equal(STAGE150_IMPLEMENTED_IDS.size, 8);
    assert.ok(STAGE150_IMPLEMENTED_IDS.has("MAA2-EVS-01-DIMENSION-SEPARATION"));
    assert.ok(!STAGE150_IMPLEMENTED_IDS.has("MAA2-ATR-01-DEFENDANT-SEPARATION"));
    assert.equal(
      statusForStage150Control({
        controlId: "MAA2-ATR-01-DEFENDANT-SEPARATION",
        familyCode: "ATR",
        activationStage: "150",
        preservedFromV1: false,
        engineId: "evidence_attribution",
      }).status,
      "partially_implemented",
    );
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.implemented, 8);
    assert.equal(m.totals.partially_implemented, 98);
    assert.equal(m.totals.specified_not_implemented, 55);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
  });

  it("zero-candidate rates null; immutable registry only EVS-01", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented.ts"),
      "utf8",
    );
    assert.equal(src.includes("setBatch5ImplementedIds"), false);
    assert.equal(BATCH7_IMMUTABLE_PROMOTION_REGISTRY.length, 1);
    for (const e of BATCH7_IMMUTABLE_PROMOTION_REGISTRY) {
      assert.equal(e.candidateDenominator, 0);
      assert.equal(e.rateHonestyNote, ZERO_CANDIDATE_RATE_NOTE);
      assert.equal(e.denominatorApprovalState, "PENDING_REVIEW");
      const rates = buildControlRateRow(e.controlId, []);
      assert.equal(rates.fpRate, null);
      assert.equal(rates.humanFpFnRecall, "unavailable");
    }
  });
});

describe("Batch-7 EVS-01 bidirectional dimension separation", () => {
  it("evs01_positive_differing_token_collapse", () => {
    assert.ok(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "incomplete", reliability: "served", note: "x" },
          ],
        }),
      ).length > 0,
    );
  });

  it("evs01_positive_same_token_collapse", () => {
    assert.ok(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "served", reliability: "served", note: "x" },
          ],
        }),
      ).length > 0,
    );
  });

  it("evs01_positive_reverse_direction_collapse", () => {
    assert.ok(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "needs_review", reliability: "weak", note: "x" },
          ],
        }),
      ).length > 0,
    );
  });

  it("evs01_positive_out_of_domain", () => {
    assert.ok(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "served", reliability: "ok", note: "x" },
          ],
        }),
      ).length > 0,
    );
  });

  it("evs01_negatives_valid_separated", () => {
    assert.equal(evsHits(base()).length, 0);
    assert.equal(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "unknown", reliability: "needs_review", note: "ok" },
          ],
        }),
      ).length,
      0,
    );
    assert.equal(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "MG11", existence: "other_defendant_only", reliability: "weak", note: "co-def" },
          ],
        }),
      ).length,
      0,
    );
    assert.equal(
      evsHits(
        base({
          fiveAnswersEvidenceRows: [
            { label: "CCTV", existence: "served", reliability: "strong", note: "ok" },
          ],
        }),
      ).length,
      0,
    );
  });

  it("evs01_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-EVS-01-DIMENSION-SEPARATION")!;
    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [{ inferredSourceState: "served", label: "x" }],
      warningsAndGaps: {},
      exportVersion: {},
    };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("evs01_mutation", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              { label: "CCTV", existence: "served", reliability: "needs_review", note: "ok" },
            ],
          }),
        ),
        "MAA2-EVS-01-DIMENSION-SEPARATION",
      ).length,
      0,
    );
    assert.ok(
      evaluateControl(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              { label: "CCTV", existence: "served", reliability: "served", note: "ok" },
            ],
          }),
        ),
        "MAA2-EVS-01-DIMENSION-SEPARATION",
      ).length > 0,
    );
  });
});

describe("Batch-7 ATR-01 remains partial", () => {
  it("atr01_positive — other_defendant_only without co-defendant guard", () => {
    assert.ok(
      evaluateEvidenceIdentityState(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              {
                label: "Co-defendant-only — MG5 outstanding — not this defendant",
                existence: "other_defendant_only",
                reliability: "needs_review",
                note: "co-def only",
              },
            ],
            warningsAndGaps: { chaseItems: [], doNotOverstate: ["Do not overstate CCTV."] },
          }),
        ),
      ).some((h) => h.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION"),
    );
  });

  it("atr01_negatives — guard present; no other_defendant_only", () => {
    assert.equal(
      evaluateEvidenceIdentityState(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              {
                label: "Co-defendant-only — MG5 outstanding — not this defendant",
                existence: "other_defendant_only",
                reliability: "needs_review",
                note: "co-def only",
              },
            ],
            warningsAndGaps: {
              chaseItems: [],
              doNotOverstate: [
                "Do not import co-defendant material (Co-defendant-only — MG5) to this defendant's case theory.",
              ],
            },
          }),
        ),
      ).filter((h) => h.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION").length,
      0,
    );
  });

  it("atr01_unavailable", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION")!;
    const empty = {
      courtNote: {},
      fiveAnswersEvidenceRows: [],
      evidenceStates: [],
      warningsAndGaps: {},
      exportVersion: {},
    };
    assert.ok(missingPrerequisite(h, empty, inventoryOutputLeaves("t", empty)));
  });

  it("atr01_mutation — restore guard clears finding", () => {
    assert.equal(
      evaluateControl(
        ctxFrom(
          base({
            fiveAnswersEvidenceRows: [
              {
                label: "Co-defendant-only — MG5 outstanding — not this defendant",
                existence: "other_defendant_only",
                reliability: "needs_review",
                note: "co-def only",
              },
            ],
            warningsAndGaps: {
              chaseItems: [],
              doNotOverstate: ["Do not import co-defendant material to this defendant's case theory."],
            },
          }),
        ),
        "MAA2-ATR-01-DEFENDANT-SEPARATION",
      ).length,
      0,
    );
  });
});

describe("Batch-7 honest receipts", () => {
  it("EVS-01: not_exercised when empty; partially_exercised with units", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-EVS-01-DIMENSION-SEPARATION")!;
    const withRows = base();
    const r = buildBatch7HonestReceipt({
      caseId: "t",
      handler: h,
      output: withRows,
      leaves: inventoryOutputLeaves("t", withRows),
      hits: [],
    });
    assert.equal(r.namedControlExerciseStatus, "partially_exercised");
    assert.equal(r.applicableCase, true);
    assert.ok(r.applicableEvidenceRowCount > 0);

    const empty = {
      courtNote: { text: "x", sendabilityLabel: "x" },
      fiveAnswersEvidenceRows: [],
      evidenceStates: [],
      warningsAndGaps: { doNotOverstate: [] },
      exportVersion: {},
    };
    const rEmpty = buildBatch7HonestReceipt({
      caseId: "e",
      handler: h,
      output: empty,
      leaves: inventoryOutputLeaves("e", empty),
      hits: [],
    });
    assert.equal(rEmpty.namedControlExerciseStatus, "not_exercised");
    assert.equal(rEmpty.applicableCase, false);
    assert.equal(rEmpty.applicableEvidenceRowCount, 0);
  });

  it("ATR-01: zero other_defendant_only units => not_exercised (not partially_exercised)", () => {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION")!;
    const noOdo = base();
    const r = buildBatch7HonestReceipt({
      caseId: "t",
      handler: h,
      output: noOdo,
      leaves: inventoryOutputLeaves("t", noOdo),
      hits: [],
    });
    assert.equal(r.namedControlExerciseStatus, "not_exercised");
    assert.equal(r.applicableCase, false);
    assert.equal(r.applicableEvidenceRowCount, 0);
    assert.match(r.namedControlMissingInputReason ?? "", /no_applicable_other_defendant_only_units/);

    const withOdo = base({
      fiveAnswersEvidenceRows: [
        {
          label: "Co-defendant-only — MG5",
          existence: "other_defendant_only",
          reliability: "needs_review",
          note: "x",
        },
      ],
    });
    const r2 = buildBatch7HonestReceipt({
      caseId: "o",
      handler: h,
      output: withOdo,
      leaves: inventoryOutputLeaves("o", withOdo),
      hits: [],
    });
    assert.equal(r2.namedControlExerciseStatus, "partially_exercised");
    assert.equal(r2.applicableCase, true);
    assert.equal(r2.applicableEvidenceRowCount, 1);
  });
});
