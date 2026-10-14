/**
 * Helpers so logged-in Overview / Court / Chase prefer server-built surfaces
 * from bundle-source. Schedule-lab meta still gates limitation/CPS copy only.
 */
import type { ScheduleChaseLabMeta } from "@/lib/criminal/schedule-chase-lab-types";
import type { LiveProductionSurfaces } from "@/lib/criminal/canonical-live-surface-adapter";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";

export type BundleSourceScheduleSlice = {
  canonical?: {
    scheduleChaseLab?: ScheduleChaseLabMeta | null;
    chaseLabels?: string[];
    evidenceRows?: Array<{ label: string; existence?: string | null; note?: string | null; sourcePage?: string | null }>;
  } | null;
  surfaces?: Pick<LiveProductionSurfaces, "disclosureChase" | "warRoom" | "composedProse"> | null;
};

export function scheduleChaseLabMeta(
  bundle: BundleSourceScheduleSlice | null | undefined,
): ScheduleChaseLabMeta | null {
  return bundle?.canonical?.scheduleChaseLab ?? null;
}

/** When lab is on, do not feed flat bundle text back into glued chase heuristics. */
export function scheduleChaseBundleText(
  bundle: BundleSourceScheduleSlice | null | undefined,
  fallback: string | null | undefined,
): string {
  const lab = scheduleChaseLabMeta(bundle);
  if (lab?.enabled) return "";
  return fallback ?? "";
}

export function scheduleChaseServerDisclosure(
  bundle: BundleSourceScheduleSlice | null | undefined,
): DisclosureChaseBrief | null {
  return bundle?.surfaces?.disclosureChase ?? null;
}

export function scheduleChaseServerWarRoom(
  bundle: BundleSourceScheduleSlice | null | undefined,
): HearingWarRoomBrief | null {
  return bundle?.surfaces?.warRoom ?? null;
}

export function scheduleChaseLimitationLines(
  bundle: BundleSourceScheduleSlice | null | undefined,
): string[] {
  const lab = scheduleChaseLabMeta(bundle);
  if (!lab?.enabled) return [];
  const fromProse = (bundle?.surfaces?.composedProse?.limitations ?? []).filter((line) =>
    /schedule|not in this copy|CPS chase letter held|could not be read this way|Unresolved schedule conflict|Upload limitation|Multiple disclosure schedules|Schedule observation|Schedule documents \(unresolved/i.test(
      line,
    ),
  );
  if (fromProse.length) return fromProse;
  const lines: string[] = [];
  if (lab.unsupportedInput && lab.unsupportedReason) lines.push(lab.unsupportedReason);
  for (const row of lab.uploadLimitations) {
    lines.push(
      `Upload limitation (served on schedule; not in this copy): ${row.item} — ${row.note} (p.${row.page})`,
    );
  }
  for (const row of lab.conflicts) {
    lines.push(
      `Unresolved schedule conflict: ${row.item} — schedule "${row.scheduleLine}" vs later "${row.line}" (p.${row.page})`,
    );
  }
  if (lab.cpsChaseHeld) {
    lines.push(
      lab.unsupportedInput
        ? "CPS chase letter held on this copy while schedule chase input is unsupported."
        : "CPS chase letter held on this copy. Schedule chase shows the page line; it does not auto-draft a CPS request from the first label.",
    );
  }
  return lines;
}

export function scheduleChaseCpsHeld(
  bundle: BundleSourceScheduleSlice | null | undefined,
): boolean {
  const lab = scheduleChaseLabMeta(bundle);
  if (!lab?.enabled) return false;
  const cps = bundle?.surfaces?.composedProse?.cpsChase;
  return cps == null || lab.cpsChaseHeld === true;
}
