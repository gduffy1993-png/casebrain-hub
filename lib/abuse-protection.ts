import "server-only";
import { getSupabaseAdminClient } from "./supabase";
import { headers } from "next/headers";

/**
 * Get client IP from request headers
 */
async function getClientIP(): Promise<string | null> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIP = headersList.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || null;
}

/**
 * Check if IP has exceeded signup rate limit (3 signups in 24 hours)
 */
export async function checkSignupRateLimit(): Promise<{
  allowed: boolean;
  ip?: string;
}> {
  const ip = await getClientIP();

  if (!ip) {
    // If we can't determine IP, allow but log warning
    console.warn("[abuse-protection] Could not determine client IP");
    return { allowed: true };
  }

  const supabase = getSupabaseAdminClient();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("abuse_tracker")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", twentyFourHoursAgo);

  if (error) {
    console.error("[abuse-protection] Failed to check rate limit:", error);
    // On error, allow but log
    return { allowed: true, ip };
  }

  const signupCount = count ?? 0;

  if (signupCount >= 3) {
    return { allowed: false, ip };
  }

  return { allowed: true, ip };
}

/**
 * Record a signup attempt
 */
export async function recordSignupAttempt(ip: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  await supabase.from("abuse_tracker").insert({
    ip,
  });
}

/**
 * Lock organisation due to abuse detection
 */
export async function lockOrganisationForAbuse(
  organisationId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("organisations")
    .update({ plan: "LOCKED" })
    .eq("id", organisationId);
}

