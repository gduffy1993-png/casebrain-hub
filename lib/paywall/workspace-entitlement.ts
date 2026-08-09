/**
 * Workspace-scoped temporary entitlements (e.g. internal_qa).
 *
 * Lookup is by workspace/organisation UUID only — never by email.
 * Active internal_qa grants require bypassActive === false.
 */

export const DEFAULT_TRIAL_CASES_LIMIT = 2;
export const DEFAULT_TRIAL_DOCUMENTS_LIMIT = 10;

export type WorkspaceEntitlementKind = "internal_qa";

export type WorkspaceEntitlementRecord = {
  workspaceId: string;
  kind: WorkspaceEntitlementKind;
  casesLimit: number;
  documentsLimit: number;
  analysesLimit: number;
  exportsLimit: number;
  /** Must be false for internal_qa. True is never treated as unlimited bypass. */
  bypassActive: boolean;
  startsAt: string;
  expiresAt: string;
  grantedBy: string;
  reason: string;
};

export type EffectiveCapacityLimits = {
  casesLimit: number;
  documentsLimit: number;
  analysesLimit: number;
  exportsLimit: number;
  source: "default_trial" | "workspace_entitlement";
  entitlement: WorkspaceEntitlementRecord | null;
  expiresAt: string | null;
};

export type ResolveCapacityInput = {
  workspaceId: string;
  entitlements: WorkspaceEntitlementRecord[];
  now?: Date | string;
  defaultAnalysesLimit: number;
  defaultExportsLimit: number;
  defaultCasesLimit?: number;
  defaultDocumentsLimit?: number;
};

function toDate(value: Date | string | undefined): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

/**
 * An entitlement is active only when:
 * - it matches the requested workspaceId
 * - kind is internal_qa
 * - bypassActive is explicitly false (never an unlimited bypass path)
 * - expiresAt is strictly in the future
 */
export function isActiveWorkspaceEntitlement(
  entitlement: WorkspaceEntitlementRecord,
  workspaceId: string,
  now: Date | string = new Date(),
): boolean {
  if (entitlement.workspaceId !== workspaceId) return false;
  if (entitlement.kind !== "internal_qa") return false;
  if (entitlement.bypassActive !== false) return false;
  const expiresAt = new Date(entitlement.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() > toDate(now).getTime();
}

export function findActiveWorkspaceEntitlement(
  entitlements: WorkspaceEntitlementRecord[],
  workspaceId: string,
  now: Date | string = new Date(),
): WorkspaceEntitlementRecord | null {
  return (
    entitlements.find((row) =>
      isActiveWorkspaceEntitlement(row, workspaceId, now),
    ) ?? null
  );
}

/**
 * Resolve effective capacity for a workspace.
 * Other workspaces and expired grants fall back to default trial limits.
 * Admin/owner role is intentionally not consulted here.
 */
export function resolveEffectiveCapacityLimits(
  input: ResolveCapacityInput,
): EffectiveCapacityLimits {
  const defaultCases =
    input.defaultCasesLimit ?? DEFAULT_TRIAL_CASES_LIMIT;
  const defaultDocs =
    input.defaultDocumentsLimit ?? DEFAULT_TRIAL_DOCUMENTS_LIMIT;

  const active = findActiveWorkspaceEntitlement(
    input.entitlements,
    input.workspaceId,
    input.now,
  );

  if (!active) {
    return {
      casesLimit: defaultCases,
      documentsLimit: defaultDocs,
      analysesLimit: input.defaultAnalysesLimit,
      exportsLimit: input.defaultExportsLimit,
      source: "default_trial",
      entitlement: null,
      expiresAt: null,
    };
  }

  return {
    casesLimit: active.casesLimit,
    documentsLimit: active.documentsLimit,
    analysesLimit: active.analysesLimit,
    exportsLimit: active.exportsLimit,
    source: "workspace_entitlement",
    entitlement: active,
    expiresAt: active.expiresAt,
  };
}

/** Guards used by grant tooling — rejects email-keyed or bypass grants. */
export function assertSafeInternalQaGrant(input: {
  workspaceId: string;
  email?: string | null;
  bypassActive: boolean;
  entitlementsSourceText: string;
}): void {
  if (!input.workspaceId || typeof input.workspaceId !== "string") {
    throw new Error("workspaceId is required");
  }
  if (input.bypassActive !== false) {
    throw new Error("internal_qa grants must set bypassActive: false");
  }
  const source = input.entitlementsSourceText.toLowerCase();
  const email = input.email?.trim().toLowerCase();
  if (email && source.includes(email)) {
    throw new Error("Email must not be hardcoded into entitlement source");
  }
}
