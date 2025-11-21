"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LetterTemplate } from "@/types";
import { useToast } from "@/components/Toast";

type LetterGeneratorProps = {
  caseId: string;
  templates: Array<{ id: string; name: string; body_template: string; practice_area?: string | null }>;
  practiceArea?: string;
};

export function LetterGenerator({ caseId, templates }: LetterGeneratorProps) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [actingFor, setActingFor] = useState<"claimant" | "defendant">(
    "claimant",
  );
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    body: string;
    reasoning: string;
    risks: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useToast((state) => state.push);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!templateId) {
      setError("Select a template to generate a letter.");
      return;
    }
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, templateId, notes, actingFor }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to generate letter");
      }
      const payload = await response.json();
      setResult({
        body: payload.body,
        reasoning: payload.reasoning,
        risks: payload.risks,
      });
      pushToast("Letter draft generated. Review before sending.");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate letter",
      );
      pushToast(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate letter",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
            Template
          </label>
          <select
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
            Acting for
          </label>
          <select
            value={actingFor}
            onChange={(event) =>
              setActingFor(event.target.value as "claimant" | "defendant")
            }
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="claimant">Claimant</option>
            <option value="defendant">Defendant</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Notes to incorporate
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Include facts, tone, or CPR references required."
          rows={5}
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isGenerating} className="gap-2">
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating draft…
          </>
        ) : (
          "Generate letter"
        )}
      </Button>

      {result && (
        <div className="space-y-4 rounded-3xl border border-primary/20 bg-surface-muted/70 p-6">
          <header className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-accent">
                AI Draft — review required
              </h2>
              <p className="text-xs text-accent/60">
                Double-check before sending. All changes are versioned.
              </p>
            </div>
          </header>
          <article className="space-y-4 rounded-2xl bg-white p-6 text-sm leading-relaxed text-accent/80 shadow-inner">
            {result.body.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
          <section className="space-y-3 text-sm">
            <h3 className="font-semibold text-accent">Model reasoning</h3>
            <p className="text-accent/70">{result.reasoning}</p>
            <h3 className="pt-2 font-semibold text-accent">
              Risks / follow-up
            </h3>
            <ul className="list-disc space-y-1 pl-6 text-accent/70">
              {result.risks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </form>
  );
}

