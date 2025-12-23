"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CasePhase = 1 | 2 | 3;

type CasePhaseSelectorProps = {
  caseId: string;
  isDisclosureFirstMode: boolean;
  onPhaseChange: (phase: CasePhase) => void;
  defaultPhase?: CasePhase;
  currentPhase?: CasePhase;
};

export function CasePhaseSelector({
  caseId,
  isDisclosureFirstMode,
  onPhaseChange,
  defaultPhase,
  currentPhase,
}: CasePhaseSelectorProps) {
  const [localPhase, setLocalPhase] = useState<CasePhase>(defaultPhase || (isDisclosureFirstMode ? 1 : 2));

  // Sync with parent if defaultPhase changes
  useEffect(() => {
    if (defaultPhase !== undefined) {
      setLocalPhase(defaultPhase);
    }
  }, [defaultPhase]);

  // Controlled sync when parent sends currentPhase
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== localPhase) {
      setLocalPhase(currentPhase);
    }
  }, [currentPhase, localPhase]);

  // Also sync based on disclosure-first mode
  useEffect(() => {
    // Do not force-reset user choice; only adjust initial default if no parent control
    if (currentPhase === undefined) {
      if (isDisclosureFirstMode && localPhase !== 1) {
        setLocalPhase(1);
        onPhaseChange(1);
      }
    }
  }, [isDisclosureFirstMode, currentPhase, localPhase, onPhaseChange]);

  const handlePhaseChange = (phase: CasePhase) => {
    // Prevent moving to Phase 3 without explicit user action
    if (phase === 3 && localPhase !== 3) {
      // Could add a confirmation dialog here if needed
    }
    setLocalPhase(phase);
    onPhaseChange(phase);
  };

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-accent">Case Phase</h3>
            <p className="text-xs text-accent/60 mt-1">
              Control which tools are visible based on case stage
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={localPhase === 1 ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePhaseChange(1)}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Phase 1: Disclosure & Readiness
          </Button>
          <Button
            variant={localPhase === 2 ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePhaseChange(2)}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Phase 2: Positioning & Options
          </Button>
          <Button
            variant={localPhase === 3 ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePhaseChange(3)}
            className="flex items-center gap-2"
          >
            <Scale className="h-3.5 w-3.5" />
            Phase 3: Sentencing & Outcome
          </Button>
        </div>

        {localPhase === 1 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-400 mb-1">
                DISCLOSURE-FIRST MODE
              </p>
              <p className="text-xs text-amber-300/80">
                Tools are limited until disclosure is stabilised. Bail and sentencing tools are hidden to avoid premature outcome discussions.
              </p>
            </div>
          </div>
        )}

        {localPhase === 3 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-400 mb-1">
                SENTENCING PHASE
              </p>
              <p className="text-xs text-red-300/80">
                Use only after plea/conviction posture is clear. This phase shows sentencing mitigation tools.
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-accent/50">
          <p className="mb-1">
            <strong>Phase 1:</strong> Disclosure gaps, readiness gate, procedural leverage
          </p>
          <p className="mb-1">
            <strong>Phase 2:</strong> Bail tools, charge reduction, plea options
          </p>
          <p>
            <strong>Phase 3:</strong> Sentencing mitigation, character tools
          </p>
        </div>
      </div>
    </Card>
  );
}

