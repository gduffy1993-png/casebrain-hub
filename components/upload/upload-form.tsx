"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
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
  "application/zip",
];

type UploadMode = "single_case" | "one_case_per_file" | "zip_by_folder" | "multi_slot";

const MULTI_SLOT_COUNT = 5;

type SlotState = { label: string; files: File[] };

type UploadFormProps = {
  caseId?: string;
};

export function UploadForm({ caseId: propCaseId }: UploadFormProps = {}) {
  const searchParams = useSearchParams();
  const urlCaseId = searchParams.get("caseId");
  const caseId = propCaseId || urlCaseId || null;
  
  const { currentPracticeArea, setPracticeArea: setGlobalPracticeArea } = usePracticeArea();
  const { isOwner, bypassActive, status } = usePaywallStatus();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const OWNER_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID ? [process.env.NEXT_PUBLIC_ADMIN_USER_ID] : [];
  const OWNER_EMAILS = ["gduffy1993@gmail.com"];
  
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || undefined,
        });
      }
      setUserLoaded(true);
    };
    
    loadUser();
  }, []);
  
  // SIMPLE HARDCODED CHECK - NO COMPLEXITY
  const isOwnerHardcoded = 
    (user?.id && OWNER_USER_IDS.includes(user.id)) ||
    (user?.email && OWNER_EMAILS.includes(user.email.toLowerCase()));
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [uploadMode, setUploadMode] = useState<UploadMode>("single_case");
  const [caseSlots, setCaseSlots] = useState<SlotState[]>(() =>
    Array.from({ length: MULTI_SLOT_COUNT }, (_, i) => ({
      label: `Case ${i + 1}`,
      files: [] as File[],
    })),
  );
  const [slotUploadKey, setSlotUploadKey] = useState(0);
  const [practiceArea, setPracticeArea] = useState<PracticeArea>(currentPracticeArea);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallError, setPaywallError] = useState<{
    error: UsageLimitError | "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";
    limit?: number;
    plan?: string;
    message?: string;
    price?: string;
  } | null>(null);
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  // Fetch case details if caseId is provided
  useEffect(() => {
    if (caseId) {
      async function fetchCaseDetails() {
        try {
          const response = await fetch(`/api/cases/${caseId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.case) {
              setCaseTitle(data.case.title || "");
              if (data.case.practice_area) {
                setPracticeArea(data.case.practice_area as PracticeArea);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch case details:", err);
        }
      }
      fetchCaseDetails();
    }
  }, [caseId]);
  
  // NUCLEAR: If owner, NEVER allow paywallError to exist - clear it immediately
  useEffect(() => {
    if (isOwnerHardcoded && paywallError) {
      console.log("[upload-form] ✅✅✅ OWNER DETECTED - clearing paywall error immediately");
      setPaywallError(null);
    }
  }, [isOwnerHardcoded, paywallError]);
  
  // NUCLEAR: Clear paywall error on mount if owner
  useEffect(() => {
    if (userLoaded && isOwnerHardcoded) {
      console.log("[upload-form] ✅✅✅ MOUNT: Owner detected, clearing any paywall error");
      setPaywallError(null);
    }
  }, [userLoaded, isOwnerHardcoded]);
  
  // NUCLEAR NUCLEAR: DOM monitor - if modal appears, remove it immediately
  useEffect(() => {
    if (!isOwnerHardcoded) return;
    
    const checkAndRemoveModal = () => {
      // Find modal by data attribute
      const modal = document.querySelector('[data-paywall-modal="true"]');
      if (modal) {
        console.log("[upload-form] ✅✅✅ DOM MONITOR: Found modal, removing it immediately");
        (modal as HTMLElement).style.display = 'none';
        (modal as HTMLElement).remove();
        // Clear state via setter
        if (typeof setPaywallError === 'function') {
          setPaywallError(null);
        }
      }
      
      // Also check for modal by class/role
      const modalByRole = document.querySelector('[role="dialog"]');
      if (modalByRole && modalByRole.textContent?.includes('PDF Upload Limit')) {
        console.log("[upload-form] ✅✅✅ DOM MONITOR: Found modal by content, removing it");
        (modalByRole as HTMLElement).style.display = 'none';
        (modalByRole as HTMLElement).remove();
        if (typeof setPaywallError === 'function') {
          setPaywallError(null);
        }
      }
    };
    
    // Check immediately
    checkAndRemoveModal();
    
    // Check every 50ms (aggressive)
    const interval = setInterval(checkAndRemoveModal, 50);
    
    return () => clearInterval(interval);
  }, [isOwnerHardcoded]); // Don't include paywallError in deps
  
  // Log owner status for debugging
  useEffect(() => {
    if (status) {
      console.log("[upload-form] Paywall status:", {
        userId: user?.id,
        isOwnerHardcoded,
        isOwner,
        bypassActive,
        plan: status.plan,
        canUpload: status.canUpload,
      });
    }
  }, [status, isOwner, bypassActive, user?.id, isOwnerHardcoded]);

  // Sync local state when global practice area changes
  useEffect(() => {
    setPracticeArea(currentPracticeArea);
  }, [currentPracticeArea]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    
    // NUCLEAR NUCLEAR: If owner, NEVER allow paywall error to exist
    if (isOwnerHardcoded || isOwner || bypassActive) {
      console.log("[upload-form] ✅✅✅ OWNER CHECK - clearing paywall error before submit");
      setPaywallError(null);
    }

    if (!caseId && uploadMode === "multi_slot") {
      const slotsWithFiles = caseSlots.filter((s) => s.files.length > 0);
      if (slotsWithFiles.length === 0) {
        setError("Add PDFs or documents to at least one case slot.");
        return;
      }
      setError(null);
      setIsSubmitting(true);
      if (isOwnerHardcoded || isOwner || bypassActive) {
        setPaywallError(null);
      }
      try {
        const prefix = caseTitle.trim();
        let totalUploaded = 0;
        const createdCaseIds: string[] = [];

        for (let i = 0; i < caseSlots.length; i++) {
          const slot = caseSlots[i]!;
          if (!slot.files.length) continue;

          const slotLabel = (slot.label.trim() || `Case ${i + 1}`).trim();
          const fullTitle = prefix ? `${prefix} — ${slotLabel}` : slotLabel;

          const formData = new FormData();
          formData.set("caseTitle", fullTitle);
          formData.set("practiceArea", practiceArea);
          formData.set("uploadMode", "single_case");
          slot.files.forEach((file) => formData.append("files", file));

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            if (response.status === 402 && payload) {
              if (isOwnerHardcoded || isOwner || bypassActive) {
                throw new Error(payload.error ?? "Upload failed");
              }
              const trialErrorCodes = ["TRIAL_EXPIRED", "DOC_LIMIT", "CASE_LIMIT"];
              if (payload.code && trialErrorCodes.includes(payload.code)) {
                setPaywallError({
                  error: payload.code as "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT",
                  limit: payload.limit,
                  plan: payload.plan,
                  message: payload.error,
                  price: payload.upgrade?.price || "£39/user/month",
                });
                return;
              }
            }
            const paywallErrors: UsageLimitError[] = [
              "PDF_LIMIT_REACHED",
              "CASE_LIMIT_REACHED",
              "FREE_TRIAL_ALREADY_USED",
              "PHONE_NOT_VERIFIED",
              "ABUSE_DETECTED",
            ];
            if (isOwnerHardcoded || isOwner || bypassActive) {
              throw new Error(payload?.error ?? "Upload failed");
            }
            if (payload?.error && (paywallErrors.includes(payload.error) || payload.error === "UPGRADE_REQUIRED")) {
              setPaywallError({
                error: payload.error === "UPGRADE_REQUIRED" ? "PDF_LIMIT_REACHED" : payload.error,
                limit: payload.limit,
                plan: payload.plan,
              });
              return;
            }
            throw new Error(payload?.error ?? "Upload failed");
          }

          const uploaded = (payload?.uploadedCount as number | undefined) ?? slot.files.length;
          totalUploaded += uploaded;
          if (payload?.caseId) createdCaseIds.push(payload.caseId as string);
        }

        setCaseSlots(
          Array.from({ length: MULTI_SLOT_COUNT }, (_, i) => ({
            label: `Case ${i + 1}`,
            files: [],
          })),
        );
        setSlotUploadKey((k) => k + 1);
        setCaseTitle("");
        pushToast(
          `Created ${createdCaseIds.length} case(s), uploaded ${totalUploaded} file(s). Open Cases to review each.`,
          "success",
        );
        router.push("/cases");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
        pushToast(uploadError instanceof Error ? uploadError.message : "Upload failed");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!files?.length) {
      setError("Select at least one document to upload.");
      return;
    }
    const effectiveMode: UploadMode = caseId ? "single_case" : uploadMode;
    if (!caseId && effectiveMode !== "zip_by_folder" && !caseTitle.trim()) {
      setError("Provide a case title or reference (used as the case name or as a prefix for each new case).");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    // NUCLEAR: Clear paywall error again right before upload
    if (isOwnerHardcoded || isOwner || bypassActive) {
      setPaywallError(null);
    }

    try {
      const formData = new FormData();
      formData.set("caseTitle", caseTitle.trim() || "Import");
      formData.set("practiceArea", practiceArea);
      formData.set("uploadMode", caseId ? "single_case" : uploadMode);
      if (caseId) {
        formData.set("caseId", caseId);
      }
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        
        // Handle 402 Payment Required (trial limits)
        if (response.status === 402 && payload) {
          // NUCLEAR: Owner bypass
          if (isOwnerHardcoded || isOwner || bypassActive) {
            console.log("[upload-form] ✅✅✅ OWNER - ignoring 402 error");
            throw new Error(payload.error ?? "Upload failed");
          }
          
          const trialErrorCodes = ["TRIAL_EXPIRED", "DOC_LIMIT", "CASE_LIMIT"];
          if (payload.code && trialErrorCodes.includes(payload.code)) {
            setPaywallError({
              error: payload.code as "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT",
              limit: payload.limit,
              plan: payload.plan,
              message: payload.error,
              price: payload.upgrade?.price || "£39/user/month",
            });
            return;
          }
        }
        
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
        
        // NUCLEAR NUCLEAR: HARDCODED OWNER CHECK - NEVER SET PAYWALL ERROR FOR OWNER
        if (isOwnerHardcoded || isOwner || bypassActive) {
          console.log("[upload-form] ✅✅✅ HARDCODED OWNER CHECK - userId matches, IGNORING paywall error completely");
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
      const uploadedCaseId = result.caseId as string | undefined;
      const uploadedCaseIds = result.caseIds as string[] | undefined;
      const casesCreated = (result.casesCreated as number | undefined) ?? 1;
      const uploadedCount = result.uploadedCount ?? files.length;
      const skippedCount = result.skippedFiles?.length ?? 0;

      setFiles(null);
      setCaseTitle("");

      if (skippedCount > 0) {
        pushToast(`Uploaded ${uploadedCount} file(s). ${skippedCount} duplicate(s) skipped.`, "warning");
      } else if (casesCreated > 1) {
        pushToast(
          `Created ${casesCreated} cases and uploaded ${uploadedCount} file(s). Open Cases to review each.`,
          "success",
        );
      } else {
        pushToast(`Uploaded ${uploadedCount} file${uploadedCount > 1 ? "s" : ""}.`, "success");
      }

      if (uploadedCaseIds && uploadedCaseIds.length > 1) {
        router.push("/cases");
      } else if (uploadedCaseId) {
        router.push(`/cases/${uploadedCaseId}`);
      } else if (caseId) {
        router.push(`/cases/${caseId}`);
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
  
  // NUCLEAR NUCLEAR: Clear paywall error if owner (hardcoded check)
  useEffect(() => {
    if ((isOwnerHardcoded || isOwner || bypassActive) && paywallError) {
      console.log("[upload-form] ✅✅✅ HARDCODED OWNER CHECK - clearing paywall error immediately");
      setPaywallError(null);
    }
  }, [isOwnerHardcoded, isOwner, bypassActive, paywallError]);

  // Get selected option for preview
  const selectedOption = PRACTICE_AREA_OPTIONS.find(opt => opt.value === practiceArea);

  // NUCLEAR: NEVER render modal if owner - even if paywallError exists
  const shouldShowModal = paywallError && !isOwnerHardcoded && !isOwner && !bypassActive;

  // Clean up window data on mount/unmount
  useEffect(() => {
    return () => {
      delete (window as any).__paywallErrorData;
    };
  }, []);
  
  // Also set body attribute for CSS
  useEffect(() => {
    if (isOwnerHardcoded) {
      const ownerId = user?.id || "owner";
      document.body.setAttribute("data-owner-user", ownerId);
    } else {
      document.body.removeAttribute("data-owner-user");
    }
  }, [isOwnerHardcoded, user?.id]);

  return (
    <>
      {/* NUCLEAR NUCLEAR NUCLEAR: HARDCODED OWNER CHECK - NEVER show modal for owner */}
      {shouldShowModal && (
        <PaywallModal
          errorCode={paywallError.error}
          limit={paywallError.limit}
          plan={paywallError.plan}
          onClose={handleClosePaywall}
          errorMessage={paywallError.message}
          upgradePrice={paywallError.price}
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

        {/* Bulk upload mode (new cases only) */}
        {!caseId ? (
          <div className="space-y-2 rounded-2xl border border-primary/15 bg-surface/80 p-4 text-left">
            <label className="block text-sm font-semibold text-accent">Upload layout</label>
            <p className="text-xs text-accent/60">
              Avoid putting every file into one case by mistake: pick how files map to cases.
            </p>
            <div className="mt-2 flex flex-col gap-2 text-sm text-accent">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="uploadMode"
                  checked={uploadMode === "single_case"}
                  onChange={() => setUploadMode("single_case")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">One case</span> — all selected files go into the same case (default).
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="uploadMode"
                  checked={uploadMode === "one_case_per_file"}
                  onChange={() => setUploadMode("one_case_per_file")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">One case per file</span> — each PDF/DOCX/TXT becomes its own case.
                  Title below is used as a prefix (e.g. &quot;Batch Jan — R v Pike&quot;).
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="uploadMode"
                  checked={uploadMode === "zip_by_folder"}
                  onChange={() => setUploadMode("zip_by_folder")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Zip: folder = case</span> — upload one or more zips; each{" "}
                  <strong>top-level folder</strong> inside a zip becomes one case with the files inside it. Optional
                  loose PDFs are added to a separate case. Use <code className="text-xs">.zip</code> only for the
                  archive mode.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="uploadMode"
                  checked={uploadMode === "multi_slot"}
                  onChange={() => setUploadMode("multi_slot")}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Up to 5 cases (boxes)</span> — separate upload area per case.
                  Put PDFs (or DOCX/TXT) in each box; only filled boxes create a new case. Optional prefix applies to
                  all (e.g. &quot;Batch A — Case 1&quot;).
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {/* Case Title */}
        <div>
          <label className="block text-sm font-semibold text-accent">
            {caseId
              ? "Case title / reference"
              : uploadMode === "zip_by_folder"
                ? "Title prefix (optional)"
                : uploadMode === "one_case_per_file"
                  ? "Title prefix for each case"
                  : uploadMode === "multi_slot"
                    ? "Batch prefix (optional)"
                    : "Case title / reference"}
          </label>
          <input
            type="text"
            required={
              Boolean(caseId) ||
              uploadMode === "single_case" ||
              uploadMode === "one_case_per_file"
            }
            value={caseTitle}
            onChange={(event) => setCaseTitle(event.target.value)}
            placeholder={
              uploadMode === "zip_by_folder"
                ? "e.g. Fictional batch (defaults to Import if empty)"
                : uploadMode === "one_case_per_file"
                  ? "e.g. Eval batch"
                  : uploadMode === "multi_slot"
                    ? "e.g. Fictional eval (leave empty to use only slot names)"
                    : "e.g. Matthews v Northbound Transport Ltd"
            }
            className="mt-2 w-full rounded-2xl border border-primary/20 bg-surface px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Multi-slot grid (new cases only) */}
        {!caseId && uploadMode === "multi_slot" ? (
          <div
            key={slotUploadKey}
            className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {caseSlots.map((slot, i) => (
              <div
                key={`${slotUploadKey}-slot-${i}`}
                className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-surface/90 p-3 shadow-sm"
              >
                <label className="text-xs font-semibold text-accent">Slot {i + 1}</label>
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCaseSlots((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i]!, label: v };
                      return next;
                    });
                  }}
                  placeholder={`Case ${i + 1}`}
                  className="w-full rounded-xl border border-primary/15 bg-surface px-3 py-2 text-sm text-accent outline-none focus:border-primary"
                />
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-primary/30 bg-surface-muted/40 px-2 py-4 text-center text-xs text-accent/80 hover:bg-primary/5">
                  <input
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const list = e.target.files ? Array.from(e.target.files) : [];
                      setCaseSlots((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i]!, files: list };
                        return next;
                      });
                      setError(null);
                      setPaywallError(null);
                    }}
                  />
                  {slot.files.length > 0 ? (
                    <span className="font-medium text-primary">
                      {slot.files.length} file{slot.files.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span>Add PDF / DOCX / TXT</span>
                  )}
                </label>
              </div>
            ))}
          </div>
        ) : null}

        {/* File Upload (single list — hidden in multi-slot mode) */}
        {uploadMode !== "multi_slot" || caseId ? (
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
                  setError(null);
                  setPaywallError(null);
                }}
              />
              Choose files
            </label>
          </div>
        ) : null}
      </div>

      {uploadMode !== "multi_slot" && files?.length ? (
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

