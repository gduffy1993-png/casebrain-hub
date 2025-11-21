"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PiOffer } from "@/types";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OfferFormState = {
  party: "claimant" | "defendant";
  amount: string;
  dateMade: string;
  deadlineToRespond: string;
  status: "open" | "accepted" | "rejected" | "lapsed";
  notes: string;
};

const INITIAL_STATE: OfferFormState = {
  party: "defendant",
  amount: "",
  dateMade: "",
  deadlineToRespond: "",
  status: "open",
  notes: "",
};

export function PiOffersPanel({
  caseId,
  offers,
}: {
  caseId: string;
  offers: PiOffer[];
}) {
  const router = useRouter();
  const pushToast = useToast((state) => state.push);
  const [editing, setEditing] = useState<PiOffer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<OfferFormState>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    setFormState(INITIAL_STATE);
  };

  const openEdit = (offer: PiOffer) => {
    setEditing(offer);
    setFormOpen(true);
    setFormState({
      party: offer.party,
      amount: String(offer.amount ?? ""),
      dateMade: offer.date_made ?? "",
      deadlineToRespond: offer.deadline_to_respond ?? "",
      status: offer.status,
      notes: offer.notes ?? "",
    });
  };

  const handleSubmit = () => {
    if (!formState.amount || Number.isNaN(Number(formState.amount))) {
      pushToast("Enter a valid offer amount.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          party: formState.party,
          amount: Number(formState.amount),
          dateMade: formState.dateMade,
          deadlineToRespond: formState.deadlineToRespond || null,
          status: formState.status,
          notes: formState.notes || null,
        };

        const response = await fetch(
          editing ? `/api/pi/offers/${editing.id}` : `/api/pi/cases/${caseId}/offers`,
          {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to save offer.");
        }

        pushToast(editing ? "Offer updated." : "Offer recorded.");
        setFormOpen(false);
        setEditing(null);
        setFormState(INITIAL_STATE);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save offer.";
        pushToast(message);
      }
    });
  };

  const handleDelete = (offerId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/pi/offers/${offerId}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to delete offer.");
        }
        pushToast("Offer removed.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete offer.";
        pushToast(message);
      }
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/10 bg-white/70 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-accent">Settlement offers</h3>
          <p className="text-xs text-accent/50">
            Track claimant / defendant offers and response deadlines.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate} disabled={isPending}>
          Record offer
        </Button>
      </div>

      {offers.length ? (
        <ul className="space-y-3 text-sm text-accent/70">
          {offers
            .sort((a, b) => {
              if (!a.date_made) return 1;
              if (!b.date_made) return -1;
              return new Date(b.date_made).getTime() - new Date(a.date_made).getTime();
            })
            .map((offer) => (
              <li
                key={offer.id}
                className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-accent">
                      {offer.party === "claimant" ? "Claimant offer" : "Defendant offer"}
                    </p>
                    <p className="text-xs text-accent/50">
                      Made {offer.date_made ? formatDate(offer.date_made) : "unknown"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary">
                      £{Number(offer.amount ?? 0).toLocaleString("en-GB")}
                    </Badge>
                    <Badge variant="default">{offer.status}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-accent/60 sm:grid-cols-2">
                  <Field
                    label="Respond by"
                    value={offer.deadline_to_respond ? formatDate(offer.deadline_to_respond) : "—"}
                  />
                  <Field label="Notes" value={offer.notes ?? "No notes"} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(offer)}
                    disabled={isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(offer.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-accent/60">No settlement offers recorded.</p>
      )}

      {formOpen ? (
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm text-accent/70">
          <h4 className="text-sm font-semibold text-primary">
            {editing ? "Update offer" : "Record new offer"}
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
                Party
              </span>
              <select
                value={formState.party}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    party: event.target.value as OfferFormState["party"],
                  }))
                }
                className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="defendant">Defendant</option>
                <option value="claimant">Claimant</option>
              </select>
            </label>
            <InputField
              label="Offer amount (£)"
              type="number"
              value={formState.amount}
              onChange={(value) => setFormState((prev) => ({ ...prev, amount: value }))}
            />
            <InputField
              label="Date made"
              type="date"
              value={formState.dateMade}
              onChange={(value) => setFormState((prev) => ({ ...prev, dateMade: value }))}
            />
            <InputField
              label="Deadline to respond"
              type="date"
              value={formState.deadlineToRespond}
              onChange={(value) =>
                setFormState((prev) => ({ ...prev, deadlineToRespond: value }))
              }
            />
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
                Status
              </span>
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    status: event.target.value as OfferFormState["status"],
                  }))
                }
                className="w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="open">Open</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="lapsed">Lapsed</option>
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
              {isPending ? "Saving…" : editing ? "Save changes" : "Record offer"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-[11px] uppercase tracking-wide text-accent/40">{label}: </span>
      <span className="text-xs text-accent/70">{value}</span>
    </p>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: "text" | "date" | "number";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
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
      <span className="text-xs font-semibold uppercase tracking-wide text-accent/40">
        {label}
      </span>
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
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB");
}


