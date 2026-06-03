import type { AuditorMode, AuditorPackId, CaseTruthManifest } from "./types";
import { buildAllFamily40Manifests } from "./family-40-manifests";
import { FAMILY_40_CATALOG } from "./family-40-catalog";
import { PILOT_3_TRUTH_MANIFESTS } from "./truth-manifests";

export type PackStatus = "active" | "scaffold" | "discovery-only";

export type AuditorPackDefinition = {
  id: AuditorPackId;
  label: string;
  status: PackStatus;
  description: string;
  caseManifests: CaseTruthManifest[];
  expectedCaseCount: number;
};

const SCAFFOLD_PACK = (id: AuditorPackId, label: string, description: string): AuditorPackDefinition => ({
  id,
  label,
  status: "scaffold",
  description,
  caseManifests: [],
  expectedCaseCount: 0,
});

export const AUDITOR_PACKS: Record<AuditorPackId, AuditorPackDefinition> = {
  "pilot-3": {
    id: "pilot-3",
    label: "Pilot demo trio",
    status: "active",
    description: "Marcus Vale, Kian Doyle, Leon Marsh — criminal defence pilot workflow.",
    caseManifests: PILOT_3_TRUTH_MANIFESTS,
    expectedCaseCount: 3,
  },
  "family-40": {
    id: "family-40",
    label: "Family 40 (fictional NS-CPS)",
    status: "active",
    description:
      "40 fictional bundles (0401–0440): 10× fraud, 10× PWITS, 10× robbery, 10× violence — confirmed + uncertain scaffold.",
    caseManifests: buildAllFamily40Manifests(),
    expectedCaseCount: FAMILY_40_CATALOG.length,
  },
  "profile-clash": SCAFFOLD_PACK("profile-clash", "Profile clash", "Cross-profile leakage regression — manifests TBD."),
  "full-960": {
    id: "full-960",
    label: "Full 960 discovery",
    status: "discovery-only",
    description:
      "Broad discovery scan — fictional family-40 catalog (default) or read-only real org cases with --corpus real.",
    caseManifests: buildAllFamily40Manifests(),
    expectedCaseCount: FAMILY_40_CATALOG.length,
  },
  "documents-nav": SCAFFOLD_PACK("documents-nav", "Documents navigation", "Documents tab / View — manifests TBD."),
  "court-today-date": SCAFFOLD_PACK("court-today-date", "Court Today date", "Court Today anchor pack — manifests TBD."),
  "upload-reality-later": SCAFFOLD_PACK("upload-reality-later", "Upload reality", "Upload path checks — manifests TBD."),
};

export function resolvePack(packId: string, mode: AuditorMode = "standard"): AuditorPackDefinition {
  const key = packId as AuditorPackId;
  const pack = AUDITOR_PACKS[key];
  if (!pack) {
    throw new Error(`Unknown pack "${packId}". Supported: ${Object.keys(AUDITOR_PACKS).join(", ")}`);
  }
  if (pack.status === "scaffold") {
    throw new Error(`Pack "${packId}" is scaffolded only — no manifests populated yet.`);
  }
  if (pack.id === "full-960" && mode !== "discovery") {
    throw new Error('Pack "full-960" requires --mode discovery.');
  }
  return pack;
}

export function listPackIds(): AuditorPackId[] {
  return Object.keys(AUDITOR_PACKS) as AuditorPackId[];
}
