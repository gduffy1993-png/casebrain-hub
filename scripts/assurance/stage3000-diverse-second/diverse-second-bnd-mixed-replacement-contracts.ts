/**
 * Adversarial mixed linked/unlinked BND replacement contracts (V2.1.1).
 */
import assert from "node:assert/strict";
import { inventoryOutputLeaves } from "../../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import {
  buildEvalContext,
} from "../../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { evaluateBatch3Wording } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch3-detectors";

function leavesFrom(bag: Record<string, unknown>, caseId: string) {
  const ctx = buildEvalContext(caseId, bag);
  ctx.leaves = inventoryOutputLeaves(caseId, bag);
  return evaluateBatch3Wording(ctx).filter((h) => h.findingCode === "BND_REPLACEMENT_UNLINKED");
}

export function proveMixedReplacementContracts(): {
  ok: boolean;
  linkedNoHit: boolean;
  unlinkedHit: boolean;
  mixedUnlinkedStillHits: boolean;
  ambiguousUnresolved: boolean;
  unrelatedDoesNotSatisfy: boolean;
  detail: string[];
} {
  const detail: string[] = [];

  const linkedBag = {
    chargeInstruments: [
      {
        instrumentId: "inst-draft",
        status: "superseded",
        sourceDocument: "indictment_draft",
        supersededByInstrumentId: "inst-op",
        exactWording: "Draft indictment (superseded)",
      },
      {
        instrumentId: "inst-op",
        status: "operative",
        sourceDocument: "indictment_operative",
        replacesInstrumentId: "inst-draft",
        exactWording: "Operative indictment",
      },
    ],
    documentRelationships: [
      {
        relationshipType: "replaces_supersedes",
        fromDocumentId: "indictment_operative",
        toDocumentId: "indictment_draft",
        fromInstrumentId: "inst-op",
        toInstrumentId: "inst-draft",
      },
    ],
    courtNote: { text: "Draft indictment (superseded) retained; operative replaces prior." },
  };
  // Force leaf on chargeInstruments/0
  const linkedHits = leavesFrom(linkedBag as any, "bnd-linked");
  const linkedNoHit = linkedHits.length === 0;
  if (!linkedNoHit) detail.push(`linked_expected_0_got_${linkedHits.length}`);

  const unlinkedBag = {
    chargeInstruments: [
      {
        instrumentId: "inst-alone",
        status: "draft",
        sourceDocument: "indictment_draft_only",
        replacesInstrumentId: null,
        supersededByInstrumentId: null,
        exactWording: "Draft indictment (superseded) with no later instrument",
      },
    ],
    documentRelationships: [],
    courtNote: { text: "This draft was superseded without a linked replacement instrument recorded." },
  };
  const unlinkedHits = leavesFrom(unlinkedBag as any, "bnd-unlinked");
  const unlinkedHit = unlinkedHits.some((h) => h.candidateClass === "candidate_defect");
  if (!unlinkedHit) detail.push("unlinked_expected_hit");

  const mixedBag = {
    chargeInstruments: [
      {
        instrumentId: "inst-linked-draft",
        status: "superseded",
        sourceDocument: "indictment_draft_a",
        supersededByInstrumentId: "inst-linked-op",
        exactWording: "Linked draft (superseded)",
      },
      {
        instrumentId: "inst-linked-op",
        status: "operative",
        sourceDocument: "indictment_operative_a",
        replacesInstrumentId: "inst-linked-draft",
        exactWording: "Linked operative",
      },
      {
        instrumentId: "inst-orphan",
        status: "draft",
        sourceDocument: "indictment_orphan",
        replacesInstrumentId: null,
        supersededByInstrumentId: null,
        exactWording: "Orphan instrument marked superseded without link",
      },
    ],
    documentRelationships: [
      {
        relationshipType: "replaces_supersedes",
        fromDocumentId: "indictment_operative_a",
        toDocumentId: "indictment_draft_a",
        fromInstrumentId: "inst-linked-op",
        toInstrumentId: "inst-linked-draft",
      },
    ],
    courtNote: {
      text: "Orphan instrument marked superseded without link — must still hit despite sibling link.",
    },
  };
  const mixedHits = leavesFrom(mixedBag as any, "bnd-mixed");
  const mixedUnlinkedStillHits = mixedHits.some(
    (h) =>
      /orphan|without link/i.test(h.exactWording) ||
      h.occurrenceRef.includes("orphan") ||
      h.candidateClass === "candidate_defect",
  );
  if (!mixedUnlinkedStillHits) detail.push(`mixed_unlinked_missed hits=${mixedHits.length}`);

  const ambiguousBag = {
    chargeInstruments: [
      {
        instrumentId: "inst-a",
        status: "operative",
        sourceDocument: "indictment_v1",
        replacesInstrumentId: null,
        supersededByInstrumentId: null,
        exactWording: "Version A operative",
      },
      {
        instrumentId: "inst-b",
        status: "operative",
        sourceDocument: "indictment_v2",
        replacesInstrumentId: null,
        supersededByInstrumentId: null,
        exactWording: "Version B operative",
      },
    ],
    documentRelationships: [],
    courtNote: { text: "Earlier indictment superseded. Later version exists. No structured replacement relationship recorded." },
  };
  const ambHits = leavesFrom(ambiguousBag as any, "bnd-amb");
  const ambiguousNeverPass = ambHits.length > 0;
  const ambiguousUnresolved =
    ambHits.some((h) => h.candidateClass === "unresolved") ||
    ambHits.some((h) => /Ambiguous|unresolved/i.test(h.plainEnglish));
  if (!ambiguousNeverPass) detail.push("ambiguous_incorrectly_passed");
  if (!ambiguousUnresolved) detail.push("ambiguous_expected_unresolved_class");

  const unrelatedBag = {
    chargeInstruments: [
      {
        instrumentId: "inst-charge",
        status: "draft",
        sourceDocument: "written_charge",
        replacesInstrumentId: null,
        supersededByInstrumentId: null,
        exactWording: "Written charge superseded draft",
      },
    ],
    documentRelationships: [
      {
        relationshipType: "replaces_supersedes",
        fromDocumentId: "mg11_signed",
        toDocumentId: "mg11_draft",
        fromInstrumentId: "inst-mg11-signed",
        toInstrumentId: "inst-mg11-draft",
      },
    ],
    courtNote: { text: "Written charge superseded draft remains unlinked to any charge instrument." },
  };
  const unrelatedHits = leavesFrom(unrelatedBag as any, "bnd-unrelated");
  const unrelatedDoesNotSatisfy = unrelatedHits.some((h) => h.candidateClass === "candidate_defect");
  if (!unrelatedDoesNotSatisfy) detail.push("unrelated_relationship_incorrectly_satisfied_charge");

  const ok =
    linkedNoHit &&
    unlinkedHit &&
    mixedUnlinkedStillHits &&
    ambiguousNeverPass &&
    ambiguousUnresolved &&
    unrelatedDoesNotSatisfy;
  return {
    ok,
    linkedNoHit,
    unlinkedHit,
    mixedUnlinkedStillHits,
    ambiguousUnresolved,
    unrelatedDoesNotSatisfy,
    detail,
  };
}

if (process.argv[1]?.includes("diverse-second-bnd-mixed-replacement-contracts")) {
  const r = proveMixedReplacementContracts();
  assert.equal(r.ok, true, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
}
