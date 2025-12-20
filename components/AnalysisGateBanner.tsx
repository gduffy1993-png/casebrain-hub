"use client";

import { AlertTriangle, AlertCircle, Info, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

export type BannerSeverity = "warning" | "error" | "info";

export type Diagnostics = {
  docCount: number;
  rawCharsTotal: number;
  jsonCharsTotal: number;
  avgRawCharsPerDoc: number;
  suspectedScanned: boolean;
  reasonCodes: string[];
};

export type AnalysisGateBannerProps = {
  banner: {
    severity: BannerSeverity;
    title?: string;
    message: string;
  };
  diagnostics?: Diagnostics;
  showHowToFix?: boolean;
};

/**
 * Reusable banner component for analysis gating
 * Shows when analysis cannot be generated due to insufficient text/scanned PDF
 */
export function AnalysisGateBanner({
  banner,
  diagnostics,
  showHowToFix = true,
}: AnalysisGateBannerProps) {
  const getIcon = () => {
    switch (banner.severity) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (banner.severity) {
      case "error":
        return "border-red-500/30 bg-red-500/10";
      case "warning":
        return "border-amber-500/30 bg-amber-500/10";
      case "info":
        return "border-blue-500/30 bg-blue-500/10";
    }
  };

  const getTextColor = () => {
    switch (banner.severity) {
      case "error":
        return "text-red-300";
      case "warning":
        return "text-amber-300";
      case "info":
        return "text-blue-300";
    }
  };

  return (
    <Card className={`border-2 ${getBorderColor()} p-4`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          {banner.title && (
            <p className={`font-semibold text-sm ${getTextColor()}`}>
              {banner.title}
            </p>
          )}
          <p className="text-sm text-foreground/90">{banner.message}</p>

          {/* Diagnostics */}
          {diagnostics && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Docs: {diagnostics.docCount}</span>
                <span>
                  Extracted text: {diagnostics.rawCharsTotal.toLocaleString()} chars
                </span>
                <span>
                  Extracted data: {diagnostics.jsonCharsTotal.toLocaleString()} chars
                </span>
                {diagnostics.suspectedScanned && (
                  <span className="text-amber-400">Suspected scanned PDF</span>
                )}
                {diagnostics.rawCharsTotal < 800 && diagnostics.rawCharsTotal > 0 && (
                  <span className="text-amber-400">Insufficient text</span>
                )}
              </div>
            </div>
          )}

          {/* How to Fix */}
          {showHowToFix && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground mb-1">
                    How to fix:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>Upload text-based PDFs (not scanned images)</li>
                    <li>Run OCR on scanned documents before uploading</li>
                    <li>Re-upload documents after processing</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
