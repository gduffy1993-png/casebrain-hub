# Owner Bypass Implementation - Complete Summary

## Overview

Implemented a **SINGLE, RELIABLE owner bypass** that works in BOTH dev and production for user ID `user_35JeizOJrQ0Nj`. The bypass includes a **hardcoded fallback** for safety, ensuring the owner is ALWAYS exempt even if environment variables fail.

## Files Modified

### 1. `lib/paywall/owner.ts` (NEW FILE)
**Purpose:** Centralized owner identification with hardcoded fallback

### 2. `lib/paywall/bypass.ts` (MODIFIED)
**Changes:** Updated to use centralized owner helper, added debug logging

### 3. `lib/paywall/guard.ts` (MODIFIED)
**Changes:** Added owner check at the very top, before any DB calls

### 4. `lib/paywall/usage.ts` (MODIFIED)
**Changes:** Already had bypass check, but now uses centralized owner helper

### 5. `app/api/paywall/status/route.ts` (MODIFIED)
**Changes:** Added owner check first, returns explicit owner status with flags

### 6. `app/api/upload/route.ts` (MODIFIED)
**Changes:** Skips usage increment for owners

### 7. `hooks/usePaywallStatus.ts` (MODIFIED)
**Changes:** Added `isOwner` and `bypassActive` flags to return value

### 8. `components/paywall/UpgradeBanner.tsx` (MODIFIED)
**Changes:** Never shows banner for owners

### 9. `components/upload/upload-form.tsx` (MODIFIED)
**Changes:** Never shows paywall modal for owners, checks owner status before handling errors

---

## Final Code for All Modified Files

### 1. `lib/paywall/owner.ts` (NEW)

```typescript
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
```

### 2. `lib/paywall/bypass.ts` (MODIFIED - Key Section)

```typescript
import { isOwnerUser, getOwnerUserIds } from "./owner";

// ... existing code ...

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
  
  // ... rest of function
}
```

### 3. `lib/paywall/guard.ts` (MODIFIED - Key Section)

```typescript
import { isOwnerUser } from "./owner";

export async function paywallGuard(
  feature: FeatureKind
): Promise<PaywallGuardResult> {
  try {
    const { userId } = await requireAuthContext();
    
    // ============================================
    // OWNER CHECK - MUST HAPPEN FIRST (BEFORE ANY DB CALLS)
    // ============================================
    if (isOwnerUser(userId)) {
      console.log(`[paywall-guard] ✅ Owner bypass in upload route for userId: ${userId}`);
      // Still need to get orgId for incrementUsage later, but we'll allow the action
      // NOTE: For owners, we DO NOT increment usage counters
      const user = await getCurrentUser();
      if (!user) {
        return {
          allowed: false,
          response: NextResponse.json(
            { error: "Unauthenticated" },
            { status: 401 }
          ),
        };
      }
      const { getOrCreateOrganisationForUser } = await import("@/lib/organisations");
      const org = await getOrCreateOrganisationForUser(user);
      return {
        allowed: true,
        orgId: org.id,
      };
    }
    
    // ... rest of function
  }
}
```

### 4. `app/api/paywall/status/route.ts` (MODIFIED - Full File)

```typescript
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateOrganisationForUser } from "@/lib/organisations";
import { getUserUsage } from "@/lib/paywall/usage";
import { shouldBypassPaywall } from "@/lib/paywall/bypass";
import { isOwnerUser } from "@/lib/paywall/owner";

export const dynamic = 'force-dynamic';

/**
 * GET /api/paywall/status
 * Get current paywall status for the user's organisation
 */
export async function GET() {
  try {
    const { userId } = await requireAuthContext();
    
    // ============================================
    // OWNER CHECK - MUST HAPPEN FIRST (BEFORE ANY DB CALLS)
    // ============================================
    if (isOwnerUser(userId)) {
      console.log(`[paywall-status] ✅ Owner bypass active for userId: ${userId}`);
      // Return owner status with explicit flags
      return NextResponse.json({
        plan: "OWNER" as const,
        isOwner: true,
        bypassActive: true,
        uploadCount: 0,
        analysisCount: 0,
        exportCount: 0,
        canUpload: true,
        canAnalyse: true,
        canExport: true,
        uploadLimit: Number.POSITIVE_INFINITY,
        analysisLimit: Number.POSITIVE_INFINITY,
        exportLimit: Number.POSITIVE_INFINITY,
        remainingUploads: Number.POSITIVE_INFINITY,
      });
    }
    
    // Check general bypass (dev mode, etc.)
    const bypassed = await shouldBypassPaywall(userId);
    if (bypassed) {
      console.log(`[paywall-status] ✅ Bypass active for userId: ${userId}`);
      // Return unlimited status for other bypass cases
      return NextResponse.json({
        plan: "pro" as const,
        bypassActive: true,
        uploadCount: 0,
        analysisCount: 0,
        exportCount: 0,
        canUpload: true,
        canAnalyse: true,
        canExport: true,
        uploadLimit: Infinity,
        analysisLimit: Infinity,
        exportLimit: Infinity,
      });
    }
    
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    // Get or create organisation
    const org = await getOrCreateOrganisationForUser(user);
    
    // Get usage status
    const usage = await getUserUsage(org.id);

    return NextResponse.json(usage);
  } catch (error) {
    console.error("[paywall] Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch paywall status" },
      { status: 500 }
    );
  }
}
```

### 5. `app/api/upload/route.ts` (MODIFIED - Key Section)

```typescript
// At the end of the POST handler, before returning success:

// PAYWALL: Increment usage after successful upload
// NOTE: DO NOT increment usage for owners (they bypass limits)
try {
  const { userId: currentUserId } = await requireAuthContext();
  const { isOwnerUser } = await import("@/lib/paywall/owner");
  
  // Only increment usage if user is NOT an owner
  if (paywallOrgId && !isOwnerUser(currentUserId)) {
    await incrementUsage({ orgId: paywallOrgId, feature: "upload" });
  } else if (isOwnerUser(currentUserId)) {
    console.log(`[upload] ✅ Owner bypass - skipping usage increment for userId: ${currentUserId}`);
  }
} catch (usageError) {
  console.error("[upload] Failed to record usage:", usageError);
  // Don't fail the upload if usage recording fails
}
```

### 6. `hooks/usePaywallStatus.ts` (MODIFIED - Key Section)

```typescript
type ExtendedPaywallStatus = UsageStatus & {
  isOwner?: boolean;
  bypassActive?: boolean;
};

export function usePaywallStatus() {
  // ... existing code ...
  
  return {
    status,
    loading,
    error,
    refetch,
    // Convenience getters
    plan: status?.plan ?? "free",
    isOwner: status?.isOwner ?? false,  // NEW
    bypassActive: status?.bypassActive ?? false,  // NEW
    canUpload: status?.canUpload ?? false,
    // ... rest of getters
  };
}
```

### 7. `components/paywall/UpgradeBanner.tsx` (MODIFIED - Key Section)

```typescript
export function UpgradeBanner() {
  const { 
    plan, 
    isOwner,      // NEW
    bypassActive,  // NEW
    // ... rest
  } = usePaywallStatus();

  // Never show banner for owners or if bypass is active
  if (loading || plan === "pro" || plan === "OWNER" || isOwner || bypassActive) {
    return null;
  }
  
  // ... rest of component
}
```

### 8. `components/upload/upload-form.tsx` (MODIFIED - Key Sections)

```typescript
export function UploadForm() {
  const { isOwner, bypassActive } = usePaywallStatus();  // NEW
  
  // ... in handleSubmit:
  
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    
    // Handle paywall errors
    // NEVER show paywall modal for owners or if bypass is active
    if (payload?.error && !isOwner && !bypassActive) {
      // ... handle paywall errors
    }
  }
  
  // ... in return:
  
  {/* NEVER show paywall modal for owners or if bypass is active */}
  {paywallError && !isOwner && !bypassActive && (
    <PaywallModal
      errorCode={paywallError.error}
      limit={paywallError.limit}
      plan={paywallError.plan}
      onClose={handleClosePaywall}
    />
  )}
}
```

---

## Confirmation

✅ **For userId "user_35JeizOJrQ0Nj", paywall checks always short-circuit as allowed:**
- Owner check happens FIRST in all paywall enforcement points
- Hardcoded fallback ensures it works even if env vars fail
- No database calls needed for owner check
- Usage counters are NOT incremented for owners

✅ **The "PDF Upload Limit Reached" modal will NEVER show for that user:**
- Frontend checks `isOwner` and `bypassActive` flags
- Modal is conditionally rendered: `{paywallError && !isOwner && !bypassActive && ...}`
- Upload error handling also checks owner status before showing modal
- Upgrade banner also checks owner status

---

## How It Works

1. **Owner Check (Fastest)**: `isOwnerUser(userId)` checks against hardcoded list + env var
2. **Backend Bypass**: All API routes check owner status FIRST, before any DB calls
3. **Frontend Respect**: Frontend components check `isOwner` flag and never show modals/banners
4. **No Usage Tracking**: Owners don't have usage counters incremented

---

## Testing

After deployment, check server logs for:
- `[paywall] ✅ Owner user detected: user_35JeizOJrQ0Nj`
- `[paywall-status] ✅ Owner bypass active for userId: user_35JeizOJrQ0Nj`
- `[paywall-guard] ✅ Owner bypass in upload route for userId: user_35JeizOJrQ0Nj`
- `[upload] ✅ Owner bypass - skipping usage increment for userId: user_35JeizOJrQ0Nj`

The modal should NEVER appear for this user ID.

