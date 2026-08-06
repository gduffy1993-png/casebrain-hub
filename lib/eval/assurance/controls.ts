/**
 * Permanent Assurance Engine control registry.
 */

import type { AssuranceControl, AssuranceControlId } from "@/lib/eval/assurance/types";

export const ASSURANCE_CONTROLS: AssuranceControl[] = [
  {
    id: "AUD-PROV-UNKNOWN-PAGE",
    label: "Unknown page identity remains explicit across every exit",
    intent:
      "Unsplit whole-document text must set pageIdentityKnown=false, keep every page field null/absent, and declare that the supporting document is known but the exact page is unavailable — never report this as missing provenance entirely.",
    severity: "CRITICAL",
    affectedExits: ["view", "copy", "export", "api", "pdf", "composed_prose"],
    likelyFiles: [
      "lib/criminal/finding-provenance.ts",
      "lib/criminal/build-from-document-units.ts",
      "lib/criminal/canonical-live-surface-adapter.ts",
    ],
  },
  {
    id: "AUD-PROV-FALSE-PAGE-DEFAULT",
    label: "No helper may default a finding to page 1",
    intent:
      "Helpers that previously fell back to pageNumber=1 / 'p.1' / 'page 1' / 'p.null' must refuse synthetic page references when page identity is unknown.",
    severity: "CRITICAL",
    affectedExits: ["view", "copy", "export", "api", "pdf", "composed_prose"],
    likelyFiles: [
      "lib/criminal/finding-provenance.ts",
      "lib/criminal/build-from-document-units.ts",
      "lib/criminal/authenticated-matter-canonical.ts",
    ],
  },
  {
    id: "AUD-PROV-SOURCE-VS-COMPILED-PAGE",
    label: "Source and compiled page numbering stay distinct",
    intent:
      "Genuine page units preserve exact source-document and compiled-bundle page numbers side by side. Numbering must not shift or collapse one into the other.",
    severity: "HIGH",
    affectedExits: ["view", "copy", "export", "api", "pdf"],
    likelyFiles: [
      "lib/criminal/finding-provenance.ts",
      "lib/criminal/build-from-document-units.ts",
    ],
  },
  {
    id: "AUD-DOC-OPERATIVE-PRECEDENCE",
    label: "Operative precedence follows documentary truth tiers",
    intent:
      "Precedence order is: explicit replacement → reliable operative status → document version/date → chronological upload order → stable id tie-break. Array/retrieval order never selects the operative instrument alone.",
    severity: "CRITICAL",
    affectedExits: ["view", "copy", "export", "api"],
    likelyFiles: ["lib/criminal/document-relationship-model.ts"],
  },
  {
    id: "AUD-DOC-UPLOAD-FALLBACK",
    label: "Upload order is only the final documentary fallback",
    intent:
      "uploadOrder may break ties after documentary signals are exhausted, but it is never a substitute for explicit replacement, status, date or version.",
    severity: "HIGH",
    affectedExits: ["view", "api"],
    likelyFiles: [
      "lib/criminal/document-relationship-model.ts",
      "lib/criminal/authenticated-matter-canonical.ts",
    ],
  },
  {
    id: "AUD-DOC-DETERMINISTIC-TIE",
    label: "Equal or absent timestamps stay deterministic",
    intent:
      "Equal updated_at values, null timestamps and invalid timestamps must produce identical operative results across reruns via a stable id tie-break — never array position.",
    severity: "HIGH",
    affectedExits: ["api", "view"],
    likelyFiles: [
      "lib/criminal/document-relationship-model.ts",
      "lib/criminal/authenticated-matter-canonical.ts",
    ],
  },
  {
    id: "AUD-DOC-SILENT-SUPERSESSION",
    label: "No silent supersession or charge cloning",
    intent:
      "A later-uploaded duplicate without supported relationship must not silently supersede an earlier instrument. Earlier wording remains visible as superseded (when supported) and is never cloned from the operative wording.",
    severity: "CRITICAL",
    affectedExits: ["view", "copy", "export", "api"],
    likelyFiles: [
      "lib/criminal/document-relationship-model.ts",
      "lib/criminal/build-from-document-units.ts",
    ],
  },
];

const BY_ID = Object.fromEntries(ASSURANCE_CONTROLS.map((c) => [c.id, c])) as Record<
  AssuranceControlId,
  AssuranceControl
>;

export function listAssuranceControlIds(): AssuranceControlId[] {
  return ASSURANCE_CONTROLS.map((c) => c.id);
}

export function resolveAssuranceControl(id: string): AssuranceControl {
  const control = BY_ID[id as AssuranceControlId];
  if (!control) {
    throw new Error(
      `Unknown assurance control "${id}". Supported: ${listAssuranceControlIds().join(", ")}`,
    );
  }
  return control;
}
