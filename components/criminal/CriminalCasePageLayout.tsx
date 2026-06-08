"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { CaseFilesCompactStrip } from "./CaseFilesCompactStrip";
import { resolveControlRoomFromSearchParams } from "./criminalCaseNavigation";
import { usePilotDocumentsTabActive } from "@/components/criminal/workflow/useCaseWorkflowActiveTab";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import type { CaseWorkflowDocument } from "@/components/criminal/workflow/caseWorkflowDocuments";

function useControlRoomActive(): boolean {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(true);

  useEffect(() => {
    setActive(resolveControlRoomFromSearchParams(searchParams));
  }, [searchParams]);

  return active;
}

export function CriminalCasePageLayout({
  children,
  documents,
  rightAside,
}: {
  children: ReactNode;
  documents: CaseWorkflowDocument[];
  rightAside?: ReactNode;
}) {
  const controlRoom = useControlRoomActive();
  const pilotDocumentsTab = usePilotDocumentsTabActive();
  const hideBottomFilesStrip = isCriminalPilotMode() && pilotDocumentsTab;

  if (controlRoom) {
    return (
      <div
        className="w-full space-y-4 xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px]"
        data-layout="control-room"
        data-documents-focus={pilotDocumentsTab ? "true" : undefined}
      >
        {children}
        {!hideBottomFilesStrip ? <CaseFilesCompactStrip documents={documents} /> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr_320px]" data-layout="classic-criminal">
      <aside className="space-y-4">
        <Card title="Case Files" className="border-slate-200 bg-white shadow-sm">
          <CaseFilesList documents={documents} />
        </Card>
      </aside>
      <main className="space-y-4">{children}</main>
      {rightAside ? <aside className="space-y-4">{rightAside}</aside> : <aside className="space-y-4" />}
    </div>
  );
}
