/**
 * Owner Identification
 * 
 * BULLETPROOF owner check with hardcoded values that ALWAYS work,
 * regardless of env vars. This ensures the owner is NEVER blocked.
 */

import "server-only";

/**
 * HARD-CODED owner emails (ALWAYS checked first)
 */
export const HARD_CODED_OWNER_EMAILS = ["gduffy1993@gmail.com"];

/**
 * HARD-CODED owner user IDs (ALWAYS checked first)
 */
export const HARD_CODED_OWNER_IDS = ["user_36MvlAIQ5MUheoRwWsj61gkOO5H"];

/**
 * Check if a user is an owner
 * 
 * Checks BOTH email and userId against hardcoded lists first,
 * then falls back to env vars as backup.
 * 
 * @param opts - User identification (userId and/or email)
 * @returns true if user is an owner
 */
export function isOwnerUser(opts: { userId?: string | null; email?: string | null }): boolean {
  const userId = opts.userId ?? null;
  const email = opts.email?.toLowerCase() ?? null;

  // 1) Hard-coded email + ID always win (checked FIRST)
  if (email && HARD_CODED_OWNER_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    console.log(`[paywall] ✅ Owner detected by HARDCODED email: ${email}`);
    return true;
  }
  
  if (userId && HARD_CODED_OWNER_IDS.includes(userId)) {
    console.log(`[paywall] ✅ Owner detected by HARDCODED userId: ${userId}`);
    return true;
  }

  // 2) Env-based owner lists as backup (only if hardcoded didn't match)
  const envEmailStr = process.env.APP_OWNER_EMAILS ?? "";
  const envIdStr = process.env.APP_OWNER_USER_IDS ?? "";

  const envEmails = envEmailStr
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const envIds = envIdStr
    .split(",")
    .map(e => e.trim())
    .filter(Boolean);

  if (email && envEmails.includes(email)) {
    console.log(`[paywall] ✅ Owner detected by ENV email: ${email}`);
    return true;
  }
  
  if (userId && envIds.includes(userId)) {
    console.log(`[paywall] ✅ Owner detected by ENV userId: ${userId}`);
    return true;
  }

  return false;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use isOwnerUser({ userId, email }) instead
 */
export function getOwnerUserIds(): string[] {
  const fromEnv = process.env.APP_OWNER_USER_IDS ?? "";
  const envIds = fromEnv
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);
  
  return Array.from(new Set([...HARD_CODED_OWNER_IDS, ...envIds]));
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use isOwnerUser({ userId, email }) instead
 */
export function getOwnerEmails(): string[] {
  const fromEnv = process.env.APP_OWNER_EMAILS ?? "";
  const envEmails = fromEnv
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  
  return Array.from(new Set([...HARD_CODED_OWNER_EMAILS.map(e => e.toLowerCase()), ...envEmails]));
}
