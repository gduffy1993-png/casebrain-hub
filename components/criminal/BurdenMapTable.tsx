"use client";

import { Card } from "@/components/ui/card";
import type { OffenceElementState } from "@/lib/criminal/strategy-coordinator";

type BurdenMapTableProps = {
  elements: OffenceElementState[];
  title?: string;
};

function strengthLabel(support: string): string {
  if (support === "strong") return "Strong";
  if (support === "some") return "Moderate";
  if (support === "weak") return "Weak";
  return "None";
}

function leverageLabel(support: string, gaps: string[]): string {
  if (support === "strong") return "No challenge";
  if (support === "some") return "Limited leverage";
  if (gaps.length > 0) return "Primary leverage";
  return support === "weak" || support === "none" ? "Primary leverage" : "—";
}

export function BurdenMapTable({ elements, title = "Burden Map" }: BurdenMapTableProps) {
  if (!elements?.length) return null;

  return (
    <Card className="p-4 border border-border/50">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        What the prosecution must prove and where the defence has leverage.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Burden</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Evidence</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Strength</th>
              <th className="text-left py-2 font-medium text-muted-foreground">Defence leverage</th>
            </tr>
          </thead>
          <tbody>
            {elements.map((el) => (
              <tr key={el.id} className="border-b border-border/50">
                <td className="py-2 pr-2 text-foreground">{el.label}</td>
                <td className="py-2 pr-2 text-muted-foreground">
                  {el.refs?.length ? `${el.refs.length} ref(s)` : "—"}
                </td>
                <td className="py-2 pr-2">
                  <span
                    className={
                      el.support === "strong"
                        ? "text-green-600"
                        : el.support === "some"
                          ? "text-amber-600"
                          : "text-amber-600 font-medium"
                    }
                  >
                    {strengthLabel(el.support)}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">
                  {leverageLabel(el.support, el.gaps ?? [])}
                  {(el.gaps?.length ?? 0) > 0 && (
                    <span className="block text-[10px] mt-0.5 truncate max-w-[180px]" title={el.gaps.join(", ")}>
                      {el.gaps[0]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
