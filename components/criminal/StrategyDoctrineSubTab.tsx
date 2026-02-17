"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, FileText } from "lucide-react";

type StrategyDoctrineSubTabProps = {
  onOpenFullOutput?: () => void;
};

/**
 * Legal doctrine sub-tab: signposts to Full output where causation, required findings,
 * evidential limitations and full doctrine are shown (Judge Constraint Lens, Defence Strategy Plan).
 */
export function StrategyDoctrineSubTab({ onOpenFullOutput }: StrategyDoctrineSubTabProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Scale className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Legal doctrine</h3>
          <p className="text-sm text-muted-foreground">
            Causation requirements, evidence-based resolution, weapon uncertainty, required findings
            and evidential limitations are set out in the <strong>Full engine output</strong>.
            There you will find the legal tests the court will consider, doctrine constraints,
            defence counters and attack order.
          </p>
          {onOpenFullOutput && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={onOpenFullOutput}
            >
              <FileText className="h-4 w-4" />
              Open Full engine output
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
