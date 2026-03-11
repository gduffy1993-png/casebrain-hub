"use client";

/**
 * Phase 3: Evidence Pressure Points at a glance.
 * Burden map is shown once in Defence Plan (Strategy column).
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type PressurePointItem = { id: string; label: string; priority?: string; reason?: string };

type StrategyBurdenAndPressureProps = {
  snapshot: CaseSnapshot | null;
};

function priorityColor(priority?: string): string {
  if (priority === "CRITICAL") return "text-red-600 border-red-500/30 bg-red-500/10";
  if (priority === "HIGH") return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  if (priority === "MEDIUM") return "text-blue-600 border-blue-500/30 bg-blue-500/10";
  return "text-muted-foreground border-border";
}

export function StrategyBurdenAndPressure({ snapshot }: StrategyBurdenAndPressureProps) {
  const pressurePoints = snapshot?.strategy?.pressurePoints;

  // Burden map shown once in Defence Plan (Strategy column); at a glance shows only pressure points
  if (!pressurePoints?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      {/* Evidence Pressure Points */}
      {pressurePoints && pressurePoints.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Pressure points</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Missing evidence, weak inferences, and disclosure gaps to exploit.
          </p>
          <ul className="space-y-2">
            {(pressurePoints as PressurePointItem[]).map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className={`shrink-0 text-xs ${priorityColor(p.priority)}`}>
                  {p.priority || "—"}
                </Badge>
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{p.label}</span>
                  {p.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
