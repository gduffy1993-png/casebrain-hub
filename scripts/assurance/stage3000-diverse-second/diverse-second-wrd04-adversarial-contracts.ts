/**
 * WRD-04 adversarial contracts — prefix must not broadly suppress defective duplicates.
 */
import assert from "node:assert/strict";
import { inventoryOutputLeaves } from "../../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { buildEvalContext } from "../../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { evaluateBatch2WordingChase } from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors";

function wrd04Hits(bag: Record<string, unknown>, caseId: string) {
  const ctx = buildEvalContext(caseId, bag);
  ctx.leaves = inventoryOutputLeaves(caseId, bag);
  return evaluateBatch2WordingChase(ctx).filter((h) => h.findingCode === "WRD_DUPLICATE_PHRASE");
}

export function proveWrd04AdversarialContracts(): {
  ok: boolean;
  exactTitleSuppressed: boolean;
  adversarialPrefixStillDetected: boolean;
  mediaMasterPrefixDefectDetected: boolean;
  detail: string[];
} {
  const detail: string[] = [];

  const titleBag = {
    evidenceStates: [
      { label: "MG5 Case summary (fictional test)", evidenceAnchor: "MG5 Case summary (fictional test)" },
      { label: "other", evidenceAnchor: "MG5 Case summary (fictional test)" },
    ],
    courtNote: { text: "Short" },
  };
  // Titles on evidenceAnchor paths with exact template — should not flag as composition dup
  // (may still not fire if same-surface rules differ). Treat as pass if no WRD_DUPLICATE_PHRASE.
  const titleHits = wrd04Hits(titleBag as any, "wrd-title");
  const exactTitleSuppressed = titleHits.length === 0;
  if (!exactTitleSuppressed) detail.push("exact_title_not_suppressed");

  const bad =
    "Solicitor review required. The defendant absolutely destroyed the case and Do not Do not rely on this defective duplicate sentence for court use.";
  const advBag = {
    courtNote: { text: bad },
    exportVersion: { reviewFooter: bad },
  };
  const advHits = wrd04Hits(advBag as any, "wrd-adv");
  const adversarialOk = advHits.length > 0;
  if (!adversarialOk) detail.push(`adversarial_prefix_not_detected hits=${advHits.length}`);

  const mediaBad =
    "No additional media-master absence markers beyond the modelled absent set. Also Do not Do not invent CCTV coverage for this matter.";
  const mediaBag = {
    courtNote: { text: mediaBad },
    exportVersion: { reviewFooter: mediaBad },
  };
  const mediaHits = wrd04Hits(mediaBag as any, "wrd-media");
  const mediaMasterPrefixDefectDetected = mediaHits.length > 0;
  if (!mediaMasterPrefixDefectDetected) detail.push(`media_master_prefix_defect_not_detected hits=${mediaHits.length}`);

  const ok = exactTitleSuppressed && adversarialOk && mediaMasterPrefixDefectDetected;
  return {
    ok,
    exactTitleSuppressed,
    adversarialPrefixStillDetected: adversarialOk,
    mediaMasterPrefixDefectDetected,
    detail,
  };
}

if (process.argv[1]?.includes("diverse-second-wrd04-adversarial-contracts")) {
  const r = proveWrd04AdversarialContracts();
  assert.equal(r.ok, true, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
}
