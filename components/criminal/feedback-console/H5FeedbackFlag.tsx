"use client";

import { useState } from "react";
import { CheckCircle2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { useTrustFeedbackPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { buildH5FeedbackInput } from "@/lib/criminal/feedback-console/build-h5-feedback-input";
import { H5_FEEDBACK_KINDS, type H5FeedbackKind } from "@/lib/criminal/feedback-console/types";
import { saveTrustFeedback } from "@/lib/criminal/trust/feedback/trust-feedback-storage";
import {
  TRUST_FEEDBACK_NOTE_MAX_CHARS,
  type TrustFeedbackTab,
} from "@/lib/criminal/trust/feedback/trust-feedback-types";

export type H5FeedbackFlagProps = {
  caseId: string;
  surface: TrustFeedbackTab;
  section?: string | null;
  lineSnippet?: string | null;
  sourceState?: SourceStateKind | null;
  sendability?: SendabilityLevel | null;
  exportId?: string | null;
  exportType?: string | null;
  outputVersion?: string | null;
};

export function H5FeedbackFlag({
  caseId,
  surface,
  section,
  lineSnippet,
  sourceState,
  sendability,
  exportId,
  exportType,
  outputVersion,
}: H5FeedbackFlagProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<H5FeedbackKind | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const persistenceEnabled = useTrustFeedbackPersistenceEnabled();

  const onSubmit = async () => {
    if (!selected) {
      setError("Select a feedback type.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const input = buildH5FeedbackInput({
        caseId,
        surface,
        section,
        feedbackKind: selected,
        lineSnippet,
        sourceState,
        sendability,
        note: note.trim() || null,
        exportId,
        exportType,
        outputVersion,
      });
      await saveTrustFeedback(input, { persistenceEnabled });
      setSaved(true);
      setNote("");
      setSelected(null);
      setOpen(false);
    } catch {
      setError("Could not save — check note for disallowed content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative shrink-0" data-testid={`h5-feedback-flag-${surface}`}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-300"
        aria-expanded={open}
        aria-label="Flag output feedback"
        onClick={() => {
          setOpen((v) => !v);
          setSaved(false);
        }}
      >
        {saved ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Flag className="h-3.5 w-3.5" />
        )}
        <span className="ml-1 hidden sm:inline">Flag</span>
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-md border border-slate-700/80 bg-slate-950 shadow-xl p-2.5 space-y-2">
          <p className="text-[10px] text-slate-500">
            Product review only — does not change live output.
          </p>
          <div className="flex flex-wrap gap-1">
            {H5_FEEDBACK_KINDS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={selected === opt.value ? "primary" : "outline"}
                className="h-7 text-[10px] px-2"
                onClick={() => setSelected(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, TRUST_FEEDBACK_NOTE_MAX_CHARS))}
            rows={2}
            placeholder="Optional short note"
            className="w-full rounded border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-200 resize-y min-h-[2rem]"
          />
          {error ? <p className="text-[10px] text-red-400">{error}</p> : null}
          <Button
            type="button"
            size="sm"
            className="h-7 text-[11px] w-full"
            disabled={!selected || saving}
            onClick={() => void onSubmit()}
          >
            {saving ? "Saving…" : "Submit feedback"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
