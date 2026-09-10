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
  {
    workspaceId: "67a2c506-f857-4c98-998b-62e9920aa0c4",
    kind: "internal_qa",
    casesLimit: 60,
    documentsLimit: 200,
    analysesLimit: 200,
    exportsLimit: 80,
    bypassActive: false,
    startsAt: "2026-09-10T00:14:33.656Z",
    expiresAt: "2026-09-24T00:14:33.656Z",
    grantedBy: "operator:fresh-gold50-pr101",
    reason: "Fresh Gold 50 live PDF QA",
  },
];
