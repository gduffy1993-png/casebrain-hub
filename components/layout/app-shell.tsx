import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { TrialStatusBanner } from "./TrialStatusBanner";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <TrialStatusBanner />
        <main className="flex-1 overflow-y-auto px-6 py-5 lg:px-8 lg:py-6 text-slate-900 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

