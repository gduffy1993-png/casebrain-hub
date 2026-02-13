"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Gavel } from "lucide-react";

type PleaRecordCardProps = { caseId: string };

const PLEA_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "no_plea", label: "No plea yet" },
  { value: "not_guilty", label: "Not guilty" },
  { value: "guilty", label: "Guilty" },
];

export function PleaRecordCard({ caseId }: PleaRecordCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plea, setPlea] = useState<string | null>(null);
  const [pleaDate, setPleaDate] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPlea(data.plea ?? null);
          setPleaDate(data.pleaDate ?? null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/matter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plea: plea || undefined, pleaDate: pleaDate || undefined }),
      });
      if (res.ok) setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading plea record…
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <Gavel className="h-4 w-4" />
        Plea record
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Record plea (per case). Link to Strategy and irreversible decisions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Plea</label>
          <select
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            value={plea ?? ""}
            onChange={(e) => { setPlea(e.target.value || null); setDirty(true); }}
          >
            {PLEA_OPTIONS.map((o) => (
              <option key={o.value || "x"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Date (when entered)</label>
          <input
            type="date"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            value={pleaDate ? String(pleaDate).slice(0, 10) : ""}
            onChange={(e) => { setPleaDate(e.target.value ? new Date(e.target.value).toISOString() : null); setDirty(true); }}
          />
        </div>
      </div>
      {dirty && (
        <Button size="sm" className="mt-3" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
        </Button>
      )}
    </Card>
  );
}
