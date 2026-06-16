"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { workflowCard, workflowSectionTitle } from "./workflowUi";
import { useToast } from "@/components/Toast";

type DeadlineRow = {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
};

export function PilotDeadlinesPanel({ caseId }: { caseId: string }) {
  const [rows, setRows] = useState<DeadlineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  const load = () => {
    fetch(`/api/cases/${caseId}/deadlines`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = (data.deadlines ?? []) as Array<{
          id: string;
          title: string;
          dueDate: string;
          status: string;
          priority: string;
        }>;
        setRows(
          list
            .slice(0, 12)
            .map((d) => ({
              id: d.id,
              title: d.title,
              dueDate: d.dueDate,
              status: d.status,
              priority: d.priority,
            })),
        );
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [caseId]);

  const add = () => {
    if (!title.trim() || !dueDate) {
      showToast("Title and due date required", "error");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/cases/${caseId}/deadlines`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dueDate: new Date(dueDate).toISOString(), category: "COURT" }),
      });
      if (res.ok) {
        showToast("Deadline added", "success");
        setTitle("");
        setDueDate("");
        load();
      } else {
        showToast("Failed to add deadline", "error");
      }
    });
  };

  return (
    <Card className={`${workflowCard} p-4 border-slate-200 bg-white`} data-testid="pilot-deadlines">
      <h3 className={workflowSectionTitle}>Deadlines this week</h3>
      <p className="text-xs text-slate-500 mb-3">Court directions and chase dates that could embarrass the file if missed.</p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : rows.length ? (
        <ul className="space-y-2 mb-4 text-sm">
          {rows.map((d) => (
            <li key={d.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="font-medium text-slate-800">{d.title}</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {new Date(d.dueDate).toLocaleDateString("en-GB")} · {d.status.replace(/_/g, " ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 mb-4">No deadlines yet — add court directions or chase dates below.</p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          placeholder="e.g. CPS to serve CCTV"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Button type="button" size="sm" onClick={add} disabled={pending}>
          Add
        </Button>
      </div>
    </Card>
  );
}
