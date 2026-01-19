"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardEdit, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

type Letter = {
  id: string;
  template_id: string;
  version: number;
  body: string;
};

type LettersPanelProps = {
  caseId: string;
  letters?: Letter[];
  practiceArea?: string;
};

type LetterType = 
  | "disclosure_chase"
  | "cps_representations"
  | "basis_of_plea"
  | "bail_application"
  | "mitigation_cover"
  | "pre_ptph_position";

const LETTER_TYPE_OPTIONS: Array<{ value: LetterType; label: string }> = [
  { value: "disclosure_chase", label: "Disclosure Chase (CPIA)" },
  { value: "cps_representations", label: "CPS Representations" },
  { value: "basis_of_plea", label: "Basis of Plea" },
  { value: "bail_application", label: "Bail Application" },
  { value: "mitigation_cover", label: "Mitigation Cover Letter" },
  { value: "pre_ptph_position", label: "Pre-PTPH Position Statement" },
];

// Recommended letter types by strategy
const RECOMMENDED_BY_STRATEGY: Record<string, LetterType[]> = {
  fight_charge: ["disclosure_chase", "cps_representations"],
  charge_reduction: ["cps_representations", "basis_of_plea"],
  outcome_management: ["mitigation_cover"],
};

export function LettersPanel({ caseId, letters = [], practiceArea }: LettersPanelProps) {
  const [letterType, setLetterType] = useState<LetterType | "">("");
  const [hasPosition, setHasPosition] = useState<boolean | null>(null);
  const [hasStrategyCommitment, setHasStrategyCommitment] = useState<boolean | null>(null);
  const [committedStrategy, setCommittedStrategy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a criminal case
  const isCriminal = practiceArea === "criminal";

  // Fetch position and strategy commitment status
  useEffect(() => {
    if (!isCriminal) {
      setIsLoading(false);
      return;
    }

    async function checkGating() {
      setIsLoading(true);
      try {
        // Check position
        const positionRes = await fetch(`/api/criminal/${caseId}/position`);
        const positionData = await positionRes.json();
        setHasPosition(positionData.ok && positionData.data !== null);

        // Check strategy commitment
        const strategyRes = await fetch(`/api/criminal/${caseId}/strategy-commitment`);
        const strategyData = await strategyRes.json();
        const hasCommitment = strategyData.ok && strategyData.data !== null && strategyData.data.primary_strategy;
        setHasStrategyCommitment(hasCommitment);
        if (hasCommitment && strategyData.data.primary_strategy) {
          setCommittedStrategy(strategyData.data.primary_strategy);
          // Pre-select recommended letter types if available
          const recommended = RECOMMENDED_BY_STRATEGY[strategyData.data.primary_strategy];
          if (recommended && recommended.length > 0 && !letterType) {
            setLetterType(recommended[0]);
          }
        }
      } catch (error) {
        console.error("Failed to check letter gating:", error);
        setHasPosition(false);
        setHasStrategyCommitment(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkGating();
  }, [caseId, isCriminal]);

  // Determine if Draft Letter button should be enabled
  const canDraftLetter = isCriminal
    ? hasPosition === true && hasStrategyCommitment === true && letterType !== ""
    : true; // Non-criminal cases: no gating

  // Get helper message
  const getHelperMessage = (): string | null => {
    if (!isCriminal) return null;
    if (isLoading) return null;
    if (hasPosition === false) return "Record Current Position to enable letters.";
    if (hasStrategyCommitment === false) return "Commit a strategy to enable letters.";
    if (letterType === "") return "Select a letter type to proceed.";
    return null;
  };

  const helperMessage = getHelperMessage();
  const recommendedTypes = committedStrategy ? RECOMMENDED_BY_STRATEGY[committedStrategy] || [] : [];

  // Build link URL with letter type if selected
  const draftLetterUrl = letterType
    ? `/cases/${caseId}/letters/new?type=${letterType}`
    : `/cases/${caseId}/letters/new`;

  return (
    <Card
      title="Letters"
      action={
        <Link href={draftLetterUrl}>
          <Button 
            size="sm" 
            variant="primary" 
            className="gap-2"
            disabled={!canDraftLetter}
          >
            <ClipboardEdit className="h-4 w-4" />
            Draft Letter
          </Button>
        </Link>
      }
    >
      {/* Letter type selection (criminal only) */}
      {isCriminal && (
        <div className="mb-4 space-y-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-accent/50 mb-1 block">
              Letter type
            </label>
            <select
              value={letterType}
              onChange={(e) => setLetterType(e.target.value as LetterType)}
              className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="">-- Select letter type --</option>
              {LETTER_TYPE_OPTIONS.map((option) => {
                const isRecommended = recommendedTypes.includes(option.value);
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}{isRecommended ? " (recommended)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <p className="text-xs text-accent/60">
            Select the purpose of the letter. Drafting is solicitor-controlled and evidence-linked.
          </p>
          {helperMessage && (
            <div className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent">{helperMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* Letters list */}
      <ul className="space-y-3">
        {letters.map((letter) => (
          <li
            key={letter.id}
            className="rounded-2xl border bg-surface-muted/70 p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-accent">
                Template {letter.template_id}
              </p>
              <span className="text-xs text-accent/50">
                v{letter.version}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-accent/60">
              {letter.body.slice(0, 120)}…
            </p>
            <Link
              href={`/cases/${caseId}/letters/${letter.id}`}
              className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
            >
              View version & diff
            </Link>
          </li>
        ))}
        {!letters?.length && (
          <p className="text-sm text-accent/60">
            No letters drafted yet. Generate a letter using extracted facts.
          </p>
        )}
      </ul>
    </Card>
  );
}

