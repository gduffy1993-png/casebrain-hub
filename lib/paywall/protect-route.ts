/**
 * Paywall Route Protection Helper
 * 
 * Wrapper function to protect API routes with paywall checks
 */

import { NextResponse } from "next/server";
import { paywallGuard } from "./guard";
import { incrementUsage } from "./usage";
import type { FeatureKind } from "./config";

/**
 * Protect an API route handler with paywall
 * 
 * Usage:
 * ```ts
 * export async function GET(request: Request) {
 *   return await withPaywall("analysis", async (orgId) => {
 *     // Your route logic here
 *     // orgId is the actual organisation UUID
 *     
 *     // ... do analysis ...
 *     
 *     // Usage is automatically incremented on success
 *     return NextResponse.json({ result: "..." });
 *   });
 * }
 * ```
 */
export async function withPaywall<T = NextResponse>(
  feature: FeatureKind,
  handler: (orgId: string) => Promise<T>
): Promise<T | NextResponse> {
  const guard = await paywallGuard(feature);
  
  if (!guard.allowed || !guard.orgId) {
    return guard.response!;
  }

  try {
    const result = await handler(guard.orgId);
    
    // Increment usage on success
    try {
      await incrementUsage({ orgId: guard.orgId, feature });
    } catch (usageError) {
      console.error(`[paywall] Failed to increment ${feature} usage:`, usageError);
      // Don't fail the request if usage recording fails
    }
    
    return result;
  } catch (error) {
    console.error(`[paywall] Handler error for ${feature}:`, error);
    throw error;
  }
}

