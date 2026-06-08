import "server-only";

// Simplified user interface for phone verification
export interface UserWithPhone {
  primaryPhoneNumber?: {
    phoneNumber?: string;
    verification?: {
      status?: string;
    } | null;
  } | null;
}

/**
 * Assert that user has verified phone number
 */
export function assertPhoneVerified(user: UserWithPhone): void {
  const phone = user.primaryPhoneNumber;

  if (!phone) {
    throw new Error("PHONE_NOT_VERIFIED");
  }

  if (phone.verification?.status !== "verified") {
    throw new Error("PHONE_NOT_VERIFIED");
  }
}

/**
 * Get normalized phone number from user
 */
export function getNormalizedPhoneNumber(user: UserWithPhone): string | null {
  const phone = user.primaryPhoneNumber;
  if (!phone || phone.verification?.status !== "verified") {
    return null;
  }

  if (!phone.phoneNumber) {
    return null;
  }

  // Normalize phone number (remove spaces, dashes, etc.)
  return phone.phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
}

