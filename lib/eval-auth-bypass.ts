import type { OrgContext } from "@/lib/auth";

export function isEvalBypassRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;

  const header = request.headers.get("x-eval");
  const ua = request.headers.get("user-agent") || "";

  return header === "1" || ua.includes("tsx");
}

/**
 * GET /api/cases needs orgId before listing — set **EVAL_ORG_ID** in `.env.local` when calling without cookies.
 */
export function getDevEvalOrgContext(request: Request): OrgContext | null {
  if (!isEvalBypassRequest(request)) return null;
  const orgId = process.env.EVAL_ORG_ID?.trim();
  if (!orgId) return null;
  const userId =
    process.env.EVAL_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";
  return {
    orgId,
    userId,
    role: "owner",
  };
}
