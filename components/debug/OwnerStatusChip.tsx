"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";

const DEBUG_STORAGE_KEY = "casebrain_show_debug_bar";

/**
 * Owner Debug Chip
 * Only visible when debug is on: ?debug=1 in URL or "Show debug bar" in Settings (localStorage).
 * Only shown to the owner user.
 */
export function OwnerStatusChip() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const searchParams = useSearchParams();
  const { isOwner, bypassActive, plan } = usePaywallStatus();

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || undefined,
        });
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const urlDebug = searchParams.get("debug") === "1";
    const stored = typeof window !== "undefined" && localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
    setDebugEnabled(Boolean(urlDebug || stored));
  }, [searchParams]);

  const OWNER_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID ? [process.env.NEXT_PUBLIC_ADMIN_USER_ID] : [];
  const OWNER_EMAILS = ["gduffy1993@gmail.com"];
  const isOwnerUser = user && (OWNER_USER_IDS.includes(user.id) || (user.email && OWNER_EMAILS.includes(user.email.toLowerCase())));

  if (!user || !isOwnerUser || !debugEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] rounded-full bg-yellow-500/90 dark:bg-yellow-600/90 px-4 py-2 text-xs font-mono text-black shadow-lg border-2 border-yellow-600">
      <div className="flex items-center gap-2">
        <span className="font-bold">OWNER DEBUG</span>
        <span>·</span>
        <span>userId={user.id}</span>
        <span>·</span>
        <span>email={user.email || "N/A"}</span>
        <span>·</span>
        <span className={isOwner ? "text-green-800 font-bold" : "text-red-800 font-bold"}>
          isOwner={String(isOwner)}
        </span>
        <span>·</span>
        <span className={bypassActive ? "text-green-800 font-bold" : "text-red-800 font-bold"}>
          bypassActive={String(bypassActive)}
        </span>
        <span>·</span>
        <span>plan={plan}</span>
      </div>
    </div>
  );
}

