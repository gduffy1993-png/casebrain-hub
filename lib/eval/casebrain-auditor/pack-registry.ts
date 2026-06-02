import type { AuditorPackId, CaseTruthManifest } from "./types";
import { PILOT_3_TRUTH_MANIFESTS } from "./truth-manifests";

export type PackStatus = "active" | "scaffold";

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
  "family-40": SCAFFOLD_PACK("family-40", "Family 40", "Forty-case family coverage — manifests TBD."),
  "profile-clash": SCAFFOLD_PACK("profile-clash", "Profile clash", "Cross-profile leakage regression — manifests TBD."),
  "full-960": SCAFFOLD_PACK("full-960", "Full 960", "Large-scale corpus — manifests TBD."),
  "documents-nav": SCAFFOLD_PACK("documents-nav", "Documents navigation", "Documents tab / View — manifests TBD."),
  "court-today-date": SCAFFOLD_PACK("court-today-date", "Court Today date", "Court Today anchor pack — manifests TBD."),
  "upload-reality-later": SCAFFOLD_PACK("upload-reality-later", "Upload reality", "Upload path checks — manifests TBD."),
};

export function resolvePack(packId: string): AuditorPackDefinition {
  const key = packId as AuditorPackId;
  const pack = AUDITOR_PACKS[key];
  if (!pack) {
    throw new Error(`Unknown pack "${packId}". Supported: ${Object.keys(AUDITOR_PACKS).join(", ")}`);
  }
  if (pack.status === "scaffold") {
    throw new Error(`Pack "${packId}" is scaffolded only. Use --pack pilot-3 for now.`);
  }
  return pack;
}

export function listPackIds(): AuditorPackId[] {
  return Object.keys(AUDITOR_PACKS) as AuditorPackId[];
}
