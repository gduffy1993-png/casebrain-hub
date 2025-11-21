"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PiHearing } from "@/types";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";

type HearingFormState = {
  hearingType: string;
  date: string;
  location: string;
  notes: string;
};

const INITIAL_STATE: HearingFormState = {
  hearingType: "",
  date: "",
  location: "",
  notes: "",
};

export function PiHearingsPanel({
  caseId,
  hearings,
}: {
  caseId: string;
  hearings: PiHearing[];
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PiHearing | null>(null);
  const [formState, setFormState] = useState<HearingFormState>(INITIAL_STATE);

  const openCreate = () => {
    setEditing(null);
    setFormState(INITIAL_STATE);
    setFormOpen(true);
  };

  const openEdit = (hearing: PiHearing) => {
    setEditing(hearing);
    setFormState({
      hearingType: hearing.hearing_type ?? "",
      date: hearing.date ? hearing.date.slice(0, 16) : "",
      location: hearing.location ?? "",
      notes: hearing.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const payload = {
          hearingType: formState.hearingType || null,
          date: formState.date || null,
          location: formState.location || null,
          notes: formState.notes || null,
        };

        const response = await fetch(
          editing ? `/api/pi/hearings/${editing.id}` : `/api/pi/cases/${caseId}/hearings`,
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to save hearing.");
        }

        pushToast(editing ? "Hearing updated." : "Hearing scheduled.");
        setFormOpen(false);
        setEditing(null);
        setFormState(INITIAL_STATE);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save hearing.";
        pushToast(message);
      }
    });
  };

  const handleDelete = (hearingId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/hearings/${hearingId}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to delete hearing.");
        }
        pushToast("Hearing removed.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete hearing.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/10 bg-surface-muted/60 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-accent">Hearings</h3>
          <p className="text-xs text-accent/50">
            Track upcoming hearings and listings for this matter.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate} disabled={isPending}>
          Schedule hearing
        </Button>
      </div>

      {hearings.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {hearings.map((hearing) => (
            <li
              key={hearing.id}
              className="rounded-2xl border border-primary/10 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-accent">
                    {hearing.hearing_type ?? "Hearing"}
                  </p>
                  <p className="text-xs text-accent/50">
                    {hearing.date ? new Date(hearing.date).toLocaleString("en-GB") : "Date TBC"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(hearing)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(hearing.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-accent/60">
                Location: {hearing.location ?? "Not recorded"}
              </p>
              <p className="mt-1 text-xs text-accent/60">
                Notes: {hearing.notes ?? "No notes"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-accent/60">No hearings scheduled.</p>
      )}

      {formOpen ? (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm text-accent/70">
          <h4 className="text-sm font-semibold text-primary">
            {editing ? "Update hearing" : "Schedule hearing"}
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InputField
              label="Hearing type"
              value={formState.hearingType}
              onChange={(value) => setFormState((prev) => ({ ...prev, hearingType: value }))}
            />
            <InputField
              label="Date & time"
              type="datetime-local"
              value={formState.date}
              onChange={(value) => setFormState((prev) => ({ ...prev, date: value }))}
            />
            <InputField
              label="Location"
              value={formState.location}
              onChange={(value) => setFormState((prev) => ({ ...prev, location: value }))}
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
              {isPending ? "Saving…" : editing ? "Save changes" : "Schedule hearing"}
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
  type?: "text" | "datetime-local";
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


