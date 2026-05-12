"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";
import {
  MAX_SEPARATE_PDF_UPLOAD,
  MAX_SOURCE_PDFS_FOR_MERGE,
  mergePdfFilesToSingleFile,
} from "@/lib/client/merge-pdfs";

export type AddEvidenceSuccessPayload = {
  documentIds: string[];
};

type AddEvidenceModalProps = {
  caseId: string;
  caseTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (payload: AddEvidenceSuccessPayload) => void;
};

export function AddEvidenceModal({
  caseId,
  caseTitle,
  isOpen,
  onClose,
  onSuccess,
}: AddEvidenceModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  /** When true, selected PDFs are merged in the browser into one file (up to {@link MAX_SOURCE_PDFS_FOR_MERGE}), then one upload. */
  const [mergeIntoOnePdf, setMergeIntoOnePdf] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push: showToast } = useToast();

  if (!isOpen) return null;

  const maxSelectable = mergeIntoOnePdf ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Filter to PDFs only
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    const cap = mergeIntoOnePdf ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
    if (pdfFiles.length > cap) {
      setFiles(pdfFiles.slice(0, cap));
      setResult({
        success: false,
        error: `Only the first ${cap} PDF files were kept (limit for ${mergeIntoOnePdf ? "merge" : "separate"} upload).`,
      });
      return;
    }
    setFiles(pdfFiles);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setResult({ success: false, error: "Please select at least one PDF file" });
      return;
    }
    const cap = mergeIntoOnePdf ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
    if (files.length > cap) {
      setResult({ success: false, error: `You can select up to ${cap} PDFs (${mergeIntoOnePdf ? "merge" : "separate"} mode).` });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      let uploadFiles: File[] = files;
      if (mergeIntoOnePdf && files.length > 1) {
        setMergeBusy(true);
        try {
          uploadFiles = [await mergePdfFilesToSingleFile(files)];
        } finally {
          setMergeBusy(false);
        }
      }

      const formData = new FormData();
      formData.set("caseId", caseId);
      if (caseTitle) {
        formData.set("caseTitle", caseTitle);
      }
      formData.set("practiceArea", "criminal"); // Criminal cases always use criminal practice area

      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        documentIds?: string[];
        success?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload evidence");
      }

      const documentIds = Array.isArray(data.documentIds) ? data.documentIds : [];

      const uploadedLabel =
        mergeIntoOnePdf && files.length > 1
          ? `1 combined PDF (${files.length} sources stitched)`
          : `${uploadFiles.length} document(s)`;
      setResult({
        success: true,
        message: `${uploadedLabel} uploaded successfully`,
      });

      showToast("Evidence uploaded successfully", "success");

      // Clear files and close after delay
      setTimeout(() => {
        setFiles([]);
        setResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onClose();
        if (onSuccess) {
          onSuccess({ documentIds });
        }
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload evidence";
      setResult({
        success: false,
        error: errorMessage,
      });
      showToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Add evidence — multi-PDF + combine</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isUploading}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Select many PDFs at once. Turn on <strong>Combine into one PDF</strong> to stitch them on this device and
          upload a single bundle (up to {MAX_SOURCE_PDFS_FOR_MERGE} files), or turn it off to upload up to{" "}
          {MAX_SEPARATE_PDF_UPLOAD} separate documents in one request.
        </p>

        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={mergeIntoOnePdf}
              onChange={(e) => {
                const on = e.target.checked;
                setMergeIntoOnePdf(on);
                setFiles((prev) => {
                  const cap = on ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
                  if (prev.length > cap) return prev.slice(0, cap);
                  return prev;
                });
                setResult(null);
              }}
              disabled={isUploading}
            />
            <span>
              <span className="font-medium text-foreground">Combine into one PDF before upload</span>
              <span className="block text-muted-foreground mt-1">
                Merges in page order in your browser, then sends one file — avoids the {MAX_SEPARATE_PDF_UPLOAD}-file
                server limit when you have many small PDFs.
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select PDF files (hold Ctrl/Cmd to multi-select)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 disabled:opacity-50"
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {files.length} file(s) selected (max {maxSelectable}
                {mergeIntoOnePdf ? ", merged into one upload" : ""}).
                {files.length <= 5 ? ` ${files.map((f) => f.name).join(", ")}` : ""}
              </p>
            )}
          </div>

          {result && (
            <div
              className={`rounded-xl p-4 ${
                result.success
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-red-500/10 text-red-600 border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <p className="text-sm font-medium">
                  {result.success ? result.message : result.error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mergeBusy ? "Combining PDFs…" : "Uploading…"}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Evidence
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
