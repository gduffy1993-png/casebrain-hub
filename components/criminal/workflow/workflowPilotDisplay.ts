/** Layout-only display guards — do not change extraction or brief builders. */

import {
  collapseHeaderCellDuplicates,
  dedupeSolicitorLines,
} from "@/lib/criminal/solicitor-display-dedupe";

const INTERNAL_CLIENT_RES =
  /unless document|not safely extracted|offence wording not|add charge sheet|unknown offence|allegation not recorded/i;

const INTERNAL_CHARGE_RES =
  /unless document|not safely extracted|offence wording not|add charge sheet|unknown offence|allegation not recorded/i;

export function isInternalPilotChargeLine(raw: string | null | undefined): boolean {
  const t = raw?.trim() ?? "";
  return !t || INTERNAL_CHARGE_RES.test(t);
}

/** UI fallback order: bundle/header charge → desk/list line → safe label. */
export function resolvePilotChargeDisplay(
  primary: string | null | undefined,
  ...fallbacks: (string | null | undefined)[]
): string {
  for (const candidate of [primary, ...fallbacks]) {
    const t = candidate?.trim() ?? "";
    if (!t) continue;
    const guarded = displayPilotStripCharge(t);
    if (guarded) return guarded;
    if (!INTERNAL_CHARGE_RES.test(t)) return t;
  }
  return "Charge not on papers";
}

export function displayPilotSnapshotPosition(positionStatus: string, readiness: string): string {
  const p = positionStatus.trim();
  const lower = p.toLowerCase();
  if (/not recorded|casebrain position: not|position: not/i.test(lower)) {
    if (/provisional|conditional|pending disclosure|thin bundle|review/i.test(readiness)) {
      return "Provisional pending disclosure";
    }
    return "Position not recorded yet";
  }
  return p || "Position not recorded yet";
}

export function displayPilotStripClient(raw: string | null | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t || INTERNAL_CLIENT_RES.test(t)) return "";
  return t;
}

export function displayPilotStripCharge(raw: string | null | undefined): string {
  const t = raw?.trim() ?? "";
  if (!t || INTERNAL_CHARGE_RES.test(t)) return "";
  return t;
}

export function displayPilotStripCourt(raw: string | null | undefined): string {
  let t = raw?.trim() ?? "";
  if (!t || /not safely extracted/i.test(t)) return "";
  t = collapseHeaderCellDuplicates(t)
    .replace(/\bCrown\s+Court\s+Crown\b/gi, "Crown Court")
    .replace(/\bCrown\s+Crown\b/gi, "Crown Court")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
  return t;
}

export function displayPilotStripHearing(raw: string | null | undefined): string {
  const t = collapseHeaderCellDuplicates(raw);
  if (!t || /not safely extracted|not on papers/i.test(t)) return "";
  return t;
}

export function displayPilotStripStage(raw: string | null | undefined): string {
  const t = collapseHeaderCellDuplicates(raw);
  if (!t || /not recorded|unknown/i.test(t)) return t;
  return t;
}

export function isThickPilotBundle(documentCount: number, combinedTextLength = 0): boolean {
  return documentCount >= 3 || combinedTextLength >= 12_000;
}

export function pilotListCap(documentCount: number, combinedTextLength = 0): number {
  return isThickPilotBundle(documentCount, combinedTextLength) ? 5 : 3;
}

export function dedupePilotLines(lines: string[], exclude?: string | null): string[] {
  return dedupeSolicitorLines(lines, { exclude });
}
