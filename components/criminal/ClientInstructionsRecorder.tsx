"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Save, Copy } from "lucide-react";
import { useToast } from "@/components/Toast";

type ClientInstructionsRecord = {
  id: string;
  summary: string;
  authorityToAct: string;
  keyDecisions: string;
  recordedAt: string;
  createdAt: string;
};

type ClientInstructionsRecorderProps = {
  caseId: string;
  /** Called after a record is saved so parent can update readiness gate */
  onSaved?: () => void;
};

export function ClientInstructionsRecorder({ caseId, onSaved }: ClientInstructionsRecorderProps) {
  const [record, setRecord] = useState<ClientInstructionsRecord | null>(null);
  const [summary, setSummary] = useState("");
  const [authorityToAct, setAuthorityToAct] = useState("");
  const [keyDecisions, setKeyDecisions] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { push: showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/client-instructions`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        const d = data.data as ClientInstructionsRecord | null;
        if (d) {
          setRecord(d);
          setSummary(d.summary);
          setAuthorityToAct(d.authorityToAct);
          setKeyDecisions(d.keyDecisions);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/criminal/${caseId}/client-instructions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary, authorityToAct, keyDecisions }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok && data?.data) {
          setRecord(data.data);
          showToast?.("Client instructions saved.", "success");
          onSaved?.();
        } else {
          showToast?.(data?.error || "Failed to save", "error");
        }
      } catch (e) {
        showToast?.("Failed to save client instructions", "error");
      }
    });
  };

  const exportText = [
    "Client instructions record",
    `Recorded: ${record?.recordedAt ? new Date(record.recordedAt).toLocaleString("en-GB") : "—"}`,
    "",
    "Summary:",
    summary || "—",
    "",
    "Authority to act:",
    authorityToAct || "—",
    "",
    "Key decisions:",
    keyDecisions || "—",
  ].join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      showToast?.("Copied to clipboard", "success");
    } catch {
      showToast?.("Copy failed", "error");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading client instructions…</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Client instructions</span>
        </div>
      }
      description="Structured record of client instructions — timestamped and exportable."
    >
      <div className="space-y-4">
        {record && (
          <p className="text-xs text-muted-foreground">
            Last recorded: {new Date(record.recordedAt).toLocaleString("en-GB")}
          </p>
        )}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary of instructions"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Authority to act</label>
          <textarea
            value={authorityToAct}
            onChange={(e) => setAuthorityToAct(e.target.value)}
            placeholder="Scope of authority (e.g. plea, disclosure, hearing)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">Key decisions</label>
          <textarea
            value={keyDecisions}
            onChange={(e) => setKeyDecisions(e.target.value)}
            placeholder="Decisions taken or confirmed"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save record
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            Export to clipboard
          </Button>
        </div>
      </div>
    </Card>
  );
}
