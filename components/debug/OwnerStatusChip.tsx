"use client";

import { useUser } from "@clerk/nextjs";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";

/**
 * Owner Debug Chip
 * 
 * Shows owner status and paywall flags for debugging.
 * Only visible to the owner user (user_35JeizOJrQ0Nj).
 */
export function OwnerStatusChip() {
  const { user } = useUser();
  const { isOwner, bypassActive, plan, status } = usePaywallStatus();

  // Only show for the owner user
  const OWNER_USER_IDS = ["user_36MvlAIQ5MUheoRwWsj61gkOO5H", "user_35JeizOJrQ0Nj"]; // Support both IDs
  
  if (!user || !OWNER_USER_IDS.includes(user.id)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] rounded-full bg-yellow-500/90 dark:bg-yellow-600/90 px-4 py-2 text-xs font-mono text-black shadow-lg border-2 border-yellow-600">
      <div className="flex items-center gap-2">
        <span className="font-bold">OWNER DEBUG</span>
        <span>·</span>
        <span>userId={user.id}</span>
        <span>·</span>
        <span>email={user.primaryEmailAddress?.emailAddress || "N/A"}</span>
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

