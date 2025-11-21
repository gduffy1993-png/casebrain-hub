"use client";

import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type PlaybookItem = {
  id: string;
  name: string;
  description?: string;
  builtin?: boolean;
  steps: unknown;
};

type ApiResponse = {
  builtin: PlaybookItem[];
  custom: PlaybookItem[];
};

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load playbooks");
  }
  return res.json();
};

type CaseOption = { id: string; title: string };

export function PlaybookLauncher({ cases }: { cases: CaseOption[] }) {
  const { data, error } = useSWR("/api/playbooks", fetcher);
  const pushToast = useToast((state) => state.push);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string>(
    cases[0]?.id ?? "",
  );

  const caseId = selectedCase;

  const runPlaybook = async (playbookId: string) => {
    setRunningId(playbookId);
    try {
      const res = await fetch("/api/playbooks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbookId, caseId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to run playbook");
      }
      pushToast("Playbook executed.");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to run playbook");
    } finally {
      setRunningId(null);
    }
  };

  if (error) {
    return <p className="text-sm text-danger">Unable to load playbooks.</p>;
  }

  if (!data) {
    return <p className="text-sm text-accent/60">Loading playbooks…</p>;
  }

  const all = [...data.builtin, ...data.custom];

  return (
    <div className="space-y-4">
      {cases.length ? (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-accent/40">
            Target case
          </label>
          <select
            value={caseId}
            onChange={(event) => setSelectedCase(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-accent/60">
          No cases available. Create a case to run playbooks.
        </p>
      )}

      <ul className="space-y-3">
        {all.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-accent">
                  {item.name} {item.builtin ? "(Built-in)" : ""}
                </p>
                <p className="text-xs text-accent/50">{item.description}</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => runPlaybook(item.id)}
                disabled={!!runningId || !caseId}
              >
                {runningId === item.id ? "Running…" : "Run playbook"}
              </Button>
            </div>
          </li>
        ))}
        {!all.length && (
          <li className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4 text-sm text-accent/60">
            No playbooks defined yet.
          </li>
        )}
      </ul>
    </div>
  );
}

