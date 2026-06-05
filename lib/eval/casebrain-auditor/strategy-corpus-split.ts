import type { StrategyCorpusManifest, StrategyCorpusSplit } from "./strategy-corpus-types";
import { OFFENCE_FAMILIES } from "./strategy-corpus-types";

export const SPLIT_RATIOS = {
  discovery: 0.7,
  validation: 0.15,
  holdout: 0.15,
} as const;

export function targetSplitCounts(total: number): Record<StrategyCorpusSplit, number> {
  const discovery = Math.round(total * SPLIT_RATIOS.discovery);
  const validation = Math.round(total * SPLIT_RATIOS.validation);
  const holdout = total - discovery - validation;
  return { discovery, validation, holdout };
}

/** Stratify by offence family; holdout is frozen / not for tuning. */
export function assignStratifiedSplits(manifests: StrategyCorpusManifest[]): StrategyCorpusManifest[] {
  const total = manifests.length;
  const targets = targetSplitCounts(total);
  const byFamily = new Map<string, StrategyCorpusManifest[]>();

  for (const m of manifests) {
    const list = byFamily.get(m.offenceFamily) ?? [];
    list.push(m);
    byFamily.set(m.offenceFamily, list);
  }

  const assigned: StrategyCorpusManifest[] = [];
  const counts: Record<StrategyCorpusSplit, number> = {
    discovery: 0,
    validation: 0,
    holdout: 0,
  };

  for (const family of OFFENCE_FAMILIES) {
    const group = (byFamily.get(family) ?? []).sort((a, b) => a.seed - b.seed);
    const n = group.length;
    if (!n) continue;

    let d = Math.round(n * SPLIT_RATIOS.discovery);
    let v = Math.round(n * SPLIT_RATIOS.validation);
    let h = n - d - v;

    for (let i = 0; i < group.length; i++) {
      let split: StrategyCorpusSplit;
      if (i < d) split = "discovery";
      else if (i < d + v) split = "validation";
      else split = "holdout";

      assigned.push({
        ...group[i]!,
        split,
        splitFrozen: split === "holdout",
        tuneAllowed: split !== "holdout",
      });
    }

    counts.discovery += d;
    counts.validation += v;
    counts.holdout += h;
  }

  // Rebalance to exact targets by moving border cases (deterministic: lowest seed first)
  assigned.sort((a, b) => a.seed - b.seed);

  function move(from: StrategyCorpusSplit, to: StrategyCorpusSplit, need: number): void {
    if (need <= 0) return;
    for (const m of assigned) {
      if (need <= 0) break;
      if (m.split !== from || m.splitFrozen) continue;
      m.split = to;
      m.splitFrozen = to === "holdout";
      m.tuneAllowed = to !== "holdout";
      counts[from]--;
      counts[to]++;
      need--;
    }
  }

  move("discovery", "validation", counts.discovery - targets.discovery);
  move("validation", "discovery", counts.validation - targets.validation);
  move("discovery", "holdout", counts.discovery - targets.discovery);
  move("validation", "holdout", counts.validation - targets.validation);
  move("holdout", "discovery", counts.holdout - targets.holdout);

  return assigned.sort((a, b) => a.seed - b.seed);
}

export function filterBySplit(
  manifests: StrategyCorpusManifest[],
  split: StrategyCorpusSplit | "all",
): StrategyCorpusManifest[] {
  if (split === "all") return manifests;
  return manifests.filter((m) => m.split === split);
}

export function countSplits(manifests: StrategyCorpusManifest[]): Record<StrategyCorpusSplit, number> {
  return {
    discovery: manifests.filter((m) => m.split === "discovery").length,
    validation: manifests.filter((m) => m.split === "validation").length,
    holdout: manifests.filter((m) => m.split === "holdout").length,
  };
}
