"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

type NewEvidenceBannerProps = {
  caseId: string;
};

export function NewEvidenceBanner({ caseId }: NewEvidenceBannerProps) {
  const [newDocCount, setNewDocCount] = useState<number | null>(null);
  const [nextVersion, setNextVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkNewEvidence() {
      try {
        // Fetch latest version
        const versionResponse = await fetch(`/api/cases/${caseId}/analysis/version/latest`);
        const versionData = versionResponse.ok ? await versionResponse.json() : null;
        
        const latestVersionDocIds = versionData?.document_ids || [];
        const latestVersionNumber = versionData?.version_number || 0;
        const latestVersionCreatedAt = versionData?.created_at ? new Date(versionData.created_at).getTime() : null;
        const nextVersionNumber = latestVersionNumber + 1;

        // Fetch all case documents
        const docsResponse = await fetch(`/api/cases/${caseId}/documents`);
        const docsData = docsResponse.ok ? await docsResponse.json() : null;
        const allDocs = docsData?.documents || [];
        const allDocIds = allDocs.map((d: { id: string }) => d.id);

        // Compute new documents not in latest version
        const latestVersionDocIdsSet = new Set(latestVersionDocIds);
        const newDocIds = allDocIds.filter((id: string) => !latestVersionDocIdsSet.has(id));
        
        // Additional check: only count documents created AFTER the last analysis version
        // This prevents false positives when documents exist but weren't included in analysis
        let genuinelyNewDocIds: string[] = [];
        if (latestVersionCreatedAt) {
          genuinelyNewDocIds = newDocIds.filter((id: string) => {
            const doc = allDocs.find((d: { id: string }) => d.id === id);
            if (!doc || !doc.created_at) return true; // Include if timestamp unknown (conservative)
            const docCreatedAt = new Date(doc.created_at).getTime();
            return docCreatedAt > latestVersionCreatedAt;
          });
        } else {
          // No previous version - all new docs are genuinely new
          genuinelyNewDocIds = newDocIds;
        }
        
        const newDocCountValue = genuinelyNewDocIds.length;

        // DEV-only logging
        if (process.env.NODE_ENV !== "production") {
          console.log("[NewEvidenceBanner] Delta calculation:", {
            caseId,
            docCount: allDocs.length,
            latestVersionNumber,
            latestVersionCreatedAt: latestVersionCreatedAt ? new Date(latestVersionCreatedAt).toISOString() : null,
            latestVersionDocIds: latestVersionDocIds.length,
            newDocIds: newDocIds.length,
            genuinelyNewDocIds: genuinelyNewDocIds.length,
            newestDocumentTimestamp: allDocs.length > 0 
              ? Math.max(...allDocs.map((d: { created_at?: string }) => d.created_at ? new Date(d.created_at).getTime() : 0))
              : null,
          });
        }

        setNewDocCount(newDocCountValue);
        setNextVersion(nextVersionNumber);
      } catch (err) {
        console.error("Failed to check for new evidence:", err);
      } finally {
        setLoading(false);
      }
    }

    checkNewEvidence();
  }, [caseId]);

  if (loading || newDocCount === null || newDocCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-accent">
              New evidence added (+{newDocCount}). Re-analyse to include it in version v{nextVersion}.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => {
            // Trigger the EvidenceStrategyHeader button click to open the modal
            const header = document.querySelector('[data-evidence-strategy-header]');
            const button = header?.querySelector('button');
            if (button) {
              (button as HTMLButtonElement).click();
            } else {
              // Fallback: scroll to header if button not found
              if (header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }} 
          size="sm" 
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Re-analyse now
        </Button>
      </div>
    </Card>
  );
}

