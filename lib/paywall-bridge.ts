import "server-only";
import { getCurrentUser } from "./auth";
import {
  getOrCreateOrganisationForUser,
  ensureOrganisationMembership,
  getCurrentOrganisationForUser,
  hasPhoneUsedTrial,
  markPhoneTrialUsed,
  type Organisation,
} from "./organisations";
import { assertPhoneVerified, getNormalizedPhoneNumber } from "./phone-verification";
import {
  checkPDFUploadLimit,
  checkCaseCreationLimit,
  incrementPDFUploadCounter,
  updateActiveCaseCount,
  type UsageLimitError,
} from "./usage-limits";

/**
 * Get organisation for current user (creates if needed)
 * This bridges the new organisation system with existing auth
 */
export async function getOrEnsureOrganisation(): Promise<Organisation> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get or create organisation
  const org = await getOrCreateOrganisationForUser(user);

  // Ensure membership
  await ensureOrganisationMembership(user.id, org.id);

  return org;
}

/**
 * Check if user can upload PDFs (phone verification + usage limits)
 */
export async function canUploadPDF(): Promise<{
  allowed: boolean;
  error?: UsageLimitError;
  limit?: number;
  plan?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false, error: "PHONE_NOT_VERIFIED" };
  }

  // Check phone verification
  try {
    assertPhoneVerified(user);
  } catch (error) {
    if (error instanceof Error && error.message === "PHONE_NOT_VERIFIED") {
      return { allowed: false, error: "PHONE_NOT_VERIFIED" };
    }
    throw error;
  }

  // Check phone trial usage
  const phoneNumber = getNormalizedPhoneNumber(user);
  if (phoneNumber) {
    const phoneUsed = await hasPhoneUsedTrial(phoneNumber);
    if (phoneUsed) {
      // Phone has been used - check if org is locked
      const org = await getCurrentOrganisationForUser(user.id);
      if (org && org.plan === "FREE") {
        // Lock the org
        const supabase = (await import("./supabase")).getSupabaseAdminClient();
        await supabase
          .from("organisations")
          .update({ plan: "LOCKED" })
          .eq("id", org.id);
      }
    } else {
      // Mark phone as used
      const org = await getOrEnsureOrganisation();
      await markPhoneTrialUsed(phoneNumber, org.id);
    }
  }

  // Get organisation and check limits
  const org = await getOrEnsureOrganisation();
  const limitCheck = await checkPDFUploadLimit(org.id, org.plan);

  return limitCheck;
}

/**
 * Check if user can create a case (phone verification + usage limits)
 */
export async function canCreateCase(): Promise<{
  allowed: boolean;
  error?: UsageLimitError;
  limit?: number;
  plan?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { allowed: false, error: "PHONE_NOT_VERIFIED" };
  }

  // Check phone verification
  try {
    assertPhoneVerified(user);
  } catch (error) {
    if (error instanceof Error && error.message === "PHONE_NOT_VERIFIED") {
      return { allowed: false, error: "PHONE_NOT_VERIFIED" };
    }
    throw error;
  }

  // Get organisation and check limits
  const org = await getOrEnsureOrganisation();
  const limitCheck = await checkCaseCreationLimit(org.id, org.plan);

  return limitCheck;
}

/**
 * Record PDF upload (increment counter)
 */
export async function recordPDFUpload(): Promise<void> {
  const org = await getOrEnsureOrganisation();
  await incrementPDFUploadCounter(org.id);
}

/**
 * Record case creation/update (update active case count)
 */
export async function recordCaseChange(): Promise<void> {
  const org = await getOrEnsureOrganisation();
  await updateActiveCaseCount(org.id);
}

