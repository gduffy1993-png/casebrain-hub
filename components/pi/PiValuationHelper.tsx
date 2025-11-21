"use client";

import { useMemo, useState } from "react";
import type { PiCaseRecord, PiDisbursement } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PiValuationHelper({
  piCase,
  disbursements,
}: {
  piCase: PiCaseRecord;
  disbursements: PiDisbursement[];
}) {
  const [generalMin, setGeneralMin] = useState("");
  const [generalMax, setGeneralMax] = useState("");

  const disbursementTotal = useMemo(
    () =>
      disbursements.reduce((sum, entry) => sum + (entry.amount ?? 0), 0),
    [disbursements],
  );

  const lossOfEarnings = piCase.loss_of_earnings_estimate ?? 0;
  const specialDamagesEstimate = piCase.special_damages_estimate ?? 0;

  const generalMidpoint =
    generalMin && generalMax
      ? (Number(generalMin) + Number(generalMax)) / 2
      : 0;

  const indicativeTotal =
    generalMidpoint + lossOfEarnings + specialDamagesEstimate + disbursementTotal;

  return (
    <Card
      title="Quantum helper"
      description="Structure potential valuation using user-entered ranges. This does not replace an assessment against the JSB or official guidelines."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="space-y-2 text-sm text-accent/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
              General damages range (£)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={generalMin}
                placeholder="Min"
                onChange={(event) => setGeneralMin(event.target.value)}
                className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                value={generalMax}
                placeholder="Max"
                onChange={(event) => setGeneralMax(event.target.value)}
                className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </label>
          <label className="space-y-2 text-sm text-accent/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
              Recorded loss of earnings (£)
            </span>
            <input
              type="number"
              value={lossOfEarnings}
              readOnly
              className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none"
            />
            <p className="text-xs text-accent/40">
              Update via intake or PI overview card if you need to adjust this placeholder value.
            </p>
          </label>
          <label className="space-y-2 text-sm text-accent/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
              Special damages estimate (£)
            </span>
            <input
              type="number"
              value={specialDamagesEstimate}
              readOnly
              className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none"
            />
            <p className="text-xs text-accent/40">
              Update via PI overview card to reflect ongoing assessments.
            </p>
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-primary/10 bg-surface-muted/60 p-4 text-sm text-accent/70">
          <div className="flex items-center justify-between">
            <span>Disbursements in CaseBrain</span>
            <Badge className="bg-primary/10 text-primary">
              £{disbursementTotal.toLocaleString("en-GB")}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Loss of earnings estimate</span>
            <Badge variant="default">
              £{lossOfEarnings.toLocaleString("en-GB")}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Special damages estimate</span>
            <Badge variant="default">
              £{specialDamagesEstimate.toLocaleString("en-GB")}
            </Badge>
          </div>
          <div className="flex items-center justify-between border-t border-primary/10 pt-4">
            <span>General damages midpoint</span>
            <Badge variant="success">
              £{generalMidpoint.toLocaleString("en-GB")}
            </Badge>
          </div>
          <div className="flex items-center justify-between border-t border-primary/10 pt-4">
            <span className="font-semibold text-accent">Indicative total (internal only)</span>
            <Badge className="bg-primary/10 text-primary text-base">
              £{indicativeTotal.toLocaleString("en-GB")}
            </Badge>
          </div>
          <p className="text-xs text-accent/50">
            This helper is illustrative. Always review against current guidelines and document
            rationale before advising clients or defendants.
          </p>
        </div>
      </div>
    </Card>
  );
}


