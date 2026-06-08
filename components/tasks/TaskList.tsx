"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus } from "lucide-react";
import type { Task } from "@/types";

async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Failed to load tasks");
  }
  return (await response.json()) as { tasks: Task[] };
}

async function fetchMembers() {
  const response = await fetch("/api/team/members");
  if (!response.ok) return [];
  const data = await response.json();
  return data.members || [];
}

export function TaskList() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher, {
    refreshInterval: 60_000,
  });
  const { data: membersData } = useSWR("/api/team/members", fetchMembers);
  
  const tasks = data?.tasks ?? [];
  const members = membersData || [];
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const markComplete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    void mutate();
  };
  
  const assignTask = async (taskId: string, userId: string) => {
    setAssigningTaskId(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: userId }),
      });
      void mutate();
    } catch (error) {
      console.error("Failed to assign task:", error);
    } finally {
      setAssigningTaskId(null);
    }
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-accent">{task.title}</p>
                {(task as any).assigned_to && (
                  <Badge variant="outline" size="sm">
                    <User className="mr-1 h-3 w-3" />
                    Assigned
                  </Badge>
                )}
                {(task as any).priority && (task as any).priority !== "medium" && (
                  <Badge 
                    variant={(task as any).priority === "urgent" ? "danger" : (task as any).priority === "high" ? "warning" : "outline"} 
                    size="sm"
                  >
                    {(task as any).priority}
                  </Badge>
                )}
              </div>
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
                {members.length > 0 && (
                  <select
                    value={(task as any).assigned_to || ""}
                    onChange={(e) => assignTask(task.id, e.target.value)}
                    disabled={assigningTaskId === task.id}
                    className="rounded-full border border-primary/30 px-3 py-1 bg-transparent text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  >
                    <option value="">Assign to...</option>
                    {members.map((member: { id: string; email: string }) => (
                      <option key={member.id} value={member.id}>
                        {member.email}
                      </option>
                    ))}
                  </select>
                )}
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

