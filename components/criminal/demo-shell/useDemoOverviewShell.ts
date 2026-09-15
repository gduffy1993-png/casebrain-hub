"use client";

import { useSearchParams } from "next/navigation";
import { resolveDemoOverviewShellFromSearchParams } from "@/lib/criminal/demo-overview-shell-flag";

/** Client flag for demo Overview shell (presentation only). */
export function useDemoOverviewShell(): boolean {
  const searchParams = useSearchParams();
  return resolveDemoOverviewShellFromSearchParams(searchParams);
}
