"use client";

import { useState } from "react";
import { FileDown, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type CasePackExportButtonProps = {
  caseId: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function CasePackExportButton({
  caseId,
  variant = "secondary",
  size = "sm",
}: CasePackExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { push: showToast } = useToast();

  const handleExport = async () => {
    setIsLoading(true);
    
    try {
      showToast("Generating Case Pack PDF...");

      const response = await fetch(`/api/cases/${caseId}/case-pack`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate case pack");
      }

      // Get the blob
      const blob = await response.blob();

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "CasePack.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("Case Pack downloaded!");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to generate Case Pack");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading}
      className="gap-1.5"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      {isLoading ? "Generating..." : "Export Case Pack"}
    </Button>
  );
}

/**
 * Full panel version with more details
 */
export function CasePackExportPanel({ caseId }: { caseId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { push: showToast } = useToast();

  const handleExport = async () => {
    setIsLoading(true);
    
    try {
      showToast("Generating comprehensive Case Pack PDF...");

      const response = await fetch(`/api/cases/${caseId}/case-pack`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to generate case pack");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "CasePack.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast("Case Pack downloaded!");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to generate Case Pack");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-accent">Case Pack PDF</h3>
          <p className="mt-1 text-xs text-accent-soft">
            Export a comprehensive PDF report with case overview, timeline, bundle analysis, 
            issues, risks, and next steps.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={isLoading}
            className="mt-3 gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {isLoading ? "Generating PDF..." : "Download Case Pack"}
          </Button>
        </div>
      </div>
    </div>
  );
}

