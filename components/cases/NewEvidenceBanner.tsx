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
        const nextVersionNumber = latestVersionNumber + 1;

        // Fetch all case documents
        const docsResponse = await fetch(`/api/cases/${caseId}/documents`);
        const docsData = docsResponse.ok ? await docsResponse.json() : null;
        const allDocIds = (docsData?.documents || []).map((d: { id: string }) => d.id);

        // Compute new documents not in latest version
        const latestVersionDocIdsSet = new Set(latestVersionDocIds);
        const newDocIds = allDocIds.filter((id: string) => !latestVersionDocIdsSet.has(id));
        const newDocCountValue = newDocIds.length;

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

