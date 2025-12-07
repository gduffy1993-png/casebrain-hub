"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { CheckCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";
import { IntakeConflictCheck } from "@/components/intake/IntakeConflictCheck";

type FormState = {
  caseTitle: string;
  opponent: string;
  caseType: "pi" | "clinical_negligence";
  accidentDate: string;
  dateOfKnowledge: string;
  clientDob: string;
  injuryDescription: string;
  injurySeverity: "low" | "medium" | "high" | "";
  employmentStatus: string;
  lossOfEarningsEstimate: string;
  specialDamagesEstimate: string;
  generalDamagesBand: string;
};

const INITIAL_STATE: FormState = {
  caseTitle: "",
  opponent: "",
  caseType: "pi",
  accidentDate: "",
  dateOfKnowledge: "",
  clientDob: "",
  injuryDescription: "",
  injurySeverity: "",
  employmentStatus: "",
  lossOfEarningsEstimate: "",
  specialDamagesEstimate: "",
  generalDamagesBand: "",
};

type Step = 0 | 1 | 2;

export function PiIntakeWizard() {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const { organization } = useOrganization();
  const orgId = organization?.id || `solo-${organization?.id || "unknown"}`;
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [step, setStep] = useState<Step>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConflictBlock, setHasConflictBlock] = useState(false);
  const [result, setResult] = useState<{
    caseId: string;
    limitationDate: string | null;
    limitationReason: string;
  } | null>(null);

  const canContinue =
    step === 0
      ? formState.caseTitle.trim().length >= 3
      : step === 1
        ? formState.injuryDescription.trim().length > 0
        : true;

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 2) as Step);
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 0) as Step);

  const handleChange = (key: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (hasConflictBlock) {
      pushToast("Cannot create case: Direct conflicts detected. Please resolve conflicts first.");
      return;
    }
    
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/pi/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseTitle: formState.caseTitle.trim(),
          opponent: formState.opponent.trim() || null,
          caseType: formState.caseType,
          accidentDate: formState.accidentDate || null,
          dateOfKnowledge: formState.dateOfKnowledge || null,
          clientDob: formState.clientDob || null,
          injuryDescription: formState.injuryDescription.trim() || null,
          injurySeverity: formState.injurySeverity || null,
          employmentStatus: formState.employmentStatus.trim() || null,
          lossOfEarningsEstimate: parseNumber(formState.lossOfEarningsEstimate),
          specialDamagesEstimate: parseNumber(formState.specialDamagesEstimate),
          generalDamagesBand: formState.generalDamagesBand.trim() || null,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        dev?: boolean;
        message?: string;
        caseId?: string;
        limitationDate?: string | null;
        limitationReason?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? payload.message ?? "Unable to create PI case");
      }

      if (payload.dev) {
        pushToast(payload.message ?? "PI intake simulated (development mode).");
        return;
      }

      if (!payload.caseId) {
        throw new Error("Case ID missing from intake response.");
      }

      setResult({
        caseId: payload.caseId,
        limitationDate: payload.limitationDate ?? null,
        limitationReason: payload.limitationReason ?? "",
      });

      pushToast("PI / Clinical Neg case created.");
      setFormState(INITIAL_STATE);
      setStep(0);

      setTimeout(() => {
        router.push(`/cases/${payload.caseId}`);
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create PI case";
      pushToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 0 ? (
        <Card title="Case basics" description="Capture headline details to set up the PI matter.">
          <div className="grid gap-4">
            <Field
              label="Case title"
              required
              placeholder="Matthews v Logistics Ltd"
              value={formState.caseTitle}
              onChange={(value) => handleChange("caseTitle", value)}
            />
            <Field
              label="Defendant / Opponent"
              placeholder="Logistics Ltd"
              value={formState.opponent}
              onChange={(value) => handleChange("opponent", value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                label="Matter type"
                value={formState.caseType}
                onChange={(value) =>
                  handleChange("caseType", value as FormState["caseType"])
                }
                options={[
                  { label: "Personal injury", value: "pi" },
                  { label: "Clinical negligence", value: "clinical_negligence" },
                ]}
              />
              <Field
                label="Accident date"
                type="date"
                value={formState.accidentDate}
                onChange={(value) => handleChange("accidentDate", value)}
              />
              <Field
                label="Date of knowledge"
                type="date"
                value={formState.dateOfKnowledge}
                onChange={(value) => handleChange("dateOfKnowledge", value)}
              />
            </div>
            <Field
              label="Client date of birth"
              type="date"
              value={formState.clientDob}
              onChange={(value) => handleChange("clientDob", value)}
            />
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card
          title="Injury & work details"
          description="Capture headline injury information to assist quantum planning."
        >
          <div className="grid gap-4">
            <TextareaField
              label="Injury summary"
              required
              placeholder="Whiplash and lower back pain impacting ability to work."
              value={formState.injuryDescription}
              onChange={(value) => handleChange("injuryDescription", value)}
            />
            <SelectField
              label="Injury severity"
              value={formState.injurySeverity}
              onChange={(value) =>
                handleChange("injurySeverity", value as FormState["injurySeverity"])
              }
              options={[
                { label: "Not set", value: "" },
                { label: "Low", value: "low" },
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
              ]}
            />
            <Field
              label="Employment status"
              placeholder="Employed full-time / Self-employed / Student"
              value={formState.employmentStatus}
              onChange={(value) => handleChange("employmentStatus", value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Loss of earnings estimate (£)"
                type="number"
                placeholder="12000"
                value={formState.lossOfEarningsEstimate}
                onChange={(value) => handleChange("lossOfEarningsEstimate", value)}
              />
              <Field
                label="Special damages estimate (£)"
                type="number"
                placeholder="4500"
                value={formState.specialDamagesEstimate}
                onChange={(value) => handleChange("specialDamagesEstimate", value)}
              />
              <Field
                label="General damages band / notes"
                placeholder="Neck soft tissue – mid bracket"
                value={formState.generalDamagesBand}
                onChange={(value) => handleChange("generalDamagesBand", value)}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card
          title="Review and create"
          description="Confirm the details below and create the case. Limitation helper is indicative only."
        >
          {/* Conflict Check */}
          {(formState.caseTitle || formState.opponent) && (
            <div className="mb-6">
              <IntakeConflictCheck
                orgId={orgId}
                clientName={formState.caseTitle.split(" - ")[0] || formState.caseTitle}
                opponentName={formState.opponent}
                onConflictCheckComplete={(hasConflicts) => {
                  setHasConflictBlock(hasConflicts);
                }}
              />
            </div>
          )}
          
          <div className="space-y-4 text-sm text-accent/70">
            <ReviewRow label="Case title" value={formState.caseTitle} />
            <ReviewRow
              label="Matter type"
              value={
                formState.caseType === "pi" ? "Personal injury" : "Clinical negligence"
              }
            />
            <ReviewRow label="Opponent" value={formState.opponent || "Not provided"} />
            <ReviewRow label="Accident date" value={formState.accidentDate || "Not set"} />
            <ReviewRow
              label="Date of knowledge"
              value={formState.dateOfKnowledge || "Not set"}
            />
            <ReviewRow label="Client DOB" value={formState.clientDob || "Not set"} />
            <ReviewRow
              label="Injury summary"
              value={formState.injuryDescription || "Not set"}
            />
            <ReviewRow
              label="Employment status"
              value={formState.employmentStatus || "Not set"}
            />
            <ReviewRow
              label="Loss of earnings estimate"
              value={
                formState.lossOfEarningsEstimate
                  ? `£${Number(formState.lossOfEarningsEstimate).toLocaleString("en-GB")}`
                  : "Not set"
              }
            />
            <ReviewRow
              label="Special damages estimate"
              value={
                formState.specialDamagesEstimate
                  ? `£${Number(formState.specialDamagesEstimate).toLocaleString("en-GB")}`
                  : "Not set"
              }
            />
          </div>
          <p className="mt-6 text-xs text-accent/50">
            Limitation helper is indicative only and does not replace qualified legal advice.
          </p>
        </Card>
      ) : null}

      {result ? (
        <Card className="border-success/30 bg-success/5">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-1 h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-semibold text-success">
                Case created successfully.
              </p>
              <p className="text-xs text-success/80">
                Limitation:{" "}
                {result.limitationDate
                  ? new Date(result.limitationDate).toLocaleDateString("en-GB")
                  : "Not calculated"}
              </p>
              {result.limitationReason ? (
                <p className="mt-1 text-xs text-success/60">{result.limitationReason}</p>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={handlePrev} disabled={step === 0 || isSubmitting}>
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={handleNext} disabled={!canContinue || isSubmitting}>
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </span>
            ) : (
              "Create case"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps = ["Basics", "Injury & work", "Review"];
  return (
    <div className="flex items-center gap-4">
      {steps.map((label, index) => {
        const isActive = index === step;
        const isComplete = index < step;
        return (
          <div key={label} className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : isComplete
                    ? "border-success bg-success/10 text-success"
                    : "border-primary/20 text-accent/40",
              )}
            >
              {index + 1}
            </div>
            <span
              className={clsx(
                "text-sm font-medium",
                isActive ? "text-primary" : isComplete ? "text-success" : "text-accent/50",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: "text" | "date" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-accent">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-accent/50">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-accent">
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-accent/50">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-2 text-sm text-accent">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/50">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-3">
      <p className="text-xs uppercase tracking-wide text-accent/40">{label}</p>
      <p className="mt-1 text-sm text-accent/80">{value}</p>
    </div>
  );
}

function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

