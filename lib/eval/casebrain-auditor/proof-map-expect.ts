import fs from "node:fs";
import path from "node:path";
import type { ProofMapCaseResult, ProofMapOffenceLens } from "./proof-map-types";
import { generateProofMap, lintProofMapResult } from "./proof-map-generate";
import { sourceBasisInBundle } from "./explanation-fidelity-generate";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const GOLD_EXPECT_DIR = path.join(REPO_ROOT, "docs", "bundle-fidelity-set", "proof-map", "gold");

export type ProofMapGoldExpect = {
  bundleId: string;
  offenceLens: ProofMapOffenceLens;
  proofPointIds: string[];
  minLinks: number;
  requiredLinkTypes?: string[];
  requiredMissingIssues?: string[];
  humanReviewRequired?: boolean;
};

export function loadProofMapGoldExpect(bundleId: string): ProofMapGoldExpect | null {
  const file = path.join(GOLD_EXPECT_DIR, `${bundleId}.expect.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as ProofMapGoldExpect;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function evaluateProofMapAgainstExpect(
  bundleText: string,
  map: Omit<ProofMapCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote">,
  expect: ProofMapGoldExpect,
): string[] {
  const failures: string[] = [];

  failures.push(...lintProofMapResult(map));

  if (map.offenceLens !== expect.offenceLens) {
    failures.push(`offenceLens ${map.offenceLens} !== expected ${expect.offenceLens}`);
  }

  for (const id of expect.proofPointIds) {
    if (!map.proofPoints.some((p) => p.id === id)) {
      failures.push(`missing proof point id: ${id}`);
    }
  }

  if (map.links.length < expect.minLinks) {
    failures.push(`links ${map.links.length} < minLinks ${expect.minLinks}`);
  }

  for (const lt of expect.requiredLinkTypes ?? []) {
    if (!map.links.some((l) => l.linkType === lt)) {
      failures.push(`no link of type: ${lt}`);
    }
  }

  for (const issue of expect.requiredMissingIssues ?? []) {
    const needle = norm(issue);
    const hit = map.links.some(
      (l) =>
        (l.linkType === "missing" || l.linkType === "weakens" || l.linkType === "disclosure_chase") &&
        norm(l.label).includes(needle),
    );
    if (!hit) failures.push(`no missing/disclosure link matching issue: ${issue}`);
  }

  if (expect.humanReviewRequired !== undefined && map.humanReviewRequired !== expect.humanReviewRequired) {
    failures.push(`humanReviewRequired ${map.humanReviewRequired} !== ${expect.humanReviewRequired}`);
  }

  for (const p of map.proofPoints) {
    if (p.sourceBasis && !sourceBasisInBundle(bundleText, p.sourceBasis) && p.sourceBasis.length > 40) {
      const hay = norm(bundleText);
      if (!hay.includes(norm(p.sourceBasis.slice(0, 30)))) {
        failures.push(`proofPoint ${p.id}: sourceBasis weakly traceable`);
      }
    }
  }

  return [...new Set(failures)];
}

export function evaluateProofMapCase(
  bundleId: string,
  label: string,
  bundleText: string,
): { map: ReturnType<typeof generateProofMap>; expect: ProofMapGoldExpect | null; failures: string[] } {
  const map = generateProofMap(bundleId, label, bundleText);
  const expect = loadProofMapGoldExpect(bundleId);
  if (!expect) {
    return { map, expect: null, failures: ["no gold proof-map expect file"] };
  }
  return { map, expect, failures: evaluateProofMapAgainstExpect(bundleText, map, expect) };
}
