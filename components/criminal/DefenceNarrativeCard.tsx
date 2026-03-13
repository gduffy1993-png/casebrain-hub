"use client";

/**
 * Phase 6 (optional): Defence Narrative (DNB)
 * Shows "Your defence in brief" built from position, primary strategy, and key leverage.
 */

import { Card } from "@/components/ui/card";
import { buildDefenceNarrative } from "@/lib/criminal/defence-narrative";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type DefenceNarrativeCardProps = {
  snapshot: CaseSnapshot | null;
  /** Optional recorded position text (from case_positions) – if not in snapshot */
  recordedPositionText?: string | null;
  /** When set (e.g. Act Denial from Defence Plan), narrative aligns with this instead of stored strategy */
  displayStrategyLabel?: string | null;
  /** When set with displayStrategyLabel (e.g. fight route), use this for position line so narrative matches committed strategy */
  displayPositionSummary?: string | null;
};

export function DefenceNarrativeCard({ snapshot, recordedPositionText, displayStrategyLabel, displayPositionSummary }: DefenceNarrativeCardProps) {
  const offenceLabel = snapshot?.resolvedOffence?.label;
  const primary = displayStrategyLabel ?? snapshot?.strategy?.primary;
  // Build descriptive leverage from weak elements (avoid repeating "Primary leverage")
  const keyLeverage = snapshot?.strategy?.burdenMap
    ?.filter((e) => e.leverage && e.leverage !== "No challenge")
    .slice(0, 2)
    .map((e) => (e.leverage === "Primary leverage" && e.label ? `${e.label} weak or disputed` : e.leverage));
  const positionSummary =
    displayPositionSummary ??
    recordedPositionText ??
    snapshot?.decisionLog?.currentPosition?.position;

  const narrative = buildDefenceNarrative({
    offenceLabel: offenceLabel ?? undefined,
    primaryStrategy: typeof primary === "string" ? primary : undefined,
    keyLeverage,
    positionSummary: positionSummary ?? undefined,
  });

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Defence narrative</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Your defence in brief – for counsel and court.
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{narrative}</p>
    </Card>
  );
}
