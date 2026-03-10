"use client";

import { Card } from "@/components/ui/card";
import type { OffenceElementState } from "@/lib/criminal/strategy-coordinator";
import type { DependencyState } from "@/lib/criminal/strategy-coordinator";

type PressurePointsListProps = {
  elements: OffenceElementState[];
  dependencies: DependencyState[];
  outstandingItems?: string[];
  title?: string;
};

export function PressurePointsList({
  elements,
  dependencies,
  outstandingItems = [],
  title = "Pressure points",
}: PressurePointsListProps) {
  const weakElements = elements.filter((e) => e.support === "weak" || e.support === "none");
  const outstandingDeps = dependencies.filter((d) => d.status === "outstanding");
  const points: Array<{ label: string; type: "missing_doc" | "weak_inference" | "disclosure_gap" | "procedural" }> = [];

  outstandingDeps.forEach((d) => {
    points.push({ label: d.label || d.id, type: "missing_doc" });
  });
  weakElements.forEach((e) => {
    const gap = e.gaps?.[0] || e.label;
    points.push({ label: `${e.label}: ${gap}`, type: "weak_inference" });
  });
  outstandingItems.forEach((item) => {
    if (typeof item === "string" && item.trim() && !points.some((p) => p.label === item)) {
      points.push({ label: item, type: "disclosure_gap" });
    }
  });

  const unique = Array.from(new Map(points.map((p) => [p.label, p])).values()).slice(0, 12);
  if (unique.length === 0) return null;

  return (
    <Card className="p-4 border border-border/50">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Weak spots and missing evidence in the prosecution case.
      </p>
      <ul className="space-y-1.5 text-xs">
        {unique.map((point, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-amber-600 shrink-0">•</span>
            <span className="text-foreground">{point.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
