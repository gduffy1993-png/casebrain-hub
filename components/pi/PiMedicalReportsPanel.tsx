"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PiMedicalReport } from "@/types";
import { useToast } from "@/components/Toast";

type FormState = {
  expertName: string;
  specialism: string;
  reportType: string;
  instructionDate: string;
  reportDueDate: string;
  reportReceivedDate: string;
  notes: string;
};

const INITIAL_STATE: FormState = {
  expertName: "",
  specialism: "",
  reportType: "",
  instructionDate: "",
  reportDueDate: "",
  reportReceivedDate: "",
  notes: "",
};

export function PiMedicalReportsPanel({
  caseId,
  reports,
}: {
  caseId: string;
  reports: PiMedicalReport[];
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PiMedicalReport | null>(null);
  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  const sortedReports = useMemo(
    () =>
      [...reports].sort((a, b) => {
        if (!a.report_due_date) return 1;
        if (!b.report_due_date) return -1;
        return new Date(a.report_due_date).getTime() - new Date(b.report_due_date).getTime();
      }),
    [reports],
  );

  const openCreate = () => {
    setEditing(null);
    setFormState(INITIAL_STATE);
    setFormOpen(true);
  };

  const openEdit = (report: PiMedicalReport) => {
    setEditing(report);
    setFormState({
      expertName: report.expert_name ?? "",
      specialism: report.specialism ?? "",
      reportType: report.report_type ?? "",
      instructionDate: report.instruction_date ?? "",
      reportDueDate: report.report_due_date ?? "",
      reportReceivedDate: report.report_received_date ?? "",
      notes: report.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const payload = {
          expertName: formState.expertName || null,
          specialism: formState.specialism || null,
          reportType: formState.reportType || null,
          instructionDate: formState.instructionDate || null,
          reportDueDate: formState.reportDueDate || null,
          reportReceivedDate: formState.reportReceivedDate || null,
          notes: formState.notes || null,
        };

        const response = await fetch(
          editing
            ? `/api/pi/medical-reports/${editing.id}`
            : `/api/pi/cases/${caseId}/medical-reports`,
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to save medical report.");
        }

        pushToast(editing ? "Medical report updated." : "Medical report added.");
        setFormOpen(false);
        setEditing(null);
        setFormState(INITIAL_STATE);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save medical report.";
        pushToast(message);
      }
    });
  };

  const handleDelete = (reportId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/medical-reports/${reportId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to delete medical report.");
        }
        pushToast("Medical report removed.");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to delete medical report.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/10 bg-surface-muted/60 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-accent">Medical reports</h3>
          <p className="text-xs text-accent/50">
            Track expert instructions and report receipt. Overdue reports will appear in risk radar.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate} disabled={isPending}>
          Add report
        </Button>
      </div>

      {sortedReports.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {sortedReports.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-primary/10 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-accent">
                    {report.expert_name ?? "Unnamed expert"}
                  </p>
                  <p className="text-xs text-accent/50">
                    {report.specialism ?? "Specialism not recorded"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(report)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(report.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-accent/60 sm:grid-cols-3">
                <Field label="Report type" value={report.report_type ?? "Not set"} />
                <Field label="Instruction date" value={formatDate(report.instruction_date)} />
                <Field label="Report due" value={formatDate(report.report_due_date)} />
                <Field label="Received" value={formatDate(report.report_received_date)} />
                <Field
                  label="Notes"
                  value={report.notes ?? "No additional notes"}
                  className="sm:col-span-3"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-accent/60">No medical reports recorded yet.</p>
      )}

      {formOpen ? (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-sm font-semibold text-primary">
            {editing ? "Update medical report" : "Add medical report"}
          </h4>
          <div className="mt-3 grid gap-3 text-sm text-accent/70 sm:grid-cols-2">
            <InputField
              label="Expert name"
              value={formState.expertName}
              onChange={(value) => setFormState((prev) => ({ ...prev, expertName: value }))}
            />
            <InputField
              label="Specialism"
              value={formState.specialism}
              onChange={(value) => setFormState((prev) => ({ ...prev, specialism: value }))}
            />
            <InputField
              label="Report type"
              value={formState.reportType}
              onChange={(value) => setFormState((prev) => ({ ...prev, reportType: value }))}
            />
            <InputField
              label="Instruction date"
              type="date"
              value={formState.instructionDate}
              onChange={(value) => setFormState((prev) => ({ ...prev, instructionDate: value }))}
            />
            <InputField
              label="Report due date"
              type="date"
              value={formState.reportDueDate}
              onChange={(value) => setFormState((prev) => ({ ...prev, reportDueDate: value }))}
            />
            <InputField
              label="Report received"
              type="date"
              value={formState.reportReceivedDate}
              onChange={(value) => setFormState((prev) => ({ ...prev, reportReceivedDate: value }))}
            />
            <TextareaField
              label="Notes"
              value={formState.notes}
              onChange={(value) => setFormState((prev) => ({ ...prev, notes: value }))}
              className="sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                setFormState(INITIAL_STATE);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "Saving…" : editing ? "Save changes" : "Add report"}
            </Button>
          </div>
        </div>
      ) : null}
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
      <p className="text-[11px] uppercase tracking-wide text-accent/40">{label}</p>
      <p className="mt-1 text-xs text-accent/70">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
      <input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className ? `${className} space-y-2` : "space-y-2"}>
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
      <textarea
        value={value}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB");
}


