"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { buildDemoPresentationCaseHref } from "@/lib/criminal/demo-presentation-polish";
import { isDemoPresentationEmail } from "@/lib/pilot-mode";

/** Redirect Loom/QA demo accounts away from empty Court Today to Taylor Overview. */
export function DemoPresentationLandingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname !== "/court-today") return;
    if (searchParams.get("case")) return;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (cancelled || !email || !isDemoPresentationEmail(email)) return;
      router.replace(buildDemoPresentationCaseHref());
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  return null;
}
