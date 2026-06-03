import fs from "node:fs";
import path from "node:path";
import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";
import { FAMILY_40_CATALOG, type Family40CatalogEntry } from "./family-40-catalog";
import { FAMILY_PRINCIPLE_PACKS, routeTitleForFamily } from "./family-principles";
import type { AuditorFamilyProfile, Family40CaseManifest, ManifestCertainty } from "./types";

const MALFORMED_ANCHOR_PATTERNS = [
  /\b6MG6 disclosure schedule21/i,
  /\b5Device login attribution note19/i,
  /CCTV footage itself is not included in full/i,
];

export function toWorkflowProfile(family: AuditorFamilyProfile): WorkflowProfile {
  return family;
}

type BundleMeta = {
  accused: string | null;
  offence: string | null;
  bundleFound: boolean;
};

export function readBundleMeta(ref: string): BundleMeta {
  const filePath = path.join(process.cwd(), "docs", "fictional-cases-40", `${ref}.txt`);
  if (!fs.existsSync(filePath)) {
    return { accused: null, offence: null, bundleFound: false };
  }
  const src = fs.readFileSync(filePath, "utf8");
  const accused = src.match(/Accused:\s*(.+?)\s*\(DOB/i)?.[1]?.trim() ?? null;
  const offence = src.match(/Short title:\s*(.+)/i)?.[1]?.trim() ?? null;
  return { accused, offence, bundleFound: true };
}

function buildConfirmedManifest(entry: Family40CatalogEntry, meta: BundleMeta): Family40CaseManifest {
  const principles = FAMILY_PRINCIPLE_PACKS[entry.family];
  const defendant = meta.accused ?? "Defendant not parsed";
  const allegation = meta.offence ?? entry.offenceTag;
  const caseId = entry.ref.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  return {
    caseId,
    caseTitle: `R v ${defendant}`,
    profile: toWorkflowProfile(entry.family),
    auditorFamily: entry.family,
    manifestCertainty: entry.certainty,
    sourceRef: entry.ref,
    offenceTag: entry.offenceTag,
    certaintyNote: entry.certaintyNote,
    expectedDefendant: defendant,
    expectedAllegation: allegation,
    expectedCourt: "Court not safely extracted",
    expectedHearingDate: "2026-06-01",
    expectedHearingTime: "10:00",
    expectedRouteTitle: routeTitleForFamily(entry.family),
    requiredConcepts: [...principles.requiredConcepts],
    forbiddenConcepts: [...principles.forbiddenConcepts, ...principles.leakagePatterns],
    forbiddenMalformedAnchors: [...MALFORMED_ANCHOR_PATTERNS],
    expectedDisclosureItemCount: 8,
    expectedDocumentCount: 0,
    bundleFound: meta.bundleFound,
  };
}

function buildUncertainManifest(entry: Family40CatalogEntry, meta: BundleMeta): Family40CaseManifest {
  const base = buildConfirmedManifest(entry, meta);
  return {
    ...base,
    manifestCertainty: "uncertain",
    certaintyNote: entry.certaintyNote ?? "Family assignment provisional — do not strict-grade.",
    requiredConcepts: [],
    forbiddenConcepts: [],
    expectedRouteTitle: routeTitleForFamily(entry.family),
  };
}

export function buildFamily40Manifest(entry: Family40CatalogEntry): Family40CaseManifest {
  const meta = readBundleMeta(entry.ref);
  if (!meta.bundleFound) {
    return {
      ...buildUncertainManifest(entry, meta),
      manifestCertainty: "uncertain",
      certaintyNote: `Bundle file missing for ${entry.ref}`,
      bundleFound: false,
    };
  }
  if (entry.certainty === "uncertain") {
    return buildUncertainManifest(entry, meta);
  }
  return buildConfirmedManifest(entry, meta);
}

export function buildAllFamily40Manifests(): Family40CaseManifest[] {
  return FAMILY_40_CATALOG.map(buildFamily40Manifest);
}

export function isConfirmedManifest(m: Family40CaseManifest): boolean {
  return m.manifestCertainty === "confirmed";
}
