"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MAX_SEPARATE_PDF_UPLOAD,
  MAX_SOURCE_PDFS_FOR_MERGE,
  mergePdfFilesToSingleFile,
} from "@/lib/client/merge-pdfs";

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

type AddDocumentsModalProps = {
  caseId: string;
  caseTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddDocumentsModal({
  caseId,
  caseTitle,
  isOpen,
  onClose,
  onSuccess,
}: AddDocumentsModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [practiceArea, setPracticeArea] = useState("other_litigation");
  const [mergeIntoOnePdf, setMergeIntoOnePdf] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !caseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = (await res.json()) as { case?: { practice_area?: string } };
        const pa = data.case?.practice_area?.trim();
        if (!cancelled && pa) setPracticeArea(pa);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, caseId]);

  useEffect(() => {
    if (!files.length) return;
    const allPdf = files.every(isPdfFile);
    if (!allPdf) setMergeIntoOnePdf(false);
  }, [files]);

  if (!isOpen) return null;

  const allPdfSelection = files.length > 0 && files.every(isPdfFile);
  const maxSelectable = mergeIntoOnePdf && allPdfSelection ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const allPdf = selectedFiles.length > 0 && selectedFiles.every(isPdfFile);
    const cap = mergeIntoOnePdf && allPdf ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
    if (selectedFiles.length > cap) {
      setFiles(selectedFiles.slice(0, cap));
      setResult({
        success: false,
        error: `Only the first ${cap} files were kept.`,
      });
      return;
    }
    setFiles(selectedFiles);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setResult({ success: false, error: "Please select at least one file" });
      return;
    }

    const allPdf = files.every(isPdfFile);
    const cap = mergeIntoOnePdf && allPdf ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
    if (files.length > cap) {
      setResult({ success: false, error: `You can select up to ${cap} files with the current options.` });
      return;
    }
    if (files.length > MAX_SEPARATE_PDF_UPLOAD) {
      if (!mergeIntoOnePdf || !allPdf) {
        setResult({
          success: false,
          error: `More than ${MAX_SEPARATE_PDF_UPLOAD} files: choose PDFs only and enable "Combine PDFs", or remove files.`,
        });
        return;
      }
    }

    setIsUploading(true);
    setResult(null);

    try {
      let uploadFiles: File[] = files;
      if (mergeIntoOnePdf && allPdf && files.length > 1) {
        setMergeBusy(true);
        try {
          uploadFiles = [await mergePdfFilesToSingleFile(files)];
        } finally {
          setMergeBusy(false);
        }
      }

      const formData = new FormData();
      formData.set("caseId", caseId);
      formData.set("caseTitle", caseTitle.trim() || "Case");
      formData.set("practiceArea", practiceArea);
      formData.set("uploadMode", "single_case");
      uploadFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        uploadedCount?: number;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to add documents");
      }

      const n = data.uploadedCount ?? uploadFiles.length;
      const mergedNote =
        mergeIntoOnePdf && allPdf && files.length > 1 ? ` (${files.length} PDFs combined into one).` : ".";

      setResult({
        success: true,
        message: data.message || `${n} document(s) added successfully${mergedNote}`,
      });

      setTimeout(() => {
        setFiles([]);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add documents",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-accent">Add documents — multi-file + PDF combine</h2>
            <p className="mt-1 text-xs text-accent/60">
              Uses the same upload pipeline as criminal cases. Hold Ctrl/Cmd to select many files at once.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading} className="h-8 w-8 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-accent/70 mb-4">
          Adding to: <span className="font-medium">{caseTitle}</span>
        </p>

        <div className="space-y-4">
          {files.length >= 2 && files.every(isPdfFile) && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-surface-muted/40 p-3 text-sm text-accent">
              <input
                type="checkbox"
                className="mt-1"
                checked={mergeIntoOnePdf}
                onChange={(e) => {
                  const on = e.target.checked;
                  setMergeIntoOnePdf(on);
                  setFiles((prev) => {
                    const cap = on ? MAX_SOURCE_PDFS_FOR_MERGE : MAX_SEPARATE_PDF_UPLOAD;
                    return prev.length > cap ? prev.slice(0, cap) : prev;
                  });
                  setResult(null);
                }}
                disabled={isUploading}
              />
              <span>
                <span className="font-medium">Combine PDFs into one file</span> before upload (up to{" "}
                {MAX_SOURCE_PDFS_FOR_MERGE} PDFs, then one request). Turn off to upload up to {MAX_SEPARATE_PDF_UPLOAD}{" "}
                separate files.
              </span>
            </label>
          )}

          <div>
            <label className="block text-sm font-medium text-accent mb-2">
              Select files (PDF, DOC, DOCX — PDF-only can be merged)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-accent/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-accent/60">
                {files.length} file(s) selected (max {maxSelectable} with current options).
              </p>
            )}
          </div>

          {result && (
            <div
              className={`rounded-xl p-4 ${
                result.success
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-danger/10 text-danger border border-danger/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <p className="text-sm font-medium">{result.success ? result.message : result.error}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-accent/10">
            <Button variant="secondary" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isUploading || files.length === 0} className="gap-2">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mergeBusy ? "Combining PDFs…" : "Uploading…"}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Add documents
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
