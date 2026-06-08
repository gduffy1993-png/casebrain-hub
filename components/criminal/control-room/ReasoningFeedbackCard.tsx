"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { useReasoningFeedbackPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { shouldShowReasoningFeedback } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-flag";
import { saveReasoningFeedback } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-storage";
import {
  REASONING_FEEDBACK_NOTE_MAX_CHARS,
  REASONING_FEEDBACK_OPTIONS,
  type ReasoningFeedbackOption,
  type ReasoningFeedbackSurface,
} from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-types";

export type ReasoningFeedbackCardProps = {
  caseId: string;
  surface: ReasoningFeedbackSurface;
  routeLabel: string | null;
  humanReviewRequired: boolean;
  reasoningV2Enabled: boolean;
};

export function ReasoningFeedbackCard({
  caseId,
  surface,
  routeLabel,
  humanReviewRequired,
  reasoningV2Enabled,
}: ReasoningFeedbackCardProps) {
  const [selected, setSelected] = useState<ReasoningFeedbackOption | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistenceEnabled = useReasoningFeedbackPersistenceEnabled();

  if (!shouldShowReasoningFeedback(reasoningV2Enabled)) return null;

  const onSubmit = async () => {
    if (!selected) {
      setError("Select a feedback option.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveReasoningFeedback(
        {
          caseId,
          surface,
          feedbackOption: selected,
          note: note.trim() || null,
          routeLabel,
          humanReviewRequired,
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
      className={`${workflowCard} border-slate-200/80 mt-3`}
      aria-label="Mark reasoning feedback"
      data-testid={`reasoning-feedback-${surface}`}
    >
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-slate-600 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900">Mark this reasoning</h3>
          <p className={`text-[11px] ${workflowMuted}`}>
            Mark whether this source-backed reasoning is useful for solicitor review — not legal advice.
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 min-w-0">
        {saved ? (
          <p className="text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Feedback saved for review
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {REASONING_FEEDBACK_OPTIONS.map((opt) => (
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
          <label htmlFor={`${surface}-feedback-note`} className={workflowSectionTitle}>
            Optional note (short)
          </label>
          <textarea
            id={`${surface}-feedback-note`}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, REASONING_FEEDBACK_NOTE_MAX_CHARS))}
            rows={2}
            placeholder="Brief note for product review — not case papers"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y min-h-[2.5rem]"
          />
        </div>

        {error ? <p className="text-[11px] text-red-700">{error}</p> : null}

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
    </section>
  );
}
