import type { BundleFidelityTruthKey } from "@/lib/eval/casebrain-auditor/bundle-fidelity-types";
import type { GoldenVerificationTruthKey } from "@/lib/eval/casebrain-auditor/golden-truth-key-v2";
import type { EvidenceStateTruthKey, TruthKeyEvidenceItem } from "./types";

function item(label: string, state: TruthKeyEvidenceItem["correct_evidence_state"]): TruthKeyEvidenceItem {
  return {
    evidence_item: label,
    correct_evidence_state: state,
    chase_needed: state !== "served",
    safe_to_rely_on: state === "served",
  };
}

/** Convert H2 gold / bundle-fidelity truth key → evidence-state audit item list. */
export function convertGoldTruthKeyToEvidenceState(
  raw: BundleFidelityTruthKey | GoldenVerificationTruthKey,
): EvidenceStateTruthKey {
  const h2 = raw as GoldenVerificationTruthKey;
  const items: TruthKeyEvidenceItem[] = [];

  for (const label of h2.servedEvidenceExpected ?? []) {
    items.push(item(label, "served"));
  }
  for (const label of h2.referredOnlyEvidenceExpected ?? []) {
    items.push(item(label, "referred_only"));
  }
  for (const label of raw.missingMaterialExpected ?? []) {
    if (items.some((i) => i.evidence_item.toLowerCase() === label.toLowerCase())) continue;
    items.push(item(label, "missing"));
  }
  for (const signal of raw.evidenceSignalsExpected ?? []) {
    if (items.some((i) => i.evidence_item.toLowerCase().includes(signal.toLowerCase()))) continue;
    items.push(item(signal, "served"));
  }
  for (const doc of raw.documentTypesExpected ?? []) {
    if (items.some((i) => i.evidence_item.toLowerCase().includes(doc.toLowerCase()))) continue;
    items.push(item(doc.replace(/_/g, " "), "served"));
  }

  if (items.length === 0 && raw.charge) {
    items.push(item("charge sheet / offence papers", "served"));
  }

  const mustNotSay = [
    ...(h2.mustNotSayExpected ?? []),
    ...(raw.prohibitedFamilies ?? []).map(
      (f) => `Do not import ${f.replace(/_/g, " ")} unless the papers support it.`,
    ),
  ];

  return {
    caseId: raw.bundleId,
    title: raw.label ?? raw.bundleId,
    offenceFamily: h2.offenceFamily ?? raw.expectedRouteFamily ?? undefined,
    offenceWording: raw.charge,
    profile: raw.expectedWorkflowProfile ? String(raw.expectedWorkflowProfile) : undefined,
    bundleStatus: "gold_pack",
    evidenceItems: items,
    expectedChaseItems: h2.expectedChaseItems ?? raw.missingMaterialExpected?.slice(0, 6),
    expectedSendability: raw.humanReviewExpected ? "needs_solicitor_review" : "provisional_check_source",
    mustNotSayGlobal: [...new Set(mustNotSay)],
    blockingFailPatterns: ["we win", "case collapses", "guaranteed", "safe to send"],
  };
}
