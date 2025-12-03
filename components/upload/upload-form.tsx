"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function UploadForm() {
  const { currentPracticeArea, setPracticeArea: setGlobalPracticeArea } = usePracticeArea();
  const [files, setFiles] = useState<FileList | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [practiceArea, setPracticeArea] = useState<PracticeArea>(currentPracticeArea);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  // Sync local state when global practice area changes
  useEffect(() => {
    setPracticeArea(currentPracticeArea);
  }, [currentPracticeArea]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!files?.length) {
      setError("Select at least one document to upload.");
      return;
    }
    if (!caseTitle.trim()) {
      setError("Provide a case title or reference.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("caseTitle", caseTitle);
      formData.set("practiceArea", practiceArea);
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Upload failed");
      }

      const result = await response.json();
      const uploadedCaseId = result.caseId;
      const uploadedCount = result.uploadedCount ?? files.length;
      const skippedCount = result.skippedFiles?.length ?? 0;

      setFiles(null);
      setCaseTitle("");
      
      if (skippedCount > 0) {
        pushToast(`Uploaded ${uploadedCount} file(s). ${skippedCount} duplicate(s) skipped.`, "warning");
      } else {
        pushToast(`Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""} into ${caseTitle}.`, "success");
      }
      
      // Navigate to the case page to see the uploaded files
      if (uploadedCaseId) {
        router.push(`/cases/${uploadedCaseId}`);
      } else {
        router.refresh();
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed",
      );
      pushToast(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get selected option for preview
  const selectedOption = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-3xl border border-dashed border-primary/30 bg-surface-muted/70 p-10 text-center"
    >
      <CloudUpload className="mx-auto h-10 w-10 text-primary" />
      <p className="text-lg font-semibold text-accent">
        Drop documents or click to browse
      </p>
      <p className="text-sm text-accent/60">
        Accepts PDF, DOCX, and TXT. Files are encrypted in Supabase Storage.
      </p>

      <div className="mx-auto w-full max-w-md space-y-6 text-left">
        {/* Solicitor Role Selector - FIRST and prominent */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-accent">
            Solicitor role
          </label>
          <p className="text-xs text-accent/60">
            This tells CaseBrain how to analyse this case (Housing / PI / Clinical Neg / Family, etc.).
          </p>
          <select
            value={practiceArea}
            onChange={(event) => {
              const newArea = event.target.value as PracticeArea;
              setPracticeArea(newArea);
              // Update global practice area when user changes it in upload form
              setGlobalPracticeArea(newArea);
            }}
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-surface px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          >
            {PRACTICE_AREA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-accent/50 mt-1">
            {selectedOption?.description}
          </p>
          {selectedOption && (
            <p className="text-xs text-primary/80 mt-1">
              Case will be analysed as: <span className="font-medium">{selectedOption.label}</span>
            </p>
          )}
        </div>

        {/* Case Title */}
        <div>
          <label className="block text-sm font-semibold text-accent">
            Case title / reference
          </label>
          <input
            type="text"
            required
            value={caseTitle}
            onChange={(event) => setCaseTitle(event.target.value)}
            placeholder="e.g. Matthews v Northbound Transport Ltd"
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-surface px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-accent mb-2">
            Documents
          </label>
          <label className="mx-auto flex cursor-pointer flex-col items-center gap-2 rounded-full bg-surface px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/20">
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(event) => setFiles(event.target.files)}
            />
            Choose files
          </label>
        </div>
      </div>

      {files?.length ? (
        <p className="text-xs text-accent/50">
          {files.length} file{files.length > 1 ? "s" : ""} selected
        </p>
      ) : null}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </span>
          ) : (
            "Upload and Extract"
          )}
        </Button>
      </div>
    </form>
  );
}

