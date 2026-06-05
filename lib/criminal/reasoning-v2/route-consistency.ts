/** Compare live Battleboard route with Reasoning V2 primary route — product-safe only. */

export const REASONING_ROUTE_DIFFERS_NOTICE =
  "Source-backed reasoning may differ from the current saved strategy view. Solicitor review required before relying on either route.";

function normalizeRouteTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when both routes exist and are meaningfully different (not substring matches). */
export function reasoningRouteDiffersFromBattleboard(
  battleboardRoute: string | null | undefined,
  reasoningRoute: string | null | undefined,
): boolean {
  const existing = normalizeRouteTitle(battleboardRoute?.trim() ?? "");
  const reasoning = normalizeRouteTitle(reasoningRoute?.trim() ?? "");
  if (!existing || !reasoning) return false;
  if (existing === reasoning) return false;
  if (existing.includes(reasoning) || reasoning.includes(existing)) return false;
  return true;
}
