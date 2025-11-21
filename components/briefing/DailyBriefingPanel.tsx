"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type BriefingResponse = {
  summary?: string;
  actions?: string[];
  generatedAt?: string;
  briefingText?: string;
};

function parseBriefingText(briefingText: string): { summary: string; actions: string[] } {
  const normalized = briefingText.replace(/\r\n/g, "\n").trim();

  if (!normalized.length) {
    return { summary: "", actions: [] };
  }

  const actionsHeader = normalized.match(/(?:^|\n)\s*(Actions?|Action Items?|Next Steps?):/i);
  let summarySection = normalized;
  let actions: string[] = [];

  if (actionsHeader && typeof actionsHeader.index === "number") {
    const headerIndex = actionsHeader.index;
    const headerLength = actionsHeader[0].length;
    summarySection = normalized.slice(0, headerIndex).trim();
    const actionsBlock = normalized.slice(headerIndex + headerLength).trim();

    actions = actionsBlock
      .split("\n")
      .map((line) => line.trim().replace(/^[-•*()\d.\s]+/, ""))
      .filter(Boolean);
  }

  const summary = summarySection.replace(/^Summary:\s*/i, "").trim();

  return { summary, actions };
}

export function DailyBriefingPanel() {
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pushToast = useToast((state) => state.push);

  const fetchBriefing = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/briefing", { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to generate briefing");
      }

      const payload = (await response.json()) as BriefingResponse;
      setBriefing({
        ...payload,
        generatedAt: payload.generatedAt ?? new Date().toISOString(),
      });
      pushToast("Daily briefing refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to generate briefing";
      pushToast(message);
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchBriefing();
  }, [fetchBriefing]);

  const derived = useMemo(() => {
    return parseBriefingText(briefing?.briefingText ?? "");
  }, [briefing?.briefingText]);

  const summaryText = briefing?.summary ?? derived.summary ?? "";
  const actions = briefing?.actions ?? derived.actions ?? [];

  const summaryParagraphs = summaryText
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const generatedAt = briefing?.generatedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-accent">Today&apos;s Brief</h2>
          <p className="text-sm text-accent/60">
            Snapshot of new documents, letters, and approaching deadlines.
          </p>
        </div>
        <Button onClick={fetchBriefing} disabled={isLoading} variant="secondary">
          {isLoading ? "Generating…" : "Refresh briefing"}
        </Button>
      </div>

      {briefing ? (
        <div className="space-y-6">
          <div className="space-y-3 rounded-3xl border border-primary/10 bg-surface-muted/70 p-6">
            {summaryParagraphs.length ? (
              summaryParagraphs.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-accent/80">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-accent/60">
                No summary provided.
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-accent">Priority actions</h3>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-accent/70">
              {actions.length ? (
                actions.map((action, index) => <li key={index}>{action}</li>)
              ) : (
                <li>No immediate actions surfaced.</li>
              )}
            </ul>
          </div>
          {generatedAt ? (
            <p className="text-xs text-accent/50">
              Generated at {new Date(generatedAt).toLocaleTimeString("en-GB")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-accent/60">
          Briefing will appear here once generated.
        </p>
      )}
    </div>
  );
}

