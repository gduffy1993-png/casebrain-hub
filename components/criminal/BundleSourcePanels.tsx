"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FoldSection } from "@/components/ui/fold-section";
import {
  Loader2,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useToast } from "@/components/Toast";

type BundleSourceData = {
  combinedTextLength: number;
  documentCount: number;
  documentRows: Array<{
    id: string;
    name: string | null;
    updatedAt: string | null;
    lenExtracted: number;
    lenRaw: number;
    lenBody: number;
  }>;
  health: {
    status: "empty" | "partial" | "ok";
    duplicateDocuments: number;
    headerDetected: boolean;
    mg5Detected: boolean;
    mg6Detected: boolean;
    exhibitLineCount: number;
  };
  header: {
    reference: string | null;
    shortTitle: string | null;
    accused: string | null;
    otherParty: string | null;
    primaryEvalHook: string | null;
    stage: string | null;
    messiness: string | null;
    plea: string | null;
  } | null;
  snippets: {
    mg5: string | null;
    mg6: string | null;
    exhibits: string | null;
  };
};

type Props = {
  caseId: string;
};

function healthBadge(status: BundleSourceData["health"]["status"]) {
  if (status === "ok")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    );
  if (status === "partial")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" /> Partial
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
      <AlertTriangle className="h-3.5 w-3.5" /> Empty / thin
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="font-medium text-foreground">{label}: </span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}

const snippetPreClass =
  "max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 border-l-4 border-l-violet-500/80 bg-violet-500/[0.06] p-3 text-xs text-foreground dark:bg-violet-500/10";

export function BundleSourcePanels({ caseId }: Props) {
  const { push: showToast } = useToast();
  const [data, setData] = useState<BundleSourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reExtracting, setReExtracting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/bundle-source`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load bundle source");
      setData(json.data as BundleSourceData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onAnalysis = () => load();
    window.addEventListener("analysis-rerun-complete", onAnalysis);
    return () => window.removeEventListener("analysis-rerun-complete", onAnalysis);
  }, [load]);

  const reExtractLatest = async () => {
    const latestId = data?.documentRows[0]?.id;
    if (!latestId) {
      showToast("Upload a PDF first.", "error");
      return;
    }
    setReExtracting(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: latestId }),
      });
      const json = (await res.json()) as { error?: string; suggestion?: string; success?: boolean };
      if (!res.ok || !json.success) {
        const msg = json.error ?? "Re-extract failed";
        showToast(json.suggestion ? `${msg} — ${json.suggestion}` : msg, "error");
        return;
      }
      showToast("Bundle re-extracted — text and summaries were refreshed from storage.", "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { detail: { caseId } }));
      }
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Re-extract failed", "error");
    } finally {
      setReExtracting(false);
    }
  };

  const copyHeader = () => {
    if (!data?.header) return;
    const h = data.header;
    const lines = [
      h.reference && `Reference: ${h.reference}`,
      h.shortTitle && `Short title: ${h.shortTitle}`,
      h.accused && `Accused: ${h.accused}`,
      h.otherParty && `Other party / key witness: ${h.otherParty}`,
      h.primaryEvalHook && `Primary eval hook: ${h.primaryEvalHook}`,
      h.stage && `Stage: ${h.stage}`,
      h.messiness && `Messiness: ${h.messiness}`,
      h.plea && `Plea: ${h.plea}`,
    ].filter(Boolean);
    void navigator.clipboard.writeText(lines.join("\n"));
  };

  if (loading) {
    return (
      <Card className="border-border/80 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading bundle source…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) return null;

  const hasHeader =
    data.header &&
    (data.header.reference ||
      data.header.accused ||
      data.header.shortTitle ||
      data.header.primaryEvalHook);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Layers className="h-4 w-4 text-muted-foreground" />
          Bundle source (from uploaded PDFs)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/cases/${caseId}?action=add-documents`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted/50"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload / add documents
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={reExtracting || data.documentRows.length === 0}
            onClick={() => void reExtractLatest()}
          >
            {reExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Re-extract latest
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Document health — colour-coded */}
      <Card className="border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Document health</h3>
          {healthBadge(data.health.status)}
        </div>
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>
            Combined text: <strong className="text-foreground">{data.combinedTextLength.toLocaleString()}</strong> chars
          </li>
          <li>
            Documents: <strong className="text-foreground">{data.documentCount}</strong>
            {data.health.duplicateDocuments > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                {" "}
                ({data.health.duplicateDocuments} older duplicate{data.health.duplicateDocuments === 1 ? "" : "s"} — use latest upload)
              </span>
            )}
          </li>
          <li>Header parsed: {data.health.headerDetected ? "yes" : "no"}</li>
          <li>
            MG5 / MG6 / EX- lines detected: {data.health.mg5Detected ? "MG5 " : ""}
            {data.health.mg6Detected ? "MG6 " : ""}
            {data.health.exhibitLineCount > 0 ? `(${data.health.exhibitLineCount} EX- tokens)` : "(no EX- refs found)"}
          </li>
        </ul>
        {data.documentRows.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Latest document</p>
            {data.documentRows[0].name && (
              <p className="mb-1 truncate text-xs text-foreground" title={data.documentRows[0].name}>
                {data.documentRows[0].name}
              </p>
            )}
            <p className="font-mono text-[11px] text-muted-foreground">
              len extracted_text: {data.documentRows[0].lenExtracted} · raw_text: {data.documentRows[0].lenRaw} · body used:{" "}
              {data.documentRows[0].lenBody}
            </p>
          </div>
        )}
      </Card>

      {/* Bundle header — source of truth */}
      <Card className="border-2 border-foreground/10 bg-background p-4 shadow-sm dark:bg-zinc-950/80">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Bundle Header (extracted from PDF)</h3>
          </div>
          {hasHeader && (
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={copyHeader}>
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          )}
        </div>
        {!hasHeader ? (
          <p className="text-sm text-muted-foreground">
            No Northshire-style header detected in the first part of the extracted text. If this is a real CPS PDF, the header may use different labels — check Documents or raw text.
          </p>
        ) : (
          <div className="space-y-1.5 rounded-md border border-border/50 bg-muted/30 p-3 font-sans text-sm">
            <Field label="Reference" value={data.header!.reference} />
            <Field label="Short title" value={data.header!.shortTitle} />
            <Field label="Accused" value={data.header!.accused} />
            <Field label="Other party / key witness" value={data.header!.otherParty} />
            <Field label="Primary eval hook" value={data.header!.primaryEvalHook} />
            <Field label="Stage" value={data.header!.stage} />
            <Field label="Messiness" value={data.header!.messiness} />
            <Field label="Plea" value={data.header!.plea} />
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          AI strategy and client-safe text should align with these labels when the bundle uses this format.
        </p>
      </Card>

      <Card className="border-violet-500/35 bg-violet-500/[0.07] p-3 dark:bg-violet-950/40">
        <p className="text-xs font-medium text-violet-950 dark:text-violet-200">Source text vs AI output</p>
        <p className="mt-1 text-[11px] leading-relaxed text-violet-950/90 dark:text-violet-200/85">
          This section shows text extracted directly from the uploaded PDF. It is not model-generated.
        </p>
      </Card>

      {/* MG5 / MG6 / Exhibits */}
      <div className="grid gap-3 lg:grid-cols-1">
        <FoldSection title="MG5 (from bundle text)" defaultOpen={false}>
          {data.snippets.mg5 ? (
            <pre className={snippetPreClass}>{data.snippets.mg5}</pre>
          ) : (
            <p className="text-xs text-muted-foreground">No <code className="rounded bg-muted px-1">SECTION: MG5</code> block found.</p>
          )}
        </FoldSection>
        <FoldSection title="MG6 Schedule (extracted from bundle text)" defaultOpen={false}>
          {data.snippets.mg6 ? (
            <pre className={snippetPreClass}>{data.snippets.mg6}</pre>
          ) : (
            <p className="text-xs text-muted-foreground">No <code className="rounded bg-muted px-1">SECTION: MG6</code> block found.</p>
          )}
        </FoldSection>
        <FoldSection title="Exhibits (extracted from bundle text)" defaultOpen={false}>
          {data.snippets.exhibits ? (
            <pre className={snippetPreClass}>{data.snippets.exhibits}</pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              No exhibits section found; EX- count in health still lists tokens seen anywhere in the text.
            </p>
          )}
        </FoldSection>
      </div>
    </div>
  );
}
