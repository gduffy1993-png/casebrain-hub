/**
 * MAA V2 Stage-150 Batch-3 contracts (remediated).
 * Separates phrase-probe evaluation from named-control exercise.
 * Replaces self-fulfilling literal phrase fixtures with structured / adversarial cases.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STAGE150_PACKET_LOCAL_HANDLERS } from "../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { STAGE150_BATCH3_HANDLERS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch3-registry";
import {
  BATCH3_SELECTED,
  BATCH3_BLOCKED_REMAINING_SNI,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch3-selection";
import {
  BATCH3_FINDING_BY_CONTROL,
  evaluateAllBatch3,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch3-detectors";
import {
  BATCH3_CONTROL_CLASSIFICATIONS,
  BATCH3_CLASSIFICATION_BY_ID,
  classificationCounts,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch3-control-classification";
import {
  buildEvalContext,
  evaluateControl,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import {
  collectExactPrerequisiteEvidence,
  hasSameExhibitLabelAcrossTwoDocumentIds,
  hasTwoDifferentExhibitLabelsOnly,
  missingPrerequisite,
} from "../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import { inventoryOutputLeaves } from "../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";

function ctxFrom(output: Record<string, unknown>, caseId = "b3") {
  return buildEvalContext(caseId, output);
}

function hits(controlId: string, output: Record<string, unknown>) {
  return evaluateControl(ctxFrom(output), controlId);
}

function base(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    courtNote: {
      text: "Ordinary professional court note.",
      sendabilityLabel: "Solicitor review required",
      canCopy: true,
    },
    fiveAnswersEvidenceRows: [{ label: "CCTV", existence: "served", reliability: "ok", note: "served" }],
    evidenceStates: [
      {
        inferredSourceState: "served",
        label: "CCTV",
        existenceLabel: "served",
        evidenceAnchor: "exhibit MG11 page 4",
      },
    ],
    warningsAndGaps: {
      chaseItems: [{ label: "Master", copySuggestion: "Please serve the master recording from MG6." }],
      doNotOverstate: ["Do not state identification is conclusive."],
    },
    exportVersion: {
      reviewFooter: "Solicitor review required before any external use.",
      sendability: "needs_solicitor_review",
      blockedReason: null,
    },
    ...over,
  };
}

const NEGATIVE_SAFE =
  "The recorded charge is theft contrary to section 1 Theft Act 1968. CCTV is served. Solicitor review required before any external use. Chase MG6 for unused schedule.";

/** Safe wording that contains detector trigger stems but remains honest / non-defective. */
const SAFE_WITH_TRIGGER_STEMS =
  "Version 1 of the MG11 is operative and supersedes version 2. The priority disclosure chase remains at the top of the solicitor note. A minor timing inconsistency is classified as an immaterial contradiction and does not override the material identity issue. Attachment MG6 is recorded as missing from inventory.";

describe("Batch-3 classification honesty", () => {
  it("classifies every selected control without forced counts", () => {
    assert.equal(BATCH3_CONTROL_CLASSIFICATIONS.length, BATCH3_SELECTED.length);
    const counts = classificationCounts();
    assert.ok(counts.genuine_string_quality_detector > 0);
    assert.ok(counts.phrase_probe_only > 0);
    assert.ok(counts.genuine_structured_detector > 0);
    // unavailable_missing_adapter must not appear among registered partials
    assert.equal(counts.unavailable_missing_adapter, 0);
    for (const h of STAGE150_BATCH3_HANDLERS) {
      assert.ok(h.detectorClassification);
      assert.ok(h.namedControlRequiredInputs && h.namedControlRequiredInputs.length > 0);
      assert.ok(h.capabilityScope);
      assert.ok(h.exercisedInvariant);
      assert.ok(h.unexercisedInvariant);
    }
  });

  it("phrase_probe_only named prerequisites exceed mere wording", () => {
    for (const c of BATCH3_CONTROL_CLASSIFICATIONS.filter((x) => x.classification === "phrase_probe_only")) {
      const named = c.namedControlRequiredInputs.join("|");
      assert.ok(
        !named.split("|").every((t) => t === "casebrain-output.json" || t === "included_solicitor_visible_wording"),
        `${c.controlId} phrase probe must require structured named inputs`,
      );
    }
  });
});

describe("Batch-3 selection / registry", () => {
  it("selects feasible SNI and leaves blocked SNI honest", () => {
    assert.equal(BATCH3_SELECTED.length + BATCH3_BLOCKED_REMAINING_SNI.length, 106);
    assert.equal(STAGE150_BATCH3_HANDLERS.length, BATCH3_SELECTED.length);
    assert.ok(BATCH3_BLOCKED_REMAINING_SNI.some((b) => b.blocker === "eld_adapter_absent"));
  });

  it("matrix partial count includes Batch-3 selection (Batch-4 may add further partials)", () => {
    const matrix = buildStage150ImplementationCapabilityMatrix();
    assert.equal(matrix.totals.stage150ControlCount, 161);
    assert.ok(matrix.totals.partially_implemented >= 55 + BATCH3_SELECTED.length);
    assert.equal(matrix.totals.implemented, 0);
    assert.ok(STAGE150_PACKET_LOCAL_HANDLERS.length >= 55 + BATCH3_SELECTED.length);
    assert.equal(STAGE150_BATCH3_HANDLERS.length, BATCH3_SELECTED.length);
  });
});

describe("Batch-3 dual receipt semantics (probe vs named)", () => {
  it("version precedence: probe may evaluate on wording; named not_exercised without version records", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-BND-04-VERSION-PRECEDENCE")!;
    const leaves = inventoryOutputLeaves(
      "t",
      base({
        courtNote: {
          text: "Draft A and draft B of the indictment both appear on the papers.",
          sendabilityLabel: "x",
          canCopy: true,
        },
      }),
    );
    const probeMiss = missingPrerequisite(h, base(), leaves, "probe");
    const namedMiss = missingPrerequisite(h, base(), leaves, "named");
    assert.equal(probeMiss, null);
    assert.ok(namedMiss?.includes("two_identified_document_versions_with_ordering"));
  });

  it("priority burial: named not_exercised without surface position metadata", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-PRI-02-NO-PRIORITY-BURIAL")!;
    const out = base();
    const leaves = inventoryOutputLeaves("t", out);
    assert.equal(missingPrerequisite(h, out, leaves, "probe"), null);
    assert.ok(missingPrerequisite(h, out, leaves, "named")?.includes("surface_position_order_metadata"));
  });

  it("contradiction ranking: named not_exercised without ranked contradiction records", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CTX-02-RANK-HIGH-OVER-LOW")!;
    const out = base();
    const leaves = inventoryOutputLeaves("t", out);
    assert.ok(
      missingPrerequisite(h, out, leaves, "named")?.includes(
        "two_contradiction_records_with_comparable_rank",
      ),
    );
  });

  it("structured version fixture satisfies named version-precedence prerequisite", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-BND-04-VERSION-PRECEDENCE")!;
    const out = base({
      documentVersions: [
        { documentId: "ind-v1", versionId: "1", ordering: 1 },
        { documentId: "ind-v2", versionId: "2", ordering: 2, operative: true },
      ],
    });
    const leaves = inventoryOutputLeaves("t", out);
    assert.equal(missingPrerequisite(h, out, leaves, "named"), null);
  });

  it("CHS-01 named exercise requires five-part schema, not empty copySuggestion alone", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CHS-01-FIVE-PART-FINDING")!;
    const without = base();
    const leaves = inventoryOutputLeaves("t", without);
    assert.equal(missingPrerequisite(h, without, leaves, "probe"), null);
    assert.ok(missingPrerequisite(h, without, leaves, "named")?.includes("chase_five_part_finding_schema"));
    const withFive = base({
      warningsAndGaps: {
        chaseItems: [
          {
            what: "Master recording",
            why: "Identity continuity",
            fromWhom: "CPS",
            byWhen: "before PTPH",
            ifNot: "Unable to test continuity",
            copySuggestion: "",
          },
        ],
        doNotOverstate: ["x"],
      },
    });
    assert.equal(missingPrerequisite(h, withFive, inventoryOutputLeaves("t", withFive), "named"), null);
  });
});

describe("Batch-3 structured / string positives (non self-fulfilling)", () => {
  it("BND-01 structured inventory collapse positive / negative", () => {
    const id = "MAA2-BND-01-SOURCE-DOC-INVENTORY";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    assert.ok(
      hits(id, {
        ...base(),
        evidenceStates: [
          {
            inferredSourceState: "missing",
            label: "Complete source document inventory",
            existenceLabel: "missing",
            note: "inventory claims complete while item missing",
          },
          {
            inferredSourceState: "served",
            label: "MG11",
            existenceLabel: "served",
          },
        ],
      }).some((h) => h.findingCode === code),
    );
    assert.ok(!hits(id, base()).some((h) => h.findingCode === code));
  });

  it("BND-04: defective paraphrase without trigger phrase still fires; safe version wording does not", () => {
    const id = "MAA2-BND-04-VERSION-PRECEDENCE";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    // Defective: two version tokens, no precedence — not the canned 'without saying which governs' only
    assert.ok(
      hits(
        id,
        base({
          courtNote: {
            text: "Counsel circulated version 3 alongside version 4 of the same indictment draft.",
            sendabilityLabel: "x",
            canCopy: true,
          },
        }),
      ).some((h) => h.findingCode === code),
    );
    assert.ok(
      !hits(
        id,
        base({
          courtNote: {
            text: "Version 3 is operative and takes precedence over version 2.",
            sendabilityLabel: "x",
            canCopy: true,
          },
        }),
      ).some((h) => h.findingCode === code),
    );
    // Safe wording containing 'version' / 'priority' / 'contradiction' stems
    assert.ok(
      !hits(
        id,
        base({ courtNote: { text: SAFE_WITH_TRIGGER_STEMS, sendabilityLabel: "x", canCopy: true } }),
      ).some((h) => h.findingCode === code),
    );
  });

  it("PRI-02: burial cue fires; safe priority wording with stems does not", () => {
    const id = "MAA2-PRI-02-NO-PRIORITY-BURIAL";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    assert.ok(
      hits(
        id,
        base({
          courtNote: {
            text: "An urgent disclosure risk is buried beneath routine listing chatter at the end.",
            sendabilityLabel: "x",
            canCopy: true,
          },
        }),
      ).some((h) => h.findingCode === code),
    );
    assert.ok(
      !hits(
        id,
        base({ courtNote: { text: SAFE_WITH_TRIGGER_STEMS, sendabilityLabel: "x", canCopy: true } }),
      ).some((h) => h.findingCode === code),
    );
  });

  it("CTX-02: ranking defect without canned phrase; safe classification wording negative", () => {
    const id = "MAA2-CTX-02-RANK-HIGH-OVER-LOW";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    assert.ok(
      hits(
        id,
        base({
          courtNote: {
            text: "An immaterial contradiction is treated as more important than the material service gap.",
            sendabilityLabel: "x",
            canCopy: true,
          },
        }),
      ).some((h) => h.findingCode === code),
    );
    assert.ok(
      !hits(
        id,
        base({ courtNote: { text: SAFE_WITH_TRIGGER_STEMS, sendabilityLabel: "x", canCopy: true } }),
      ).some((h) => h.findingCode === code),
    );
  });

  it("string-quality WRD-09 positive / safe negative / missing-input", () => {
    const id = "MAA2-WRD-09-PROTECTED-ACRONYMS";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    assert.ok(
      hits(
        id,
        base({ courtNote: { text: "See mG11 and cCtv for identity.", sendabilityLabel: "x", canCopy: true } }),
      ).some((h) => h.findingCode === code),
    );
    assert.ok(
      !hits(
        id,
        base({ courtNote: { text: "See MG11 and CCTV for identity.", sendabilityLabel: "x", canCopy: true } }),
      ).some((h) => h.findingCode === code),
    );
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === id)!;
    assert.ok(missingPrerequisite(h, {}, inventoryOutputLeaves("e", {}), "probe"));
  });

  it("CHS-01 empty copySuggestion positive; complete chase negative", () => {
    const id = "MAA2-CHS-01-FIVE-PART-FINDING";
    const code = BATCH3_FINDING_BY_CONTROL[id].findingCode;
    assert.ok(
      hits(
        id,
        base({
          warningsAndGaps: {
            chaseItems: [{ label: "Please obtain master", copySuggestion: "" }],
            doNotOverstate: ["x"],
          },
        }),
      ).some((h) => h.findingCode === code),
    );
    assert.ok(!hits(id, base()).some((h) => h.findingCode === code));
  });
});

describe("Batch-3 sweep: unavailable + FP adversarial", () => {
  it("each Batch-3 handler unavailable without probe inputs", () => {
    for (const h of STAGE150_BATCH3_HANDLERS) {
      const miss = missingPrerequisite(h, {}, inventoryOutputLeaves("empty", {}), "probe");
      assert.ok(miss, `${h.controlId} must be unavailable without inputs`);
      assert.equal(h.unavailableVerdict, "not_exercised");
    }
  });

  it("honest professional wording does not fire Batch-3 defect codes", () => {
    const all = evaluateAllBatch3(
      ctxFrom(
        base({
          courtNote: {
            text: NEGATIVE_SAFE,
            sendabilityLabel: "Solicitor review required",
            canCopy: true,
          },
        }),
      ),
    );
    const defectish = all.filter((h) => h.candidateClass === "candidate_defect");
    assert.equal(defectish.length, 0, defectish.map((h) => h.findingCode).join(","));
  });

  it("safe wording with trigger stems does not fire phrase-probe defects", () => {
    const all = evaluateAllBatch3(
      ctxFrom(base({ courtNote: { text: SAFE_WITH_TRIGGER_STEMS, sendabilityLabel: "x", canCopy: true } })),
    );
    const phraseIds = new Set(
      BATCH3_CONTROL_CLASSIFICATIONS.filter((c) => c.classification === "phrase_probe_only").map(
        (c) => c.controlId,
      ),
    );
    const bad = all.filter(
      (h) => phraseIds.has(h.controlId) && h.candidateClass === "candidate_defect",
    );
    assert.equal(bad.length, 0, bad.map((h) => h.findingCode).join(","));
  });

  it("classification map covers every handler", () => {
    for (const h of STAGE150_BATCH3_HANDLERS) {
      assert.equal(BATCH3_CLASSIFICATION_BY_ID[h.controlId].controlId, h.controlId);
    }
  });
});

describe("Batch-3 control-specific named prerequisites", () => {
  it("same exhibit label + two document IDs is eligible for collision testing", () => {
    const out = base({
      evidenceStates: [
        { exhibitLabel: "Exhibit A", sourceDocumentId: "doc-1", label: "Exhibit A" },
        { exhibitLabel: "Exhibit A", sourceDocumentId: "doc-2", label: "Exhibit A" },
      ],
    });
    assert.equal(hasSameExhibitLabelAcrossTwoDocumentIds(out), true);
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-BND-06-EXHIBIT-LABEL-COLLISION")!;
    assert.equal(missingPrerequisite(h, out, inventoryOutputLeaves("t", out), "named"), null);
  });

  it("two different labels alone are not a collision", () => {
    const out = base({
      evidenceStates: [
        { exhibitLabel: "Exhibit A", sourceDocumentId: "doc-1", label: "Exhibit A" },
        { exhibitLabel: "Exhibit B", sourceDocumentId: "doc-2", label: "Exhibit B" },
      ],
    });
    assert.equal(hasTwoDifferentExhibitLabelsOnly(out), true);
    assert.equal(hasSameExhibitLabelAcrossTwoDocumentIds(out), false);
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-BND-06-EXHIBIT-LABEL-COLLISION")!;
    assert.ok(
      missingPrerequisite(h, out, inventoryOutputLeaves("t", out), "named")?.includes(
        "same_exhibit_label_across_two_document_ids",
      ),
    );
  });

  it("CHS-04 with evidenceRef but no chaseType remains named not_exercised", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CHS-04-EVIDENTIAL-VS-PROCEDURAL")!;
    const out = base({
      warningsAndGaps: {
        chaseItems: [{ label: "Master", copySuggestion: "Serve master", evidenceRef: "/evidenceStates/0" }],
        doNotOverstate: ["x"],
      },
    });
    assert.equal(missingPrerequisite(h, out, inventoryOutputLeaves("t", out), "probe"), null);
    assert.ok(
      missingPrerequisite(h, out, inventoryOutputLeaves("t", out), "named")?.includes(
        "chase_evidential_procedural_type_fields",
      ),
    );
  });

  it("CTX-01 classification data does not automatically exercise CTX-02 ranking", () => {
    const out = base({
      contradictions: [{ id: "c1", classification: "immaterial" }],
    });
    const ctx01 = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CTX-01-CLASSIFY-CONTRADICTIONS")!;
    const ctx02 = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CTX-02-RANK-HIGH-OVER-LOW")!;
    const leaves = inventoryOutputLeaves("t", out);
    assert.equal(missingPrerequisite(ctx01, out, leaves, "named"), null);
    assert.ok(
      missingPrerequisite(ctx02, out, leaves, "named")?.includes(
        "two_contradiction_records_with_comparable_rank",
      ),
    );
  });

  it("charge instrument ID alone does not exercise statutory-provision or discrepancy controls", () => {
    const out = base({ chargeInstrument: { instrumentId: "CHG-1" } });
    const leaves = inventoryOutputLeaves("t", out);
    const statutory = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-CHG-07-STATUTORY-PROVISION")!;
    const discrepancy = STAGE150_BATCH3_HANDLERS.find(
      (x) => x.controlId === "MAA2-CHG-09-VERIFIED-DISCREPANCY-STATE",
    )!;
    assert.ok(missingPrerequisite(statutory, out, leaves, "named")?.includes("charge_statutory_provision_field"));
    assert.ok(missingPrerequisite(discrepancy, out, leaves, "named")?.includes("charge_discrepancy_state_records"));
  });

  it("contextual phrase probes remain named-control not_exercised without source comparison", () => {
    const ids = [
      "MAA2-FID-08-NO-STRENGTHEN-ALLEGE-TO-FACT",
      "MAA2-LSL-04-NO-HYPOTHESIS-TO-ADVICE",
      "MAA2-CHG-11-NO-REGISTRY-AS-OPERATIVE-FACT",
      "MAA2-ATR-07-INFERENCE-VS-PROVEN",
      "MAA2-AUD-01-SOLICITOR-COMPLETE",
      "MAA2-DEF-02-NO-CONCLUSION-PRESENTATION",
    ];
    for (const id of ids) {
      const cls = BATCH3_CLASSIFICATION_BY_ID[id];
      assert.equal(cls.classification, "phrase_probe_only", id);
      const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === id)!;
      const out = base();
      const leaves = inventoryOutputLeaves("t", out);
      assert.equal(missingPrerequisite(h, out, leaves, "probe"), null, id);
      assert.ok(missingPrerequisite(h, out, leaves, "named"), `${id} named must miss`);
    }
  });

  it("unknown prerequisite tokens fail closed", () => {
    const h = {
      ...STAGE150_BATCH3_HANDLERS[0]!,
      namedControlRequiredInputs: ["casebrain-output.json", "totally_unknown_token_xyz"],
    };
    const out = base();
    const leaves = inventoryOutputLeaves("t", out);
    assert.ok(
      missingPrerequisite(h, out, leaves, "named")?.includes("unrecognised_prerequisite:totally_unknown_token_xyz"),
    );
  });

  it("exactPrerequisiteEvidenceRefs are validated — not metadata only", () => {
    const h = STAGE150_BATCH3_HANDLERS.find((x) => x.controlId === "MAA2-WRD-09-PROTECTED-ACRONYMS")!;
    const out = base();
    const leaves = inventoryOutputLeaves("t", out);
    const ev = collectExactPrerequisiteEvidence(
      h.exactPrerequisiteEvidenceRefs ?? [],
      out,
      leaves,
    );
    assert.equal(ev.ok, true);
    assert.ok(ev.found.some((f) => f.ref === "included_solicitor_visible_wording"));
    assert.ok(ev.found.every((f) => f.path && f.summary));
  });
});
