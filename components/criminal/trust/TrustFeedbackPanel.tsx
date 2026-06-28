"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { useTrustFeedbackPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { saveTrustFeedback } from "@/lib/criminal/trust/feedback/trust-feedback-storage";
import {
  TRUST_FEEDBACK_KINDS,
  TRUST_FEEDBACK_NOTE_MAX_CHARS,
  type TrustFeedbackKind,
  type TrustFeedbackTab,
} from "@/lib/criminal/trust/feedback/trust-feedback-types";
import { workflowMuted, workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

export type TrustFeedbackContext = {
  lineSnippet?: string | null;
  contextLabel?: string | null;
  sourceState?: SourceStateKind | null;
  sendability?: SendabilityLevel | null;
};

export type TrustFeedbackPanelProps = {
  caseId: string;
  tab: TrustFeedbackTab;
  defaultContext?: TrustFeedbackContext;
  /** Pilot tabs use dark cards; optional light variant for non-pilot embeds. */
  variant?: "pilot" | "light";
};

export function TrustFeedbackPanel({
  caseId,
  tab,
  defaultContext,
  variant = "pilot",
}: TrustFeedbackPanelProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TrustFeedbackKind | null>(null);
  const [lineSnippet, setLineSnippet] = useState(defaultContext?.lineSnippet ?? "");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistenceEnabled = useTrustFeedbackPersistenceEnabled();

  useEffect(() => {
    setLineSnippet(defaultContext?.lineSnippet ?? "");
  }, [defaultContext?.lineSnippet, defaultContext?.contextLabel]);

  const cardClass = variant === "pilot" ? workflowPilotCard : "rounded-lg border border-slate-200 bg-white";

  const onSubmit = async () => {
    if (!selected) {
      setError("Select a feedback type.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveTrustFeedback(
        {
          caseId,
          tab,
          feedbackKind: selected,
          lineSnippet: lineSnippet.trim() || null,
          contextLabel: defaultContext?.contextLabel ?? null,
          sourceState: defaultContext?.sourceState ?? null,
          sendability: defaultContext?.sendability ?? null,
          note: note.trim() || null,
        },
        { persistenceEnabled },
      );
      setSaved(true);
      setNote("");
      setSelected(null);
    } catch {
      setError("Could not save feedback — check note for disallowed content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={`${cardClass} overflow-hidden`}
      aria-label="Mark output feedback"
      data-testid={`trust-feedback-${tab}`}
    >
      <button
        type="button"
        className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left ${
          variant === "pilot" ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquarePlus className={`h-4 w-4 shrink-0 ${variant === "pilot" ? "text-slate-400" : "text-slate-600"}`} />
          <div className="min-w-0">
            <p className={`text-sm font-medium ${variant === "pilot" ? "text-slate-200" : "text-slate-900"}`}>
              Mark this output
            </p>
            <p className={`text-[11px] ${workflowMuted}`}>
              Wrong, unclear, unsafe, or useful — for product review only; does not change live output.
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open ? (
        <div className={`border-t px-4 py-3 space-y-3 ${variant === "pilot" ? "border-slate-700/60" : "border-slate-100"}`}>
          {saved ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Feedback saved for review
            </p>
          ) : null}

          {defaultContext?.contextLabel ? (
            <p className={`text-[11px] ${workflowMuted}`}>
              Section: <span className="text-slate-400">{defaultContext.contextLabel}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {TRUST_FEEDBACK_KINDS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={selected === opt.value ? "primary" : "outline"}
                className="h-8 text-[11px] px-2.5 whitespace-normal text-left max-w-full"
                onClick={() => {
                  setSelected(opt.value);
                  setSaved(false);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div>
            <label htmlFor={`${tab}-trust-feedback-snippet`} className={workflowSectionTitle}>
              Line or section (optional, short)
            </label>
            <input
              id={`${tab}-trust-feedback-snippet`}
              type="text"
              value={lineSnippet}
              onChange={(e) => setLineSnippet(e.target.value.slice(0, 280))}
              placeholder="Which line or section — not full case papers"
              className={`mt-1 w-full rounded-md border px-2.5 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
                variant === "pilot"
                  ? "border-slate-600 bg-slate-900/60 text-slate-200"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            />
          </div>

          <div>
            <label htmlFor={`${tab}-trust-feedback-note`} className={workflowSectionTitle}>
              Optional note (short)
            </label>
            <textarea
              id={`${tab}-trust-feedback-note`}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, TRUST_FEEDBACK_NOTE_MAX_CHARS))}
              rows={2}
              placeholder="Brief note for product review — not case papers"
              className={`mt-1 w-full rounded-md border px-2.5 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y min-h-[2.5rem] ${
                variant === "pilot"
                  ? "border-slate-600 bg-slate-900/60 text-slate-200"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            />
          </div>

          {error ? <p className="text-[11px] text-red-400">{error}</p> : null}

          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => void onSubmit()}
            disabled={!selected || saving}
          >
            {saving ? "Saving…" : "Save feedback"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
