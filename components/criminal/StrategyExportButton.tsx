"use client";

/**
 * Phase 6: Export "Strategy on one page" as PDF for counsel/court/client.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";

type StrategyExportButtonProps = {
  caseId: string;
  caseTitle?: string;
  variant?: "outline" | "ghost" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StrategyExportButton({
  caseId,
  caseTitle,
  variant = "outline",
  size = "sm",
  className = "",
}: StrategyExportButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      const response = await fetch(`/api/criminal/${caseId}/strategy-export`, { credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "Strategy_export.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      } else if (caseTitle) {
        const safe = caseTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
        filename = `Strategy_${safe}_${new Date().toISOString().split("T")[0]}.pdf`;
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("[StrategyExportButton] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={downloading}
        className="gap-1.5"
      >
        {downloading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            <span>Export strategy (PDF)</span>
            <Download className="h-3 w-3 opacity-50" />
          </>
        )}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
