"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PiDisbursement } from "@/types";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DisbursementFormState = {
  category: string;
  amount: string;
  incurredDate: string;
  paid: boolean;
  notes: string;
};

const INITIAL_STATE: DisbursementFormState = {
  category: "",
  amount: "",
  incurredDate: "",
  paid: false,
  notes: "",
};

export function PiDisbursementsPanel({
  caseId,
  disbursements,
}: {
  caseId: string;
  disbursements: PiDisbursement[];
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PiDisbursement | null>(null);
  const [formState, setFormState] = useState<DisbursementFormState>(INITIAL_STATE);

  const total = useMemo(
    () =>
      disbursements.reduce((sum, disbursement) => sum + (disbursement.amount ?? 0), 0),
    [disbursements],
  );

  const openCreate = () => {
    setEditing(null);
    setFormState(INITIAL_STATE);
    setFormOpen(true);
  };

  const openEdit = (entry: PiDisbursement) => {
    setEditing(entry);
    setFormState({
      category: entry.category ?? "",
      amount: String(entry.amount ?? ""),
      incurredDate: entry.incurred_date ?? "",
      paid: entry.paid ?? false,
      notes: entry.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!formState.amount || Number.isNaN(Number(formState.amount))) {
      pushToast("Enter a valid amount.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          category: formState.category || null,
          amount: Number(formState.amount),
          incurredDate: formState.incurredDate || null,
          paid: formState.paid,
          notes: formState.notes || null,
        };

        const response = await fetch(
          editing
            ? `/api/pi/disbursements/${editing.id}`
            : `/api/pi/cases/${caseId}/disbursements`,
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to save disbursement.");
        }

        pushToast(editing ? "Disbursement updated." : "Disbursement added.");
        setFormOpen(false);
        setEditing(null);
        setFormState(INITIAL_STATE);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save disbursement.";
        pushToast(message);
      }
    });
  };

  const handleDelete = (disbursementId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/disbursements/${disbursementId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to delete disbursement.");
        }
        pushToast("Disbursement removed.");
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to delete disbursement.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/10 bg-white/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-accent">Disbursements</h3>
          <p className="text-xs text-accent/50">
            Track disbursements incurred on this matter for valuation and recovery.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate} disabled={isPending}>
          Add disbursement
        </Button>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3 text-xs text-primary">
        Total recorded disbursements: £{total.toLocaleString("en-GB")}
      </div>

      {disbursements.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {disbursements
            .sort((a, b) => {
              if (!a.incurred_date) return 1;
              if (!b.incurred_date) return -1;
              return new Date(b.incurred_date).getTime() - new Date(a.incurred_date).getTime();
            })
            .map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-accent">
                      {entry.category ?? "Disbursement"}
                    </p>
                    <p className="text-xs text-accent/50">
                      {entry.incurred_date
                        ? `Incurred ${formatDate(entry.incurred_date)}`
                        : "Date not recorded"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.paid ? "success" : "warning"}>
                      {entry.paid ? "Paid" : "Unpaid"}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary">
                      £{Number(entry.amount ?? 0).toLocaleString("en-GB")}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-accent/60">
                  Notes: {entry.notes ?? "No notes"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(entry)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(entry.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-accent/60">No disbursements recorded.</p>
      )}

      {formOpen ? (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm text-accent/70">
          <h4 className="text-sm font-semibold text-primary">
            {editing ? "Update disbursement" : "Add disbursement"}
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InputField
              label="Category"
              value={formState.category}
              onChange={(value) => setFormState((prev) => ({ ...prev, category: value }))}
            />
            <InputField
              label="Amount (£)"
              type="number"
              value={formState.amount}
              onChange={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
            />
            <InputField
              label="Incurred date"
              type="date"
              value={formState.incurredDate}
              onChange={(value) => setFormState((prev) => ({ ...prev, incurredDate: value }))}
            />
            <label className="flex flex-col justify-end gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
                Paid?
              </span>
              <select
                value={String(formState.paid)}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, paid: event.target.value === "true" }))
                }
                className="rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="false">Unpaid</option>
                <option value="true">Paid</option>
              </select>
            </label>
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
              {isPending ? "Saving…" : editing ? "Save changes" : "Add disbursement"}
            </Button>
          </div>
        </div>
      ) : null}
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
  type?: "text" | "number" | "date";
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">{label}</span>
      <input
        type={type}
        value={value}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">{label}</span>
      <textarea
        rows={3}
        value={value}
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


