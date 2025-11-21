"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Circle } from "lucide-react";
import type { Checklist } from "@/lib/core/checklists";

type ChecklistModalProps = {
  caseId: string;
  checklistType: string;
  onClose: () => void;
};

export function ChecklistModal({ caseId, checklistType, onClose }: ChecklistModalProps) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChecklist();
  }, [caseId, checklistType]);

  const fetchChecklist = async () => {
    try {
      if (checklistType === "limitation") {
        const response = await fetch(`/api/checklists/limitation/${caseId}`);
        if (!response.ok) throw new Error("Failed to load checklist");
        const data = await response.json();
        setChecklist(data);
      }
    } catch (error) {
      console.error("Failed to load checklist", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-2xl p-6">
          <p className="text-sm text-accent/60">Loading checklist...</p>
        </Card>
      </div>
    );
  }

  if (!checklist) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-accent">{checklist.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="space-y-3">
          {checklist.items.map((item) => {
            const isCompleted = completedItems.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-2xl border ${
                  isCompleted
                    ? "border-primary/20 bg-primary/5"
                    : "border-primary/10 bg-surface-muted/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="mt-0.5"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-accent/40" />
                  )}
                </button>
                <p
                  className={`text-sm flex-1 ${
                    isCompleted ? "text-accent/60 line-through" : "text-accent/80"
                  }`}
                >
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/5 p-3 text-xs text-accent/70">
          <p className="font-semibold text-warning">⚠️ Disclaimer</p>
          <p className="mt-1">{checklist.disclaimer}</p>
        </div>
      </Card>
    </div>
  );
}

