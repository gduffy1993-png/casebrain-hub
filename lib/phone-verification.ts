import "server-only";
import type { User } from "@clerk/nextjs/server";

/**
 * Assert that user has verified phone number
 */
export function assertPhoneVerified(user: User): void {
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
export function getNormalizedPhoneNumber(user: User): string | null {
  const phone = user.primaryPhoneNumber;
  if (!phone || phone.verification?.status !== "verified") {
    return null;
  }

  // Normalize phone number (remove spaces, dashes, etc.)
  return phone.phoneNumber.replace(/\s+/g, "").replace(/-/g, "");
}

