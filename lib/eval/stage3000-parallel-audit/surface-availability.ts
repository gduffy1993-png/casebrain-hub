/**
 * Surface availability capture — view/copy/export/api/pdf/composed/browser
 * recorded separately from exercise status.
 */

import { SURFACE_IDS, type SurfaceId } from "./constants";
import type { DecisionCard, SurfaceAvailability } from "./types";

export function summariseSurfaces(
  surfaces: Record<SurfaceId, SurfaceAvailability>,
): Pick<DecisionCard, "surfacesAvailable" | "surfacesUnavailable" | "surfacesNotExercised"> {
  const surfacesAvailable: SurfaceId[] = [];
  const surfacesUnavailable: SurfaceId[] = [];
  const surfacesNotExercised: SurfaceId[] = [];
  for (const id of SURFACE_IDS) {
    const v = surfaces[id];
    if (v === "available" || v === "partial") surfacesAvailable.push(id);
    else if (v === "unavailable") surfacesUnavailable.push(id);
    else surfacesNotExercised.push(id);
  }
  return { surfacesAvailable, surfacesUnavailable, surfacesNotExercised };
}

export function emptySurfaceMap(
  fill: SurfaceAvailability = "not_exercised",
): Record<SurfaceId, SurfaceAvailability> {
  const out = {} as Record<SurfaceId, SurfaceAvailability>;
  for (const id of SURFACE_IDS) out[id] = fill;
  return out;
}

/** Merge observed capability onto declared shard surfaces without inventing availability. */
export function mergeObservedSurface(
  declared: Record<SurfaceId, SurfaceAvailability>,
  surfaceId: SurfaceId,
  observed: SurfaceAvailability,
): Record<SurfaceId, SurfaceAvailability> {
  // Never upgrade not_exercised/unavailable to available without evidence —
  // caller must pass observed from real probes. This helper only records.
  return { ...declared, [surfaceId]: observed };
}
