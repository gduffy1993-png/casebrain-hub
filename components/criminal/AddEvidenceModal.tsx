"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";

type AddEvidenceModalProps = {
  caseId: string;
  caseTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AddEvidenceModal({
  caseId,
  caseTitle,
  isOpen,
  onClose,
  onSuccess,
}: AddEvidenceModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push: showToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Filter to PDFs only
    const pdfFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    setFiles(pdfFiles);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setResult({ success: false, error: "Please select at least one PDF file" });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("caseId", caseId);
      if (caseTitle) {
        formData.set("caseTitle", caseTitle);
      }
      formData.set("practiceArea", "criminal"); // Criminal cases always use criminal practice area
      
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload evidence");
      }

      setResult({
        success: true,
        message: `${files.length} document(s) uploaded successfully`,
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
          onSuccess();
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
          <h2 className="text-lg font-semibold text-foreground">Add Evidence</h2>
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
          Upload PDF documents to add to this case. Documents will be processed and available for analysis.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select PDF files
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
                {files.length} file(s) selected: {files.map(f => f.name).join(", ")}
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
                  Uploading...
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
