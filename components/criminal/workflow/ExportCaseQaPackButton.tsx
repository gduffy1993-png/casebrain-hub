"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildCaseQaPackFilename,
  buildCaseQaPackMarkdown,
  downloadCaseQaPackMarkdown,
  loadCaseQaPackInput,
} from "@/lib/criminal/export-case-qa-pack";

export type ExportCaseQaPackButtonProps = {
  caseId: string;
};

type LoadState = "loading" | "ready" | "error";

export function ExportCaseQaPackButton({ caseId }: ExportCaseQaPackButtonProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [exportState, setExportState] = useState<"idle" | "exporting" | "exported" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    loadCaseQaPackInput(caseId)
      .then(() => {
        if (!cancelled) setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const handleExport = useCallback(async () => {
    if (loadState !== "ready" || exportState === "exporting") return;
    setExportState("exporting");
    try {
      const input = await loadCaseQaPackInput(caseId);
      const markdown = buildCaseQaPackMarkdown(input);
      const filename = buildCaseQaPackFilename(input.caseLabel, new Date(input.exportedAt));
      downloadCaseQaPackMarkdown(filename, markdown);
      setExportState("exported");
      window.setTimeout(() => setExportState("idle"), 2500);
    } catch {
      setExportState("failed");
      window.setTimeout(() => setExportState("idle"), 3000);
    }
  }, [caseId, exportState, loadState]);

  const disabled = loadState === "loading" || exportState === "exporting";
  const label =
    loadState === "loading"
      ? "Preparing case data..."
      : exportState === "exporting"
        ? "Exporting..."
        : exportState === "exported"
          ? "Exported"
          : exportState === "failed"
            ? "Export failed"
            : "Export QA pack";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1"
      disabled={disabled}
      onClick={() => void handleExport()}
      data-testid="export-qa-pack-button"
    >
      {loadState === "loading" || exportState === "exporting" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : exportState === "exported" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
