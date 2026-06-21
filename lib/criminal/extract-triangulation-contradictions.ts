/**
 * Module 6 — cross-evidence triangulation (additive, conservative).
 * MG11 vs CCTV vs CAD/999/BWV — reconstruction across channels, not MG5 loss/CCTV window (v1).
 */

import {
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";

export type TriangulationContradictionType = Extract<
  BundleContradictionType,
  "triangulation_mg11_cctv" | "triangulation_dispatch_scene" | "triangulation_bwv_account"
>;

function sectionSlice(bundleText: string, label: string): string {
  const re = new RegExp(
    `(?:===\\s*SECTION:\\s*${label}[^=]*===|(?:^|\\n)#+\\s*${label}\\b)([\\s\\S]*?)(?:===\\s*SECTION:|\\n===|$)`,
    "i",
  );
  const hit = bundleText.match(re);
  if (hit?.[1]?.trim()) return hit[1];
  if (/^MG5$/i.test(label) && /\bMG5\b/i.test(bundleText)) {
    return bundleText.match(/MG5[\s\S]{0,8000}/i)?.[0] ?? "";
  }
  return "";
}

function mg5Text(bundleText: string): string {
  return sectionSlice(bundleText, "MG5") || bundleText.slice(0, Math.min(bundleText.length, 12000));
}

function cctvText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "CCTV") ||
    bundleText.match(/CCTV[\s\S]{0,6000}/i)?.[0] ||
    ""
  );
}

function dispatchText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "CAD") ||
    sectionSlice(bundleText, "999") ||
    bundleText.match(/(?:CAD|999|dispatch)[\s\S]{0,5000}/i)?.[0] ||
    ""
  );
}

function bwvText(bundleText: string): string {
  return (
    sectionSlice(bundleText, "BWV") ||
    bundleText.match(/BWV[\s\S]{0,5000}/i)?.[0] ||
    ""
  );
}

function extractMg11Blocks(bundleText: string): string[] {
  const blocks: string[] = [];
  const parts = bundleText.split(
    /(?=(?:===\s*SECTION:\s*MG11|MG11\s*[–\-]\s*|MG11\s+witness statement|witness statement))/gi,
  );
  for (const part of parts) {
    if (!/\b(MG11|witness statement)\b/i.test(part)) continue;
    const trimmed = part.trim().slice(0, 8000);
    if (trimmed.length > 40) blocks.push(trimmed);
  }
  return blocks;
}

function hasIncidentContext(hay: string): boolean {
  return /\b(assault|ABH|GBH|domestic|complainant|witness|incident|injur|kitchen|mug|CCTV|999|CAD|BWV)/i.test(
    hay,
  );
}

const MG11_INJURY_RE =
  /\b(hit my face|felt something hit|bleeding|bleed|struck|punch|mug on the floor|injury to|cut above)\b/i;

const CCTV_LIMIT_RE =
  /\b(does not show|do not show|no clear contact|no visible injury|partial clip|limited (?:view|angle|footage)|no strike|not show (?:a )?strike|camera (?:does not|did not))\b/i;

const DISPATCH_LOW_RE =
  /\b(verbal(?:ly)? only|no weapons?(?:\s+seen)?|argument only|no ambulance|disturbance only|no injuries reported|low priority|grade\s*2)\b/i;

const SCENE_HIGH_RE =
  /\b(bleeding|hit (?:my|her|his) face|struck|weapon|mug|injury|assault|blood)\b/i;

const BWV_DENY_RE =
  /\b(no injuries observed|no visible injuries|calm at scene|denies assault|no comment on (?:the )?assault|behaviour calm)\b/i;

/** MG11 injury/strike account vs served CCTV not showing contact or injury. */
function detectMg11VsCctv(mg11: string, cctv: string, mg5: string): BundleContradiction | null {
  const hay = `${mg11} ${cctv} ${mg5}`;
  if (!hasIncidentContext(hay)) return null;
  if (!MG11_INJURY_RE.test(mg11) || !CCTV_LIMIT_RE.test(cctv)) return null;
  if (cctv.length < 40 || mg11.length < 40) return null;

  return {
    type: "triangulation_mg11_cctv",
    sources: ["MG11", "CCTV"],
    values: ["witness injury account", "CCTV does not show contact/injury"],
    theoryLine:
      "The papers differ across channels: the complainant describes being struck or injured while the served CCTV material does not show clear contact or visible injury. Reconstruction remains provisional pending full footage, continuity, and engineer notes.",
    riskLine:
      "Witness account and served CCTV may not align — contact or injury not shown on clip; continuity and full export outstanding.",
    opportunityLine:
      "Opportunity to challenge reconstruction and continuity pending full CCTV export, clock sync, and engineer material.",
  };
}

/** 999/CAD low-level dispatch vs MG11/MG5 describing injury or assault. */
function detectDispatchVsScene(
  dispatch: string,
  mg11: string,
  mg5: string,
): BundleContradiction | null {
  const sceneHay = `${mg11} ${mg5}`;
  if (!hasIncidentContext(`${dispatch} ${sceneHay}`)) return null;
  if (!DISPATCH_LOW_RE.test(dispatch) || !SCENE_HIGH_RE.test(sceneHay)) return null;
  if (dispatch.length < 30) return null;

  return {
    type: "triangulation_dispatch_scene",
    sources: ["CAD / 999", "MG5 / MG11"],
    values: ["low-level dispatch record", "injury or assault described"],
    theoryLine:
      "The papers differ across channels: the CAD or 999 record describes a lower-level disturbance while the served MG5/MG11 narrative describes injury or assault. The defence position remains provisional pending full CAD, 999 audio, and BWV.",
    riskLine:
      "Dispatch record may not match the served witness narrative — CAD/999 reconciliation and audio outstanding.",
    opportunityLine:
      "Opportunity to challenge reconstruction pending full CAD log, 999 recording, and BWV continuity.",
  };
}

/** BWV observations vs complainant injury account on MG11. */
function detectBwvVsAccount(bwv: string, mg11: string): BundleContradiction | null {
  const hay = `${bwv} ${mg11}`;
  if (!hasIncidentContext(hay)) return null;
  if (!BWV_DENY_RE.test(bwv) || !MG11_INJURY_RE.test(mg11)) return null;
  if (bwv.length < 30 || mg11.length < 40) return null;

  return {
    type: "triangulation_bwv_account",
    sources: ["BWV", "MG11"],
    values: ["BWV no-injury / calm observation", "complainant injury account"],
    theoryLine:
      "The papers differ across channels: served BWV material records no observed injuries or a calm scene while the complainant describes being struck or injured. The defence position remains provisional pending full BWV export and continuity.",
    riskLine:
      "BWV observations may not align with the complainant account — full footage and continuity outstanding.",
    opportunityLine:
      "Opportunity to challenge reconstruction pending full BWV export, continuity statements, and disclosure of any redactions.",
  };
}

/** Extract triangulation contradictions — empty unless cross-channel pair is clear. */
export function extractTriangulationContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const text = bundleText?.trim();
  if (!text || text.length < 200) return [];

  const mg5 = mg5Text(text);
  const mg11Blocks = extractMg11Blocks(text);
  const mg11 = mg11Blocks.join("\n\n") || sectionSlice(text, "MG11");
  const cctv = cctvText(text);
  const dispatch = dispatchText(text);
  const bwv = bwvText(text);

  const out: BundleContradiction[] = [];

  const mg11Cctv = detectMg11VsCctv(mg11, cctv, mg5);
  if (mg11Cctv) out.push(mg11Cctv);

  const dispatchScene = detectDispatchVsScene(dispatch, mg11, mg5);
  if (dispatchScene) out.push(dispatchScene);

  const bwvAccount = detectBwvVsAccount(bwv, mg11);
  if (bwvAccount) out.push(bwvAccount);

  const seen = new Set<TriangulationContradictionType>();
  return out.filter((c) => {
    const t = c.type as TriangulationContradictionType;
    if (
      !["triangulation_mg11_cctv", "triangulation_dispatch_scene", "triangulation_bwv_account"].includes(
        t,
      )
    ) {
      return true;
    }
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}
