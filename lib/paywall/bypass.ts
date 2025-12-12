/**
 * Paywall Bypass Helpers
 * 
 * These functions check if the paywall should be bypassed BEFORE any database calls.
 * They must be called FIRST in any paywall check flow.
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { isOwnerUser, getOwnerUserIds } from "./owner";

/**
 * Check if dev mode bypass is active
 * Returns true if BYPASS_PAYWALL_IN_DEV=true and NODE_ENV=development
 */
export function isDevBypassActive(): boolean {
  const isDev = process.env.NODE_ENV === "development";
  const bypassInDev = process.env.BYPASS_PAYWALL_IN_DEV;
  
  if (!isDev) {
    return false;
  }
  
  // Check multiple formats: "true", "1", "yes"
  if (bypassInDev === "true" || bypassInDev === "1" || bypassInDev?.toLowerCase() === "yes") {
    return true;
  }
  
  return false;
}

/**
 * Check if a user is an owner (by user ID only - no DB calls)
 * This is the FASTEST check and should be done first
 * Uses the centralized owner.ts helper with hardcoded fallback
 */
export function isOwnerByUserId(userId: string): boolean {
  return isOwnerUser(userId);
}

/**
 * Check if a user is an owner by email
 * Requires a database call to get the user's email, so use this only if userId check fails
 */
export async function isOwnerByEmail(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  
  const ownerEmailsRaw = process.env.APP_OWNER_EMAILS || "";
  const ownerEmails = ownerEmailsRaw
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (ownerEmails.length === 0) {
    return false;
  }
  
  try {
    const supabase = getSupabaseAdminClient();
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const userEmail = user?.user?.email?.toLowerCase();
    
    if (userEmail && ownerEmails.includes(userEmail)) {
      console.log(`[paywall] ✅ Owner bypass active for email: ${userEmail}`);
      return true;
    }
  } catch (error) {
    console.warn(`[paywall] ⚠️ Could not check owner email for userId ${userId}:`, error);
  }
  
  return false;
}

/**
 * Check if user should bypass paywall (checks all methods)
 * Returns true if user is owner OR dev bypass is active
 * 
 * This function checks in order:
 * 1. Owner by userId (fastest, no DB calls, hardcoded fallback)
 * 2. Dev bypass (no DB calls)
 * 3. Owner by email (slower, requires DB call)
 * 
 * Use this function FIRST before any other paywall checks.
 */
export async function shouldBypassPaywall(userId?: string): Promise<boolean> {
  // DEBUG LOGGING
  console.log("[paywall] DEBUG", {
    userId: userId || "NO_USER_ID",
    envOwnerIds: getOwnerUserIds(),
    isOwner: userId ? isOwnerUser(userId) : false,
    nodeEnv: process.env.NODE_ENV,
  });
  
  // If no userId, can't check owner status
  if (!userId) {
    return false;
  }
  
  // Check owner by userId FIRST (fastest, no DB calls, has hardcoded fallback)
  if (isOwnerByUserId(userId)) {
    console.log(`[paywall] ✅ Owner bypass active for userId: ${userId}`);
    return true;
  }
  
  // Check dev bypass (no DB calls needed)
  if (isDevBypassActive()) {
    console.log("[paywall] ✅ Dev bypass active");
    return true;
  }
  
  // Check owner by email (slower, requires DB call)
  if (await isOwnerByEmail(userId)) {
    return true;
  }
  
  return false;
}

