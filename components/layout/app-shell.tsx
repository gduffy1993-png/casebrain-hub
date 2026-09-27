"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TrialStatusBanner } from "./TrialStatusBanner";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { useDemoOverviewShell } from "@/components/criminal/demo-shell/useDemoOverviewShell";

type AppShellProps = {
  children: ReactNode;
};

function AppShellInner({ children }: AppShellProps) {
  const pilotMode = isCriminalPilotMode();
  const demoShell = useDemoOverviewShell();
  const lightWorkspace = demoShell || !pilotMode;

  return (
    <div
      className={`flex min-h-screen overflow-x-hidden ${
        demoShell ? "bg-slate-100" : pilotMode ? "bg-slate-950" : "bg-slate-100"
      }`}
      data-demo-shell={demoShell ? "true" : undefined}
    >
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {demoShell ? null : <Topbar />}
        <TrialStatusBanner />
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${
            lightWorkspace ? "text-slate-900 bg-slate-50" : "text-slate-100 bg-slate-950"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Suspense fallback={null}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
