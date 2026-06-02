import fs from "node:fs";
import path from "node:path";
import { FAMILY_40_CATALOG } from "./family-40-catalog";
import { buildAllFamily40Manifests } from "./family-40-manifests";
import type { AuditorFamilyProfile } from "./types";

export type ManifestReviewEntry = {
  caseId: string;
  sourceRef: string;
  caseTitle: string;
  currentGuessedFamily: AuditorFamilyProfile;
  whyUncertain: string;
  evidenceNeededToConfirmFamily: string[];
  fieldsNeededBeforeStrictGrading: string[];
  proposedNextAction: string;
  canPromoteToConfirmed: false;
};

const STANDARD_FIELDS_NEEDED = [
  "defendant (from bundle or case record)",
  "allegation (exact charge wording)",
  "court/stage if relevant",
  "broad case family (fraud / PWITS / robbery / violence)",
  "expected route family title",
  "must-show concepts (source-backed)",
  "must-not-show concepts (leakage list)",
  "source-backed disclosure priorities (8 items)",
  "known danger points / what would make us lose",
];

export function buildManifestReviewQueue(): ManifestReviewEntry[] {
  const manifests = buildAllFamily40Manifests();
  const uncertain = manifests.filter((m) => m.manifestCertainty === "uncertain");
  const catalogByRef = new Map(FAMILY_40_CATALOG.map((e) => [e.ref, e]));

  return uncertain.map((m) => {
    const cat = catalogByRef.get(m.sourceRef);
    return {
      caseId: m.caseId,
      sourceRef: m.sourceRef,
      caseTitle: m.caseTitle,
      currentGuessedFamily: m.auditorFamily,
      whyUncertain: m.certaintyNote ?? cat?.certaintyNote ?? "Family bucket provisional — offence tag does not map cleanly.",
      evidenceNeededToConfirmFamily: [
        `Review bundle: docs/fictional-cases-40/${m.sourceRef}.txt`,
        `Confirm offence tag: ${m.offenceTag}`,
        "Human reviewer assigns primary workflow family",
        m.auditorFamily === "violence_domestic_assault"
          ? "Confirm violence_domestic_assault exists in pilot-workflow before strict grade"
          : "Confirm no mixed-count offence dominates another family",
      ],
      fieldsNeededBeforeStrictGrading: [...STANDARD_FIELDS_NEEDED],
      proposedNextAction:
        m.auditorFamily === "violence_domestic_assault"
          ? "Defer strict grading until violence workflow profile is added to pilot-workflow; keep discovery-only."
          : "If offence clearly matches family after bundle review, promote manifestCertainty to confirmed and re-run family-40.",
      canPromoteToConfirmed: false,
    };
  });
}

export function writeManifestReviewQueue(outDir: string): number {
  const entries = buildManifestReviewQueue();
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "manifest-review-queue.json");
  fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2), "utf8");

  const lines = [
    "# CaseBrain Auditor — manifest review queue",
    "",
    `Uncertain family-40 cases: **${entries.length}** (not release-blocking; not counted as pass).`,
    "",
  ];

  for (const e of entries) {
    lines.push(`## ${e.sourceRef} — ${e.caseTitle}`, "");
    lines.push(`- **caseId:** ${e.caseId}`);
    lines.push(`- **Current guessed family:** ${e.currentGuessedFamily}`);
    lines.push(`- **Why uncertain:** ${e.whyUncertain}`);
    lines.push("- **Evidence needed:**");
    for (const ev of e.evidenceNeededToConfirmFamily) lines.push(`  - ${ev}`);
    lines.push("- **Fields needed before strict grading:**");
    for (const f of e.fieldsNeededBeforeStrictGrading) lines.push(`  - ${f}`);
    lines.push(`- **Proposed next action:** ${e.proposedNextAction}`);
    lines.push(`- **canPromoteToConfirmed:** false`, "");
  }

  fs.writeFileSync(path.join(outDir, "manifest-review-queue.md"), lines.join("\n"), "utf8");
  return entries.length;
}
