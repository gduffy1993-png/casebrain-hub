"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

type Document = {
  id: string;
  name: string;
  created_at: string;
};

interface CaseFilesListProps {
  documents: Document[];
}

/**
 * Case Files List Component
 * 
 * Displays a list of case documents with View buttons.
 * Handles opening files in new tabs via signed URLs.
 */
export function CaseFilesList({ documents }: CaseFilesListProps) {
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const { push: showToast } = useToast();

  const handleView = async (fileId: string, fileName: string) => {
    console.log("VIEW CLICK", { fileId, fileName });
    
    try {
      setOpeningFileId(fileId);
      
      // Fetch signed URL from server
      const res = await fetch(`/api/files/${fileId}/view`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to fetch view URL");
      }

      const data = await res.json();
      
      if (!data?.url) {
        throw new Error("No URL returned from server");
      }

      // Open in new tab
      const newWindow = window.open(data.url, "_blank", "noopener,noreferrer");
      
      if (!newWindow) {
        // Popup blocked - show error with download option
        showToast(
          `Popup blocked. Please allow popups for this site or use the download option.`,
          "error"
        );
      }
    } catch (err) {
      console.error("[CaseFilesList] Error opening file:", err);
      showToast(
        err instanceof Error
          ? `Could not open ${fileName}: ${err.message}`
          : `Could not open ${fileName}. Please try again.`,
        "error"
      );
    } finally {
      setOpeningFileId(null);
    }
  };


  if (!documents || documents.length === 0) {
    return (
      <p className="text-sm text-accent/60">
        No documents uploaded. Use the upload tab to add evidence.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {documents.map((doc) => {
        const isOpening = openingFileId === doc.id;
        
        return (
          <li
            key={doc.id}
            className="flex items-center justify-between rounded-2xl border bg-surface-muted/70 px-3 py-3 text-sm"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-accent truncate">{doc.name}</p>
              <p className="text-xs text-accent/50">
                Uploaded{" "}
                {new Date(doc.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => handleView(doc.id, doc.name)}
                disabled={isOpening}
              >
                {isOpening ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" /> View
                  </>
                )}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

