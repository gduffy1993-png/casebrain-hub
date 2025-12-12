/**
 * Owner Identification
 * 
 * Centralized owner check with hardcoded fallback for safety.
 * This ensures the owner is ALWAYS exempt, even if env vars fail.
 */

import "server-only";

/**
 * Get list of owner user IDs
 * Includes both env var and hardcoded fallback
 */
export function getOwnerUserIds(): string[] {
  // Read from env
  const fromEnv = process.env.APP_OWNER_USER_IDS ?? "";
  const envIds = fromEnv
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

  // Hardcoded fallback for safety (ALWAYS included)
  const hardcoded = ["user_35JeizOJrQ0Nj"];

  // Ensure there are no duplicates
  return Array.from(new Set([...envIds, ...hardcoded]));
}

/**
 * Check if a user is an owner
 * Returns true if userId matches any owner ID (from env or hardcoded)
 */
export function isOwnerUser(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }

  const owners = getOwnerUserIds();
  const isOwner = owners.includes(userId);

  if (isOwner) {
    console.log(`[paywall] ✅ Owner user detected: ${userId}`);
  }

  return isOwner;
}

/**
 * Get owner emails from env (for email-based owner check)
 */
export function getOwnerEmails(): string[] {
  const fromEnv = process.env.APP_OWNER_EMAILS ?? "";
  return fromEnv
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

