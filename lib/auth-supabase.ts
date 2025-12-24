import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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
  userId: string;
}): Promise<string> {
  const supabase = getSupabaseAdminClient();

  // 1) Try to find existing org by external_ref (if column exists)
  const byExternalRef = await supabase
    .from("organisations")
    .select("id")
    .eq("external_ref", params.externalRef)
    .maybeSingle();

  if (byExternalRef.error) {
    const msg = byExternalRef.error.message ?? "";
    // Backwards-compat: production DB may not have external_ref yet.
    if (msg.toLowerCase().includes("external_ref") && msg.toLowerCase().includes("does not exist")) {
      return await resolveOrganisationIdFallbackNoExternalRef(params.name, params.userId);
    }
    console.error("[auth] Failed to lookup organisation by external_ref:", {
      externalRef: params.externalRef,
      message: byExternalRef.error.message,
      code: (byExternalRef.error as any).code,
    });
    throw new Error("Organisation resolution failed");
  }

  if (byExternalRef.data?.id) {
    const orgId = (byExternalRef.data as any).id as string;
    if (!isUuid(orgId)) throw new Error("Invalid orgId (expected UUID)");
    return orgId;
  }

  // 2) Insert new org (with external_ref if possible; fallback if not)
  let insertRes = await supabase
    .from("organisations")
    .insert(
      {
        name: params.name,
        email_domain: null,
        external_ref: params.externalRef,
      } as any,
    )
    .select("id")
    .single();

  if (insertRes.error) {
    const msg = insertRes.error.message ?? "";
    if (msg.toLowerCase().includes("external_ref") && msg.toLowerCase().includes("does not exist")) {
      return await resolveOrganisationIdFallbackNoExternalRef(params.name, params.userId);
    }
    // If unique constraint exists and we raced, re-select
    if ((insertRes.error as any).code === "23505") {
      const retry = await supabase
        .from("organisations")
        .select("id")
        .eq("external_ref", params.externalRef)
        .maybeSingle();
      const orgId = (retry.data as any)?.id as string | undefined;
      if (orgId && isUuid(orgId)) return orgId;
    }
    console.error("[auth] Failed to create organisation by external_ref:", {
      externalRef: params.externalRef,
      message: insertRes.error.message,
      code: (insertRes.error as any).code,
    });
    throw new Error("Organisation resolution failed");
  }

  const orgId = (insertRes.data as any)?.id as string | undefined;
  if (!orgId || !isUuid(orgId)) {
    console.error("[auth] Organisation resolver returned non-UUID id:", {
      externalRef: params.externalRef,
      orgId,
    });
    throw new Error("Invalid orgId (expected UUID)");
  }

  return orgId;
}

async function resolveOrganisationIdFallbackNoExternalRef(name: string, userId: string): Promise<string> {
  // Backwards-compatible UUID orgId resolution when DB is missing organisations.external_ref.
  // Prefer an existing membership org for this user; otherwise create a new org UUID + membership.
  if (!userId) throw new Error("Unauthenticated: user session is required.");

  const supabase = getSupabaseAdminClient();

  try {
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const existingOrgId = (membership as any)?.organisation_id as string | undefined;
    if (existingOrgId && isUuid(existingOrgId)) return existingOrgId;
  } catch {
    // ignore and continue
  }

  const { data: orgRow, error: orgErr } = await supabase
    .from("organisations")
    .insert({ name, email_domain: null } as any)
    .select("id")
    .single();

  if (orgErr) {
    console.error("[auth] Fallback org creation failed:", orgErr);
    throw new Error("Organisation resolution failed");
  }

  const newOrgId = (orgRow as any)?.id as string | undefined;
  if (!newOrgId || !isUuid(newOrgId)) throw new Error("Invalid orgId (expected UUID)");

  try {
    await supabase.from("organisation_members").insert({
      organisation_id: newOrgId,
      user_id: userId,
      role: "OWNER",
    } as any);
  } catch {
    // ignore (may already exist)
  }

  return newOrgId;
}

function resolveRole(userMetadata: { role?: string } | null | undefined): CasebrainRole {
  const roleClaim = userMetadata?.role?.toLowerCase();

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
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthenticated: user session is required.");
  }

  // Get user metadata from database
  const adminSupabase = getSupabaseAdminClient();
  const { data: dbUser } = await adminSupabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    role: resolveRole(dbUser ? { role: dbUser.role } : null),
  };
});

export const requireOrg = cache(async (): Promise<OrgContext> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthenticated: user session is required.");
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: dbUser } = await adminSupabase
    .from("users")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = resolveRole(dbUser ? { role: dbUser.role } : null);

  // Get or create org for user
  const externalRef = `solo-user_${user.id}`;
  const orgId = await getOrCreateOrganisationIdByExternalRef({
    externalRef,
    name: "Solo Workspace",
    userId: user.id,
  });

  // Update user's org_id if it doesn't match
  if (dbUser && dbUser.org_id !== orgId) {
    await adminSupabase
      .from("users")
      .update({ org_id: orgId })
      .eq("id", user.id);
  }

  return {
    userId: user.id,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user from database for additional info
  const adminSupabase = getSupabaseAdminClient();
  const { data: dbUser } = await adminSupabase
    .from("users")
    .select("email, name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email || dbUser?.email || null,
    firstName: dbUser?.name?.split(" ")[0] || null,
    lastName: dbUser?.name?.split(" ").slice(1).join(" ") || null,
    fullName: dbUser?.name || null,
    primaryEmailAddress: {
      emailAddress: user.email || dbUser?.email || null,
    },
    emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
    primaryPhoneNumber: user.phone ? {
      phoneNumber: user.phone,
      verification: {
        status: "verified", // Supabase phone verification status would come from user metadata
      },
    } : null,
  };
});

export async function ensureSupabaseUser() {
  const { userId, orgId, role } = await requireOrg();
  const user = await getCurrentUser();
  if (!user || !user.email) {
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
      email: user.email,
      name: user.fullName || user.email,
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
  // Hard guard: do not query using non-UUID orgId
  if (!isUuid(orgId)) {
    console.error("[auth] Invalid orgId supplied to getOrgMembers (expected UUID):", {
      orgId,
    });
    return [];
  }

  const adminSupabase = getSupabaseAdminClient();
  
  // Get members from organisation_members table
  const { data: members, error } = await adminSupabase
    .from("organisation_members")
    .select("user_id, role")
    .eq("organisation_id", orgId);

  if (error) {
    console.error("[auth] Failed to load org members:", error);
    return [];
  }

  if (!members || members.length === 0) {
    return [];
  }

  // Get user details for each member
  const userIds = members.map((m: any) => m.user_id);
  const { data: users } = await adminSupabase
    .from("users")
    .select("id, email, name")
    .in("id", userIds);

  return (members || []).map((member: any) => {
    const user = users?.find((u: any) => u.id === member.user_id);
    return {
      id: member.user_id,
      email: user?.email || "Unknown",
      role: member.role || "viewer",
    };
  });
}

