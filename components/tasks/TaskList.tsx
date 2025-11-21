"use client";

import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types";

async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to load tasks");
  }
  return (await response.json()) as { tasks: Task[] };
}

export function TaskList() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher, {
    refreshInterval: 60_000,
  });

  const tasks = data?.tasks ?? [];

  const markComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    void mutate();
  };

  if (isLoading) {
    return <p className="text-sm text-accent/60">Loading tasks…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-danger">
        {error instanceof Error ? error.message : "Unable to load tasks."}
      </p>
    );
  }

  if (!tasks.length) {
    return (
      <p className="text-sm text-accent/60">
        No automation tasks scheduled. Create a deadline or run a briefing to enqueue one.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">{task.title}</p>
              {task.description ? (
                <p className="mt-1 text-xs text-accent/60">{task.description}</p>
              ) : null}
              {task.due_at ? (
                <p className="mt-1 text-xs text-accent/40">
                  Due {new Date(task.due_at).toLocaleString("en-GB")}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-primary">
                <Link
                  href={`/api/tasks/${task.id}/calendar`}
                  className="rounded-full border border-primary/30 px-3 py-1 transition hover:bg-primary/10"
                >
                  Download calendar invite
                </Link>
              </div>
            </div>
            {task.status !== "completed" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markComplete(task.id)}
              >
                Mark complete
              </Button>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wide text-success">
                Completed
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

