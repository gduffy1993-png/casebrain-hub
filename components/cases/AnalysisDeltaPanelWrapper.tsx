"use client";

import { useState, useEffect } from "react";
import { AnalysisDeltaPanel } from "./AnalysisDeltaPanel";

type AnalysisDeltaPanelWrapperProps = {
  caseId: string;
};

export function AnalysisDeltaPanelWrapper({ caseId }: AnalysisDeltaPanelWrapperProps) {
  const [delta, setDelta] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Fetch latest version to get delta
    fetch(`/api/cases/${caseId}/analysis/versions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.versions && data.versions.length > 0) {
          const latestVersion = data.versions[0];
          // Fetch full version to get delta
          fetch(`/api/cases/${caseId}/analysis/versions/${latestVersion.versionNumber}`)
            .then((res) => res.json())
            .then((versionData) => {
              if (versionData.version?.analysisDelta) {
                setDelta(versionData.version.analysisDelta);
              }
            })
            .catch(console.error);
        }
      })
      .catch(console.error);
  }, [caseId]);

  if (dismissed || !delta) {
    return null;
  }

  return <AnalysisDeltaPanel delta={delta} onDismiss={() => setDismissed(true)} />;
}

