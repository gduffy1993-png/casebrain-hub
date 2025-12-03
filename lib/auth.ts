import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { getSupabaseAdminClient } from "./supabase";

export const CASEBRAIN_ROLES = ["owner", "solicitor", "paralegal", "viewer"] as const;
const IS_DEV = process.env.NODE_ENV !== "production";

export type CasebrainRole = (typeof CASEBRAIN_ROLES)[number];

export type UserContext = {
  userId: string;
  role: CasebrainRole;
};

export type OrgContext = UserContext & {
  orgId: string;
};

function resolveRole(sessionClaims: unknown): CasebrainRole {
  const metadata = (sessionClaims as { metadata?: { role?: string } } | undefined)?.metadata;
  const roleClaim = metadata?.role?.toLowerCase();

  if (roleClaim && CASEBRAIN_ROLES.includes(roleClaim as CasebrainRole)) {
    return roleClaim as CasebrainRole;
  }

  if (IS_DEV) {
    console.warn(
      "[auth] Role metadata missing or unrecognised. Defaulting to owner (development fallback).",
      { roleClaim },
    );
    return "owner";
  }

  if (roleClaim) {
    console.warn("[auth] Unrecognised role metadata, defaulting to viewer.", { roleClaim });
  } else {
    console.warn("[auth] No role metadata present, defaulting to viewer.");
  }

  return "viewer";
}

export const requireUser = cache(async (): Promise<UserContext> => {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    throw new Error("Unauthenticated: user session is required.");
  }

  return {
    userId,
    role: resolveRole(sessionClaims),
  };
});

export const requireOrg = cache(async (): Promise<OrgContext> => {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    throw new Error("Unauthenticated: user session is required.");
  }

  const role = resolveRole(sessionClaims);
  const activeOrgId =
    (sessionClaims as { activeOrganizationId?: string } | undefined)?.activeOrganizationId ??
    (sessionClaims as { org_id?: string } | undefined)?.org_id ??
    null;

  // If no Clerk org, derive a stable orgId from userId for single-tenant mode
  const orgId = activeOrgId ?? `solo-${userId}`;

  if (!activeOrgId) {
    console.warn(
      "[auth] Active organization missing. Using single-tenant org derived from userId.",
      { userId, orgId },
    );
  }

  return {
    userId,
    orgId,
    role,
  };
});

export const requireAuthContext = requireOrg;

export async function requireRole(allowedRoles: CasebrainRole[]) {
  const context = await requireOrg();

  if (!allowedRoles.includes(context.role)) {
    if (IS_DEV) {
      console.warn(
        "[auth] Role not permitted; granting owner privileges in development.",
        { currentRole: context.role, allowedRoles },
      );
      return { ...context, role: "owner" };
    }

    throw new Error("Role not permitted for this action.");
  }

  return context;
}

export const getCurrentUser = cache(async () => {
  return currentUser();
});

export async function ensureSupabaseUser() {
  const { userId, orgId, role } = await requireOrg();
  const user = await getCurrentUser();
  if (!user || !user.primaryEmailAddress?.emailAddress) {
    throw new Error("User must have an email address.");
  }


  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const insertRes = await supabase.from("users").insert({
      id: userId,
      email: user.primaryEmailAddress.emailAddress,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        user.primaryEmailAddress.emailAddress,
      role,
      org_id: orgId,
    });

    if (insertRes.error) {
      throw insertRes.error;
    }
  }

  return { userId, orgId, role };
}

export async function getOrgMembers(orgId: string) {
  // If using solo/single-tenant mode (no real Clerk org), return current user
  if (orgId.startsWith("solo-")) {
    const user = await getCurrentUser();
    if (user) {
      return [{
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "Unknown",
        role: "owner",
      }];
    }
    return [];
  }

  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    });

    return memberships.data.map((membership) => ({
      id: membership.publicUserData?.userId,
      email: membership.publicUserData?.identifier,
      role: membership.role,
    }));
  } catch (error) {
    console.error("[auth] Failed to fetch org members:", error);
    // Fallback to current user if org lookup fails
    const user = await getCurrentUser();
    if (user) {
      return [{
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "Unknown",
        role: "owner",
      }];
    }
    return [];
  }
}

