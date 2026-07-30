/**
 * Emit MAA V2 registry JSON artefacts for Codex review (no Stage 150 execution).
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-registry.ts
 */

import fs from "node:fs";
import path from "node:path";

import {
  buildEvidenceRequirements,
  buildStageActivationMatrix,
  buildV1ToV2Migration,
  buildV2RegistryDocument,
  validateV2Registry,
} from "../../lib/eval/master-assurance-auditor/v2/assemble";
import {
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
  MAA_V2_SCHEMA_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/schema";

const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2",
);

function writeJson(name: string, value: unknown) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n", "utf8");
  return p;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const registry = buildV2RegistryDocument();
  const issues = validateV2Registry(registry);
  if (issues.length) {
    console.error("Registry validation failed:", issues.slice(0, 20));
    process.exit(1);
  }

  const matrix = buildStageActivationMatrix(registry.controls);
  const evidence = buildEvidenceRequirements(registry.controls);
  const migration = buildV1ToV2Migration(registry.controls);

  writeJson("auditor-control-registry-v2.json", registry);
  writeJson("control-stage-activation-matrix.json", matrix);
  writeJson("control-evidence-requirements.json", evidence);
  writeJson("v1-to-v2-registry-migration.json", migration);

  const stop = {
    schemaVersion: "maa-v2-stop-for-codex-review@1.0.0",
    title: "STOP FOR CODEX REVIEW — Master Assurance Auditor V2 registry/spec only",
    createdAt: new Date().toISOString(),
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    pr: 65,
    registryVersion: MAA_V2_REGISTRY_VERSION,
    registrySchemaVersion: MAA_V2_SCHEMA_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    programmePassSupported: false,
    stage150Started: false,
    stage150Run: false,
    committed: false,
    pushed: false,
    merged: false,
    deployed: false,
    applicationBehaviourChanged: false,
    frozenV1ArtefactsAltered: false,
    controlCounts: {
      total: registry.controls.length,
      preservedV1: registry.preservedV1ControlIds.length,
      additiveV2: registry.controls.length - registry.preservedV1ControlIds.length,
      families: registry.familyIndex.length,
    },
    deliverables: {
      spec: "docs/integrity-programme/master-assurance-auditor-v2-spec.md",
      registry: "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json",
      activationMatrix:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/control-stage-activation-matrix.json",
      evidenceRequirements:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/control-evidence-requirements.json",
      crossPerspectiveProtocol:
        "docs/integrity-programme/master-assurance-auditor-v2/cross-perspective-protocol.md",
      solicitorOutputQualitySuite:
        "docs/integrity-programme/master-assurance-auditor-v2/solicitor-output-quality-suite.md",
      securityExternalRoadmap:
        "docs/integrity-programme/master-assurance-auditor-v2/security-and-external-assurance-roadmap.md",
      migration:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/v1-to-v2-registry-migration.json",
      contracts: "scripts/master-assurance-auditor-v2-registry-contracts.test.ts",
      library: "lib/eval/master-assurance-auditor/v2/",
    },
    invariants: registry.invariants,
    reviewAsks: [
      "Confirm all 24 V1 control IDs and lane IDs preserved with version 1.0.0.",
      "Confirm no missing-evidence→pass or unavailable-exit→pass paths.",
      "Confirm no automated human impersonation or certification claims.",
      "Confirm Stage 150 not started.",
      "Approve additive V2 family coverage A–AF before any Stage 150 execution.",
    ],
    nextBlockedUntilCodexClearance: [
      "Stage 150 execution",
      "Commit/push of this work unit",
      "Application behaviour repairs",
      "Programme PASS claims",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        totalControls: registry.controls.length,
        preservedV1: registry.preservedV1ControlIds.length,
        additive: registry.controls.length - registry.preservedV1ControlIds.length,
        families: registry.familyIndex.length,
      },
      null,
      2,
    ),
  );
}

main();
