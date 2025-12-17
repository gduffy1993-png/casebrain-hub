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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getOrCreateOrganisationIdByExternalRef(params: {
  externalRef: string;
  name: string;
}): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("organisations")
    .upsert(
      {
        external_ref: params.externalRef,
        name: params.name,
        email_domain: null,
      } as any,
      { onConflict: "external_ref" },
    )
    .select("id")
    .single();

  if (error) {
    // If external_ref column doesn't exist yet, this is a migration issue.
    console.error("[auth] Failed to resolve organisation by external_ref:", {
      externalRef: params.externalRef,
      message: error.message,
      code: (error as any).code,
    });
    throw new Error("Organisation resolution failed (missing external_ref column?)");
  }

  const orgId = (data as any)?.id as string | undefined;
  if (!orgId || !isUuid(orgId)) {
    console.error("[auth] Organisation resolver returned non-UUID id:", {
      externalRef: params.externalRef,
      orgId,
    });
    throw new Error("Invalid orgId (expected UUID)");
  }

  return orgId;
}

const legacyOrgMigrationDone = new Set<string>();

async function migrateLegacyOrgIdsToUuid(params: {
  newOrgId: string;
  legacyOrgIds: string[];
}): Promise<void> {
  const { newOrgId, legacyOrgIds } = params;
  const key = `${newOrgId}:${legacyOrgIds.join(",")}`;
  if (legacyOrgMigrationDone.has(key)) return;
  legacyOrgMigrationDone.add(key);

  // Use `any` to avoid deep Supabase type instantiation in dynamic table updates.
  const supabase: any = getSupabaseAdminClient();

  const tables = [
    "cases",
    "documents",
    "letters",
    "risk_flags",
    "deadlines",
    "timeline_events",
    "case_notes",
    "key_issues",
    "limitation_info",
    "time_entries",
  ];

  for (const table of tables) {
    try {
      // Best effort: if table/column types don't match, ignore.
      await supabase.from(table).update({ org_id: newOrgId }).in("org_id", legacyOrgIds);
    } catch {
      // ignore
    }
  }
}

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

  // SOLO-TENANT ORG RESOLUTION (always return UUID orgId)
  // - If no Clerk org: external_ref = "solo-user_<userId>"
  // - If Clerk org present: external_ref = "clerk-org_<clerkOrgId>"
  const externalRef = activeOrgId ? `clerk-org_${activeOrgId}` : `solo-user_${userId}`;
  const orgId = await getOrCreateOrganisationIdByExternalRef({
    externalRef,
    name: activeOrgId ? "Clerk Organisation Workspace" : "Solo Workspace",
  });

  // Best-effort: migrate legacy org_id strings to UUID so existing data stays accessible.
  // Previous versions stored org_id as Clerk org string or "solo-<userId>".
  const legacyOrgIds = [
    ...(activeOrgId ? [activeOrgId] : []),
    `solo-${userId}`,
    `solo-user_${userId}`,
  ];
  await migrateLegacyOrgIdsToUuid({ newOrgId: orgId, legacyOrgIds });

  if (!activeOrgId) {
    console.warn(
      "[auth] Active organization missing. Using single-tenant org derived from userId.",
      { userId, orgId, externalRef },
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
  // Hard guard: do not query Clerk/DB using non-UUID orgId
  if (!isUuid(orgId)) {
    console.error("[auth] Invalid orgId supplied to getOrgMembers (expected UUID):", {
      orgId,
    });
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data: orgRow, error } = await supabase
    .from("organisations")
    .select("external_ref")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    console.error("[auth] Failed to load organisation external_ref for members lookup:", error);
    return [];
  }

  const externalRef = (orgRow as any)?.external_ref as string | null | undefined;

  // If using solo/single-tenant mode, return current user
  if (externalRef && externalRef.startsWith("solo-user_")) {
    const user = await getCurrentUser();
    if (user) {
      return [
        {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "Unknown",
          role: "owner",
        },
      ];
    }
    return [];
  }

  try {
    const clerkOrgId =
      externalRef && externalRef.startsWith("clerk-org_")
        ? externalRef.replace(/^clerk-org_/, "")
        : null;

    if (!clerkOrgId) {
      // No Clerk mapping: return current user as a safe fallback
      const user = await getCurrentUser();
      if (user) {
        return [
          {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "Unknown",
            role: "owner",
          },
        ];
      }
      return [];
    }

    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: clerkOrgId,
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

