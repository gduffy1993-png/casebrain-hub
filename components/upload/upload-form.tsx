"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import type { PracticeArea } from "@/lib/types/casebrain";
import { PRACTICE_AREA_OPTIONS } from "@/lib/types/casebrain";
import { usePracticeArea } from "@/components/providers/PracticeAreaProvider";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";
import type { UsageLimitError } from "@/lib/usage-limits";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function UploadForm() {
  const { currentPracticeArea, setPracticeArea: setGlobalPracticeArea } = usePracticeArea();
  const { isOwner, bypassActive, status } = usePaywallStatus();
  
  // Log owner status for debugging
  useEffect(() => {
    if (status) {
      console.log("[upload-form] Paywall status:", {
        isOwner,
        bypassActive,
        plan: status.plan,
        canUpload: status.canUpload,
      });
    }
  }, [status, isOwner, bypassActive]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [practiceArea, setPracticeArea] = useState<PracticeArea>(currentPracticeArea);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallError, setPaywallError] = useState<{
    error: UsageLimitError;
    limit?: number;
    plan?: string;
  } | null>(null);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  // Sync local state when global practice area changes
  useEffect(() => {
    setPracticeArea(currentPracticeArea);
  }, [currentPracticeArea]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    
    // NUCLEAR: Clear any existing paywall error if owner
    if ((isOwner || bypassActive) && paywallError) {
      console.log("[upload-form] ✅ Clearing paywall error for owner");
      setPaywallError(null);
    }
    
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
        
        // Check if this is a paywall error
        const paywallErrors: UsageLimitError[] = [
          "PDF_LIMIT_REACHED",
          "CASE_LIMIT_REACHED",
          "FREE_TRIAL_ALREADY_USED",
          "PHONE_NOT_VERIFIED",
          "ABUSE_DETECTED",
        ];
        
        // Handle paywall errors
        // NEVER show paywall modal for owners or if bypass is active
        console.log("[upload-form] Upload failed:", {
          status: response.status,
          error: payload?.error,
          isOwner,
          bypassActive,
          plan: status?.plan,
          willShowModal: payload?.error && paywallErrors.includes(payload.error) && !isOwner && !bypassActive,
        });
        
        // NUCLEAR OPTION: If owner or bypass active, completely ignore paywall errors
        if (isOwner || bypassActive) {
          console.log("[upload-form] ✅✅✅ OWNER/BYPASS ACTIVE - IGNORING paywall error completely");
          // Don't set paywallError state at all for owners - just throw a generic error
          throw new Error(payload?.error ?? "Upload failed");
        }
        
        // Only handle paywall errors for non-owners
        if (payload?.error) {
          // Check if it's a paywall error (including the old "UPGRADE_REQUIRED" code)
          if (paywallErrors.includes(payload.error) || payload.error === "UPGRADE_REQUIRED") {
            console.log("[upload-form] ❌ Showing paywall modal (user is NOT owner)");
            setPaywallError({
              error: payload.error === "UPGRADE_REQUIRED" ? "PDF_LIMIT_REACHED" : payload.error,
              limit: payload.limit,
              plan: payload.plan,
            });
            return;
          }
        }
        
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

  // Close paywall modal
  const handleClosePaywall = () => {
    setPaywallError(null);
  };
  
  // NUCLEAR: Clear paywall error if owner status changes
  useEffect(() => {
    if ((isOwner || bypassActive) && paywallError) {
      console.log("[upload-form] ✅ Owner status detected - clearing paywall error");
      setPaywallError(null);
    }
  }, [isOwner, bypassActive, paywallError]);

  // Get selected option for preview
  const selectedOption = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);

  return (
    <>
      {/* NUCLEAR OPTION: NEVER show modal for owners - check owner status FIRST */}
      {paywallError && !isOwner && !bypassActive && (
        <PaywallModal
          errorCode={paywallError.error}
          limit={paywallError.limit}
          plan={paywallError.plan}
          onClose={handleClosePaywall}
        />
      )}
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
              onChange={(event) => {
                setFiles(event.target.files);
                // Clear any previous errors when new files are selected
                setError(null);
                setPaywallError(null);
              }}
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

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

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
    </>
  );
}

