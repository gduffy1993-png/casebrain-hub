"use client";

/**
 * Phase 3: Dynamic Burden Map + Evidence Pressure Points
 * Shows what prosecution must prove (strength, defence leverage) and pressure points in the case.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type BurdenMapItem = { id: string; label: string; support: string; leverage: string };
type PressurePointItem = { id: string; label: string; priority?: string; reason?: string };

type StrategyBurdenAndPressureProps = {
  snapshot: CaseSnapshot | null;
};

function supportBadgeVariant(support: string): "default" | "secondary" | "danger" | "outline" {
  if (support === "strong") return "default";
  if (support === "some") return "secondary";
  if (support === "weak" || support === "none") return "danger";
  return "outline";
}

function priorityColor(priority?: string): string {
  if (priority === "CRITICAL") return "text-red-600 border-red-500/30 bg-red-500/10";
  if (priority === "HIGH") return "text-amber-600 border-amber-500/30 bg-amber-500/10";
  if (priority === "MEDIUM") return "text-blue-600 border-blue-500/30 bg-blue-500/10";
  return "text-muted-foreground border-border";
}

export function StrategyBurdenAndPressure({ snapshot }: StrategyBurdenAndPressureProps) {
  const burdenMap = snapshot?.strategy?.burdenMap;
  const pressurePoints = snapshot?.strategy?.pressurePoints;

  if (!burdenMap?.length && !pressurePoints?.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Dynamic Burden Map */}
      {burdenMap && burdenMap.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Burden map</h3>
          <p className="text-xs text-muted-foreground mb-3">
            What the prosecution must prove and where defence has leverage.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Burden</th>
                  <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Strength</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Defence leverage</th>
                </tr>
              </thead>
              <tbody>
                {(burdenMap as BurdenMapItem[]).map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2 pr-2 text-foreground">{row.label}</td>
                    <td className="py-2 pr-2">
                      <Badge variant={supportBadgeVariant(row.support)} className="text-xs capitalize">
                        {row.support}
                      </Badge>
                    </td>
                    <td className="py-2 text-muted-foreground">{row.leverage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
