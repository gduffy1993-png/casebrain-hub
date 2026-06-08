"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Optional alias: /dashboard?view=courtToday → /court-today */
export function CourtTodayDashboardRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("view") === "courtToday") {
      router.replace("/court-today");
    }
  }, [searchParams, router]);

  return null;
}
