/**
 * Workspace-scoped entitlement grants.
 * Keys are organisation/workspace UUIDs only — never emails.
 *
 * Applied after read-only identity match for the dedicated QA solo workspace.
 */
import type { WorkspaceEntitlementRecord } from "./workspace-entitlement";

export const WORKSPACE_ENTITLEMENT_GRANTS: WorkspaceEntitlementRecord[] = [
  {
    workspaceId: "1cf4ae7c-2c73-40ff-b1c1-957615cd1761",
    kind: "internal_qa",
    casesLimit: 25,
    documentsLimit: 100,
    analysesLimit: 100,
    exportsLimit: 40,
    bypassActive: false,
    startsAt: "2026-08-09T20:41:12.928Z",
    expiresAt: "2026-08-23T20:41:12.928Z",
    grantedBy: "operator:real-pdf-live-pilot-v1",
    reason: "Real-PDF authenticated 5→20 QA pilot",
  },
];
