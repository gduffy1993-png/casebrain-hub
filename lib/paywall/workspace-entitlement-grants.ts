/**
 * Workspace-scoped entitlement grants.
 * Keys are organisation/workspace UUIDs only — never emails.
 *
 * Applied after read-only identity match for the dedicated QA solo workspace.
 */
import type { WorkspaceEntitlementRecord } from "./workspace-entitlement";

export const WORKSPACE_ENTITLEMENT_GRANTS: WorkspaceEntitlementRecord[] = [
  {
    workspaceId: "e066f4cd-749f-4436-baa9-8c187092149a",
    kind: "internal_qa",
    casesLimit: 25,
    documentsLimit: 100,
    analysesLimit: 100,
    exportsLimit: 40,
    bypassActive: false,
    startsAt: "2026-09-05T23:30:05.809Z",
    expiresAt: "2026-09-19T23:30:05.809Z",
    grantedBy: "operator:fresh-gold20-pr101",
    reason: "Fresh Gold 20 live PDF QA",
  },
];
