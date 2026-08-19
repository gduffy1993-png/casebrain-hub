import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TrialStatusBanner } from "./TrialStatusBanner";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pilotMode = isCriminalPilotMode();
  return (
    <div className={`flex min-h-screen overflow-x-hidden ${pilotMode ? "bg-slate-950" : "bg-slate-100"}`}>
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        <Topbar />
        <TrialStatusBanner />
        <main
          className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${
            pilotMode ? "text-slate-100 bg-slate-950" : "text-slate-900 bg-slate-50"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

