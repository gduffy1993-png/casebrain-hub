"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { CaseFilesCompactStrip } from "./CaseFilesCompactStrip";
import { resolveControlRoomFromSearchParams } from "./criminalCaseNavigation";

type CaseFileDocument = {
  id: string;
  name: string;
  created_at: string;
  type?: string | null;
  extractionStatus?: "full" | "summary_only" | "no_text";
  extractionMessage?: string;
};

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
  documents: CaseFileDocument[];
  rightAside?: ReactNode;
}) {
  const controlRoom = useControlRoomActive();

  if (controlRoom) {
    return (
      <div className="w-full max-w-[100%] space-y-4" data-layout="control-room">
        {children}
        <CaseFilesCompactStrip documents={documents} />
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
