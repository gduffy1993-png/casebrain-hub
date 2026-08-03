/**
 * Tiny synthetic handlers + fixture helpers for foundation contracts only.
 * Not production MAA engines — identity-bearing stubs for runner tests.
 */

import fs from "node:fs";
import path from "node:path";

import { S3000_AUDIT_BASELINE_COMMIT, S3000_POPULATION_TARGET, S3000_SHARD_MANIFEST_SCHEMA } from "./constants";
import { orderedMembershipSha256, sha256File, sha256Hex } from "./hashes";
import type { HandlerInvokeFn, InvokeRegistry } from "./invoke";
import { emptySurfaceMap } from "./surface-availability";
import type { FrozenShardManifest, RegisteredHandlerRef, SurfaceAvailability } from "./types";

export const SYNTHETIC_CONTROL_ID = "MAA2-SYN-01-ABSOLUTE-PROOF-STUB" as const;

export const SYNTHETIC_HANDLER: RegisteredHandlerRef = {
  controlId: SYNTHETIC_CONTROL_ID,
  handlerId: "synthetic_absolute_proof_stub",
  functionIdentity: "syntheticFixtures#detectAbsoluteProofStub",
  engineId: "professional_wording",
  findingCodes: ["SYN_ABSOLUTE_PROOF"],
  inputEligibility: "included_solicitor_visible_wording",
  requiredInputs: ["packet.json", "casebrain-output.json", "included_solicitor_visible_wording"],
  positiveContract: "scripts/stage3000-parallel-audit-contracts.test.ts#syn_absolute_proof_positive",
  negativeContract: "scripts/stage3000-parallel-audit-contracts.test.ts#syn_absolute_proof_negative",
  receiptValidator: "stage3000-machine-receipt@1.0.0",
  unavailableVerdict: "not_exercised",
};

export const detectAbsoluteProofStub: HandlerInvokeFn = ({ caseId, output, handler }) => {
  const wording =
    typeof output?.solicitorVisible === "string" ? output.solicitorVisible : "";
  const hit = /\babsolutely proves\b/i.test(wording);
  if (!wording) {
    return {
      determinateOutcome: false,
      unresolvedOutcome: true,
      occurrenceIds: [],
      exactWordings: [],
      evidenceRefs: ["casebrain-output.json"],
      plainEnglish: `${handler.functionIdentity} unresolved — solicitorVisible absent`,
    };
  }
  if (!hit) {
    return {
      determinateOutcome: true,
      unresolvedOutcome: false,
      occurrenceIds: [],
      exactWordings: [],
      evidenceRefs: ["casebrain-output.json#solicitorVisible"],
      plainEnglish: `${handler.functionIdentity} evaluated clean negative for ${caseId}`,
    };
  }
  const occurrenceId = `occ-syn-${caseId}-absolute`;
  return {
    determinateOutcome: true,
    unresolvedOutcome: false,
    occurrenceIds: [occurrenceId],
    exactWordings: [wording],
    evidenceRefs: ["casebrain-output.json#solicitorVisible"],
    plainEnglish: `${handler.functionIdentity} evaluated candidate for ${caseId} EXACT::<<${wording}>>`,
  };
};

export function buildSyntheticInvokeRegistry(): InvokeRegistry {
  const map: InvokeRegistry = new Map();
  map.set(SYNTHETIC_HANDLER.functionIdentity, detectAbsoluteProofStub);
  return map;
}

export const SYNTHETIC_FIXTURE_REL =
  "lib/eval/stage3000-parallel-audit/fixtures/synthetic" as const;

function surfacesFor(
  overrides: Partial<Record<string, SurfaceAvailability>> = {},
): FrozenShardManifest["cases"][number]["surfaces"] {
  const base = emptySurfaceMap("not_exercised");
  base.view = "available";
  base.copy = "available";
  base.api = "available";
  base.export = "unavailable";
  base.pdf = "unavailable";
  base.composed_prose = "partial";
  base.authenticated_browser = "not_exercised";
  return { ...base, ...overrides };
}

/**
 * Materialise tiny synthetic fixture files under the fixture root and return
 * a frozen shard manifest with verified hashes.
 */
export function materialiseSyntheticFixtures(repoRoot: string): {
  manifest: FrozenShardManifest;
  manifestRel: string;
  handlers: RegisteredHandlerRef[];
  invokeRegistry: InvokeRegistry;
} {
  const root = path.join(repoRoot, SYNTHETIC_FIXTURE_REL);
  fs.mkdirSync(path.join(root, "cases", "syn-case-001"), { recursive: true });
  fs.mkdirSync(path.join(root, "cases", "syn-case-002"), { recursive: true });

  const case1Packet = {
    caseId: "syn-case-001",
    presentInputs: ["packet.json", "casebrain-output.json", "included_solicitor_visible_wording"],
  };
  const case1Output = {
    solicitorVisible: "This absolutely proves the allegation beyond doubt.",
  };
  const case1Source = { note: "synthetic source stub" };
  const case1Truth = { expected: "allegation only — not absolute proof" };

  const case2Packet = {
    caseId: "syn-case-002",
    presentInputs: ["packet.json", "casebrain-output.json", "included_solicitor_visible_wording"],
  };
  const case2Output = {
    solicitorVisible: "Stills marked still; master marked missing.",
  };
  const case2Source = { note: "synthetic source stub 2" };
  const case2Truth = { expected: "units remain separate" };

  const writes: Array<[string, string]> = [
    ["cases/syn-case-001/packet.json", JSON.stringify(case1Packet, null, 2) + "\n"],
    ["cases/syn-case-001/casebrain-output.json", JSON.stringify(case1Output, null, 2) + "\n"],
    ["cases/syn-case-001/source.json", JSON.stringify(case1Source, null, 2) + "\n"],
    ["cases/syn-case-001/truth-key.json", JSON.stringify(case1Truth, null, 2) + "\n"],
    ["cases/syn-case-002/packet.json", JSON.stringify(case2Packet, null, 2) + "\n"],
    ["cases/syn-case-002/casebrain-output.json", JSON.stringify(case2Output, null, 2) + "\n"],
    ["cases/syn-case-002/source.json", JSON.stringify(case2Source, null, 2) + "\n"],
    ["cases/syn-case-002/truth-key.json", JSON.stringify(case2Truth, null, 2) + "\n"],
  ];
  for (const [rel, body] of writes) {
    fs.writeFileSync(path.join(root, rel), body);
  }

  const rel = (p: string) => `${SYNTHETIC_FIXTURE_REL}/${p}`.replace(/\\/g, "/");
  const hash = (p: string) => sha256File(path.join(root, p));

  const cases: FrozenShardManifest["cases"] = [
    {
      orderIndex: 0,
      caseId: "syn-case-001",
      shardId: "shard-syn-tiny-a",
      packetRelativePath: rel("cases/syn-case-001/packet.json"),
      packetSha256: hash("cases/syn-case-001/packet.json"),
      sourceRelativePath: rel("cases/syn-case-001/source.json"),
      sourceSha256: hash("cases/syn-case-001/source.json"),
      outputRelativePath: rel("cases/syn-case-001/casebrain-output.json"),
      outputSha256: hash("cases/syn-case-001/casebrain-output.json"),
      truthRelativePath: rel("cases/syn-case-001/truth-key.json"),
      truthSha256: hash("cases/syn-case-001/truth-key.json"),
      surfaces: surfacesFor(),
    },
    {
      orderIndex: 1,
      caseId: "syn-case-002",
      shardId: "shard-syn-tiny-a",
      packetRelativePath: rel("cases/syn-case-002/packet.json"),
      packetSha256: hash("cases/syn-case-002/packet.json"),
      sourceRelativePath: rel("cases/syn-case-002/source.json"),
      sourceSha256: hash("cases/syn-case-002/source.json"),
      outputRelativePath: rel("cases/syn-case-002/casebrain-output.json"),
      outputSha256: hash("cases/syn-case-002/casebrain-output.json"),
      truthRelativePath: rel("cases/syn-case-002/truth-key.json"),
      truthSha256: hash("cases/syn-case-002/truth-key.json"),
      surfaces: surfacesFor({ export: "available" }),
    },
  ];

  const membership = orderedMembershipSha256(
    cases.map((c) => c.caseId),
    cases.map((c) => c.packetSha256),
  );

  const manifest: FrozenShardManifest = {
    schemaVersion: S3000_SHARD_MANIFEST_SCHEMA,
    shardId: "shard-syn-tiny-a",
    frozenAt: "2026-08-02T00:00:00.000Z",
    baselineCommit: S3000_AUDIT_BASELINE_COMMIT,
    populationTarget: S3000_POPULATION_TARGET,
    shardCaseCount: cases.length,
    orderedMembershipSha256: membership,
    cases,
    note: "Tiny synthetic shard for Stage-3000 parallel audit foundation contracts only. Not a real corpus.",
  };

  const manifestRel = rel("shard-manifest.json");
  fs.writeFileSync(path.join(repoRoot, manifestRel), JSON.stringify(manifest, null, 2) + "\n");

  // Handler registry sidecar (identity only)
  fs.writeFileSync(
    path.join(root, "handlers", "synthetic-handler-registry.json"),
    JSON.stringify(
      {
        schemaVersion: "stage3000-synthetic-handler-registry@1.0.0",
        handlers: [SYNTHETIC_HANDLER],
        registrySha256: sha256Hex(JSON.stringify(SYNTHETIC_HANDLER)),
      },
      null,
      2,
    ) + "\n",
  );

  return {
    manifest,
    manifestRel,
    handlers: [SYNTHETIC_HANDLER],
    invokeRegistry: buildSyntheticInvokeRegistry(),
  };
}
