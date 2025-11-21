"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { calculateLimitation } from "@/lib/pi/limitation";
import type { PiCaseRecord, PiCaseStage, PiCaseType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";

const STAGE_OPTIONS: Array<{ value: PiCaseStage; label: string }> = [
  { value: "intake", label: "Intake" },
  { value: "investigation", label: "Investigation" },
  { value: "liability", label: "Liability" },
  { value: "quantum", label: "Quantum" },
  { value: "settlement", label: "Settlement" },
  { value: "closed", label: "Closed" },
];

export function PiCaseOverview({
  caseId,
  caseType,
  piCase,
}: {
  caseId: string;
  caseType: PiCaseType;
  piCase: PiCaseRecord;
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [isPending, startTransition] = useTransition();

  const limitation = useMemo(() => {
    const accident = piCase.accident_date ? new Date(piCase.accident_date) : null;
    const knowledge = piCase.date_of_knowledge ? new Date(piCase.date_of_knowledge) : null;
    const dob = piCase.client_dob ? new Date(piCase.client_dob) : null;
    return calculateLimitation({
      accidentDate: accident,
      dateOfKnowledge: knowledge,
      clientDob: dob,
    });
  }, [piCase.accident_date, piCase.date_of_knowledge, piCase.client_dob]);

  const currentStage = piCase.stage;

  const handleStageChange = (stage: PiCaseStage) => {
    if (stage === currentStage) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/cases/${caseId}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Unable to update stage");
        }
        pushToast("Stage updated.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update stage.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 text-sm text-accent/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary/70">
            {caseType === "pi" ? "Personal injury" : "Clinical negligence"}
          </p>
          <h2 className="text-lg font-semibold text-primary">PI / Clinical Neg overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-accent/40">Stage</span>
          <div className="flex flex-wrap items-center gap-2">
            {STAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={option.value === currentStage ? "primary" : "secondary"}
                className="text-xs"
                disabled={isPending}
                onClick={() => handleStageChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Accident date" value={formatDate(piCase.accident_date)} />
        <Field label="Date of knowledge" value={formatDate(piCase.date_of_knowledge)} />
        <Field label="Client DOB" value={formatDate(piCase.client_dob)} />
        <Field
          label="Liability stance"
          value={piCase.liability_stance ?? "Not set"}
        />
        <Field
          label="Injury severity"
          value={piCase.injury_severity ? capitalise(piCase.injury_severity) : "Not set"}
        />
        <Field label="Employment status" value={piCase.employment_status ?? "Not set"} />
      </div>

      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-xs text-danger/80">
        <div className="flex items-center gap-2 font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" />
          Limitation helper
        </div>
        <p className="mt-2 text-sm text-danger">
          {limitation.limitationDate
            ? `Indicative limitation: ${formatDate(limitation.limitationDate.toISOString())}`
            : "Limitation could not be calculated with the available data."}
        </p>
        <p className="mt-1">
          {limitation.reason ||
            "Populate incident details to calculate an indicative limitation date."}
        </p>
        <p className="mt-2 text-xs text-danger/70">
          This helper is for internal workflow only. You must verify limitation with a qualified fee
          earner before issuing.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Loss of earnings estimate"
          value={formatCurrency(piCase.loss_of_earnings_estimate)}
        />
        <Field
          label="Special damages estimate"
          value={formatCurrency(piCase.special_damages_estimate)}
        />
        <Field
          label="General damages band / notes"
          value={piCase.general_damages_band ?? "Not set"}
          className="sm:col-span-2"
        />
        <Field
          label="Injury description"
          value={piCase.injury_description ?? "Not recorded"}
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-accent/40">{label}</p>
      <p className="mt-1 text-sm text-accent/80">{value}</p>
    </div>
  );
}

function formatDate(value: string | null | Date | undefined) {
  if (!value) return "Not set";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB");
}

function formatCurrency(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Not set";
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
}

function capitalise(value: string | null) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}


