"use client";

import { useState, useTransition } from "react";
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setResult(null);
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      setResult({ success: false, error: "Please select at least one file" });
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });

        const res = await fetch(`/api/cases/${caseId}/documents/add`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to add documents");
        }

        setResult({
          success: true,
          message: data.message || `${files.length} document(s) added successfully`,
        });

        // Clear files and close after delay
        setTimeout(() => {
          setFiles([]);
          setResult(null);
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : "Failed to add documents",
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-accent">Add Documents to Case</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isPending}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-accent/70 mb-4">
          Adding documents to: <span className="font-medium">{caseTitle}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-accent mb-2">
              Select PDF files
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={isPending}
              className="block w-full text-sm text-accent/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-accent/60">
                {files.length} file(s) selected
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
                <p className="text-sm font-medium">
                  {result.success ? result.message : result.error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-accent/10">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || files.length === 0}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Add Documents
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

