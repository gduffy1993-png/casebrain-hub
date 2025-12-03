"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";

interface CaseOverviewExportButtonProps {
  caseId: string;
  caseTitle?: string;
  variant?: "outline" | "ghost" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CaseOverviewExportButton({
  caseId,
  caseTitle,
  variant = "outline",
  size = "sm",
  className = "",
}: CaseOverviewExportButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);

      const response = await fetch(`/api/cases/${caseId}/overview-pdf`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "CaseOverview.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      } else if (caseTitle) {
        const safeTitle = caseTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
        const dateStr = new Date().toISOString().split("T")[0];
        filename = `CaseOverview_${safeTitle}_${dateStr}.pdf`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("[CaseOverviewExportButton] Error:", err);
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
        className="gap-1.5 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
      >
        {downloading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <FileText className="h-3.5 w-3.5" />
            <span>Export Overview</span>
            <Download className="h-3 w-3 opacity-50" />
          </>
        )}
      </Button>

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

