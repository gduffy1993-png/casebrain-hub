import fs from "node:fs";
import path from "node:path";
import type { BattleboardViewCaseResult } from "./battleboard-view-types";
import { generateProofMap } from "./proof-map-generate";
import { generateBattleboardView, lintBattleboardViewResult } from "./battleboard-view-generate";
import type { ProofMapOffenceLens } from "./proof-map-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const GOLD_EXPECT_DIR = path.join(REPO_ROOT, "docs", "bundle-fidelity-set", "battleboard-view", "gold");

export type BattleboardViewGoldExpect = {
  bundleId: string;
  offenceLens: ProofMapOffenceLens;
  primaryRouteContains: string[];
  requiredProofPointsAttacked?: string[];
  minProofPointsAttacked?: number;
  minMissingItems?: number;
  requiredMissingContains?: string[];
  minContradictions?: number;
  minDisclosureChasePriorities?: number;
  humanReviewRequired?: boolean;
  whyRouteMustMention?: string[];
};

export function loadBattleboardViewGoldExpect(bundleId: string): BattleboardViewGoldExpect | null {
  const file = path.join(GOLD_EXPECT_DIR, `${bundleId}.expect.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as BattleboardViewGoldExpect;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function evaluateBattleboardViewAgainstExpect(
  view: Omit<BattleboardViewCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote">,
  expect: BattleboardViewGoldExpect,
  proofMapProofPointIds: string[],
): string[] {
  const failures: string[] = [];
  failures.push(...lintBattleboardViewResult(view));

  if (view.offenceLens !== expect.offenceLens) {
    failures.push(`offenceLens ${view.offenceLens} !== expected ${expect.offenceLens}`);
  }

  for (const needle of expect.primaryRouteContains) {
    if (!norm(view.primaryRoute).includes(norm(needle))) {
      failures.push(`primaryRoute missing: ${needle}`);
    }
  }

  for (const phrase of expect.whyRouteMustMention ?? ["provisional", "proof point"]) {
    if (!norm(view.whyRouteIsLive).includes(norm(phrase))) {
      failures.push(`whyRouteIsLive missing: ${phrase}`);
    }
  }

  const attackedIds = new Set(view.proofPointsAttacked.map((p) => p.id));
  if ((expect.minProofPointsAttacked ?? 1) > attackedIds.size) {
    failures.push(
      `proofPointsAttacked ${attackedIds.size} < minProofPointsAttacked ${expect.minProofPointsAttacked ?? 1}`,
    );
  }
  for (const id of expect.requiredProofPointsAttacked ?? []) {
    if (!attackedIds.has(id)) failures.push(`proofPointsAttacked missing id: ${id}`);
  }

  if ((expect.minMissingItems ?? 0) > view.missingMaterial.length) {
    failures.push(`missingMaterial ${view.missingMaterial.length} < minMissingItems ${expect.minMissingItems}`);
  }
  for (const issue of expect.requiredMissingContains ?? []) {
    const needle = norm(issue);
    const hit = view.missingMaterial.some((m) => norm(m.label).includes(needle));
    if (!hit) failures.push(`missingMaterial missing label containing: ${issue}`);
  }

  if ((expect.minContradictions ?? 0) > view.contradictions.length) {
    failures.push(`contradictions ${view.contradictions.length} < minContradictions ${expect.minContradictions}`);
  }

  if ((expect.minDisclosureChasePriorities ?? 0) > view.disclosureChasePriorities.length) {
    failures.push(
      `disclosureChasePriorities ${view.disclosureChasePriorities.length} < min ${expect.minDisclosureChasePriorities}`,
    );
  }

  if (expect.humanReviewRequired !== undefined && view.humanReviewRequired !== expect.humanReviewRequired) {
    failures.push(`humanReviewRequired ${view.humanReviewRequired} !== ${expect.humanReviewRequired}`);
  }

  for (const item of [
    ...view.evidenceHelpingDefence,
    ...view.evidenceHurtingDefence,
    ...view.missingMaterial,
    ...view.contradictions,
  ]) {
    if (!proofMapProofPointIds.includes(item.proofPointId)) {
      failures.push(`orphan proofPointId on evidence item: ${item.proofPointId}`);
    }
  }

  if (!view.proofMapProofPointIds.every((id) => proofMapProofPointIds.includes(id))) {
    failures.push("proofMapProofPointIds mismatch with proof map");
  }

  return [...new Set(failures)];
}

export function evaluateBattleboardViewCase(
  bundleId: string,
  label: string,
  bundleText: string,
): {
  view: ReturnType<typeof generateBattleboardView>;
  expect: BattleboardViewGoldExpect | null;
  failures: string[];
} {
  const map = generateProofMap(bundleId, label, bundleText);
  const view = generateBattleboardView(map, bundleText);
  const expect = loadBattleboardViewGoldExpect(bundleId);
  if (!expect) {
    return { view, expect: null, failures: ["no gold battleboard-view expect file"] };
  }
  return {
    view,
    expect,
    failures: evaluateBattleboardViewAgainstExpect(view, expect, map.proofPoints.map((p) => p.id)),
  };
}
