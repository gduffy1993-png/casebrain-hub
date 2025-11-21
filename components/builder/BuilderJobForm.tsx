"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export function BuilderJobForm() {
  const [prompt, setPrompt] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pushToast = useToast((state) => state.push);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!prompt.trim()) {
      pushToast("Enter a prompt before enqueuing a job.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/builder/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, requiresApproval }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to enqueue job");
      }

      pushToast("Builder job queued.");
      setPrompt("");
      setRequiresApproval(false);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Unable to enqueue job",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the coding or automation task you want CaseBrain Builder to run."
          rows={5}
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-accent/70">
        <input
          type="checkbox"
          checked={requiresApproval}
          onChange={(event) => setRequiresApproval(event.target.checked)}
          className="h-4 w-4 border-primary/30 text-primary focus:ring-primary/30"
        />
        Requires approval before execution
      </label>

      <Button type="submit" disabled={isSubmitting} className="gap-2">
        {isSubmitting ? "Enqueuing…" : "Enqueue job"}
      </Button>
    </form>
  );
}

