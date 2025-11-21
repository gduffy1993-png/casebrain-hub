"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/Toast";
import { Calculator } from "lucide-react";
import type { HousingCaseRecord, HousingDefect } from "@/types";

type HousingQuantumCalculatorProps = {
  caseId: string;
  housingCase: HousingCaseRecord;
  defects: HousingDefect[];
  hasMedicalEvidence: boolean;
};

export function HousingQuantumCalculator({
  caseId,
  housingCase,
  defects,
  hasMedicalEvidence,
}: HousingQuantumCalculatorProps) {
  const [quantum, setQuantum] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [specialDamages, setSpecialDamages] = useState({
    additionalHeatingCosts: "",
    alternativeAccommodationCosts: "",
    propertyDamageValue: "",
  });
  const pushToast = useToast((state) => state.push);

  const calculateQuantum = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/housing/quantum/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalHeatingCosts: specialDamages.additionalHeatingCosts
            ? Number(specialDamages.additionalHeatingCosts)
            : undefined,
          alternativeAccommodationCosts: specialDamages.alternativeAccommodationCosts
            ? Number(specialDamages.alternativeAccommodationCosts)
            : undefined,
          propertyDamageValue: specialDamages.propertyDamageValue
            ? Number(specialDamages.propertyDamageValue)
            : undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to calculate quantum");
      const data = await response.json();
      setQuantum(data);
    } catch (error) {
      pushToast("Failed to calculate quantum.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Quantum Calculator"
      description="Estimate damages range based on case factors. This is guidance only and should be verified with expert evidence."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Additional Heating Costs (£)
            </label>
            <Input
              type="number"
              value={specialDamages.additionalHeatingCosts}
              onChange={(e) =>
                setSpecialDamages({ ...specialDamages, additionalHeatingCosts: e.target.value })
              }
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Alternative Accommodation (£)
            </label>
            <Input
              type="number"
              value={specialDamages.alternativeAccommodationCosts}
              onChange={(e) =>
                setSpecialDamages({
                  ...specialDamages,
                  alternativeAccommodationCosts: e.target.value,
                })
              }
              className="mt-1"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              Property Damage (£)
            </label>
            <Input
              type="number"
              value={specialDamages.propertyDamageValue}
              onChange={(e) =>
                setSpecialDamages({ ...specialDamages, propertyDamageValue: e.target.value })
              }
              className="mt-1"
              placeholder="0"
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={calculateQuantum}
          disabled={loading}
          className="w-full gap-2"
        >
          <Calculator className="h-4 w-4" />
          {loading ? "Calculating..." : "Calculate Quantum"}
        </Button>

        {quantum && (
          <div className="space-y-4 rounded-2xl border border-primary/10 bg-surface-muted/70 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-accent/50">General Damages</p>
              <p className="mt-1 text-lg font-semibold text-accent">
                £{quantum.generalDamages.finalRange.min.toLocaleString()} - £
                {quantum.generalDamages.finalRange.max.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-accent/60">{quantum.generalDamages.reasoning}</p>
            </div>

            {quantum.specialDamages.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-accent/50">Special Damages</p>
                <ul className="mt-2 space-y-2">
                  {quantum.specialDamages.map((head: any, idx: number) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span className="text-accent/70">{head.category}:</span>
                      <span className="font-semibold text-accent">
                        £{head.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-primary/10 pt-4">
              <p className="text-xs uppercase tracking-wide text-accent/50">Total Quantum Range</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                £{quantum.totalRange.min.toLocaleString()} - £
                {quantum.totalRange.max.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-accent/60">
                Confidence: {quantum.confidence.toUpperCase()}
              </p>
            </div>

            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-3 text-xs text-accent/70">
              <p className="font-semibold text-warning">⚠️ Disclaimer</p>
              <p className="mt-1">{quantum.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

