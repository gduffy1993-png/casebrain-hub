import { formatBundleHealthLabel } from "@/lib/bundle/bundle-display-profile";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

export function battleboardHasMaterial(bb: BattleboardOutput | null): boolean {
  if (!bb) return false;
  return Boolean(
    bb.primary_route ||
      (bb.routes?.length ?? 0) > 0 ||
      (bb.urgent_next_moves?.length ?? 0) > 0 ||
      (bb.global_collapse_risks?.length ?? 0) > 0,
  );
}

export type CaseBundleHealthInput = {
  documentCount: number;
  combinedTextLength: number;
  capabilityTier?: string | null;
  battleboard?: BattleboardOutput | null;
  documentRows?: DocumentRowMeta[];
  hasBattleboardMaterial?: boolean;
  /** Front-matter scan for explicit "N pages" hints in bundle text. */
  bundleTextHint?: string | null;
};

export function formatCaseBundleHealthLabel(input: CaseBundleHealthInput): string {
  return formatBundleHealthLabel({
    documentCount: input.documentCount,
    combinedTextLength: input.combinedTextLength,
    capabilityTier: input.capabilityTier,
    hasBattleboardMaterial:
      input.hasBattleboardMaterial ?? battleboardHasMaterial(input.battleboard ?? null),
    battleboardOverallStatus: input.battleboard?.overall_status ?? null,
    documentRows: input.documentRows,
    docs: input.documentRows?.map((r) => ({ name: r.name })),
    bundleTextHint: input.bundleTextHint,
  });
}
