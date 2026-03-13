"use client";

/**
 * Phase 6 (optional): Risk–Outcome Matrix (ROM)
 * Table of strategic options vs outcome and risk (primary highlighted).
 */

import { Card } from "@/components/ui/card";
import { buildRiskOutcomeMatrix } from "@/lib/criminal/risk-outcome-matrix";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type RiskOutcomeMatrixCardProps = {
  snapshot: CaseSnapshot | null;
  /** When set (from Defence Plan primary route), overrides snapshot strategy so matrix matches committed strategy. */
  displayPrimaryStrategy?: "fight_charge" | "charge_reduction" | "outcome_management";
};

export function RiskOutcomeMatrixCard({ snapshot, displayPrimaryStrategy }: RiskOutcomeMatrixCardProps) {
  const rows = buildRiskOutcomeMatrix({
    primaryStrategy: displayPrimaryStrategy ?? snapshot?.strategy?.primary,
    fallbacks: snapshot?.strategy?.fallbacks,
    confidence: snapshot?.strategy?.confidence,
  });

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Risk–outcome matrix</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Strategic options and likely outcomes. Primary approach highlighted.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Option</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Outcome</th>
              <th className="text-left py-2 font-medium text-muted-foreground">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.optionId}
                className={`border-b border-border/50 ${row.isPrimary ? "bg-primary/10" : ""}`}
              >
                <td className="py-2 pr-2 font-medium text-foreground">
                  {row.option}
                  {row.isPrimary && (
                    <span className="ml-1 text-xs text-primary font-normal">(primary)</span>
                  )}
                </td>
                <td className="py-2 pr-2 text-muted-foreground">{row.outcomeSummary}</td>
                <td className="py-2 text-muted-foreground">{row.riskLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
