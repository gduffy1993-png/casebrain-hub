import "server-only";
import { getSupabaseAdminClient } from "./supabase";
import type { User } from "@clerk/nextjs/server";

// Generic email providers that should create personal workspaces
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "live.com",
  "msn.com",
  "ymail.com",
]);

export type OrganisationPlan = "FREE" | "LOCKED" | "PAID_MONTHLY" | "PAID_YEARLY";

export interface Organisation {
  id: string;
  name: string;
  email_domain: string | null;
  plan: OrganisationPlan;
  created_at: string;
  updated_at: string;
}

export interface OrganisationMember {
  id: string;
  organisation_id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  created_at: string;
}

/**
 * Extract email domain from user's primary email
 */
function extractEmailDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase().trim();
}

/**
 * Format domain name for organisation name (e.g., "smithsolicitors.co.uk" -> "Smith Solicitors")
 */
function formatDomainAsOrgName(domain: string): string {
  // Remove TLD (.co.uk, .com, etc.)
  const withoutTld = domain
    .replace(/\.(co\.uk|com|org|net|io|uk|us)$/i, "")
    .replace(/\.(com|org|net|io|uk|us)$/i, "");

  // Split by dots and capitalize each word
  const parts = withoutTld.split(".");
  const formatted = parts
    .map((part) => {
      // Capitalize first letter of each word
      return part
        .split(/(?=[A-Z])|[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    })
    .join(" ");

  return formatted || domain;
}

/**
 * Get or create organisation for a user based on their email domain
 * 
 * Rules:
 * - Generic email domains (gmail.com, etc.) → personal org with email_domain = null
 * - Business domains → shared org by domain
 * - If org exists and plan = LOCKED → user joins but gets no free trial
 */
export async function getOrCreateOrganisationForUser(
  user: User,
): Promise<Organisation> {
  const supabase = getSupabaseAdminClient();
  const email = user.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Error("User must have an email address");
  }

  const domain = extractEmailDomain(email);
  if (!domain) {
    throw new Error("Invalid email address format");
  }

  // Check if domain is generic (personal email)
  const isGenericDomain = GENERIC_EMAIL_DOMAINS.has(domain);

  if (isGenericDomain) {
    // Create personal organisation
    const firstName = user.firstName || "User";
    const orgName = `${firstName} Personal Workspace`;

    // Check if user already has a personal org
    const { data: existingPersonal } = await supabase
      .from("organisations")
      .select("*")
      .eq("email_domain", null)
      .limit(1)
      .maybeSingle();

    if (existingPersonal) {
      // Check if user is already a member
      const { data: member } = await supabase
        .from("organisation_members")
        .select("*")
        .eq("organisation_id", existingPersonal.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member) {
        return existingPersonal as Organisation;
      }
    }

    // Create new personal org
    const { data: newOrg, error: createError } = await supabase
      .from("organisations")
      .insert({
        name: orgName,
        email_domain: null,
        plan: "FREE",
      })
      .select("*")
      .single();

    if (createError || !newOrg) {
      throw new Error(`Failed to create personal organisation: ${createError?.message}`);
    }

    return newOrg as Organisation;
  }

  // Business domain: look up or create shared org
  const { data: existingOrg } = await supabase
    .from("organisations")
    .select("*")
    .eq("email_domain", domain)
    .maybeSingle();

  if (existingOrg) {
    return existingOrg as Organisation;
  }

  // Create new business org
  const orgName = formatDomainAsOrgName(domain);
  const { data: newOrg, error: createError } = await supabase
    .from("organisations")
    .insert({
      name: orgName,
      email_domain: domain,
      plan: "FREE",
    })
    .select("*")
    .single();

  if (createError || !newOrg) {
    throw new Error(`Failed to create organisation: ${createError?.message}`);
  }

  return newOrg as Organisation;
}

/**
 * Ensure user is a member of an organisation
 * First user in org becomes OWNER, others become MEMBER
 */
export async function ensureOrganisationMembership(
  userId: string,
  organisationId: string,
): Promise<OrganisationMember> {
  const supabase = getSupabaseAdminClient();

  // Check if membership already exists
  const { data: existing } = await supabase
    .from("organisation_members")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing as OrganisationMember;
  }

  // Check if this is the first member (becomes OWNER)
  const { count } = await supabase
    .from("organisation_members")
    .select("*", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  const role = (count ?? 0) === 0 ? "OWNER" : "MEMBER";

  const { data: newMember, error } = await supabase
    .from("organisation_members")
    .insert({
      organisation_id: organisationId,
      user_id: userId,
      role,
    })
    .select("*")
    .single();

  if (error || !newMember) {
    throw new Error(`Failed to create organisation membership: ${error?.message}`);
  }

  return newMember as OrganisationMember;
}

/**
 * Get current organisation for a user
 */
export async function getCurrentOrganisationForUser(
  userId: string,
): Promise<Organisation | null> {
  const supabase = getSupabaseAdminClient();

  // Find user's organisation membership
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  // Fetch organisation
  const { data: org } = await supabase
    .from("organisations")
    .select("*")
    .eq("id", membership.organisation_id)
    .maybeSingle();

  return org as Organisation | null;
}

/**
 * Check if phone number has already used a free trial
 */
export async function hasPhoneUsedTrial(phoneNumber: string): Promise<boolean> {
  if (!phoneNumber) return false;

  const supabase = getSupabaseAdminClient();
  const { count } = await supabase
    .from("phone_trials_used")
    .select("*", { count: "exact", head: true })
    .eq("phone_number", phoneNumber);

  return (count ?? 0) > 0;
}

/**
 * Mark phone number as having used a trial
 */
export async function markPhoneTrialUsed(
  phoneNumber: string,
  organisationId: string,
): Promise<void> {
  if (!phoneNumber) return;

  const supabase = getSupabaseAdminClient();
  await supabase
    .from("phone_trials_used")
    .insert({
      phone_number: phoneNumber,
      organisation_id: organisationId,
    })
    .select()
    .single();
}

