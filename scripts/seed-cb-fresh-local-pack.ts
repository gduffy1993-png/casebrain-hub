#!/usr/bin/env npx tsx
/**
 * Seed CB-FRESH adversarial bundles into the gitignored local golden pack.
 * Run: npx tsx scripts/seed-cb-fresh-local-pack.ts
 */
import fs from "node:fs";
import path from "node:path";
import { localCasesRoot } from "../lib/eval/casebrain-auditor/bundle-fidelity-local";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources");

const CASES = [
  {
    id: "cb-fresh-001-taylor-brookes",
    source: "CB-FRESH-001_Taylor_Brookes.txt",
    truthKey: {
      bundleId: "cb-fresh-001-taylor-brookes",
      fictional: true,
      label: "CB-FRESH-001 Taylor Brookes — harassment / digital",
      purpose: "Adversarial QA — attribution harassment; no PWITS/drug/BWV bleed",
      defendant: "Taylor Brookes",
      aliases: ["Brookes", "Taylor"],
      charge: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
      chargeKeywords: ["harassment", "protection from harassment", "messages", "whatsapp"],
      court: "Northgate Magistrates' Court",
      hearingDate: "2026-01-01",
      stage: "PTPH",
      documentTypesExpected: ["charge_sheet", "mg5", "mg6"],
      documentTypesForbidden: [],
      evidenceSignalsExpected: ["phone", "message", "screenshot", "mg6"],
      missingMaterialExpected: [
        "phone extraction",
        "message export",
        "complainant MG11",
        "attribution material",
      ],
      thinBundleExpected: true,
      expectedWorkflowProfile: "needs_review",
      expectedRouteFamily: null,
      prohibitedFamilies: ["fraud_account_control", "pwits_phone_attribution", "drugs_pwits"],
      expectedProvisionalStatus: "needs_review",
      humanReviewExpected: false,
      notes: "CB-FRESH adversarial anchor — fictional QA bundle.",
    },
  },
  {
    id: "cb-fresh-002-jordan-hale",
    source: "CB-FRESH-002_Jordan_Hale.txt",
    truthKey: {
      bundleId: "cb-fresh-002-jordan-hale",
      fictional: true,
      label: "CB-FRESH-002 Jordan Hale — assault emergency worker",
      purpose: "Adversarial QA — BWV/custody referred-only; AEW offence",
      defendant: "Jordan Hale",
      aliases: ["Hale", "Jordan"],
      charge:
        "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
      chargeKeywords: ["assault", "emergency worker", "aew", "body worn", "bwv"],
      court: "Central Park Magistrates' Court",
      hearingDate: "2026-03-12",
      stage: "PTPH",
      documentTypesExpected: ["charge_sheet", "mg5", "mg6", "mg11", "custody"],
      documentTypesForbidden: [],
      evidenceSignalsExpected: ["bwv", "custody", "mg11", "pace"],
      missingMaterialExpected: ["BWV", "body worn video", "custody record", "interview recording"],
      thinBundleExpected: "needs_review",
      expectedWorkflowProfile: "needs_review",
      expectedRouteFamily: null,
      prohibitedFamilies: ["fraud_account_control", "pwits_phone_attribution", "drugs_pwits"],
      expectedProvisionalStatus: "needs_review",
      humanReviewExpected: false,
      notes: "CB-FRESH adversarial anchor — fictional QA bundle.",
    },
  },
] as const;

function main(): void {
  const casesRoot = localCasesRoot();
  fs.mkdirSync(casesRoot, { recursive: true });

  for (const spec of CASES) {
    const caseDir = path.join(casesRoot, spec.id);
    fs.mkdirSync(caseDir, { recursive: true });
    const srcPath = path.join(SRC, spec.source);
    const bundleText = fs.readFileSync(srcPath, "utf8");
    fs.writeFileSync(path.join(caseDir, "bundle-text.md"), bundleText, "utf8");
    fs.writeFileSync(path.join(caseDir, "truth-key.json"), `${JSON.stringify(spec.truthKey, null, 2)}\n`, "utf8");
    console.log(`Seeded ${spec.id}`);
  }

  console.log(`\nLocal golden pack ready under ${casesRoot}`);
  console.log("Run: npx tsx scripts/pilot-readiness-gate.ts --pack local --min-golden 2");
}

main();
