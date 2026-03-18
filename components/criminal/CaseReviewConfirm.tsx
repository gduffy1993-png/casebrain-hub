"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getStanceOptionsForOffenceCode,
  getStrategyPreviewLabel,
  REVIEW_STAGE_OPTIONS,
  STRATEGY_OVERRIDE_OPTIONS,
} from "@/lib/criminal/review-confirm-ui";
import type { PrimaryStrategyType } from "@/lib/criminal/phase1-detection";
import { Loader2, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  caseId: string;
  onConfirmed: () => void;
};

export function CaseReviewConfirm({ caseId, onConfirmed }: Props) {
  const [bootLoading, setBootLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offenceCode, setOffenceCode] = useState("");
  const [offenceLabel, setOffenceLabel] = useState("");
  const [stance, setStance] = useState("");
  const [stage, setStage] = useState("");
  const [defencePlanText, setDefencePlanText] = useState("");
  const [strategyOverride, setStrategyOverride] = useState<PrimaryStrategyType | "">("");
  const [showOffenceEdit, setShowOffenceEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setError(null);
      try {
        await fetch(`/api/criminal/${caseId}/phase1-detect`, {
          method: "POST",
          credentials: "include",
        });
        const res = await fetch(`/api/criminal/${caseId}/phase1-detect`, { credentials: "include" });
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) throw new Error(json.error || "Load failed");
        const d = json.data;
        setOffenceCode(d.offenceCode || "unknown");
        setOffenceLabel(d.offenceLabel || "Unknown offence — set below");
        setStance(d.stance || "Put to proof");
        setStage(d.stage || REVIEW_STAGE_OPTIONS[1]);
        if (d.defencePlanDraft) setDefencePlanText(d.defencePlanDraft);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load detection");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const stanceOptions = useMemo(() => getStanceOptionsForOffenceCode(offenceCode), [offenceCode]);
  useEffect(() => {
    if (stance && !stanceOptions.includes(stance)) {
      /* keep custom stance in UI */
    } else if (stanceOptions.length && !stanceOptions.includes(stance)) {
      setStance(stanceOptions[0]);
    }
  }, [offenceCode, stanceOptions, stance]);

  const preview = useMemo(() => getStrategyPreviewLabel(stance), [stance]);
  const overrideLabel =
    strategyOverride && STRATEGY_OVERRIDE_OPTIONS.find((o) => o.value === strategyOverride)?.label;

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/review-confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offenceCode,
          offenceLabel,
          stance,
          stage,
          defencePlanText,
          ...(strategyOverride ? { primaryStrategy: strategyOverride } : {}),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Confirm failed");
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setSaving(false);
    }
  };

  if (bootLoading) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center gap-3 max-w-lg mx-auto mt-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analysing bundle for offence, stance, and stage…</p>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Review & confirm</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Check what we detected from the bundle and charge sheet. Edit anything that’s wrong, then confirm.
          Chat and Strategy will use this snapshot — Defence Plan text below is narrative only and does not
          override offence, stance, stage, or strategy.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Offence</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowOffenceEdit((v) => !v)}>
              {showOffenceEdit ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showOffenceEdit ? "Hide" : "Override"}
            </Button>
          </div>
          <p className="text-base font-medium mt-1">{offenceLabel}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{offenceCode}</p>
          {showOffenceEdit && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Code (e.g. s20_oapa)</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={offenceCode}
                  onChange={(e) => setOffenceCode(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={offenceLabel}
                  onChange={(e) => setOffenceLabel(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stance</h2>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={stanceOptions.includes(stance) ? stance : stanceOptions[0] || stance}
            onChange={(e) => setStance(e.target.value)}
          >
            {[...new Set([...stanceOptions, stance].filter(Boolean))].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stage</h2>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={REVIEW_STAGE_OPTIONS.includes(stage as (typeof REVIEW_STAGE_OPTIONS)[number]) ? stage : REVIEW_STAGE_OPTIONS[1]}
            onChange={(e) => setStage(e.target.value)}
          >
            {REVIEW_STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Strategy preview
          </h2>
          <p className="text-sm font-medium">{overrideLabel || preview}</p>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Override strategy (optional)</label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={strategyOverride}
              onChange={(e) => setStrategyOverride((e.target.value || "") as PrimaryStrategyType | "")}
            >
              <option value="">Use stance-based strategy</option>
              {STRATEGY_OVERRIDE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Defence plan (narrative)
          </h2>
          <textarea
            className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Optional: how you’re running the case in your own words. Does not override the fields above."
            value={defencePlanText}
            onChange={(e) => setDefencePlanText(e.target.value)}
          />
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full gap-2"
          disabled={saving || !offenceCode || !offenceLabel || !stance || !stage}
          onClick={handleConfirm}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Confirm & start strategy
        </Button>
      </Card>
    </div>
  );
}
